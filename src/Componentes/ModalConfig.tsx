// src/Componentes/ModalConfig.tsx
// Modal de configuración (Administrador puede editar tiempos; Cliente solo ve)
import type { ConfigSimulador } from '../types';
import { useState } from 'react';

interface Props {
  show: boolean;
  config: ConfigSimulador;
  onConfirm: (c: ConfigSimulador) => void;
  onClose: () => void;
}

const ModalConfig = ({ show, config, onConfirm, onClose }: Props) => {
  const configNormalizada: ConfigSimulador = config.rol === 'cliente'
    ? {
        ...config,
        modo: 'real',
        tiempoAmarillo: 60,
        tiempoRojo: 120,
      }
    : config;

  const [local, setLocal] = useState<ConfigSimulador>(configNormalizada);

  if (!show) return null;

  const isAdmin = config.rol === 'admin'; // usa el rol del login, no el local
  const rolColor  = isAdmin ? '#a78bfa' : '#38bdf8';
  const rolBg     = isAdmin ? 'rgba(124,58,237,0.12)' : 'rgba(14,165,233,0.12)';
  const rolBorder = isAdmin ? 'rgba(124,58,237,0.3)'  : 'rgba(14,165,233,0.3)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md mx-auto bg-[#0f172a] rounded-2xl p-4 md:p-6 overflow-y-auto max-h-[90vh] shadow-2xl">
        <h2 className="text-base md:text-xl font-bold text-white mb-4">
          ⚙ Configuración del Simulador
        </h2>

        {/* Indicador de rol activo — solo lectura, no editable aquí */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8, marginBottom: 20,
          background: rolBg, border: `1px solid ${rolBorder}`,
        }}>
          <span style={{ fontSize: '1.1rem' }}>{isAdmin ? '👑' : '👁'}</span>
          <div>
            <span style={{ color: rolColor, fontWeight: 700, fontSize: '0.82rem' }}>
              {isAdmin ? 'Administrador' : 'Cliente'}
            </span>
            <span style={{ color: '#475569', fontSize: '0.72rem', marginLeft: 8 }}>
              {isAdmin
                ? '· Puede configurar tiempos del semáforo'
                : '· Vista solo lectura · Tiempos fijos del sistema'}
            </span>
          </div>
        </div>

        {!isAdmin && (
          <div style={{
            marginTop: -8,
            marginBottom: 18,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.22)',
            color: '#7dd3fc',
            fontSize: '0.76rem',
            lineHeight: 1.5,
          }}>
            👁 Como <strong>Cliente</strong>, solamente está permitido trabajar en <strong>Tiempo Real</strong>.
            La simulación no está disponible para este perfil.
          </div>
        )}

        {/* MODO TIEMPO */}
        {isAdmin ? (
          <div className="mb-4 md:mb-5">
            <Label>Modo de tiempo</Label>
            <div className="flex gap-2 w-full">
              {(['simulacion', 'real'] as const).map(m => (
                <button key={m} onClick={() => setLocal(l => ({ ...l, modo: m }))}
                  className="flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-medium border-2 transition-colors"
                  style={{
                    borderColor: local.modo === m ? '#0ea5e9' : 'rgba(148,163,184,0.2)',
                    background: local.modo === m ? 'rgba(14,165,233,0.2)' : 'transparent',
                    color: local.modo === m ? '#38bdf8' : '#64748b',
                  }}>
                  {m === 'simulacion' ? '⚡ Simulación (seg)' : '🕒 Tiempo Real (min)'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* UMBRALES SEMÁFORO */}
        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: isAdmin ? 24 : 8 }}>
          <div>
            <Label>🟡 Amarillo ({local.modo === 'simulacion' ? 'seg' : 'min'})</Label>
            <Input
              type="number" value={local.tiempoAmarillo}
              disabled={!isAdmin}
              onChange={v => setLocal(l => ({ ...l, tiempoAmarillo: Number(v) }))}
            />
          </div>
          <div>
            <Label>🔴 Rojo ({local.modo === 'simulacion' ? 'seg' : 'min'})</Label>
            <Input
              type="number" value={local.tiempoRojo}
              disabled={!isAdmin}
              onChange={v => setLocal(l => ({ ...l, tiempoRojo: Number(v) }))}
            />
          </div>
        </div>

        {/* Aviso cliente — tiempos fijos */}
        {!isAdmin && (
          <div style={{
            background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: '0.75rem', color: '#38bdf8',
          }}>
            🔒 Como Cliente, los tiempos del semáforo son fijos:<br />
            <span style={{ color: '#64748b' }}>
              🟢 Verde ≤ 60 min &nbsp;·&nbsp; 🟡 Amarillo 61–120 min &nbsp;·&nbsp; 🔴 Rojo ≥ 121 min
            </span>
          </div>
        )}

        {/* AVISO CONEXIÓN */}
        {isAdmin && (
          <div style={{
            background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: '0.78rem', color: '#4ade80',
          }}>
            ✅ Conectado a Supabase · Datos actualizados cada 10–15 s
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="w-full rounded-lg border border-slate-500/40 bg-transparent text-slate-400 py-2.5 text-sm">
            Cancelar
          </button>
          <button onClick={() => onConfirm(
            isAdmin
              ? local
              : { ...local, modo: 'real', tiempoAmarillo: 60, tiempoRojo: 120, rol: 'cliente' }
          )} className="w-full rounded-lg border-0 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 text-sm">
            🚀 Iniciar
          </button>
        </div>
      </div>
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

const Input = ({ value, onChange, type, disabled }: {
  value: number; type: string; disabled?: boolean;
  onChange: (v: string) => void;
}) => (
  <input
    type={type} value={value} disabled={disabled}
    onChange={e => onChange(e.target.value)}
    className={`w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
  />
);

export default ModalConfig;

