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
  const [local, setLocal] = useState<ConfigSimulador>(config);

  if (!show) return null;

  const isAdmin = config.rol === 'admin'; // usa el rol del login, no el local
  const rolColor  = isAdmin ? '#a78bfa' : '#38bdf8';
  const rolBg     = isAdmin ? 'rgba(124,58,237,0.12)' : 'rgba(14,165,233,0.12)';
  const rolBorder = isAdmin ? 'rgba(124,58,237,0.3)'  : 'rgba(14,165,233,0.3)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 16, padding: '32px 36px', minWidth: 400, maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        <h2 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6, fontSize: '1.2rem' }}>
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

        {/* MODO TIEMPO */}
        <div style={{ marginBottom: 18 }}>
          <Label>Modo de tiempo</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['simulacion', 'real'] as const).map(m => (
              <button key={m} onClick={() => setLocal(l => ({ ...l, modo: m }))} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '2px solid',
                borderColor: local.modo === m ? '#0ea5e9' : 'rgba(148,163,184,0.2)',
                background: local.modo === m ? 'rgba(14,165,233,0.2)' : 'transparent',
                color: local.modo === m ? '#38bdf8' : '#64748b',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              }}>
                {m === 'simulacion' ? '⚡ Simulación (seg)' : '🕒 Tiempo Real (min)'}
              </button>
            ))}
          </div>
        </div>

        {/* UMBRALES SEMÁFORO */}
        <div style={{ display: 'flex', gap: 16, marginBottom: isAdmin ? 24 : 8 }}>
          <div style={{ flex: 1 }}>
            <Label>🟡 Amarillo ({local.modo === 'simulacion' ? 'seg' : 'min'})</Label>
            <Input
              type="number" value={local.tiempoAmarillo}
              disabled={!isAdmin}
              onChange={v => setLocal(l => ({ ...l, tiempoAmarillo: Number(v) }))}
            />
          </div>
          <div style={{ flex: 1 }}>
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

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(local)} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer',
            fontSize: '0.9rem',
          }}>
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
    style={{
      width: '100%', padding: '8px 12px', borderRadius: 8,
      background: disabled ? 'rgba(30,41,59,0.5)' : 'rgba(30,41,59,0.8)',
      border: '1px solid rgba(148,163,184,0.2)',
      color: disabled ? '#475569' : '#f1f5f9',
      fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
    }}
  />
);

export default ModalConfig;

