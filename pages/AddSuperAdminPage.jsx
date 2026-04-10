import React, { useMemo, useState } from 'react';
import { ShieldCheck, Loader2, Save, Eye, EyeOff, Edit2, Trash2, X } from 'lucide-react';
import { api } from '../utils/api';

const ROLE_LABEL = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
};

const AddSuperAdminPage = ({ employees = [], currentUser, onLog, onRefresh }) => {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [newRole, setNewRole] = useState('SUPER_ADMIN');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [editEmp, setEditEmp] = useState(null);
  const [editNewPass, setEditNewPass] = useState('');
  const [editShowPass, setEditShowPass] = useState(false);
  const [loading, setLoading] = useState(null);

  const myId = currentUser?._id != null ? String(currentUser._id) : currentUser?.uid != null ? String(currentUser.uid) : '';

  const admins = useMemo(
    () =>
      (Array.isArray(employees) ? employees : []).filter((e) =>
        ['SUPER_ADMIN', 'ADMIN'].includes(e?.role)
      ),
    [employees]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDone(false);

    const n = name.trim();
    const log = login.trim();
    const p1 = password;
    const p2 = confirm;

    if (!n) {
      setError('Ismni kiriting.');
      return;
    }
    if (!log) {
      setError('Login kiriting.');
      return;
    }
    if (log.length < 2 || log.length > 64) {
      setError('Login 2–64 belgi orasida bo‘lsin.');
      return;
    }
    if (!p1 || p1.length < 4) {
      setError('Parol kamida 4 belgi bo‘lsin.');
      return;
    }
    if (p1 !== p2) {
      setError('Parollar mos emas.');
      return;
    }

    setSaving(true);
    try {
      const role = newRole === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN';
      await api.createEmployee({
        name: n,
        email: log,
        password: p1,
        position: role === 'SUPER_ADMIN' ? 'Super administrator' : 'Administrator (faqat ko‘rish)',
        role,
        salaryType: 'MONTHLY',
        salaryRate: 0,
        currency: 'UZS',
        status: 'ACTIVE',
      });
      onLog?.(
        `Yangi ${role === 'SUPER_ADMIN' ? 'super admin' : 'admin (faqat ko‘rish)'} yaratildi: ${n} (${log})`
      );
      onRefresh?.();
      setName('');
      setLogin('');
      setPassword('');
      setConfirm('');
      setNewRole('SUPER_ADMIN');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Saqlanmadi. Bu login band bo‘lishi mumkin.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (emp) => {
    setEditNewPass('');
    setEditShowPass(false);
    setEditEmp({ ...emp });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editEmp?._id && !editEmp?.id) return;
    const id = editEmp._id || editEmp.id;
    setLoading(id);
    try {
      const updateData = {
        name: editEmp.name?.trim(),
        email: editEmp.email?.trim(),
        position: editEmp.position?.trim() || 'Administrator',
        role: editEmp.role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN',
        salaryType: editEmp.salaryType || 'MONTHLY',
        salaryRate: Number(editEmp.salaryRate) || 0,
        currency: editEmp.currency || 'UZS',
      };
      if (editNewPass.trim()) {
        updateData.password = editNewPass.trim();
      }
      await api.updateEmployee(id, updateData);
      onLog?.(`Admin yangilandi: ${updateData.name}`);
      setEditEmp(null);
      onRefresh?.();
    } catch (err) {
      alert(err.message || 'Saqlanmadi');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (emp) => {
    const id = emp._id || emp.id;
    const idStr = id != null ? String(id) : '';
    if (idStr && myId && idStr === myId) {
      alert('O‘zingizni o‘chira olmaysiz.');
      return;
    }
    if (!window.confirm(`${emp.name || 'Admin'} o‘chirilsinmi? Bu amal qaytarilmaydi.`)) return;
    setLoading(id);
    try {
      await api.deleteEmployee(id);
      onLog?.(`Admin o‘chirildi: ${emp.name}`);
      onRefresh?.();
    } catch (err) {
      alert(err.message || 'O‘chirilmadi');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
            <ShieldCheck className="text-yellow-500" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tight">
              Adminlar <span className="text-yellow-500">boshqaruvi</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">
              Yangi admin qo‘shish • ro‘yxatni tahrirlash yoki o‘chirish
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-8 lg:gap-10 items-start max-w-[1400px]">
        {/* Chap: forma */}
        <div className="space-y-6 w-full max-w-lg mx-auto lg:mx-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Yangi admin</h2>

          {done && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-bold">
              Saqlandi. Endi bu login va parol bilan tizimga kirish mumkin.
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm font-bold">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-5 shadow-xl"
          >
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Ism familiya
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder=""
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Rol
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
              >
                <option value="SUPER_ADMIN">Super admin — barcha funksiyalar</option>
                <option value="ADMIN">Admin — faqat ko‘rish (o‘zgartirish yo‘q)</option>
              </select>
              <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                Admin roli bilan paneldagi ma’lumotlarni ko‘rish mumkin; yozish/o‘chirish/tahrirlash faqat super admin uchun.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Login
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder=""
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 pr-12 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                  placeholder="Kamida 4 belgi"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                  aria-label={showPass ? 'Yashirish' : 'Ko‘rsatish'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Parolni tasdiqlang
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder="Parolni qayta kiriting"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-wide text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Saqlash
            </button>
          </form>
        </div>

        {/* O‘ng: jadval */}
        <div className="min-w-0 w-full">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Adminlar ro‘yxati</h2>
            <span className="text-[10px] font-black text-slate-600 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              {admins.length} ta
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Ism</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Login</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Rol</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-600 font-bold text-xs uppercase">
                        Hali admin yo‘q
                      </td>
                    </tr>
                  )}
                  {admins.map((emp, idx) => {
                    const id = emp._id || emp.id;
                    const busy = loading === id;
                    const isSelf = myId && id != null && String(id) === myId;
                    return (
                      <tr key={id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 text-white font-bold">{emp.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{emp.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                              emp.role === 'SUPER_ADMIN'
                                ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            }`}
                          >
                            {ROLE_LABEL[emp.role] || emp.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(emp)}
                            disabled={busy}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-40 mr-1"
                            aria-label="Tahrirlash"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp)}
                            disabled={busy || isSelf}
                            title={isSelf ? 'O‘zingizni o‘chirolmaysiz' : 'O‘chirish'}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                            aria-label="O‘chirish"
                          >
                            {busy ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Tahrirlash modali */}
      {editEmp && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setEditEmp(null)}
        >
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black text-lg italic">Adminni tahrirlash</h3>
              <button
                type="button"
                onClick={() => setEditEmp(null)}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Ism</label>
                <input
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                  value={editEmp.name || ''}
                  onChange={(e) => setEditEmp({ ...editEmp, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Login</label>
                <input
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30 font-mono text-sm"
                  value={editEmp.email || ''}
                  onChange={(e) => setEditEmp({ ...editEmp, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Lavozim</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                  value={editEmp.position || ''}
                  onChange={(e) => setEditEmp({ ...editEmp, position: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Rol</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                  value={editEmp.role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'}
                  onChange={(e) => setEditEmp({ ...editEmp, role: e.target.value })}
                >
                  <option value="SUPER_ADMIN">Super admin</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Yangi parol (ixtiyoriy)
                </label>
                <div className="relative">
                  <input
                    type={editShowPass ? 'text' : 'password'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-11 text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500/30"
                    placeholder="O‘zgartirmasangiz bo‘sh qoldiring"
                    value={editNewPass}
                    onChange={(e) => setEditNewPass(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 p-1"
                  >
                    {editShowPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditEmp(null)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-black text-xs uppercase hover:bg-slate-900"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSuperAdminPage;
