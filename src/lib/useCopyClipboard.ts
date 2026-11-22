import {useCallback, useEffect, useRef, useState} from 'react';

export function useCopyClipboard(autoClearSec: number) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const badgeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string, id: string, sensitive = false) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);

        if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = window.setTimeout(() => {
          setCopiedId((prev) => (prev === id ? null : prev));
        }, 1800);

        if (sensitive && autoClearSec > 0) {
          if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
          clearTimerRef.current = window.setTimeout(() => {
            navigator.clipboard.writeText('').catch(() => {});
          }, autoClearSec * 1000);
        }
      } catch {
        // Fallback when clipboard permission is unavailable
      }
    },
    [autoClearSec],
  );

  return {copiedId, copy};
}
