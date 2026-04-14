import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollText, Search, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

const formatLogDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const LogsPage = ({ logs: propLogs = [], onRefresh }) => {
  const [logs, setLogs] = useState(propLogs);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLogs({ limit: 5000 });
      const raw = res.data ?? res.logs ?? res;
      setLogs(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Loglar yuklanmadi:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setLogs(propLogs);
  }, [propLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const action = String(l.action || '').toLowerCase();
      const performer = String(l.performer || '').toLowerCase();
      return action.includes(q) || performer.includes(q);
    });
  }, [logs, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ta = new Date(a.createdAt || a.created_at || 0).getTime();
        const tb = new Date(b.createdAt || b.created_at || 0).getTime();
        if (tb !== ta) return tb - ta;
        return String(b._id || b.id || '').localeCompare(String(a._id || a.id || ''));
      }),
    [filtered]
  );

  const thClass =
    'text-left text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-3 border-b border-slate-800 whitespace-nowrap';
  const tdClass = 'px-3 py-3 align-top border-b border-slate-800/80';

  return (
    <div className="space-y-5 pb-10">
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <ScrollText className="text-amber-400" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
                So'nggi amallar <span className="text-amber-400">jadvali</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Tartib: yangi → eski · sana, vaqt, kim, amal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await loadLogs();
              await onRefresh?.();
            }}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500/20 active:scale-[0.99] disabled:opacity-40 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yangilash
          </button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Amal yoki foydalanuvchi bo‘yicha qidirish..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-white pl-9 pr-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
          />
        </div>
        <p className="text-[9px] text-slate-600 font-bold mt-2">
          Jami: <span className="text-slate-400">{sorted.length}</span> ta amal
        </p>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-white font-black uppercase text-xs tracking-widest italic">Jadval</p>
          {loading && <RefreshCw size={14} className="text-slate-600 animate-spin" />}
        </div>

        <div className="max-h-[min(70vh,36rem)] overflow-auto custom-scroll">
          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText size={28} className="text-slate-800 mx-auto mb-3" />
              <p className="text-slate-600 font-black uppercase text-xs">
                {search ? 'Topilmadi' : 'Hozircha log yo‘q'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900/98 backdrop-blur-sm shadow-[0_1px_0_0_rgb(30_41_59)]">
                <tr>
                  <th className={`${thClass} w-12 text-center`}>#</th>
                  <th className={`${thClass} w-[1%] whitespace-nowrap`}>Sana va vaqt</th>
                  <th className={`${thClass} w-[140px]`}>Kim</th>
                  <th className={thClass}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((log, index) => {
                  const id = log._id || log.id;
                  const ts = log.createdAt || log.created_at;
                  return (
                    <tr
                      key={id || `row-${index}`}
                      className="hover:bg-slate-900/50 transition-colors even:bg-slate-950 odd:bg-slate-900/20"
                    >
                      <td className={`${tdClass} text-center`}>
                        <span className="text-slate-600 font-black tabular-nums text-xs">{index + 1}</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className="text-amber-400 font-black tabular-nums text-xs">
                          {formatLogDateTime(ts)}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-yellow-500/95 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg max-w-full truncate">
                          {log.performer || '—'}
                        </span>
                      </td>
                      <td className={`${tdClass} text-slate-200 font-bold leading-snug break-words min-w-0`}>
                        {log.action || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
