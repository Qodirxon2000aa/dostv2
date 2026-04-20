import React, { useMemo, useState } from 'react';
import { CheckCircle2, CalendarCheck, XCircle, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { filterWorkforceEmployees } from '../utils/employeeRoles';

const Attendance = ({ employees, attendance, objects = [], onLog, userRole, onRefresh, canMutate = true }) => {
  const workforce = useMemo(() => filterWorkforceEmployees(employees), [employees]);
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  /** { empId, record } — bor qilishdan oldin obyekt tanlash */
  const [presentModal, setPresentModal] = useState(null);
  const [objectPickId, setObjectPickId] = useState('');

  const objectList = useMemo(
    () => (Array.isArray(objects) ? objects : []).filter((o) => o && (o._id || o.id)),
    [objects]
  );
  const safeDateFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const safeDateTo = dateFrom <= dateTo ? dateTo : dateFrom;
  const actionDate = selectedDate;

  const openPresentModal = (empId, record) => {
    if (objectList.length === 0) {
      setError("Tizimda obyekt yo‘q. Avval «Obyektlar» bo‘limida obyekt qo‘shing.");
      return;
    }
    const pre =
      record?.objectId?._id != null
        ? String(record.objectId._id)
        : record?.objectId != null
          ? String(record.objectId)
          : '';
    const preName = record?.objectName || '';
    const match =
      objectList.find((o) => String(o._id || o.id) === pre) ||
      (preName ? objectList.find((o) => (o.name || '') === preName) : null);
    const initial = match ? String(match._id || match.id) : '';
    setObjectPickId(initial);
    setPresentModal({ empId, record: record || null });
  };

  const markAttendance = async (empId, status, extra = {}) => {
    setLoading(empId);
    setError(null);
    
    try {
      console.log('📤 So\'rov yuborilmoqda:', {
        employeeId: empId,
        date: selectedDate,
        status,
        markedBy: 'admin',
        ...extra,
      });

      const response = await api.upsertAttendance({
        employeeId: empId,
        date: actionDate,
        status,
        markedBy: 'admin',
        ...extra,
      });

      console.log('✅ Javob keldi:', response);
      
      const emp = workforce.find((e) => e._id === empId || e.id === empId);
      const logMessage = `${emp?.name} - ${status === 'PRESENT' ? 'BOR' : "YO'Q"} deb tasdiqlandi`;
      onLog(logMessage);
      
      // Ma'lumotlarni yangilash
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      }
      
    } catch (err) {
      console.error('❌ Xatolik:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server bilan aloqa yo\'q';
      setError(errorMsg);
      onLog(`XATOLIK: ${errorMsg}`);
    } finally {
      setLoading(null);
    }
  };

  const confirmPresentWithObject = async () => {
    if (!presentModal) return;
    const { empId } = presentModal;
    if (!objectPickId) {
      setError('Iltimos, obyektni tanlang.');
      return;
    }
    const obj = objectList.find((o) => String(o._id || o.id) === String(objectPickId));
    if (!obj) {
      setError('Obyekt topilmadi.');
      return;
    }
    setPresentModal(null);
    await markAttendance(empId, 'PRESENT', {
      objectId: String(obj._id || obj.id),
      objectName: obj.name || 'Nomaʼlum',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Xatolik xabari */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500 rounded-[2rem] p-5 flex items-start gap-4 animate-in slide-in-from-top duration-300">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <p className="text-rose-400 font-black text-sm uppercase">XATOLIK YUZ BERDI</p>
            <p className="text-rose-300 text-xs mt-1 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-300 transition-colors font-black text-lg"
          >
            ✕
          </button>
        </div>
      )}

      {presentModal && canMutate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPresentModal(null);
          }}
        >
          <div className="w-full max-w-md rounded-[2rem] border border-emerald-500/30 bg-slate-950 p-6 shadow-2xl shadow-emerald-900/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Building2 className="text-emerald-400" size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">Obyekt tanlang</p>
                <p className="text-white font-black text-lg">
                  {workforce.find((e) => (e._id || e.id) === presentModal.empId)?.name || 'Xodim'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{actionDate}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-3 font-medium leading-relaxed">
              Ishlagan kun qaysi obyekt bo‘yicha ekanini tanlang — davomat shu obyektga bog‘lanadi.
            </p>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Obyekt</label>
            <select
              value={objectPickId}
              onChange={(e) => setObjectPickId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500/40 mb-6"
            >
              <option value="">— Tanlang —</option>
              {objectList.map((o) => (
                <option key={o._id || o.id} value={String(o._id || o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPresentModal(null)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-700 text-slate-300 font-black text-xs uppercase hover:bg-slate-900 transition-colors"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={confirmPresentWithObject}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg shadow-emerald-900/30 transition-colors"
              >
                Bor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sarlavha */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-white italic">
            DAVOMAT <span className="text-yellow-500 underline">SO'ROVLARI</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Faqat ishchilar — administratorlar nazoratchi, davomatda chiqmaydi
          </p>
        </div>
        <div className="w-full md:w-auto grid gap-3 md:gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/90 p-3 sm:p-2.5 rounded-2xl border border-yellow-500/20">
            <div className="flex items-center gap-2 sm:min-w-[120px]">
              <CalendarCheck className="text-yellow-500 ml-1 sm:ml-2" size={18} />
              <span className="text-[10px] text-yellow-400/90 uppercase font-black tracking-wide">Bitta sana</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto min-h-[46px] bg-slate-950/70 bg-[linear-gradient(to_right,rgba(2,6,23,0.65)_0%,rgba(2,6,23,0.65)_78%,rgba(30,41,59,0.95)_100%)] border border-slate-700 rounded-xl px-3 py-2 pr-10 text-white outline-none font-black text-sm sm:text-base focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:contrast-200"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/90 p-3 sm:p-2.5 rounded-2xl border border-sky-500/25">
            <span className="text-[10px] text-sky-400/90 uppercase font-black tracking-wide ml-1 sm:ml-2 sm:min-w-[48px]">Davr</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-auto min-h-[46px] bg-slate-950/70 bg-[linear-gradient(to_right,rgba(2,6,23,0.65)_0%,rgba(2,6,23,0.65)_78%,rgba(30,41,59,0.95)_100%)] border border-slate-700 rounded-xl px-3 py-2 pr-10 text-white outline-none font-black text-sm sm:text-base focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:contrast-200"
            />
            <span className="text-slate-500 text-xs font-black text-center sm:text-left">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-auto min-h-[46px] bg-slate-950/70 bg-[linear-gradient(to_right,rgba(2,6,23,0.65)_0%,rgba(2,6,23,0.65)_78%,rgba(30,41,59,0.95)_100%)] border border-slate-700 rounded-xl px-3 py-2 pr-10 text-white outline-none font-black text-sm sm:text-base focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:contrast-200"
            />
          </div>
        </div>
      </div>

      {/* Xodimlar ro'yxati */}
      <div className="grid gap-4">
        {workforce.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="font-black uppercase text-sm">Xodimlar topilmadi</p>
          </div>
        ) : (
          workforce.map((emp) => {
            const empId = emp._id || emp.id;
            const recordsInRange = attendance
              .filter((a) => {
                const recEmpId = a.employeeId?._id || a.employeeId;
                if (String(recEmpId) !== String(empId)) return false;
                const d = String(a.date || '');
                return d >= safeDateFrom && d <= safeDateTo;
              })
              .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

            const record = attendance.find(
              (a) => (a.employeeId?._id || a.employeeId) === empId && a.date === selectedDate
            );

            const workedObjectRows = recordsInRange
              .filter((r) => r.status === 'PRESENT' && (r.objectName || r.objectId))
              .map((r) => ({
                date: r.date,
                objectName: r.objectName || 'Nomaʼlum obyekt',
              }));

            const isPending = record?.status === 'PENDING';
            const isPresent = record?.status === 'PRESENT';
            const isAbsent  = record?.status === 'ABSENT';
            const hasRecord = !!record;
            const isLoading = loading === empId;

            return (
              <div
                key={empId}
                className={`p-6 rounded-[2.5rem] border transition-all duration-300 ${
                  isPending ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                  : 'bg-slate-950 border-slate-900'
                } ${isLoading ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-5 w-full">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl border transition-all duration-300 ${
                        isPresent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20'
                        : isAbsent ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        emp.name?.[0] || '?'
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xl font-black transition-colors ${hasRecord ? 'text-white' : 'text-slate-600'}`}>
                        {emp.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black bg-slate-900 px-2 py-1 rounded">
                          {emp.position}
                        </span>
                        {record?.objectName && (
                          <span className="flex items-center gap-1 text-[9px] text-blue-400 font-black uppercase">
                            <Building2 size={12} /> {record.objectName}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 uppercase font-black">
                          Tanlangan kunlarda {workedObjectRows.length} ta ish
                        </span>
                        {isPending && (
                          <span className="flex items-center gap-1 text-[9px] text-yellow-500 font-black uppercase animate-pulse">
                            ⏱ KUTILMOQDA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1 lg:mt-0 w-full lg:w-auto">
                    {canMutate ? (
                      <>
                    <button
                      onClick={() => openPresentModal(empId, record)}
                      disabled={isLoading}
                      className={`flex-1 lg:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                        isPresent 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-900 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50'
                      } ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {isPending ? 'TASDIQLASH' : 'BOR'}
                    </button>
                    
                    <button
                      onClick={() => markAttendance(empId, 'ABSENT')}
                      disabled={isLoading}
                      className={`flex-1 lg:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                        isAbsent 
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                          : 'bg-slate-900 text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50'
                      } ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      YO'Q
                    </button>
                      </>
                    ) : (
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-wide px-2">
                        {selectedDate} • {isPresent ? 'BOR' : isAbsent ? "YO'Q" : isPending ? 'KUTILMOQDA' : '—'}
                      </div>
                    )}
                  </div>
                </div>

                {!canMutate && (
                  <div className="w-full mt-4 pt-4 border-t border-slate-800">
                    <details className="group">
                      <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-wide text-sky-400 flex items-center justify-between">
                        <span>Ishlagan obyektlari (davr bo‘yicha)</span>
                        <span className="text-slate-500 group-open:hidden">Ochish</span>
                        <span className="text-slate-500 hidden group-open:inline">Yopish</span>
                      </summary>
                      <div className="mt-3 space-y-2">
                        {workedObjectRows.length === 0 ? (
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Tanlangan davrda obyekt bo‘yicha BOR yozuv topilmadi.
                          </p>
                        ) : (
                          workedObjectRows.map((row, idx) => (
                            <div
                              key={`${empId}_${row.date}_${row.objectName}_${idx}`}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                            >
                              <span className="text-[11px] font-black text-slate-200">{row.objectName}</span>
                              <span className="text-[10px] font-bold text-slate-500">{row.date}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Attendance;