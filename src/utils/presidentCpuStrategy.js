import {
  getCardStrength,
} from "./cardUtils";

import {
  analyzePlay,
  getGekiRequiredStrength,
} from "./presidentRules";

import {
  chooseRoleBasedLead,
  getCpuHandRoles,
} from "./presidentCpuRoles";

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

function getProtectedMeldCardIds({
  hand,
  allValidPlays,
  ruleContext,
}) {
  /*
    「作れる全ての組」の和集合ではなく、
    CPUが採用した最適分割だけを保護する。

    例：89TT → 89T + T
    階段側のTだけを保護し、余ったTは
    シングルとして処理できる。
  */
  const handRoles = getCpuHandRoles({
    hand,
    allValidPlays,
    ruleContext,
  });

  return new Set(
    handRoles
      .filter(
        (group) =>
          group.cardIds.length >= 2,
      )
      .flatMap(
        (group) => group.cardIds,
      ),
  );
}

/*
  激シバの次札を公開情報と照合するための
  card number変換。
*/
const SUIT_NUMBER_OFFSET = {
  spades: 0,
  hearts: 13,
  diamonds: 26,
  clubs: 39,
};

function strengthToRank(strength) {
  if (strength === 14) {
    return 1;
  }

  if (strength === 15) {
    return 2;
  }

  return strength;
}

function getCardNumberBySuitAndStrength(
  suit,
  strength,
) {
  const offset = SUIT_NUMBER_OFFSET[suit];

  if (offset === undefined) {
    return -1;
  }

  return offset + strengthToRank(strength);
}

function securesLeadThroughGekiShibari({
  play,
  hand,
  fieldPlay,
  knowledge,
  ruleContext,
}) {
  if (
    play.analysis.type !== "single" ||
    containsJoker(play) ||
    fieldPlay?.type !== "single"
  ) {
    return false;
  }

  const card = play.cards[0];
  const fieldCard =
    ruleContext.fieldCards?.[0];

  if (
    !fieldCard ||
    isJoker(fieldCard) ||
    card.suit !== fieldCard.suit
  ) {
    return false;
  }

  const fieldStrength =
    fieldPlay.strength;

  const candidateStrength =
    play.analysis.strength;

  const startsGekiShibari =
    Math.abs(
      candidateStrength - fieldStrength,
    ) === 1;

  if (
    !ruleContext.gekiShibari &&
    !startsGekiShibari
  ) {
    return false;
  }

  const nextStrength =
    getGekiRequiredStrength({
      fieldStrength: candidateStrength,
      usedStrengths: [
        ...(ruleContext
          .singleStrengthHistory ?? []),
        candidateStrength,
      ],
      revolution:
        Boolean(ruleContext.revolution),
      elevenBack:
        Boolean(ruleContext.elevenBack),
    });

  /*
    強弱方向の端まで到達していれば、
    次に出せる札がないため親を取れる。
  */
  if (nextStrength === null) {
    return true;
  }

  /*
    次の指定札を自分が持っていれば、
    他の3人はその札を持てない。
  */
  const ownsNextCard = hand.some(
    (handCard) =>
      handCard.id !== card.id &&
      !isJoker(handCard) &&
      handCard.suit === card.suit &&
      getCardStrength(handCard) ===
        nextStrength,
  );

  if (ownsNextCard) {
    return true;
  }

  /*
    次の指定札が既に場へ出ている場合も、
    相手の残存候補には含まれない。
  */
  const nextCardNumber =
    getCardNumberBySuitAndStrength(
      card.suit,
      nextStrength,
    );

  const remainingOpponentNumbers =
    knowledge
      ?.remainingOpponentCardNumbers;

  return (
    Array.isArray(
      remainingOpponentNumbers,
    ) &&
    !remainingOpponentNumbers.includes(
      nextCardNumber,
    )
  );
}

