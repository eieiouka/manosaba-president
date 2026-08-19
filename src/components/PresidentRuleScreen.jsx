import {
  useEffect,
  useState,
} from "react";

import "./PresidentRuleScreen.css";

const RULE_ITEMS = [
  {
    number: "01",
    title: "カードの強さ",
    text: "3が最弱、2が最強。ジョーカーは単独なら2より強く、組み合わせでは好きな数字の代わりになります。ジョーカーは1枚入っています。",
  },
  {
    number: "02",
    title: "出せる組み合わせ",
    text: "シングル・ペア・スリーカード・フォーカード・同じスートで3枚以上連続する階段を出せます。",
  },
  {
    number: "03",
    title: "場への出し方",
    text: "場と同じ種類・同じ枚数で、より強い札を出します。出せなければPASS（自動パス機能あり）。全員がPASSすると場が流れます。",
  },
  {
    number: "04",
    title: "特殊ルール",
    text: "8切り、イレブンバック、革命・革命返し、縛り・激縛り、スペ3返し、都落ちを採用しています。",
  },
  {
    number: "05",
    title: "手札交換",
    text: "第2回戦以降は大富豪と大貧民が2枚、富豪と貧民が1枚を交換します。渡す札は画面で選択します。",
  },
  {
    number: "06",
    title: "7回戦の勝負",
    text: "順位点は大富豪+2、富豪+1、貧民-1、大貧民-2。第7回戦の大富豪にはさらに+1点が入ります。",
  },
];

const RULE_WIDTH = 1500;
const RULE_HEIGHT = 1220;
const PAGE_PADDING = 4;

function PresidentRuleScreen({
  onConfirm,
}) {
  const [preparing, setPreparing] =
    useState(false);

  const [screenScale, setScreenScale] =
    useState(() => {
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
    });

  useEffect(() => {
    const updateScreenScale = () => {
      const viewportWidth =
        window.visualViewport?.width ??
        window.innerWidth;

      const viewportHeight =
        window.visualViewport?.height ??
        window.innerHeight;

      setScreenScale(
        Math.min(
          Math.max(
            viewportWidth - PAGE_PADDING * 2,
            1,
          ) / RULE_WIDTH,
          Math.max(
            viewportHeight - PAGE_PADDING * 2,
            1,
          ) / RULE_HEIGHT,
          1,
        ),
      );
    };

    updateScreenScale();
    window.addEventListener("resize", updateScreenScale);
    window.visualViewport?.addEventListener("resize", updateScreenScale);

    return () => {
      window.removeEventListener("resize", updateScreenScale);
      window.visualViewport?.removeEventListener("resize", updateScreenScale);
    };
  }, []);

  const handleConfirm = async () => {
    if (preparing) {
      return;
    }

    setPreparing(true);

    try {
      await onConfirm?.();
    } catch {
      setPreparing(false);
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
        <div className="presidentRuleSheet">
        <header className="presidentRuleHeader">
          <p>MANOSABA CARD GAMES</p>
          <h1>大富豪</h1>
          <span>PRESIDENT RULES</span>
        </header>

        <div className="presidentRuleGrid">
          {RULE_ITEMS.map((rule) => (
            <article
              className="presidentRuleItem"
              key={rule.number}
            >
              <span className="presidentRuleNumber">
                {rule.number}
              </span>

              <div>
                <h2>{rule.title}</h2>
                <p>{rule.text}</p>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="presidentRuleConfirm"
          onClick={handleConfirm}
          disabled={preparing}
        >
          {preparing
            ? "カードを準備中..."
            : "ルールを確認して始める"}
        </button>
        </div>
        </section>
      </div>
    </main>
  );
}

export default PresidentRuleScreen;
