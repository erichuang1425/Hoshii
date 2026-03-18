import { type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper. New providers are appended here as features
 * are implemented (e.g., ToastProvider in Task 1.3).
 */
export function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
