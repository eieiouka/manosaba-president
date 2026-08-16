import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  playGameSound,
} from "../utils/gameAudio";

import {
  getCardImagePath,
} from "../utils/cardUtils";

const ANIMATION_DURATION = 220;

const FIELD_WIDTH = 540;
const FIELD_HEIGHT = 420;

const FIELD_CARD_WIDTH = 210;
const FIELD_CARD_TOP = 37;
const FIELD_CARD_HEIGHT = 315;

const FIELD_CARD_SPACING = 75;

const CARD_PLAY_SOUND =
  "/audio/card-play.mp3";

const CPU_PANEL_SELECTORS = {
  1: ".playerLeft",
  2: ".playerTop",
  3: ".playerRight",
};

function preloadCardImage(card) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = resolve;
    image.onerror = resolve;

    image.src = getCardImagePath(
      card.suit,
      card.rank,
    );

    if (image.complete) {
      resolve();
    }
  });
}

export default function useCardAnimation() {
  const animationLockRef =
    useRef(false);

  const [
    isAnimating,
    setIsAnimating,
  ] = useState(false);

  /*
    カードを出し始めた瞬間に
    効果音を鳴らす。

    gameAudio側で毎回別の
    Audioを生成するため、
    他の効果音が鳴っていても
    同時再生できる。
  */
  const playCardSound =
    useCallback(() => {
      playGameSound(
        CARD_PLAY_SOUND,
      );
    }, []);

  const animateCards =
    useCallback(
      async ({
        cards,
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

        if (!fieldElement) {
          onLanding?.();
          return;
        }

        /*
          アニメーション開始。

          この瞬間に
          カード音も鳴らす。
        */
        animationLockRef.current =
          true;

        setIsAnimating(true);

        playCardSound();

        const fieldRect =
          fieldElement.getBoundingClientRect();

        const scaleX =
          fieldRect.width /
          FIELD_WIDTH;

        const scaleY =
          fieldRect.height /
          FIELD_HEIGHT;

        const centerIndex =
          (cards.length - 1) /
          2;

        const flyingItems = [];

        cards.forEach(
          (
            card,
            index,
          ) => {
            const sourceElement =
              document.querySelector(
                `.playerHand .playingCard[data-card-id="${card.id}"]`,
              );

            if (!sourceElement) {
              return;
            }

            const sourceImage =
              sourceElement.querySelector(
                "img",
              );

            if (!sourceImage) {
              return;
            }

            const sourceRect =
              sourceElement.getBoundingClientRect();

            const clone =
              sourceImage.cloneNode(
                true,
              );

            const cardOffset =
              (
                index -
                centerIndex
              ) *
              FIELD_CARD_SPACING;

            const cardRotation =
              (
                index -
                centerIndex
              ) *
              2;

            const destinationX =
              fieldRect.left +
              fieldRect.width /
                2 +
              cardOffset *
                scaleX;

            const destinationY =
              fieldRect.top +
              (
                FIELD_CARD_TOP +
                FIELD_CARD_HEIGHT /
                  2
              ) *
                scaleY;

            const sourceCenterX =
              sourceRect.left +
              sourceRect.width /
                2;

            const sourceCenterY =
              sourceRect.top +
              sourceRect.height /
                2;

            const moveX =
              destinationX -
              sourceCenterX;

            const moveY =
              destinationY -
              sourceCenterY;

            const destinationWidth =
              FIELD_CARD_WIDTH *
              scaleX;

            const destinationScale =
              destinationWidth /
              sourceRect.width;

            Object.assign(
              clone.style,
              {
                position:
                  "fixed",

                top:
                  `${sourceRect.top}px`,

                left:
                  `${sourceRect.left}px`,

                width:
                  `${sourceRect.width}px`,

                height:
                  `${sourceRect.height}px`,

                margin: "0",
                padding: "0",

                zIndex:
                  "99999",

                objectFit:
                  "fill",

                borderRadius:
                  "8px",

                pointerEvents:
                  "none",

                userSelect:
                  "none",

                transformOrigin:
                  "center center",

                willChange:
                  "transform",
              },
            );

            document.body.appendChild(
              clone,
            );

            /*
              元のカードは
              飛行中だけ非表示。
            */
            sourceElement.style.visibility =
              "hidden";

            const animation =
              clone.animate(
                [
                  {
                    transform:
                      "translate(0px, 0px) rotate(0deg) scale(1)",
                  },
                  {
                    transform:
                      `translate(${moveX}px, ${moveY}px) rotate(${cardRotation}deg) scale(${destinationScale})`,
                  },
                ],
                {
                  duration:
                    ANIMATION_DURATION,

                  easing:
                    "cubic-bezier(0.2, 0.8, 0.2, 1)",

                  fill:
                    "forwards",
                },
              );

            flyingItems.push({
              clone,
              sourceElement,
              animation,
            });
          },
        );

        /*
          飛ばせるDOMが
          見つからなかった場合。
        */
        if (
          flyingItems.length ===
          0
        ) {
          onLanding?.();

          setIsAnimating(
            false,
          );

          animationLockRef.current =
            false;

          return;
        }

        /*
          全カードの飛行完了を待つ。
        */
        await Promise.all(
          flyingItems.map(
            ({
              animation,
            }) =>
              animation.finished.catch(
                () => {},
              ),
          ),
        );

        /*
          飛行終了。

          ここでゲーム本体へ
          カードを出したことを通知。
        */
        onLanding?.();

        /*
          React側で場札が
          描画されるのを1フレーム待つ。
        */
        await new Promise(
          (resolve) => {
            window.requestAnimationFrame(
              resolve,
            );
          },
        );

        /*
          飛行用コピーを削除して
          元カードのvisibilityを戻す。
        */
        flyingItems.forEach(
          ({
            clone,
            sourceElement,
          }) => {
            clone.remove();

            sourceElement.style.visibility =
              "";
          },
        );

        setIsAnimating(
          false,
        );

        animationLockRef.current =
          false;
      },
      [
        playCardSound,
      ],
    );

  const animateCpuCards =
    useCallback(
      async ({
        playerIndex,
        cards,
        onLanding,
      }) => {
        if (
          animationLockRef.current ||
          cards.length === 0
        ) {
          return;
        }

        const panelSelector =
          CPU_PANEL_SELECTORS[
            playerIndex
          ];

        const fieldElement =
          document.querySelector(
            ".fieldArea",
          );

        const panelElement =
          panelSelector
            ? document.querySelector(
                panelSelector,
              )
            : null;

        if (
          !fieldElement ||
          !panelElement
        ) {
          onLanding?.();
          return;
        }

        const opponentCards = [
          ...panelElement.querySelectorAll(
            ".opponentCard",
          ),
        ];

        const sourceElements =
          opponentCards.slice(
            -cards.length,
          );

        if (
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

        const faceImagesReady =
          Promise.all(
            cards.map(
              preloadCardImage,
            ),
          );

        const fieldRect =
          fieldElement.getBoundingClientRect();

        const scaleX =
          fieldRect.width /
          FIELD_WIDTH;

        const scaleY =
          fieldRect.height /
          FIELD_HEIGHT;

        const centerIndex =
          (cards.length - 1) / 2;

        const flyingItems = [];

        sourceElements.forEach(
          (
            sourceElement,
            index,
          ) => {
            const sourceImage =
              sourceElement.querySelector(
                "img",
              );

            if (!sourceImage) {
              return;
            }

            const sourceRect =
              sourceElement.getBoundingClientRect();

            const clone =
              sourceImage.cloneNode(true);

            clone.src =
              "/cards_webp/card_back.webp";

            const cardOffset =
              (index - centerIndex) *
              FIELD_CARD_SPACING;

            const cardRotation =
              (index - centerIndex) *
              2;

            const destinationX =
              fieldRect.left +
              fieldRect.width / 2 +
              cardOffset * scaleX;

            const destinationY =
              fieldRect.top +
              (FIELD_CARD_TOP +
                FIELD_CARD_HEIGHT /
                  2) *
                scaleY;

            const sourceCenterX =
              sourceRect.left +
              sourceRect.width / 2;

            const sourceCenterY =
              sourceRect.top +
              sourceRect.height / 2;

            const moveX =
              destinationX -
              sourceCenterX;

            const moveY =
              destinationY -
              sourceCenterY;

            const destinationWidth =
              FIELD_CARD_WIDTH *
              scaleX;

            const destinationScale =
              destinationWidth /
              sourceRect.width;

            Object.assign(
              clone.style,
              {
                position: "fixed",
                top: `${sourceRect.top}px`,
                left: `${sourceRect.left}px`,
                width: `${sourceRect.width}px`,
                height: `${sourceRect.height}px`,
                margin: "0",
                padding: "0",
                zIndex: "99999",
                objectFit: "fill",
                borderRadius: "8px",
                pointerEvents: "none",
                userSelect: "none",
                transformOrigin:
                  "center center",
                willChange:
                  "transform",
              },
            );

            document.body.appendChild(
              clone,
            );

            sourceElement.style.visibility =
              "hidden";

            const animation =
              clone.animate(
                [
                  {
                    transform:
                      "translate(0px, 0px) rotate(0deg) scale(1)",
                  },
                  {
                    transform:
                      `translate(${moveX}px, ${moveY}px) rotate(${cardRotation}deg) scale(${destinationScale})`,
                  },
                ],
                {
                  duration:
                    ANIMATION_DURATION,
                  easing:
                    "cubic-bezier(0.2, 0.8, 0.2, 1)",
                  fill: "forwards",
                },
              );

            flyingItems.push({
              clone,
              sourceElement,
              animation,
            });
          },
        );

        if (
          flyingItems.length === 0
        ) {
          animationLockRef.current =
            false;

          setIsAnimating(false);
          onLanding?.();
          return;
        }

        await Promise.all([
          faceImagesReady,
          ...flyingItems.map(
            ({ animation }) =>
              animation.finished.catch(
                () => {},
              ),
          ),
        ]);

        onLanding?.();

        await new Promise(
          (resolve) => {
            window.requestAnimationFrame(
              resolve,
            );
          },
        );

        flyingItems.forEach(
          ({
            clone,
            sourceElement,
          }) => {
            clone.remove();
            sourceElement.style.visibility =
              "";
          },
        );

        animationLockRef.current =
          false;

        setIsAnimating(false);
      },
      [playCardSound],
    );

  return {
    isAnimating,
    animateCards,
    animateCpuCards,
  };
}