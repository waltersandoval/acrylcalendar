import React, { useState, useEffect, useRef } from 'react';
import { Send, Eye, EyeOff, Info, HelpCircle, Lock } from 'lucide-react';
import { functions } from '../../../lib/firebase';

interface Props {
  calendarId?: string;
  initialData?: any;
  initialDataForms?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
}

const SECRET_PLACEHOLDER = '••••••••••••••••••••••••';

const MarketingSettings: React.FC<Props> = ({
  calendarId,
  initialData,
  initialDataForms,
  onSave,
  onRegisterSave,
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialData?.enabled || false);
  const [apiKey, setApiKey] = useState<string>(initialData?.sendfoxConfigured ? SECRET_PLACEHOLDER : '');
  const [listId, setListId] = useState<string>(initialData?.listId || '');
  const [tags, setTags] = useState<string>(initialData?.tags || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [customFieldsMapping, setCustomFieldsMapping] = useState<Record<string, string>>(
    initialData?.customFieldsMapping || {}
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Sync loaded async initialData
  useEffect(() => {
    if (initialData) {
      setEnabled(!!initialData.enabled);
      setApiKey(initialData.sendfoxConfigured ? SECRET_PLACEHOLDER : '');
      setListId(initialData.listId || '');
      setTags(initialData.tags || '');
      setCustomFieldsMapping(initialData.customFieldsMapping || {});
    }
  }, [initialData]);

  // Extract all fields from forms data to map them
  const formFields = React.useMemo(() => {
    const fields: { id: string; label: string }[] = [];
    if (initialDataForms?.groupsData && Array.isArray(initialDataForms.groupsData)) {
      initialDataForms.groupsData.forEach((group: any) => {
        if (group.fields && Array.isArray(group.fields)) {
          group.fields.forEach((field: any) => {
            // Exclude the default name, email, phone as they map natively
            if (field.label !== 'Nombre' && field.label !== 'Email' && field.label !== 'Teléfono') {
              if (!fields.some((f) => f.id === field.id)) {
                fields.push({ id: field.id, label: field.label });
              }
            }
          });
        }
      });
    }
    return fields;
  }, [initialDataForms]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (enabled) {
      if (!apiKey) {
        setError('El API Key de SendFox es requerido para activar la integración.');
        return;
      }
      if (!listId) {
        setError('El List ID de SendFox es requerido para activar la integración.');
        return;
      }
    }

    setSaving(true);
    try {
      if (functions && calendarId) {
        const { httpsCallable } = await import('firebase/functions');
        const saveFn = httpsCallable(functions, 'saveSendfoxConfig');
        await saveFn({
          calendarId,
          enabled,
          apiKey,
          listId,
          tags,
          customFieldsMapping,
        });
      }

      onSave?.({
        enabled,
        listId,
        tags,
        customFieldsMapping,
        sendfoxConfigured: enabled ? true : (initialData?.sendfoxConfigured || false),
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error al guardar configuración de SendFox:', err);
      setError(err.message || 'Error al conectar con la API de SendFox. Verifica tu API Key.');
    } finally {
      setSaving(false);
    }
  };

  const saveImpl = useRef<() => void>(() => {});
  saveImpl.current = handleSave;
  useEffect(() => {
    onRegisterSave?.(() => saveImpl.current());
  }, [onRegisterSave]);

  const handleMappingChange = (fieldId: string, sendfoxKey: string) => {
    setCustomFieldsMapping((prev) => ({
      ...prev,
      [fieldId]: sendfoxKey,
    }));
  };

  return (
    <div className="srf-panel pb-10 rounded-b-2xl">
      {/* Sticky Action Bar */}
      <div className="builder-embedded-toolbar sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Send className="w-4 h-4 ink-3 shrink-0" />
            <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">
              Integración con SendFox
            </h3>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Toggle habilitado */}
        <div className="flex items-center justify-between p-4 rounded-2xl srf-sunken border hairline">
          <div className="space-y-1">
            <label htmlFor="sendfox-enabled" className="text-sm font-bold ink-1 block cursor-pointer">
              Activar Sincronización
            </label>
            <span className="text-xs ink-3 block leading-relaxed max-w-[240px]">
              Envía automáticamente nuevos leads de reservas directamente a tus listas de SendFox.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              id="sendfox-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
          </label>
        </div>

        {enabled && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* API Key */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> API Personal Token (API Key)
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Insertar token de SendFox..."
                  className="w-full srf-sunken border hairline rounded-xl pl-3 pr-10 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:opacity-55"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 ink-3 hover:ink-1 transition-colors cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              <p className="text-[11px] ink-3 flex items-start gap-1 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Obtén tu token en tu panel de SendFox bajo Settings → API → Personal Access Tokens.
              </p>
            </div>

            {/* List ID */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3">
                List ID (Lista de destino)
              </label>
              <input
                type="text"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                placeholder="Ej. 123456"
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:opacity-55"
              />
              <p className="text-[11px] ink-3 flex items-start gap-1 leading-relaxed">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                El número de ID que encuentras en la URL de tu lista en SendFox (ej. sendfox.com/lists/<b>123456</b>).
              </p>
            </div>

            {/* Etiquetas (Tags) */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3">
                Etiquetas adicionales (Tags)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ej. Cliente, Evento"
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:opacity-55"
              />
              <p className="text-[11px] ink-3 leading-relaxed">
                Separa múltiples etiquetas usando comas. Se aplicarán al contacto recién creado en SendFox.
              </p>
            </div>

            {/* Mapeo de campos personalizados */}
            {formFields.length > 0 && (
              <div className="space-y-3 pt-3 border-t hairline">
                <h4 className="text-xs font-bold ink-1">Campos personalizados del formulario</h4>
                <p className="text-[11px] ink-3 leading-relaxed">
                  Asigna las respuestas de tus preguntas personalizadas a los nombres de campos (Custom Fields) definidos en SendFox.
                </p>

                <div className="space-y-3">
                  {formFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-3 justify-between p-3 rounded-xl srf-sunken border hairline">
                      <span className="text-xs font-bold ink-2 truncate max-w-[150px]" title={field.label}>
                        {field.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] ink-3 uppercase tracking-wider">→</span>
                        <input
                          type="text"
                          value={customFieldsMapping[field.id] || ''}
                          onChange={(e) => handleMappingChange(field.id, e.target.value)}
                          placeholder="Key en SendFox (ej. ciudad)"
                          className="w-[160px] srf-panel border hairline rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensajes de feedback */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl leading-relaxed">
            ¡Configuración de SendFox guardada con éxito!
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingSettings;
