export interface RootFolder {
  id: number;
  volumeId: number;
  path: string;
  relativePath: string;
  label: string | null;
  lastScan: string | null;
  scanVersion: number;
}

export interface Artist {
  id: number;
  rootId: number;
  name: string;
  path: string;
  galleryCount: number;
  coverPath: string | null;
}

export interface Gallery {
  id: number;
  artistId: number;
  name: string;
  path: string;
  pageCount: number;
  totalSize: number;
  coverPath: string | null;
  hasBackupZip: boolean;
  zipStatus: ZipStatus;
  lastReadPage: number;
  lastReadAt: string | null;
  favorited: boolean;
}

export type ZipStatus = 'unknown' | 'matched' | 'orphaned_zip' | 'missing_zip' | 'mismatched';

export type GallerySortOrder =
  | 'name_asc' | 'name_desc'
  | 'date_asc' | 'date_desc'
  | 'size_asc' | 'size_desc'
  | 'pages_desc' | 'last_read';
