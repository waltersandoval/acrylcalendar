/**
 * VISTA: ADMINISTRADORES
 * CRUD de administradores en Firestore. La creación intenta usar la Cloud
 * Function `inviteAdministrator` (crea usuario + rol + enlace de invitación);
 * si aún no está desplegada, hace fallback a un alta directa en Firestore.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit, Trash2, X, Loader2, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { db, functions } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import Sheet from '../ui/Sheet';
import { useAuth } from '../../lib/auth';

interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  photoURL?: string | null;
}

const BANNER_KEY = 'acryl_admin_banner_hidden';
const emptyForm = { name: '', email: '', phone: '', role: 'admin' };

const Administrators: React.FC = () => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(() => localStorage.getItem(BANNER_KEY) !== '1');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Admin | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setAdmins([]);
      return;
    }
    try {
      const unsub = onSnapshot(query(collection(db, 'administrators'), where('ownerUid', '==', user.uid)), (snap) => {
        setAdmins(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }, (e) => console.warn('Firestore administrators error:', e));
      return () => unsub();
    } catch (e) {
      console.warn('Firestore no disponible para administradores.');
    }
  }, [user?.uid]);

  const dismissBannerForever = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setShowBanner(false);
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return admins;
    return admins.filter((a) =>
      `${a.name} ${a.email} ${a.phone || ''}`.toLowerCase().includes(t),
    );
  }, [admins, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setInviteLink(null);
    setFormOpen(true);
  };
  const openEdit = (a: Admin) => {
    setEditing(a);
    setForm({ name: a.name || '', email: a.email || '', phone: a.phone || '', role: a.role || 'admin' });
    setError(null);
    setInviteLink(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateDoc(doc(db, 'administrators', editing.id), {
          name: form.name, email: form.email, phone: form.phone, role: form.role,
        });
        setFormOpen(false);
      } else {
        // Intentar la Cloud Function (crea usuario + rol + enlace de invitación).
        try {
          const invite = httpsCallable(functions, 'inviteAdministrator');
          const res: any = await invite(form);
          if (res?.data?.inviteLink) setInviteLink(res.data.inviteLink);
          else setFormOpen(false);
        } catch (cfErr) {
          // Fallback: alta directa en Firestore (la CF aún no está desplegada).
          console.warn('inviteAdministrator no disponible, usando alta directa:', cfErr);
          await addDoc(collection(db, 'administrators'), {
            ...form,
            ownerUid: user?.uid || null,
            createdBy: user?.uid || null,
            status: 'pending',
            createdAt: serverTimestamp(),
          });
          setFormOpen(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el administrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'administrators', confirmDelete.id));
    } catch (e) {
      console.error('Error eliminando administrador:', e);
    } finally {
      setConfirmDelete(null);
    }
  };

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 h-full max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 mb-1">Administradores</h2>
           <p className="text-slate-500 font-semibold text-sm">Vea y organice a sus administradores</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[250px]">
             <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar administrador..."
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black shadow-sm"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={openCreate} className="bg-black hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-colors cursor-pointer whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            NUEVO ADMINISTRADOR
          </button>
        </div>
      </div>

      {showBanner && (
        <div className="bg-slate-900 rounded-xl p-5 text-white relative mb-8 shadow-md">
           <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white cursor-pointer">
             <X className="h-5 w-5" />
           </button>
           <h3 className="font-bold text-lg mb-1">Gestión del administrador</h3>
           <p className="text-sm text-slate-300 max-w-4xl opacity-90 leading-relaxed mb-4">
             Cuando se crea un calendario, se debe indicar quién será el administrador. Por ejemplo, en un calendario para programar cortes de pelo, el administrador es el peluquero; su nombre aparecerá en la pantalla donde se harán las reservas.
           </p>
           <div className="flex justify-end gap-3 mt-2">
             <button onClick={dismissBannerForever} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-semibold transition-colors cursor-pointer border border-slate-700">
               No Mostrar De Nuevo
             </button>
             <button onClick={() => setShowBanner(false)} className="px-8 py-1.5 bg-white text-slate-900 hover:bg-slate-50 rounded-md text-sm font-bold shadow-sm transition-colors cursor-pointer">
               Listo!
             </button>
           </div>
        </div>
      )}

      <div className="bg-transparent space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-500 shadow-sm">
            <p className="font-medium">{search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay administradores. Crea el primero.'}</p>
          </div>
        )}
        {filtered.map((admin) => (
          <div key={admin.id} className="bg-white border border-slate-100/80 rounded-2xl p-4 flex items-center shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200">
            {admin.photoURL ? (
               <img src={admin.photoURL} alt={admin.name} className="w-11 h-11 flex-shrink-0 rounded-full object-cover border border-slate-200 mr-4" />
            ) : (
               <div className="w-11 h-11 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center mr-4 border border-slate-200 shadow-sm text-slate-500 font-bold text-sm">
                  {admin.name.charAt(0).toUpperCase()}
               </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-1 min-w-0">
                <span className="font-bold text-slate-800 text-[15px] sm:w-1/3 w-full truncate pr-4">{admin.name}</span>
                <span className="text-slate-500 text-[13px] font-medium flex-1 truncate">{admin.email}{admin.phone ? `  ·  ${admin.phone}` : ''}</span>
            </div>
            <div className="flex items-center space-x-1 ml-4 border-l border-slate-200/60 pl-3 shrink-0">
               <button onClick={() => openEdit(admin)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-all duration-200 cursor-pointer" title="Editar">
                 <Edit className="w-4 h-4" />
               </button>
               <button onClick={() => setConfirmDelete(admin)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all duration-200 cursor-pointer" title="Eliminar">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sheet: crear/editar administrador */}
      <Sheet isOpen={formOpen} onClose={() => setFormOpen(false)} maxWidthClass="max-w-md" zIndex={60}>
        {inviteLink ? (
          <div className="bg-white p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Administrador invitado</h3>
            <p className="text-sm text-slate-500 mb-4">Comparte este enlace para que active su cuenta y defina su contraseña.</p>
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-3">
              <LinkIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <code className="text-[12px] text-emerald-300 break-all flex-1 select-all">{inviteLink}</code>
              <button onClick={copyInvite} className="shrink-0 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10" title="Copiar">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setFormOpen(false)} className="w-full mt-5 bg-black hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-colors">Listo</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">{editing ? 'Editar administrador' : 'Nuevo administrador'}</h3>
            <div>
              <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nombre completo" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-black focus:border-black" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="correo@ejemplo.com" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-black focus:border-black" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Teléfono (opcional)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+504 ..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-black focus:border-black" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-black focus:border-black">
                <option value="admin">Administrador</option>
                <option value="editor">Editor</option>
                <option value="viewer">Solo lectura</option>
              </select>
            </div>
            {error && <p className="text-rose-500 text-xs font-medium">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-black hover:bg-slate-900 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Guardar cambios' : 'Invitar administrador'}
              </button>
            </div>
          </form>
        )}
      </Sheet>

      {/* Sheet: confirmar eliminación */}
      <Sheet isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidthClass="max-w-sm" zIndex={70}>
        <div className="bg-white p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar administrador</h3>
          <p className="text-slate-600 mb-6 text-sm">¿Seguro que deseas eliminar a <strong>{confirmDelete?.name}</strong>?</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">Atrás</button>
            <button onClick={handleDelete} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors">Eliminar</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default Administrators;
