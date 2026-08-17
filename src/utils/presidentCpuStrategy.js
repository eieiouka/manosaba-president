import {
  getCardStrength,
} from "./cardUtils";

function isJoker(card) {
  return Boolean(
    card?.isJoker ||
    card?.suit === "joker",
  );
}

function isFieldEmpty(fieldPlay) {
  return !fieldPlay?.valid;
}

function getHandIndexMap(hand) {
  return new Map(
    hand.map((card, index) => [
      card.id,
      index,
    ]),
  );
}

/*
  Jokerを使わずに成立している
  ペア・トリオ・階段などの構成札。

  Jokerとの仮ペアによって、
  全単品が保護されるのを防ぐ。
*/
function getNaturalMeldCardIds(
  hand,
  allValidPlays,
) {
  const indexByCardId = new Map(
    hand.map((card, index) => [
      card.id,
      index,
    ]),
  );

  const meldMasks = [
    ...new Set(
      allValidPlays
        .filter(
          (play) =>
            play.cards.length >= 2 &&
            !play.cards.some(isJoker),
        )
        .map((play) =>
          play.cards.reduce(
            (mask, card) =>
              mask |
              (1 <<
                indexByCardId.get(
                  card.id,
                )),
            0,
          ),
        ),
    ),
  ];

  const bestCoveredByUsedMask =
    new Map();

  function countBits(mask) {
    let value = mask;
    let count = 0;

    while (value !== 0) {
      count += value & 1;
      value >>>= 1;
    }

    return count;
  }

  function search(usedMask) {
    if (
      bestCoveredByUsedMask.has(usedMask)
    ) {
      return bestCoveredByUsedMask.get(
        usedMask,
      );
    }

    let bestMask = usedMask;

    meldMasks.forEach((meldMask) => {
      if ((usedMask & meldMask) !== 0) {
        return;
      }

      const candidateMask = search(
        usedMask | meldMask,
      );

      if (
        countBits(candidateMask) >
        countBits(bestMask)
      ) {
        bestMask = candidateMask;
      }
    });

    bestCoveredByUsedMask.set(
      usedMask,
      bestMask,
    );

    return bestMask;
  }

  const coveredMask = search(0);

  return new Set(
    hand
      .filter(
        (_, index) =>
          coveredMask & (1 << index),
      )
      .map((card) => card.id),
  );
}

function getDisposableSingleIds({
  hand,
  allValidPlays,
}) {
  const naturalMeldCardIds =
    getNaturalMeldCardIds(
      hand,
      allValidPlays,
    );

  return new Set(
    hand
      .filter((card) => {
        if (isJoker(card)) {
          return false;
        }

        if ([3, 8, 2].includes(card.rank)) {
          return false;
        }

        return !naturalMeldCardIds.has(
          card.id,
        );
      })
      .map((card) => card.id),
  );
}

function getProtectedMeldCardIds(
  allValidPlays,
) {
  return new Set(
    allValidPlays
      .filter(
        (play) =>
          play.cards.length >= 2 &&
          !containsJoker(play),
      )
      .flatMap(
        (play) => play.cardIds,
      ),
  );
}

function isDisposableSinglePlay(
  play,
  disposableSingleIds,
) {
  return (
    play.analysis.type === "single" &&
    disposableSingleIds.has(
      play.cards[0].id,
    )
  );
}

function isEffectiveReverse(
  ruleContext,
) {
  return Boolean(
    ruleContext.revolution,
  ) !== Boolean(
    ruleContext.elevenBack,
  );
}

function isSingleRank(play, rank) {
  return (
    play.analysis.type === "single" &&
    !isJoker(play.cards[0]) &&
    play.cards[0].rank === rank
  );
}

function containsJoker(play) {
  return play.cards.some(isJoker);
}

function hasSameCardIds(
  play,
  cards,
) {
  if (play.cards.length !== cards.length) {
    return false;
  }

  const cardIds = new Set(
    cards.map((card) => card.id),
  );

  return play.cardIds.every(
    (cardId) => cardIds.has(cardId),
  );
}

function isEightCutPlay(play) {
  if (
    play.cards.some(
      (card) =>
        !isJoker(card) &&
        card.rank === 8,
    )
  ) {
    return true;
  }

  if (
    play.analysis.type !== "straight"
  ) {
    return false;
  }

  const strongestOptions =
    play.analysis.straightOptions?.filter(
      (option) =>
        option.endStrength ===
        play.analysis.strength,
    ) ?? [];

  return strongestOptions.some(
    (option) =>
      option.jokerStrengths?.includes(8),
  );
}

