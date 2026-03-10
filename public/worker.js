/* ============================================================
   Image Encoding Worker
   Receives image data, encodes to requested output format via
   OffscreenCanvas, and returns the resulting blob.
   ============================================================ */

self.onmessage = async function (e) {
  const { id, fileName, arrayBuffer, quality, lossless, outputFormat } = e.data;

  try {
    // Decode the image from the ArrayBuffer
    const blob = new Blob([arrayBuffer]);
    const bitmap = await createImageBitmap(blob);

    // Create an OffscreenCanvas matching the image dimensions
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const formatToMime = {
      webp: "image/webp",
      avif: "image/avif",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
    };
    const outputMime = formatToMime[outputFormat] || "image/webp";
    const encodeQuality = lossless ? 1.0 : quality;
    const encodeOptions =
      outputMime === "image/png"
        ? { type: outputMime }
        : { type: outputMime, quality: encodeQuality };
    const encodedBlob = await canvas.convertToBlob(encodeOptions);

    // Convert blob to ArrayBuffer to transfer back
    const resultBuffer = await encodedBlob.arrayBuffer();

    self.postMessage(
      {
        id,
        fileName,
        resultBuffer,
        originalSize: arrayBuffer.byteLength,
        compressedSize: resultBuffer.byteLength,
        width: canvas.width,
        height: canvas.height,
        outputMime,
        success: true,
      },
      [resultBuffer] // Transfer ownership for performance
    );
  } catch (err) {
    self.postMessage({
      id,
      fileName,
      success: false,
      error: err.message || 'Unknown encoding error',
    });
  }
};
