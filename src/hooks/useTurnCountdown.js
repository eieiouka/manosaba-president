import {
  useEffect,
  useRef,
  useState,
} from "react";

const TURN_TIME_LIMIT = 3;

export default function useTurnCountdown({
  active,
  isFirstPlayerTurn,
  resetKey,
  onTimeUp,
}) {
  const [turnSeconds, setTurnSeconds] =
    useState(TURN_TIME_LIMIT);

  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    if (isFirstPlayerTurn) {
      setTurnSeconds(TURN_TIME_LIMIT);
      return undefined;
    }

    const deadline =
      Date.now() +
      TURN_TIME_LIMIT * 1000;

    setTurnSeconds(TURN_TIME_LIMIT);

    const countdownTimer =
      window.setInterval(() => {
        const nextSeconds = Math.max(
          0,
          Math.ceil(
            (deadline - Date.now()) / 1000,
          ),
        );

        setTurnSeconds(nextSeconds);
      }, 100);

    const forceActionTimer =
      window.setTimeout(() => {
        setTurnSeconds(0);
        onTimeUpRef.current?.();
      }, TURN_TIME_LIMIT * 1000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(forceActionTimer);
    };
  }, [
    active,
    isFirstPlayerTurn,
    resetKey,
  ]);

  return turnSeconds;
}