function triggersElevenBack(play) {
  if (
    play.cards.some(
      (card) =>
        !isJoker(card) &&
        card.rank === 11,
    )
  ) {
    return true;
  }

  if (
    play.analysis.type !== "straight"
  ) {
    return false;
  }

  const strongestOptions =
    play.analysis.straightOptions?.filter(
      (option) =>
        option.endStrength ===
        play.analysis.strength,
    ) ?? [];

  return strongestOptions.some(
    (option) =>
      option.startStrength <= 11 &&
      option.endStrength >= 11,
  );
}

function getRemainingCards(hand, play) {
  const playedIds = new Set(
    play.cardIds,
  );

  return hand.filter(
    (card) =>
      !playedIds.has(card.id),
  );
}

function findWholeHandPlay({
  plays,
  cards,
}) {
  return plays.find(
    (play) =>
      !containsJoker(play) &&
      hasSameCardIds(play, cards),
  ) ?? null;
}

function findEightFinishTail({
  remainingCards,
  eightCandidatePlays,
  allValidPlays,
}) {
  const remainingIds = new Set(
    remainingCards.map(
      (card) => card.id,
    ),
  );

  const eightCutPlays =
    eightCandidatePlays.filter(
      (play) =>
        isEightCutPlay(play) &&
        play.cardIds.every(
          (cardId) =>
            remainingIds.has(cardId),
        ),
    );

  for (const eightPlay of eightCutPlays) {
    const finalCards =
      getRemainingCards(
        remainingCards,
        eightPlay,
      );

    if (finalCards.length === 0) {
      if (!containsJoker(eightPlay)) {
        return [eightPlay];
      }

      continue;
    }

    const finalPlay = findWholeHandPlay({
      plays: allValidPlays,
      cards: finalCards,
    });

    if (finalPlay) {
      return [eightPlay, finalPlay];
    }
  }

  return null;
}

/*
  現在地点から、相手の選択に左右されず
  上がりまで到達できる手順を探す。
*/
export function findGuaranteedFinishPlan({
  hand,
  allValidPlays,
  legalPlays,
  knowledge,
  ruleContext,
}) {
  const directFinish = findWholeHandPlay({
    plays: legalPlays,
    cards: hand,
  });

  if (directFinish) {
    return [directFinish];
  }

  /*
    8切りで即座に親を取り、
    残りを一括で出す。
  */
  const immediateEightTail =
    findEightFinishTail({
      remainingCards: hand,
      eightCandidatePlays: legalPlays,
      allValidPlays,
    });

  if (immediateEightTail) {
    return immediateEightTail;
  }

  const controlPlays = legalPlays.filter(
    (play) =>
      play.cards.length <= 3 &&
      !triggersElevenBack(play) &&
      isAbsolutelyUnbeatable({
        play,
        knowledge,
        ruleContext,
      }),
  );

  for (const controlPlay of controlPlays) {
    const remainingCards =
      getRemainingCards(
        hand,
        controlPlay,
      );

    const finalPlay = findWholeHandPlay({
      plays: allValidPlays,
      cards: remainingCards,
    });

    if (finalPlay) {
      return [controlPlay, finalPlay];
    }

    const eightTail = findEightFinishTail({
      remainingCards,
      eightCandidatePlays:
        allValidPlays,
      allValidPlays,
    });

    if (eightTail) {
      return [controlPlay, ...eightTail];
    }
  }

  return null;
}

