export default function ProgressSection({
  visible,
  progress,
  progressDetail,
  isVideoPulse,
  videoElapsed,
  videoPercent,
  onCancel,
}) {
  if (!visible) return null;

  const showVideoStats = isVideoPulse && (videoElapsed || videoPercent >= 0);

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

      <div className="progress-section__footer">
        {showVideoStats ? (
          <div className="progress-section__video-stats">
            <span className="progress-section__detail">{progressDetail}</span>
            <span className="progress-section__video-meta">
              {videoPercent >= 0 && (
                <span className="progress-section__video-pct">{videoPercent}%</span>
              )}
              {videoElapsed && (
                <span className="progress-section__video-elapsed">{videoElapsed}</span>
              )}
            </span>
          </div>
        ) : (
          <div className="progress-section__detail">{progressDetail}</div>
        )}

        <button className="btn btn--ghost btn--sm progress-section__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
