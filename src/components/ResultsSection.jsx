import { formatBytes } from "../utils/media";

function ResultItem({ item }) {
  if (item.error) {
    return (
      <li className="results__item">
        <div
          className="queue__thumb"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            color: "var(--color-text-dim)",
          }}
        >
          !
        </div>
        <div className="results__file-info">
          <div className="results__file-name">{item.fileName}</div>
          <div className="results__file-meta">
            <span className="results__error">{item.error}</span>
          </div>
        </div>
      </li>
    );
  }

  const saved = item.originalSize - item.compressedSize;
  const savedPct = item.originalSize > 0 ? Math.round((saved / item.originalSize) * 100) : 0;

  return (
    <li className="results__item">
      {item.mediaType === "video" ? (
        <div
          className="results__thumb"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            color: "var(--color-text-dim)",
          }}
        >
          &#9654;
        </div>
      ) : (
        <img className="results__thumb" src={item.downloadUrl} alt="" />
      )}

      <div className="results__file-info">
        <div className="results__file-name">
          {item.fileName}
          <span className="queue__type-badge">{item.mediaType === "video" ? "vid" : "img"}</span>
        </div>
        <div className="results__file-meta">
          <span>
            {formatBytes(item.originalSize)} -&gt; {formatBytes(item.compressedSize)}
          </span>
          <span className="results__savings">
            {savedPct >= 0 ? "-" : "+"}
            {Math.abs(savedPct)}%
          </span>
          {item.width && item.height ? <span>{item.width}x{item.height}</span> : null}
        </div>
      </div>

      <a className="btn btn--sm btn--download" href={item.downloadUrl} download={item.fileName}>
        Download
      </a>
    </li>
  );
}

export default function ResultsSection({ results, totalSavedText, onDownloadAll }) {
  if (!results.length) return null;

  const successCount = results.filter((r) => !r.error && r.blob).length;

  return (
    <section className="results">
      <div className="results__header">
        <h2 className="results__title">Compression Complete</h2>
        <div className="results__summary">
          <span>{totalSavedText}</span>
        </div>
        {successCount > 0 ? (
          <button className="btn btn--primary" type="button" onClick={onDownloadAll}>
            Download All as ZIP
          </button>
        ) : null}
      </div>
      <ul className="results__list">
        {results.map((item) => (
          <ResultItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
