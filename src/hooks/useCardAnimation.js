import {
  useCallback,
  useRef,
  useState,
} from "react";

const ANIMATION_DURATION = 220;

const FIELD_WIDTH = 540;
const FIELD_HEIGHT = 420;

const FIELD_CARD_WIDTH = 210;
const FIELD_CARD_TOP = 37;
const FIELD_CARD_HEIGHT = 315;

const FIELD_CARD_SPACING = 75;

const CARD_PLAY_SOUND =
  "/audio/card-play.mp3";

export default function useCardAnimation() {
  const [
    isAnimating,
    setIsAnimating,
  ] = useState(false);

  const audioRef = useRef(null);

  const playCardSound =
    useCallback(() => {
      if (!audioRef.current) {
        audioRef.current =
          new Audio(
            CARD_PLAY_SOUND,
          );
      }

      const audio =
        audioRef.current;

      audio.currentTime = 0;

      audio.play().catch(() => {
        // 音声再生が拒否された場合は
        // ゲームを止めない。
      });
    }, []);

  const animateCards =
    useCallback(
      async ({
        cards,
        onLanding,
      }) => {
        if (
          isAnimating ||
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
          (cards.length - 1) / 2;

        const flyingItems = [];

        cards.forEach(
          (card, index) => {
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
              (index -
                centerIndex) *
              FIELD_CARD_SPACING;

            const cardRotation =
              (index -
                centerIndex) *
              2;

            const destinationX =
              fieldRect.left +
              fieldRect.width / 2 +
              cardOffset * scaleX;

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

                zIndex: "99999",

                objectFit: "fill",

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
              元の手札は飛行中だけ
              非表示にする。
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
          onLanding?.();
          setIsAnimating(false);
          return;
        }

        await Promise.all(
          flyingItems.map(
            ({ animation }) =>
              animation.finished.catch(
                () => {},
              ),
          ),
        );

        /*
          飛行が終わった瞬間に
          本物の場札へ切り替える。
        */
        onLanding?.();

        /*
          React側の場札描画を
          1フレーム待つ。
        */
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

        setIsAnimating(false);
      },
      [
        isAnimating,
        playCardSound,
      ],
    );

  return {
    isAnimating,
    animateCards,
  };
}