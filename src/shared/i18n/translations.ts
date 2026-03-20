const translations: Record<string, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',

    // Browse Roots (Task 2.4)
    'browseRoots.title': 'Root Folders',
    'browseRoots.addRoot': 'Add Root Folder',
    'browseRoots.selectFolder': 'Select root folder',
    'browseRoots.rootAdded': 'Root folder added',
    'browseRoots.scan': 'Scan',
    'browseRoots.scanning': 'Scanning...',
    'browseRoots.lastScan': 'Last scan',
    'browseRoots.neverScanned': 'Never',
    'browseRoots.artists': 'artists',
    'browseRoots.galleries': 'galleries',
    'browseRoots.offlineDrives': 'Offline Drives',
    'browseRoots.status.driveOffline': 'Drive disconnected',
    'browseRoots.status.driveOnline': 'Drive connected',

    // Browse Artists (Task 2.5)
    'browseArtists.title': 'Artists',
    'browseArtists.galleries': 'galleries',
    'browseArtists.pages': 'pages',
    'browseArtists.galleriesOf': 'Galleries',
    'browseArtists.sortName': 'Alphabetical',
    'browseArtists.sortCount': 'Gallery count',
    'browseArtists.sortRecent': 'Recently updated',
    'browseArtists.sortNameAsc': 'Name A-Z',
    'browseArtists.sortNameDesc': 'Name Z-A',
    'browseArtists.sortDateDesc': 'Newest first',
    'browseArtists.sortDateAsc': 'Oldest first',
    'browseArtists.sortPages': 'Most pages',
    'browseArtists.sortLastRead': 'Last read',
    'browseArtists.favorite': 'Add to favorites',
    'browseArtists.unfavorite': 'Remove from favorites',

    // Gallery Viewer (Task 2.6)
    'galleryViewer.back': 'Back',
    'galleryViewer.all': 'All',
    'galleryViewer.ungrouped': 'Ungrouped',

    // Video Player (Task 2.7)
    'videoPlayer.loop': 'Loop',
    'videoPlayer.pip': 'Picture in Picture',
    'videoPlayer.fullscreen': 'Fullscreen',
    'videoPlayer.ffmpegRequired': 'FFmpeg required',
    'videoPlayer.installFfmpeg': 'Install FFmpeg to play this video format',
    'videoPlayer.remuxing': 'Converting video...',

    // Shared
    'shared.offline': 'Offline',
    'shared.reconnectDrive': 'Reconnect {drive} to view',
    'shared.loading': 'Loading...',
    'shared.search': 'Search...',
    'shared.noResults': 'No results found',
    'shared.error': 'An error occurred',
    'shared.retry': 'Retry',
  },
  'zh-TW': {
    'settings.title': '設定',

    // Browse Roots (Task 2.4)
    'browseRoots.title': '根資料夾',
    'browseRoots.addRoot': '新增根資料夾',
    'browseRoots.selectFolder': '選擇根資料夾',
    'browseRoots.rootAdded': '已新增根資料夾',
    'browseRoots.scan': '掃描',
    'browseRoots.scanning': '掃描中...',
    'browseRoots.lastScan': '上次掃描',
    'browseRoots.neverScanned': '從未',
    'browseRoots.artists': '創作者',
    'browseRoots.galleries': '圖庫',
    'browseRoots.offlineDrives': '離線磁碟',
    'browseRoots.status.driveOffline': '硬碟未連接',
    'browseRoots.status.driveOnline': '硬碟已連接',

    // Browse Artists (Task 2.5)
    'browseArtists.title': '創作者',
    'browseArtists.galleries': '圖庫',
    'browseArtists.pages': '頁',
    'browseArtists.galleriesOf': '圖庫',
    'browseArtists.sortName': '依名稱',
    'browseArtists.sortCount': '依圖庫數',
    'browseArtists.sortRecent': '最近更新',
    'browseArtists.sortNameAsc': '名稱 A-Z',
    'browseArtists.sortNameDesc': '名稱 Z-A',
    'browseArtists.sortDateDesc': '最新優先',
    'browseArtists.sortDateAsc': '最舊優先',
    'browseArtists.sortPages': '最多頁數',
    'browseArtists.sortLastRead': '最近閱讀',
    'browseArtists.favorite': '加入收藏',
    'browseArtists.unfavorite': '移除收藏',

    // Gallery Viewer (Task 2.6)
    'galleryViewer.back': '返回',
    'galleryViewer.all': '全部',
    'galleryViewer.ungrouped': '未分組',

    // Video Player (Task 2.7)
    'videoPlayer.loop': '循環播放',
    'videoPlayer.pip': '子母畫面',
    'videoPlayer.fullscreen': '全螢幕',
    'videoPlayer.ffmpegRequired': '需要 FFmpeg',
    'videoPlayer.installFfmpeg': '安裝 FFmpeg 以播放此影片格式',
    'videoPlayer.remuxing': '轉檔中...',

    // Shared
    'shared.offline': '離線',
    'shared.reconnectDrive': '重新連接 {drive} 以檢視',
    'shared.loading': '載入中...',
    'shared.search': '搜尋...',
    'shared.noResults': '找不到結果',
    'shared.error': '發生錯誤',
    'shared.retry': '重試',
  },
};

let currentLanguage = 'en';

export function setLanguage(lang: string): void {
  currentLanguage = lang;
}

export function getLanguage(): string {
  return currentLanguage;
}

export function t(key: string): string {
  const langStrings = translations[currentLanguage] ?? translations['en'];
  return langStrings[key] ?? key;
}
