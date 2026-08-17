import {
  analyzePlay,
  canBeatPlay,
  getAllValidPlays,
  getPlayEffects,
  getSingleNaturalStrength,
  getSingleNaturalSuit,
  isSingleJoker,
  isSpadeThree,
} from "./presidentRules";

const SUITS = [
  "spades",
  "hearts",
  "diamonds",
  "clubs",
];

const SEARCH_TIME_LIMIT_MS = 180;
const SEARCH_NODE_LIMIT = 150_000;

const WIN = 1;
const LOSE = -1;
const UNKNOWN = 0;

function isJoker(card) {
  return Boolean(
    card?.isJoker ||
    card?.suit === "joker",
  );
}

function cardToNumber(card) {
  if (isJoker(card)) {
    return 0;
  }

  const suitIndex =
    SUITS.indexOf(card.suit);

  return suitIndex * 13 + card.rank;
}

function numberToCard(number) {
  if (number === 0) {
    return {
      id: "heads-up-joker",
      suit: "joker",
      rank: 16,
      isJoker: true,
    };
  }

  const zeroBased = number - 1;
  const suit =
    SUITS[Math.floor(zeroBased / 13)];
  const rank =
    (zeroBased % 13) + 1;

  return {
    id: `heads-up-${number}`,
    suit,
    rank,
    isJoker: false,
  };
}

function containsJoker(cards) {
  return cards.some(isJoker);
}

function resetTemporaryRules(context) {
  return {
    ...context,
    elevenBack: false,
    lockedSuit: null,
    gekiShibari: false,
    singleStrengthHistory: [],
    fieldCards: [],
  };
}

function getStateKey(state) {
  const own = state.hands[0]
    .map(cardToNumber)
    .sort((a, b) => a - b)
    .join(",");

  const opponent = state.hands[1]
    .map(cardToNumber)
    .sort((a, b) => a - b)
    .join(",");

  const field = state.fieldCards
    .map(cardToNumber)
    .sort((a, b) => a - b)
    .join(",");

  return [
    own,
    opponent,
    state.turn,
    state.lastPlayer ?? "-",
    field,
    Number(state.context.revolution),
    Number(state.context.elevenBack),
    state.context.lockedSuit ?? "-",
    Number(state.context.gekiShibari),
    (state.context.singleStrengthHistory ?? [])
      .join(","),
  ].join("|");
}

function createNextContextAfterPlay({
  context,
  previousFieldCards,
  cards,
  analysis,
}) {
  const effects =
    getPlayEffects(cards, analysis);

  let nextContext = {
    ...context,
    revolution: effects.revolution
      ? !context.revolution
      : context.revolution,
    fieldCards: cards,
  };

  if (
    analysis.type === "single" &&
    !isSingleJoker(cards)
  ) {
    const candidateSuit =
      getSingleNaturalSuit(cards);
    const candidateStrength =
      getSingleNaturalStrength(cards);
    const previousSuit =
      getSingleNaturalSuit(
        previousFieldCards,
      );
    const previousStrength =
      getSingleNaturalStrength(
        previousFieldCards,
      );

    const sameSuit =
      candidateSuit &&
      previousSuit &&
      candidateSuit === previousSuit;

    const consecutive =
      previousStrength !== null &&
      candidateStrength !== null &&
      Math.abs(
        candidateStrength -
          previousStrength,
      ) === 1;

    if (
      sameSuit &&
      consecutive &&
      !context.gekiShibari
    ) {
      nextContext = {
        ...nextContext,
        lockedSuit: candidateSuit,
        gekiShibari: true,
      };
    } else if (
      sameSuit &&
      !context.lockedSuit
    ) {
      nextContext = {
        ...nextContext,
        lockedSuit: candidateSuit,
      };
    }

    nextContext = {
      ...nextContext,
      singleStrengthHistory: [
        ...(context
          .singleStrengthHistory ?? []),
        candidateStrength,
      ],
    };
  }

  if (
    effects.elevenBack &&
    !context.elevenBack
  ) {
    nextContext = {
      ...nextContext,
      elevenBack: true,
    };
  }

  return {
    context: nextContext,
    effects,
  };
}

function getLegalPlays(state) {
  const hand = state.hands[state.turn];
  const fieldPlay = analyzePlay(
    state.fieldCards,
    state.context,
  );

  return getAllValidPlays(
    hand,
    state.context,
  ).filter((play) =>
    canBeatPlay(
      play.analysis,
      fieldPlay,
      {
        ...state.context,
        candidateCards: play.cards,
        fieldCards: state.fieldCards,
      },
    ),
  );
}

function orderPlays(plays) {
  return [...plays].sort((a, b) => {
    const aEffects =
      getPlayEffects(
        a.cards,
        a.analysis,
      );
    const bEffects =
      getPlayEffects(
        b.cards,
        b.analysis,
      );

    const aControl =
      Number(aEffects.eightCut) * 10 +
      Number(a.cards.length >= 4) * 5;
    const bControl =
      Number(bEffects.eightCut) * 10 +
      Number(b.cards.length >= 4) * 5;

    if (aControl !== bControl) {
      return bControl - aControl;
    }

    if (a.cards.length !== b.cards.length) {
      return b.cards.length - a.cards.length;
    }

    return (
      b.analysis.strength -
      a.analysis.strength
    );
  });
}

