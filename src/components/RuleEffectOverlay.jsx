import "./RuleEffectOverlay.css";

const EFFECT_TEXT = {
  revolution: "革命",
  shibari: "縛り",
  gekiShibari: "激縛り",
  elevenBack: "イレブンバック",
  eightCut: "8切り",
  spadeThree: "スペ3返し",
  forbiddenFinish: "禁止上がり",

  finishDaifugo: "大富豪",
  finishFugo: "富豪",
  finishHinmin: "貧民",
  finishDaipinmin: "大貧民",
};

function RuleEffectOverlay({
  effect,
}) {
  if (!effect) {
    return null;
  }

  return (
    <div
      key={effect}
      className={`ruleEffectOverlay ruleEffect-${effect}`}
      aria-live="assertive"
    >
      <div className="ruleEffectFlash" />

      <div className="ruleEffectContent">
        <div className="ruleEffectLine" />

        <p>
          {EFFECT_TEXT[effect] ??
            effect}
        </p>

        <div className="ruleEffectLine" />
      </div>
    </div>
  );
}

export default RuleEffectOverlay;