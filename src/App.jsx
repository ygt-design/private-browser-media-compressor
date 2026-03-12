import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import Header from "./components/Header";
import DropZone from "./components/DropZone";
import SettingsPanel from "./components/SettingsPanel";
import QueueSection from "./components/QueueSection";
import ProgressSection from "./components/ProgressSection";
import ResultsSection from "./components/ResultsSection";
import Footer from "./components/Footer";
import {
  deduplicateNames,
  fileType,
  formatBytes,
  getOutputName,
  isAccepted,
} from "./utils/media";
import { VideoEncoder, compressVideo } from "./utils/videoEncoder";
import "./styles.css";

function encodeImageInWorker(worker, data) {
  return new Promise((resolve, reject) => {
    const handler = (e) => {
      if (e.data.id === data.id) {
        worker.removeEventListener("message", handler);
        resolve(e.data);
      }
    };
    const errorHandler = () => {
      worker.removeEventListener("error", errorHandler);
      reject(new Error("Worker error"));
    };

    worker.addEventListener("message", handler);
    worker.addEventListener("error", errorHandler, { once: true });
    worker.postMessage(data, [data.arrayBuffer]);
  });
}

export default function App() {
  const [queue, setQueue] = useState([]);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(92);
  const [lossless, setLossless] = useState(false);
  const [imageFormat, setImageFormat] = useState("webp");
  const [videoCrf, setVideoCrf] = useState(23);
  const [videoFormat, setVideoFormat] = useState("mp4");
  const [progress, setProgress] = useState({ done: 0, total: 0, percent: 0 });
  const [progressDetail, setProgressDetail] = useState("");
  const [videoElapsed, setVideoElapsed] = useState("");
  const [videoPercent, setVideoPercent] = useState(-1);
  const [showProgress, setShowProgress] = useState(false);
  const [videoPulse, setVideoPulse] = useState(false);
  const [totalSavedText, setTotalSavedText] = useState("");

  const nextIdRef = useRef(0);
  const videoEncoderRef = useRef(null);
  const videoReadyRef = useRef(false);
  const cancelledRef = useRef(false);
  const imageWorkerRef = useRef(null);

  const hasImages = useMemo(() => queue.some((f) => f.type === "image"), [queue]);
  const hasVideos = useMemo(() => queue.some((f) => f.type === "video"), [queue]);
  const showVideoCallout =
    showProgress &&
    (videoPulse ||
      progressDetail.toLowerCase().includes("video") ||
      progressDetail.toLowerCase().includes("encoding"));

  useEffect(() => {
    if (imageFormat !== "webp" && lossless) {
      setLossless(false);
    }
  }, [imageFormat, lossless]);

  // Cleanup only on unmount — not on every queue/results change
  useEffect(() => {
    return () => {
      if (videoEncoderRef.current) videoEncoderRef.current.terminate();
    };
  }, []);

  const generateVideoThumb = (id, file) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.addEventListener("loadeddata", () => {
      video.currentTime = 0.1;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 88;
      canvas.height = 88;
      const ctx = canvas.getContext("2d");
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const size = Math.min(vw, vh);
      const sx = (vw - size) / 2;
      const sy = (vh - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 88, 88);
      const thumbUrl = canvas.toDataURL("image/jpeg", 0.5);
      URL.revokeObjectURL(url);

      setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, thumbUrl } : f)));
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
    });
  };

  const addFiles = (files) => {
    if (isProcessing) return;
    const accepted = files.filter(isAccepted);
    if (!accepted.length) return;

    const nextItems = accepted.map((file) => {
      const id = nextIdRef.current++;
      const type = fileType(file);
      const thumbUrl = type === "image" ? URL.createObjectURL(file) : "";
      if (type === "video") generateVideoThumb(id, file);
      return { id, file, type, thumbUrl };
    });

    setQueue((prev) => [...prev, ...nextItems]);
    results.forEach((item) => {
      if (item.downloadUrl) URL.revokeObjectURL(item.downloadUrl);
    });
    setResults([]);
    setTotalSavedText("");
  };

  const removeFile = (id) => {
    setQueue((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.thumbUrl?.startsWith("blob:")) URL.revokeObjectURL(item.thumbUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearQueue = () => {
    setQueue((prev) => {
      prev.forEach((f) => {
        if (f.thumbUrl?.startsWith("blob:")) URL.revokeObjectURL(f.thumbUrl);
      });
      return [];
    });
  };

  const loadVideoEncoder = async () => {
    if (videoReadyRef.current && videoEncoderRef.current) return;
    setProgressDetail("Loading video encoder (~30 MB, first time only)...");

    const enc = new VideoEncoder();
    enc.onProgress = ({ progress: p }) => {
      if (p > 0 && p <= 1) {
        const pct = Math.round(p * 100);
        setVideoPercent(pct);
        setProgress((prev) => {
          const base = prev.total > 0 ? (prev.done / prev.total) * 100 : 0;
          const slice = prev.total > 0 ? (1 / prev.total) * 100 : 0;
          return { ...prev, percent: Math.round(base + slice * p) };
        });
      }
    };

    await enc.load();
    videoEncoderRef.current = enc;
    videoReadyRef.current = true;
    setProgressDetail("");
  };

  const updateProgress = (done, total) => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    setProgress({ done, total, percent: pct });
  };

  const cancelCompression = () => {
    cancelledRef.current = true;

    if (imageWorkerRef.current) {
      imageWorkerRef.current.terminate();
      imageWorkerRef.current = null;
    }

    if (videoEncoderRef.current) {
      videoEncoderRef.current.terminate();
      videoEncoderRef.current = null;
      videoReadyRef.current = false;
    }

    // Reset UI directly — the async loop may be stuck on a hanging promise
    setIsProcessing(false);
    setShowProgress(false);
    setProgressDetail("");
    setVideoPulse(false);
    setVideoElapsed("");
    setVideoPercent(-1);
    setTotalSavedText("Cancelled.");
  };

  const startCompression = async () => {
    if (!queue.length || isProcessing) return;

    cancelledRef.current = false;
    setIsProcessing(true);
    setShowProgress(true);
    setVideoPulse(false);
    setProgressDetail("");
    setResults((prev) => {
      prev.forEach((r) => {
        if (r.downloadUrl) URL.revokeObjectURL(r.downloadUrl);
      });
      return [];
    });
    setTotalSavedText("");

    const imageQuality = lossless ? 1 : quality / 100;
    const total = queue.length;
    let processed = 0;
    const nextResults = [];
    updateProgress(0, total);

    if (hasVideos) {
      try {
        await loadVideoEncoder();
      } catch (err) {
        queue.forEach((item) => {
          if (item.type === "video") {
            nextResults.push({
              id: item.id,
              fileName: getOutputName(item.file.name, "video", videoFormat, imageFormat),
              error: `Failed to load video encoder: ${err.message || String(err)}`,
              originalSize: item.file.size,
              mediaType: "video",
            });
          }
        });
      }
    }

    const imageWorker = new Worker("/worker.js");
    imageWorkerRef.current = imageWorker;

    for (const item of queue) {
      if (cancelledRef.current) break;
      const outputName = getOutputName(item.file.name, item.type, videoFormat, imageFormat);

      if (item.type === "image") {
        try {
          const arrayBuffer = await item.file.arrayBuffer();
          if (cancelledRef.current) break;
          const result = await encodeImageInWorker(imageWorker, {
            id: item.id,
            fileName: outputName,
            arrayBuffer,
            quality: imageQuality,
            lossless,
            outputFormat: imageFormat,
          });

          if (cancelledRef.current) break;
          if (result.success) {
            const blob = new Blob([result.resultBuffer], {
              type: result.outputMime || "image/webp",
            });
            nextResults.push({
              id: result.id,
              fileName: result.fileName,
              blob,
              downloadUrl: URL.createObjectURL(blob),
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              width: result.width,
              height: result.height,
              mediaType: "image",
            });
          } else {
            nextResults.push({
              id: result.id,
              fileName: result.fileName,
              error: result.error,
              originalSize: item.file.size,
              mediaType: "image",
            });
          }
        } catch (err) {
          if (cancelledRef.current) break;
          nextResults.push({
            id: item.id,
            fileName: outputName,
            error: err.message || "Processing failed",
            originalSize: item.file.size,
            mediaType: "image",
          });
        }
      } else {
        const alreadyFailed = nextResults.some((r) => r.id === item.id);
        if (!alreadyFailed && videoReadyRef.current && videoEncoderRef.current) {
          setVideoPulse(true);
          setVideoElapsed("");
          setVideoPercent(-1);
          const t0 = Date.now();
          const timer = setInterval(() => {
            const sec = Math.round((Date.now() - t0) / 1000);
            const min = Math.floor(sec / 60);
            const s = String(sec % 60).padStart(2, "0");
            setVideoElapsed(min > 0 ? `${min}:${s}` : `0:${s}`);
          }, 1000);

          try {
            setProgressDetail("Encoding video...");
            const result = await compressVideo(videoEncoderRef.current, item.file, {
              crf: videoCrf,
              format: videoFormat,
            });
            if (cancelledRef.current) {
              clearInterval(timer);
              break;
            }
            nextResults.push({
              id: item.id,
              fileName: outputName,
              blob: result.blob,
              downloadUrl: URL.createObjectURL(result.blob),
              originalSize: item.file.size,
              compressedSize: result.blob.size,
              mediaType: "video",
            });
          } catch (err) {
            if (cancelledRef.current) {
              clearInterval(timer);
              break;
            }
            nextResults.push({
              id: item.id,
              fileName: outputName,
              error: err.message || "Video encoding failed",
              originalSize: item.file.size,
              mediaType: "video",
            });
          } finally {
            clearInterval(timer);
            setVideoPulse(false);
            setVideoElapsed("");
            setVideoPercent(-1);
          }
        }
      }

      processed += 1;
      updateProgress(processed, total);
    }

    if (imageWorkerRef.current) {
      imageWorkerRef.current.terminate();
      imageWorkerRef.current = null;
    }
    setProgressDetail("");
    setVideoElapsed("");
    setVideoPercent(-1);
    setVideoPulse(false);

    const wasCancelled = cancelledRef.current;

    const deduped = deduplicateNames(nextResults);
    let totalOriginal = 0;
    let totalCompressed = 0;
    let successCount = 0;
    deduped.forEach((r) => {
      if (!r.error) {
        totalOriginal += r.originalSize;
        totalCompressed += r.compressedSize;
        successCount += 1;
      }
    });

    if (wasCancelled && successCount === 0) {
      setTotalSavedText("Cancelled.");
    } else if (wasCancelled && successCount > 0) {
      const savedTotal = totalOriginal - totalCompressed;
      const savedPctTotal = totalOriginal > 0 ? Math.round((savedTotal / totalOriginal) * 100) : 0;
      setTotalSavedText(
        `Cancelled — ${successCount} file${successCount > 1 ? "s" : ""} completed: ${formatBytes(totalOriginal)} -> ${formatBytes(totalCompressed)} (${savedPctTotal >= 0 ? "-" : "+"}${Math.abs(savedPctTotal)}%)`
      );
    } else if (successCount > 0) {
      const savedTotal = totalOriginal - totalCompressed;
      const savedPctTotal = totalOriginal > 0 ? Math.round((savedTotal / totalOriginal) * 100) : 0;
      setTotalSavedText(
        `${formatBytes(totalOriginal)} -> ${formatBytes(totalCompressed)} (${savedPctTotal >= 0 ? "-" : "+"}${Math.abs(savedPctTotal)}%)`
      );
    } else {
      setTotalSavedText("No files were successfully compressed.");
    }

    setResults(deduped);
    setShowProgress(false);
    setIsProcessing(false);
  };

  const handleDownloadAll = async () => {
    const successful = results.filter((r) => !r.error && r.blob);
    if (!successful.length) return;

    const zip = new JSZip();
    successful.forEach((item) => zip.file(item.fileName, item.blob));

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compressed-media.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Keep alert parity with the previous vanilla app.
      alert(`Failed to create ZIP: ${err.message}`);
    }
  };

  return (
    <div className="app">
      <section className="app__left">
        <Header />
        <DropZone disabled={isProcessing} onFilesSelected={addFiles} />
        <Footer />
      </section>

      <section className="app__right">
        {showVideoCallout ? (
          <section className="video-callout" aria-live="polite">
            <span className="video-callout__dot" />
            <p>
              {progressDetail && progressDetail.toLowerCase().includes("video")
                ? progressDetail
                : "Video compression is in progress..."}
            </p>
          </section>
        ) : null}

        <SettingsPanel
          hasImages={hasImages}
          hasVideos={hasVideos}
          quality={quality}
          setQuality={setQuality}
          lossless={lossless}
          setLossless={setLossless}
          imageFormat={imageFormat}
          setImageFormat={setImageFormat}
          videoCrf={videoCrf}
          setVideoCrf={setVideoCrf}
          videoFormat={videoFormat}
          setVideoFormat={setVideoFormat}
        />

        <QueueSection
          queue={queue}
          isProcessing={isProcessing}
          onRemove={removeFile}
          onClearAll={clearQueue}
          onCompress={startCompression}
        />

        <ProgressSection
          visible={showProgress}
          progress={progress}
          progressDetail={progressDetail}
          isVideoPulse={videoPulse}
          videoElapsed={videoElapsed}
          videoPercent={videoPercent}
          onCancel={cancelCompression}
        />

        <ResultsSection
          results={results}
          totalSavedText={totalSavedText}
          onDownloadAll={handleDownloadAll}
        />

        {!queue.length && !showProgress && !results.length ? (
          <section className="panel-empty">
            <h2>Uploads + Compression Activity</h2>
            <p>
              Your selected files, processing progress, and output downloads will appear here.
            </p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
