import { type ReactNode } from 'react';
import { ToastProvider } from '@/shared/ui';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper.
 */
export function Providers({ children }: ProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
