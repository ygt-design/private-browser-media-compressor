export default function SettingsPanel({
  hasImages,
  hasVideos,
  quality,
  setQuality,
  lossless,
  setLossless,
  imageFormat,
  setImageFormat,
  videoCrf,
  setVideoCrf,
  videoFormat,
  setVideoFormat,
}) {
  if (!hasImages && !hasVideos) return null;

  return (
    <section className="settings">
      {hasImages ? (
        <div className="settings__group">
          <h3 className="settings__group-title">Image Settings</h3>
          <div className="settings__row">
            <div className="settings__quality">
              <label htmlFor="qualitySlider" className="settings__label">
                Quality: <strong>{quality}</strong>%
              </label>
              <input
                id="qualitySlider"
                className="settings__slider"
                type="range"
                min="50"
                max="100"
                step="1"
                value={quality}
                disabled={lossless}
                style={{ opacity: lossless ? 0.4 : 1 }}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <div className="settings__range-labels">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>
            <div className="settings__format">
              <label htmlFor="imageFormatSelect" className="settings__label">
                Output format
              </label>
              <select
                id="imageFormatSelect"
                className="settings__select"
                value={imageFormat}
                onChange={(e) => setImageFormat(e.target.value)}
              >
                <option value="webp">WebP</option>
                <option value="avif">AVIF</option>
                <option value="jpeg">JPEG</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </div>
            <div className="settings__lossless">
              <label className="settings__checkbox-label">
                <input
                  type="checkbox"
                  disabled={imageFormat !== "webp"}
                  checked={lossless}
                  onChange={(e) => setLossless(e.target.checked)}
                />
                <span className="settings__checkmark"></span>
                Lossless
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {hasVideos ? (
        <div className="settings__group">
          <h3 className="settings__group-title">Video Settings</h3>
          <div className="settings__row">
            <div className="settings__quality">
              <label htmlFor="videoCrfSlider" className="settings__label">
                Quality (CRF): <strong>{videoCrf}</strong>
              </label>
              <input
                id="videoCrfSlider"
                className="settings__slider"
                type="range"
                min="18"
                max="35"
                step="1"
                value={videoCrf}
                onChange={(e) => setVideoCrf(Number(e.target.value))}
              />
              <div className="settings__range-labels">
                <span>Higher quality</span>
                <span>Smaller file</span>
              </div>
            </div>
            <div className="settings__format">
              <label htmlFor="videoFormatSelect" className="settings__label">
                Output format
              </label>
              <select
                id="videoFormatSelect"
                className="settings__select"
                value={videoFormat}
                onChange={(e) => setVideoFormat(e.target.value)}
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="webm">WebM (VP8)</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
