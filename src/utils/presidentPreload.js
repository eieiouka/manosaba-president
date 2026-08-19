const CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
];

const CARD_SUIT_NUMBERS = [1, 2, 3, 4];

const CHARACTER_IMAGE_SOURCES = [
  "/characters/nanoka.png",
  "/characters/ema.png",
  "/characters/sherry.png",
  "/characters/hanna.png",
];

const EXTRA_IMAGE_SOURCES = [
  "/backgrounds/president-start.png",
  "/cards_webp/card_back.webp",
  "/cards_webp/card_JOKER.webp",
];

const AUDIO_SOURCES = [
  "/audio/card-play.mp3",
  "/audio/nanoka-pass.mp3",
  "/audio/ema-pass.mp3",
  "/audio/sherry-pass.mp3",
  "/audio/hanna-pass.mp3",
  "/audio/nanoka-finish.mp3",
  "/audio/ema-finish.mp3",
  "/audio/sherry-finish.mp3",
  "/audio/hanna-finish.mp3",
  "/audio/nanoka-champion.mp3",
  "/audio/ema-champion.mp3",
  "/audio/sherry-champion.mp3",
  "/audio/hanna-champion.mp3",
];

const CARD_IMAGE_SOURCES =
  CARD_RANKS.flatMap((rank) =>
    CARD_SUIT_NUMBERS.map(
      (suitNumber) =>
        `/cards_webp/card_${rank}${suitNumber}.webp`,
    ),
  );

const ALL_IMAGE_SOURCES = [
  ...CARD_IMAGE_SOURCES,
  ...CHARACTER_IMAGE_SOURCES,
  ...EXTRA_IMAGE_SOURCES,
];

let imagePreloadPromise = null;
let audioElements = null;
let audioWarmUpPromise = null;

function preloadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();

    const finish = () => resolve(source);

    image.onload = finish;
    image.onerror = finish;
    image.src = source;
  });
}

export function preloadPresidentAssets() {
  if (!imagePreloadPromise) {
    imagePreloadPromise =
      Promise.allSettled(
        ALL_IMAGE_SOURCES.map(
          preloadImage,
        ),
      );
  }

  if (!audioElements) {
    audioElements = AUDIO_SOURCES.map(
      (source) => {
        const audio = new Audio();

        audio.preload = "auto";
        audio.src = source;
        audio.playsInline = true;
        audio.load();

        return audio;
      },
    );
  }

  return imagePreloadPromise;
}

function warmUpAudio(audio) {
  const originalMuted = audio.muted;
  const originalVolume = audio.volume;

  audio.muted = true;
  audio.volume = 0;
  audio.currentTime = 0;

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

export function warmUpPresidentAudio() {
  preloadPresidentAssets();

  if (audioWarmUpPromise) {
    return audioWarmUpPromise;
  }

  audioWarmUpPromise = Promise.allSettled(
    audioElements.map(warmUpAudio),
  );

  return audioWarmUpPromise;
}
