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
  activo, onToggle, labelOn, labelOff, colorOn = '#f59e0b', compact = false,
}: {
  activo: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
  colorOn?: string;
  compact?: boolean;
}) => {
  const labelActual = activo ? labelOn : labelOff;
  const showLabel = labelActual.length > 0;

  return (
    <button
    onClick={onToggle}
    title={labelActual}
    style={{
      display: 'flex', alignItems: 'center', gap: compact && !showLabel ? 0 : 8,
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '4px 0', userSelect: 'none',
    }}
  >
    <span style={{
      display: showLabel ? 'inline' : 'none',
      fontSize: compact ? '0.62rem' : '0.75rem', fontWeight: 600,
      color: activo ? colorOn : '#64748b',
      transition: 'color 0.2s',
      minWidth: compact ? 26 : 70, textAlign: 'right',
    }}>
      {labelActual}
    </span>
    {/* Track */}
    <span style={{
      position: 'relative', display: 'inline-block',
      width: compact ? 32 : 40,
      height: compact ? 18 : 22,
      borderRadius: compact ? 9 : 11,
      flexShrink: 0,
      background: activo ? colorOn : '#334155',
      transition: 'background 0.25s',
      boxShadow: activo ? `0 0 8px ${colorOn}55` : 'none',
    }}>
      {/* Thumb */}
      <span style={{
        position: 'absolute', top: compact ? 3 : 3,
        left: activo ? (compact ? 17 : 21) : 3,
        width: compact ? 12 : 16,
        height: compact ? 12 : 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </span>
    </button>
  );
};

export const Header = ({
  darkMode: dm, simulacionActiva, config, rol, nombreUsuario,
  onToggleDarkMode, onToggleModoAyuda, modoAyuda,
  onReporte, onIniciar, onCerrarSesion,
}: Props) => {
  const rolColor = rol === 'admin' ? '#a78bfa' : '#38bdf8';
  const rolBg = rol === 'admin' ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)';
  const rolBorder = rol === 'admin' ? 'rgba(124,58,237,0.4)' : 'rgba(14,165,233,0.4)';
  const rolLabel = rol === 'admin' ? '👑 Administrador' : '👁 Cliente';
  const nombreRol = rol === 'admin' ? 'Administrador' : 'Cliente';
  const modoTexto = config.modo === 'real' ? 'Real' : 'Simulación';
  const controlesClaseBtn = 'flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg font-medium transition-colors duration-200 select-none';
  const controlesBtnStyle = { fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' };

  return (
    <header className="w-full z-50 overflow-hidden bg-[#0f172a] shadow-md flex flex-col max-h-[105px] lg:max-h-none">
      <div className="lg:hidden flex flex-col w-full">
        <div className="flex items-center justify-between w-full px-3 pt-1.5 pb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logoBackus.png" alt="Backus" className="h-7 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-bold leading-tight whitespace-nowrap"
                style={{ fontSize: 'clamp(0.7rem, 3vw, 0.95rem)' }}>
                Gestión de camiones Backus
              </h1>
              <p className="text-blue-400 text-[10px] leading-tight truncate">
                {nombreRol} · {modoTexto}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] bg-purple-700 text-white px-2 py-0.5 rounded-full ml-2">
            {rol === 'admin' ? '👑' : '👁'} {rol}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full px-3 py-0.5">
          <div className="flex items-center gap-1">
            <span style={{ fontSize: '11px' }}>🌙</span>
            <Toggle
              activo={dm}
              onToggle={onToggleDarkMode}
              labelOn=""
              labelOff=""
              colorOn="#6366f1"
              compact
            />
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: '11px' }}>💡</span>
            <Toggle
              activo={modoAyuda}
              onToggle={onToggleModoAyuda}
              labelOn=""
              labelOff=""
              colorOn="#f59e0b"
              compact
            />
          </div>
          <span className="text-slate-400 ml-auto" style={{ fontSize: '9px' }}>
            {dm ? 'Oscuro' : 'Claro'} · {modoAyuda ? 'Ayuda ON' : 'Ayuda OFF'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 w-full px-3 pb-1.5">
          <button
            className="flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded py-1.5 w-full"
            style={{ fontSize: 'clamp(0.55rem, 2.2vw, 0.7rem)' }}
            onClick={onReporte}
          >
            📊 Reporte
          </button>
          <button
            className={`flex items-center justify-center gap-1 text-white rounded py-1.5 w-full ${
              simulacionActiva
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            style={{ fontSize: 'clamp(0.55rem, 2.2vw, 0.7rem)' }}
            onClick={onIniciar}
          >
            {simulacionActiva ? '⏹ Detener' : '▶ Iniciar'}
          </button>
          <button
            className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-white rounded py-1.5 w-full"
            style={{ fontSize: 'clamp(0.55rem, 2.2vw, 0.7rem)' }}
            onClick={onCerrarSesion}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-between px-3 lg:px-6 py-2 lg:py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logoBackus.png" alt="Backus" style={{ height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-bold text-white leading-tight whitespace-nowrap" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)' }}>
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
              <span style={{ color: rolColor, fontWeight: 600 }}>{nombreUsuario}</span>
              <span className="text-slate-600">·</span>
              <span>Modo {modoTexto}</span>
              {simulacionActiva && <span className="text-green-400 font-semibold">● Activo</span>}
              {rol === 'cliente' && (
                <span style={{ color: '#475569', fontSize: '0.68rem' }}>
                  · 🟢≤60 🟡61-120 🔴≥121 min
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 lg:gap-4 shrink-0">
          <Toggle
            activo={modoAyuda}
            onToggle={onToggleModoAyuda}
            labelOn="Ayuda ON"
            labelOff="Ayuda OFF"
            colorOn="#f59e0b"
          />
          <Toggle
            activo={dm}
            onToggle={onToggleDarkMode}
            labelOn="🌙 Oscuro"
            labelOff="☀️ Claro"
            colorOn="#6366f1"
          />
          <button onClick={onReporte} className={`${controlesClaseBtn} bg-violet-600 text-white hover:bg-violet-500`} style={controlesBtnStyle}>
            📊 Reporte
          </button>
          <button onClick={onIniciar}
            className={`${controlesClaseBtn} text-white ${
              simulacionActiva ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            }`} style={controlesBtnStyle}>
            {simulacionActiva ? '⏹ Detener' : '▶ Iniciar'}
          </button>
          <button onClick={onCerrarSesion}
            className={`${controlesClaseBtn} bg-gray-800 text-slate-400 hover:bg-red-900/40 hover:text-red-400`} style={controlesBtnStyle}>
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
};
