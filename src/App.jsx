import { useEffect, useRef, useState } from "react";
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
  formatBytes,
  getOutputName,
  isImage,
} from "./utils/media";
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
  const [quality, setQuality] = useState(80);
  const [lossless, setLossless] = useState(false);
  const [imageFormat, setImageFormat] = useState("webp");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0, percent: 0 });
  const [progressDetail, setProgressDetail] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [totalSavedText, setTotalSavedText] = useState("");
  const [estimates, setEstimates] = useState({});
  const [isEstimating, setIsEstimating] = useState(false);

  const nextIdRef = useRef(0);
  const cancelledRef = useRef(false);
  const imageWorkerRef = useRef(null);
  const estimationWorkerRef = useRef(null);
  const estimationGenRef = useRef(0);

  const hasImages = queue.length > 0;

  useEffect(() => {
    if (imageFormat !== "webp" && lossless) {
      setLossless(false);
    }
  }, [imageFormat, lossless]);

  // Terminate any estimation worker on unmount.
  useEffect(() => {
    return () => {
      if (estimationWorkerRef.current) estimationWorkerRef.current.terminate();
    };
  }, []);

  // Auto-preview: debounced background encode to predict output sizes before
  // the user compresses. Re-runs whenever files or settings change.
  useEffect(() => {
    if (isProcessing) return;
    if (!queue.length) {
      setEstimates({});
      setIsEstimating(false);
      return;
    }

    const handle = setTimeout(() => {
      const gen = ++estimationGenRef.current;
      if (estimationWorkerRef.current) {
        estimationWorkerRef.current.terminate();
        estimationWorkerRef.current = null;
      }
      const worker = new Worker(new URL("./imageWorker.js", import.meta.url), {
        type: "module",
      });
      estimationWorkerRef.current = worker;
      setIsEstimating(true);

      (async () => {
        const next = {};
        for (const item of queue) {
          if (estimationGenRef.current !== gen) return;
          try {
            const arrayBuffer = await item.file.arrayBuffer();
            if (estimationGenRef.current !== gen) return;
            const result = await encodeImageInWorker(worker, {
              id: item.id,
              fileName: "",
              arrayBuffer,
              quality,
              lossless,
              outputFormat: imageFormat,
              width,
              height,
            });
            if (estimationGenRef.current !== gen) return;
            next[item.id] = result.success
              ? {
                  compressedSize: result.compressedSize,
                  width: result.width,
                  height: result.height,
                }
              : { error: true };
          } catch {
            if (estimationGenRef.current !== gen) return;
            next[item.id] = { error: true };
          }
          if (estimationGenRef.current !== gen) return;
          setEstimates({ ...next });
        }
        if (estimationGenRef.current === gen) {
          setIsEstimating(false);
          if (estimationWorkerRef.current === worker) {
            worker.terminate();
            estimationWorkerRef.current = null;
          }
        }
      })();
    }, 400);

    return () => clearTimeout(handle);
  }, [queue, quality, lossless, imageFormat, width, height, isProcessing]);

  const addFiles = (files) => {
    if (isProcessing) return;
    const accepted = files.filter(isImage);
    if (!accepted.length) return;

    const nextItems = accepted.map((file) => {
      const id = nextIdRef.current++;
      return { id, file, type: "image", thumbUrl: URL.createObjectURL(file) };
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

    // Reset UI directly — the async loop may be stuck on a hanging promise
    setIsProcessing(false);
    setShowProgress(false);
    setProgressDetail("");
    setTotalSavedText("Cancelled.");
  };

  const startCompression = async () => {
    if (!queue.length || isProcessing) return;

    // Abort any in-flight estimation so it doesn't compete for CPU.
    estimationGenRef.current++;
    if (estimationWorkerRef.current) {
      estimationWorkerRef.current.terminate();
      estimationWorkerRef.current = null;
    }
    setIsEstimating(false);

    cancelledRef.current = false;
    setIsProcessing(true);
    setShowProgress(true);
    setProgressDetail("");
    setResults((prev) => {
      prev.forEach((r) => {
        if (r.downloadUrl) URL.revokeObjectURL(r.downloadUrl);
      });
      return [];
    });
    setTotalSavedText("");

    const total = queue.length;
    let processed = 0;
    const nextResults = [];
    updateProgress(0, total);

    const imageWorker = new Worker(new URL("./imageWorker.js", import.meta.url), {
      type: "module",
    });
    imageWorkerRef.current = imageWorker;

    let first = true;
    for (const item of queue) {
      if (cancelledRef.current) break;
      const outputName = getOutputName(item.file.name, imageFormat);

      if (first) {
        setProgressDetail("Loading codec...");
        first = false;
      }

      try {
        const arrayBuffer = await item.file.arrayBuffer();
        if (cancelledRef.current) break;
        const result = await encodeImageInWorker(imageWorker, {
          id: item.id,
          fileName: outputName,
          arrayBuffer,
          quality,
          lossless,
          outputFormat: imageFormat,
          width,
          height,
        });

        if (cancelledRef.current) break;
        setProgressDetail("");
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
          });
        } else {
          nextResults.push({
            id: result.id,
            fileName: result.fileName,
            error: result.error,
            originalSize: item.file.size,
          });
        }
      } catch (err) {
        if (cancelledRef.current) break;
        nextResults.push({
          id: item.id,
          fileName: outputName,
          error: err.message || "Processing failed",
          originalSize: item.file.size,
        });
      }

      processed += 1;
      updateProgress(processed, total);
    }

    if (imageWorkerRef.current) {
      imageWorkerRef.current.terminate();
      imageWorkerRef.current = null;
    }
    setProgressDetail("");

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
        <SettingsPanel
          hasImages={hasImages}
          quality={quality}
          setQuality={setQuality}
          lossless={lossless}
          setLossless={setLossless}
          imageFormat={imageFormat}
          setImageFormat={setImageFormat}
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
        />

        <QueueSection
          queue={queue}
          isProcessing={isProcessing}
          estimates={estimates}
          isEstimating={isEstimating}
          onRemove={removeFile}
          onClearAll={clearQueue}
          onCompress={startCompression}
        />

        <ProgressSection
          visible={showProgress}
          progress={progress}
          progressDetail={progressDetail}
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
