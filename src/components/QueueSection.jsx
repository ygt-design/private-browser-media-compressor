import { formatBytes } from "../utils/media";

function QueueItem({ item, onRemove }) {
  return (
    <li className="queue__item">
      {item.type === "video" ? (
        <div
          className="queue__video-thumb"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-bg)",
          }}
        >
          {item.thumbUrl ? (
            <img className="queue__video-thumb" src={item.thumbUrl} alt="" />
          ) : (
            <span style={{ fontSize: "1.2rem", color: "var(--color-text-dim)" }}>
              &#9654;
            </span>
          )}
        </div>
      ) : (
        <img className="queue__thumb" src={item.thumbUrl} alt="" />
      )}

      <div className="queue__file-info">
        <div className="queue__file-name">
          {item.file.name}
          <span className="queue__type-badge">{item.type === "video" ? "vid" : "img"}</span>
        </div>
        <div className="queue__file-size">{formatBytes(item.file.size)}</div>
      </div>

      <button
        className="queue__remove-btn"
        title="Remove"
        type="button"
        onClick={() => onRemove(item.id)}
      >
        &times;
      </button>
    </li>
  );
}

export default function QueueSection({
  queue,
  isProcessing,
  onRemove,
  onClearAll,
  onCompress,
}) {
  if (queue.length === 0) return null;

  return (
    <section className="queue">
      <div className="queue__header">
        <h2 className="queue__title">{queue.length} file(s) selected</h2>
        <div className="queue__actions">
          <button
            className="btn btn--ghost"
            type="button"
            disabled={isProcessing}
            onClick={onClearAll}
          >
            Clear All
          </button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={isProcessing}
            onClick={onCompress}
          >
            Compress All
          </button>
        </div>
      </div>
      <ul className="queue__list">
        {queue.map((item) => (
          <QueueItem key={item.id} item={item} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}
