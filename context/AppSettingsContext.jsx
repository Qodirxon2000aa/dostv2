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
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'dark';
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
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') return systemDark ? 'dark' : 'light';
    return theme;
  }, [theme, systemDark]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', resolvedTheme === 'light');
    root.setAttribute('data-theme', resolvedTheme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'light' ? '#f1f5f9' : '#0f172a');
    }

    document.body.style.backgroundColor = resolvedTheme === 'light' ? '#f1f5f9' : '#0f172a';
    document.body.style.color = resolvedTheme === 'light' ? '#0f172a' : '#f8fafc';
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE_MAP[fontScale] || '100%';
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  const setTheme = useCallback((next) => {
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
    setTheme('dark');
    setFontScale('md');
    setReducedMotion(false);
  }, [setTheme, setFontScale, setReducedMotion]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
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
