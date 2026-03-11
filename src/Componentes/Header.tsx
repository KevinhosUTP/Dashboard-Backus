// src/Componentes/Header.tsx
// Barra superior fija — Tailwind CSS + Dark Mode

import type { ConfigSimulador, Rol } from '../types';

interface Props {
  darkMode: boolean;
  simulacionActiva: boolean;
  config: ConfigSimulador;
  rol: Rol;
  nombreUsuario: string;
  onToggleDarkMode: () => void;
  onToggleModoAyuda: () => void;
  modoAyuda: boolean;
  onReporte: () => void;
  onIniciar: () => void;
  onCerrarSesion: () => void;
}

// Componente reutilizable de toggle deslizante
const Toggle = ({
  activo, onToggle, labelOn, labelOff, colorOn = '#f59e0b',
}: { activo: boolean; onToggle: () => void; labelOn: string; labelOff: string; colorOn?: string }) => (
  <button
    onClick={onToggle}
    title={activo ? labelOn : labelOff}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '4px 0', userSelect: 'none',
    }}
  >
    <span style={{
      fontSize: '0.75rem', fontWeight: 600,
      color: activo ? colorOn : '#64748b',
      transition: 'color 0.2s',
      minWidth: 70, textAlign: 'right',
    }}>
      {activo ? labelOn : labelOff}
    </span>
    {/* Track */}
    <span style={{
      position: 'relative', display: 'inline-block',
      width: 40, height: 22, borderRadius: 11, flexShrink: 0,
      background: activo ? colorOn : '#334155',
      transition: 'background 0.25s',
      boxShadow: activo ? `0 0 8px ${colorOn}55` : 'none',
    }}>
      {/* Thumb */}
      <span style={{
        position: 'absolute', top: 3,
        left: activo ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </span>
  </button>
);

export const Header = ({
  darkMode: dm, simulacionActiva, config, rol, nombreUsuario,
  onToggleDarkMode, onToggleModoAyuda, modoAyuda,
  onReporte, onIniciar, onCerrarSesion,
}: Props) => {
  const rolColor  = rol === 'admin' ? '#a78bfa' : '#38bdf8';
  const rolBg     = rol === 'admin' ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)';
  const rolBorder = rol === 'admin' ? 'rgba(124,58,237,0.4)'  : 'rgba(14,165,233,0.4)';
  const rolLabel  = rol === 'admin' ? '👑 Administrador'      : '👁 Cliente';

  return (
    <header className="w-full z-50 flex items-center justify-between px-6 py-3 bg-[#0f172a] shadow-md">

      {/* ── Marca + badge de rol ── */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/logoBackus.png"
          alt="Backus"
          style={{ height: 36, objectFit: 'contain', flexShrink: 0 }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl text-white leading-tight truncate">
              Gestión de camiones Backus
            </h1>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
              background: rolBg, color: rolColor, border: `1px solid ${rolBorder}`,
              letterSpacing: '0.03em', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {rolLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            {/* Nombre del usuario logueado */}
            <span style={{ color: rolColor, fontWeight: 600 }}>{nombreUsuario}</span>
            <span className="text-slate-600">·</span>
            <span>Modo {config.modo === 'real' ? 'Real' : 'Simulación'}</span>
            {simulacionActiva && <span className="text-green-400 font-semibold">● Activo</span>}
            {rol === 'cliente' && (
              <span style={{ color: '#475569', fontSize: '0.68rem' }}>
                · 🟢≤60 🟡61-120 🔴≥121 min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="flex items-center gap-4 shrink-0">

        {/* Toggle Modo Ayuda — solo ilumina las bahías cuando está activo */}
        <Toggle
          activo={modoAyuda}
          onToggle={onToggleModoAyuda}
          labelOn="Ayuda ON"
          labelOff="Ayuda OFF"
          colorOn="#f59e0b"
        />

        {/* Toggle Dark / Light mode */}
        <Toggle
          activo={dm}
          onToggle={onToggleDarkMode}
          labelOn="🌙 Oscuro"
          labelOff="☀️ Claro"
          colorOn="#6366f1"
        />

        {/* Reporte */}
        <button onClick={onReporte}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors duration-200 select-none">
          📊 Reporte
        </button>

        {/* Iniciar / Detener */}
        <button onClick={onIniciar}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200 select-none ${
            simulacionActiva ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
          }`}>
          {simulacionActiva ? '⏹ Detener' : '▶ Iniciar'}
        </button>

        {/* Cerrar Sesión */}
        <button onClick={onCerrarSesion}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors duration-200 select-none">
          🚪 Cerrar Sesión
        </button>
      </div>
    </header>
  );
};
