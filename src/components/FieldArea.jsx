import FieldCard from "./FieldCard";

function FieldArea({
  playedCards,
}) {
  return (
    <div className="fieldArea">
      <div className="fieldDecoration">
        <span>
          PLAY AREA
        </span>
      </div>

      {playedCards.length > 0 && (
        <div className="fieldCards">
          {playedCards.map(
            (card, index) => (
              <FieldCard
                card={card}
                index={index}
                count={
                  playedCards.length
                }
                key={card.id}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default FieldArea;