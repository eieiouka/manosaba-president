import {
  useEffect,
  useState,
} from "react";

import "./PresidentRuleScreen.css";

const RULE_WIDTH = 1500;
const RULE_HEIGHT = 1220;
const PAGE_PADDING = 16;

const RULE_ITEMS = [
  {
    number: "1",
    title: "カードの強さ",
    text: "3が最弱、2が最強。ジョーカーは単独なら2より強く、組み合わせでは好きな数字の代わりになります。ジョーカーは1枚入っています。",
  },
  {
    number: "2",
    title: "出せる組み合わせ",
    text: "シングル・ペア・スリーカード・フォーカード・同じスートで3枚以上連続する階段を出せます。",
  },
  {
    number: "3",
    title: "場への出し方",
    text: "場と同じ種類・同じ枚数で、より強い札を出します。出せなければPASS（自動パス機能あり）。全員がPASSすると場が流れます。",
  },
  {
    number: "4",
    title: "特殊ルール",
    text: "8切り、イレブンバック、革命・革命返し、縛り・激縛り、スペ3返し、都落ち、ジョーカー上がり禁止を採用しています。",
  },
  {
    number: "5",
    title: "手札交換",
    text: "第2回戦以降は大富豪と大貧民が2枚、富豪と貧民が1枚を交換します。渡す札は画面で選択します。",
  },
  {
    number: "6",
    title: "7回戦の勝負",
    text: "順位点は大富豪+2、富豪+1、貧民-1、大貧民-2。第7回戦の大富豪にはさらに+1点が入ります。",
  },
];

function calculateRuleScale() {
  const viewportWidth =
    window.visualViewport?.width ??
    window.innerWidth;

  const viewportHeight =
    window.visualViewport?.height ??
    window.innerHeight;

  return Math.min(
    Math.max(
      viewportWidth - PAGE_PADDING * 2,
      1,
    ) / RULE_WIDTH,
    Math.max(
      viewportHeight - PAGE_PADDING * 2,
      1,
    ) / RULE_HEIGHT,
    1,
  );
}

function PresidentRuleScreen({
  onConfirm,
}) {
  const [screenScale, setScreenScale] =
    useState(calculateRuleScale);

  const [starting, setStarting] =
    useState(false);

  useEffect(() => {
    const updateScreenScale = () => {
      setScreenScale(calculateRuleScale());
    };

    updateScreenScale();

    window.addEventListener(
      "resize",
      updateScreenScale,
    );

    window.visualViewport?.addEventListener(
      "resize",
      updateScreenScale,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateScreenScale,
      );

      window.visualViewport?.removeEventListener(
        "resize",
        updateScreenScale,
      );
    };
  }, []);

  const handleConfirm = async () => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      await onConfirm?.();
    } catch {
      setStarting(false);
    }
  };

  return (
    <main className="presidentRulePage">
      <div
        className="presidentRuleFrame"
        style={{
          width: RULE_WIDTH * screenScale,
          height: RULE_HEIGHT * screenScale,
        }}
      >
        <section
          className="presidentRuleCanvas"
          style={{
            transform: `scale(${screenScale})`,
          }}
        >
          <div className="presidentRulePanel">
            <header className="presidentRuleHeader">
              <span>PRESIDENT RULES</span>

              <h1>大富豪の遊び方</h1>

              <p>
                カードを出し切り、7回戦の合計得点でトップを目指そう
              </p>
            </header>

            <div className="presidentRuleList">
              {RULE_ITEMS.map((rule) => (
                <article
                  className="presidentRuleItem"
                  key={rule.number}
                >
                  <strong>{rule.number}</strong>

                  <div>
                    <h2>{rule.title}</h2>
                    <p>{rule.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="presidentRuleConfirmButton"
              onClick={handleConfirm}
              disabled={starting}
            >
              {starting ? "準備中..." : "OK"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PresidentRuleScreen;
