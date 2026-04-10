import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Plus, History, Calendar, Trash2,
  X, AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronUp,
  ArrowDownToLine, RotateCcw, Contact2, Receipt,
} from 'lucide-react';
import { api } from '../utils/api';

const fmt = (n) => Number(n || 0).toLocaleString('uz-UZ');

const materialTotalAmount = (mat) => {
  const t = mat?.totalAmount;
  if (t != null && !Number.isNaN(Number(t))) return Number(t);
  return (mat?.restocks ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
};

const sortKirimlarChronological = (restocks, m, lineSum) => {
  const raw = [...(restocks || [])];
  let rows = raw
    .map((r, idx) => ({
      date: r.date || '',
      quantity: Number(r.quantity) || 0,
      amount: r.amount != null && r.amount !== '' && !Number.isNaN(Number(r.amount))
        ? Number(r.amount)
        : null,
      note: (r.note || '').trim(),
      idx,
    }))
    .sort((a, b) => {
      const c = String(a.date).localeCompare(String(b.date));
      if (c !== 0) return c;
      return a.idx - b.idx;
    });
  if (rows.length === 0 && ((Number(m.supplied) || 0) > 0 || lineSum > 0)) {
    rows = [{
      date: '',
      quantity: Number(m.supplied) || 0,
      amount: lineSum,
      note: '',
      idx: 0,
    }];
  }
  return rows;
};

/** Faqat bitta material (tanlangan qator) bo‘yicha hisob modali */
const buildSingleMaterialCheck = (mat) => {
  if (!mat) return { sections: [], grandTotalSum: 0 };
  const sum = materialTotalAmount(mat);
  const section = {
    key: String(mat._id || mat.id || 'material'),
    name: (mat.supplierName || '').trim() || "Beruvchi ko'rsatilmagan",
    totalSum: sum,
    lines: [{
      materialName: mat.name,
      unit: (mat.unit || '').trim() || '—',
      totalSupplied: Number(mat.supplied) || 0,
      lineSum: sum,
      kirimlar: sortKirimlarChronological(mat.restocks, mat, sum),
    }],
  };
  return { sections: [section], grandTotalSum: sum };
};

/** linkedObjectIds bo'sh yoki yo'q = barcha omborlarda; to'ldirilsa faqat shu obyektlarda */
const supplierLinkedToObject = (supplier, objectId) => {
  if (!supplier || !objectId) return false;
  const links = supplier.linkedObjectIds;
  if (!links || !Array.isArray(links) || links.length === 0) return true;
  return links.some((id) => String(id) === String(objectId));
};

const buildMaterialsAggregateCheck = (materials) => {
  if (!materials?.length) return { sections: [], grandTotalSum: 0 };
  const map = new Map();
  for (const m of materials) {
    const key = m.supplierId
      ? `id:${String(m.supplierId)}`
      : `leg:${(m.supplierName || '').trim()}|${(m.supplierPhone || '').trim()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: (m.supplierName || '').trim() || "Beruvchi ko'rsatilmagan",
        lines: [],
        totalSum: 0,
      });
    }
    const g = map.get(key);
    const sum = materialTotalAmount(m);
    g.totalSum += sum;
    g.lines.push({
      materialName: m.name,
      unit: (m.unit || '').trim() || '—',
      totalSupplied: Number(m.supplied) || 0,
      lineSum: sum,
      kirimlar: sortKirimlarChronological(m.restocks, m, sum),
    });
  }
  const sections = Array.from(map.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'uz'));
  const grandTotalSum = sections.reduce((s, x) => s + x.totalSum, 0);
  return { sections, grandTotalSum };
};

const WarehouseCheckSections = ({ sections, grandTotalSum, emptyText }) => {
  if (!sections?.length) {
    return (
      <p className="text-center text-slate-500 py-8 sm:py-12 font-bold text-sm">{emptyText}</p>
    );
  }
  return (
    <>
      {sections.map((sec) => (
        <div
          key={sec.key}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
        >
          <div className="px-3 sm:px-4 py-2.5 bg-slate-900 border-b border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Beruvchi</p>
            <p className="font-black text-white text-sm mt-0.5">{sec.name}</p>
          </div>

          <div className="p-3 sm:p-4 space-y-4">
            {sec.lines.map((ln, mi) => (
              <div key={mi} className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/40">
                  <p className="font-bold text-white text-sm break-words">{ln.materialName}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-bold">
                    Birlik: <span className="text-slate-300">{ln.unit}</span>
                    <span className="text-slate-600"> · </span>
                    Jami kirim: <span className="text-yellow-500/90">{fmt(ln.totalSupplied)}</span> {ln.unit}
                  </p>
                </div>

                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <span className="col-span-3 flex items-center gap-1">
                    <Calendar size={11} className="shrink-0 opacity-70" /> Sana
                  </span>
                  <span className="col-span-4">Miqdor</span>
                  <span className="col-span-5 text-right">Summa</span>
                </div>

                <ul className="divide-y divide-slate-800">
                  {ln.kirimlar.map((k, ki) => (
                    <li key={ki}>
                      <div className="px-3 py-2.5 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center">
                        <div className="sm:col-span-3 flex items-center gap-2 text-xs text-slate-300 font-bold tabular-nums">
                          <Calendar size={14} className="text-yellow-500/80 shrink-0 sm:hidden" />
                          {k.date || '—'}
                        </div>
                        <div className="mt-1 sm:mt-0 sm:col-span-4 text-sm text-white font-black">
                          +{fmt(k.quantity)} <span className="text-slate-500 font-bold text-xs">{ln.unit}</span>
                        </div>
                        <div className="mt-1 sm:mt-0 sm:col-span-5 text-right text-sm font-black text-amber-400 tabular-nums">
                          {k.amount != null ? `${fmt(k.amount)} so‘m` : '—'}
                        </div>
                        {k.note ? (
                          <p className="sm:col-span-12 text-[10px] text-slate-500 italic mt-1">{k.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="px-3 py-2 flex justify-between items-baseline border-t border-slate-800 bg-slate-900/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Mahsulot bo‘yicha</span>
                  <span className="text-sm font-black text-amber-400 tabular-nums">{fmt(ln.lineSum)} so‘m</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 sm:px-4 py-2.5 flex justify-between items-baseline border-t border-slate-800 bg-slate-900/80">
            <span className="text-xs font-black text-slate-400 uppercase">Beruvchi jami</span>
            <span className="text-base font-black text-white tabular-nums">{fmt(sec.totalSum)} so‘m</span>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex flex-wrap justify-between items-baseline gap-2">
        <span className="text-sm font-black text-slate-300 uppercase tracking-tight">Umumiy jami</span>
        <span className="text-lg font-black text-amber-400 tabular-nums">{fmt(grandTotalSum)} so‘m</span>
      </div>

      <p className="text-[11px] text-slate-600 text-center leading-relaxed">
        Kirimlar sanasi bo‘yicha tartiblangan. Summalar ombor yozuvlari asosida.
      </p>
    </>
  );
};

const WAREHOUSE_LAST_SUPPLIER_ID = 'warehouse_last_supplier_id';

const getStoredSupplierId = () => {
  try {
    return localStorage.getItem(WAREHOUSE_LAST_SUPPLIER_ID) || '';
  } catch {
    return '';
  }
};

const setStoredSupplierId = (id) => {
  try {
    const v = String(id ?? '').trim();
    if (v) localStorage.setItem(WAREHOUSE_LAST_SUPPLIER_ID, v);
    else localStorage.removeItem(WAREHOUSE_LAST_SUPPLIER_ID);
  } catch { /* ignore */ }
};

// ✅ ASOSIY TUZATISH: HistoryBlock ni Warehouse TASHQARISIDA e'lon qilamiz.
// Ichida bo'lsa — har render'da React yangi component type yaratadi,
// bu esa remount qilishga olib keladi va ma'lumotlar ko'rinmaydi.
const HistoryBlock = ({ mat }) => {
  const restocks = mat?.restocks ?? [];
  const usages   = mat?.usages   ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Kirim tarixi ── */}
      <div>
        <h4 className="text-xs font-black text-yellow-500 uppercase mb-2.5 flex items-center gap-2">
          <RotateCcw size={14} />
          Kirim tarixi
          {restocks.length > 0 && (
            <span className="ml-auto bg-yellow-500/20 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {restocks.length} ta
            </span>
          )}
        </h4>

        {restocks.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {[...restocks].reverse().map((r, idx) => (
              <div
                key={String(r._id || idx)}
                className="flex gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3"
              >
                <Calendar className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-xs text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded-lg">
                      {r.date || '—'}
                    </span>
                    <div className="text-right sm:text-left">
                      <span className="text-yellow-400 font-black text-sm whitespace-nowrap block sm:inline">
                        +{fmt(r.quantity)} {mat.unit}
                      </span>
                      {r.amount != null && r.amount !== '' && !Number.isNaN(Number(r.amount)) ? (
                        <span className="text-amber-400 font-black text-xs whitespace-nowrap block sm:inline sm:ml-2">
                          · {fmt(r.amount)} so&apos;m
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {r.note ? <p className="text-xs text-slate-500 mt-1.5 break-words italic">{r.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-xs italic py-4 text-center border border-dashed border-slate-800 rounded-xl">
            Hali kirim yo&apos;q
          </p>
        )}
      </div>

      {/* ── Ishlatish tarixi ── */}
      <div>
        <h4 className="text-xs font-black text-emerald-500 uppercase mb-2.5 flex items-center gap-2">
          <ArrowDownToLine size={14} />
          Ishlatish tarixi
          {usages.length > 0 && (
            <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {usages.length} ta
            </span>
          )}
        </h4>

        {usages.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {[...usages].reverse().map((u, idx) => (
              <div
                key={String(u._id || idx)}
                className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
              >
                <Calendar className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-xs text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded-lg">
                      {u.date || '—'}
                    </span>
                    <span className="text-emerald-400 font-black text-sm whitespace-nowrap">
                      -{fmt(u.quantity)} {mat.unit}
                    </span>
                  </div>
                  {u.note ? <p className="text-xs text-slate-500 mt-1.5 break-words italic">{u.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-xs italic py-4 text-center border border-dashed border-slate-800 rounded-xl">
            Hali ishlatilmagan
          </p>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
const Warehouse = ({ objects = [], currentUser, canMutate = true }) => {
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [materials, setMaterials]               = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [globalError, setGlobalError]           = useState('');
  const [modal, setModal]                       = useState(null);
  const [selectedMat, setSelectedMat]           = useState(null);
  const [expandedRows, setExpandedRows]         = useState([]);

  const [addForm, setAddForm]           = useState({ supplierId: '', name: '', unit: 'm', supplied: '', amount: '', date: '', note: '' });
  const [suppliers, setSuppliers]       = useState([]);
  const [addError, setAddError]         = useState('');
  const [addLoading, setAddLoading]     = useState(false);

  const [useForm, setUseForm]           = useState({ quantity: '', note: '' });
  const [useError, setUseError]         = useState('');
  const [useLoading, setUseLoading]     = useState(false);

  const [restockForm, setRestockForm]       = useState({ quantity: '', amount: '', date: '', note: '' });
  const [restockError, setRestockError]     = useState('');
  const [restockLoading, setRestockLoading] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [checkMaterial, setCheckMaterial]            = useState(null);
  const [supplierFilterId, setSupplierFilterId]    = useState(null);

  const performer     = currentUser?.name ? String(currentUser.name).trim() : 'Admin';
  const selectedObject= objects.find(o => String(o._id || o.id) === String(selectedObjectId));

  const getTodayDate = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  };

  const fetchMaterials = useCallback(async () => {
    if (!selectedObjectId) { setMaterials([]); return; }
    setLoading(true); setGlobalError('');
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

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.getSuppliers();
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  useEffect(() => {
    setSupplierFilterId(null);
  }, [selectedObjectId]);

  const suppliersForWarehouse = useMemo(() => {
    if (!selectedObjectId) return [];
    return suppliers.filter((s) => supplierLinkedToObject(s, selectedObjectId));
  }, [suppliers, selectedObjectId]);

  const filteredMaterials = useMemo(() => {
    if (!supplierFilterId) return materials;
    return materials.filter((m) => String(m.supplierId || '') === String(supplierFilterId));
  }, [materials, supplierFilterId]);

  const filterSupplier = useMemo(
    () => suppliers.find((s) => String(s._id) === String(supplierFilterId)),
    [suppliers, supplierFilterId]
  );

  const aggregateCheckData = useMemo(
    () => buildMaterialsAggregateCheck(filteredMaterials),
    [filteredMaterials]
  );

  const checkData = useMemo(
    () => buildSingleMaterialCheck(checkMaterial),
    [checkMaterial]
  );

  const openWarehouseCheck = (mat) => {
    if (!mat) return;
    setCheckMaterial(mat);
    setModal('check');
  };

  const toggleRow  = (id) => {
    const sid = String(id);
    setExpandedRows(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
  };
  const isExpanded = (id) => expandedRows.includes(String(id));

  const logAction = (action) => {
    if (!canMutate) return;
    api.createLog(action, performer).catch(() => {});
  };

  const handleAdd = async () => {
    if (!canMutate) return;
    if (!addForm.supplierId)                               { setAddError('Beruvchini tanlang!'); return; }
    if (!addForm.name.trim())                               { setAddError("Nomni kiriting!"); return; }
    if (!addForm.supplied || Number(addForm.supplied) <= 0) { setAddError("Miqdorni kiriting!"); return; }
    const addSum = Number(addForm.amount);
    if (addForm.amount === '' || addForm.amount == null || Number.isNaN(addSum) || addSum < 0) {
      setAddError("Summani kiriting (0 yoki undan yuqori)!");
      return;
    }
    if (!addForm.date.trim())                               { setAddError("Sanani kiriting!"); return; }
    setAddLoading(true); setAddError('');
    try {
      const sup = suppliers.find(s => String(s._id) === String(addForm.supplierId));
      const res = await api.createWarehouse({
        objectId: selectedObjectId,
        supplierId: addForm.supplierId,
        name:     addForm.name.trim(),
        unit:     addForm.unit,
        supplied: Number(addForm.supplied),
        amount:   addSum,
        date:     addForm.date.trim(),
        note:     addForm.note.trim(),
      });
      setStoredSupplierId(addForm.supplierId);
      setMaterials(prev => [res.data || res, ...prev]);
      const supLabel = sup ? `${sup.name} (${sup.phone})` : addForm.supplierId;
      logAction(`Ombor [${selectedObject?.name}]: "${addForm.name.trim()}" qo'shildi (${addForm.date}) — beruvchi: ${supLabel}`);
      closeModal();
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  const handleUse = async () => {
    if (!canMutate) return;
    const qty = parseFloat(useForm.quantity);
    if (!qty || qty <= 0)            { setUseError("Miqdorni kiriting!"); return; }
    if (qty > selectedMat.remaining) { setUseError(`Qoldiq yetarli emas! Maks: ${selectedMat.remaining} ${selectedMat.unit}`); return; }
    setUseLoading(true); setUseError('');
    try {
      const res     = await api.useWarehouse(selectedMat._id, { quantity: qty, note: useForm.note.trim() });
      const updated = res.data || res;
      setMaterials(prev => prev.map(m => m._id === updated._id ? updated : m));
      logAction(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} ishlatildi`);
      closeModal();
    } catch (err) { setUseError(err.message); }
    finally { setUseLoading(false); }
  };

  const handleRestock = async () => {
    if (!canMutate) return;
    const qty = parseFloat(restockForm.quantity);
    const restockSum = Number(restockForm.amount);
    if (!qty || qty <= 0)         { setRestockError("Miqdorni kiriting!"); return; }
    if (restockForm.amount === '' || restockForm.amount == null || Number.isNaN(restockSum) || restockSum < 0) {
      setRestockError("Summani kiriting (0 yoki undan yuqori)!");
      return;
    }
    if (!restockForm.date.trim()) { setRestockError("Sanani kiriting!"); return; }
    setRestockLoading(true); setRestockError('');
    try {
      const res     = await api.restockWarehouse(selectedMat._id, {
        quantity: qty,
        amount:   restockSum,
        date:     restockForm.date.trim(),
        note:     restockForm.note.trim(),
      });
      const updated = res.data || res;
      setMaterials(prev => prev.map(m => m._id === updated._id ? updated : m));
      logAction(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} kirim (${restockForm.date})`);
      closeModal();
    } catch (err) { setRestockError(err.message); }
    finally { setRestockLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!canMutate) return;
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    setDeleteLoadingId(id);
    try {
      await api.deleteWarehouse(id);
      setMaterials(prev => prev.filter(m => m._id !== id));
      setExpandedRows(prev => prev.filter(x => x !== String(id)));
      logAction(`Ombor [${selectedObject?.name}]: "${name}" o'chirildi`);
    } catch (err) { alert(err.message); }
    finally { setDeleteLoadingId(null); }
  };

  const openUse     = (mat) => { if (!canMutate) return; setSelectedMat(mat); setUseForm({ quantity: '', note: '' }); setUseError(''); setModal('use'); };
  const openRestock = (mat) => { if (!canMutate) return; setSelectedMat(mat); setRestockForm({ quantity: '', amount: '', date: getTodayDate(), note: '' }); setRestockError(''); setModal('restock'); };
  const openHistory = (mat) => { setSelectedMat(mat); setModal('history'); };
  const closeModal  = () => {
    setModal(null); setSelectedMat(null); setCheckMaterial(null);
    setAddForm({
      supplierId: getStoredSupplierId(),
      name: '', unit: 'm', supplied: '', amount: '', date: getTodayDate(), note: '',
    }); setAddError(''); setAddLoading(false);
    setUseForm({ quantity: '', note: '' }); setUseError(''); setUseLoading(false);
    setRestockForm({ quantity: '', amount: '', date: '', note: '' }); setRestockError(''); setRestockLoading(false);
  };

  const matStats = (mat) => {
    const pct      = mat.supplied > 0 ? (mat.remaining / mat.supplied) * 100 : 0;
    const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-yellow-500' : 'bg-rose-500';
    const textColor= pct > 50 ? 'text-emerald-400' : pct > 20 ? 'text-yellow-400' : 'text-rose-400';
    return { pct, barColor, textColor };
  };

  const inp = (accent = 'yellow') =>
    `w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-${accent}-500`;

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 xs:px-4 sm:px-5 pb-10 pt-1 space-y-4 text-slate-100">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Package className="text-yellow-500" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight truncate">Ombor</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Materiallar</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Link
              to="/suppliers"
              className="flex-1 sm:flex-none min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-700 flex items-center justify-center gap-2"
            >
              <Contact2 size={17} />
              <span className="hidden xs:inline">Beruvchilar</span>
            </Link>
            <button type="button" onClick={fetchMaterials} disabled={loading || !selectedObjectId}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              <span className="sm:hidden">Yangilash</span>
            </button>
            <button type="button"
              onClick={() => {
                if (!canMutate) return;
                setAddForm(() => {
                  const stored = getStoredSupplierId();
                  const linked = suppliersForWarehouse.some(
                    (s) => String(s._id) === String(stored)
                  )
                    ? stored
                    : '';
                  return {
                    supplierId: linked,
                    name: '',
                    unit: 'm',
                    supplied: '',
                    amount: '',
                    date: getTodayDate(),
                    note: '',
                  };
                });
                setAddError('');
                fetchSuppliers();
                setModal('add');
              }}
              disabled={!selectedObjectId || !canMutate}
              className="flex-1 sm:flex-none min-h-[44px] px-3 sm:px-5 rounded-xl bg-yellow-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide hover:bg-yellow-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/15 whitespace-nowrap">
              <Plus size={18} />
              <span className="truncate">Material qo&apos;shish</span>
            </button>
          </div>
        </div>

        {/* ── Obyekt tanlov ── */}
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Obyektni tanlang</label>
          <div className="relative max-w-full sm:max-w-md">
            <select
              value={selectedObjectId}
              onChange={e => {
                setSelectedObjectId(e.target.value);
                setExpandedRows([]);
                setSupplierFilterId(null);
              }}
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

        {selectedObjectId && (
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Beruvchi filtri
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSupplierFilterId(null)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors ${
                  !supplierFilterId
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                Barchasi
              </button>
              {suppliersForWarehouse.map((s) => {
                const sid = String(s._id);
                const on = supplierFilterId === sid;
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => setSupplierFilterId(sid)}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border transition-colors max-w-[220px] truncate ${
                      on
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                    title={s.name}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            {suppliersForWarehouse.length === 0 && (
              <p className="text-xs text-amber-500/90 font-bold leading-snug">
                Bu omborga bog‘langan beruvchi yo‘q. «Beruvchilar» sahifasida beruvchini tanlab, obyektlarni belgilang.
              </p>
            )}
          </div>
        )}

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
            <button type="button" onClick={fetchMaterials}
              className="shrink-0 px-3 py-2 rounded-lg bg-rose-500/20 text-rose-200 font-bold text-xs uppercase min-h-[40px]">
              Qayta urinish
            </button>
          </div>
        )}

        {/* ── Jadval + beruvchi filtri tanlanganda umumiy chek ── */}
        {selectedObjectId && (
          <>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5 border-b border-slate-800 bg-slate-900/50">
              <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
              <span className="font-black text-sm sm:text-base text-white truncate flex-1 min-w-0">{selectedObject?.name}</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg whitespace-nowrap">
                {supplierFilterId
                  ? `${filteredMaterials.length} / ${materials.length}`
                  : materials.length}{' '}
                ta material
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
            ) : filteredMaterials.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-bold text-sm px-4">
                Tanlangan beruvchi bo‘yicha material yo‘q yoki bu mahsulotda{' '}
                <span className="text-amber-400/90">supplierId</span> mos emas. Filtrni «Barchasi» qiling.
              </div>
            ) : (
              <>
                {/* ════ MOBIL KARTALAR ════ */}
                <div className="md:hidden p-3 space-y-3">
                  {filteredMaterials.map(mat => {
                    const { pct, barColor, textColor } = matStats(mat);
                    const mid          = mat._id || mat.id;
                    const open         = isExpanded(mid);
                    const totalHistory = (mat.restocks?.length || 0) + (mat.usages?.length || 0);

                    return (
                      <div key={mid} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between gap-2 items-start min-w-0">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-black text-white text-sm leading-tight break-words">{mat.name}</h3>
                              {(mat.supplierName || mat.supplierPhone) ? (
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate" title={[mat.supplierName, mat.supplierPhone].filter(Boolean).join(' · ')}>
                                  {mat.supplierName ? <>Beruvchi: {mat.supplierName}</> : null}
                                  {mat.supplierPhone ? <span className="text-slate-500"> · {mat.supplierPhone}</span> : null}
                                </p>
                              ) : null}
                              <span className="text-[10px] font-black text-slate-500 uppercase">{mat.unit}</span>
                            </div>
                            <div className={`text-right shrink-0 ${textColor}`}>
                              <p className="text-[9px] text-slate-500 font-black uppercase">Qoldiq</p>
                              <p className="text-lg font-black">{fmt(mat.remaining)}</p>
                            </div>
                          </div>

                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} transition-all rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>

                          <div className="rounded-lg bg-slate-950 border border-amber-500/20 py-2 px-2 text-center">
                            <p className="text-[8px] text-slate-500 font-black uppercase">Jami summa</p>
                            <p className="text-xs font-black text-amber-400 truncate">{fmt(materialTotalAmount(mat))} so&apos;m</p>
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

                          <button type="button" onClick={() => toggleRow(mid)}
                            className="w-full min-h-[40px] rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-colors hover:bg-slate-700">
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {open ? 'Yashirish' : "Tarix ko'rish"}
                            {!open && totalHistory > 0 && (
                              <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                {totalHistory}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* ✅ mat to'g'ridan-to'g'ri, HistoryBlock tashqarida */}
                        {open && (
                          <div className="border-t border-slate-800 p-4 bg-slate-950/60">
                            <HistoryBlock mat={mat} />
                          </div>
                        )}

                        <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openUse(mat)} disabled={!canMutate}
                            className="min-h-[44px] rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none">
                            <ArrowDownToLine size={15} /> Ishlatish
                          </button>
                          <button type="button" onClick={() => openRestock(mat)} disabled={!canMutate}
                            className="min-h-[44px] rounded-xl bg-yellow-500/15 border border-yellow-500/25 text-yellow-500 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none">
                            <RotateCcw size={15} /> Kirim
                          </button>
                          <button type="button" onClick={() => openHistory(mat)}
                            className="min-h-[44px] rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98]">
                            <History size={15} /> Tarix
                          </button>
                          <button type="button" onClick={() => openWarehouseCheck(mat)}
                            className="min-h-[44px] rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-[0.98]">
                            <Receipt size={15} /> Chek
                          </button>
                          <button type="button" onClick={() => handleDelete(mid, mat.name)} disabled={deleteLoadingId === mid || !canMutate}
                            className="min-h-[44px] rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-black text-xs uppercase flex items-center justify-center active:scale-[0.98] disabled:opacity-50 col-span-2">
                            {deleteLoadingId === mid ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ════ DESKTOP JADVAL ════ */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[1020px] border-collapse text-left">
                    <thead className="bg-slate-900/80 border-b border-slate-800">
                      <tr>
                        {['', 'Material', 'Beruvchi', 'Birlik', 'Kirim', 'Ishlatilgan', 'Qoldiq', 'Jami summa', 'Amallar'].map((h, i) => (
                          <th key={i}
                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500
                              ${i === 0 ? 'w-10' : ''}
                              ${i >= 4 ? 'text-right' : ''}
                              ${i === 6 ? 'text-emerald-500/90' : ''}
                              ${i === 7 ? 'text-amber-500/90' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((mat, idx) => {
                        const { pct, barColor, textColor } = matStats(mat);
                        const mid  = mat._id || mat.id;
                        const open = isExpanded(mid);

                        return (
                          <React.Fragment key={mid}>
                            <tr className={`border-t border-slate-900 hover:bg-slate-900/40 transition-colors ${idx % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                              <td className="px-4 py-3">
                                <button type="button" onClick={() => toggleRow(mid)}
                                  title={open ? 'Yashirish' : "Tarixni ko'rish"}
                                  className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-yellow-500/15 text-yellow-400' : 'hover:bg-slate-800 text-slate-500'}`}>
                                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </td>

                              <td className="px-4 py-3 align-middle max-w-[200px]">
                                <div className="font-bold text-sm text-white mb-1.5 break-words">{mat.name}</div>
                                <div className="h-1.5 bg-slate-800 rounded-full max-w-[140px]">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <div className="flex gap-1 mt-1.5">
                                  {mat.restocks?.length > 0 && (
                                    <span className="text-[9px] font-black text-yellow-500/70 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                      {mat.restocks.length} kirim
                                    </span>
                                  )}
                                  {mat.usages?.length > 0 && (
                                    <span className="text-[9px] font-black text-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      {mat.usages.length} ishlat.
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3 align-middle max-w-[160px] text-slate-400 text-xs font-bold break-words">
                                {mat.supplierName || '—'}
                                {mat.supplierPhone ? (
                                  <div className="text-[10px] text-slate-500 font-bold mt-0.5">{mat.supplierPhone}</div>
                                ) : null}
                              </td>

                              <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{mat.unit}</td>
                              <td className="px-4 py-3 text-right font-bold text-sm text-slate-200">{fmt(mat.supplied)}</td>
                              <td className="px-4 py-3 text-right font-bold text-sm text-rose-400">{fmt(mat.used)}</td>
                              <td className={`px-4 py-3 text-right font-black text-base ${textColor}`}>{fmt(mat.remaining)}</td>

                              <td className="px-4 py-3 text-right font-bold text-sm text-amber-400 whitespace-nowrap">
                                {fmt(materialTotalAmount(mat))}
                                <span className="text-[10px] font-black text-slate-500 ml-1">so&apos;m</span>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  <button type="button" onClick={() => openUse(mat)} disabled={!canMutate}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black uppercase hover:bg-emerald-500/25 transition-colors disabled:opacity-40">
                                    <ArrowDownToLine size={12} /> Ishlatish
                                  </button>
                                  <button type="button" onClick={() => openRestock(mat)} disabled={!canMutate}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-500 text-xs font-black uppercase hover:bg-yellow-500/25 transition-colors disabled:opacity-40">
                                    <RotateCcw size={12} /> Kirim
                                  </button>
                                  <button type="button" onClick={() => openHistory(mat)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-black uppercase hover:bg-slate-700 transition-colors">
                                    <History size={12} /> Tarix
                                  </button>
                                  <button type="button" onClick={() => openWarehouseCheck(mat)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-black uppercase hover:bg-amber-500/25 transition-colors">
                                    <Receipt size={12} /> Chek
                                  </button>
                                  <button type="button" onClick={() => handleDelete(mid, mat.name)} disabled={deleteLoadingId === mid || !canMutate}
                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                                    {deleteLoadingId === mid ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* ✅ HistoryBlock tashqarida, mat to'g'ridan-to'g'ri */}
                            {open && (
                              <tr className="border-t border-yellow-500/10">
                                <td colSpan="9" className="bg-slate-950/80 px-6 py-5">
                                  <HistoryBlock mat={mat} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {filteredMaterials.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-slate-950/90 overflow-hidden shadow-xl">
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5 border-b border-amber-500/15 bg-amber-500/5">
                <Receipt className="text-amber-400 shrink-0" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Umumiy chek</p>
                  <p
                    className="font-black text-white text-sm truncate"
                    title={supplierFilterId ? (filterSupplier?.name || '') : 'Barcha beruvchilar'}
                  >
                    {supplierFilterId ? (filterSupplier?.name || 'Beruvchi') : 'Barcha beruvchilar'}
                    <span className="text-slate-500 font-bold text-xs">
                      {' '}
                      · {filteredMaterials.length} ta mahsulot
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">{selectedObject?.name}</p>
                </div>
                <span className="text-xs font-black text-amber-400 tabular-nums whitespace-nowrap">
                  {fmt(aggregateCheckData.grandTotalSum)} so&apos;m
                </span>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <WarehouseCheckSections
                  sections={aggregateCheckData.sections}
                  grandTotalSum={aggregateCheckData.grandTotalSum}
                  emptyText="Chek uchun maʼlumot yo‘q"
                />
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* ════ MODAL: Yangi material ════ */}
      {modal === 'add' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4" onClick={closeModal}>
          <div className="w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden shrink-0" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h2 className="text-lg font-black text-white">Yangi material</h2>
                  <p className="text-yellow-500 text-xs font-bold">{selectedObject?.name}</p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20} /></button>
              </div>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-2 mb-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Beruvchi</label>
                  <Link
                    to="/suppliers"
                    className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Contact2 size={12} /> Beruvchilarni boshqarish
                  </Link>
                </div>
                <div className="relative">
                  <select
                    className={`${inp()} appearance-none pr-10`}
                    value={addForm.supplierId}
                    onChange={e => {
                      const v = e.target.value;
                      setAddForm(p => ({ ...p, supplierId: v }));
                      setStoredSupplierId(v);
                    }}
                    autoFocus
                  >
                    <option value="">— Beruvchini tanlang —</option>
                    {suppliersForWarehouse.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} — {s.phone}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {suppliersForWarehouse.length === 0 ? (
                  <p className="text-[10px] text-amber-500/90 mt-2 font-bold leading-snug">
                    Bu omborga bog‘langan beruvchi yo‘q. «Beruvchilarni boshqarish»da beruvchini tanlang va ushbu obyektni belgilang (yoki «barcha omborlar»ni qoldiring).
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">
                    Faqat shu ombor uchun bog‘langan beruvchilar. Oxirgi tanlov saqlanadi.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Material nomi</label>
                <input className={inp()} type="text" placeholder="Kabel 2.5mm²" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Birlik</label>
                  <select className={inp()} value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}>
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
                  <input className={inp()} type="number" placeholder="0" min="0" inputMode="decimal" value={addForm.supplied} onChange={e => setAddForm(p => ({ ...p, supplied: e.target.value }))} />
                </div>
              </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Summa (so&apos;m)</label>
                  <input
                    className={inp()}
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={addForm.amount}
                    onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Sana</label>
                  <input className={inp()} type="date" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))} />
                </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Izoh (ixtiyoriy)</label>
                <input className={inp()} type="text" placeholder="Masalan: yangi" value={addForm.note} onChange={e => setAddForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              {addError && <div className="flex items-center gap-2 text-rose-400 text-sm"><AlertCircle size={16} /> {addError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">Bekor</button>
                <button type="button" onClick={handleAdd} disabled={addLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {addLoading && <Loader2 className="animate-spin" size={16} />} Qo&apos;shish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Ishlatish ════ */}
      {modal === 'use' && selectedMat && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4" onClick={closeModal}>
          <div className="w-full sm:max-w-md max-h-[90dvh] rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white break-words">{selectedMat.name}</h2>
                  <p className="text-emerald-400 text-sm font-bold mt-0.5">
                    Qoldiq: <span className="text-white">{fmt(selectedMat.remaining)}</span> {selectedMat.unit}
                  </p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20} /></button>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Ishlatilgan miqdor</label>
                <input className={inp('emerald')} type="number" step="0.1" min="0.1" inputMode="decimal"
                  placeholder={`Maks: ${selectedMat.remaining} ${selectedMat.unit}`}
                  value={useForm.quantity} onChange={e => setUseForm(p => ({ ...p, quantity: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Izoh (ixtiyoriy)</label>
                <input className={inp('emerald')} type="text" placeholder="Masalan: 2-qavat" value={useForm.note} onChange={e => setUseForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              {useError && <div className="flex items-start gap-2 text-rose-400 text-sm"><AlertCircle size={16} className="shrink-0 mt-0.5" /> {useError}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">Bekor</button>
                <button type="button" onClick={handleUse} disabled={useLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {useLoading && <Loader2 className="animate-spin" size={16} />} Ishlatish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Kirim ════ */}
      {modal === 'restock' && selectedMat && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4" onClick={closeModal}>
          <div className="w-full sm:max-w-md max-h-[90dvh] rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
            <div className="overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white break-words">{selectedMat.name}</h2>
                  <p className="text-yellow-500 text-sm font-bold mt-0.5">
                    Mavjud: <span className="text-white">{fmt(selectedMat.remaining)}</span> {selectedMat.unit}
                  </p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20} /></button>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Kirim miqdori</label>
                <input className={inp()} type="number" step="0.1" min="0.1" inputMode="decimal" placeholder="0"
                  value={restockForm.quantity} onChange={e => setRestockForm(p => ({ ...p, quantity: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Summa (so&apos;m)</label>
                <input
                  className={inp()}
                  type="number"
                  placeholder="0"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={restockForm.amount}
                  onChange={e => setRestockForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Sana</label>
                <input className={inp()} type="date" value={restockForm.date} onChange={e => setRestockForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Izoh (ixtiyoriy)</label>
                <input className={inp()} type="text" placeholder="Masalan: Yangi ta'minotchi" value={restockForm.note} onChange={e => setRestockForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              {restockError && <div className="flex items-center gap-2 text-rose-400 text-sm"><AlertCircle size={16} /> {restockError}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 min-h-[48px] rounded-xl bg-slate-800 text-slate-300 font-black text-sm">Bekor</button>
                <button type="button" onClick={handleRestock} disabled={restockLoading}
                  className="flex-1 min-h-[48px] rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {restockLoading && <Loader2 className="animate-spin" size={16} />} Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Ombor hisobi (kirimlar sanasi bo'yicha) ════ */}
      {modal === 'check' && checkMaterial && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4" onClick={closeModal}>
          <div
            className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden shrink-0" />
            <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Receipt className="text-amber-400" size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white">Material hisobi</h2>
                  <p className="text-sm text-amber-400/90 font-bold mt-0.5 truncate" title={checkMaterial.name}>
                    {checkMaterial.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-bold">
                    {selectedObject?.name || '—'}
                    <span className="text-slate-600"> · </span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date().toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
              <WarehouseCheckSections
                sections={checkData.sections}
                grandTotalSum={checkData.grandTotalSum}
                emptyText="Bu material bo‘yicha chek maʼlumoti yo‘q"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: To'liq tarix ════ */}
      {modal === 'history' && selectedMat && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm sm:p-4" onClick={closeModal}>
          <div className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 sm:hidden shrink-0" />
            <div className="px-4 sm:px-6 pt-4 flex justify-between items-start gap-2 border-b border-slate-800 pb-3 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white break-words">{selectedMat.name}</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {selectedMat.supplierName || selectedMat.supplierPhone ? (
                    <>
                      Beruvchi: <span className="text-slate-300 font-bold">{selectedMat.supplierName || '—'}</span>
                      {selectedMat.supplierPhone ? (
                        <> · <span className="text-amber-400/90 font-bold">{selectedMat.supplierPhone}</span></>
                      ) : null}
                      {' · '}
                    </>
                  ) : null}
                  Jami summa:{' '}
                  <span className="text-amber-400 font-bold">{fmt(materialTotalAmount(selectedMat))}</span> so&apos;m
                  {' · '}
                  Kirim: <span className="text-slate-200 font-bold">{fmt(selectedMat.supplied)}</span>
                  {' · '}Ishlatilgan: <span className="text-rose-400 font-bold">{fmt(selectedMat.used)}</span>
                  {' · '}Qoldiq: <span className="text-emerald-400 font-bold">{fmt(selectedMat.remaining)}</span>
                  {' '}{selectedMat.unit}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <HistoryBlock mat={selectedMat} />
              {!selectedMat.restocks?.length && !selectedMat.usages?.length && (
                <p className="text-center text-slate-600 py-12 font-bold text-sm">Hali tarix yo&apos;q</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Warehouse;