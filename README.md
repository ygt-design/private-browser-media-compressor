# Media Compressor (React + Vite)

A privacy-friendly, client-side media compressor built with React (JSX) and Vite.
It converts images to WebP and compresses videos in-browser with FFmpeg.wasm.

## Features

- Drag-and-drop or browse multiple files
- Image compression to WebP (quality slider or lossless)
- Video compression to MP4 (H.264) or WebM (VP9)
- Local-only processing (no uploads)
- Per-file downloads and ZIP export

## Tech Stack

- React + JSX (Vite)
- Web Workers for image and video processing
- OffscreenCanvas + createImageBitmap for image encoding
- FFmpeg core in `public/video-worker.js` for video encoding
- JSZip (npm package) for ZIP downloads

## Scripts

```bash
npm install
npm run dev
```

Runs the app in development mode (typically [http://localhost:5173](http://localhost:5173)).

```bash
npm run build
```

Builds the app for production into `dist/`.

```bash
npm run preview
```

Serves the production build locally for preview.

## Project Structure

- `src/App.jsx` - main container and compression orchestration
- `src/main.jsx` - Vite React entry point
- `src/components/` - UI split into reusable JSX components
- `src/utils/media.js` - media helpers and formatting utilities
- `src/utils/videoEncoder.js` - video worker wrapper and FFmpeg execution
- `public/worker.js` - image encoder worker
- `public/video-worker.js` - FFmpeg video worker

## Browser Notes

Image conversion requires browsers that support `OffscreenCanvas.convertToBlob("image/webp")`.
Video conversion performance depends on device CPU and browser wasm performance.
