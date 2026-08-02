import { useEffect, useState } from "react";

export default function useGameScale(
  calculateGameScale,
) {
  const [gameScale, setGameScale] = useState(
    calculateGameScale,
  );

  useEffect(() => {
    const updateGameScale = () => {
      setGameScale(calculateGameScale());
    };

    updateGameScale();

    window.addEventListener(
      "resize",
      updateGameScale,
    );

    window.visualViewport?.addEventListener(
      "resize",
      updateGameScale,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateGameScale,
      );

      window.visualViewport?.removeEventListener(
        "resize",
        updateGameScale,
      );
    };
  }, [calculateGameScale]);

  return gameScale;
}