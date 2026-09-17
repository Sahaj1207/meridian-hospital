import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { initSmoothScroll } from '@/lib/lenis';

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const reducedMotion = useReducedMotion();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const { destroy } = initSmoothScroll(reducedMotion);
    cleanupRef.current = destroy;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
