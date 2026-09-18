export default function SettingsPanel({
  hasImages,
  quality,
  setQuality,
  lossless,
  setLossless,
  imageFormat,
  setImageFormat,
  width,
  setWidth,
  height,
  setHeight,
}) {
  if (!hasImages) return null;

  const isPng = imageFormat === "png";
  const qualityDisabled = lossless || isPng;

  return (
    <section className="settings">
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
              min="1"
              max="100"
              step="1"
              value={quality}
              disabled={qualityDisabled}
              style={{ opacity: qualityDisabled ? 0.4 : 1 }}
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
              <option value="jpeg">JPEG</option>
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

        {isPng ? (
          <p className="settings__hint">
            PNG is lossless — slider controls optimization effort.
          </p>
        ) : null}

        <div className="settings__row">
          <div className="settings__format">
            <label htmlFor="widthInput" className="settings__label">
              Width (px)
            </label>
            <input
              id="widthInput"
              className="settings__select"
              type="number"
              min="1"
              placeholder="auto"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="settings__format">
            <label htmlFor="heightInput" className="settings__label">
              Height (px)
            </label>
            <input
              id="heightInput"
              className="settings__select"
              type="number"
              min="1"
              placeholder="auto"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>
        <p className="settings__hint">
          Leave blank to keep original. Aspect ratio is always preserved.
        </p>
      </div>
    </section>
  );
}
