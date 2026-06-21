import React, { useState, useRef, useEffect } from 'react';
import { Info, Clock, Globe2, Save } from 'lucide-react';

interface Props {
  onSave?: (data: any) => void;
  initialTitle?: string;
  initialDescription?: string;
  initialData?: any;
}

const BasicSettings: React.FC<Props> = ({ onSave, initialTitle = '', initialDescription = '', initialData }) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const [tzMode, setTzMode] = useState<'user' | 'fixed'>('fixed');
  const [fixedTimezone, setFixedTimezone] = useState('America/Guatemala');
  
  const [langMode, setLangMode] = useState<'auto' | 'fixed'>('auto');
  const [fixedLanguage, setFixedLanguage] = useState('es');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes to state if needed
  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.description !== undefined) setDescription(initialData.description);
      if (initialData.logoBase64 !== undefined) setLogoBase64(initialData.logoBase64);
      if (initialData.tzMode) setTzMode(initialData.tzMode);
      if (initialData.fixedTimezone) setFixedTimezone(initialData.fixedTimezone);
      if (initialData.langMode) setLangMode(initialData.langMode);
      if (initialData.fixedLanguage) setFixedLanguage(initialData.fixedLanguage);
    }
  }, [initialData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size under 1MB
      if (file.size > 1024 * 1024) {
        alert('El archivo no debe exceder 1 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('El título es requerido');
      return;
    }
    
    const settingsData = {
      title,
      description,
      logoBase64,
      tzMode,
      fixedTimezone: tzMode === 'fixed' ? fixedTimezone : null,
      langMode,
      fixedLanguage: langMode === 'fixed' ? fixedLanguage : null,
    };
    
    if (onSave) {
      onSave(settingsData);
    }
  };

  return (
    <div className="srf-panel pb-10">
      {/* Action Bar */}
      <div className="flex justify-end gap-3 px-6 py-4 border-b hairline srf-sunken/80 backdrop-blur-md sticky top-0 z-10">
        <button className="px-6 py-2.5 srf-panel border hairline ink-2 rounded-xl text-[13px] font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer hover:srf-sunken">
          Cancelar
        </button>
        <button onClick={handleSave} className="px-6 py-2.5 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-semibold flex items-center transition-all duration-200 shadow-sm cursor-pointer">
          <Save className="w-4 h-4 mr-2" /> Guardar Cambios
        </button>
      </div>

      <div className="p-8 space-y-12 max-w-5xl mx-auto">
        {/* Title & Desc */}
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-7">
            <div>
              <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
                Título <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Ej. Sesión de Consultoría"
                  className="w-full srf-sunken border border-transparent focus:srf-panel rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 focus:border-black transition-all duration-200 outline-none"
                />
                <span className="absolute right-3.5 top-3.5 text-[10px] ink-3 font-medium srf-sunken px-1.5 rounded-sm">{title.length}/100</span>
              </div>
            </div>
            
            <div>
              <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
                Descripción <span className="ink-3 ml-1 font-normal">(Opcional)</span> <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
              </label>
              <div className="relative">
                <textarea 
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade una descripción para este calendario que verán tus clientes..."
                  className="w-full srf-sunken border border-transparent focus:srf-panel rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 focus:border-black transition-all duration-200 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="w-full md:w-72">
            <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
              Logo Institucional <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
            </label>
            <div className="border hairline rounded-2xl p-4 srf-sunken flex flex-col items-center justify-center text-center relative h-40 group hover:border-slate-300 transition-colors">
              {logoBase64 ? (
                <>
                  <div onClick={removeLogo} className="absolute top-2.5 right-2.5 cursor-pointer p-1.5 srf-panel text-rose-500 rounded-full shadow-sm hover:bg-rose-50 transition-all duration-200 z-10 border hairline opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </div>
                  <img src={logoBase64} alt="Logo" className="max-w-full max-h-full rounded-lg object-contain mix-blend-multiply" />
                </>
              ) : (
                 <div className="ink-3 flex flex-col items-center">
                   <svg className="w-8 h-8 mb-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <span className="text-xs font-medium">Sin logo configurado</span>
                 </div>
              )}
            </div>
            <p className="text-[11px] ink-3 text-center font-normal mt-3 mb-4 leading-relaxed">Formato: 250x75px, JPEG, PNG o GIF.<br/>Máx. 1 MB.</p>
            
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleLogoUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 srf-panel border hairline hover:border-slate-300 ink-1 rounded-xl font-semibold text-[13px] flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
            >
              Cargar Imagen
            </button>
          </div>
        </div>

        <hr className="border-t hairline" />

        {/* Zona Horaria */}
        <div>
          <h3 className="text-lg font-semibold ink-1 mb-6 tracking-tight">Zona Horaria</h3>
          <div className="mb-6 w-full max-w-sm">
            <label className="block text-sm font-semibold ink-1 mb-2">Tu Zona Horaria (Base)</label>
            <select 
              value={fixedTimezone}
              onChange={(e) => setFixedTimezone(e.target.value)}
              className="w-full srf-panel border hairline hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm ink-1 outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all duration-200 cursor-pointer shadow-sm"
            >
              <option value="America/Mexico_City">America/Mexico City (México)</option>
              <option value="America/Guatemala">America/Guatemala (Guatemala)</option>
              <option value="America/El_Salvador">America/El_Salvador (El Salvador)</option>
              <option value="America/Tegucigalpa">America/Tegucigalpa (Honduras)</option>
              <option value="America/Managua">America/Managua (Nicaragua)</option>
              <option value="America/Costa_Rica">America/Costa_Rica (Costa Rica)</option>
              <option value="America/Panama">America/Panama (Panamá)</option>
              <option value="America/Havana">America/Havana (Cuba)</option>
              <option value="America/Santo_Domingo">America/Santo_Domingo (República Dominicana)</option>
              <option value="America/Puerto_Rico">America/Puerto_Rico (Puerto Rico)</option>
              <option value="America/Bogota">America/Bogota (Colombia)</option>
              <option value="America/Caracas">America/Caracas (Venezuela)</option>
              <option value="America/Guayaquil">America/Guayaquil (Ecuador)</option>
              <option value="America/Lima">America/Lima (Perú)</option>
              <option value="America/La_Paz">America/La_Paz (Bolivia)</option>
              <option value="America/Asuncion">America/Asuncion (Paraguay)</option>
              <option value="America/Santiago">America/Santiago (Chile)</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires (Argentina)</option>
              <option value="America/Montevideo">America/Montevideo (Uruguay)</option>
              <option value="Europe/Madrid">Europe/Madrid (España)</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div 
              onClick={() => setTzMode('user')}
              className={`flex flex-col items-center text-center cursor-pointer group rounded-2xl p-6 transition-all duration-300 border-2 ${tzMode === 'user' ? 'border-black srf-sunken' : 'border-transparent hover:srf-sunken'}`}
            >
              <div className={`w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative transition-colors ${tzMode === 'user' ? 'srf-sunken' : 'srf-sunken group-hover:bg-slate-200'}`}>
                {tzMode === 'user' ? (
                  <div className="absolute -top-2 -right-2 accent-bg text-white rounded-full p-1 shadow-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                ) : (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-slate-300 srf-panel shadow-sm"></div>
                )}
                <Clock className={`w-10 h-10 ${tzMode === 'user' ? 'text-black' : 'ink-3'}`} />
              </div>
              <h4 className="font-semibold text-[15px] ink-1 mb-2">Permitir a los usuarios elegir</h4>
              <p className="text-[13px] ink-3 leading-relaxed max-w-xs">El sistema mostrará un conversor de zona horaria para que el cliente seleccione.</p>
            </div>

            <div 
              onClick={() => setTzMode('fixed')}
              className={`flex flex-col items-center text-center cursor-pointer group rounded-2xl p-6 transition-all duration-300 border-2 ${tzMode === 'fixed' ? 'border-black srf-sunken' : 'border-transparent hover:srf-sunken'}`}
            >
              <div className={`w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative transition-colors ${tzMode === 'fixed' ? 'srf-sunken' : 'srf-sunken group-hover:bg-slate-200'}`}>
                {tzMode === 'fixed' ? (
                  <div className="absolute -top-2 -right-2 accent-bg text-white rounded-full p-1 shadow-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                ) : (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-slate-300 srf-panel shadow-sm"></div>
                )}
                <Clock className={`w-10 h-10 ${tzMode === 'fixed' ? 'text-black' : 'ink-3'}`} />
              </div>
              <h4 className="font-semibold text-[15px] ink-1 mb-2">Ocultar Zona Horaria</h4>
              <p className="text-[13px] ink-3 leading-relaxed max-w-xs mb-5">El calendario mostrará los horarios de manera estricta en tu zona horaria base.</p>
            </div>

          </div>
        </div>

        <hr className="border-t hairline" />

        {/* Idioma */}
        <div>
          <h3 className="text-lg font-semibold ink-1 mb-6 tracking-tight">Idioma de Visualización</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div 
              onClick={() => setLangMode('auto')}
              className={`flex flex-col items-center text-center cursor-pointer group rounded-2xl p-6 transition-all duration-300 border-2 ${langMode === 'auto' ? 'border-black srf-sunken' : 'border-transparent hover:srf-sunken'}`}
            >
              <div className={`w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative transition-colors ${langMode === 'auto' ? 'srf-sunken' : 'srf-sunken group-hover:bg-slate-200'}`}>
                {langMode === 'auto' ? (
                  <div className="absolute -top-2 -right-2 accent-bg text-white rounded-full p-1 shadow-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                ) : (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-slate-300 srf-panel shadow-sm"></div>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${langMode === 'auto' ? 'accent-bg text-white' : 'bg-slate-400 text-white'}`}>
                   <span className="font-bold text-xl">A</span>
                   <Globe2 className="w-5 h-5 ml-1 opacity-70" />
                </div>
              </div>
              <h4 className="font-semibold text-[15px] ink-1 mb-2">Automático (Recomendado)</h4>
              <p className="text-[13px] ink-3 leading-relaxed max-w-xs">El idioma será el mismo que el del navegador del cliente.</p>
            </div>

            <div 
              onClick={() => setLangMode('fixed')}
              className={`flex flex-col items-center text-center cursor-pointer group rounded-2xl p-6 transition-all duration-300 border-2 ${langMode === 'fixed' ? 'border-black srf-sunken' : 'border-transparent hover:srf-sunken'}`}
            >
              <div className={`w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative transition-colors ${langMode === 'fixed' ? 'srf-sunken' : 'srf-sunken group-hover:bg-slate-200'}`}>
                {langMode === 'fixed' ? (
                  <div className="absolute -top-2 -right-2 accent-bg text-white rounded-full p-1 shadow-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                ) : (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-slate-300 srf-panel shadow-sm"></div>
                )}
                <Globe2 className={`w-10 h-10 ${langMode === 'fixed' ? 'text-black' : 'ink-3'}`} />
              </div>
              <h4 className="font-semibold text-[15px] ink-1 mb-2">Idioma fijo</h4>
              <p className="text-[13px] ink-3 leading-relaxed max-w-xs mb-5">El calendario se mostrará siempre en el idioma configurado.</p>
              
              {langMode === 'fixed' && (
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm text-left">
                  <label className="block text-xs font-semibold ink-2 mb-1.5 ml-1">Idioma Elegido</label>
                  <select 
                    value={fixedLanguage}
                    onChange={(e) => setFixedLanguage(e.target.value)}
                    className="w-full srf-panel border hairline hover:border-slate-300 rounded-xl px-4 py-2.5 text-sm ink-1 outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <option value="es">Español</option>
                    <option value="en">English (Inglés)</option>
                    <option value="pt">Português (Portugués)</option>
                    <option value="fr">Français (Francés)</option>
                    <option value="de">Deutsch (Alemán)</option>
                    <option value="it">Italiano (Italiano)</option>
                    <option value="zh">中文 (Chino)</option>
                  </select>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;
