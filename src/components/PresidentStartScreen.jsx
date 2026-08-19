import {
  useEffect,
  useState,
} from "react";

import "./PresidentStartScreen.css";

const START_WIDTH = 1500;
const START_HEIGHT = 1220;
const PAGE_PADDING = 16;

function PresidentStartScreen({
  onStart,
}) {
  const [screenScale, setScreenScale] =
    useState(() => {
      const viewportWidth =
        window.visualViewport?.width ??
        window.innerWidth;

      const viewportHeight =
        window.visualViewport?.height ??
        window.innerHeight;

      const availableWidth = Math.max(
        viewportWidth - PAGE_PADDING * 2,
        1,
      );

      const availableHeight = Math.max(
        viewportHeight - PAGE_PADDING * 2,
        1,
      );

      return Math.min(
        availableWidth / START_WIDTH,
        availableHeight / START_HEIGHT,
        1,
      );
    });

  const [starting, setStarting] =
    useState(false);

  useEffect(() => {
    const updateScreenScale = () => {
      const viewportWidth =
        window.visualViewport?.width ??
        window.innerWidth;

      const viewportHeight =
        window.visualViewport?.height ??
        window.innerHeight;

      const availableWidth = Math.max(
        viewportWidth - PAGE_PADDING * 2,
        1,
      );

      const availableHeight = Math.max(
        viewportHeight - PAGE_PADDING * 2,
        1,
      );

      setScreenScale(
        Math.min(
          availableWidth / START_WIDTH,
          availableHeight / START_HEIGHT,
          1,
        ),
      );
    };

    updateScreenScale();

    window.addEventListener(
      "resize",
      updateScreenScale,
    );

    window.visualViewport?.addEventListener(
      "resize",
      updateScreenScale,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateScreenScale,
      );

      window.visualViewport?.removeEventListener(
        "resize",
        updateScreenScale,
      );
    };
  }, []);

  const handleStart = async () => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      await onStart?.();
    } catch {
      setStarting(false);
    }
  };

  return (
    <main className="presidentStartPage">
      <div
        className="presidentStartFrame"
        style={{
          width: START_WIDTH * screenScale,
          height: START_HEIGHT * screenScale,
        }}
      >
        <section
          className="presidentStartCanvas"
          style={{
            transform: `scale(${screenScale})`,
          }}
        >
          <img
            className="presidentStartBackground"
            src="/backgrounds/president-start.png"
            alt=""
          />

          <div className="presidentStartShade" />

          <button
            type="button"
            className="presidentStartButton"
            onClick={handleStart}
            disabled={starting}
          >
            <span className="presidentStartEnglish">
              PRESIDENT
            </span>

            <span className="presidentStartTitle">
              大富豪
            </span>

            <span className="presidentStartText">
              {starting
                ? "準備中..."
                : "ゲームスタート"}
            </span>
          </button>
        </section>
      </div>
    </main>
  );
}

export default PresidentStartScreen;
