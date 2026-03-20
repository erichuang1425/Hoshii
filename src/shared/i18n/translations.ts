const translations: Record<string, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'browseRoots.status.driveOffline': 'Drive disconnected',
    'browseRoots.status.driveOnline': 'Drive connected',
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
    'browseRoots.status.driveOffline': '硬碟未連接',
    'browseRoots.status.driveOnline': '硬碟已連接',
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