function canBreakProtectedMeldAsSingle({
  play,
  hand,
  fieldPlay,
  knowledge,
  ruleContext,
}) {
  if (isEightCutPlay(play)) {
    return true;
  }

  if (
    isHighSingleControl(
      play,
      ruleContext,
    )
  ) {
    return true;
  }

  if (
    isKnowledgeBasedSingleControl({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return true;
  }

  return securesLeadThroughGekiShibari({
    play,
    hand,
    fieldPlay,
    knowledge,
    ruleContext,
  });
}

/*
  CPUの全思考に渡す前に、子のシングル場で
  組を不当に崩す候補を取り除く。

  choosePresidentCpuPlayだけでなく、
  確定上がり／上がりラッシュにも適用するため
  useCpuTurnから呼び出す。
*/
export function filterNonBreakingSingleResponses({
  hand,
  allValidPlays,
  legalPlays,
  fieldPlay,
  knowledge,
  ruleContext,
}) {
  if (fieldPlay?.type !== "single") {
    return legalPlays;
  }

  const protectedMeldCardIds =
    getProtectedMeldCardIds({
      hand,
      allValidPlays,
      ruleContext,
    });

  return legalPlays.filter((play) => {
    if (
      play.analysis.type !== "single" ||
      containsJoker(play)
    ) {
      return true;
    }

    const cardId = play.cards[0].id;

    if (
      !protectedMeldCardIds.has(cardId)
    ) {
      return true;
    }

    return canBreakProtectedMeldAsSingle({
      play,
      hand,
      fieldPlay,
      knowledge,
      ruleContext,
    });
  });
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

function isNaturalDeucePair(play) {
  return (
    play.analysis.type === "pair" &&
    play.cards.length === 2 &&
    !containsJoker(play) &&
    play.cards.every(
      (card) => card.rank === 2,
    )
  );
}

/*
  革命後の残り手札が、低い数字側へ
  どの程度寄っているかを評価する。

  3～8：革命後に強いのでプラス
  9   ：中立
  10～2：革命後に弱いのでマイナス

  同じ低位札が複数あれば、革命後に
  ペア／トリオとしても強いため少し加点する。
*/
function evaluatePostRevolutionHand(cards) {
  const normalCards = cards.filter(
    (card) => !isJoker(card),
  );

  if (normalCards.length === 0) {
    return {
      balance: 0,
      strongCardCount: 0,
      weakCardCount: 0,
    };
  }

  const countByStrength = new Map();
  let balance = 0;
  let strongCardCount = 0;
  let weakCardCount = 0;

  normalCards.forEach((card) => {
    const strength =
      getCardStrength(card);

    balance += 9 - strength;

    if (strength <= 8) {
      strongCardCount += 1;
    } else if (strength >= 10) {
      weakCardCount += 1;
    }

    countByStrength.set(
      strength,
      (countByStrength.get(strength) ?? 0) + 1,
    );
  });

  countByStrength.forEach(
    (count, strength) => {
      if (
        count >= 2 &&
        strength <= 8
      ) {
        balance += count - 1;
      }

      if (
        count >= 2 &&
        strength >= 10
      ) {
        balance -= count - 1;
      }
    },
  );

  return {
    balance,
    strongCardCount,
    weakCardCount,
  };
}

function chooseStrategicRevolutionLead({
  hand,
  legalPlays,
  handIndexMap,
}) {
  const revolutionCandidates =
    legalPlays
      .filter(
        (play) =>
          play.cards.length >= 4 &&
          !containsJoker(play),
      )
      .map((play) => {
        const remainingCards =
          getRemainingCards(
            hand,
            play,
          );

        return {
          play,
          remainingCards,
          evaluation:
            evaluatePostRevolutionHand(
              remainingCards,
            ),
        };
      })
      .filter(({ remainingCards, evaluation }) =>
        remainingCards.length > 0 &&
        evaluation.balance > 0 &&
        evaluation.strongCardCount >=
          evaluation.weakCardCount,
      );

  return revolutionCandidates
    .sort((a, b) => {
      if (
        a.evaluation.balance !==
        b.evaluation.balance
      ) {
        return (
          b.evaluation.balance -
          a.evaluation.balance
        );
      }

      if (
        a.evaluation.strongCardCount !==
        b.evaluation.strongCardCount
      ) {
        return (
          b.evaluation.strongCardCount -
          a.evaluation.strongCardCount
        );
      }

      return (
        Math.min(
          ...a.play.cards.map(
            (card) =>
              handIndexMap.get(card.id) ?? 99,
          ),
        ) -
        Math.min(
          ...b.play.cards.map(
            (card) =>
              handIndexMap.get(card.id) ?? 99,
          ),
        )
      );
    })[0]?.play ?? null;
}

/*
  イレブンバック中の単独3。

  革命＋イレブンバックでは強弱が通常へ戻るため、
  その場合は最優先にしない。
*/
export function chooseElevenBackThreePlay(
  legalPlays,
) {
  if (!Array.isArray(legalPlays)) {
    return null;
  }

  return [...legalPlays]
    .filter((play) =>
      isSingleRank(play, 3),
    )
    .sort((a, b) => {
      const aSpade =
        a.cards[0].suit === "spades";
      const bSpade =
        b.cards[0].suit === "spades";

      if (aSpade !== bSpade) {
        return aSpade ? 1 : -1;
      }

      return 0;
    })[0] ?? null;
}

/*
  大富豪が、上がり目前の相手を
  Jokerで強引に止める緊急手。
*/
export function chooseEmergencyJokerDefense({
  hand,
  legalPlays,
  ruleContext,
}) {
  const reverse =
    isEffectiveReverse(ruleContext);

  const candidates = legalPlays.filter(
    (play) =>
      containsJoker(play) &&
      /* Joker禁止上がりは選ばない。 */
      play.cards.length < hand.length,
  );

  return [...candidates]
    .sort((a, b) => {
      const aEightCut =
        isEightCutPlay(a);
      const bEightCut =
        isEightCutPlay(b);

      if (aEightCut !== bEightCut) {
        return aEightCut ? -1 : 1;
      }

      if (
        a.analysis.strength !==
        b.analysis.strength
      ) {
        const difference =
          b.analysis.strength -
          a.analysis.strength;

        return reverse
          ? -difference
          : difference;
      }

      /*
        同じ強さなら、一度に多く処理する。
      */
      return (
        b.cards.length -
        a.cards.length
      );
    })[0] ?? null;
}

function containsJoker(play) {
  return play.cards.some(isJoker);
}

function isSpadeThreeUnavailableToOpponents(
  knowledge,
) {
  const ownCardNumbers =
    knowledge?.ownCardNumbers ?? [];

  const publicPlayedCardNumbers =
    knowledge?.publicPlayedCardNumbers ?? [];

  /*
    card number 3 = スペード3。

    公開済み、または自分自身が持っていれば、
    相手はスペ3返しをできない。
  */
  return (
    ownCardNumbers.includes(3) ||
    publicPlayedCardNumbers.includes(3)
  );
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

/*
  上がりラッシュで最初に試す、
  8を含まない3枚のイレブンバック札。

  JJJ・9TJ・TJQ・JQKなどが対象。
  4枚以上の革命札は対象外。
*/
function isWeakThreeCardElevenBack(
  play,
) {
  return (
    play.cards.length === 3 &&
    triggersElevenBack(play) &&
    !isEightCutPlay(play)
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
  /*
    数値が大きいほど、
    「通る可能性が低いので先に試す」。

    8切りや絶対札は確実に通るため、
    ラッシュの後ろへ温存する。
  */
  if (isEightCutPlay(play)) {
    return -100_000;
  }

  /*
    3枚のJ入り勝負手は、
    イレブンバックによって返されやすい。

    通らない可能性が高いため、
    ラッシュの最初に試す。
  */
  if (isWeakThreeCardElevenBack(play)) {
    return 100_000;
  }

  if (
    isAbsolutelyUnbeatable({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return -50_000;
  }

  /*
    2・反転中の3・公開情報上返せないAなどは
    確実性が高いのでラッシュの後ろへ残す。

    TTT等の不確実な3枚組を先に試す。
  */
  if (
    isHighSingleControl(
      play,
      ruleContext,
    ) ||
    isKnowledgeBasedSingleControl({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return -40_000;
  }

  const reverse =
    isEffectiveReverse(ruleContext);

  let risk =
    reverse
      ? play.analysis.strength * 100
      : (16 -
          play.analysis.strength) *
        100;

  const typeRisk = {
    single: 3_000,
    pair: 2_000,
    trio: 1_000,
    straight: 1_000,
    quads: 500,
  };

  risk +=
    typeRisk[play.analysis.type] ?? 0;

  /*
    同程度なら枚数が少なく、
    相手に返されやすい組を先に試す。
  */
  risk +=
    (4 - play.cards.length) * 50;

  if (
    isHighThreeCardControl(
      play,
      ruleContext,
    )
  ) {
    /*
      TTT以上・QKA以上は比較的通りやすい。
      567のような弱い3枚組を先にする。
    */
    risk -= 500;
  }

  return risk;
}

function isRushControlPlay({
  play,
  knowledge,
  ruleContext,
}) {
  /*
    8切り・最強札・2などの
    制圧手はラッシュに使える。
  */
  if (
    isEffectiveZeroGroupPlay({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return true;
  }

  /*
    567や777のような3枚組は、
    強くなくても「通れば勝ち」の
    ワンチャン勝負手にする。
  */
  if (isThreeCardAttack(play)) {
    return true;
  }

  /*
    4枚以上は革命を伴うため、
    勝負手として扱う。
  */
  if (play.cards.length >= 4) {
    return true;
  }

  return false;
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
  fieldPlay,
  knowledge,
  ruleContext,
}) {
  /*
    KKK → 2 → 革命 → 444 → 3 のような
    革命をまたぐラッシュも探索対象にする。
  */
  const MAX_CONTROL_STEPS = 5;
  const MAX_PLAN_COUNT = 5_000;

  function resolvePlayForContext(
    play,
    context,
  ) {
    return {
      ...play,
      analysis: analyzePlay(
        play.cards,
        context,
      ),
    };
  }

  function getContextAfterPlay(
    context,
    play,
  ) {
    return {
      ...context,

      /*
        4枚以上を出した瞬間から
        以後のラッシュ評価も反転する。
      */
      revolution:
        play.cards.length >= 4
          ? !context.revolution
          : context.revolution,

      /*
        1手が通って親へ戻る前提なので、
        一時ルールは次の親番では解除済み。
      */
      elevenBack: false,
      lockedSuit: null,
      gekiShibari: false,
      singleStrengthHistory: [],
      fieldCards: [],
    };
  }

  function isPlannedJokerRevolution({
    play,
    remainingCards,
    context,
  }) {
    if (
      play.cards.length < 4 ||
      !containsJoker(play)
    ) {
      return true;
    }

    const nextCards = getRemainingCards(
      remainingCards,
      play,
    );

    /*
      Jokerを含んだまま上がるのは禁止。
    */
    if (nextCards.length === 0) {
      return false;
    }

    const nextContext =
      getContextAfterPlay(
        context,
        play,
      );

    const nextContextPlays =
      allValidPlays.map(
        (candidate) =>
          resolvePlayForContext(
            candidate,
            nextContext,
          ),
      );

    /*
      革命直後に残り全体を出せるなら、
      明確な上がり手順なので使用してよい。
    */
    const directTail = findWholeHandPlay({
      plays: nextContextPlays,
      cards: nextCards,
    });

    if (directTail) {
      return true;
    }

    /*
      それ以外は、革命後の残り手札が
      明確に低位札側へ寄っている場合だけ許可。
    */
    const evaluation =
      evaluatePostRevolutionHand(
        nextCards,
      );

    return (
      evaluation.balance > 0 &&
      evaluation.strongCardCount >=
        evaluation.weakCardCount
    );
  }

  function collectPlans(
    remainingCards,
    candidatePlays,
    depth,
    maxDepth,
    prefix,
    plans,
    simulatedContext,
  ) {
    if (plans.length >= MAX_PLAN_COUNT) {
      return;
    }

    const contextualAllPlays =
      allValidPlays.map((play) =>
        resolvePlayForContext(
          play,
          simulatedContext,
        ),
      );

    const finalPlay = findWholeHandPlay({
      plays: contextualAllPlays,
      cards: remainingCards,
    });

    if (finalPlay) {
      plans.push([
        ...prefix,
        finalPlay,
      ]);
      return;
    }

    if (depth >= maxDepth) {
      return;
    }

    const remainingIds = new Set(
      remainingCards.map((card) => card.id),
    );

    const contextualCandidates =
      candidatePlays.map((play) =>
        resolvePlayForContext(
          play,
          simulatedContext,
        ),
      );

    const controls =
      contextualCandidates.filter(
        (play) =>
          play.cards.length <
            remainingCards.length &&
          play.cardIds.every((cardId) =>
            remainingIds.has(cardId),
          ) &&
          isRushControlPlay({
            play,
            knowledge,
            ruleContext:
              simulatedContext,
          }) &&
          isPlannedJokerRevolution({
            play,
            remainingCards,
            context:
              simulatedContext,
          }),
      );

    for (const controlPlay of controls) {
      const nextCards = getRemainingCards(
        remainingCards,
        controlPlay,
      );

      collectPlans(
        nextCards,
        allValidPlays,
        depth + 1,
        maxDepth,
        [...prefix, controlPlay],
        plans,
        getContextAfterPlay(
          simulatedContext,
          controlPlay,
        ),
      );

      if (plans.length >= MAX_PLAN_COUNT) {
        break;
      }
    }
  }

  function getRisk(
    play,
    context = ruleContext,
  ) {
    const contextualPlay =
      resolvePlayForContext(
        play,
        context,
      );

    return getRushControlRisk({
      play: contextualPlay,
      knowledge,
      ruleContext: context,
    });
  }

  function orderByRisk(
    controls,
    context,
  ) {
    const byLowPassChance =
      (a, b) => {
        const riskDifference =
          getRisk(b, context) -
          getRisk(a, context);

        if (riskDifference !== 0) {
          return riskDifference;
        }

        /*
          ラッシュ上の価値が同じなら、
          見栄えが自然になるよう
          数字の小さい組から出す。
        */
        if (
          a.analysis.strength !==
          b.analysis.strength
        ) {
          return (
            a.analysis.strength -
            b.analysis.strength
          );
        }

        return (
          a.cards.length -
          b.cards.length
        );
      };

    return [...controls].sort(
      byLowPassChance,
    );
  }

  function isStrongerAfterRevolution(
    play,
    context,
  ) {
    const before =
      resolvePlayForContext(
        play,
        context,
      );

    const afterContext = {
      ...context,
      revolution:
        !context.revolution,
      elevenBack: false,
    };

    const after =
      resolvePlayForContext(
        play,
        afterContext,
      );

    const beforeReverse =
      isEffectiveReverse(context);

    const afterReverse =
      isEffectiveReverse(afterContext);

    const beforePower = beforeReverse
      ? 18 - before.analysis.strength
      : before.analysis.strength;

    const afterPower = afterReverse
      ? 18 - after.analysis.strength
      : after.analysis.strength;

    return afterPower > beforePower;
  }

  function orderControlPlays(controls) {
    const fixedControls =
      isFieldEmpty(fieldPlay)
        ? []
        : controls.slice(0, 1);

    const reorderableControls =
      isFieldEmpty(fieldPlay)
        ? controls
        : controls.slice(1);

    let currentContext = {
      ...ruleContext,
    };

    fixedControls.forEach((play) => {
      currentContext =
        getContextAfterPlay(
          currentContext,
          play,
        );
    });

    const revolutionIndex =
      reorderableControls.findIndex(
        (play) =>
          play.cards.length >= 4,
      );

    if (revolutionIndex === -1) {
      return [
        ...fixedControls,
        ...orderByRisk(
          reorderableControls,
          currentContext,
        ),
      ];
    }

    const revolutionPlay =
      reorderableControls[
        revolutionIndex
      ];

    const otherControls =
      reorderableControls.filter(
        (_, index) =>
          index !== revolutionIndex,
      );

    /*
      革命後に強くなる札は革命の後へ。

      例：444・単独3。
      革命前に強いKKK・単独2は前へ置く。
    */
    const beforeRevolution = [];
    const afterRevolution = [];

    otherControls.forEach((play) => {
      if (
        isStrongerAfterRevolution(
          play,
          currentContext,
        )
      ) {
        afterRevolution.push(play);
      } else {
        beforeRevolution.push(play);
      }
    });

    const reversedContext =
      getContextAfterPlay(
        currentContext,
        revolutionPlay,
      );

    return [
      ...fixedControls,
      ...orderByRisk(
        beforeRevolution,
        currentContext,
      ),
      revolutionPlay,
      ...orderByRisk(
        afterRevolution,
        reversedContext,
      ),
    ];
  }

  function normalizePlan(plan) {
    const finalPlay = plan.at(-1);
    const controls = orderControlPlays(
      plan.slice(0, -1),
    );

    return [...controls, finalPlay];
  }

  function comparePlans(a, b) {
    const normalizedA = normalizePlan(a);
    const normalizedB = normalizePlan(b);

    function getContextualRisks(plan) {
      let context = {
        ...ruleContext,
      };

      return plan.map((play) => {
        const risk = getRisk(
          play,
          context,
        );

        context = getContextAfterPlay(
          context,
          play,
        );

        return risk;
      });
    }

    const risksA =
      getContextualRisks(normalizedA);

    const risksB =
      getContextualRisks(normalizedB);

    const finalRiskA = risksA.at(-1);
    const finalRiskB = risksB.at(-1);

    /*
      最も通りにくい組を最後へ残す。
      最後は親なので、弱い55でも問題なく上がれる。
    */
    if (finalRiskA !== finalRiskB) {
      return finalRiskB - finalRiskA;
    }

    const controlsA =
      normalizedA.slice(0, -1);

    const controlsB =
      normalizedB.slice(0, -1);

    for (
      let index = 0;
      index < controlsA.length;
      index += 1
    ) {
      const riskDifference =
        risksB[index] -
        risksA[index];

      if (riskDifference !== 0) {
        return riskDifference;
      }
    }

    return 0;
  }

  /*
    まず「勝負手1組＋最後の1組」を探す。
    見つからない場合だけ2組、3組と増やす。

    これにより、567＋AAAを
    5→6→7→AAAのように細かく崩さない。
  */
  for (
    let maxDepth = 1;
    maxDepth <= MAX_CONTROL_STEPS;
    maxDepth += 1
  ) {
    const plans = [];

    collectPlans(
      hand,
      legalPlays,
      0,
      maxDepth,
      [],
      plans,
      {
        ...ruleContext,
      },
    );

    const rushPlans = plans.filter(
      (plan) => plan.length >= 2,
    );

    if (rushPlans.length > 0) {
      const bestPlan = [...rushPlans]
        .sort(comparePlans)[0];

      return normalizePlan(bestPlan);
    }
  }

  return null;
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

/*
  Jokerを使わず、自然札だけで
  同枚数の上位組を作れるか。

  ペアの実戦的な切り札判定に使う。
*/
function canPossibleNaturalSameRankBeat({
  play,
  remainingNumbers,
  reverse,
}) {
  const requiredCount =
    play.analysis.count;

  const countByStrength = new Map();

  remainingNumbers.forEach((number) => {
    const card = numberToCardData(number);

    if (card.isJoker) {
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

    if (
      (countByStrength.get(strength) ??
        0) >= requiredCount
    ) {
      return true;
    }
  }

  return false;
}

function isPracticalPairControl({
  play,
  knowledge,
  ruleContext,
}) {
  if (
    play.analysis.type !== "pair" ||
    !knowledge
  ) {
    return false;
  }

  const remainingNumbers =
    knowledge
      .remainingOpponentCardNumbers ?? [];

  return !canPossibleNaturalSameRankBeat({
    play,
    remainingNumbers,
    reverse:
      isEffectiveReverse(ruleContext),
  });
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

/*
  通れば親を取り返せると見なす
  3枚の勝負手。

  通常：
    TTT以上 / QKA以上

  革命・11バックによる反転中：
    888以下 / 567以下
*/
function isHighThreeCardControl(
  play,
  ruleContext,
) {
  if (!isThreeCardAttack(play)) {
    return false;
  }

  const reverse =
    isEffectiveReverse(ruleContext);

  if (play.analysis.type === "trio") {
    return reverse
      ? play.analysis.strength <= 8
      : play.analysis.strength >= 10;
  }

  return reverse
    ? play.analysis.strength <= 7
    : play.analysis.strength >= 14;
}

/*
  通常時の2、反転中の3。
  Jokerに返される可能性はあるが、
  上がりラッシュでは勝負手として0組扱いする。
*/
function isHighSingleControl(
  play,
  ruleContext,
) {
  if (
    play.analysis.type !== "single" ||
    containsJoker(play)
  ) {
    return false;
  }

  const reverse =
    isEffectiveReverse(ruleContext);

  return reverse
    ? play.analysis.strength <= 3
    : play.analysis.strength >= 15;
}

/*
  公開情報と自分の手札を除いた残存候補上、
  自然札では返されないシングル。

  例：通常時、4枚の2が全て消えている時のA。
  Jokerは別の特殊札として扱い、ここでは
  自然札による返しだけを調べる。
*/
function isKnowledgeBasedSingleControl({
  play,
  knowledge,
  ruleContext,
}) {
  if (
    play.analysis.type !== "single" ||
    containsJoker(play) ||
    !knowledge
  ) {
    return false;
  }

  const remainingNumbers =
    knowledge
      .remainingOpponentCardNumbers ?? [];

  const reverse =
    isEffectiveReverse(ruleContext);

  return !remainingNumbers.some(
    (number) => {
      const card = numberToCardData(number);

      if (card.isJoker) {
        return false;
      }

      return canStrengthBeat({
        candidateStrength:
          card.strength,
        fieldStrength:
          play.analysis.strength,
        reverse,
      });
    },
  );
}

function isEffectiveZeroGroupPlay({
  play,
  knowledge,
  ruleContext,
  allowSpeculativeThreeCard = true,
}) {
  if (
    play.analysis.type === "single" &&
    containsJoker(play) &&
    isSpadeThreeUnavailableToOpponents(
      knowledge,
    )
  ) {
    /*
      スペ3が相手側に存在しない単独Jokerは、
      確実に親を取れるため0組として数える。
    */
    return true;
  }

  if (isEightCutPlay(play)) {
    return true;
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
    自然札だけでは返せず、
    相手がJokerを切らないと抵抗できないペアは
    実戦上の切り札として0組扱いする。
  */
  if (
    isPracticalPairControl({
      play,
      knowledge,
      ruleContext,
    })
  ) {
    return true;
  }

  if (
    isHighSingleControl(
      play,
      ruleContext,
    )
  ) {
    return true;
  }

  return (
    allowSpeculativeThreeCard &&
    isHighThreeCardControl(
      play,
      ruleContext,
    )
  );
}

function isHardLeadTakingPlay({
  play,
  knowledge,
  ruleContext,
}) {
  if (isEightCutPlay(play)) {
    return true;
  }

  if (
    play.analysis.type === "single" &&
    containsJoker(play)
  ) {
    /*
      スペ3がまだ相手側にある可能性があれば、
      Jokerは親取り札として信用しない。

      スペ3が公開済み、または自分の手札なら
      相手はスペ3返しできない。
    */
    return isSpadeThreeUnavailableToOpponents(
      knowledge,
    );
  }

  if (
    isHighSingleControl(
      play,
      ruleContext,
    )
  ) {
    return true;
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

  return isPracticalPairControl({
    play,
    knowledge,
    ruleContext,
  });
}

function isLowOutletPlayToPreserve({
  play,
  ruleContext,
}) {
  if (isEightCutPlay(play)) {
    return false;
  }

  const reverse =
    isEffectiveReverse(ruleContext);

  /*
    通常時の単独3は、
    親を取り返した後に出すため温存する。
  */
  if (
    !reverse &&
    isSingleRank(play, 3)
  ) {
    return true;
  }

  /*
    階段は崩れると処理しにくいため、
    親取り札がある間は残す。
  */
  if (play.analysis.type === "straight") {
    return true;
  }

  /*
    低いトリオも親を取った後の
    出口として残す。
  */
  if (play.analysis.type === "trio") {
    return reverse
      ? play.analysis.strength >= 9
      : play.analysis.strength <= 11;
  }

  return false;
}

function createEffectiveGroupEvaluator({
  hand,
  allValidPlays,
  knowledge,
  ruleContext,
}) {
  const indexByCardId = new Map(
    hand.map((card, index) => [
      card.id,
      index,
    ]),
  );

  const playsWithMask =
    allValidPlays.map((play) => ({
      play,
      mask: play.cardIds.reduce(
        (mask, cardId) =>
          mask |
          (1 <<
            indexByCardId.get(cardId)),
        0,
      ),
    }));

  const memo = new Map([[0, 0]]);

  function getPlayCost(play) {
    return isEffectiveZeroGroupPlay({
      play,
      knowledge,
      ruleContext,
      /*
        TTT以上・QKA以上は、
        上がりラッシュ専用の勝負手。

        通常の手札整理では0組にせず、
        謎吐きを防止する。
      */
      allowSpeculativeThreeCard: false,
    })
      ? 0
      : 1;
  }

  function getMinimumCost(mask) {
    if (memo.has(mask)) {
      return memo.get(mask);
    }

    const firstBit = mask & -mask;
    let minimum = Number.POSITIVE_INFINITY;

    playsWithMask.forEach(
      ({ play, mask: playMask }) => {
        if (
          (playMask & firstBit) === 0 ||
          (playMask & mask) !== playMask
        ) {
          return;
        }

        /*
          Jokerを含む組を最後に出すと
          禁止上がりになるため、
          最終1組としては採用しない。
        */
        if (
          playMask === mask &&
          containsJoker(play)
        ) {
          return;
        }

        const candidateCost =
          getPlayCost(play) +
          getMinimumCost(
            mask ^ playMask,
          );

        minimum = Math.min(
          minimum,
          candidateCost,
        );
      },
    );

    memo.set(mask, minimum);
    return minimum;
  }

  return {
    fullMask:
      (1 << hand.length) - 1,
    getMinimumCost,
    getPlayCost,
    getPlayMask(play) {
      return play.cardIds.reduce(
        (mask, cardId) =>
          mask |
          (1 <<
            indexByCardId.get(cardId)),
        0,
      );
    },
  };
}

function chooseByEffectiveGroupCount({
  hand,
  allValidPlays,
  legalPlays,
  knowledge,
  ruleContext,
  handIndexMap,
}) {
  if (legalPlays.length === 0) {
    return null;
  }

  const evaluator =
    createEffectiveGroupEvaluator({
      hand,
      allValidPlays,
      knowledge,
      ruleContext,
    });

  const reverse =
    isEffectiveReverse(ruleContext);

  return [...legalPlays]
    .map((play) => {
      const playMask =
        evaluator.getPlayMask(play);

      const remainingMask =
        evaluator.fullMask ^ playMask;

      return {
        play,
        playCost:
          evaluator.getPlayCost(play),
        effectiveGroupCount:
          evaluator.getPlayCost(play) +
          evaluator.getMinimumCost(
            remainingMask,
          ),
        firstHandIndex: Math.min(
          ...play.cards.map(
            (card) =>
              handIndexMap.get(card.id) ??
              99,
          ),
        ),
      };
    })
    .sort((a, b) => {
      if (
        a.effectiveGroupCount !==
        b.effectiveGroupCount
      ) {
        return (
          a.effectiveGroupCount -
          b.effectiveGroupCount
        );
      }

      if (
        a.playCost !== b.playCost
      ) {
        /*
          同じ実質組数なら、
          0組の制圧札を温存する。
        */
        return (
          b.playCost - a.playCost
        );
      }

      if (
        a.play.cards.length !==
        b.play.cards.length
      ) {
        /*
          同点なら従来どおり
          シングル寄りに処理する。
        */
        return (
          a.play.cards.length -
          b.play.cards.length
        );
      }

      if (
        a.play.analysis.strength !==
        b.play.analysis.strength
      ) {
        const difference =
          a.play.analysis.strength -
          b.play.analysis.strength;

        return reverse
          ? -difference
          : difference;
      }

      return (
        a.firstHandIndex -
        b.firstHandIndex
      );
    })[0]?.play ?? null;
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

  if (
    ruleContext.elevenBack &&
    !ruleContext.revolution
  ) {
    const elevenBackThree =
      chooseElevenBackThreePlay(
        legalPlays,
      );

    if (elevenBackThree) {
      return elevenBackThree;
    }
  }

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

  const unrestrictedOrdinaryPlays =
    jokerFreePlays.length > 0
      ? jokerFreePlays
      : hand.length === 1
        ? legalPlays
        : [];

  /*
    通常時の22は強力な親取り札なので、
    バラバラの手札から安易に消費しない。

    ・通常思考では他の札を処理する
    ・22しか手札に残っていなければ出せる
    ・上がりラッシュ／確定上がりはこの処理より
      先に判定されるため、必要なら使用できる
    ・革命／11バックによる反転中は温存しない
  */
  const shouldPreserveDeucePair =
    !reverse &&
    hand.length > 2;

  const ordinaryPlays =
    shouldPreserveDeucePair
      ? unrestrictedOrdinaryPlays.filter(
          (play) =>
            !isNaturalDeucePair(play),
        )
      : unrestrictedOrdinaryPlays;

  const hasLeadTakingPlay =
    allValidPlays.some((play) =>
      isHardLeadTakingPlay({
        play,
        knowledge,
        ruleContext,
      }),
    );

  const hasNormalControlAnchor =
    !reverse &&
    hand.some(
      (card) =>
        !isJoker(card) &&
        (
          card.rank === 8 ||
          card.rank === 2
        ),
    );

  let strategicOrdinaryPlays =
    ordinaryPlays;

  if (isFieldEmpty(fieldPlay)) {
    if (
      !ruleContext.revolution &&
      !ruleContext.elevenBack
    ) {
      const strategicRevolution =
        chooseStrategicRevolutionLead({
          hand,
          legalPlays:
            unrestrictedOrdinaryPlays,
          handIndexMap,
        });

      if (strategicRevolution) {
        return strategicRevolution;
      }
    }

    /*
      上がりラッシュがない通常の親番では、
      Jokerを除いた手札全体を役割へ分割して
      明示した処理順で出す。
    */
    const roleBasedLead =
      chooseRoleBasedLead({
        hand,
        allValidPlays,
        legalPlays: ordinaryPlays,
        ruleContext,
        handIndexMap,
      });

    if (roleBasedLead) {
      return roleBasedLead;
    }

    if (!hasLeadTakingPlay) {
      /*
        親を取り返す札がない時は、
        待っても処理機会を作れない。

        そのため階段を親番で即処理する。
      */
      const straightPlays =
        ordinaryPlays.filter(
          (play) =>
            play.analysis.type ===
            "straight",
        );

      const earlyStraight =
        chooseByEffectiveGroupCount({
          hand,
          allValidPlays,
          legalPlays: straightPlays,
          knowledge,
          ruleContext,
          handIndexMap,
        });

      if (earlyStraight) {
        return earlyStraight;
      }

      /*
        階段がなければ単独3を早めに処理する。
      */
      const earlyThree =
        ordinaryPlays.find(
          (play) =>
            isSingleRank(play, 3),
        ) ?? null;

      if (earlyThree) {
        return earlyThree;
      }

      /*
        J以下の低い3枚組も、
        親取り札がなければ早めに勝負する。
      */
      const lowThreeCardPlays =
        ordinaryPlays.filter(
          (play) =>
            isThreeCardAttack(play) &&
            (
              reverse
                ? play.analysis.strength >=
                  7
                : play.analysis.strength <=
                  11
            ),
        );

      const earlyThreeCard =
        chooseByHandOrder({
          plays: lowThreeCardPlays,
          handIndexMap,
          reverse,
        });

      if (earlyThreeCard) {
        return earlyThreeCard;
      }

      /*
        親取り札がない時の第二方針。

        J以下の自然なペア・トリオを
        単品へ崩さず組のまま処理し、
        Q以上中心の手札へ固めていく。
      */
      const lowNaturalMeldPlays =
        ordinaryPlays.filter(
          (play) =>
            play.cards.length >= 2 &&
            play.analysis.type !==
              "straight" &&
            !containsJoker(play) &&
            play.cards.every(
              (card) =>
                reverse
                  ? getCardStrength(card) >=
                    7
                  : getCardStrength(card) <=
                    11,
            ),
        );

      const earlyLowMeld =
        chooseByEffectiveGroupCount({
          hand,
          allValidPlays,
          legalPlays:
            lowNaturalMeldPlays,
          knowledge,
          ruleContext,
          handIndexMap,
        });

      if (earlyLowMeld) {
        return earlyLowMeld;
      }

      /*
        組になっていないJ以下の単品も
        弱い順に処理する。
      */
      const lowDisposableSingles =
        ordinaryPlays.filter(
          (play) =>
            play.analysis.type ===
              "single" &&
            !containsJoker(play) &&
            (
              reverse
                ? play.analysis.strength >=
                  7
                : play.analysis.strength <=
                  11
            ) &&
            disposableSingleIds.has(
              play.cards[0].id,
            ),
        );

      const earlyLowSingle =
        chooseByHandOrder({
          plays: lowDisposableSingles,
          handIndexMap,
          reverse,
        });

      if (earlyLowSingle) {
        return earlyLowSingle;
      }
    } else {
      /*
        親取り札がある時は、
        3・階段・低いトリオを
        親を取り返した後の出口として温存する。
      */
      const withoutOutlets =
        ordinaryPlays.filter(
          (play) =>
            !isLowOutletPlayToPreserve({
              play,
              ruleContext,
            }),
        );

      if (withoutOutlets.length > 0) {
        strategicOrdinaryPlays =
          withoutOutlets;
      }
    }
  }

  const effectiveGroupPlay =
    chooseByEffectiveGroupCount({
      hand,
      allValidPlays,
      legalPlays:
        strategicOrdinaryPlays,
      knowledge,
      ruleContext,
      handIndexMap,
    });

  if (effectiveGroupPlay) {
    return effectiveGroupPlay;
  }

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
    getProtectedMeldCardIds({
      hand,
      allValidPlays,
      ruleContext,
    });

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
      !hasNormalControlAnchor &&
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
          (
            !protectedMeldCardIds.has(
              play.cards[0].id,
            ) ||
            /*
              組を崩すのは、その1枚で
              親を確保できる場合だけ。

              ハイトリオも無条件では崩さない。
            */
            canBreakProtectedMeldAsSingle({
              play,
              hand,
              fieldPlay,
              knowledge,
              ruleContext,
            })
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
            (
              isHighGroupPlay(
                play,
                ruleContext,
              ) ||
              isEffectiveZeroGroupPlay({
                play,
                knowledge,
                ruleContext,
                allowSpeculativeThreeCard:
                  false,
              })
            ),
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
