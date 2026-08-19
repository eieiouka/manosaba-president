import {
  getCardImagePath,
} from "../utils/cardUtils";

export const ANIMATION_DURATION = 220;

export const CARD_BACK_IMAGE_SOURCE =
  "/cards_webp/card_back.webp";

const FIELD_WIDTH = 540;
const FIELD_HEIGHT = 420;

const FIELD_CARD_WIDTH = 210;
const MOBILE_FIELD_CARD_WIDTH_RATIO =
  0.27;
const FIELD_CARD_TOP = 37;
const FIELD_CARD_HEIGHT = 315;

const FIELD_CARD_SPACING = 75;

const CPU_PANEL_SELECTORS = {
  1: ".playerLeft",
  2: ".playerTop",
  3: ".playerRight",
};

function preloadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = resolve;
    image.onerror = resolve;
    image.src = source;

    if (image.complete) {
      resolve();
    }
  });
}

export function preloadCardImages(cards) {
  return Promise.all(
    cards.map((card) =>
      preloadImage(
        getCardImagePath(
          card.suit,
          card.rank,
        ),
      ),
    ),
  );
}

export function getPlayerSourceElements(
  cards,
) {
  return cards
    .map((card) =>
      document.querySelector(
        `.playerHand .playingCard[data-card-id="${card.id}"]`,
      ),
    )
    .filter(Boolean);
}

export function getCpuSourceElements(
  playerIndex,
  cardCount,
) {
  const panelSelector =
    CPU_PANEL_SELECTORS[
      playerIndex
    ];

  if (!panelSelector) {
    return [];
  }

  const panelElement =
    document.querySelector(
      panelSelector,
    );

  if (!panelElement) {
    return [];
  }

  const opponentCards = [
    ...panelElement.querySelectorAll(
      ".opponentCard",
    ),
  ];

  return opponentCards.slice(
    -cardCount,
  );
}

function getDestination({
  fieldRect,
  sourceRect,
  index,
  count,
}) {
  const scaleX =
    fieldRect.width /
    FIELD_WIDTH;

  const scaleY =
    fieldRect.height /
    FIELD_HEIGHT;

  const centerIndex =
    (count - 1) / 2;

  const cardOffset =
    (index - centerIndex) *
    FIELD_CARD_SPACING;

  const cardRotation =
    (index - centerIndex) * 2;

  const destinationX =
    fieldRect.left +
    fieldRect.width / 2 +
    cardOffset * scaleX;

  const destinationY =
    fieldRect.top +
    (FIELD_CARD_TOP +
      FIELD_CARD_HEIGHT / 2) *
      scaleY;

  const sourceCenterX =
    sourceRect.left +
    sourceRect.width / 2;

  const sourceCenterY =
    sourceRect.top +
    sourceRect.height / 2;

  const isMobileLayout =
    window.matchMedia(
      "(max-width: 600px)",
    ).matches;

  const destinationWidth =
    isMobileLayout
      ? fieldRect.width *
        MOBILE_FIELD_CARD_WIDTH_RATIO
      : FIELD_CARD_WIDTH * scaleX;

  return {
    moveX:
      destinationX -
      sourceCenterX,

    moveY:
      destinationY -
      sourceCenterY,

    rotation:
      cardRotation,

    scale:
      destinationWidth /
      sourceRect.width,
  };
}

function applyCloneStyles(
  clone,
  sourceRect,
) {
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
      borderRadius: "8px",

      pointerEvents: "none",
      userSelect: "none",

      transformOrigin:
        "center center",

      willChange:
        "transform",
    },
  );
}

export function createFlyingItems({
  sourceElements,
  fieldElement,
  cloneImageSource = null,
}) {
  const fieldRect =
    fieldElement.getBoundingClientRect();

  const count =
    sourceElements.length;

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

      if (cloneImageSource) {
        clone.src =
          cloneImageSource;
      }

      const destination =
        getDestination({
          fieldRect,
          sourceRect,
          index,
          count,
        });

      applyCloneStyles(
        clone,
        sourceRect,
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
                `translate(${destination.moveX}px, ${destination.moveY}px) rotate(${destination.rotation}deg) scale(${destination.scale})`,
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

  return flyingItems;
}

export function waitForFlyingItems(
  flyingItems,
) {
  return Promise.all(
    flyingItems.map(
      ({ animation }) =>
        animation.finished.catch(
          () => {},
        ),
    ),
  );
}

export function waitForNextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(
      resolve,
    );
  });
}

export function cleanupFlyingItems(
  flyingItems,
) {
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
}
