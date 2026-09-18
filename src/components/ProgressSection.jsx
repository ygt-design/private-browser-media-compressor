export default function ProgressSection({
  visible,
  progress,
  progressDetail,
  onCancel,
}) {
  if (!visible) return null;

  return (
    <section className="progress-section">
      <div className="progress-section__info">
        <span>{`Processing ${progress.done} / ${progress.total}`}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ width: `${progress.percent}%` }}
        ></div>
      </div>

      <div className="progress-section__footer">
        <div className="progress-section__detail">{progressDetail}</div>

        <button className="btn btn--ghost btn--sm progress-section__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
