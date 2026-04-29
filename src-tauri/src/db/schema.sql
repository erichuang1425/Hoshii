-- Hoshii database schema (from ARCHITECTURE.md Section 7)
-- WAL mode, foreign_keys, and busy_timeout are set in db/mod.rs before this runs.

CREATE TABLE IF NOT EXISTS volumes (
    id          INTEGER PRIMARY KEY,
    uuid        TEXT NOT NULL UNIQUE,
    label       TEXT,
    mount_path  TEXT,
    is_online   BOOLEAN DEFAULT FALSE,
    is_removable BOOLEAN DEFAULT TRUE,
    total_bytes INTEGER,
    last_seen   DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS root_folders (
    id            INTEGER PRIMARY KEY,
    volume_id     INTEGER REFERENCES volumes(id) ON DELETE CASCADE,
    path          TEXT NOT NULL UNIQUE,
    relative_path TEXT NOT NULL,
    label         TEXT,
    last_scan     DATETIME,
    scan_version  INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artists (
    id            INTEGER PRIMARY KEY,
    root_id       INTEGER REFERENCES root_folders(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    path          TEXT NOT NULL UNIQUE,
    gallery_count INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS galleries (
    id              INTEGER PRIMARY KEY,
    artist_id       INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL UNIQUE,
    page_count      INTEGER DEFAULT 0,
    total_size      INTEGER DEFAULT 0,
    cover_path      TEXT,
    has_backup_zip  BOOLEAN DEFAULT FALSE,
    zip_status      TEXT DEFAULT 'unknown',
    last_read_page  INTEGER DEFAULT 0,
    last_read_at    DATETIME,
    favorited       BOOLEAN DEFAULT FALSE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_media (
    id            INTEGER PRIMARY KEY,
    gallery_id    INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    filename      TEXT NOT NULL,
    path          TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    sort_order    INTEGER NOT NULL,
    group_name    TEXT DEFAULT '',
    media_type    TEXT NOT NULL DEFAULT 'image',
    width         INTEGER,
    height        INTEGER,
    file_size     INTEGER,
    duration_ms   INTEGER,
    is_animated   BOOLEAN DEFAULT FALSE,
    mtime         INTEGER,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS gallery_tags (
    gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    tag_id     INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (gallery_id, tag_id)
);

CREATE TABLE IF NOT EXISTS unorganized_files (
    id         INTEGER PRIMARY KEY,
    artist_id  INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    path       TEXT NOT NULL UNIQUE,
    media_type TEXT,
    file_size  INTEGER,
    mtime      INTEGER
);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_root_volume ON root_folders(volume_id);
CREATE INDEX IF NOT EXISTS idx_galleries_artist ON galleries(artist_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_gallery ON gallery_media(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_sort ON gallery_media(gallery_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_media_type ON gallery_media(gallery_id, media_type);
CREATE INDEX IF NOT EXISTS idx_galleries_favorited ON galleries(favorited) WHERE favorited = TRUE;
CREATE INDEX IF NOT EXISTS idx_galleries_last_read ON galleries(last_read_at) WHERE last_read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galleries_deleted ON galleries(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_volumes_online ON volumes(is_online);
