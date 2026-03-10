export default function ProgressSection({ visible, progress, progressDetail, isVideoPulse }) {
  if (!visible) return null;

  return (
    <section className="progress-section">
      <div className="progress-section__info">
        <span>{`Processing ${progress.done} / ${progress.total}`}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-bar__fill${isVideoPulse ? " progress-bar__fill--pulse" : ""}`}
          style={{ width: `${progress.percent}%` }}
        ></div>
      </div>
      <div className="progress-section__detail">{progressDetail}</div>
    </section>
  );
}
