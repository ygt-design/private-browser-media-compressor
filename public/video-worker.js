/* ============================================================
   Video Worker — local classic Web Worker that loads @ffmpeg/core
   directly via importScripts (which works cross-origin, unlike
   new Worker(cdnURL) which is blocked by browsers).

   This follows the EXACT same pattern as the official @ffmpeg/ffmpeg
   worker.js but lives locally to avoid CORS Worker construction.

   Protocol (mirrors official FFmpeg.wasm message types):
     Main → Worker:  { id, type, data }
     Worker → Main:  { id, type, data }              (success)
                     { id, type: 'ERROR', data: msg } (failure)
                     { type: 'LOG', data }             (log event)
                     { type: 'PROGRESS', data }        (progress event)
   ============================================================ */

var ffmpeg = null;

// Message type constants (same as @ffmpeg/ffmpeg)
var MSG = {
  LOAD:        'LOAD',
  EXEC:        'EXEC',
  WRITE_FILE:  'WRITE_FILE',
  READ_FILE:   'READ_FILE',
  DELETE_FILE:  'DELETE_FILE',
  ERROR:       'ERROR',
  LOG:         'LOG',
  PROGRESS:    'PROGRESS',
};

self.onmessage = async function (e) {
  var id   = e.data.id;
  var type = e.data.type;
  var data = e.data.data;
  var trans = [];
  var result;

  try {
    if (type !== MSG.LOAD && !ffmpeg) {
      throw new Error('FFmpeg not loaded — call LOAD first');
    }

    switch (type) {

      case MSG.LOAD:
        result = await handleLoad(data || {});
        break;

      case MSG.EXEC:
        result = handleExec(data);
        break;

      case MSG.WRITE_FILE:
        ffmpeg.FS.writeFile(data.path, data.data);
        result = true;
        break;

      case MSG.READ_FILE:
        result = ffmpeg.FS.readFile(data.path, { encoding: data.encoding || undefined });
        if (result instanceof Uint8Array) {
          trans.push(result.buffer);
        }
        break;

      case MSG.DELETE_FILE:
        ffmpeg.FS.unlink(data.path);
        result = true;
        break;

      default:
        throw new Error('Unknown message type: ' + type);
    }
  } catch (err) {
    self.postMessage({ id: id, type: MSG.ERROR, data: String(err.message || err) });
    return;
  }

  self.postMessage({ id: id, type: type, data: result }, trans);
};

/* ----------------------------------------------------------
   LOAD — fetch core JS (importScripts) + WASM, create module
   ---------------------------------------------------------- */
async function handleLoad(cfg) {
  var coreURL  = cfg.coreURL  || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
  var wasmURL  = cfg.wasmURL  || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';

  // importScripts works cross-origin in classic workers — no CORS Worker issue
  importScripts(coreURL);

  if (typeof createFFmpegCore === 'undefined') {
    throw new Error('createFFmpegCore not found after importScripts');
  }

  // Create the module using the EXACT same pattern as the official worker.
  // The mainScriptUrlOrBlob hash encodes wasmURL so Emscripten's locateFile
  // can find the WASM binary without needing relative path resolution.
  ffmpeg = await createFFmpegCore({
    mainScriptUrlOrBlob: coreURL + '#' + btoa(JSON.stringify({
      wasmURL: wasmURL,
      workerURL: '',
    })),
  });

  // Hook up logging and progress callbacks
  ffmpeg.setLogger(function (data) {
    self.postMessage({ type: MSG.LOG, data: data });
  });
  ffmpeg.setProgress(function (data) {
    self.postMessage({ type: MSG.PROGRESS, data: data });
  });

  return true;  // isFirst
}

/* ----------------------------------------------------------
   EXEC — run FFmpeg command (same API as official worker)
   ---------------------------------------------------------- */
function handleExec(data) {
  var args    = data.args    || [];
  var timeout = data.timeout || -1;

  ffmpeg.setTimeout(timeout);
  ffmpeg.exec.apply(ffmpeg, args);
  var ret = ffmpeg.ret;
  ffmpeg.reset();

  return ret;  // exit code: 0 = success
}
