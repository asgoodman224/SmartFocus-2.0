import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Silently re-fetches when the screen regains focus (e.g. switching back to a
 * tab). Skips the first focus because `useAsync` already loaded on mount.
 */
export function useRevalidateOnFocus(revalidate: () => void) {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      revalidate();
    }, [revalidate]),
  );
}
