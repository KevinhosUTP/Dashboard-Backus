// src/Componentes/ModalReporte.tsx
import { useEffect, useState, startTransition } from 'react';
import type { StatsSimulador, VwPromedioPatioNeto, VwDashboardTurnos } from '../types';
import {
  fetchPromedioPatioNeto,
  fetchDashboardTurnos,
  intervalAMinutos,
} from '../services/supabaseService';

interface Props {
  show: boolean;
  stats: StatsSimulador;
  panelPromedio: VwPromedioPatioNeto | null;
  panelTurnos:   VwDashboardTurnos   | null;
  onClose: () => void;
}

const ModalReporte = ({ show, stats, panelPromedio: promProp, panelTurnos: turnosProp, onClose }: Props) => {
  // Recarga los datos frescos de Supabase al abrir el reporte
  const [promedio, setPromedio] = useState<VwPromedioPatioNeto | null>(promProp);
  const [turnos,   setTurnos]   = useState<VwDashboardTurnos   | null>(turnosProp);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!show) return;
    startTransition(() => setCargando(true));
    Promise.all([fetchPromedioPatioNeto(), fetchDashboardTurnos()])
      .then(([p, t]) => {
        startTransition(() => {
          if (p) setPromedio(p);
          if (t) setTurnos(t);
        });
      })
      .finally(() => startTransition(() => setCargando(false)));
  }, [show]);

  // Sincronizar con los props cuando cambien desde el padre
  useEffect(() => { if (promProp) startTransition(() => setPromedio(promProp)); }, [promProp]);
  useEffect(() => { if (turnosProp) startTransition(() => setTurnos(turnosProp)); }, [turnosProp]);

  if (!show) return null;

  const tiempoPromedio = promedio?.promedio_neto_patio
    ? `${intervalAMinutos(promedio.promedio_neto_patio).toFixed(1)}`
    : '—';

  const cards = [
    { label: 'Total atendidos (sesión)',       value: stats.total,                      color: '#38bdf8', icon: '🚛' },
    { label: 'Tiempo promedio neto de patio',  value: tiempoPromedio === '—' ? '—' : `${tiempoPromedio} min`, color: '#a78bfa', icon: '⏱' },
    { label: 'Turno 1  07:00–15:00',           value: turnos?.turno_1 ?? stats.atendidosTurno1, color: '#4ade80', icon: '🌅' },
    { label: 'Turno 2  15:01–23:00',           value: turnos?.turno_2 ?? stats.atendidosTurno2, color: '#fbbf24', icon: '🌤' },
    { label: 'Turno 3  23:01–06:59',           value: turnos?.turno_3 ?? stats.atendidosTurno3, color: '#f87171', icon: '🌙' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 16, padding: '32px 36px', minWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.3rem', margin: 0 }}>
            📊 Reporte de Sesión
          </h2>
          {cargando && (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Actualizando…</span>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 24, marginTop: 4 }}>
          Datos en tiempo real desde la base de datos
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          {cards.map(card => (
            <div key={card.label} style={{
              background: `rgba(${hexToRgb(card.color)}, 0.08)`,
              border: `1px solid rgba(${hexToRgb(card.color)}, 0.25)`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{card.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
          background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.9rem',
        }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

// Helper para convertir hex a rgb
const hexToRgb = (hex: string) => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export default ModalReporte;
