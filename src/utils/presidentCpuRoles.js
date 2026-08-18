/*
  CPUが通常時に使う「手札の役割分割」。

  ・Jokerは通常分割へ入れない
  ・全ての自然な組み合わせを比較する
  ・ローシークエンスで複数のポケットを崩さない
  ・ミドル以上のシークエンスはポケットより優先する

  上がりラッシュはpresidentCpuStrategy.js側で先に判定されるため、
  このファイルは主に親番での通常処理順を決める。
*/

function isJoker(card) {
  return Boolean(
    card?.isJoker ||
    card?.suit === "joker",
  );
}

function getEffectiveStrength(
  strength,
  reverse,
) {
  return reverse
    ? 18 - strength
    : strength;
}

function getStraightBounds(play) {
  const options =
    play.analysis.straightOptions ?? [];

  if (options.length > 0) {
    return {
      start: Math.min(
        ...options.map(
          (option) => option.startStrength,
        ),
      ),
      end: Math.max(
        ...options.map(
          (option) => option.endStrength,
        ),
      ),
    };
  }

  return {
    start:
      play.analysis.strength -
      play.cards.length + 1,
    end: play.analysis.strength,
  };
}

function getRole(play, reverse) {
  const { type } = play.analysis;
  const strength = getEffectiveStrength(
    play.analysis.strength,
    reverse,
  );

  if (play.cards.length >= 4) {
    return "revolution";
  }

  if (type === "straight") {
    const bounds = getStraightBounds(play);

    /*
      革命／11バック中は並びの低い側が
      実質的な最高値になる。
    */
    const endStrength = reverse
      ? getEffectiveStrength(
          bounds.start,
          true,
        )
      : bounds.end;

    if (endStrength <= 7) {
      return "lowSequence";
    }

    if (
      play.cards.some(
        (card) => !isJoker(card) && card.rank === 8,
      )
    ) {
      return "eightSequence";
    }

    if (endStrength <= 13) {
      return "jackSequence";
    }

    return "highSequence";
  }

  const suffixByType = {
    single: "Single",
    pair: "Pocket",
    trio: "Set",
  };

  const suffix = suffixByType[type];

  if (!suffix) {
    return "other";
  }

  if (strength === 3) {
    return `three${suffix}`;
  }

  if (strength >= 4 && strength <= 7) {
    return `low${suffix}`;
  }

  if (
    play.cards.some(
      (card) => !isJoker(card) && card.rank === 8,
    )
  ) {
    return `eight${suffix}`;
  }

  if (strength >= 9 && strength <= 10) {
    return `middle${suffix}`;
  }

  if (strength === 11) {
    return `jack${suffix}`;
  }

  if (strength >= 12 && strength <= 14) {
    return `high${suffix}`;
  }

  return `deuce${suffix}`;
}

/*
  分割案そのものの品質。

  ローシークエンスは低評価にして、
  ポケット2組以上を壊す分割を自然に負けさせる。

  エイト／ジャック／ハイシークエンスは、
  ポケットを崩してでも残す価値があるため高評価にする。
*/
const PARTITION_VALUE = {
  single: 0,
  pocket: 12,
  set: 18,

  lowSequence: 10,
  eightSequence: 46,
  jackSequence: 48,
  highSequence: 52,

  revolution: 58,
};

function getPartitionValue(play, role) {
  if (role === "lowSequence") {
    return PARTITION_VALUE.lowSequence;
  }

  if (role === "eightSequence") {
    return PARTITION_VALUE.eightSequence;
  }

  if (role === "jackSequence") {
    return PARTITION_VALUE.jackSequence;
  }

  if (role === "highSequence") {
    return PARTITION_VALUE.highSequence;
  }

  if (role === "revolution") {
    return PARTITION_VALUE.revolution;
  }

  if (play.analysis.type === "pair") {
    return PARTITION_VALUE.pocket;
  }

  if (play.analysis.type === "trio") {
    return PARTITION_VALUE.set;
  }

  return PARTITION_VALUE.single;
}

