import { useState, useEffect, useRef } from "react";

export function useAnimatedNumber(target: number, duration = 420): number {
  const [v, setV] = useState(target);
  const fromRef  = useRef(target);
  const startRef = useRef(0);
  const rafRef   = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current  = v;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const t      = Math.min(1, (now - startRef.current) / duration);
      const eased  = 1 - Math.pow(1 - t, 3);
      setV(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return Math.round(v);
}
