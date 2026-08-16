import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  playGameSound,
} from "../utils/gameAudio";

import {
  CARD_BACK_IMAGE_SOURCE,
  cleanupFlyingItems,
  createFlyingItems,
  getCpuSourceElements,
  getPlayerSourceElements,
  preloadCardImages,
  waitForFlyingItems,
  waitForNextFrame,
} from "../animations/cardAnimationUtils";

const CARD_PLAY_SOUND =
  "/audio/card-play.mp3";

export default function useCardAnimation() {
  const animationLockRef =
    useRef(false);

  const [
    isAnimating,
    setIsAnimating,
  ] = useState(false);

  const playCardSound =
    useCallback(() => {
      playGameSound(
        CARD_PLAY_SOUND,
      );
    }, []);

  const runCardAnimation =
    useCallback(
      async ({
        cards,
        sourceElements,
        cloneImageSource = null,
        preloadFaces = false,
        onLanding,
      }) => {
        if (
          animationLockRef.current ||
          cards.length === 0
        ) {
          return;
        }

        const fieldElement =
          document.querySelector(
            ".fieldArea",
          );

        if (
          !fieldElement ||
          sourceElements.length !==
            cards.length
        ) {
          onLanding?.();
          return;
        }

        animationLockRef.current =
          true;

        setIsAnimating(true);
        playCardSound();

        const flyingItems =
          createFlyingItems({
            sourceElements,
            fieldElement,
            cloneImageSource,
          });

        if (
          flyingItems.length === 0
        ) {
          animationLockRef.current =
            false;

          setIsAnimating(false);
          onLanding?.();
          return;
        }

        try {
          const waitingTasks = [
            waitForFlyingItems(
              flyingItems,
            ),
          ];

          if (preloadFaces) {
            waitingTasks.push(
              preloadCardImages(
                cards,
              ),
            );
          }

          await Promise.all(
            waitingTasks,
          );

          onLanding?.();

          await waitForNextFrame();
        } finally {
          cleanupFlyingItems(
            flyingItems,
          );

          animationLockRef.current =
            false;

          setIsAnimating(false);
        }
      },
      [playCardSound],
    );

  const animateCards =
    useCallback(
      ({
        cards,
        onLanding,
      }) => {
        const sourceElements =
          getPlayerSourceElements(
            cards,
          );

        return runCardAnimation({
          cards,
          sourceElements,
          onLanding,
        });
      },
      [runCardAnimation],
    );

  const animateCpuCards =
    useCallback(
      ({
        playerIndex,
        cards,
        onLanding,
      }) => {
        const sourceElements =
          getCpuSourceElements(
            playerIndex,
            cards.length,
          );

        return runCardAnimation({
          cards,
          sourceElements,

          cloneImageSource:
            CARD_BACK_IMAGE_SOURCE,

          preloadFaces: true,
          onLanding,
        });
      },
      [runCardAnimation],
    );

  return {
    isAnimating,
    animateCards,
    animateCpuCards,
  };
}