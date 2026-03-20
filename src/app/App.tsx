import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './routes';
import { useSettingsStore } from '@/features/settings/model/useSettingsStore';

export function App() {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
