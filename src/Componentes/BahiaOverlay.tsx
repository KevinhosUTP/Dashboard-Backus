// src/Componentes/BahiaOverlay.tsx
import { useState, useEffect } from 'react';
import type { Camion, BahiaConfig, ConfigSimulador } from '../types';
import { getColorEstado, NOMBRES_TIPO_CAMION } from './bahiasConfig';
import ModalIncidencia from './ModalIncidencia';
import { fetchIncidenciaAbierta } from '../services/supabaseService';

interface Props {
  bahiaId: string;
  config: BahiaConfig;
  camion: Camion | null;
  camionArrastrando: Camion | null;
  camionSeleccionado?: Camion | null;
  simulacionActiva: boolean;
  isMobile?: boolean;
  modoConfig: ConfigSimulador;
  validarFn: (c: Camion, bahiaId: string) => true | string;
  onDrop: (bahiaId: string) => void;
  onDropFromBahia: (from: string, to: string) => void;
  onTapBahia?: (bahiaId: string) => void;
  onTapCamionBahia?: (camion: Camion) => void;
  /** Salida manual del camión — el padre actualiza stats + Supabase */
  onFinalizar: (bahiaId: string, camion: Camion) => Promise<void>;
  formatTiempo: (ms: number, modo: ConfigSimulador['modo']) => string;
  darkMode?: boolean;
  onNotify: (msg: string, tipo?: 'success' | 'error' | 'info') => void;
  onIncidenciaRegistrada: (camionId: string) => void;
  /** Cuando true ilumina las bahías compatibles con el camión arrastrado */
  modoAyuda?: boolean;
}

