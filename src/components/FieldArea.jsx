import {
  useEffect,
  useState,
} from "react";

import FieldCard from "./FieldCard";

import {
  getCardImagePath,
} from "../utils/cardUtils";

function preloadCardImage(card) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = resolve;
    image.onerror = resolve;

    image.src = getCardImagePath(
      card.suit,
      card.rank,
    );

    /*
      既にキャッシュ済みなら
      待たずに完了させる。
    */
    if (image.complete) {
      resolve();
    }
  });
}

function FieldArea({
  playedCards,
}) {
  /*
    実際に画面へ表示している場札。

    playedCardsが更新されても、
    次の画像が準備できるまでは
    直前のカードを残す。
  */
  const [
    displayedCards,
    setDisplayedCards,
  ] = useState(playedCards);

  useEffect(() => {
    let cancelled = false;

    /*
      8切り・スペ3返し・全員パスなどで
      場が流れた場合は、そのまま消す。
    */
    if (playedCards.length === 0) {
      setDisplayedCards([]);

      return () => {
        cancelled = true;
      };
    }

    /*
      新しい場札をすべて読み込む。

      読み込み中はdisplayedCardsを
      変更しないので、直前の場札が残る。
    */
    Promise.all(
      playedCards.map(
        preloadCardImage,
      ),
    ).then(() => {
      if (cancelled) {
        return;
      }

      setDisplayedCards(
        playedCards,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [playedCards]);

  return (
    <div className="fieldArea">
      <div className="fieldDecoration">
        <span>
          PLAY AREA
        </span>
      </div>

      {displayedCards.length > 0 && (
        <div className="fieldCards">
          {displayedCards.map(
            (card, index) => (
              <FieldCard
                card={card}
                index={index}
                count={
                  displayedCards.length
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