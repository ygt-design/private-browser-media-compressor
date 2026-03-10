export class VideoEncoder {
  constructor() {
    this.worker = new Worker("/video-worker.js");
    this.nextId = 0;
    this.pending = {};
    this.onProgress = null;
    this.onLog = null;

    this.worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "PROGRESS") {
        if (this.onProgress) this.onProgress(msg.data);
        return;
      }
      if (msg.type === "LOG") {
        if (this.onLog) this.onLog(msg.data);
        return;
      }

      const handler = this.pending[msg.id];
      if (!handler) return;
      delete this.pending[msg.id];

      if (msg.type === "ERROR") handler.reject(new Error(msg.data));
      else handler.resolve(msg.data);
    };
  }

  send(type, data, transfer) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending[id] = { resolve, reject };
      this.worker.postMessage({ id, type, data }, transfer || []);
    });
  }

  load() {
    return this.send("LOAD", {});
  }

  exec(args, timeout = -1) {
    return this.send("EXEC", { args, timeout });
  }

  writeFile(path, data) {
    const transfer = data instanceof Uint8Array ? [data.buffer] : [];
    return this.send("WRITE_FILE", { path, data }, transfer);
  }

  readFile(path) {
    return this.send("READ_FILE", { path });
  }

  deleteFile(path) {
    return this.send("DELETE_FILE", { path });
  }

  terminate() {
    this.worker.terminate();
  }
}

export async function compressVideo(encoder, file, opts) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${ext}`;
  const outputName = `output.${opts.format}`;
  const fileBytes = new Uint8Array(await file.arrayBuffer());

  await encoder.writeFile(inputName, fileBytes);

  const args =
    opts.format === "mp4"
      ? [
          "-i",
          inputName,
          "-c:v",
          "libx264",
          "-crf",
          String(opts.crf),
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          outputName,
        ]
      : [
          "-i",
          inputName,
          "-c:v",
          "libvpx-vp9",
          "-crf",
          String(Number(opts.crf) + 8),
          "-b:v",
          "0",
          "-deadline",
          "realtime",
          "-cpu-used",
          "8",
          "-c:a",
          "libopus",
          "-b:a",
          "128k",
          outputName,
        ];

  const exitCode = await encoder.exec(args);
  if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);

  const data = await encoder.readFile(outputName);
  if (!data || data.byteLength === 0) {
    throw new Error("Video encoding produced empty output");
  }

  try {
    await encoder.deleteFile(inputName);
  } catch (_) {}
  try {
    await encoder.deleteFile(outputName);
  } catch (_) {}

  const mimeType = opts.format === "mp4" ? "video/mp4" : "video/webm";
  return { blob: new Blob([data.buffer], { type: mimeType }) };
}
