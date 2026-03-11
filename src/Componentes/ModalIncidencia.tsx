/**
 * src/Componentes/ModalIncidencia.tsx
 *
 * ARQUITECTURA:
 *   ✅ Escritura directa a Supabase → abrirIncidencia / cerrarIncidencia
 *   ✅ Supabase Realtime → contador + estado abierta/cerrada en tiempo real
 *   ✅ Bloqueo duro en MAX_INCIDENCIAS (3) con alerta de soporte
 *   ✅ Muestra promedio de duración de incidencias cerradas del camión
 */
import { useState, useEffect, startTransition } from 'react';
import {
  abrirIncidencia,
  cerrarIncidencia,
  contarIncidencias,
  fetchIncidenciaAbierta,
  fetchPromedioIncidencias,
  intervalATexto,
} from '../services/supabaseService';
import type { Camion } from '../types';

const MAX_INCIDENCIAS = 3;

interface Props {
  show:                   boolean;
  camion:                 Camion;
  bahiaNombre:            string;
  onClose:                () => void;
  onNotify:               (msg: string, tipo?: 'success' | 'error' | 'info') => void;
  onIncidenciaRegistrada: (camionId: string) => void;
}

const ModalIncidencia = ({ show, camion, bahiaNombre, onClose, onNotify, onIncidenciaRegistrada }: Props) => {
  const [loading, setLoading]             = useState(false);
  const [conteoLocal, setConteoLocal]     = useState<number>(camion.incidencias ?? 0);
  const [hayAbierta, setHayAbierta]       = useState(false);
  const [promedioTexto, setPromedioTexto] = useState<string | null>(null);

  // Bug 4 fix: re-sincronizar el contador cuando el prop cambia desde el padre
  useEffect(() => {
    startTransition(() => {
      setConteoLocal(camion.incidencias ?? 0);
    });
  }, [camion.incidencias]);

  // ── Carga exacta desde Supabase + polling cada 5s cuando el modal está abierto ──
  // Sin Realtime — polling HTTP puro, sin costo adicional en Supabase
  useEffect(() => {
    if (!show || !camion.id_db) return;

    const refrescar = () => {
      contarIncidencias(camion.id_db).then(setConteoLocal);
      fetchIncidenciaAbierta(camion.id_db).then(setHayAbierta);
      fetchPromedioIncidencias(camion.id_db).then(t => setPromedioTexto(t ? intervalATexto(t) : null));
    };

    // Carga inmediata al abrir el modal
    refrescar();

    // Refresca cada 5s mientras el modal está abierto
    const poller = setInterval(refrescar, 5_000);
    return () => clearInterval(poller);
  }, [show, camion.id_db]);

  if (!show) return null;

  const limiteSuperado = conteoLocal >= MAX_INCIDENCIAS;

  // ── Abrir incidencia → INSERT directo a Supabase ──
  const handleRegistrar = async () => {
    if (limiteSuperado) {
      onNotify('🚨 Límite de 3 incidencias alcanzado. Contactar a los desarrolladores.', 'error');
      return;
    }
    if (hayAbierta) {
      onNotify('⚠️ Ya hay una incidencia abierta. Ciérrala antes de abrir una nueva.', 'error');
      return;
    }
    setLoading(true);
    const resultado = await abrirIncidencia(camion.id_db);
    setLoading(false);
    if (resultado) {
      onIncidenciaRegistrada(camion.id);
      onNotify(`⚠️ Incidencia ${conteoLocal + 1}/${MAX_INCIDENCIAS} abierta — ${camion.placa}`, 'success');
      onClose();
    } else {
      onNotify('❌ Error al abrir la incidencia en Supabase. Verifica la conexión.', 'error');
    }
  };

  // ── Cerrar incidencia → UPDATE hora_fin a Supabase ──
  const handleCerrar = async () => {
    if (!hayAbierta) {
      onNotify('ℹ️ No hay ninguna incidencia abierta para cerrar.', 'info');
      return;
    }
    setLoading(true);
    const resultado = await cerrarIncidencia(camion.id_db);
    setLoading(false);
    if (resultado) {
      onNotify(`✅ Incidencia cerrada — ${camion.placa}`, 'success');
      onClose();
    } else {
      onNotify('❌ Error al cerrar la incidencia en Supabase.', 'error');
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* ── Header ── */}
        <div style={s.header}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={s.title}>Gestión de Incidencia</div>
            <div style={s.sub}>{camion.placa} · {bahiaNombre} · T{camion.turno ?? '—'}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* ── Bloqueo duro: alerta cuando se alcanza el límite ── */}
        {limiteSuperado && (
          <div style={{
            background: 'rgba(220,38,38,0.15)', border: '2px solid #ef4444',
            borderRadius: 10, padding: '14px 16px', marginBottom: 14,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🚨</span>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', marginBottom: 4 }}>
                Límite de incidencias alcanzado ({MAX_INCIDENCIAS}/{MAX_INCIDENCIAS})
              </div>
              <div style={{ color: '#fca5a5', fontSize: '0.76rem', lineHeight: 1.5 }}>
                Este camión ha alcanzado el máximo de incidencias permitidas.
                <br />
                <strong>Comuníquese con los desarrolladores para continuar.</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Contador visual de incidencias ── */}
        <div style={{
          ...s.counter,
          borderColor: limiteSuperado ? '#ef4444' : conteoLocal === 2 ? '#eab308' : 'rgba(148,163,184,0.2)',
          background:  limiteSuperado ? 'rgba(220,38,38,0.08)' : 'rgba(15,23,42,0.6)',
        }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>
            INCIDENCIAS REGISTRADAS
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: hayAbierta ? 8 : 0 }}>
            {Array.from({ length: MAX_INCIDENCIAS }).map((_, i) => (
              <div key={`slot-${i}`} style={{
                width: 32, height: 32, borderRadius: 7,
                background: i < conteoLocal ? (i < conteoLocal - (hayAbierta ? 1 : 0) ? '#f59e0b' : '#ef4444') : 'rgba(148,163,184,0.1)',
                border: `1px solid ${i < conteoLocal ? (i < conteoLocal - (hayAbierta ? 1 : 0) ? '#f59e0b' : '#ef4444') : 'rgba(148,163,184,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                color: i < conteoLocal ? '#000' : '#475569',
                boxShadow: i === conteoLocal - 1 && hayAbierta ? '0 0 8px #ef4444' : 'none',
                animation: i === conteoLocal - 1 && hayAbierta ? 'pulse 1s infinite' : 'none',
              }}>
                {i < conteoLocal ? (i < conteoLocal - (hayAbierta ? 1 : 0) ? '✓' : '●') : i + 1}
              </div>
            ))}
          </div>
          {/* Estado de incidencia activa */}
          {hayAbierta && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            }}>
              <span style={{ fontSize: '0.7rem', animation: 'pulse 1s infinite' }}>🔴</span>
              <span style={{ color: '#fca5a5', fontSize: '0.72rem', fontWeight: 600 }}>
                Incidencia activa — sin hora de cierre
              </span>
            </div>
          )}
        </div>

        {/* ── Info del camión ── */}
        <div style={s.infoBox}>
          <Row label="Placa"     value={camion.placa} />
          <Row label="Bahía"     value={bahiaNombre} />
          <Row label="Producto"  value={camion.producto} />
          <Row label="Operación" value={camion.operacionCodigo === 'C' ? 'Carga' : 'Descarga'} />
          {promedioTexto && (
            <Row label="⏱ Prom. incidencias" value={promedioTexto} />
          )}
        </div>

        <p style={s.hint}>
          {limiteSuperado
            ? 'No se pueden registrar más incidencias. Este tiempo NO será descontado del promedio global.'
            : hayAbierta
              ? 'Hay una incidencia activa. El tiempo está siendo descontado del promedio neto de patio.'
              : `Máx. ${MAX_INCIDENCIAS} incidencias. El tiempo de cada una se descuenta automáticamente del promedio neto de patio.`}
        </p>

        {/* ── Botones ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={s.btnSecondary} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          {!limiteSuperado && (
            <>
              <button
                style={{ ...s.btnWarning, opacity: (loading || hayAbierta) ? 0.45 : 1 }}
                onClick={handleRegistrar}
                disabled={loading || hayAbierta}
                title={hayAbierta ? 'Cierra la incidencia activa antes de abrir una nueva' : ''}
              >
                {loading ? '⏳' : '🔴 Abrir incidencia'}
              </button>
              <button
                style={{ ...s.btnSuccess, opacity: (loading || !hayAbierta) ? 0.45 : 1 }}
                onClick={handleCerrar}
                disabled={loading || !hayAbierta}
                title={!hayAbierta ? 'No hay ninguna incidencia abierta' : ''}
              >
                {loading ? '⏳' : '🟢 Cerrar incidencia'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{label}</span>
    <span style={{ color: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600 }}>{value}</span>
  </div>
);

const s: Record<string, React.CSSProperties> = {
  overlay:      { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:        { background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)', borderTop: '3px solid #f59e0b', borderRadius: 14, padding: '24px 26px', width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.75)' },
  header:       { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  title:        { color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' },
  sub:          { color: '#64748b', fontSize: '0.76rem', marginTop: 2 },
  closeBtn:     { background: 'transparent', border: 'none', color: '#64748b', fontSize: '1rem', cursor: 'pointer', padding: 0 },
  counter:      { border: '1px solid', borderRadius: 8, padding: '10px 14px', marginBottom: 14 },
  infoBox:      { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 },
  hint:         { color: '#475569', fontSize: '0.72rem', marginBottom: 18, lineHeight: 1.5 },
  btnWarning:   { padding: '9px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' },
  btnSuccess:   { padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' },
  btnSecondary: { padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' },
};

export default ModalIncidencia;

