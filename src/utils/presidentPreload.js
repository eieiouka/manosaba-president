import {
  preloadGameSounds,
  warmUpGameSounds,
} from "./gameAudio";

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

  preloadGameSounds(
    AUDIO_SOURCES,
  );

  return imagePreloadPromise;
}

export function warmUpPresidentAudio() {
  preloadPresidentAssets();

  if (audioWarmUpPromise) {
    return audioWarmUpPromise;
  }

  audioWarmUpPromise = warmUpGameSounds(
    AUDIO_SOURCES,
  );

  return audioWarmUpPromise;
}