function getRushControlRisk({
  play,
  knowledge,
  ruleContext,
}) {
  if (isEightCutPlay(play)) {
    return -10_000;
  }

  if (
    isAbsolutelyUnbeatable({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return -5_000;
  }

  let risk = 0;

  if (containsJoker(play)) {
    risk -= 1_000;
  }

  if (isThreeCardAttack(play)) {
    risk += 800;
  }

  if (play.analysis.type === "pair") {
    risk += 400;
  }

  risk -= play.analysis.strength * 10;

  return risk;
}

function isRushControlPlay({
  play,
  knowledge,
  ruleContext,
}) {
  if (isEightCutPlay(play)) {
    return true;
  }

  if (triggersElevenBack(play)) {
    return false;
  }

  if (
    isAbsolutelyUnbeatable({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return true;
  }

  /*
    Jokerを含むだけの不確定な組札は、
    ラッシュ候補にしない。

    Jokerを使えるのは上の
    「絶対に返されない」判定を通った時か、
    8切りで確実に場が流れる時だけ。
  */
  if (containsJoker(play)) {
    return false;
  }

  if (isThreeCardAttack(play)) {
    return true;
  }

  return (
    play.analysis.type === "pair" &&
    play.analysis.strength >= 12
  );
}

/*
  「この一手が通れば、そのまま上がれる」ラッシュ。

  確実でない切り札を先に試し、絶対札と8切りは
  後ろへ残す。途中で返された場合は useCpuTurn 側で
  計画を破棄する。
*/
export function findFinishRushPlan({
  hand,
  allValidPlays,
  legalPlays,
  knowledge,
  ruleContext,
}) {
  const MAX_CONTROL_STEPS = 3;
  const visited = new Set();

  function search(
    remainingCards,
    candidatePlays,
    depth,
  ) {
    const finalPlay = findWholeHandPlay({
      plays: allValidPlays,
      cards: remainingCards,
    });

    if (finalPlay) {
      return [finalPlay];
    }

    if (depth >= MAX_CONTROL_STEPS) {
      return null;
    }

    const stateKey = remainingCards
      .map((card) => card.id)
      .sort()
      .join("|");

    if (visited.has(`${depth}:${stateKey}`)) {
      return null;
    }

    visited.add(`${depth}:${stateKey}`);

    const remainingIds = new Set(
      remainingCards.map((card) => card.id),
    );

    const controls = candidatePlays
      .filter(
        (play) =>
          play.cards.length <
            remainingCards.length &&
          play.cardIds.every((cardId) =>
            remainingIds.has(cardId),
          ) &&
          isRushControlPlay({
            play,
            knowledge,
            ruleContext,
          }),
      )
      .sort(
        (a, b) =>
          getRushControlRisk({
            play: b,
            knowledge,
            ruleContext,
          }) -
          getRushControlRisk({
            play: a,
            knowledge,
            ruleContext,
          }),
      );

    for (const controlPlay of controls) {
      const nextCards = getRemainingCards(
        remainingCards,
        controlPlay,
      );

      const tail = search(
        nextCards,
        allValidPlays,
        depth + 1,
      );

      if (tail) {
        return [controlPlay, ...tail];
      }
    }

    return null;
  }

  const plan = search(
    hand,
    legalPlays,
    0,
  );

  return plan && plan.length >= 2
    ? plan
    : null;
}

function chooseByHandOrder({
  plays,
  handIndexMap,
  preferWeak = true,
  reverse = false,
}) {
  return [...plays].sort((a, b) => {
    if (
      a.analysis.strength !==
      b.analysis.strength
    ) {
      const difference =
        a.analysis.strength -
        b.analysis.strength;

      return preferWeak
        ? reverse
          ? -difference
          : difference
        : reverse
          ? difference
          : -difference;
    }

    const aIndex = Math.min(
      ...a.cards.map(
        (card) =>
          handIndexMap.get(card.id) ?? 99,
      ),
    );

    const bIndex = Math.min(
      ...b.cards.map(
        (card) =>
          handIndexMap.get(card.id) ?? 99,
      ),
    );

    return aIndex - bIndex;
  })[0] ?? null;
}

function numberToCardData(number) {
  if (number === 0) {
    return {
      isJoker: true,
      strength: 16,
      suitIndex: -1,
    };
  }

  const zeroBased = number - 1;
  const rank =
    (zeroBased % 13) + 1;

  return {
    isJoker: false,
    rank,
    strength:
      rank === 1
        ? 14
        : rank === 2
          ? 15
          : rank,
    suitIndex: Math.floor(
      zeroBased / 13,
    ),
  };
}

function canStrengthBeat({
  candidateStrength,
  fieldStrength,
  reverse,
}) {
  return reverse
    ? candidateStrength < fieldStrength
    : candidateStrength > fieldStrength;
}

function canPossibleSameRankBeat({
  play,
  remainingNumbers,
  reverse,
}) {
  const requiredCount =
    play.analysis.count;

  const countByStrength = new Map();
  let jokerCount = 0;

  remainingNumbers.forEach((number) => {
    const card = numberToCardData(number);

    if (card.isJoker) {
      jokerCount += 1;
      return;
    }

    countByStrength.set(
      card.strength,
      (countByStrength.get(
        card.strength,
      ) ?? 0) + 1,
    );
  });

  for (
    let strength = 3;
    strength <= 15;
    strength += 1
  ) {
    if (
      !canStrengthBeat({
        candidateStrength: strength,
        fieldStrength:
          play.analysis.strength,
        reverse,
      })
    ) {
      continue;
    }

    const naturalCount =
      countByStrength.get(strength) ?? 0;

    if (
      naturalCount + jokerCount >=
      requiredCount
    ) {
      return true;
    }
  }

  return false;
}

function canPossibleStraightBeat({
  play,
  remainingNumbers,
  reverse,
}) {
  const count = play.analysis.count;
  const jokerAvailable =
    remainingNumbers.includes(0);

  const cardsBySuitAndStrength =
    new Set();

  remainingNumbers.forEach((number) => {
    const card = numberToCardData(number);

    if (!card.isJoker) {
      cardsBySuitAndStrength.add(
        `${card.suitIndex}:${card.strength}`,
      );
    }
  });

  for (
    let start = 3;
    start + count - 1 <= 16;
    start += 1
  ) {
    const end = start + count - 1;

    if (
      !canStrengthBeat({
        candidateStrength: end,
        fieldStrength:
          play.analysis.strength,
        reverse,
      })
    ) {
      continue;
    }

    for (
      let suitIndex = 0;
      suitIndex < 4;
      suitIndex += 1
    ) {
      let missingCount = 0;

      for (
        let strength = start;
        strength <= end;
        strength += 1
      ) {
        if (strength === 16) {
          missingCount += 1;
          continue;
        }

        if (
          !cardsBySuitAndStrength.has(
            `${suitIndex}:${strength}`,
          )
        ) {
          missingCount += 1;
        }
      }

      if (
        missingCount === 0 ||
        (missingCount === 1 &&
          jokerAvailable)
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isAbsolutelyUnbeatable({
  play,
  knowledge,
  ruleContext,
}) {
  if (!knowledge) {
    return false;
  }

  const remainingNumbers =
    knowledge
      .remainingOpponentCardNumbers ?? [];

  const reverse =
    isEffectiveReverse(ruleContext);

  if (
    ["pair", "trio"].includes(
      play.analysis.type,
    )
  ) {
    return !canPossibleSameRankBeat({
      play,
      remainingNumbers,
      reverse,
    });
  }

  if (
    play.analysis.type === "straight"
  ) {
    return !canPossibleStraightBeat({
      play,
      remainingNumbers,
      reverse,
    });
  }

  return false;
}

function isThreeCardAttack(play) {
  return (
    play.cards.length === 3 &&
    ["trio", "straight"].includes(
      play.analysis.type,
    )
  );
}

function isHighGroupPlay(
  play,
  ruleContext,
) {
  const reverse =
    isEffectiveReverse(ruleContext);

  return reverse
    ? play.analysis.strength <= 6
    : play.analysis.strength >= 12;
}

export function choosePresidentCpuPlay({
  hand,
  allValidPlays,
  legalPlays,
  fieldPlay,
  ruleContext,
  knowledge,
}) {
  if (legalPlays.length === 0) {
    return null;
  }

  const handIndexMap =
    getHandIndexMap(hand);

  const reverse =
    isEffectiveReverse(ruleContext);

  const disposableSingleIds =
    getDisposableSingleIds({
      hand,
      allValidPlays,
    });

  const jokerFreePlays =
    legalPlays.filter(
      (play) => !containsJoker(play),
    );

  const ordinaryPlays =
    jokerFreePlays.length > 0
      ? jokerFreePlays
      : hand.length === 1
        ? legalPlays
        : [];

  const ordinaryDisposableSingles =
    ordinaryPlays.filter((play) =>
      isDisposableSinglePlay(
        play,
        disposableSingleIds,
      ),
    );

  const weakestDisposableSingle =
    chooseByHandOrder({
      plays: ordinaryDisposableSingles,
      handIndexMap,
      reverse,
    });

  const pairPlays = ordinaryPlays.filter(
    (play) =>
      play.analysis.type === "pair",
  );

  const weakestPair = chooseByHandOrder({
    plays: pairPlays,
    handIndexMap,
    reverse,
  });

  const weakThreeCardPlays =
    ordinaryPlays.filter(
      (play) =>
        isThreeCardAttack(play) &&
        play.analysis.strength <= 7,
    );

  const weakestWeakThreeCard =
    chooseByHandOrder({
      plays: weakThreeCardPlays,
      handIndexMap,
      reverse,
    });

  const protectedMeldCardIds =
    getProtectedMeldCardIds(
      allValidPlays,
    );

  const looseThreePlay =
    ordinaryPlays.find(
      (play) =>
        isSingleRank(play, 3) &&
        !protectedMeldCardIds.has(
          play.cards[0].id,
        ),
    ) ?? null;

  const possibleOpponentNumbers =
    knowledge
      ?.remainingOpponentCardNumbers ?? [];

  const twoCardNumbers = new Set([
    2,
    15,
    28,
    41,
  ]);

  const opponentMayHaveTwo =
    !knowledge ||
    possibleOpponentNumbers.some(
      (number) =>
        twoCardNumbers.has(number),
    );

  /*
    11バック中の単独3は早く処理する。
    33を崩してまで出さず、孤立単品だけを対象にする。
  */
  if (
    ruleContext.elevenBack &&
    !ruleContext.revolution
  ) {
    const singleThree =
      ordinaryPlays.find(
        (play) =>
          isSingleRank(play, 3) &&
          !protectedMeldCardIds.has(
            play.cards[0].id,
          ),
      );

    if (singleThree) {
      return singleThree;
    }
  }

  /*
    親では原則として孤立単品を処理する。

    例外：
    ・孤立Aより77以下
    ・孤立Kより55以下
    ・強いペアより、567以下の弱い3枚組
  */
  if (isFieldEmpty(fieldPlay)) {
    /*
      3とAのように弱い札を抱える余裕がなく、
      まだ相手の2が残り得る場合は3から処理する。

      4～Qの処理できる孤立単品がある間は、
      そちらを先に処理する。
    */
    if (
      looseThreePlay &&
      opponentMayHaveTwo &&
      (
        !weakestDisposableSingle ||
        weakestDisposableSingle
          .analysis.strength >= 13
      )
    ) {
      return looseThreePlay;
    }

    if (
      weakestDisposableSingle &&
      weakestPair
    ) {
      const singleStrength =
        weakestDisposableSingle
          .analysis.strength;

      const pairStrength =
        weakestPair.analysis.strength;

      if (
        (singleStrength === 14 &&
          pairStrength <= 7) ||
        (singleStrength === 13 &&
          pairStrength <= 5)
      ) {
        return weakestPair;
      }
    }

    if (weakestDisposableSingle) {
      return weakestDisposableSingle;
    }

    if (
      weakestWeakThreeCard &&
      weakestPair &&
      weakestPair.analysis.strength >= 12
    ) {
      return weakestWeakThreeCard;
    }

    if (weakestPair) {
      return weakestPair;
    }

    if (weakestWeakThreeCard) {
      return weakestWeakThreeCard;
    }

    const nonEightOrdinaryPlays =
      ordinaryPlays.filter(
        (play) =>
          !isEightCutPlay(play) &&
          (
            play.analysis.type !==
              "single" ||
            !protectedMeldCardIds.has(
              play.cards[0].id,
            )
          ),
      );

    return chooseByHandOrder({
      plays:
        nonEightOrdinaryPlays.length > 0
          ? nonEightOrdinaryPlays
          : ordinaryPlays,
      handIndexMap,
      reverse,
    });
  }

  const hasDisposableSingles =
    disposableSingleIds.size > 0;

  /*
    孤立単品の処理後、
    シングル場へ通常札では追わない。
  */
  if (fieldPlay?.type === "single") {
    const legalSinglePlays =
      ordinaryPlays.filter(
        (play) =>
          play.analysis.type ===
            "single" &&
          !protectedMeldCardIds.has(
            play.cards[0].id,
          ),
      );

    /*
      シングル場では、8・K・A・2も
      通常の候補として扱う。

      Jokerだけは上がりラッシュまで温存し、
      それ以外から最も弱い合法札を出す。
      8ならそのまま8切り、2なら親を取って
      次のペア・組札処理へつなげる。
    */
    if (legalSinglePlays.length > 0) {
      return chooseByHandOrder({
        plays: legalSinglePlays,
        handIndexMap,
        reverse,
      });
    }

    return null;
  }


  /*
    未処理の孤立単品がある間は、
    安いペアへ漫然と追随しない。

    例外：
    ・3枚組
    ・絶対に返されない組
    ・通常時Q以上の強い組
  */
  const permittedGroupPlays =
    hasDisposableSingles &&
    !isFieldEmpty(fieldPlay)
      ? ordinaryPlays.filter(
          (play) =>
            play.analysis.type !==
              "single" &&
            (isThreeCardAttack(play) ||
              isHighGroupPlay(
                play,
                ruleContext,
              )),
        )
      : ordinaryPlays;

  if (
    hasDisposableSingles &&
    !isFieldEmpty(fieldPlay) &&
    permittedGroupPlays.length === 0
  ) {
    return null;
  }

  /*
    ペア・3枚組・階段、または
    22のような絶対制圧手で勝負。
  */
  const responsePairs =
    permittedGroupPlays.filter(
      (play) =>
        play.analysis.type === "pair",
    );

  const attackPlay =
    chooseByHandOrder({
      plays:
        responsePairs.length > 0
          ? responsePairs
          : permittedGroupPlays,
      handIndexMap,
      reverse,
    });

  if (attackPlay) {
    return attackPlay;
  }

  return chooseByHandOrder({
    plays: ordinaryPlays,
    handIndexMap,
    reverse,
  });
}
