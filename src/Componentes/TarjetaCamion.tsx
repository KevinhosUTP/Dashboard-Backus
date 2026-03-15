// src/Componentes/TarjetaCamion.tsx
// Carta de camión en la cola inferior — Tailwind CSS + Drag & Drop
import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Camion, ConfigSimulador } from '../types';
import { getColorEstado, NOMBRES_TIPO_CAMION } from './bahiasConfig';

interface Props {
  camion: Camion;
  simulacionActiva: boolean;
  config: ConfigSimulador;
  formatTiempo: (ms: number, modo: ConfigSimulador['modo']) => string;
  onDragStart: (c: Camion) => void;
  onDragEnd: () => void;
  darkMode?: boolean;
}

const TarjetaCamion = ({
  camion: c,
  simulacionActiva,
  config,
  formatTiempo,
  onDragStart,
  onDragEnd,
  darkMode = true,
}: Props) => {
  const [now, setNow] = useState(() => Date.now());
  const prevDraggingRef = useRef(false);
  const dm = darkMode;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `truck-${c.id}`,
    disabled: !simulacionActiva,
    data: { truckId: c.id },
  });

  useEffect(() => {
    if (isDragging && !prevDraggingRef.current) {
      onDragStart(c);
    }
    if (!isDragging && prevDraggingRef.current) {
      onDragEnd();
    }
    prevDraggingRef.current = isDragging;
  }, [c, isDragging, onDragEnd, onDragStart]);

  // Ticker para actualizar el tiempo en pantalla
  useEffect(() => {
    if (!simulacionActiva) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [simulacionActiva]);

  const color = getColorEstado(c.estadoAlerta);
  const ms = now - c.tiempoLlegadaCola;
  const tieneIncidencia = (c.incidencias ?? 0) > 0;
  const dragStyle = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' as const,
    cursor: simulacionActiva ? 'grab' : 'default',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        relative w-full rounded-[9px] select-none
        transition-all duration-300 ease-in-out
        ${simulacionActiva ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : 'cursor-default'}
      `}
      style={{
        ...dragStyle,
        background: dm ? 'rgba(10,16,30,0.92)' : 'rgba(255,255,255,0.95)',
        border: `2px solid ${color}`,
        padding: 'clamp(7px,0.8vh,10px) clamp(8px,0.9vw,12px)',
        boxShadow: `0 0 10px ${color}44, 0 4px 10px rgba(0,0,0,0.4)`,
        animation: 'truckEntry 0.35s ease',
      }}
    >
      {/* Punto semáforo */}
      <div
        className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 5px ${color}`,
          animation: c.estadoAlerta === 'rojo' ? 'pulse 1s infinite' : 'none',
        }}
      />

      {/* Ícono de incidencia activa */}
      {tieneIncidencia && (
        <div
          className="absolute top-2 right-6 text-amber-400"
          style={{ fontSize: 'clamp(0.6rem,0.75vw,0.75rem)' }}
          title={`${c.incidencias} incidencia(s) activa(s)`}
        >
          ⚠️
        </div>
      )}

      {/* Badge de turno */}
      {c.turno && (
        <div
          className="absolute top-2 left-2 rounded px-1.5 py-0.5 font-semibold bg-violet-500/40 text-violet-300"
          style={{ fontSize: 'clamp(0.5rem,0.6vw,0.6rem)' }}
        >
          T{c.turno}
        </div>
      )}

      {/* Placa */}
      <div
        className={`font-extrabold tracking-wider mt-1 mb-0.5 pr-4 ${c.turno ? 'pl-2' : ''} ${dm ? 'text-slate-100' : 'text-slate-900'}`}
        style={{ fontSize: 'clamp(0.82rem,1vw,1rem)' }}
      >
        🚛 {c.placa}
      </div>

      {/* Tipo unidad — nombre completo */}
      <div
        className={`mb-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}
        style={{ fontSize: 'clamp(0.6rem,0.72vw,0.72rem)' }}
      >
        {NOMBRES_TIPO_CAMION[c.tipoCodigo]}
      </div>

      {/* Operación */}
      <div
        className={`inline-block font-bold rounded-full px-2 py-0.5 mb-1
          ${c.operacionCodigo === 'C'
            ? 'bg-blue-500/25 text-blue-400'
            : 'bg-green-600/25 text-green-400'}
        `}
        style={{ fontSize: 'clamp(0.58rem,0.68vw,0.68rem)' }}
      >
        {c.operacionCodigo === 'C' ? '⬆ CARGA' : '⬇ DESCARGA'}
      </div>

      {/* Producto */}
      <div
        className={`mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap ${dm ? 'text-slate-400' : 'text-slate-500'}`}
        style={{ fontSize: 'clamp(0.6rem,0.7vw,0.7rem)' }}
      >
        📦 {c.producto}
      </div>

      {/* Empresa */}
      <div
        className={`overflow-hidden text-ellipsis whitespace-nowrap ${dm ? 'text-slate-500' : 'text-slate-400'}`}
        style={{ fontSize: 'clamp(0.56rem,0.65vw,0.65rem)' }}
      >
        🏢 {c.propietario}
      </div>

      {/* Footer: hora + tiempo */}
      <div
        className={`mt-1.5 pt-1.5 flex justify-between items-center
          border-t ${dm ? 'border-slate-700/20' : 'border-slate-200/50'}`}
      >
        <span
          className={dm ? 'text-slate-600' : 'text-slate-400'}
          style={{ fontSize: 'clamp(0.52rem,0.62vw,0.62rem)' }}
        >
          {c.hora || c.fecha}
        </span>
        <span
          className="font-bold"
          style={{ color, fontSize: 'clamp(0.66rem,0.78vw,0.78rem)' }}
        >
          {formatTiempo(ms, config.modo)}
        </span>
      </div>
    </div>
  );
};

export default TarjetaCamion;

