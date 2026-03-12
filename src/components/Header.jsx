import { useState, useCallback } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);

  const toggleTheme = useCallback(() => {
    setLight((v) => {
      const next = !v;
      document.documentElement.classList.toggle("theme-light", next);
      return next;
    });
  }, []);

  return (
    <header className="header">
      <div className="header__intro">
        <h1 className="header__title">
          <button
            className="header__title-square"
            onClick={toggleTheme}
            aria-label="Toggle light/dark mode"
          />
          PBMC
        </h1>
        <p className="header__subtitle header__subtitle--name">
          Private Browser Media Compressor
        </p>
      </div>
      <div className="header__privacy-wrap">
        <button
          className="header__privacy-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>
            All processing happens locally in your browser. No files are uploaded
            anywhere.
          </span>
          <span className={`header__privacy-arrow${open ? " header__privacy-arrow--open" : ""}`}>
            &#x25BE;
          </span>
        </button>
        <div className={`header__privacy-collapse${open ? " header__privacy-collapse--open" : ""}`}>
          <ul className="header__privacy-list">
            <li>Your media never leaves this device unless you choose to share it.</li>
            <li>Sensitive files stay private and out of third-party storage.</li>
            <li>Compression starts immediately, with no upload bottleneck.</li>
            <li>Your data is not used to train AI models or sold to third parties.</li>
          </ul>
        </div>
      </div>
    </header>
  );
}
