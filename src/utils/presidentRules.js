import {
  getCardStrength,
} from "./cardUtils";

/*
  Jokerの枚数を取得。
  現在のルールでは1枚だけだが、
  判定処理としては汎用的にしておく。
*/
function getJokerCount(cards) {
  return cards.filter(
    (card) =>
      card.isJoker ||
      card.suit === "joker",
  ).length;
}

/*
  Joker以外のカードだけ取得。
*/
function getNormalCards(cards) {
  return cards.filter(
    (card) =>
      !card.isJoker &&
      card.suit !== "joker",
  );
}

/*
  ==============================
  ペア・トリオ・クワッズ判定
  ==============================
*/
function analyzeSameRankPlay(cards) {
  if (
    cards.length < 2 ||
    cards.length > 4
  ) {
    return null;
  }

  const normalCards =
    getNormalCards(cards);

  const jokerCount =
    getJokerCount(cards);

  /*
    Jokerしかない場合。
    現在Jokerは1枚なので
    通常ここには来ない。
  */
  if (normalCards.length === 0) {
    return null;
  }

  const baseStrength =
    getCardStrength(
      normalCards[0],
    );

  /*
    Joker以外が全て同じ数字なら
    Jokerをその数字として扱える。
  */
  const allSameRank =
    normalCards.every(
      (card) =>
        getCardStrength(card) ===
        baseStrength,
    );

  if (!allSameRank) {
    return null;
  }

  const typeByCount = {
    2: "pair",
    3: "trio",
    4: "quads",
  };

  return {
    valid: true,

    type:
      typeByCount[cards.length],

    count:
      cards.length,

    strength:
      baseStrength,

    jokerCount,
  };
}

/*
  ==============================
  階段として成立する
  全パターンを取得
  ==============================
*/
export function getStraightOptions(
  cards,
) {
  /*
    階段は3枚以上。
  */
  if (cards.length < 3) {
    return [];
  }

  const normalCards =
    getNormalCards(cards);

  const jokerCount =
    getJokerCount(cards);

  if (normalCards.length === 0) {
    return [];
  }

  /*
    Joker以外は
    全て同じスートである必要がある。
  */
  const suit =
    normalCards[0].suit;

  const sameSuit =
    normalCards.every(
      (card) =>
        card.suit === suit,
    );

  if (!sameSuit) {
    return [];
  }

  /*
    3～Jokerを
    3～16として扱う。
  */
  const strengths =
    normalCards
      .map(getCardStrength)
      .sort(
        (a, b) =>
          a - b,
      );

  /*
    同じ数字が混ざっていたら
    階段にはならない。
  */
  const uniqueStrengths =
    new Set(strengths);

  if (
    uniqueStrengths.size !==
    strengths.length
  ) {
    return [];
  }

  const options = [];

  /*
    3 ～ Joker(16)の範囲で
    作れる全ての連番を調べる。
  */
  for (
    let startStrength = 3;
    startStrength +
        cards.length -
        1 <=
      16;
    startStrength += 1
  ) {
    const endStrength =
      startStrength +
      cards.length -
      1;

    /*
      Joker以外のカードが
      この階段の範囲内に
      全て入っているか。
    */
    const allInsideRange =
      strengths.every(
        (strength) =>
          strength >=
            startStrength &&
          strength <=
            endStrength,
      );

    if (!allInsideRange) {
      continue;
    }

    const missingStrengths = [];

    for (
      let strength =
        startStrength;
      strength <= endStrength;
      strength += 1
    ) {
      if (
        !uniqueStrengths.has(
          strength,
        )
      ) {
        missingStrengths.push(
          strength,
        );
      }
    }

    /*
      足りない数字を
      Jokerですべて補えるなら
      正しい階段。
    */
    if (
      missingStrengths.length !==
      jokerCount
    ) {
      continue;
    }

    options.push({
      startStrength,
      endStrength,

      jokerStrengths:
        missingStrengths,

      suit,
    });
  }

  return options;
}

/*
  ==============================
  階段判定
  ==============================
*/
function analyzeStraight(cards) {
  const options =
    getStraightOptions(cards);

  if (options.length === 0) {
    return null;
  }

  /*
    Jokerによって複数の階段として
    解釈できる場合がある。

    例：
    5 6 Joker

    → 4 5 6
    → 5 6 7

    通常時は最も強い解釈を
    strengthに入れる。

    全候補はstraightOptionsへ
    保存しておく。
  */
  const strength = Math.max(
    ...options.map(
      (option) =>
        option.endStrength,
    ),
  );

  return {
    valid: true,

    type: "straight",

    count:
      cards.length,

    strength,

    straightOptions:
      options,

    jokerCount:
      getJokerCount(cards),
  };
}

