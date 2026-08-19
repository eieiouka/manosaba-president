const audioBySource = new Map();

function getGameAudio(source) {
  const cachedAudio =
    audioBySource.get(source);

  if (cachedAudio) {
    return cachedAudio;
  }

  const audio = new Audio();

  audio.preload = "auto";
  audio.playsInline = true;
  audio.src = source;
  audio.load();

  audioBySource.set(
    source,
    audio,
  );

  return audio;
}

export function preloadGameSounds(
  sources,
) {
  return sources.map(
    getGameAudio,
  );
}

function warmUpGameAudio(audio) {
  const originalMuted = audio.muted;
  const originalVolume = audio.volume;

  audio.muted = true;
  audio.volume = 0;

  try {
    audio.currentTime = 0;
  } catch {
    // 読み込み前なら何もしない。
  }

  let playPromise;

  try {
    playPromise = audio.play();
  } catch {
    audio.muted = originalMuted;
    audio.volume = originalVolume;
    return Promise.resolve();
  }

  return Promise.resolve(playPromise)
    .catch(() => undefined)
    .then(
      () =>
        new Promise((resolve) => {
          window.setTimeout(() => {
            audio.pause();

            try {
              audio.currentTime = 0;
            } catch {
              // 読み込み前なら何もしない。
            }

            audio.muted = originalMuted;
            audio.volume = originalVolume;
            resolve();
          }, 100);
        }),
    );
}

export function warmUpGameSounds(
  sources,
) {
  const audioElements =
    preloadGameSounds(sources);

  return Promise.allSettled(
    audioElements.map(
      warmUpGameAudio,
    ),
  );
}

export function playGameSound(
  source,
) {
  if (!source) {
    return null;
  }

  const audio =
    getGameAudio(source);

  audio.pause();
  audio.muted = false;
  audio.volume = 1;

  try {
    audio.currentTime = 0;
  } catch {
    // 読み込み前なら先頭指定を省略する。
  }

  audio.play().catch(() => {
    /*
      ブラウザ側で
      音声再生が拒否されても
      ゲーム自体は止めない。
    */
  });

  return audio;
}
