import { useRef, useState } from "react";
import { isAccepted } from "../utils/media";

export default function DropZone({ disabled, onFilesSelected }) {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const pickFiles = (files) => {
    const accepted = Array.from(files || []).filter(isAccepted);
    if (accepted.length > 0) onFilesSelected(accepted);
  };

  return (
    <div
      className={`drop-zone${isDragActive ? " drop-zone--active" : ""}`}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragActive(false);
        if (!disabled) pickFiles(e.dataTransfer.files);
      }}
    >
      <div className="drop-zone__content">
        <svg
          className="drop-zone__icon"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 4L24 32M24 4L16 12M24 4L32 12"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 28V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V28"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="drop-zone__label">Drag &amp; drop files here</p>
        <p className="drop-zone__sublabel">or</p>
        <button
          className="btn btn--primary"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) inputRef.current?.click();
          }}
        >
          Browse Files
        </button>
        <p className="drop-zone__hint">
          Images: JPEG, PNG, WebP, GIF, BMP - Videos: MP4, MOV, WebM, AVI, MKV
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,video/avi,video/mov,.mkv,.mov,.avi"
        onChange={(e) => {
          pickFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
