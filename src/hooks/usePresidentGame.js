import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createGameHands,
} from "../utils/presidentDeck";

import {
  analyzePlay,
  canBeatPlay,
  getAllValidPlays,
  getPlayableCardIds,
} from "../utils/presidentRules";

const PLAYER_COUNT = 4;

const CPU_THINK_TIME = 700;

/*
  手札が残っているプレイヤー。
*/
function getActivePlayerIndexes(
  hands,
) {
  return hands
    .map(
      (hand, index) => ({
        index,
        cardCount:
          hand.length,
      }),
    )
    .filter(
      (player) =>
        player.cardCount > 0,
    )
    .map(
      (player) =>
        player.index,
    );
}

/*
  現在のプレイヤーの
  次に残っている人を探す。

  上がった人は自動的に飛ばす。
*/
function getNextActivePlayerIndex(
  hands,
  currentPlayerIndex,
) {
  for (
    let offset = 1;
    offset <= PLAYER_COUNT;
    offset += 1
  ) {
    const nextIndex =
      (
        currentPlayerIndex +
        offset
      ) %
      PLAYER_COUNT;

    if (
      hands[nextIndex]
        .length > 0
    ) {
      return nextIndex;
    }
  }

  return null;
}

/*
  場を流すために必要な
  パス人数を計算。

  最後にカードを出した人が
  まだゲーム中なら、
  その人以外が全員パスすれば流れる。

  最後にカードを出した人が
  そのカードで上がった場合は、
  残っている全員がパスすれば流れる。
*/
function getRequiredPassCount(
  hands,
  lastPlayPlayerIndex,
) {
  const activePlayers =
    getActivePlayerIndexes(
      hands,
    );

  if (
    lastPlayPlayerIndex ===
    null
  ) {
    return 0;
  }

  const lastPlayerIsActive =
    hands[
      lastPlayPlayerIndex
    ].length > 0;

  if (
    lastPlayerIsActive
  ) {
    return Math.max(
      activePlayers.length - 1,
      0,
    );
  }

  return activePlayers.length;
}

/*
  場が流れた後、
  誰から始めるか。

  最後に出した人がまだ残っていれば
  その人。

  そのカードで上がっていた場合は
  次の生存プレイヤー。
*/
function getLeaderAfterClear(
  hands,
  lastPlayPlayerIndex,
) {
  if (
    lastPlayPlayerIndex ===
    null
  ) {
    return null;
  }

  if (
    hands[
      lastPlayPlayerIndex
    ].length > 0
  ) {
    return lastPlayPlayerIndex;
  }

  return getNextActivePlayerIndex(
    hands,
    lastPlayPlayerIndex,
  );
}