function getRolePriority({
  role,
  hasControlAnchor,
  elevenBack,
}) {
  /*
    11バック中は単独3を最優先。
  */
  if (elevenBack && role === "threeSingle") {
    return 0;
  }

  const common = {
    lowSingle: 10,
    middleSingle: 20,
    jackSingle: 30,
  };

  if (role in common) {
    return common[role];
  }

  if (hasControlAnchor) {
    const withControl = {
      lowPocket: 40,
      threePocket: 41,
      middlePocket: 50,

      lowSequence: 61,
      lowSet: 62,

      jackPocket: 70,
      highSingle: 80,
      jackSet: 90,
      highPocket: 100,

      /*
        2・8などの親取り札がある時は、
        単独3を先に切らず終盤まで残す。
      */
      threeSingle: 106,

      jackSequence: 108,
      middleSet: 110,
      highSet: 112,
      eightSequence: 114,
      highSequence: 116,
      revolution: 118,

      eightSingle: 120,
      eightPocket: 121,
      eightSet: 122,
      deuceSingle: 130,
      deucePocket: 131,
      deuceSet: 132,
    };

    return withControl[role] ?? 999;
  }

  const withoutControl = {
    lowSequence: 40,
    lowSet: 50,
    threeSingle: 60,
    threePocket: 61,

    lowPocket: 65,
    middlePocket: 66,

    jackPocket: 70,
    highSingle: 80,
    jackSet: 90,
    highPocket: 100,

    jackSequence: 108,
    middleSet: 110,
    highSet: 112,
    eightSequence: 114,
    highSequence: 116,
    revolution: 118,

    eightSingle: 120,
    eightPocket: 121,
    eightSet: 122,
    deuceSingle: 130,
    deucePocket: 131,
    deuceSet: 132,
  };

  return withoutControl[role] ?? 999;
}

function getFirstHandIndex(
  play,
  handIndexMap,
) {
  return Math.min(
    ...play.cards.map(
      (card) =>
        handIndexMap.get(card.id) ?? 99,
    ),
  );
}

