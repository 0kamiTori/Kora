import { useEffect, useState } from 'react';

/** Reloj que se actualiza cada `intervalMs`, para textos como "hace 12 s". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
