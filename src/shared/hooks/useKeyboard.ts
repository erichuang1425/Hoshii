import { useEffect } from 'react';

interface KeyBinding {
  key: string;
  action: () => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export function useKeyboard(bindings: KeyBinding[]): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const binding of bindings) {
        if (
          event.key === binding.key &&
          (!binding.ctrl || event.ctrlKey) &&
          (!binding.shift || event.shiftKey) &&
          (!binding.alt || event.altKey)
        ) {
          event.preventDefault();
          binding.action();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings]);
}
