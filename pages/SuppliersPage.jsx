import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Contact2, Plus, Trash2, Pencil, Loader2, AlertCircle, Package, Building2,
} from 'lucide-react';
import { api } from '../utils/api';

const normId = (x) => String(x._id || x.id || '');

const SuppliersPage = ({ objects = [] }) => {
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [createLinkedIds, setCreateLinkedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editName, setEditName]     = useState('');
  const [editPhone, setEditPhone]   = useState('');
  const [editLinkedIds, setEditLinkedIds]   = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSuppliers();
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Yuklashda xatolik');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCreateLink = (oid) => {
    const s = String(oid);
    setCreateLinkedIds((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleEditLink = (oid) => {
    const s = String(oid);
    setEditLinkedIds((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleCreate = async () => {
    const nm = name.trim();
    const ph = phone.trim();
    if (!nm) { setError('Ismni kiriting'); return; }
    if (!ph) { setError('Telefon raqamini kiriting'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.createSupplier({
        name: nm,
        phone: ph,
        linkedObjectIds: createLinkedIds,
      });
      setName('');
      setPhone('');
      setCreateLinkedIds([]);
      await load();
    } catch (e) {
      setError(e.message || 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setEditName(s.name || '');
    setEditPhone(s.phone || '');
    const links = s.linkedObjectIds || [];
    setEditLinkedIds(links.map((id) => String(id)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPhone('');
    setEditLinkedIds([]);
  };

  const handleSaveEdit = async () => {
    const nm = editName.trim();
    const ph = editPhone.trim();
    if (!nm || !ph) return;
    setSaveLoading(true);
    setError('');
    try {
      await api.updateSupplier(editingId, {
        name: nm,
        phone: ph,
        linkedObjectIds: editLinkedIds,
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || 'Saqlashda xatolik');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Beruvchini o‘chirmoqchimisiz?')) return;
    setDeleteId(id);
    setError('');
    try {
      await api.deleteSupplier(id);
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || 'O‘chirishda xatolik');
    } finally {
      setDeleteId(null);
    }
  };

  const inp = 'w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 text-white font-bold outline-none focus:border-yellow-500';

  const ObjectLinkPicker = ({ selectedIds, onToggle, disabled }) => (
    <div className="space-y-2">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Building2 size={14} className="text-amber-500/80" />
        Qaysi ombor(lar)ga bog‘lash
      </p>
      <p className="text-[11px] text-slate-600 leading-snug">
        Hech biri tanlanmasa — beruvchi <span className="text-slate-400 font-bold">barcha</span> omborlarda ko‘rinadi.
        Tanlansa — faqat ushbu obyektlarda filtr va material qo‘shishda chiqadi.
      </p>
      {objects.length === 0 ? (
        <p className="text-xs text-slate-600 italic">Obyektlar ro‘yxati bo‘sh (super admin obyekt qo‘shishi kerak).</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {objects.map((o) => {
            const id = normId(o);
            const on = selectedIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(id)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors disabled:opacity-50 ${
                  on
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const supplierLinkLabel = (s) => {
    const links = s.linkedObjectIds;
    if (!links || !Array.isArray(links) || links.length === 0) {
      return <span className="text-[10px] font-bold text-emerald-500/90">Barcha omborlar</span>;
    }
    return (
      <div className="flex flex-wrap gap-1 mt-1.5">
        {links.map((oid) => {
          const o = objects.find((x) => normId(x) === String(oid));
          return (
            <span
              key={String(oid)}
              className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
            >
              {o?.name || String(oid).slice(-6)}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 xs:px-4 sm:px-5 pb-10 pt-1 space-y-4 text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Contact2 className="text-amber-400" size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight truncate">Beruvchilar</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              Omborlarga bog‘lash va umumiy ro‘yxat
            </p>
          </div>
        </div>
        <Link
          to="/warehouse"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-700"
        >
          <Package size={18} /> Omborga
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 space-y-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Yangi beruvchi</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Ism / kompaniya</label>
            <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Xo'zmak " />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Telefon</label>
            <input className={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" />
          </div>
        </div>
        <ObjectLinkPicker selectedIds={createLinkedIds} onToggle={toggleCreateLink} disabled={submitting} />
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting}
          className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Qoʻshish
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2">
          <span className="font-black text-sm text-white">Ro‘yxat</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
            {suppliers.length} ta
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            <span className="font-bold">Yuklanmoqda...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <p className="py-12 text-center text-slate-600 text-sm font-bold">Hali beruvchi yo‘q</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {suppliers.map(s => (
              <li key={s._id} className="p-4 sm:px-5 hover:bg-slate-900/30 transition-colors">
                {editingId === s._id ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input className={inp} value={editName} onChange={e => setEditName(e.target.value)} />
                      <input className={inp} value={editPhone} onChange={e => setEditPhone(e.target.value)} inputMode="tel" />
                    </div>
                    <ObjectLinkPicker selectedIds={editLinkedIds} onToggle={toggleEditLink} disabled={saveLoading} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saveLoading}
                        className="min-h-[44px] px-4 rounded-xl bg-amber-500 text-slate-950 font-black text-xs disabled:opacity-50"
                      >
                        {saveLoading ? <Loader2 className="animate-spin inline" size={16} /> : 'Saqlash'}
                      </button>
                      <button type="button" onClick={cancelEdit} className="min-h-[44px] px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                        Bekor
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-white break-words">{s.name}</p>
                      <p className="text-sm text-amber-400/90 font-bold mt-0.5">{s.phone}</p>
                      <div className="mt-2">
                        <span className="text-[10px] font-black text-slate-600 uppercase">Omborlar</span>
                        {supplierLinkLabel(s)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Pencil size={14} /> Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s._id)}
                        disabled={deleteId === s._id}
                        className="min-h-[44px] px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold disabled:opacity-50"
                      >
                        {deleteId === s._id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SuppliersPage;
