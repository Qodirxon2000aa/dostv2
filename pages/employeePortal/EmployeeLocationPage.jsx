import React, { useMemo, useState } from 'react';
import { MapPin, Clock3, Navigation, LocateFixed } from 'lucide-react';
import { resolveEmployeeRecord } from '../../utils/employeeSelf';
import { api } from '../../utils/api';
import { getCurrentPositionRobust } from '../../utils/geolocation';

const EmployeeLocationPage = ({ user, employees = [] }) => {
  const me = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const loc = me?.currentLocation || null;
  const [requesting, setRequesting] = useState(false);
  const [hint, setHint] = useState('');

  const updatedAt = useMemo(() => {
    if (!loc?.updatedAt) return '—';
    const d = new Date(loc.updatedAt);
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
  }, [loc]);

  const requestLocationNow = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHint('Bu brauzer geolokatsiyani qo‘llamaydi.');
      return;
    }
    setRequesting(true);
    setHint('');
    getCurrentPositionRobust()
      .then(async (position) => {
        try {
          const acc = Number(position?.coords?.accuracy || 0);
          await api.updateMyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
          });
          setHint(
            Number.isFinite(acc) && acc > 0
              ? `Lokatsiya yuborildi (aniqlik: ~${Math.round(acc)} m).`
              : 'Lokatsiya muvaffaqiyatli yuborildi.'
          );
        } catch (e) {
          setHint(`Serverga yuborilmadi: ${e.message}`);
        } finally {
          setRequesting(false);
        }
      })
      .catch((err) => {
        if (err?.code === 1) setHint('Browserda location ruxsatini Allow qiling.');
        else if (err?.code === 2) setHint('Lokatsiya aniqlanmadi. GPS yoqilganini tekshiring.');
        else if (err?.code === 3) setHint('Lokatsiya olishda timeout bo‘ldi.');
        else setHint('Lokatsiya olinmadi.');
        setRequesting(false);
      });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6">
        <h1 className="text-2xl font-black text-white italic">JOYLASHUVIM</h1>
        <p className="text-xs text-slate-500 font-bold mt-1">
          Lokatsiya avtomatik yuboriladi. GPS ruxsati yoqilgan bo‘lishi kerak.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-bold">
          <MapPin size={16} />
          {loc?.lat != null && loc?.lng != null
            ? 'Joylashuv xaritada ko‘rsatilmoqda'
            : 'Hali joylashuv yuborilmagan'}
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
          <Clock3 size={14} />
          Oxirgi yuborilgan vaqt: {updatedAt}
        </div>
        <button
          type="button"
          onClick={requestLocationNow}
          disabled={requesting}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-black uppercase disabled:opacity-50"
        >
          <LocateFixed size={14} />
          {requesting ? 'Olinmoqda...' : 'Lokatsiyani hozir olish'}
        </button>
        {hint ? <p className="text-[11px] text-amber-300 font-bold">{hint}</p> : null}
        {loc?.lat != null && loc?.lng != null && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2">
              <iframe
                title="Mening joylashuvim"
                src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=17&output=embed`}
                className="w-full h-[320px] rounded-lg border border-slate-800"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs font-black uppercase"
            >
              <Navigation size={14} />
              To‘liq xaritada ochish
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeLocationPage;
