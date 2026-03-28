import React from 'react';

export const TabBtn = ({ active, onClick, icon, label, badge, accent }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl font-black text-[9px] uppercase transition-all whitespace-nowrap ${
      active
        ? accent
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-blue-600 text-white shadow-lg'
        : accent
          ? 'text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20'
          : 'text-slate-500 hover:text-white hover:bg-slate-900'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge > 0 && (
      <span
        className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-yellow-500/20 text-yellow-500'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);

export const Empty = ({ text }) => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
    {text}
  </div>
);
