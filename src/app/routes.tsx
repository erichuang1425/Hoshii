import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { ArtistListPage } from '@/pages/ArtistListPage';
import { ArtistPage } from '@/pages/ArtistPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'roots/:rootId/artists', element: <ArtistListPage /> },
      { path: 'artists/:artistId', element: <ArtistPage /> },
      { path: 'settings', element: <SettingsPage /> },
      // Phase 3 routes appended here:
      // { path: 'file-manager', element: <FileManagerPage /> },
    ],
  },
  // Reader is full-screen, outside MainLayout
  { path: 'gallery/:galleryId', element: <GalleryPage /> },
  // Catch-all redirect
  { path: '*', element: <Navigate to="/" replace /> },
]);
