import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE = {
  theme: 'app_theme',
  fontScale: 'app_font_scale',
  reducedMotion: 'app_reduced_motion',
};

export const THEME_OPTIONS = [
  {
    id: 'minimal-light',
    label: 'Minimal Light',
    subtitle: 'Clean UI',
    description: 'Soft white surfaces and clear typography',
    themeColor: '#f8fafc',
    bodyBg: '#f8fafc',
    bodyColor: '#0f172a',
  },
  {
    id: 'dark-premium',
    label: 'Dark Mode',
    subtitle: 'Premium feel',
    description: 'Deep contrast with elegant dark palette',
    themeColor: '#0b1220',
    bodyBg: '#0b1220',
    bodyColor: '#f8fafc',
  },
  {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    subtitle: 'Modern blur style',
    description: 'Frosted cards on glowing gradient backdrop',
    themeColor: '#0f172a',
    bodyBg: 'radial-gradient(circle at top left, #312e81 0%, #0f172a 45%, #111827 100%)',
    bodyColor: '#e2e8f0',
  },
  {
    id: 'corporate-blue',
    label: 'Corporate Blue',
    subtitle: 'Classic Business',
    description: 'Calm blue-gray corporate dashboard look',
    themeColor: '#102a43',
    bodyBg: '#102a43',
    bodyColor: '#e6f1ff',
  },
  {
    id: 'colorful-dashboard',
    label: 'Colorful Dashboard',
    subtitle: 'Startup style',
    description: 'Vibrant gradients and energetic accents',
    themeColor: '#1f1147',
    bodyBg: 'linear-gradient(145deg, #1f1147 0%, #311b92 35%, #0f172a 100%)',
    bodyColor: '#f8fafc',
  },
];

const THEME_IDS = new Set(THEME_OPTIONS.map((t) => t.id));
const DEFAULT_THEME = 'dark-premium';
const LEGACY_THEME_MAP = {
  light: 'minimal-light',
  dark: 'dark-premium',
  system: 'dark-premium',
};

const FONT_SCALE_MAP = {
  sm: '87.5%',
  md: '100%',
  lg: '112.5%',
  xl: '125%',
};

const AppSettingsContext = createContext(null);

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE.theme);
    if (THEME_IDS.has(v)) return v;
    if (LEGACY_THEME_MAP[v]) return LEGACY_THEME_MAP[v];
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

function readStoredFontScale() {
  try {
    const v = localStorage.getItem(STORAGE.fontScale);
    if (v === 'sm' || v === 'md' || v === 'lg' || v === 'xl') return v;
  } catch { /* ignore */ }
  return 'md';
}

function readStoredReducedMotion() {
  try {
    return localStorage.getItem(STORAGE.reducedMotion) === '1';
  } catch {
    return false;
  }
}

export function AppSettingsProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [fontScale, setFontScaleState] = useState(readStoredFontScale);
  const [reducedMotion, setReducedMotionState] = useState(readStoredReducedMotion);
  const resolvedTheme = theme;

  useEffect(() => {
    const currentTheme = THEME_OPTIONS.find((t) => t.id === resolvedTheme) || THEME_OPTIONS[1];
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    const classesToKeep = root.className
      .split(' ')
      .filter((c) => c && !c.startsWith('theme-'));
    root.className = classesToKeep.join(' ');
    root.classList.add(`theme-${resolvedTheme}`);
    if (resolvedTheme === 'minimal-light') {
      root.classList.add('theme-light');
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', currentTheme.themeColor);
    }

    document.body.style.background = currentTheme.bodyBg;
    document.body.style.color = currentTheme.bodyColor;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE_MAP[fontScale] || '100%';
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  const setTheme = useCallback((next) => {
    if (!THEME_IDS.has(next)) return;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE.theme, next);
    } catch { /* ignore */ }
  }, []);

  const setFontScale = useCallback((next) => {
    setFontScaleState(next);
    try {
      localStorage.setItem(STORAGE.fontScale, next);
    } catch { /* ignore */ }
  }, []);

  const setReducedMotion = useCallback((next) => {
    setReducedMotionState(next);
    try {
      if (next) localStorage.setItem(STORAGE.reducedMotion, '1');
      else localStorage.removeItem(STORAGE.reducedMotion);
    } catch { /* ignore */ }
  }, []);

  const resetToDefaults = useCallback(() => {
    setTheme(DEFAULT_THEME);
    setFontScale('md');
    setReducedMotion(false);
  }, [setTheme, setFontScale, setReducedMotion]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themeOptions: THEME_OPTIONS,
      fontScale,
      setFontScale,
      fontScaleOptions: ['sm', 'md', 'lg', 'xl'],
      reducedMotion,
      setReducedMotion,
      resetToDefaults,
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      fontScale,
      setFontScale,
      reducedMotion,
      setReducedMotion,
      resetToDefaults,
    ]
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return ctx;
}
