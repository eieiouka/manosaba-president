import {
  useEffect,
  useMemo,
  useState,
} from "react";

const TOTAL_ROUNDS = 5;

const players = [
  {
    id: "nanoka",
    name: "黒部ナノカ",
    image: "/characters/nanoka.png",
  },
  {
    id: "ema",
    name: "桜羽エマ",
    image: "/characters/ema.png",
  },
  {
    id: "sherry",
    name: "橘シェリー",
    image: "/characters/sherry.png",
  },
  {
    id: "hanna",
    name: "遠野ハンナ",
    image: "/characters/hanna.png",
  },
];

const ranks = [
  "大富豪",
  "富豪",
  "貧民",
  "大貧民",
];

function getScoreByPlace(
  place,
  roundNumber,
) {
  const baseScores = [
    2,
    1,
    -1,
    -2,
  ];

  let score =
    baseScores[place] ?? 0;

  /*
    最終5回戦だけ、
    1位にさらに+1点。
  */
  if (
    roundNumber ===
      TOTAL_ROUNDS &&
    place === 0
  ) {
    score += 1;
  }

  return score;
}

function formatScore(score) {
  if (score > 0) {
    return `+${score}`;
  }

  return String(score);
}

export function getRoundResults(
  finishOrder,
  roundNumber,
) {
  return players.map(
    (player, playerIndex) => {
      const place =
        finishOrder.indexOf(
          playerIndex,
        );

      if (place === -1) {
        return {
          playerIndex,
          place: null,
          rank: "",
          score: 0,
        };
      }

      return {
        playerIndex,
        place,
        rank:
          ranks[place],
        score:
          getScoreByPlace(
            place,
            roundNumber,
          ),
      };
    },
  );
}

