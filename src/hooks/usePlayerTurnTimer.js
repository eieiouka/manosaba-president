import {
  useEffect,
  useRef,
  useState,
} from "react";

const TURN_LIMIT_SECONDS = 5;

export default function usePlayerTurnTimer({
  active,
  onTimeout,
}) {
  const [turnSeconds, setTurnSeconds] =
    useState(TURN_LIMIT_SECONDS);

  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!active) {
      setTurnSeconds(TURN_LIMIT_SECONDS);
      return undefined;
    }

    let timeoutHandled = false;

    const deadline =
      Date.now() +
      TURN_LIMIT_SECONDS * 1000;

    setTurnSeconds(TURN_LIMIT_SECONDS);

    const updateCountdown = () => {
      const remainingMilliseconds =
        Math.max(deadline - Date.now(), 0);

      const nextSeconds = Math.ceil(
        remainingMilliseconds / 1000,
      );

      setTurnSeconds(nextSeconds);

      if (
        remainingMilliseconds > 0 ||
        timeoutHandled
      ) {
        return;
      }

      timeoutHandled = true;
      onTimeoutRef.current?.();
    };

    const intervalId = window.setInterval(
      updateCountdown,
      100,
    );

    updateCountdown();

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active]);

  return turnSeconds;
}
