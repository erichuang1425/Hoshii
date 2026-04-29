import { useEffect } from 'react';

interface KeyBinding {
  key: string;
  action: () => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

// Don't hijack keys while the user is typing in an editable element.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboard(bindings: KeyBinding[]): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      for (const binding of bindings) {
        if (
          event.key === binding.key &&
          (!binding.ctrl || event.ctrlKey) &&
          (!binding.shift || event.shiftKey) &&
          (!binding.alt || event.altKey) &&
          // When a modifier is NOT required, the event must not have it set —
          // otherwise bindings like `r` would steal Ctrl+R (browser reload).
          (binding.ctrl || !event.ctrlKey) &&
          (binding.shift || !event.shiftKey) &&
          (binding.alt || !event.altKey)
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
