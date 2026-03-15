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
  modo: 'simulacion' | 'real';
  stats: StatsSimulador;
  panelPromedio: VwPromedioPatioNeto | null;
  panelTurnos:   VwDashboardTurnos   | null;
  onClose: () => void;
}

const POLLING_REPORTE_MS = 6_000;

const ModalReporte = ({ show, modo, stats, panelPromedio: promProp, panelTurnos: turnosProp, onClose }: Props) => {
  // Solo en modo real refresca desde Supabase; en simulación usa datos de sesión
  const [promedio, setPromedio] = useState<VwPromedioPatioNeto | null>(promProp);
  const [turnos,   setTurnos]   = useState<VwDashboardTurnos   | null>(turnosProp);
  const [cargando, setCargando] = useState(false);
  const promedioPropValor = promProp?.promedio_neto_patio ?? null;
  const turno1Prop = turnosProp?.turno_1 ?? null;
  const turno2Prop = turnosProp?.turno_2 ?? null;
  const turno3Prop = turnosProp?.turno_3 ?? null;
  const fechaTurnosProp = turnosProp?.fecha ?? null;

  useEffect(() => {
    if (!show || modo !== 'real') return;

    const cargar = async () => {
      startTransition(() => setCargando(true));
      try {
        const [p, t] = await Promise.all([fetchPromedioPatioNeto(), fetchDashboardTurnos()]);
        startTransition(() => {
          setPromedio(p ?? null);
          setTurnos(t ?? null);
        });
      } finally {
        startTransition(() => setCargando(false));
      }
    };

    void cargar();
    const poller = setInterval(() => { void cargar(); }, POLLING_REPORTE_MS);
    return () => clearInterval(poller);
  }, [show, modo]);

  // Sincronizar con props:
  // - simulación: siempre reflejar sesión local
  // - real: aceptar nuevos valores válidos sin pisar con null
  useEffect(() => {
    if (modo === 'simulacion') {
      startTransition(() => setPromedio(null));
      return;
    }
    if (promedioPropValor != null) {
      startTransition(() => setPromedio({ promedio_neto_patio: promedioPropValor }));
    }
  }, [modo, promedioPropValor]);

  useEffect(() => {
    if (modo === 'simulacion') {
      startTransition(() => setTurnos(null));
      return;
    }
    if (fechaTurnosProp != null) {
      startTransition(() => setTurnos({
        fecha: fechaTurnosProp,
        turno_1: turno1Prop ?? 0,
        turno_2: turno2Prop ?? 0,
        turno_3: turno3Prop ?? 0,
      }));
    }
  }, [modo, fechaTurnosProp, turno1Prop, turno2Prop, turno3Prop]);

  if (!show) return null;

  const promedioSesion = stats.tiemposTotalPatio.length
    ? (stats.tiemposTotalPatio.reduce((acc, t) => acc + t, 0) / stats.tiemposTotalPatio.length)
    : null;

  const tiempoPromedio = modo === 'simulacion'
    ? (promedioSesion != null ? `${promedioSesion.toFixed(1)}` : '—')
    : (promedio?.promedio_neto_patio
      ? `${intervalAMinutos(promedio.promedio_neto_patio).toFixed(1)}`
      : (promedioSesion != null ? `${promedioSesion.toFixed(1)}` : '—'));

  const turnosUI = modo === 'simulacion'
    ? {
        turno_1: stats.atendidosTurno1,
        turno_2: stats.atendidosTurno2,
        turno_3: stats.atendidosTurno3,
      }
    : {
        turno_1: turnos?.turno_1 ?? stats.atendidosTurno1,
        turno_2: turnos?.turno_2 ?? stats.atendidosTurno2,
        turno_3: turnos?.turno_3 ?? stats.atendidosTurno3,
      };

  const totalUI = modo === 'real'
    ? ((turnosUI.turno_1 + turnosUI.turno_2 + turnosUI.turno_3) || stats.total)
    : stats.total;

  const cards = [
    {
      label: modo === 'simulacion' ? 'Total atendidos (sesión)' : 'Total atendidos (día)',
      value: totalUI,
      color: '#38bdf8',
      icon: '🚛',
    },
    {
      label: modo === 'simulacion' ? 'Tiempo promedio patio (sesión)' : 'Tiempo promedio neto patio (día)',
      value: tiempoPromedio === '—' ? '—' : `${tiempoPromedio} min`,
      color: '#a78bfa',
      icon: '⏱',
    },
    { label: 'Turno 1  07:00–15:00',           value: turnosUI.turno_1, color: '#4ade80', icon: '🌅' },
    { label: 'Turno 2  15:01–23:00',           value: turnosUI.turno_2, color: '#fbbf24', icon: '🌤' },
    { label: 'Turno 3  23:01–06:59',           value: turnosUI.turno_3, color: '#f87171', icon: '🌙' },
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
          {cargando && modo === 'real' && (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Actualizando…</span>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 24, marginTop: 4 }}>
          {modo === 'simulacion'
            ? 'Datos de la sesión de simulación actual'
            : 'Datos del día obtenidos desde la base de datos'}
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
