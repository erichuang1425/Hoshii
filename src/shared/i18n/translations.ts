const translations: Record<string, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'browseRoots.status.driveOffline': 'Drive disconnected',
    'browseRoots.status.driveOnline': 'Drive connected',
  },
  'zh-TW': {
    'settings.title': '設定',
    'browseRoots.status.driveOffline': '硬碟未連接',
    'browseRoots.status.driveOnline': '硬碟已連接',
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