export default function usePresidentGame() {
  const [
    hands,
    setHands,
  ] = useState(
    createGameHands,
  );

  /*
    0 = 黒部ナノカ
    1 = 桜羽エマ
    2 = 橘シェリー
    3 = 遠野ハンナ
  */
  const [
    currentPlayerIndex,
    setCurrentPlayerIndex,
  ] = useState(0);

  const [
    selectedCardIds,
    setSelectedCardIds,
  ] = useState([]);

  const [
    playedCards,
    setPlayedCards,
  ] = useState([]);

  const [
    lastPlayPlayerIndex,
    setLastPlayPlayerIndex,
  ] = useState(null);

  const [
    consecutivePasses,
    setConsecutivePasses,
  ] = useState(0);

  /*
    上がった順番。

    例：
    [2, 0, 3, 1]

    なら

    1位 シェリー
    2位 ナノカ
    3位 ハンナ
    4位 エマ
  */
  const [
    finishOrder,
    setFinishOrder,
  ] = useState([]);

  const hand =
    hands[0];

  /*
    現在ゲームに残っている人。
  */
  const activePlayerIndexes =
    useMemo(
      () =>
        getActivePlayerIndexes(
          hands,
        ),
      [
        hands,
      ],
    );

  /*
    残り1人になった時点で
    順位はすべて確定。
  */
  const isRoundFinished =
    activePlayerIndexes.length <=
    1;

  /*
    誰かの手札が0枚になったら
    上がり順へ追加する。

    3人上がって残り1人になったら、
    その最後の1人も自動的に
    4位として追加する。
  */
  useEffect(
    () => {
      setFinishOrder(
        (current) => {
          const next = [
            ...current,
          ];

          /*
            新しく0枚になった人。
          */
          for (
            let playerIndex = 0;
            playerIndex <
            PLAYER_COUNT;
            playerIndex += 1
          ) {
            if (
              hands[
                playerIndex
              ].length !== 0
            ) {
              continue;
            }

            if (
              next.includes(
                playerIndex,
              )
            ) {
              continue;
            }

            next.push(
              playerIndex,
            );
          }

          /*
            3人が上がったら、
            残った1人を4位にする。
          */
          const activePlayers =
            getActivePlayerIndexes(
              hands,
            );

          if (
            activePlayers.length ===
              1 &&
            next.length === 3
          ) {
            const lastPlayer =
              activePlayers[0];

            if (
              !next.includes(
                lastPlayer,
              )
            ) {
              next.push(
                lastPlayer,
              );
            }
          }

          /*
            変化がないなら
            元の配列を返す。
          */
          if (
            next.length ===
            current.length
          ) {
            return current;
          }

          return next;
        },
      );
    },
    [
      hands,
    ],
  );

  /*
    現在の場札。
  */
  const fieldPlay =
    useMemo(
      () =>
        analyzePlay(
          playedCards,
        ),
      [
        playedCards,
      ],
    );

  /*
    ナノカの選択カード。
  */
  const selectedCards =
    hand.filter(
      (card) =>
        selectedCardIds.includes(
          card.id,
        ),
    );

  const selectedPlay =
    analyzePlay(
      selectedCards,
    );

  /*
    ナノカの全合法手。
  */
  const allPlayerPlays =
    useMemo(
      () =>
        getAllValidPlays(
          hand,
        ),
      [
        hand,
      ],
    );

  /*
    場に実際に出せる手だけ。
  */
  const legalPlayerPlays =
    useMemo(
      () =>
        allPlayerPlays.filter(
          (play) =>
            canBeatPlay(
              play.analysis,
              fieldPlay,
            ),
        ),
      [
        allPlayerPlays,
        fieldPlay,
      ],
    );

  /*
    次に選択可能なカード。
  */
  const playableCardIds =
    useMemo(
      () => {
        if (
          currentPlayerIndex !==
            0 ||
          isRoundFinished
        ) {
          return [];
        }

        return getPlayableCardIds(
          legalPlayerPlays,
          selectedCardIds,
        );
      },
      [
        legalPlayerPlays,
        selectedCardIds,
        currentPlayerIndex,
        isRoundFinished,
      ],
    );

  const canPlaySelectedCards =
    currentPlayerIndex === 0 &&
    !isRoundFinished &&
    selectedPlay.valid &&
    canBeatPlay(
      selectedPlay,
      fieldPlay,
    );

  /*
    カード選択。
  */
  const toggleCardSelection = (
    card,
  ) => {
    if (
      currentPlayerIndex !==
        0 ||
      isRoundFinished
    ) {
      return;
    }

    /*
      選択解除。
    */
    if (
      selectedCardIds.includes(
        card.id,
      )
    ) {
      setSelectedCardIds(
        (current) =>
          current.filter(
            (cardId) =>
              cardId !==
              card.id,
          ),
      );

      return;
    }

    /*
      赤くないカードは
      選択できない。
    */
    if (
      !playableCardIds.includes(
        card.id,
      )
    ) {
      return;
    }

    setSelectedCardIds(
      (current) => [
        ...current,
        card.id,
      ],
    );
  };

  /*
    ==============================
    ナノカがカードを出す
    ==============================
  */
  const playSelectedCards = () => {
    if (
      currentPlayerIndex !==
        0 ||
      isRoundFinished
    ) {
      return;
    }

    if (
      !canPlaySelectedCards
    ) {
      return;
    }

    const selectedSet =
      new Set(
        selectedCardIds,
      );

    const cardsToPlay =
      hand.filter(
        (card) =>
          selectedSet.has(
            card.id,
          ),
      );

    /*
      カードを出した後の
      4人分の手札を先に作る。
    */
    const nextHands =
      hands.map(
        (
          currentHand,
          playerIndex,
        ) => {
          if (
            playerIndex !== 0
          ) {
            return currentHand;
          }

          return currentHand.filter(
            (card) =>
              !selectedSet.has(
                card.id,
              ),
          );
        },
      );

    setHands(
      nextHands,
    );

    setPlayedCards(
      cardsToPlay,
    );

    setLastPlayPlayerIndex(
      0,
    );

    setConsecutivePasses(
      0,
    );

    setSelectedCardIds(
      [],
    );

    /*
      ナノカがこれで上がっても、
      次の生存プレイヤーへ進む。
    */
    const nextPlayer =
      getNextActivePlayerIndex(
        nextHands,
        0,
      );

    if (
      nextPlayer !== null
    ) {
      setCurrentPlayerIndex(
        nextPlayer,
      );
    }
  };

  /*
    ==============================
    ナノカがパス
    ==============================
  */
  const passTurn = () => {
    if (
      currentPlayerIndex !==
        0 ||
      isRoundFinished
    ) {
      return;
    }

    setSelectedCardIds(
      [],
    );

    /*
      場が空ならパス不可。
    */
    if (
      playedCards.length ===
      0
    ) {
      return;
    }

    const nextPassCount =
      consecutivePasses + 1;

    const requiredPassCount =
      getRequiredPassCount(
        hands,
        lastPlayPlayerIndex,
      );

    /*
      残っている他プレイヤーが
      全員パスした。
    */
    if (
      nextPassCount >=
        requiredPassCount &&
      lastPlayPlayerIndex !==
        null
    ) {
      const leader =
        getLeaderAfterClear(
          hands,
          lastPlayPlayerIndex,
        );

      setPlayedCards(
        [],
      );

      setConsecutivePasses(
        0,
      );

      if (
        leader !== null
      ) {
        setCurrentPlayerIndex(
          leader,
        );
      }

      return;
    }

    setConsecutivePasses(
      nextPassCount,
    );

    const nextPlayer =
      getNextActivePlayerIndex(
        hands,
        0,
      );

    if (
      nextPlayer !== null
    ) {
      setCurrentPlayerIndex(
        nextPlayer,
      );
    }
  };

  /*
    ==============================
    CPUターン
    ==============================
  */
  useEffect(
    () => {
      /*
        ナノカの番。
      */
      if (
        currentPlayerIndex === 0
      ) {
        return undefined;
      }

      /*
        順位確定後は停止。
      */
      if (
        isRoundFinished
      ) {
        return undefined;
      }

      /*
        念のため、
        既に上がっているCPUなら
        次へ飛ばす。
      */
      if (
        hands[
          currentPlayerIndex
        ].length === 0
      ) {
        const nextPlayer =
          getNextActivePlayerIndex(
            hands,
            currentPlayerIndex,
          );

        if (
          nextPlayer !== null
        ) {
          setCurrentPlayerIndex(
            nextPlayer,
          );
        }

        return undefined;
      }

      const timerId =
        window.setTimeout(
          () => {
            const cpuIndex =
              currentPlayerIndex;

            const cpuHand =
              hands[
                cpuIndex
              ];

            /*
              CPUが作れる
              全合法手。
            */
            const allCpuPlays =
              getAllValidPlays(
                cpuHand,
              );

            /*
              場札に勝てる手。
            */
            const legalCpuPlays =
              allCpuPlays.filter(
                (play) =>
                  canBeatPlay(
                    play.analysis,
                    fieldPlay,
                  ),
              );

            /*
              暫定CPU。

              一番左側から作れる
              最初の合法手を出す。
            */
            const chosenPlay =
              legalCpuPlays[
                0
              ];

            /*
              ======================
              CPUがカードを出す
              ======================
            */
            if (
              chosenPlay
            ) {
              const chosenIds =
                new Set(
                  chosenPlay.cardIds,
                );

              /*
                カードを出した後の
                手札を作る。
              */
              const nextHands =
                hands.map(
                  (
                    currentHand,
                    playerIndex,
                  ) => {
                    if (
                      playerIndex !==
                      cpuIndex
                    ) {
                      return currentHand;
                    }

                    return currentHand.filter(
                      (card) =>
                        !chosenIds.has(
                          card.id,
                        ),
                    );
                  },
                );

              setHands(
                nextHands,
              );

              setPlayedCards(
                chosenPlay.cards,
              );

              setLastPlayPlayerIndex(
                cpuIndex,
              );

              setConsecutivePasses(
                0,
              );

              /*
                CPUが上がった場合でも、
                次の生存者へ。
              */
              const nextPlayer =
                getNextActivePlayerIndex(
                  nextHands,
                  cpuIndex,
                );

              if (
                nextPlayer !==
                null
              ) {
                setCurrentPlayerIndex(
                  nextPlayer,
                );
              }

              return;
            }

            /*
              ======================
              出せないのでパス
              ======================
            */
            if (
              playedCards.length ===
              0
            ) {
              /*
                場が空なら本来
                必ず何か出せる。
              */
              const nextPlayer =
                getNextActivePlayerIndex(
                  hands,
                  cpuIndex,
                );

              if (
                nextPlayer !==
                null
              ) {
                setCurrentPlayerIndex(
                  nextPlayer,
                );
              }

              return;
            }

            const nextPassCount =
              consecutivePasses +
              1;

            const requiredPassCount =
              getRequiredPassCount(
                hands,
                lastPlayPlayerIndex,
              );

            /*
              残っている人が
              全員パス。
            */
            if (
              nextPassCount >=
                requiredPassCount &&
              lastPlayPlayerIndex !==
                null
            ) {
              const leader =
                getLeaderAfterClear(
                  hands,
                  lastPlayPlayerIndex,
                );

              setPlayedCards(
                [],
              );

              setConsecutivePasses(
                0,
              );

              if (
                leader !==
                null
              ) {
                setCurrentPlayerIndex(
                  leader,
                );
              }

              return;
            }

            setConsecutivePasses(
              nextPassCount,
            );

            const nextPlayer =
              getNextActivePlayerIndex(
                hands,
                cpuIndex,
              );

            if (
              nextPlayer !==
              null
            ) {
              setCurrentPlayerIndex(
                nextPlayer,
              );
            }
          },
          CPU_THINK_TIME,
        );

      return () => {
        window.clearTimeout(
          timerId,
        );
      };
    },
    [
      currentPlayerIndex,
      hands,
      fieldPlay,
      playedCards,
      consecutivePasses,
      lastPlayPlayerIndex,
      isRoundFinished,
    ],
  );

  return {
    hands,
    hand,

    currentPlayerIndex,

    selectedCardIds,
    selectedCards,
    selectedPlay,

    playableCardIds,
    canPlaySelectedCards,

    playedCards,
    fieldPlay,

    /*
      順位関係。
    */
    finishOrder,
    isRoundFinished,

    toggleCardSelection,
    playSelectedCards,
    passTurn,
  };
}