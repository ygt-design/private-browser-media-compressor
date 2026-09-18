import { formatBytes } from "../utils/media";

function QueueItem({ item, onRemove, estimate, isEstimating }) {
  let estimateNode = null;
  if (estimate?.error) {
    estimateNode = <span className="queue__estimate queue__estimate--error"> · can&apos;t estimate</span>;
  } else if (estimate) {
    const saved = item.file.size - estimate.compressedSize;
    const pct = item.file.size > 0 ? Math.round((saved / item.file.size) * 100) : 0;
    estimateNode = (
      <span className="queue__estimate">
        {" -> ~"}
        {formatBytes(estimate.compressedSize)} ({pct >= 0 ? "-" : "+"}
        {Math.abs(pct)}%)
      </span>
    );
  } else if (isEstimating) {
    estimateNode = <span className="queue__estimate queue__estimate--pending"> · estimating…</span>;
  }

  return (
    <li className="queue__item">
      <img className="queue__thumb" src={item.thumbUrl} alt="" />

      <div className="queue__file-info">
        <div className="queue__file-name">{item.file.name}</div>
        <div className="queue__file-size">
          {formatBytes(item.file.size)}
          {estimateNode}
        </div>
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
  estimates = {},
  isEstimating = false,
  onRemove,
  onClearAll,
  onCompress,
}) {
  if (queue.length === 0) return null;

  const estimated = queue.filter((q) => estimates[q.id] && !estimates[q.id].error);
  const totalOrig = estimated.reduce((s, q) => s + q.file.size, 0);
  const totalEst = estimated.reduce((s, q) => s + estimates[q.id].compressedSize, 0);
  const totalPct = totalOrig > 0 ? Math.round(((totalOrig - totalEst) / totalOrig) * 100) : 0;

  let summary = null;
  if (estimated.length > 0) {
    summary = (
      <p className="queue__estimate-total">
        Estimated: {formatBytes(totalOrig)} -&gt; ~{formatBytes(totalEst)} ({totalPct >= 0 ? "-" : "+"}
        {Math.abs(totalPct)}%){isEstimating ? " · calculating…" : ""}
      </p>
    );
  } else if (isEstimating) {
    summary = <p className="queue__estimate-total">Estimating sizes…</p>;
  }

  return (
    <section className="queue">
      <div className="queue__header">
        <div className="queue__heading">
          <h2 className="queue__title">{queue.length} file(s) selected</h2>
          {summary}
        </div>
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
          <QueueItem
            key={item.id}
            item={item}
            onRemove={onRemove}
            estimate={estimates[item.id]}
            isEstimating={isEstimating}
          />
        ))}
      </ul>
    </section>
  );
}
