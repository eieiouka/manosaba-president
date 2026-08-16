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