/*
  ==============================
  選択したカード全体の役判定
  ==============================
*/
export function analyzePlay(cards) {
  if (
    !Array.isArray(cards) ||
    cards.length === 0
  ) {
    return {
      valid: false,
      type: "invalid",
      count: 0,
    };
  }

  /*
    1枚なら必ずシングル。

    Joker単体なら
    strength = 16。
  */
  if (cards.length === 1) {
    return {
      valid: true,

      type: "single",

      count: 1,

      strength:
        getCardStrength(
          cards[0],
        ),

      jokerCount:
        getJokerCount(cards),
    };
  }

  /*
    同じ数字系から判定。
  */
  const sameRankPlay =
    analyzeSameRankPlay(
      cards,
    );

  if (sameRankPlay) {
    return sameRankPlay;
  }

  /*
    次に階段判定。
  */
  const straightPlay =
    analyzeStraight(
      cards,
    );

  if (straightPlay) {
    return straightPlay;
  }

  return {
    valid: false,
    type: "invalid",
    count:
      cards.length,
  };
}

/*
  ==============================
  現在の選択へ
  このカードを追加できるか
  ==============================

  今回はまず

  single
    ↓
  pair
    ↓
  trio
    ↓
  quads

  の選択を実装する。

  階段の選択補助は
  この後追加する。
*/

/*
  ==============================
  この手札から作れる
  全ての合法手を列挙
  ==============================
*/
export function getAllValidPlays(
  hand,
) {
  const validPlays = [];

  const combinationCount =
    1 << hand.length;

  for (
    let mask = 1;
    mask < combinationCount;
    mask += 1
  ) {
    const cards = [];

    for (
      let index = 0;
      index < hand.length;
      index += 1
    ) {
      if (
        mask &
        (1 << index)
      ) {
        cards.push(
          hand[index],
        );
      }
    }

    const analysis =
      analyzePlay(cards);

    if (!analysis.valid) {
      continue;
    }

    validPlays.push({
      cards,

      cardIds:
        cards.map(
          (card) =>
            card.id,
        ),

      analysis,
    });
  }

  return validPlays;
}

/*
  ==============================
  現在の選択から
  次に選択できるカードを取得
  ==============================
*/
export function getPlayableCardIds(
  validPlays,
  selectedCardIds,
) {
  const playableIds =
    new Set();

  for (
    const play
    of validPlays
  ) {
    /*
      現在選択しているカードが
      この合法手に全部含まれるか。
    */
    const containsSelection =
      selectedCardIds.every(
        (selectedId) =>
          play.cardIds.includes(
            selectedId,
          ),
      );

    if (!containsSelection) {
      continue;
    }

    /*
      この合法手を完成させるために
      追加可能なカードを赤くする。
    */
    for (
      const cardId
      of play.cardIds
    ) {
      if (
        selectedCardIds.includes(
          cardId,
        )
      ) {
        continue;
      }

      playableIds.add(
        cardId,
      );
    }
  }

  return [
    ...playableIds,
  ];
}

/*
  ==============================
  場札に対して
  この役を出せるか
  ==============================
*/
export function canBeatPlay(
  candidatePlay,
  fieldPlay,
) {
  /*
    候補そのものが不正なら
    出せない。
  */
  if (
    !candidatePlay ||
    !candidatePlay.valid
  ) {
    return false;
  }

  /*
    場が空なら
    どんな合法手でも出せる。
  */
  if (
    !fieldPlay ||
    !fieldPlay.valid
  ) {
    return true;
  }

  /*
    シングルにはシングル、
    ペアにはペア、
    階段には階段。
  */
  if (
    candidatePlay.type !==
    fieldPlay.type
  ) {
    return false;
  }

  /*
    枚数も同じ必要がある。

    特に階段では、
    3枚階段に4枚階段を
    重ねることはできない。
  */
  if (
    candidatePlay.count !==
    fieldPlay.count
  ) {
    return false;
  }

  /*
    今は革命なし。

    数字が大きいほど強い。
  */
  return (
    candidatePlay.strength >
    fieldPlay.strength
  );
}

/*
  ==============================
  現在の場に出せる合法手だけ取得
  ==============================
*/
export function getLegalPlaysAgainstField(
  hand,
  fieldCards,
) {
  const allPlays =
    getAllValidPlays(
      hand,
    );

  const fieldPlay =
    analyzePlay(
      fieldCards,
    );

  return allPlays.filter(
    (play) =>
      canBeatPlay(
        play.analysis,
        fieldPlay,
      ),
  );
}