export default function Header() {
  return (
    <header className="header">
      <div className="header__intro">
        <h1 className="header__title">Private Browser Media Compressor</h1>
        <p className="header__subtitle header__subtitle--lead">
          All processing happens locally in your browser. No files are uploaded
          anywhere.
        </p>
        <div className="header__feature-status" aria-live="polite">
          <span className="header__feature-status-dot" />
          <span>Video Compression feature in progress</span>
        </div>
      </div>
      <section className="header__privacy">
        <h2 className="header__privacy-title">Why this matters</h2>
        <ul className="header__privacy-list">
          <li>Your media never leaves this device unless you choose to share it.</li>
          <li>Sensitive files stay private and out of third-party storage.</li>
          <li>Compression starts immediately, with no upload bottleneck.</li>
          <li>Your data is not used to train AI models or sold to third parties.</li>
        </ul>
      </section>
    </header>
  );
}
