import React from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Type,
  Zap,
  RotateCcw,
  RefreshCw,
  Accessibility,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useAppSettings } from '../context/AppSettingsContext';

const card = 'rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl';

const SettingsPage = () => {
  const {
    theme,
    setTheme,
    resolvedTheme,
    fontScale,
    setFontScale,
    fontScaleOptions,
    reducedMotion,
    setReducedMotion,
    resetToDefaults,
  } = useAppSettings();

  const themeButtons = [
    { id: 'light', label: 'Yorug‘', icon: Sun, desc: 'Oq fon' },
    { id: 'dark', label: 'Qorong‘i', icon: Moon, desc: 'Standart' },
    { id: 'system', label: 'Tizim', icon: Monitor, desc: 'Qurilma sozlamasi' },
  ];

  const fontLabels = {
    sm: 'Kichik',
    md: 'Oddiy',
    lg: 'Katta',
    xl: 'Juda katta',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 pb-8">
      <div className="flex flex-wrap items-start gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} /> Orqaga
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="text-yellow-500 shrink-0" size={26} />
            Sozlamalar
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Ko‘rinish, shrift va qulaylik — brauzeringizda saqlanadi
          </p>
        </div>
      </div>

      {/* Mavzu */}
      <section className={card}>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" /> Mavzu
          </h2>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Hozir:{' '}
            <span className="text-amber-400/90">
              {resolvedTheme === 'light' ? 'Yorug‘' : 'Qorong‘i'}
            </span>
            {theme === 'system' ? ' (tizim)' : ''}
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {themeButtons.map(({ id, label, icon: Icon, desc }) => {
              const on = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`min-h-[52px] rounded-xl border px-3 py-2.5 text-left transition-all ${
                    on
                      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="shrink-0" />
                    <span className="font-black text-sm">{label}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 pl-[26px]">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shrift */}
      <section className={card}>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Type size={16} className="text-yellow-500" /> Shrift o‘lchami
          </h2>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Butun sayt matni nisbatan kattalashadi yoki kichrayadi
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {fontScaleOptions.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFontScale(key)}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-black border transition-colors ${
                  fontScale === key
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                {fontLabels[key] || key}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Qulaylik */}
      <section className={card}>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Accessibility size={16} className="text-yellow-500" /> Qulaylik
          </h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500/40"
            />
            <span>
              <span className="font-black text-white text-sm block">Animatsiyani kamaytirish</span>
              <span className="text-xs text-slate-500 font-bold">
                O‘tishlar va aylanishlar sekinlashadi yoki o‘chiriladi
              </span>
            </span>
          </label>
        </div>
      </section>

      {/* Qayta tiklash & yangilash */}
      <section className={card}>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <RotateCcw size={16} className="text-yellow-500" /> Boshqalar
          </h2>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          <button
            type="button"
            onClick={resetToDefaults}
            className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 font-black text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Sozlamalarni standartga qaytarish
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 font-black text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Sahifani yangilash
          </button>
          <div className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-[11px] text-slate-500 font-bold leading-snug">
            <Info size={14} className="shrink-0 text-slate-500 mt-0.5" />
            <span>
              Sozlamalar faqat ushbu brauzerda saqlanadi. Boshqa qurilmada alohida tanlang.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
