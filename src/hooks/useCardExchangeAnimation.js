import {
  useCallback,
  useRef,
  useState,
} from "react";

const EXCHANGE_ANIMATION_DURATION = 760;
const CARD_BACK_SOURCE =
  "/cards_webp/card_back.webp";

const PLAYER_SELECTORS = [
  ".yourArea",
  ".playerLeft",
  ".playerTop",
  ".playerRight",
];

const PARTNER_RANK = {
  大富豪: "大貧民",
  富豪: "貧民",
  貧民: "富豪",
  大貧民: "大富豪",
};

function getPlayerRoot(playerIndex) {
  return document.querySelector(
    PLAYER_SELECTORS[playerIndex],
  );
}

function getHandCards(playerIndex) {
  const playerRoot =
    getPlayerRoot(playerIndex);

  if (!playerRoot) {
    return [];
  }

  const selector =
    playerIndex === 0
      ? ".playerHand .playingCard"
      : ".opponentHand .opponentCard";

  return [
    ...playerRoot.querySelectorAll(
      selector,
    ),
  ];
}

function getSourceElement({
  playerIndex,
  cardId,
  hands,
}) {
  const cardElements =
    getHandCards(playerIndex);

  if (playerIndex === 0) {
    return (
      cardElements.find(
        (element) =>
          element.dataset.cardId ===
          cardId,
      ) ?? null
    );
  }

  const cardIndex =
    hands[playerIndex].findIndex(
      (card) => card.id === cardId,
    );

  return cardElements[cardIndex] ?? null;
}

function getTargetLayout(playerIndex) {
  const cardElements =
    getHandCards(playerIndex);

  const targetCard =
    cardElements[0] ?? null;

  if (targetCard) {
    const rect =
      targetCard.getBoundingClientRect();

    return {
      centerX:
        rect.left + rect.width / 2,
      centerY:
        rect.top + rect.height / 2,
      cardWidth: rect.width,
    };
  }

  const playerRoot =
    getPlayerRoot(playerIndex);

  if (!playerRoot) {
    return null;
  }

  const rect =
    playerRoot.getBoundingClientRect();

  return {
    centerX:
      rect.left + rect.width / 2,
    centerY:
      rect.top + rect.height / 2,
    cardWidth: rect.width * 0.22,
  };
}

function createFlyingCard(sourceRect) {
  const image =
    document.createElement("img");

  image.src = CARD_BACK_SOURCE;
  image.alt = "";
  image.draggable = false;

  Object.assign(image.style, {
    position: "fixed",
    top: `${sourceRect.top}px`,
    left: `${sourceRect.left}px`,
    zIndex: "10000",
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    padding: "0",
    borderRadius: "8px",
    objectFit: "fill",
    pointerEvents: "none",
    userSelect: "none",
    transformOrigin: "center center",
    willChange: "transform, opacity",
    filter:
      "drop-shadow(0 10px 12px rgba(0, 0, 0, 0.55))",
  });

  document.body.appendChild(image);
  return image;
}

export default function useCardExchangeAnimation() {
  const exchangeLockRef =
    useRef(false);

  const [
    isExchangeAnimating,
    setIsExchangeAnimating,
  ] = useState(false);

  const animateCardExchange =
    useCallback(
      async ({
        hands,
        playerRanks,
        outgoingCardIdsByPlayer,
        onLanding,
      }) => {
        if (exchangeLockRef.current) {
          return;
        }

        exchangeLockRef.current = true;

        const flyingItems = [];

        outgoingCardIdsByPlayer.forEach(
          (cardIds, playerIndex) => {
            const partnerRank =
              PARTNER_RANK[
                playerRanks[playerIndex]
              ];

            const targetPlayerIndex =
              playerRanks.indexOf(
                partnerRank,
              );

            const targetLayout =
              getTargetLayout(
                targetPlayerIndex,
              );

            if (!targetLayout) {
              return;
            }

            const centerIndex =
              (cardIds.length - 1) / 2;

            cardIds.forEach(
              (cardId, cardIndex) => {
                const sourceElement =
                  getSourceElement({
                    playerIndex,
                    cardId,
                    hands,
                  });

                if (!sourceElement) {
                  return;
                }

                const sourceRect =
                  sourceElement.getBoundingClientRect();

                const flyingCard =
                  createFlyingCard(
                    sourceRect,
                  );

                sourceElement.style.visibility =
                  "hidden";

                const spread =
                  (cardIndex - centerIndex) *
                  targetLayout.cardWidth *
                  0.34;

                const destinationX =
                  targetLayout.centerX +
                  spread;

                const destinationY =
                  targetLayout.centerY;

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

                const destinationScale =
                  targetLayout.cardWidth /
                  sourceRect.width;

                const arcHeight = Math.max(
                  55,
                  Math.abs(moveY) * 0.16,
                );

                const rotation =
                  (cardIndex - centerIndex) *
                  5;

                const animation =
                  flyingCard.animate(
                    [
                      {
                        transform:
                          "translate(0, 0) rotate(0deg) scale(1)",
                      },
                      {
                        transform:
                          `translate(${moveX * 0.52}px, ${moveY * 0.52 - arcHeight}px) rotate(${rotation * 0.45}deg) scale(${(1 + destinationScale) / 2})`,
                      },
                      {
                        transform:
                          `translate(${moveX}px, ${moveY}px) rotate(${rotation}deg) scale(${destinationScale})`,
                      },
                    ],
                    {
                      duration:
                        EXCHANGE_ANIMATION_DURATION,
                      easing:
                        "cubic-bezier(0.22, 0.75, 0.2, 1)",
                      fill: "forwards",
                    },
                  );

                flyingItems.push({
                  flyingCard,
                  sourceElement,
                  animation,
                });
              },
            );
          },
        );

        if (flyingItems.length === 0) {
          onLanding?.();
          exchangeLockRef.current = false;
          return;
        }

        setIsExchangeAnimating(true);

        await Promise.all(
          flyingItems.map(
            ({ animation }) =>
              animation.finished.catch(
                () => {},
              ),
          ),
        );

        onLanding?.();

        await new Promise((resolve) => {
          window.requestAnimationFrame(
            resolve,
          );
        });

        flyingItems.forEach(
          ({
            flyingCard,
            sourceElement,
          }) => {
            flyingCard.remove();
            sourceElement.style.visibility =
              "";
          },
        );

        setIsExchangeAnimating(false);
        exchangeLockRef.current = false;
      },
      [],
    );

  return {
    isExchangeAnimating,
    animateCardExchange,
  };
}
