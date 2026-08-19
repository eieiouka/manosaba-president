import {
  useEffect,
  useMemo,
  useState,
} from "react";

const TOTAL_ROUNDS = 7;

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
    最終7回戦だけ、
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
          {Array.from({
            length: 12,
          }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <header className="roundNotebookHeader">
          <div>
            <span className="roundNotebookSubTitle">
              PRESIDENT SCORE NOTE
            </span>

            <h2>
              {roundNumber}回戦
            </h2>
          </div>

          <div className="roundNotebookRule">
            <div className="roundNotebookRuleRow">
              <span>大富豪 +2</span>
              <span>富豪 +1</span>
              <span>貧民 -1</span>
              <span>大貧民 -2</span>
            </div>

            {roundNumber ===
              TOTAL_ROUNDS && (
              <div className="roundNotebookRuleRow">
                <span>
                  最終戦：大富豪 +1
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="roundNotebookTable presidentNotebookTable">
          <div className="roundNotebookCorner">
            プレイヤー
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
            合計
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
                            score === null
                                ? ""
                                : score > 0
                                ? "positiveScore"
                                : score < 0
                                    ? "negativeScore"
                                    : "zeroScore"
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

                  <div
                    className={`roundNotebookTotalCell ${
                        getTotalScore(playerIndex) > 0
                        ? "positiveScore"
                        : getTotalScore(playerIndex) < 0
                            ? "negativeScore"
                            : "zeroScore"
                    }`}
                    >
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

        <section className="roundScoreBreakdown">
          <h3>今回の結果</h3>

          <div className="roundScoreBreakdownGrid">
            <div
              className={`roundScoreStep ${
                showResult
                  ? "visibleRoundScoreStep"
                  : ""
              }`}
            >
              <span>階級</span>

              <div className="roundScoreStepValues presidentRoundRankValues">
                {currentResults.map(
                  (result) => (
                    <strong
                      key={result.playerIndex}
                    >
                      {showResult
                        ? result.rank
                        : ""}
                    </strong>
                  ),
                )}
              </div>
            </div>

            <div
              className={`roundScoreStep ${
                showResult
                  ? "visibleRoundScoreStep"
                  : ""
              }`}
            >
              <span>得点</span>

              <div className="roundScoreStepValues">
                {currentResults.map(
                  (result) => (
                    <strong
                      className={
                        result.score > 0
                          ? "positiveScore"
                          : result.score < 0
                            ? "negativeScore"
                            : ""
                      }
                      key={result.playerIndex}
                    >
                      {showResult
                        ? formatScore(
                            result.score,
                          )
                        : ""}
                    </strong>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

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
