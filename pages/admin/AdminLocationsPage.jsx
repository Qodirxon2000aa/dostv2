import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Clock3, LocateFixed } from 'lucide-react';
import { ensureRealtimeSocket } from '../../utils/realtime';

const formatTime = (value) => {
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

const AdminLocationsPage = ({ employees = [] }) => {
  const [liveRows, setLiveRows] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const initial = (employees || []).filter((e) => e?.currentLocation?.updatedAt);
    setLiveRows(initial);
    if (!selectedId && initial.length > 0) {
      setSelectedId(String(initial[0]._id || initial[0].id));
    }
  }, [employees, selectedId]);

  useEffect(() => {
    const s = ensureRealtimeSocket();
    if (!s) return undefined;
    s.emit('join-admin');
    const onLocation = (payload) => {
      if (!payload?.employeeId || !payload?.currentLocation?.updatedAt) return;
      setLiveRows((prev) => {
        const idx = prev.findIndex((x) => String(x._id || x.id) === String(payload.employeeId));
        if (idx === -1) {
          return [
            {
              _id: payload.employeeId,
              name: payload.name || 'Xodim',
              position: payload.position || '',
              status: payload.status || 'ACTIVE',
              currentLocation: payload.currentLocation,
            },
            ...prev,
          ];
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          name: payload.name || next[idx].name,
          currentLocation: payload.currentLocation,
        };
        return next;
      });
    };
    s.on('employee:location', onLocation);
    return () => s.off('employee:location', onLocation);
  }, []);

  const withLocation = useMemo(
    () =>
      (liveRows || [])
        .filter((e) => e?.currentLocation?.updatedAt && Number.isFinite(Number(e?.currentLocation?.lat)) && Number.isFinite(Number(e?.currentLocation?.lng)))
        .sort(
          (a, b) =>
            new Date(b.currentLocation.updatedAt).getTime() -
            new Date(a.currentLocation.updatedAt).getTime()
        ),
    [liveRows]
  );

  const selectedEmployee = useMemo(() => {
    if (withLocation.length === 0) return null;
    return (
      withLocation.find((e) => String(e._id || e.id) === String(selectedId)) ||
      withLocation[0]
    );
  }, [withLocation, selectedId]);

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6">
        <h1 className="text-2xl font-black text-white italic">JOYLASHUV</h1>
        <p className="text-xs text-slate-500 font-bold mt-1">
          Xodimlar qurilmasidan kelayotgan oxirgi geolokatsiya nuqtalari.
        </p>
      </div>

      {selectedEmployee ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 overflow-hidden">
          <iframe
            title="Jonli joylashuv xaritasi"
            src={`https://maps.google.com/maps?q=${selectedEmployee.currentLocation.lat},${selectedEmployee.currentLocation.lng}&z=16&output=embed`}
            className="w-full h-[320px] rounded-xl border border-slate-800"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <p className="text-[11px] text-slate-500 font-bold mt-2 px-1">
            Xarita markazi: {selectedEmployee.name}
          </p>
        </div>
      ) : null}

      {withLocation.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-center">
          <p className="text-slate-400 font-black uppercase text-sm">Hali lokatsiya kelmadi</p>
          <p className="text-slate-600 text-xs mt-2">
            Xodimning GPS ruxsati yoqilgach, shu yerda ko‘rinadi.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {withLocation.map((emp) => {
            const id = emp._id || emp.id;
            const loc = emp.currentLocation || {};
            const mapUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
            return (
              <div
                key={id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-white font-black text-base">{emp.name}</p>
                    <p className="text-[10px] uppercase text-slate-500 font-black tracking-wide">
                      {emp.position || 'Xodim'}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-1 rounded-lg border border-slate-700 text-slate-300">
                    {emp.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-slate-500 font-bold mb-1 flex items-center gap-1">
                      <LocateFixed size={13} /> Aniqlik
                    </p>
                    <p className="text-slate-100 font-black">
                      {loc.accuracy == null ? '—' : `${Math.round(loc.accuracy)} m`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-slate-500 font-bold mb-1 flex items-center gap-1">
                      <Clock3 size={13} /> Oxirgi yangilanish
                    </p>
                    <p className="text-slate-100 font-black">{formatTime(loc.updatedAt)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2">
                  <div className="text-[10px] text-slate-500 font-black uppercase mb-2 px-1 flex items-center gap-1">
                    <MapPin size={12} />
                    Mini xarita
                  </div>
                  <iframe
                    title={`Xodim xaritasi ${emp.name}`}
                    src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`}
                    className="w-full h-[220px] rounded-lg border border-slate-800"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId(String(id))}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border ${
                      String(selectedId) === String(id)
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                        : 'border-slate-700 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <LocateFixed size={14} />
                    Xaritada ko‘rsatish
                  </button>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 w-fit px-3 py-2 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs font-black uppercase tracking-wide"
                  >
                    <Navigation size={14} />
                    Xaritada ochish
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLocationsPage;
