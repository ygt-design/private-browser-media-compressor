export function isImage(file) {
  return file.type.startsWith("image/");
}

export function isVideo(file) {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return [
    "mp4",
    "mov",
    "webm",
    "avi",
    "mkv",
    "m4v",
    "flv",
    "ogv",
    "3gp",
    "wmv",
  ].includes(ext);
}

export function isAccepted(file) {
  return isImage(file) || isVideo(file);
}

export function fileType(file) {
  return isVideo(file) ? "video" : "image";
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getOutputName(originalName, type, videoFormat, imageFormat = "webp") {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.substring(0, dot) : originalName;
  return type === "video" ? `${base}.${videoFormat}` : `${base}.${imageFormat}`;
}

export function deduplicateNames(items) {
  const seen = {};
  return items.map((item) => {
    if (!item.fileName) return item;
    let name = item.fileName;
    if (seen[name] !== undefined) {
      seen[name] += 1;
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.substring(0, dot) : name;
      const ext = dot > 0 ? name.substring(dot) : "";
      name = `${base}-${seen[item.fileName]}${ext}`;
    } else {
      seen[name] = 0;
    }
    return { ...item, fileName: name };
  });
}