const BahiaOverlay = ({
  bahiaId, config: bay, camion, camionArrastrando, camionSeleccionado = null,
  simulacionActiva, isMobile = false, modoConfig, validarFn, onDrop, onDropFromBahia, onTapBahia, onTapCamionBahia,
  onFinalizar, formatTiempo, darkMode = true, onNotify, onIncidenciaRegistrada,
  modoAyuda = false,
}: Props) => {
  const [isDragOver, setIsDragOver]         = useState(false);
  const [now, setNow]                       = useState(() => Date.now());
  const [showIncidencia, setShowIncidencia] = useState(false);
  const [finalizando, setFinalizando]       = useState(false);
  const [incidenciaActiva, setIncidenciaActiva] = useState(false);
  const dm = darkMode;
  const camionId = camion?.id ?? null;
  const camionIdDb = camion?.id_db ?? null;

  // Ticker semáforo — actualiza `now` cada segundo
  useEffect(() => {
    if (!camionId) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [camionId]);

  // ── Alerta de incidencia abierta: polling cada 8s ──────────────────────
  // Sin Realtime — polling HTTP puro, sin costo adicional en Supabase
  useEffect(() => {
    if (!camionIdDb) return;
    const idCamion = Number(camionIdDb);

    // Consulta inmediata
    fetchIncidenciaAbierta(idCamion).then(setIncidenciaActiva);

    // Refresca cada 8 segundos mientras la bahía esté ocupada
    const poller = setInterval(() => {
      fetchIncidenciaAbierta(idCamion).then(setIncidenciaActiva);
    }, 8_000);

    return () => clearInterval(poller);
  }, [camionIdDb]);

  const mostrarIncidenciaActiva = Boolean(camionIdDb) && incidenciaActiva;

  const ocupada = !!camion;
  const camionActivo = isMobile ? (camionSeleccionado ?? camionArrastrando) : camionArrastrando;
  const seleccionMovilActiva = isMobile && simulacionActiva && !ocupada && camionSeleccionado;
  const resultadoSeleccionMovil = seleccionMovilActiva ? validarFn(camionSeleccionado, bahiaId) : null;
  const camionBahiaSeleccionado = isMobile && camion != null && camionSeleccionado?.id === camion.id;
  const claseSeleccionMovil = camionBahiaSeleccionado
    ? 'ring-2 ring-yellow-400 scale-[1.02]'
    : (seleccionMovilActiva
      ? (resultadoSeleccionMovil === true ? 'animate-pulse ring-2 ring-blue-400' : 'ring-2 ring-red-400')
      : '');

  // ── Color semáforo (tiempo en cola → tiempo en bahía) ──
  let colorSemaforo = dm ? '#334155' : '#cbd5e1';
  if (ocupada && camion) {
    const ms       = now - camion.tiempoLlegadaCola;
    const factor   = modoConfig.modo === 'real' ? 60_000 : 1_000;
    const unidades = ms / factor;
    if      (unidades >= modoConfig.tiempoRojo)    colorSemaforo = '#ef4444';
    else if (unidades >= modoConfig.tiempoAmarillo) colorSemaforo = '#eab308';
    else                                            colorSemaforo = '#22c55e';
  }

  // ── Fondo dinámico ──
  let dropColor   = dm ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.90)';
  let borderColor = dm ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.25)';

  if (ocupada) {
    if      (colorSemaforo === '#ef4444') dropColor = 'rgba(220,38,38,0.20)';
    else if (colorSemaforo === '#eab308') dropColor = 'rgba(234,179,8,0.16)';
    else                                  dropColor = 'rgba(22,163,74,0.16)';
    borderColor = colorSemaforo;
  }

  // Resaltar bahías compatibles SOLO si modoAyuda está activo
  if (modoAyuda && camionActivo && !ocupada && simulacionActiva) {
    const res = validarFn(camionActivo, bahiaId);
    dropColor   = res === true ? 'rgba(22,163,74,0.30)'  : 'rgba(220,38,38,0.22)';
    borderColor = res === true ? '#22c55e'               : '#ef4444';
  }
  if (isDragOver && !ocupada) {
    dropColor = camionActivo && validarFn(camionActivo, bahiaId) === true
      ? 'rgba(22,163,74,0.52)' : 'rgba(220,38,38,0.44)';
  }

  // ── Finalizar manualmente → delega al padre (SimuladorMapa) ──
  const handleFinalizar = async () => {
    if (!camion || finalizando) return;
    if (!window.confirm(`¿Confirmar salida de ${camion.placa}?`)) return;
    setFinalizando(true);
    await onFinalizar(bahiaId, camion);
    setFinalizando(false);
  };

  return (
    <>
      <div
        className={claseSeleccionMovil}
        style={{
          position: 'relative',
          width: 'clamp(110px,9vw,148px)',
          background: dropColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 9,
          padding: '7px 9px',
          backdropFilter: 'blur(6px)',
          boxShadow: ocupada
            ? `0 0 18px ${colorSemaforo}55, 0 4px 14px rgba(0,0,0,0.5)`
            : '0 4px 14px rgba(0,0,0,0.4)',
          transition: 'background 0.5s, border-color 0.5s, box-shadow 0.5s',
          cursor: ocupada ? 'default' : (seleccionMovilActiva ? 'pointer' : 'copy'),
        }}
        onClick={() => {
          if (!seleccionMovilActiva || !onTapBahia) return;
          onTapBahia(bahiaId);
        }}
        onDragOver={e => {
          if (isMobile) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsDragOver(true);
        }}
        onDragLeave={() => {
          if (isMobile) return;
          setIsDragOver(false);
        }}
        onDrop={e => {
          if (isMobile) return;
          e.preventDefault(); setIsDragOver(false);
          const fromBahia = e.dataTransfer.getData('fromBahia');
          if (fromBahia) onDropFromBahia(fromBahia, bahiaId);
          else onDrop(bahiaId);
        }}
      >
        {/* ── Header: nombre + punto semáforo ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 4, paddingBottom: 4,
          borderBottom: `1px solid ${dm ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.2)'}`,
        }}>
          <span style={{ fontWeight: 700, fontSize: 'clamp(0.62rem,0.78vw,0.76rem)', color: dm ? '#f1f5f9' : '#0f172a' }}>
            {bay.nombre}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Ícono de incidencia abierta — pulsante mientras no haya hora_fin */}
            {mostrarIncidenciaActiva && (
              <span style={{
                fontSize: '0.65rem',
                animation: 'pulse 1s infinite',
                lineHeight: 1,
              }} title="Incidencia activa sin cerrar">
                🔴
              </span>
            )}
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: ocupada ? colorSemaforo : (dm ? '#1e293b' : '#cbd5e1'),
              boxShadow: ocupada ? `0 0 6px ${colorSemaforo}` : 'none',
              display: 'inline-block',
              animation: ocupada && colorSemaforo === '#ef4444' ? 'pulse 1s infinite' : 'none',
            }} />
          </div>
        </div>

        {ocupada && camion ? (
          // ── BAHÍA OCUPADA ──
          <div
            draggable={simulacionActiva && !isMobile}
            onClick={() => {
              if (!isMobile || !onTapCamionBahia) return;
              onTapCamionBahia(camion);
            }}
            onDragStart={e => {
              if (isMobile) return;
              e.dataTransfer.setData('fromBahia', bahiaId);
            }}
            style={{ cursor: simulacionActiva && !isMobile ? 'grab' : (isMobile ? 'pointer' : 'default') }}
          >

            <div style={{ fontWeight: 800, fontSize: 'clamp(0.74rem,0.92vw,0.9rem)', color: getColorEstado(camion.estadoAlerta), textAlign: 'center', letterSpacing: '0.03em' }}>
              {camion.placa}
            </div>
            <div style={{ fontSize: 'clamp(0.55rem,0.65vw,0.65rem)', color: dm ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 1 }}>
              {NOMBRES_TIPO_CAMION[camion.tipoCodigo]}
            </div>
            <div style={{ textAlign: 'center', marginTop: 2, fontSize: 'clamp(0.55rem,0.65vw,0.65rem)', fontWeight: 700, color: camion.operacionCodigo === 'C' ? '#60a5fa' : '#4ade80' }}>
              {camion.operacionCodigo === 'C' ? '⬆ CARGANDO' : '⬇ DESCARGANDO'}
            </div>
            <div style={{ fontSize: 'clamp(0.52rem,0.6vw,0.62rem)', color: dm ? '#64748b' : '#94a3b8', textAlign: 'center', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {camion.producto}
            </div>

            {/* Barra de progreso semáforo */}
            <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: `${colorSemaforo}30` }}>
              <div style={{
                height: '100%', borderRadius: 2, background: colorSemaforo,
                width: `${Math.min(((now - camion.tiempoLlegadaCola) / (modoConfig.modo === 'real' ? 60_000 : 1_000) / modoConfig.tiempoRojo) * 100, 100)}%`,
                transition: 'width 1s linear, background 0.5s',
              }} />
            </div>

            <div style={{ textAlign: 'center', marginTop: 3, fontSize: 'clamp(0.6rem,0.72vw,0.7rem)', color: colorSemaforo, fontWeight: 700 }}>
              ⏱ {formatTiempo(now - camion.tiempoLlegadaCola, modoConfig.modo)}
            </div>

            {/* ── BOTONES DE ACCIÓN (solo admin) ── */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {/* ⚠️ Incidencia → Workflow 2 */}
              <button
                onClick={e => { e.stopPropagation(); setShowIncidencia(true); }}
                title="Registrar incidencia"
                style={{
                  flex: 1, padding: '3px 0', borderRadius: 5, border: 'none',
                  background: 'rgba(245,158,11,0.18)', color: '#fbbf24',
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.18)')}
              >
                ⚠️ Incid.
              </button>

              {/* ✅ Finalizar → Workflow 3 */}
              <button
                onClick={e => { e.stopPropagation(); handleFinalizar(); }}
                title="Marcar salida del patio"
                disabled={finalizando}
                style={{
                  flex: 1, padding: '3px 0', borderRadius: 5, border: 'none',
                  background: 'rgba(22,163,74,0.18)', color: '#4ade80',
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                  opacity: finalizando ? 0.5 : 1, transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,74,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(22,163,74,0.18)')}
              >
                {finalizando ? '⏳' : '✅ Salida'}
              </button>
            </div>
          </div>

        ) : (
          // ── BAHÍA LIBRE ──
          <div>
            {bay.tareas.D.length > 0 && (
              <div style={{ fontSize: 'clamp(0.5rem,0.6vw,0.6rem)', marginBottom: 2 }}>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>⬇ </span>
                <span style={{ color: dm ? '#94a3b8' : '#64748b' }}>{bay.tareas.D.join(', ')}</span>
              </div>
            )}
            {bay.tareas.C.length > 0 && (
              <div style={{ fontSize: 'clamp(0.5rem,0.6vw,0.6rem)', marginBottom: 2 }}>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>⬆ </span>
                <span style={{ color: dm ? '#94a3b8' : '#64748b' }}>{bay.tareas.C.join(', ')}</span>
              </div>
            )}
            <div style={{ fontSize: 'clamp(0.48rem,0.56vw,0.58rem)', color: dm ? '#475569' : '#94a3b8', marginTop: 3, borderTop: `1px solid ${dm ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.15)'}`, paddingTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🚛 {bay.camionesPermitidos.length > 3 ? 'Todos los tipos' : bay.camionesPermitidos.map(t => NOMBRES_TIPO_CAMION[t]).join(', ')}
            </div>
            {bay.alerta && (
              <div style={{ marginTop: 3, fontSize: 'clamp(0.46rem,0.55vw,0.55rem)', color: '#f59e0b', fontWeight: 600 }}>
                ⚠ {bay.alerta}
              </div>
            )}
            <div style={{ textAlign: 'center', color: dm ? '#334155' : '#94a3b8', fontSize: 'clamp(0.52rem,0.62vw,0.62rem)', marginTop: 4, fontStyle: 'italic' }}>
              — libre —
            </div>
          </div>
        )}
      </div>

      {/* Modal incidencia — Workflow 2 */}
      {camion && (
        <ModalIncidencia
          show={showIncidencia}
          camion={camion}
          bahiaNombre={bay.nombre}
          onClose={() => setShowIncidencia(false)}
          onNotify={onNotify}
          onIncidenciaRegistrada={onIncidenciaRegistrada}
        />
      )}
    </>
  );
};

export default BahiaOverlay;

