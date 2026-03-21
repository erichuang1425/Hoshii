import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { ArtistListPage } from '@/pages/ArtistListPage';
import { ArtistPage } from '@/pages/ArtistPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { SearchPage } from '@/pages/SearchPage';
import { FileManagerPage } from '@/pages/FileManagerPage';
import { ZipRecoveryPage } from '@/pages/ZipRecoveryPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'roots/:rootId/artists', element: <ArtistListPage /> },
      { path: 'artists/:artistId', element: <ArtistPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'file-manager', element: <FileManagerPage /> },
      { path: 'zip-recovery', element: <ZipRecoveryPage /> },
    ],
  },
  // Reader is full-screen, outside MainLayout
  { path: 'gallery/:galleryId', element: <GalleryPage /> },
  // Catch-all redirect
  { path: '*', element: <Navigate to="/" replace /> },
]);
