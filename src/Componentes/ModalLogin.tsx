// src/Componentes/ModalLogin.tsx
import { useState } from 'react';
import type { Rol } from '../types';
import { loginUsuario, type UsuarioLogin } from '../services/supabaseService';

interface Props {
  onLogin: (rol: Rol, usuario: UsuarioLogin) => void;
}

const ModalLogin = ({ onLogin }: Props) => {
  const [email,   setEmail]   = useState('');
  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) { setError('Ingresa correo y contraseña.'); return; }
    setError('');
    setCargando(true);

    const usuario = await loginUsuario(email.trim(), pin.trim());
    setCargando(false);

    if (!usuario) {
      setError('Correo o contraseña incorrectos.');
      setPin('');
      return;
    }

    onLogin(usuario.rol, usuario);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(135deg, #060d1a 0%, #0f172a 50%, #0c1a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Glow decorativo */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />

      <form onSubmit={handleSubmit} style={{
        position: 'relative',
        background: 'rgba(15,23,42,0.97)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 20, padding: '40px 44px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(124,58,237,0.12)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logoBackus.png"
            alt="Backus"
            style={{
              height: 64,
              objectFit: 'contain',
              marginBottom: 14,
              filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.35))',
            }}
          />
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.35rem', margin: 0 }}>
            Gestión de Camiones
          </h1>
          <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: 4, marginBottom: 0 }}>
            Backus — Control de Patio
          </p>
        </div>

        {/* Campo correo */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="login-email" style={labelStyle}>Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="correo@backus.com"
            autoComplete="email"
            autoFocus
            style={inputStyle(!!error)}
          />
        </div>

        {/* Campo contraseña */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="login-password" style={labelStyle}>Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            placeholder="••••••••"
            autoComplete="current-password"
            maxLength={50}
            style={{ ...inputStyle(!!error), letterSpacing: '0.2em' }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 6, marginBottom: 0 }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Botón */}
        <button type="submit" disabled={cargando || !email || !pin}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: email && pin && !cargando ? '#7c3aed' : 'rgba(30,41,59,0.6)',
            color: email && pin && !cargando ? '#fff' : '#475569',
            fontWeight: 700, fontSize: '0.95rem',
            cursor: email && pin ? 'pointer' : 'not-allowed',
            transition: 'all 0.25s',
            boxShadow: email && pin && !cargando ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
          }}>
          {cargando ? '⏳ Verificando…' : '🔐 Ingresar'}
        </button>

        {/* Info de roles */}
        <div style={{
          marginTop: 20, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)',
        }}>
          <p style={{ color: '#475569', fontSize: '0.68rem', margin: 0, lineHeight: 1.6 }}>
            <span style={{ color: '#a78bfa' }}>👑 Administrador</span> — configura tiempos del semáforo
            <br />
            <span style={{ color: '#38bdf8' }}>👁 Cliente</span> — vista de monitoreo · tiempos fijos
          </p>
        </div>

        <div style={{ color: '#334155', fontSize: '0.62rem', textAlign: 'center', marginTop: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Anthony Paiva Silva</span>
            <span style={{ color: '#475569' }}> · Asistente Logístico · T1 Peak Season</span>
          </div>
          <div>
            <span style={{ color: '#475569', fontWeight: 600 }}>Kevin Paiva Silva</span>
            <span style={{ color: '#475569' }}> · Consultor Programador</span>
          </div>
        </div>
      </form>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#64748b', fontSize: '0.72rem',
  fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 8,
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(30,41,59,0.8)',
  border: `1px solid ${hasError ? '#ef4444' : 'rgba(148,163,184,0.2)'}`,
  color: '#f1f5f9', fontSize: '0.95rem', outline: 'none',
  transition: 'border-color 0.2s',
});

export default ModalLogin;

