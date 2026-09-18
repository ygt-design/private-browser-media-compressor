/* ============================================================
   Image Encoding Worker (jSquash / Squoosh codecs)
   Decodes via the browser (createImageBitmap -> OffscreenCanvas ->
   getImageData), optionally resizes (aspect-preserving), then encodes
   with the appropriate Squoosh codec. Codecs are imported lazily so a
   format's WASM only loads on first use.
   ============================================================ */

async function decodeToImageData(arrayBuffer) {
  const bitmap = await createImageBitmap(new Blob([arrayBuffer]));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function targetDimensions(srcW, srcH, width, height) {
  const w = width ? Number(width) : 0;
  const h = height ? Number(height) : 0;
  if (w && h) {
    const scale = Math.min(w / srcW, h / srcH);
    return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
  }
  if (w) {
    return { width: w, height: Math.round((srcH * w) / srcW) };
  }
  if (h) {
    return { width: Math.round((srcW * h) / srcH), height: h };
  }
  return null;
}

self.onmessage = async function (e) {
  const { id, fileName, arrayBuffer, quality, lossless, outputFormat, width, height } = e.data;

  try {
    let imageData = await decodeToImageData(arrayBuffer);

    const target = targetDimensions(imageData.width, imageData.height, width, height);
    if (target && (target.width !== imageData.width || target.height !== imageData.height)) {
      const { default: resize } = await import("@jsquash/resize");
      imageData = await resize(imageData, { width: target.width, height: target.height });
    }

    let resultBuffer;
    let outputMime;

    if (outputFormat === "jpeg" || outputFormat === "jpg") {
      const { encode } = await import("@jsquash/jpeg");
      resultBuffer = await encode(imageData, { quality });
      outputMime = "image/jpeg";
    } else if (outputFormat === "png") {
      const { optimise } = await import("@jsquash/oxipng");
      const level = Math.min(Math.max(Math.round((quality / 100) * 4), 1), 4);
      resultBuffer = await optimise(imageData, { level });
      outputMime = "image/png";
    } else {
      const { encode } = await import("@jsquash/webp");
      resultBuffer = await encode(imageData, { quality, lossless: lossless ? 1 : 0 });
      outputMime = "image/webp";
    }

    self.postMessage(
      {
        id,
        fileName,
        resultBuffer,
        originalSize: arrayBuffer.byteLength,
        compressedSize: resultBuffer.byteLength,
        width: imageData.width,
        height: imageData.height,
        outputMime,
        success: true,
      },
      [resultBuffer]
    );
  } catch (err) {
    self.postMessage({
      id,
      fileName,
      success: false,
      error: err.message || "Unknown encoding error",
    });
  }
};
