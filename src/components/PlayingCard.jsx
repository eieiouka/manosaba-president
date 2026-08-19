import {
  getCardImagePath,
  getCardLabel,
} from "../utils/cardUtils";

function PlayingCard({
  card,
  index,
  selected,
  playable,
  playableVariant = "play",
  onToggle,
}) {
  const cardLabel =
    getCardLabel(card);

  const playableClassName =
    !playable
      ? ""
      : playableVariant === "exchange"
        ? "exchangePlayableCard"
        : "playableCard";

  const handleClick = () => {
    /*
      選択済みカードは
      いつでも解除可能。
    */
    if (selected) {
      onToggle(card);
      return;
    }

    /*
      赤くないカードは
      選択できない。
    */
    if (!playable) {
      return;
    }

    onToggle(card);
  };

  const handleTouchEnd = (event) => {
    if (
      !window.matchMedia(
        "(max-width: 600px)",
      ).matches
    ) {
      return;
    }

    const touch =
      event.changedTouches[0];

    const handTrack =
      event.currentTarget.closest(
        ".playerHandTrack",
      );

    if (!touch || !handTrack) {
      return;
    }

    const cardElements = [
      ...handTrack.querySelectorAll(
        ".playingCard",
      ),
    ];

    const trackRect =
      handTrack.getBoundingClientRect();

    const touchX =
      touch.clientX - trackRect.left;

    let touchedCard =
      cardElements.find(
        (_, cardIndex) => {
          const nextCard =
            cardElements[
              cardIndex + 1
            ];

          if (!nextCard) {
            return true;
          }

          return (
            touchX <
            nextCard.offsetLeft
          );
        },
      );

    /*
      選択済みカードの境界付近では、
      隣にある未選択の赤いカードを
      少し広めに拾う。

      重なった手札でも、ペアの2枚目を
      選びやすくするためのスマホ専用補助。
    */
    if (
      touchedCard?.classList.contains(
        "selectedCard",
      )
    ) {
      const touchedIndex =
        cardElements.indexOf(
          touchedCard,
        );

      const previousCard =
        cardElements[
          touchedIndex - 1
        ];

      const nextCard =
        cardElements[
          touchedIndex + 1
        ];

      const touchAssistWidth =
        Math.max(
          18,
          touchedCard.getBoundingClientRect()
            .width * 0.12,
        );

      const isUnselectedPlayable =
        (cardElement) =>
          Boolean(cardElement) &&
          !cardElement.classList.contains(
            "selectedCard",
          ) &&
          (cardElement.classList.contains(
            "playableCard",
          ) ||
            cardElement.classList.contains(
              "exchangePlayableCard",
            ));

      if (
        isUnselectedPlayable(
          previousCard,
        ) &&
        touchX <=
          touchedCard.offsetLeft +
            touchAssistWidth
      ) {
        touchedCard = previousCard;
      } else if (
        isUnselectedPlayable(
          nextCard,
        ) &&
        touchX >=
          nextCard.offsetLeft -
            touchAssistWidth
      ) {
        touchedCard = nextCard;
      }
    }

    if (
      !touchedCard ||
      touchedCard ===
        event.currentTarget
    ) {
      return;
    }

    event.preventDefault();
    touchedCard.click();
  };

  return (
    <button
      className={`playingCard ${
        playableClassName
      } ${
        selected
          ? "selectedCard"
          : ""
      }`}
      data-card-id={card.id}
      style={{
        "--hand-index": index,
        zIndex: index + 1,
      }}
      type="button"
      aria-label={cardLabel}
      aria-disabled={
        !selected &&
        !playable
      }
      onTouchEnd={
        handleTouchEnd
      }
      onClick={handleClick}
    >
      <img
        src={getCardImagePath(
          card.suit,
          card.rank,
        )}
        alt={cardLabel}
        draggable="false"
      />
    </button>
  );
}

export default PlayingCard;
