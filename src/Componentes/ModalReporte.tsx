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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-4 pb-4 bg-black/60 overflow-y-auto">
      <div className="w-full max-w-lg mx-auto bg-[#0f172a] rounded-2xl p-4 md:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base md:text-xl font-bold text-white mb-1">
            📊 Reporte de Sesión
          </h2>
          {cargando && modo === 'real' && (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Actualizando…</span>
          )}
        </div>
        <p className="text-slate-400 mb-4" style={{ fontSize: 'clamp(0.65rem, 2vw, 0.8rem)' }}>
          {modo === 'simulacion'
            ? 'Datos de la sesión de simulación actual'
            : 'Datos del día obtenidos desde la base de datos'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {cards.map(card => (
            <div key={card.label} className="bg-[#1e293b] rounded-xl p-3 flex flex-col gap-1">
              <div className="text-2xl md:text-3xl mb-1">{card.icon}</div>
              <div className="font-bold text-white" style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}>
                {card.value}
              </div>
              <div className="text-slate-400 leading-tight" style={{ fontSize: 'clamp(0.6rem, 2vw, 0.75rem)' }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium mt-2 text-sm md:text-base">
          Cerrar
        </button>
      </div>
    </div>
  );
};


export default ModalReporte;
