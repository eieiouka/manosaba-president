import {
  getCardStrength,
} from "./cardUtils.js";

export function isJoker(card) {
  return Boolean(
    card?.isJoker ||
    card?.suit === "joker",
  );
}

function getJokerCount(cards) {
  return cards.filter(isJoker).length;
}

function getNormalCards(cards) {
  return cards.filter(
    (card) => !isJoker(card),
  );
}

export function isSingleJoker(cards) {
  return (
    cards.length === 1 &&
    isJoker(cards[0])
  );
}

export function isSpadeThree(cards) {
  return (
    cards.length === 1 &&
    !isJoker(cards[0]) &&
    cards[0].suit === "spades" &&
    getCardStrength(cards[0]) === 3
  );
}

function analyzeSameRankPlay(cards) {
  if (
    cards.length < 2 ||
    cards.length > 4
  ) {
    return null;
  }

  const normalCards =
    getNormalCards(cards);

  if (normalCards.length === 0) {
    return null;
  }

  const strength =
    getCardStrength(normalCards[0]);

  if (
    !normalCards.every(
      (card) =>
        getCardStrength(card) ===
        strength,
    )
  ) {
    return null;
  }

  const typeByCount = {
    2: "pair",
    3: "trio",
    4: "quads",
  };

  return {
    valid: true,
    type: typeByCount[cards.length],
    count: cards.length,
    strength,
    jokerCount: getJokerCount(cards),
  };
}

export function getStraightOptions(cards) {
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

  const suit = normalCards[0].suit;

  if (
    !normalCards.every(
      (card) => card.suit === suit,
    )
  ) {
    return [];
  }

  const strengths =
    normalCards
      .map(getCardStrength)
      .sort((a, b) => a - b);

  const uniqueStrengths =
    new Set(strengths);

  if (
    uniqueStrengths.size !==
    strengths.length
  ) {
    return [];
  }

  const options = [];

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

    const allInsideRange =
      strengths.every(
        (strength) =>
          strength >= startStrength &&
          strength <= endStrength,
      );

    if (!allInsideRange) {
      continue;
    }

    const missingStrengths = [];

    for (
      let strength = startStrength;
      strength <= endStrength;
      strength += 1
    ) {
      if (
        !uniqueStrengths.has(strength)
      ) {
        missingStrengths.push(strength);
      }
    }

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

function analyzeStraight(cards) {
  const options =
    getStraightOptions(cards);

  if (options.length === 0) {
    return null;
  }

  /*
    Jokerは成立可能な中で
    必ず最も大きい数字を担当する。
  */
  const resolvedStraight =
    options.reduce(
      (best, option) =>
        !best ||
        option.endStrength >
          best.endStrength
          ? option
          : best,
      null,
    );

  return {
    valid: true,
    type: "straight",
    count: cards.length,
    strength:
      resolvedStraight.endStrength,
    straightOptions: options,
    resolvedStraight,
    jokerCount: getJokerCount(cards),
  };
}

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

  if (cards.length === 1) {
    return {
      valid: true,
      type: "single",
      count: 1,
      strength:
        getCardStrength(cards[0]),
      jokerCount:
        getJokerCount(cards),
    };
  }

  const sameRank =
    analyzeSameRankPlay(cards);

  if (sameRank) {
    return sameRank;
  }

  const straight =
    analyzeStraight(cards);

  if (straight) {
    return straight;
  }

  return {
    valid: false,
    type: "invalid",
    count: cards.length,
  };
}

/*
  Jokerの最高解釈まで含め、
  この手が実際に表している数字を返す。
*/
export function getResolvedStrengths(
  cards,
  analysis = analyzePlay(cards),
) {
  if (!analysis.valid) {
    return [];
  }

  if (analysis.type === "straight") {
    const option =
      analysis.resolvedStraight;

    if (!option) {
      return [];
    }

    const strengths = [];

    for (
      let strength =
        option.startStrength;
      strength <= option.endStrength;
      strength += 1
    ) {
      strengths.push(strength);
    }

    return strengths;
  }

  return [analysis.strength];
}

export function getPlayEffects(
  cards,
  analysis = analyzePlay(cards),
) {
  const strengths =
    getResolvedStrengths(
      cards,
      analysis,
    );

  return {
    revolution:
      analysis.valid &&
      cards.length >= 4,

    eightCut:
      strengths.includes(8),

    elevenBack:
      strengths.includes(11),
  };
}