/*
  イレブンバック中の単独札専用順位。

  3を最優先に処理し、その後は
  4 → 5 → 6 → … → 10の順。

  組として分割された札には適用しない。
*/
function getElevenBackSinglePriority(play) {
  if (
    play.analysis.type !== "single" ||
    play.cards.some(isJoker)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const rank = play.cards[0].rank;

  if (rank === 3) {
    return 0;
  }

  if (rank >= 4 && rank <= 10) {
    return rank - 2;
  }

  return Number.POSITIVE_INFINITY;
}

/*
  革命中は2が最弱札になるため、
  親番では2の自然な組を最優先で処理する。

  2222は革命を元へ戻してしまうので、
  この単純な処理優先には含めない。
*/
function isRevolutionDeuceOutlet(play) {
  return (
    play.cards.length >= 1 &&
    play.cards.length <= 3 &&
    !play.cards.some(isJoker) &&
    play.cards.every(
      (card) => card.rank === 2,
    )
  );
}

function buildBestNaturalPartition({
  hand,
  allValidPlays,
  reverse,
}) {
  const naturalCards = hand.filter(
    (card) => !isJoker(card),
  );

  if (naturalCards.length === 0) {
    return [];
  }

  const indexByCardId = new Map(
    naturalCards.map((card, index) => [
      card.id,
      index,
    ]),
  );

  const candidates = allValidPlays
    .filter(
      (play) =>
        !play.cards.some(isJoker) &&
        play.cards.every((card) =>
          indexByCardId.has(card.id),
        ),
    )
    .map((play) => {
      const role = getRole(play, reverse);

      return {
        play,
        role,
        mask: play.cards.reduce(
          (mask, card) =>
            mask |
            (1 << indexByCardId.get(card.id)),
          0,
        ),
        value: getPartitionValue(play, role),
      };
    });

  const memo = new Map();

  function search(mask) {
    if (mask === 0) {
      return {
        value: 0,
        groupCount: 0,
        groups: [],
      };
    }

    if (memo.has(mask)) {
      return memo.get(mask);
    }

    const firstBit = mask & -mask;
    let best = null;

    candidates.forEach((candidate) => {
      if (
        (candidate.mask & firstBit) === 0 ||
        (candidate.mask & mask) !== candidate.mask
      ) {
        return;
      }

      const remainder = search(
        mask ^ candidate.mask,
      );

      const result = {
        value:
          candidate.value + remainder.value,
        groupCount:
          1 + remainder.groupCount,
        groups: [
          candidate,
          ...remainder.groups,
        ],
      };

      if (
        !best ||
        result.value > best.value ||
        (
          result.value === best.value &&
          result.groupCount < best.groupCount
        )
      ) {
        best = result;
      }
    });

    memo.set(mask, best);
    return best;
  }

  const fullMask =
    (1 << naturalCards.length) - 1;

  return search(fullMask)?.groups ?? [];
}

export function chooseRoleBasedLead({
  hand,
  allValidPlays,
  legalPlays,
  ruleContext,
  handIndexMap,
}) {
  const reverse =
    Boolean(ruleContext.revolution) !==
    Boolean(ruleContext.elevenBack);

  const partition =
    buildBestNaturalPartition({
      hand,
      allValidPlays,
      reverse,
    });

  if (partition.length === 0) {
    return null;
  }

  const legalIds = new Set(
    legalPlays.map((play) =>
      [...play.cardIds].sort().join("|"),
    ),
  );

  const legalGroups = partition.filter(
    ({ play }) =>
      legalIds.has(
        [...play.cardIds].sort().join("|"),
      ),
  );

  if (legalGroups.length === 0) {
    return null;
  }

  const controlRank = reverse ? 3 : 2;
  const hasControlAnchor = hand.some(
    (card) =>
      !isJoker(card) &&
      (card.rank === 8 ||
        card.rank === controlRank),
  );

  return [...legalGroups]
    .sort((a, b) => {
      if (
        ruleContext.revolution &&
        !ruleContext.elevenBack
      ) {
        const aRevolutionDeuce =
          isRevolutionDeuceOutlet(
            a.play,
          );

        const bRevolutionDeuce =
          isRevolutionDeuceOutlet(
            b.play,
          );

        if (
          aRevolutionDeuce !==
          bRevolutionDeuce
        ) {
          return aRevolutionDeuce
            ? -1
            : 1;
        }
      }

      if (ruleContext.elevenBack) {
        const aElevenBackPriority =
          getElevenBackSinglePriority(
            a.play,
          );

        const bElevenBackPriority =
          getElevenBackSinglePriority(
            b.play,
          );

        if (
          aElevenBackPriority !==
          bElevenBackPriority
        ) {
          return (
            aElevenBackPriority -
            bElevenBackPriority
          );
        }

        /*
          同じ3ならスペ3を最後に残す。
        */
        if (
          a.play.analysis.type === "single" &&
          b.play.analysis.type === "single" &&
          a.play.cards[0].rank === 3 &&
          b.play.cards[0].rank === 3
        ) {
          const aSpade =
            a.play.cards[0].suit === "spades";
          const bSpade =
            b.play.cards[0].suit === "spades";

          if (aSpade !== bSpade) {
            return aSpade ? 1 : -1;
          }
        }
      }

      const aPriority = getRolePriority({
        role: a.role,
        hasControlAnchor,
        elevenBack:
          Boolean(ruleContext.elevenBack),
      });

      const bPriority = getRolePriority({
        role: b.role,
        hasControlAnchor,
        elevenBack:
          Boolean(ruleContext.elevenBack),
      });

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      /*
        スペ3は他の3より後まで残す。
        card number上の判定に依存せず、
        suit名で直接比較する。
      */
      if (a.role === "threeSingle") {
        const aSpade =
          a.play.cards[0].suit === "spades";
        const bSpade =
          b.play.cards[0].suit === "spades";

        if (aSpade !== bSpade) {
          return aSpade ? 1 : -1;
        }
      }

      const strengthDifference =
        a.play.analysis.strength -
        b.play.analysis.strength;

      if (strengthDifference !== 0) {
        return reverse
          ? -strengthDifference
          : strengthDifference;
      }

      return (
        getFirstHandIndex(
          a.play,
          handIndexMap,
        ) -
        getFirstHandIndex(
          b.play,
          handIndexMap,
        )
      );
    })[0]?.play ?? null;
}

export function getCpuHandRoles({
  hand,
  allValidPlays,
  ruleContext,
}) {
  const reverse =
    Boolean(ruleContext.revolution) !==
    Boolean(ruleContext.elevenBack);

  return buildBestNaturalPartition({
    hand,
    allValidPlays,
    reverse,
  }).map(({ play, role }) => ({
    role,
    cardIds: [...play.cardIds],
  }));
}
