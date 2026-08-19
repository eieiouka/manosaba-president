import {
  getRoundResults,
} from "./RoundScoreNotebook";

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

function formatScore(score) {
  if (score > 0) {
    return `+${score}`;
  }

  return String(score);
}

function getScoreClass(score) {
  if (score > 0) {
    return "positiveScore";
  }

  if (score < 0) {
    return "negativeScore";
  }

  return "zeroScore";
}

function FinalMatchResult({
  savedRounds,
  roundNumber,
  finishOrder,
  onRestart,
  onBackToHub,
}) {
  /*
    7回戦目がsetStateの都合で
    savedRoundsへ入る前でも、
    必ず現在の結果を含める。
  */
  const allRounds = [
    ...savedRounds,
  ];

  const alreadySaved =
    allRounds.some(
      (round) =>
        round.roundNumber ===
        roundNumber,
    );

  if (!alreadySaved) {
    allRounds.push({
      roundNumber,
      finishOrder: [
        ...finishOrder,
      ],
    });
  }

  allRounds.sort(
    (a, b) =>
      a.roundNumber -
      b.roundNumber,
  );

  /*
    各ラウンドの得点表を作る。
  */
  const roundScores =
    allRounds.map(
      (round) => ({
        roundNumber:
          round.roundNumber,

        results:
          getRoundResults(
            round.finishOrder,
            round.roundNumber,
          ),
      }),
    );

  /*
    7回戦合計。
  */
  const totalScores =
    players.map(
      (_, playerIndex) =>
        roundScores.reduce(
          (
            total,
            round,
          ) =>
            total +
            (round.results[
              playerIndex
            ]?.score ?? 0),
          0,
        ),
    );

  /*
    合計点の高い順。
  */
    /*
    第7回戦の結果。

    最終合計点が同点だった場合の
    タイブレークに使う。
  */
  const finalRound =
    roundScores.find(
      (round) =>
        round.roundNumber ===
        TOTAL_ROUNDS,
    );

  const getFinalRoundPlace = (
    playerIndex,
  ) => {
    return (
      finalRound?.results[
        playerIndex
      ]?.place ?? 999
    );
  };

  /*
    最終順位。

    1. 合計点が高い方
    2. 同点なら第7回戦の順位が高い方
  */
  const sortedPlayers =
    players
      .map(
        (
          player,
          playerIndex,
        ) => ({
          ...player,

          playerIndex,

          totalScore:
            totalScores[
              playerIndex
            ],

          finalRoundPlace:
            getFinalRoundPlace(
              playerIndex,
            ),
        }),
      )
      .sort(
        (a, b) => {
          /*
            まず合計点。
          */
          if (
            b.totalScore !==
            a.totalScore
          ) {
            return (
              b.totalScore -
              a.totalScore
            );
          }

          /*
            同点なら
            第7回戦の着順。
          */
          return (
            a.finalRoundPlace -
            b.finalRoundPlace
          );
        },
      );

    /*
    タイブレークまで行えば
    最終順位は必ず1～4位になる。
  */
  const ranking =
    sortedPlayers.map(
      (
        player,
        index,
      ) => ({
        ...player,

        rank:
          index + 1,
      }),
    );

    const champion =
    ranking[0];

  const championScore =
    champion?.totalScore ??
    0;

  const champions =
    champion
      ? [champion]
      : [];

  return (
    <div className="finalResultOverlay">
      <section
        className="finalResultPanel"
        aria-label="最終結果"
      >
        <header className="finalResultHeader">
          <span className="finalResultSubTitle">
            PRESIDENT FINAL RESULT
          </span>

          <h2>
            最終結果
          </h2>

          <p>
            全{TOTAL_ROUNDS}回戦終了
          </p>
        </header>

        <section className="finalChampionArea">
          <span className="finalChampionLabel">
            CHAMPION
          </span>

          <strong className="finalChampionName">
            {champions.map(
              (player) => (
                <span
                  className="finalChampionNamePlayer"
                  key={player.id}
                >
                  {player.playerIndex === 0 ? (
                    <>
                      黒部ナノカ
                      <span className="youLabel">
                        （You）
                      </span>
                    </>
                  ) : (
                    player.name
                  )}
                </span>
              ),
            )}
          </strong>

          <span
            className={`finalChampionScore ${getScoreClass(
              championScore,
            )}`}
          >
            {formatScore(
              championScore,
            )}
            点
          </span>
        </section>

        <section className="finalRanking">
          {ranking.map(
            (player) => (
              <div
                className={`finalRankingRow finalRank${player.rank}`}
                key={
                  player.id
                }
              >
                <div className="finalRankingPosition">
                  <span>
                    {player.rank}
                  </span>

                  <small>
                    位
                  </small>
                </div>

                <div className="finalRankingPlayer">
                  <img
                    className="finalRankingPlayerIllustration"
                    src={
                      player.image
                    }
                    alt={
                      player.name
                    }
                    draggable="false"
                  />

                  <strong className="finalRankingPlayerName">
                    {player.playerIndex === 0 ? (
                      <>
                        <span>
                          黒部ナノカ
                        </span>

                      <small>
                        （You）
                      </small>
                      </>
                    ) : (
                      <span>
                        {player.name}
                      </span>
                    )}
                  </strong>
                </div>

                <div
                  className={`finalRankingScore ${getScoreClass(
                    player.totalScore,
                  )}`}
                >
                  {formatScore(
                    player.totalScore,
                  )}

                  <small>
                    点
                  </small>
                </div>
              </div>
            ),
          )}
        </section>

        <section className="finalRoundHistory">
          <h3>
            対局記録
          </h3>

          <div className="finalRoundHistoryTable">
            <div className="finalHistoryCorner">
              プレイヤー
            </div>

            {Array.from({
              length:
                TOTAL_ROUNDS,
            }).map(
              (_, index) => (
                <div
                  className="finalHistoryRoundHeader"
                  key={
                    index
                  }
                >
                  {index + 1}
                </div>
              ),
            )}

            <div className="finalHistoryTotalHeader">
              合計
            </div>

            {players.map(
              (
                player,
                playerIndex,
              ) => (
                <div
                  className="finalHistoryPlayerRow"
                  key={
                    player.id
                  }
                >
                  <div className="finalHistoryPlayerName">
                    {playerIndex === 0
                      ? "黒部ナノカ（You）"
                      : player.name}
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

                      const round =
                        roundScores.find(
                          (
                            item,
                          ) =>
                            item.roundNumber ===
                            targetRound,
                        );

                      const score =
                        round
                          ?.results[
                          playerIndex
                        ]?.score;

                      return (
                        <div
                          className={`finalHistoryScore ${
                            typeof score ===
                            "number"
                              ? getScoreClass(
                                  score,
                                )
                              : ""
                          }`}
                          key={
                            targetRound
                          }
                        >
                          {typeof score ===
                          "number"
                            ? formatScore(
                                score,
                              )
                            : ""}
                        </div>
                      );
                    },
                  )}

                  <div
                    className={`finalHistoryTotal ${getScoreClass(
                      totalScores[
                        playerIndex
                      ],
                    )}`}
                  >
                    {formatScore(
                      totalScores[
                        playerIndex
                      ],
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <footer className="finalResultFooter">
          <button
            className="finalResultHubButton"
            type="button"
            onClick={
              onBackToHub
            }
          >
            HUBへ戻る
          </button>

          <button
            className="finalResultRestartButton"
            type="button"
            onClick={
              onRestart
            }
          >
            もう一度遊ぶ
          </button>
        </footer>
      </section>
    </div>
  );
}

export default FinalMatchResult;