function RoundScoreNotebook({
  roundNumber,
  savedRounds,
  finishOrder,
  onNextRound,
  onFinishMatch,
}) {
  const [showResult, setShowResult] =
    useState(false);

  useEffect(() => {
    setShowResult(false);

    const timer =
      window.setTimeout(
        () => {
          setShowResult(true);
        },
        450,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [roundNumber]);

  const currentResults =
    useMemo(
      () =>
        getRoundResults(
          finishOrder,
          roundNumber,
        ),
      [
        finishOrder,
        roundNumber,
      ],
    );

  const getSavedScore = (
    playerIndex,
    targetRound,
  ) => {
    const savedRound =
      savedRounds.find(
        (round) =>
          round.roundNumber ===
          targetRound,
      );

    if (!savedRound) {
      return null;
    }

    const result =
      getRoundResults(
        savedRound.finishOrder,
        targetRound,
      );

    return (
      result[playerIndex]?.score ??
      null
    );
  };

  const getCurrentScore = (
    playerIndex,
  ) => {
    return (
      currentResults[
        playerIndex
      ]?.score ?? 0
    );
  };

  const getTotalScore = (
    playerIndex,
  ) => {
    let total = 0;

    for (
      let targetRound = 1;
      targetRound <=
      TOTAL_ROUNDS;
      targetRound += 1
    ) {
      if (
        targetRound <
        roundNumber
      ) {
        total +=
          getSavedScore(
            playerIndex,
            targetRound,
          ) ?? 0;
      }

      if (
        targetRound ===
        roundNumber
      ) {
        total +=
          getCurrentScore(
            playerIndex,
          );
      }
    }

    return total;
  };

  const handleNext = () => {
    if (!showResult) {
      return;
    }

    if (
      roundNumber >=
      TOTAL_ROUNDS
    ) {
      onFinishMatch?.();
      return;
    }

    onNextRound?.();
  };

  return (
    <div className="roundNotebookOverlay">
      <section className="roundNotebook">
        <div className="roundNotebookBinding">
          <span />
          <span />
          <span />
          <span />
        </div>

        <header className="roundNotebookHeader">
          <div>
            <span className="roundNotebookSubTitle">
              PRESIDENT RECORD NOTE
            </span>

            <h2>
              第{roundNumber}回戦
            </h2>
          </div>

          <div className="roundNotebookRule">
            <div className="roundNotebookRuleRow">
              <span>
                大富豪
              </span>

              <strong>
                +2
              </strong>

              <span>
                富豪
              </span>

              <strong>
                +1
              </strong>
            </div>

            <div className="roundNotebookRuleRow">
              <span>
                貧民
              </span>

              <strong>
                -1
              </strong>

              <span>
                大貧民
              </span>

              <strong>
                -2
              </strong>
            </div>

            {roundNumber ===
              TOTAL_ROUNDS && (
              <p className="finalRoundBonus">
                FINAL BONUS：
                大富豪 +1
              </p>
            )}
          </div>
        </header>

        <div className="roundNotebookTable presidentNotebookTable">
          <div className="roundNotebookCorner">
            PLAYER
          </div>

          {Array.from({
            length: TOTAL_ROUNDS,
          }).map(
            (_, index) => (
              <div
                className={`roundNotebookRoundHeader ${
                  index + 1 ===
                  roundNumber
                    ? "currentRoundHeader"
                    : ""
                }`}
                key={index}
              >
                {index + 1}
              </div>
            ),
          )}

          <div className="roundNotebookTotalHeader">
            TOTAL
          </div>

          {players.map(
            (
              player,
              playerIndex,
            ) => {
              const currentResult =
                currentResults[
                  playerIndex
                ];

              return (
                <div
                  className="roundNotebookPlayerRow"
                  key={player.id}
                >
                  <div className="roundNotebookPlayerName">
                    <img
                      className="roundNotebookPlayerIllustration"
                      src={
                        player.image
                      }
                      alt=""
                      draggable="false"
                    />

                    <span>
                      {player.name}
                    </span>

                    {showResult &&
                      currentResult?.place ===
                        0 && (
                        <strong className="roundWinnerMark">
                          大富豪
                        </strong>
                      )}
                  </div>

                  {Array.from({
                    length:
                      TOTAL_ROUNDS,
                  }).map(
                    (
                      _,
                      roundIndex,
                    ) => {
                      const targetRound =
                        roundIndex +
                        1;

                      let score = null;

                      if (
                        targetRound <
                        roundNumber
                      ) {
                        score =
                          getSavedScore(
                            playerIndex,
                            targetRound,
                          );
                      }

                      if (
                        targetRound ===
                          roundNumber &&
                        showResult
                      ) {
                        score =
                          getCurrentScore(
                            playerIndex,
                          );
                      }

                      return (
                        <div
                          className={`roundNotebookScoreCell ${
                            targetRound ===
                            roundNumber
                              ? "currentRoundScoreCell"
                              : ""
                          } ${
                            score > 0
                              ? "positiveScore"
                              : ""
                          } ${
                            score < 0
                              ? "negativeScore"
                              : ""
                          }`}
                          key={
                            targetRound
                          }
                        >
                          {score ===
                          null
                            ? ""
                            : formatScore(
                                score,
                              )}
                        </div>
                      );
                    },
                  )}

                  <div className="roundNotebookTotalCell">
                    {showResult
                      ? formatScore(
                          getTotalScore(
                            playerIndex,
                          ),
                        )
                      : ""}
                  </div>
                </div>
              );
            },
          )}
        </div>

        <div className="presidentRoundRanks">
          {currentResults.map(
            (
              result,
              playerIndex,
            ) => (
              <div
                className="presidentRoundRank"
                key={
                  players[
                    playerIndex
                  ].id
                }
              >
                <span>
                  {result.place +
                    1}
                  位
                </span>

                <strong>
                  {
                    players[
                      playerIndex
                    ].name
                  }
                </strong>

                <em>
                  {result.rank}
                </em>

                <b>
                  {formatScore(
                    result.score,
                  )}
                </b>
              </div>
            ),
          )}
        </div>

        <footer className="roundNotebookFooter">
          <div className="roundNotebookProgress">
            {Array.from({
              length: TOTAL_ROUNDS,
            }).map(
              (_, index) => (
                <span
                  className={
                    index + 1 <=
                    roundNumber
                      ? "completedRoundDot"
                      : ""
                  }
                  key={index}
                />
              ),
            )}
          </div>

          <button
            className="roundNotebookNextButton"
            type="button"
            disabled={!showResult}
            onClick={
              handleNext
            }
          >
            {roundNumber >=
            TOTAL_ROUNDS
              ? "最終結果を見る"
              : `第${
                  roundNumber + 1
                }回戦へ`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default RoundScoreNotebook;