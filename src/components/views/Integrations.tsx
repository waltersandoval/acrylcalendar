/**
 * VISTA: INTEGRACIONES
 * Lista las integraciones "por defecto" del sistema + las personalizadas creadas
 * por el usuario (CRUD en Firestore: colección `integrations`). El OAuth real con
 * cada proveedor queda como fase posterior.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import Sheet from '../ui/Sheet';
import { useAuth } from '../../lib/auth';

interface Integration {
  id: string;
  account: string;
  service: string;
  type: 'custom' | 'default';
}

const BANNER_KEY = 'acryl_integrations_banner_hidden';

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'def-1', account: 'waltersandoval24@hotmail.es', service: 'Builderall Builder', type: 'default' },
  { id: 'def-2', account: 'waltersandoval24@hotmail.es', service: 'Mailingboss', type: 'default' },
  { id: 'def-3', account: 'waltersandoval24@hotmail.es', service: 'SMS Messaging', type: 'default' },
  { id: 'def-4', account: 'waltersandoval24@hotmail.es', service: 'Supercheckout', type: 'default' },
  { id: 'def-5', account: 'waltersandoval24@hotmail.es', service: 'Social Proof', type: 'default' },
  { id: 'def-6', account: 'waltersandoval24@hotmail.es', service: 'BuilderallZap', type: 'default' },
];

const SERVICE_OPTIONS = ['Calendario de Google', 'Outlook Calendar', 'Zoom', 'Stripe', 'Mailingboss', 'Webhook personalizado'];

const Integrations: React.FC = () => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(() => localStorage.getItem(BANNER_KEY) !== '1');
  const [custom, setCustom] = useState<Integration[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ service: SERVICE_OPTIONS[0], account: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Integration | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setCustom([]);
      return;
    }
    try {
      const unsub = onSnapshot(query(collection(db, 'integrations'), where('ownerUid', '==', user.uid)), (snap) => {
        setCustom(snap.docs.map((d) => ({ id: d.id, type: 'custom', ...(d.data() as any) })));
      }, (e) => console.warn('Firestore integrations error:', e));
      return () => unsub();
    } catch {
      console.warn('Firestore no disponible para integraciones.');
    }
  }, [user?.uid]);

  const dismissBannerForever = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setShowBanner(false);
  };

  const all = useMemo(() => [...custom, ...DEFAULT_INTEGRATIONS], [custom]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account.trim()) {
      setError('Indica la cuenta o email de la integración.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, 'integrations'), {
        account: form.account,
        service: form.service,
        type: 'custom',
        ownerUid: user?.uid || null,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setForm({ service: SERVICE_OPTIONS[0], account: '' });
      setFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo crear la integración.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'integrations', confirmDelete.id));
    } catch (e) {
      console.error('Error eliminando integración:', e);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-black mb-1">Integraciones</h2>
           <p className="ink-3 font-semibold text-sm">Gestione sus integraciones con aplicaciones externas</p>
        </div>
        <button onClick={() => { setError(null); setFormOpen(true); }} className="w-full md:w-auto accent-bg hover:brightness-110 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center shadow-sm transition-colors cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          CREAR NUEVA INTEGRACIÓN
        </button>
      </div>

      {showBanner && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white relative mb-8 shadow-md">
           <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 text-slate-300 hover:text-white cursor-pointer">
             <X className="h-5 w-5" />
           </button>
           <h3 className="font-bold text-lg mb-1">Integraciones</h3>
           <p className="text-sm text-slate-200 max-w-4xl opacity-90 leading-relaxed mb-4">
             Administre sus integraciones aquí para usarlas más tarde en el paso de automatización al crear o editar un calendario. Comience haciendo clic en "Crear nueva integración".
           </p>
           <div className="flex justify-end gap-3 mt-2">
             <button onClick={dismissBannerForever} className="px-4 py-1.5 bg-slate-700/30 hover:bg-slate-700/50 rounded-md text-sm font-semibold transition-colors cursor-pointer border border-slate-700/30">
               No Mostrar De Nuevo
             </button>
             <button onClick={() => setShowBanner(false)} className="px-8 py-1.5 srf-panel text-black hover:srf-sunken rounded-md text-sm font-bold shadow-sm transition-colors cursor-pointer">
               Listo!
             </button>
           </div>
        </div>
      )}

      <div className="bg-transparent space-y-2">
        {all.map((integration) => (
          <div key={integration.id} className="srf-panel border hairline rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <span className="font-bold ink-1 text-sm mb-2 sm:mb-0 sm:w-1/2 truncate">{integration.account}</span>
            <div className="flex justify-between items-center w-full sm:w-1/2">
                <div className="flex items-center text-emerald-500 font-semibold text-sm">
                   <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                   <span className="truncate">{integration.service} {integration.type === 'default' && <span className="ink-3 ml-1 font-medium">(Por defecto)</span>}</span>
                </div>
                {integration.type === 'custom' && (
                    <button onClick={() => setConfirmDelete(integration)} className="text-red-400 hover:text-red-600 transition-colors cursor-pointer ml-4 p-1 rounded hover:bg-red-50 shrink-0" title="Eliminar integración">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Sheet: nueva integración */}
      <Sheet isOpen={formOpen} onClose={() => setFormOpen(false)} maxWidthClass="max-w-md" zIndex={60}>
        <form onSubmit={handleCreate} className="srf-panel p-6 space-y-4">
          <h3 className="text-lg font-bold ink-1">Nueva integración</h3>
          <div>
            <label className="block text-[13px] font-semibold ink-3 mb-1.5">Servicio</label>
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="w-full srf-panel border hairline rounded-lg px-3 py-2.5 text-sm ink-1 outline-none focus:ring-2 focus:ring-black">
              {SERVICE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold ink-3 mb-1.5">Cuenta / Email</label>
            <input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} required placeholder="correo@ejemplo.com" className="w-full srf-panel border hairline rounded-lg px-3 py-2.5 text-sm ink-1 outline-none focus:ring-2 focus:ring-black" />
          </div>
          {error && <p className="text-rose-500 text-xs font-medium">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2.5 ink-2 font-medium hover:srf-sunken rounded-lg text-sm transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 accent-bg hover:brightness-110 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear integración
            </button>
          </div>
        </form>
      </Sheet>

      {/* Sheet: confirmar eliminación */}
      <Sheet isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidthClass="max-w-sm" zIndex={70}>
        <div className="srf-panel p-6">
          <h3 className="text-lg font-bold ink-1 mb-2">Eliminar integración</h3>
          <p className="ink-2 mb-6 text-sm">¿Eliminar la integración con <strong>{confirmDelete?.service}</strong> ({confirmDelete?.account})?</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 ink-2 font-medium hover:srf-sunken rounded-lg text-sm transition-colors">Atrás</button>
            <button onClick={handleDelete} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors">Eliminar</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default Integrations;
