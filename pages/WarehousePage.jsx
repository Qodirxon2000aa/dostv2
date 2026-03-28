import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, History, Calendar, Trash2,
  X, AlertCircle, RefreshCw, Loader2, ChevronDown,
  ArrowDownToLine, RotateCcw,
} from 'lucide-react';
import { api } from '../utils/api';

const fmt = (n) => Number(n || 0).toLocaleString('uz-UZ');

const Warehouse = ({ objects = [], currentUser }) => {
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [materials, setMaterials]               = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [globalError, setGlobalError]           = useState('');
  const [modal, setModal]                       = useState(null);
  const [selectedMat, setSelectedMat]           = useState(null);

  const [addForm, setAddForm]     = useState({ name: '', unit: 'm', supplied: '' });
  const [addError, setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [useForm, setUseForm]     = useState({ quantity: '', note: '' });
  const [useError, setUseError]   = useState('');
  const [useLoading, setUseLoading] = useState(false);

  const [restockQty, setRestockQty]       = useState('');
  const [restockError, setRestockError]   = useState('');
  const [restockLoading, setRestockLoading] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const performer = currentUser?.name ? String(currentUser.name).trim() : 'Admin';

  const selectedObject = objects.find(o => String(o._id || o.id) === String(selectedObjectId));

  const fetchMaterials = useCallback(async () => {
    if (!selectedObjectId) { setMaterials([]); return; }
    setLoading(true);
    setGlobalError('');
    try {
      const res = await api.getWarehouse(selectedObjectId);
      const raw = res.data ?? res;
      setMaterials(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setGlobalError(err.message || 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedObjectId]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const logAction = (action) => {
    api.createLog(action, performer).catch(() => {});
  };

  const handleAdd = async () => {
    if (!addForm.name.trim())              { setAddError("Nomni kiriting!"); return; }
    if (!addForm.supplied || Number(addForm.supplied) <= 0) { setAddError("Miqdorni kiriting!"); return; }
    setAddLoading(true); setAddError('');
    try {
      const res = await api.createWarehouse({
        objectId: selectedObjectId,
        name:     addForm.name.trim(),
        unit:     addForm.unit,
        supplied: Number(addForm.supplied),
      });
      setMaterials(prev => [res.data || res, ...prev]);
      logAction(`Ombor [${selectedObject?.name}]: "${addForm.name.trim()}" qo'shildi`);
      closeModal();
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  const handleUse = async () => {
    const qty = parseFloat(useForm.quantity);
    if (!qty || qty <= 0)           { setUseError("Miqdorni kiriting!"); return; }
    if (qty > selectedMat.remaining) {
      setUseError(`Qoldiq yetarli emas! Maks: ${selectedMat.remaining} ${selectedMat.unit}`);
      return;
    }
    setUseLoading(true); setUseError('');
    try {
      const res = await api.useWarehouse(selectedMat._id, { quantity: qty, note: useForm.note.trim() });
      const updated = res.data || res;
      setMaterials(prev => prev.map(m => m._id === updated._id ? updated : m));
      logAction(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} ishlatildi`);
      closeModal();
    } catch (err) { setUseError(err.message); }
    finally { setUseLoading(false); }
  };

  const handleRestock = async () => {
    const qty = parseFloat(restockQty);
    if (!qty || qty <= 0) { setRestockError("Miqdorni kiriting!"); return; }
    setRestockLoading(true); setRestockError('');
    try {
      const res = await api.restockWarehouse(selectedMat._id, { quantity: qty });
      const updated = res.data || res;
      setMaterials(prev => prev.map(m => m._id === updated._id ? updated : m));
      logAction(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} kirim qilindi`);
      closeModal();
    } catch (err) { setRestockError(err.message); }
    finally { setRestockLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    setDeleteLoadingId(id);
    try {
      await api.deleteWarehouse(id);
      setMaterials(prev => prev.filter(m => m._id !== id));
      logAction(`Ombor [${selectedObject?.name}]: "${name}" o'chirildi`);
    } catch (err) { alert(err.message); }
    finally { setDeleteLoadingId(null); }
  };

  const openUse = (mat) => { setSelectedMat(mat); setUseForm({ quantity: '', note: '' }); setUseError(''); setModal('use'); };
  const openRestock = (mat) => { setSelectedMat(mat); setRestockQty(''); setRestockError(''); setModal('restock'); };
  const openHistory = (mat) => { setSelectedMat(mat); setModal('history'); };
  const closeModal = () => {
    setModal(null); setSelectedMat(null);
    setAddForm({ name: '', unit: 'm', supplied: '' }); setAddError(''); setAddLoading(false);
    setUseForm({ quantity: '', note: '' }); setUseError(''); setUseLoading(false);
    setRestockQty(''); setRestockError(''); setRestockLoading(false);
  };

  const matStats = (mat) => {
    const pct = mat.supplied > 0 ? (mat.remaining / mat.supplied) * 100 : 0;
    const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-yellow-500' : 'bg-rose-500';
    const textColor = pct > 50 ? 'text-emerald-400' : pct > 20 ? 'text-yellow-400' : 'text-rose-400';
    return { pct, barColor, textColor };
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 xs:px-4 sm:px-5 pb-10 pt-1 space-y-4 text-slate-100">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Package className="text-yellow-500" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight truncate">Ombor</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Material qoldiqlari</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={fetchMaterials}
              disabled={loading || !selectedObjectId}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              <span className="sm:hidden">Yangilash</span>
            </button>
            <button
              type="button"
              onClick={() => setModal('add')}
              disabled={!selectedObjectId}
              className="flex-[2] sm:flex-none min-h-[44px] px-4 sm:px-5 rounded-xl bg-yellow-500 text-slate-950 font-black text-sm uppercase tracking-wide hover:bg-yellow-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/15"
            >
              <Plus size={18} />
              <span className="truncate">Material qo&apos;shish</span>
            </button>
          </div>
        </div>

        {/* Obyekt */}
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Obyektni tanlang</label>
          <div className="relative max-w-full sm:max-w-md">
            <select
              value={selectedObjectId}
              onChange={e => setSelectedObjectId(e.target.value)}
              className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-11 py-3.5 text-sm font-bold text-white outline-none focus:border-yellow-500 min-h-[48px]"
            >
              <option value="">— Obyekt tanlang —</option>
              {objects.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {!selectedObjectId && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-14 sm:py-16 text-center">
            <Package className="mx-auto text-slate-700 mb-3" size={44} />
            <p className="text-slate-500 font-bold text-sm sm:text-base">Ombor ma&apos;lumotlari uchun obyekt tanlang</p>
          </div>
        )}

        {globalError && (
          <div className="flex flex-col xs:flex-row xs:items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span className="break-words">{globalError}</span>
            </div>
            <button
              type="button"
              onClick={fetchMaterials}
              className="shrink-0 px-3 py-2 rounded-lg bg-rose-500/20 text-rose-200 font-bold text-xs uppercase min-h-[40px]"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Ro'yxat + jadval */}
        {selectedObjectId && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5 border-b border-slate-800 bg-slate-900/50">
              <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
              <span className="font-black text-sm sm:text-base text-white truncate flex-1 min-w-0">{selectedObject?.name}</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg whitespace-nowrap">
                {materials.length} ta
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-bold">Yuklanmoqda...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="py-16 text-center text-slate-600 font-black uppercase text-xs sm:text-sm">
                Bu obyektda hali material yo&apos;q
              </div>
            ) : (
              <>
                {/* Mobil kartalar */}
                <div className="md:hidden p-3 space-y-3 max-h-[none]">
                  {materials.map(mat => {
                    const { pct, barColor, textColor } = matStats(mat);
                    const mid = mat._id || mat.id;
                    return (
                      <div
                        key={mid}
                        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 active:bg-slate-900/60"
                      >
                        <div className="flex justify-between gap-2 items-start min-w-0">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-white text-sm sm:text-base leading-tight break-words">{mat.name}</h3>
                            <span className="text-[10px] font-black text-slate-500 uppercase">{mat.unit}</span>
                          </div>
                          <div className={`text-right shrink-0 ${textColor}`}>
                            <p className="text-[9px] text-slate-500 font-black uppercase">Qoldiq</p>
                            <p className="text-lg font-black">{fmt(mat.remaining)}</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all rounded-full`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-slate-950 border border-slate-800 py-2 px-1">
                            <p className="text-[8px] text-slate-500 font-black uppercase">Kirim</p>
                            <p className="text-xs font-black text-white truncate">{fmt(mat.supplied)}</p>
                          </div>
                          <div className="rounded-lg bg-slate-950 border border-slate-800 py-2 px-1">
                            <p className="text-[8px] text-slate-500 font-black uppercase">Ishlat.</p>
                            <p className="text-xs font-black text-rose-400 truncate">{fmt(mat.used)}</p>
                          </div>
                          <div className="rounded-lg bg-slate-950 border border-slate-800 py-2 px-1">
                            <p className="text-[8px] text-slate-500 font-black uppercase">%</p>
                            <p className="text-xs font-black text-slate-300">{Math.round(pct)}%</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openUse(mat)}
                            className="min-h-[44px] rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <ArrowDownToLine size={15} /> Ishlatish
                          </button>
                          <button
                            type="button"
                            onClick={() => openRestock(mat)}
                            className="min-h-[44px] rounded-xl bg-yellow-500/15 border border-yellow-500/25 text-yellow-500 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <RotateCcw size={15} /> Kirim
                          </button>
                          <button
                            type="button"
                            onClick={() => openHistory(mat)}
                            className="min-h-[44px] rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <History size={15} /> Tarix
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(mid, mat.name)}
                            disabled={deleteLoadingId === mid}
                            className="min-h-[44px] rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-black text-xs uppercase flex items-center justify-center active:scale-[0.98] disabled:opacity-50"
                          >
                            {deleteLoadingId === mid ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop jadval */}
                <div className="hidden md:block overflow-x-auto -mx-px">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead className="bg-slate-900/80 border-b border-slate-800">
                      <tr>
                        {['Material', 'Birlik', 'Kirim', 'Ishlatilgan', 'Qoldiq', ''].map((h, i) => (
                          <th
                            key={h || i}
                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 ${
                              i >= 2 && i <= 4 ? 'text-right' : ''
                            } ${i === 4 ? 'text-emerald-500/90' : ''}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((mat, idx) => {
                        const { pct, barColor, textColor } = matStats(mat);
                        const mid = mat._id || mat.id;
                        return (
                          <tr
                            key={mid}
                            className={`border-t border-slate-900 ${idx % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                          >
                            <td className="px-4 py-3 align-top max-w-[200px]">
                              <div className="font-bold text-sm text-white mb-1.5 break-words">{mat.name}</div>
                              <div className="h-1.5 bg-slate-800 rounded-full max-w-[140px]">
                                <div
                                  className={`h-full rounded-full ${barColor}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{mat.unit}</td>
                            <td className="px-4 py-3 text-right font-bold text-sm">{fmt(mat.supplied)}</td>
                            <td className="px-4 py-3 text-right font-bold text-sm text-rose-400">{fmt(mat.used)}</td>
                            <td className={`px-4 py-3 text-right font-black text-base ${textColor}`}>{fmt(mat.remaining)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => openUse(mat)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black uppercase"
                                >
                                  <ArrowDownToLine size={12} /> Ishlatish
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRestock(mat)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-500 text-xs font-black uppercase"
                                >
                                  <RotateCcw size={12} /> Kirim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openHistory(mat)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-black uppercase"
                                >
                                  <History size={12} /> Tarix
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(mid, mat.name)}
                                  disabled={deleteLoadingId === mid}
                                  className="p-2 rounded-lg bg-rose-500/10 text-rose-400"
                                >
                                  {deleteLoadingId === mid ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modallar */}
      {modal === 'add' && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden shrink-0" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white">Yangi material</h2>
                  <p className="text-yellow-500 text-xs font-bold truncate">{selectedObject?.name}</p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Material nomi</label>
                <input
                  className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-yellow-500"
                  type="text"
                  placeholder="Kabel 2.5mm²"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Birlik</label>
                  <select
                    className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-yellow-500"
                    value={addForm.unit}
                    onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}
                  >
                    <option value="m">metr (m)</option>
                    <option value="dona">dona</option>
                    <option value="kg">kg</option>
                    <option value="m²">m²</option>
                    <option value="l">litr (l)</option>
                    <option value="ta">ta</option>
                    <option value="sm">sm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Miqdor</label>
                  <input
                    className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-yellow-500"
                    type="number"
                    placeholder="0"
                    min="0"
                    inputMode="decimal"
                    value={addForm.supplied}
                    onChange={e => setAddForm(p => ({ ...p, supplied: e.target.value }))}
                  />
                </div>
              </div>
              {addError && (
                <div className="flex items-center gap-2 text-rose-400 text-sm">
                  <AlertCircle size={16} /> {addError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addLoading && <Loader2 className="animate-spin" size={16} />}
                  Qo&apos;shish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'use' && selectedMat && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-md max-h-[90dvh] rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-lg font-black text-white pr-2 break-words">{selectedMat.name}</h2>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
              <p className="text-emerald-400 text-sm font-bold">
                Qoldiq: <span className="text-white">{fmt(selectedMat.remaining)}</span> {selectedMat.unit}
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Ishlatilgan miqdor</label>
                <input
                  className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-emerald-500"
                  type="number"
                  step="0.1"
                  min="0.1"
                  inputMode="decimal"
                  placeholder={`Maks: ${selectedMat.remaining}`}
                  value={useForm.quantity}
                  onChange={e => setUseForm(p => ({ ...p, quantity: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Izoh</label>
                <input
                  className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-emerald-500"
                  type="text"
                  placeholder="Masalan: 2-qavat"
                  value={useForm.note}
                  onChange={e => setUseForm(p => ({ ...p, note: e.target.value }))}
                />
              </div>
              {useError && (
                <div className="flex items-start gap-2 text-rose-400 text-sm break-words">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" /> {useError}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">Bekor</button>
                <button
                  type="button"
                  onClick={handleUse}
                  disabled={useLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {useLoading && <Loader2 className="animate-spin" size={16} />}
                  Ishlatish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'restock' && selectedMat && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-md max-h-[90dvh] rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-lg font-black text-white pr-2 break-words">{selectedMat.name}</h2>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
              <p className="text-yellow-500 text-sm font-bold">
                Qoldiq: <span className="text-white">{fmt(selectedMat.remaining)}</span> {selectedMat.unit}
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Kirim miqdori</label>
                <input
                  className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-yellow-500"
                  type="number"
                  step="0.1"
                  min="0.1"
                  inputMode="decimal"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  autoFocus
                />
              </div>
              {restockError && (
                <div className="flex items-center gap-2 text-rose-400 text-sm">
                  <AlertCircle size={16} /> {restockError}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">Bekor</button>
                <button
                  type="button"
                  onClick={handleRestock}
                  disabled={restockLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {restockLoading && <Loader2 className="animate-spin" size={16} />}
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'history' && selectedMat && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden shrink-0" />
            <div className="px-4 sm:px-6 pt-4 flex justify-between items-start gap-2 border-b border-slate-800 pb-3 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white break-words">{selectedMat.name}</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Kirim: <span className="text-slate-200 font-bold">{fmt(selectedMat.supplied)}</span>
                  {' · '}
                  Ishlatilgan: <span className="text-rose-400 font-bold">{fmt(selectedMat.used)}</span>
                  {' · '}
                  Qoldiq: <span className="text-emerald-400 font-bold">{fmt(selectedMat.remaining)}</span>
                  {' '}
                  {selectedMat.unit}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-2">
              {(!selectedMat.usages || selectedMat.usages.length === 0) ? (
                <p className="text-center text-slate-600 py-12 font-bold text-sm">Hali ishlatilmagan</p>
              ) : (
                [...selectedMat.usages].reverse().map(u => (
                  <div
                    key={u._id || u.date + u.quantity}
                    className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <Calendar className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2 items-baseline">
                        <span className="text-xs text-slate-500 font-bold">{u.date}</span>
                        <span className="text-emerald-400 font-black text-sm whitespace-nowrap">
                          {fmt(u.quantity)} {selectedMat.unit}
                        </span>
                      </div>
                      {u.note && <p className="text-xs text-slate-400 mt-1 break-words">{u.note}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Warehouse;
