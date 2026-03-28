import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, History, Calendar, Trash2,
  X, AlertCircle, RefreshCw, Loader2, ChevronDown,
  ArrowDownToLine, RotateCcw,
} from 'lucide-react';
import { api } from '../utils/api';

// ─── helpers ────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();

// ─── shared styles ───────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', boxSizing: 'border-box',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: '12px', padding: '12px 16px',
    color: '#f1f5f9', fontSize: '14px', outline: 'none',
  },
  label: {
    display: 'block', fontSize: '11px', fontWeight: '700',
    color: '#64748b', marginBottom: '7px',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: '16px',
  },
  modal: {
    background: '#020617', border: '1px solid #1e293b',
    borderRadius: '24px', padding: '32px',
    width: '100%', maxWidth: '460px',
  },
};

// ════════════════════════════════════════════════════════════════════
const Warehouse = ({ objects = [], currentUser }) => {

  // ── state ──────────────────────────────────────────────────────
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [materials, setMaterials]               = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [globalError, setGlobalError]           = useState('');

  // modals
  const [modal, setModal]                       = useState(null); // 'add' | 'use' | 'restock' | 'history'
  const [selectedMat, setSelectedMat]           = useState(null);

  // add form
  const [addForm, setAddForm]     = useState({ name: '', unit: 'm', supplied: '' });
  const [addError, setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // use form
  const [useForm, setUseForm]     = useState({ quantity: '', note: '' });
  const [useError, setUseError]   = useState('');
  const [useLoading, setUseLoading] = useState(false);

  // restock form
  const [restockQty, setRestockQty]       = useState('');
  const [restockError, setRestockError]   = useState('');
  const [restockLoading, setRestockLoading] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const selectedObject = objects.find(o => o._id === selectedObjectId);

  // ── fetch materials for selected object ─────────────────────────
  const fetchMaterials = useCallback(async () => {
    if (!selectedObjectId) { setMaterials([]); return; }
    setLoading(true);
    setGlobalError('');
    try {
      const res = await api.getWarehouse(selectedObjectId);
      setMaterials(res.data || res);
    } catch (err) {
      setGlobalError(err.message || 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedObjectId]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // ── add material ────────────────────────────────────────────────
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
      api.createLog(`Ombor [${selectedObject?.name}]: "${addForm.name.trim()}" qo'shildi`, currentUser?.name || 'Admin').catch(() => {});
      closeModal();
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  // ── use material ────────────────────────────────────────────────
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
      api.createLog(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} ishlatildi`, currentUser?.name || 'Admin').catch(() => {});
      closeModal();
    } catch (err) { setUseError(err.message); }
    finally { setUseLoading(false); }
  };

  // ── restock ─────────────────────────────────────────────────────
  const handleRestock = async () => {
    const qty = parseFloat(restockQty);
    if (!qty || qty <= 0) { setRestockError("Miqdorni kiriting!"); return; }
    setRestockLoading(true); setRestockError('');
    try {
      const res = await api.restockWarehouse(selectedMat._id, { quantity: qty });
      const updated = res.data || res;
      setMaterials(prev => prev.map(m => m._id === updated._id ? updated : m));
      api.createLog(`Ombor [${selectedObject?.name}]: "${selectedMat.name}" — ${qty} ${selectedMat.unit} kirim qilindi`, currentUser?.name || 'Admin').catch(() => {});
      closeModal();
    } catch (err) { setRestockError(err.message); }
    finally { setRestockLoading(false); }
  };

  // ── delete ──────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    setDeleteLoadingId(id);
    try {
      await api.deleteWarehouse(id);
      setMaterials(prev => prev.filter(m => m._id !== id));
      api.createLog(`Ombor [${selectedObject?.name}]: "${name}" o'chirildi`, currentUser?.name || 'Admin').catch(() => {});
    } catch (err) { alert(err.message); }
    finally { setDeleteLoadingId(null); }
  };

  // ── modal helpers ───────────────────────────────────────────────
  const openUse = (mat) => { setSelectedMat(mat); setUseForm({ quantity: '', note: '' }); setUseError(''); setModal('use'); };
  const openRestock = (mat) => { setSelectedMat(mat); setRestockQty(''); setRestockError(''); setModal('restock'); };
  const openHistory = (mat) => { setSelectedMat(mat); setModal('history'); };
  const closeModal = () => {
    setModal(null); setSelectedMat(null);
    setAddForm({ name: '', unit: 'm', supplied: '' }); setAddError(''); setAddLoading(false);
    setUseForm({ quantity: '', note: '' }); setUseError(''); setUseLoading(false);
    setRestockQty(''); setRestockError(''); setRestockLoading(false);
  };

  // ── render ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui,sans-serif', color: '#f1f5f9' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package size={34} color="#eab308" />
          <h1 style={{ fontSize: '30px', fontWeight: '900', margin: 0 }}>Ombor</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchMaterials} disabled={loading || !selectedObjectId}
            style={{ background: '#1e293b', border: 'none', borderRadius: '12px', padding: '11px', cursor: 'pointer', color: '#94a3b8', opacity: !selectedObjectId ? 0.4 : 1 }}
            title="Yangilash"
          >
            <RefreshCw size={17} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => setModal('add')}
            disabled={!selectedObjectId}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selectedObjectId ? '#eab308' : '#334155', color: selectedObjectId ? '#1a1a1a' : '#64748b', border: 'none', borderRadius: '14px', padding: '11px 22px', fontWeight: '700', fontSize: '14px', cursor: selectedObjectId ? 'pointer' : 'not-allowed' }}
          >
            <Plus size={17} /> Material qo'shish
          </button>
        </div>
      </div>

      {/* ── Object selector ── */}
      <div style={{ marginBottom: '24px' }}>
        <label style={S.label}>Obyektni tanlang</label>
        <div style={{ position: 'relative', maxWidth: '380px' }}>
          <select
            value={selectedObjectId}
            onChange={e => setSelectedObjectId(e.target.value)}
            style={{ ...S.input, paddingRight: '40px', appearance: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: selectedObjectId ? '600' : '400' }}
          >
            <option value="">— Obyekt tanlang —</option>
            {objects.map(o => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ── No object selected ── */}
      {!selectedObjectId && (
        <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '20px', padding: '64px', textAlign: 'center', color: '#475569' }}>
          <Package size={48} color="#334155" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '16px' }}>Ombor ma'lumotlarini ko'rish uchun obyekt tanlang</p>
        </div>
      )}

      {/* ── Global error ── */}
      {globalError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#f87171' }}>
          <AlertCircle size={17} />
          <span style={{ flex: 1, fontSize: '14px' }}>{globalError}</span>
          <button onClick={fetchMaterials} style={{ background: 'rgba(248,113,113,0.15)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Qayta urinish
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {selectedObjectId && (
        <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '22px', overflow: 'hidden' }}>

          {/* object name bar */}
          <div style={{ background: '#0f172a', padding: '14px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>{selectedObject?.name}</span>
            <span style={{ fontSize: '13px', color: '#475569', marginLeft: 'auto' }}>{materials.length} ta material</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '64px', color: '#475569' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Yuklanmoqda...</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#0a0f1e' }}>
                <tr>
                  {[
                    { l: 'MATERIAL NOMI', a: 'left' },
                    { l: 'BIRLIK',        a: 'left' },
                    { l: 'KIRIM',         a: 'right' },
                    { l: 'ISHLATILGAN',   a: 'right' },
                    { l: 'QOLDIQ',        a: 'right', c: '#4ade80' },
                    { l: '',              a: 'right' },
                  ].map((h, i) => (
                    <th key={i} style={{ padding: '16px 20px', textAlign: h.a, fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: h.c || '#475569' }}>
                      {h.l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#334155' }}>
                      Bu obyektda hali material yo'q
                    </td>
                  </tr>
                ) : materials.map((mat, idx) => {
                  const pct = mat.supplied > 0 ? (mat.remaining / mat.supplied) * 100 : 0;
                  const barColor = pct > 50 ? '#4ade80' : pct > 20 ? '#eab308' : '#f87171';
                  return (
                    <tr key={mat._id} style={{ borderTop: '1px solid #0f172a', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{mat.name}</div>
                        {/* progress bar */}
                        <div style={{ height: '4px', background: '#1e293b', borderRadius: '99px', width: '140px' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: '99px', transition: 'width 0.3s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>{mat.unit}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', fontSize: '14px' }}>{fmt(mat.supplied)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', color: '#f87171', fontWeight: '600', fontSize: '14px' }}>{fmt(mat.used)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', color: barColor, fontWeight: '800', fontSize: '16px' }}>{fmt(mat.remaining)}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Ishlatish */}
                          <button
                            onClick={() => openUse(mat)}
                            title="Ishlatish"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'none', borderRadius: '9px', padding: '7px 13px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            <ArrowDownToLine size={13} /> Ishlatish
                          </button>
                          {/* Kirim */}
                          <button
                            onClick={() => openRestock(mat)}
                            title="Kirim qilish"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(234,179,8,0.1)', color: '#eab308', border: 'none', borderRadius: '9px', padding: '7px 13px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            <RotateCcw size={13} /> Kirim
                          </button>
                          {/* Tarix */}
                          <button
                            onClick={() => openHistory(mat)}
                            title="Tarix"
                            style={{ background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '9px', padding: '7px 13px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <History size={13} /> Tarix
                          </button>
                          {/* O'chirish */}
                          <button
                            onClick={() => handleDelete(mat._id, mat.name)}
                            disabled={deleteLoadingId === mat._id}
                            style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: 'none', borderRadius: '9px', padding: '7px 10px', cursor: 'pointer' }}
                          >
                            {deleteLoadingId === mat._id
                              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD MODAL
      ══════════════════════════════════════ */}
      {modal === 'add' && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 3px' }}>Yangi material</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#eab308' }}>{selectedObject?.name}</p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={S.label}>Material nomi</label>
              <input style={S.input} type="text" placeholder="Kabel 2.5mm²" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
              <div>
                <label style={S.label}>Birlik</label>
                <select style={{ ...S.input, cursor: 'pointer' }} value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}>
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
                <label style={S.label}>Miqdor</label>
                <input style={S.input} type="number" placeholder="0" min="0" value={addForm.supplied} onChange={e => setAddForm(p => ({ ...p, supplied: e.target.value }))} />
              </div>
            </div>

            {addError && <ErrorMsg msg={addError} />}

            <BtnRow
              onCancel={closeModal}
              onConfirm={handleAdd}
              loading={addLoading}
              confirmLabel="Qo'shish"
              confirmColor="#eab308"
              confirmTextColor="#1a1a1a"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          USE MODAL
      ══════════════════════════════════════ */}
      {modal === 'use' && selectedMat && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: '800', margin: 0 }}>{selectedMat.name}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#4ade80', fontSize: '14px', marginBottom: '24px' }}>
              Qoldiq: <strong>{fmt(selectedMat.remaining)}</strong> {selectedMat.unit}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={S.label}>Ishlatilgan miqdor ({selectedMat.unit})</label>
              <input style={S.input} type="number" step="0.1" min="0.1" placeholder={`Maks: ${selectedMat.remaining}`} value={useForm.quantity} onChange={e => setUseForm(p => ({ ...p, quantity: e.target.value }))} autoFocus />
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={S.label}>Izoh (ixtiyoriy)</label>
              <input style={S.input} type="text" placeholder="Masalan: Yotoqxona, 2-qavat..." value={useForm.note} onChange={e => setUseForm(p => ({ ...p, note: e.target.value }))} />
            </div>

            {useError && <ErrorMsg msg={useError} />}

            <BtnRow onCancel={closeModal} onConfirm={handleUse} loading={useLoading} confirmLabel="Ishlatish" confirmColor="#22c55e" confirmTextColor="#fff" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          RESTOCK MODAL
      ══════════════════════════════════════ */}
      {modal === 'restock' && selectedMat && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: '800', margin: 0 }}>{selectedMat.name}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#eab308', fontSize: '14px', marginBottom: '24px' }}>
              Mavjud qoldiq: <strong>{fmt(selectedMat.remaining)}</strong> {selectedMat.unit}
            </p>

            <div style={{ marginBottom: '22px' }}>
              <label style={S.label}>Kirim miqdori ({selectedMat.unit})</label>
              <input style={S.input} type="number" step="0.1" min="0.1" placeholder="0" value={restockQty} onChange={e => setRestockQty(e.target.value)} autoFocus />
            </div>

            {restockError && <ErrorMsg msg={restockError} />}

            <BtnRow onCancel={closeModal} onConfirm={handleRestock} loading={restockLoading} confirmLabel="Kirim qilish" confirmColor="#eab308" confirmTextColor="#1a1a1a" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          HISTORY MODAL
      ══════════════════════════════════════ */}
      {modal === 'history' && selectedMat && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={{ ...S.modal, maxWidth: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: '800', margin: '0 0 3px' }}>{selectedMat.name}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Kirim: <strong style={{ color: '#f1f5f9' }}>{fmt(selectedMat.supplied)}</strong>
                  &nbsp;·&nbsp; Ishlatilgan: <strong style={{ color: '#f87171' }}>{fmt(selectedMat.used)}</strong>
                  &nbsp;·&nbsp; Qoldiq: <strong style={{ color: '#4ade80' }}>{fmt(selectedMat.remaining)}</strong>
                  &nbsp;{selectedMat.unit}
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(!selectedMat.usages || selectedMat.usages.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#334155' }}>Hali hech narsa ishlatilmagan</div>
              ) : (
                [...selectedMat.usages].reverse().map(u => (
                  <div key={u._id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px', borderRadius: '14px', background: '#0f172a', marginBottom: '8px' }}>
                    <Calendar size={18} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#475569' }}>{u.date}</span>
                        <span style={{ color: '#4ade80', fontWeight: '700', fontSize: '15px' }}>
                          {fmt(u.quantity)} {selectedMat.unit}
                        </span>
                      </div>
                      {u.note && <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{u.note}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── small helpers ────────────────────────────────────────────────────
const ErrorMsg = ({ msg }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', marginBottom: '14px' }}>
    <AlertCircle size={13} /> {msg}
  </div>
);

const BtnRow = ({ onCancel, onConfirm, loading, confirmLabel, confirmColor, confirmTextColor }) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    <button onClick={onCancel} style={{ flex: 1, padding: '13px', background: '#1e293b', border: 'none', borderRadius: '13px', color: '#94a3b8', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
      Bekor
    </button>
    <button
      onClick={onConfirm} disabled={loading}
      style={{ flex: 1, padding: '13px', background: confirmColor, border: 'none', borderRadius: '13px', color: confirmTextColor, fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
      {loading ? 'Saqlanmoqda...' : confirmLabel}
    </button>
  </div>
);

export default Warehouse;