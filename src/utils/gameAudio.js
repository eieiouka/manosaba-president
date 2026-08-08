/*
  ゲーム中の効果音を再生する。

  各効果音は独立したAudioとして生成するので、
  PASS音とカード音などを同時に鳴らせる。
*/

export function playGameSound(
  source,
) {
  if (!source) {
    return null;
  }

  const audio =
    new Audio(source);

  audio.play().catch(() => {
    /*
      ブラウザ側で
      音声再生が拒否されても
      ゲーム自体は止めない。
    */
  });

  return audio;
}