export function getSingleNaturalSuit(
  cards,
) {
  if (
    cards.length !== 1 ||
    isJoker(cards[0])
  ) {
    return null;
  }

  return cards[0].suit;
}

export function getSingleNaturalStrength(
  cards,
) {
  if (
    cards.length !== 1 ||
    isJoker(cards[0])
  ) {
    return null;
  }

  return getCardStrength(cards[0]);
}

/*
  激シバ中の次の自然札。

  革命と11バックを合わせた
  現在の強弱方向へ進み、
  今回の場ですでに使われた数字を飛ばす。
*/
export function getGekiRequiredStrength({
  fieldStrength,
  usedStrengths,
  revolution,
  elevenBack,
}) {
  const reversed =
    Boolean(revolution) !==
    Boolean(elevenBack);

  const step = reversed ? -1 : 1;

  let strength =
    fieldStrength + step;

  while (
    strength >= 3 &&
    strength <= 15
  ) {
    if (
      !usedStrengths.includes(
        strength,
      )
    ) {
      return strength;
    }

    strength += step;
  }

  return null;
}

export function getAllValidPlays(hand) {
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
      if (mask & (1 << index)) {
        cards.push(hand[index]);
      }
    }

    const analysis =
      analyzePlay(cards);

    if (!analysis.valid) {
      continue;
    }

    validPlays.push({
      cards,
      cardIds: cards.map(
        (card) => card.id,
      ),
      analysis,
    });
  }

  return validPlays;
}

export function getPlayableCardIds(
  validPlays,
  selectedCardIds,
) {
  const playableIds = new Set();

  for (const play of validPlays) {
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

    for (const cardId of play.cardIds) {
      if (
        !selectedCardIds.includes(cardId)
      ) {
        playableIds.add(cardId);
      }
    }
  }

  return [...playableIds];
}

/*
  現在の革命・11バック・縛り・激シバを
  全て含めた場札比較。
*/
export function canBeatPlay(
  candidatePlay,
  fieldPlay,
  {
    candidateCards = [],
    fieldCards = [],
    revolution = false,
    elevenBack = false,
    lockedSuit = null,
    gekiShibari = false,
    singleStrengthHistory = [],
  } = {},
) {
  if (
    !candidatePlay?.valid
  ) {
    return false;
  }

  if (!fieldPlay?.valid) {
    return true;
  }

  /*
    単独Jokerは縛りも激シバも無視。
  */
  if (isSingleJoker(candidateCards)) {
    return (
      fieldPlay.type === "single" &&
      !isSingleJoker(fieldCards)
    );
  }

  /*
    Joker単独へのスペ3返し。
    スート縛りも無視する。
  */
  if (isSingleJoker(fieldCards)) {
    return isSpadeThree(
      candidateCards,
    );
  }

  if (
    candidatePlay.type !==
      fieldPlay.type ||
    candidatePlay.count !==
      fieldPlay.count
  ) {
    return false;
  }

  if (
    candidatePlay.type === "single" &&
    lockedSuit
  ) {
    if (
      getSingleNaturalSuit(
        candidateCards,
      ) !== lockedSuit
    ) {
      return false;
    }
  }

  if (
    candidatePlay.type === "single" &&
    gekiShibari
  ) {
    const requiredStrength =
      getGekiRequiredStrength({
        fieldStrength:
          fieldPlay.strength,
        usedStrengths:
          singleStrengthHistory,
        revolution,
        elevenBack,
      });

    if (
      requiredStrength === null ||
      candidatePlay.strength !==
        requiredStrength
    ) {
      return false;
    }
  }

  const reversed =
    Boolean(revolution) !==
    Boolean(elevenBack);

  if (reversed) {
    return (
      candidatePlay.strength <
      fieldPlay.strength
    );
  }

  return (
    candidatePlay.strength >
    fieldPlay.strength
  );
}

export function getLegalPlaysAgainstField(
  hand,
  fieldCards,
  context = {},
) {
  const fieldPlay =
    analyzePlay(fieldCards);

  return getAllValidPlays(hand).filter(
    (play) =>
      canBeatPlay(
        play.analysis,
        fieldPlay,
        {
          ...context,
          candidateCards:
            play.cards,
          fieldCards,
        },
      ),
  );
}