function playState(state, play) {
  const actor = state.turn;
  const playedIds = new Set(
    play.cardIds,
  );
  const nextHand = state.hands[actor]
    .filter(
      (card) =>
        !playedIds.has(card.id),
    );

  /*
    Jokerを含む禁止上がりは、
    2人勝負ではそのプレイヤーの敗北。
  */
  if (nextHand.length === 0) {
    if (containsJoker(play.cards)) {
      return {
        terminal:
          actor === 0 ? LOSE : WIN,
      };
    }

    return {
      terminal:
        actor === 0 ? WIN : LOSE,
    };
  }

  const nextHands = [
    [...state.hands[0]],
    [...state.hands[1]],
  ];
  nextHands[actor] = nextHand;

  const spadeThreeReturn =
    isSingleJoker(state.fieldCards) &&
    isSpadeThree(play.cards);

  const { context, effects } =
    createNextContextAfterPlay({
      context: state.context,
      previousFieldCards:
        state.fieldCards,
      cards: play.cards,
      analysis: play.analysis,
    });

  if (
    spadeThreeReturn ||
    effects.eightCut
  ) {
    return {
      terminal: null,
      state: {
        hands: nextHands,
        turn: actor,
        lastPlayer: null,
        fieldCards: [],
        context:
          resetTemporaryRules(context),
      },
    };
  }

  return {
    terminal: null,
    state: {
      hands: nextHands,
      turn: 1 - actor,
      lastPlayer: actor,
      fieldCards: play.cards,
      context,
    },
  };
}

function passState(state) {
  return {
    hands: state.hands,
    turn: state.lastPlayer,
    lastPlayer: null,
    fieldCards: [],
    context:
      resetTemporaryRules(
        state.context,
      ),
  };
}

export function chooseHeadsUpPerfectPlay({
  ownHand,
  opponentCardNumbers,
  opponentCardCount,
  fieldCards,
  ruleContext,
}) {
  if (
    !Array.isArray(
      opponentCardNumbers,
    ) ||
    opponentCardNumbers.length !==
      opponentCardCount
  ) {
    return null;
  }

  const opponentHand =
    opponentCardNumbers.map(
      numberToCard,
    );

  const initialState = {
    hands: [ownHand, opponentHand],
    turn: 0,
    lastPlayer:
      fieldCards.length > 0
        ? 1
        : null,
    fieldCards,
    context: {
      ...ruleContext,
      fieldCards,
    },
  };

  const memo = new Map();
  const deadline =
    performance.now() +
    SEARCH_TIME_LIMIT_MS;
  let visitedNodes = 0;

  function solve(state) {
    visitedNodes += 1;

    if (
      visitedNodes > SEARCH_NODE_LIMIT ||
      performance.now() > deadline
    ) {
      return UNKNOWN;
    }

    const key = getStateKey(state);

    if (memo.has(key)) {
      return memo.get(key);
    }

    const plays = orderPlays(
      getLegalPlays(state),
    );

    const actions = plays.map(
      (play) => ({
        type: "play",
        play,
      }),
    );

    if (state.fieldCards.length > 0) {
      actions.push({ type: "pass" });
    }

    let sawUnknown = false;

    if (state.turn === 0) {
      for (const action of actions) {
        const result =
          action.type === "pass"
            ? {
                terminal: null,
                state: passState(state),
              }
            : playState(
                state,
                action.play,
              );

        const outcome =
          result.terminal ??
          solve(result.state);

        if (outcome === WIN) {
          memo.set(key, WIN);
          return WIN;
        }

        if (outcome === UNKNOWN) {
          sawUnknown = true;
        }
      }

      const outcome = sawUnknown
        ? UNKNOWN
        : LOSE;
      memo.set(key, outcome);
      return outcome;
    }

    for (const action of actions) {
      const result =
        action.type === "pass"
          ? {
              terminal: null,
              state: passState(state),
            }
          : playState(
              state,
              action.play,
            );

      const outcome =
        result.terminal ??
        solve(result.state);

      if (outcome === LOSE) {
        memo.set(key, LOSE);
        return LOSE;
      }

      if (outcome === UNKNOWN) {
        sawUnknown = true;
      }
    }

    const outcome = sawUnknown
      ? UNKNOWN
      : WIN;
    memo.set(key, outcome);
    return outcome;
  }

  const rootPlays = orderPlays(
    getLegalPlays(initialState),
  );

  const rootActions = rootPlays.map(
    (play) => ({ type: "play", play }),
  );

  if (fieldCards.length > 0) {
    rootActions.push({ type: "pass" });
  }

  for (const action of rootActions) {
    const result =
      action.type === "pass"
        ? {
            terminal: null,
            state:
              passState(initialState),
          }
        : playState(
            initialState,
            action.play,
          );

    const outcome =
      result.terminal ??
      solve(result.state);

    if (outcome === WIN) {
      return action;
    }
  }

  return null;
}
