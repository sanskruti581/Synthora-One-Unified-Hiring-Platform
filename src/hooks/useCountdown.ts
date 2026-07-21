import { useEffect, useMemo, useState } from "react";

function getRemainingTime(targetDate: string) {
  const difference = new Date(targetDate).getTime() - Date.now();
  const safeDifference = Math.max(difference, 0);

  return {
    days: Math.floor(safeDifference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((safeDifference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((safeDifference / (1000 * 60)) % 60),
    seconds: Math.floor((safeDifference / 1000) % 60),
  };
}

export function useCountdown(targetDate: string) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(targetDate));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemainingTime(targetDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [targetDate]);

  return useMemo(() => remaining, [remaining]);
}
