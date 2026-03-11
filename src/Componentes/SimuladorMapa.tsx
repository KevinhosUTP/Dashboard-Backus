// src/Componentes/SimuladorMapa.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Camion, ConfigSimulador, StatsSimulador,
  EstadoAlerta,
  VwUnidadPrioridad, VwDashboardTurnos, VwPromedioPatioNeto,
  Rol,
} from '../types';
import TarjetaCamion from './TarjetaCamion';
import BahiaOverlay from './BahiaOverlay';
import PanelFlotante from './PanelFlotante';
import ModalConfig from './ModalConfig';
import ModalReporte from './ModalReporte';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  fetchCamionesCola,
  fetchUnidadPrioridad,
  fetchDashboardTurnos,
  fetchPromedioPatioNeto,
  intervalAMinutos,
  intervalATexto,
  marcarSalidaDirecto,
  actualizarBahiaDirecto,
} from '../services/supabaseService';
import { BAHIAS_CONFIG } from './bahiasConfig';

// Tiempos fijos para el rol cliente — no editables
const TIEMPOS_CLIENTE = { tiempoAmarillo: 60, tiempoRojo: 120 } as const;

// ─────────────────────────────────────────────────────────────────────────────

const getTurnoActual = (): 1 | 2 | 3 => {
  const h = new Date().getHours();
  if (h >= 7  && h < 15) return 1;
  if (h >= 15 && h < 23) return 2;
  return 3;
};

const handleDropBahiaReal = async (id_viaje: string, nueva_bahia: string): Promise<void> => {
  if (!id_viaje) return;
  const ok = await actualizarBahiaDirecto(id_viaje, nueva_bahia, 'Descargando');
  if (!ok) console.error('[supabase] actualizarBahiaDirecto falló para id_viaje =', id_viaje);
};

const handleMarcarSalidaReal = async (id_viaje: string): Promise<boolean> => {
  const ok = await marcarSalidaDirecto(id_viaje);
  if (!ok) console.error('[supabase] marcarSalidaDirecto falló para id_viaje =', id_viaje);
  return ok;
};

// ─────────────────────────────────────────────────────────────────────────────

const SimuladorMapa = ({
  rolInicial,
  nombreUsuario,
  onLogout,
}: {
  rolInicial:     Rol;
  nombreUsuario:  string;
  onLogout:       () => void;
}) => {
  const [darkMode, setDarkMode]                         = useState(true);
  const [modoAyuda, setModoAyuda]                       = useState(false);
  const [cola, setCola]                                 = useState<Camion[]>([]);
  const [enProceso, setEnProceso]                       = useState<Record<string, Camion>>({});
  const [simulacionActiva, setSimulacionActiva]         = useState(false);
  const [showConfig, setShowConfig]                     = useState(false);
  const [showReport, setShowReport]                     = useState(false);
  const [camionArrastrando, setCamionArrastrando]       = useState<Camion | null>(null);
  const [toasts, setToasts]                             = useState<{ id: number; msg: string; tipo: string }[]>([]);
  const [alertaMaxIncidencias, setAlertaMaxIncidencias] = useState(false);

  const colaRef        = useRef<Camion[]>([]);
  const enProcesoRef   = useRef<Record<string, Camion>>({});
  const bahiasSaliendo = useRef<Set<string>>(new Set());

  const [config, setConfig] = useState<ConfigSimulador>({
    modo: 'simulacion',
    rol: rolInicial,
    // Cliente: tiempos fijos no modificables
    tiempoAmarillo: rolInicial === 'cliente' ? TIEMPOS_CLIENTE.tiempoAmarillo : 60,
    tiempoRojo:     rolInicial === 'cliente' ? TIEMPOS_CLIENTE.tiempoRojo     : 120,
  });
  const [stats, setStats] = useState<StatsSimulador>({
    atendidosTurno1: 0, atendidosTurno2: 0, atendidosTurno3: 0,
    total: 0, tiemposTotalPatio: [],
  });

  const [panelPrioridad, setPanelPrioridad] = useState<VwUnidadPrioridad | null>(null);
  const [panelTurnos,    setPanelTurnos]    = useState<VwDashboardTurnos | null>(null);
  const [panelPromedio,  setPanelPromedio]  = useState<VwPromedioPatioNeto | null>(null);

  const notify = useCallback((msg: string, tipo = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, tipo }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { colaRef.current = cola; },           [cola]);
  useEffect(() => { enProcesoRef.current = enProceso; }, [enProceso]);

  // ── Polling de COLA cada 10s ──────────────────────────────────────────────
  // FIX: filtra los camiones que ya están en bahía (enProceso) para no
  // sobreescribir el estado local y hacer que "reaparezcan" en cola
  useEffect(() => {
    if (!simulacionActiva) return;

    const cargarCola = async () => {
      const camiones = await fetchCamionesCola();
      // IDs de camiones ya asignados a bahías — no deben volver a la cola
      const idsEnBahia = new Set(Object.values(enProcesoRef.current).map(c => c.id));
      setCola(camiones.filter(c => !idsEnBahia.has(c.id)));
    };

    cargarCola();
    const poller = setInterval(cargarCola, 10_000);
    return () => clearInterval(poller);
  }, [simulacionActiva]);

  // ── Función compartida de recarga de paneles ─────────────────────────────
  const recargarPaneles = useCallback(async () => {
    const [prioridad, turnos, promedio] = await Promise.all([
      fetchUnidadPrioridad(),
      fetchDashboardTurnos(),
      fetchPromedioPatioNeto(),
    ]);
    if (prioridad != null) setPanelPrioridad(prioridad);
    if (turnos    != null) setPanelTurnos(turnos);
    if (promedio  != null) setPanelPromedio(promedio);
  }, []);

  // ── Polling de PANELES cada 15s — solo cuando la simulación está activa ──
  useEffect(() => {
    if (!simulacionActiva) return;
    recargarPaneles();
    const poller = setInterval(recargarPaneles, 15_000);
    return () => clearInterval(poller);
  }, [simulacionActiva, recargarPaneles]);

  // ── Semáforo visual ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!simulacionActiva) return;
    const factor = config.modo === 'real' ? 60_000 : 1_000;
    const interval = setInterval(() => {
      setCola(prev => prev.map(c => {
        const unidad = (Date.now() - c.tiempoLlegadaCola) / factor;
        const estado: EstadoAlerta =
          unidad >= config.tiempoRojo ? 'rojo' :
          unidad >= config.tiempoAmarillo ? 'amarillo' : 'verde';
        const maxAlerta: EstadoAlerta =
          estado === 'rojo' ? 'rojo' :
          (c.maxAlertaReached === 'rojo' ? 'rojo' : estado);
        return { ...c, estadoAlerta: estado, maxAlertaReached: maxAlerta };
      }));
    }, 1_000);
    return () => clearInterval(interval);
  }, [simulacionActiva, config.modo, config.tiempoAmarillo, config.tiempoRojo]);

  const validarAsignacion = (camion: Camion, bahiaId: string): true | string => {
    if (enProceso[bahiaId]) return 'Bahía ocupada';
    const bay = BAHIAS_CONFIG[bahiaId];
    if (!bay.camionesPermitidos.includes(camion.tipoCodigo)) return 'Tipo de camión no permitido';
    const productos = bay.tareas[camion.operacionCodigo];
    if (!productos?.length) return 'Operación no permitida en esta bahía';
    const ok = productos.some(p =>
      camion.producto.toUpperCase().includes(p.toUpperCase()) || p === 'MIXD' || p === 'MIXC'
    );
    if (!ok) return 'Producto no admitido en esta bahía';
    return true;
  };

  const handleDragStart = (camion: Camion) => {
    if (!simulacionActiva) return;
    setCamionArrastrando(camion);
  };

  const handleDrop = useCallback((bahiaId: string) => {
    setCamionArrastrando(null);
    if (!camionArrastrando) return;
    const resultado = validarAsignacion(camionArrastrando, bahiaId);
    if (resultado !== true) { notify(resultado, 'error'); return; }
    const bay = BAHIAS_CONFIG[bahiaId];
    if (bay.alerta && !window.confirm(bay.alerta)) return;

    const camion = camionArrastrando;
    setCola(prev => prev.filter(c => c.id !== camion.id));
    const turno = getTurnoActual();
    setStats(prev => ({
      ...prev, total: prev.total + 1,
      atendidosTurno1: prev.atendidosTurno1 + (turno === 1 ? 1 : 0),
      atendidosTurno2: prev.atendidosTurno2 + (turno === 2 ? 1 : 0),
      atendidosTurno3: prev.atendidosTurno3 + (turno === 3 ? 1 : 0),
    }));

    const factor = config.modo === 'real' ? 60_000 : 1_000;
    setEnProceso(prev => ({ ...prev, [bahiaId]: { ...camion, bahiaActual: bahiaId } }));
    handleDropBahiaReal(camion.id_viaje, bay.nombre);

    if (config.modo === 'simulacion') {
      setTimeout(() => {
        setEnProceso(prev => {
          if (!prev[bahiaId]) return prev;
          const tiempoPatio = (Date.now() - camion.tiempoEntradaPatio) / 60_000;
          const turnoAuto   = getTurnoActual();
          setStats(s => ({
            ...s,
            total:              s.total + 1,
            atendidosTurno1:    s.atendidosTurno1 + (turnoAuto === 1 ? 1 : 0),
            atendidosTurno2:    s.atendidosTurno2 + (turnoAuto === 2 ? 1 : 0),
            atendidosTurno3:    s.atendidosTurno3 + (turnoAuto === 3 ? 1 : 0),
            tiemposTotalPatio:  [...s.tiemposTotalPatio, tiempoPatio],
          }));
          handleMarcarSalidaReal(camion.id_viaje);
          notify(`✅ Finalizado (auto): ${camion.placa}`, 'success');
          const c = { ...prev }; delete c[bahiaId]; return c;
        });
      }, 8 * factor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camionArrastrando, config.modo, notify]);

  const handleDropFromBahia = (fromBahiaId: string, toBahiaId: string) => {
    const camion = enProceso[fromBahiaId];
    if (!camion) return;
    const resultado = validarAsignacion({ ...camion, bahiaActual: undefined }, toBahiaId);
    if (resultado !== true) { notify(resultado, 'error'); return; }
    if (enProceso[toBahiaId]) { notify('Bahía destino ocupada', 'error'); return; }
    setEnProceso(prev => {
      const c = { ...prev }; delete c[fromBahiaId];
      c[toBahiaId] = { ...camion, bahiaActual: toBahiaId }; return c;
    });
    handleDropBahiaReal(camion.id_viaje, BAHIAS_CONFIG[toBahiaId].nombre);
    notify(`🔄 ${camion.placa} → ${BAHIAS_CONFIG[toBahiaId].nombre}`, 'info');
  };

  const handleFinalizar = useCallback(async (bahiaId: string, camion: Camion) => {
    if (bahiasSaliendo.current.has(bahiaId)) return;
    bahiasSaliendo.current.add(bahiaId);
    try {
      const tiempoPatio = (Date.now() - camion.tiempoEntradaPatio) / 60_000;
      const turno = getTurnoActual();
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        atendidosTurno1: prev.atendidosTurno1 + (turno === 1 ? 1 : 0),
        atendidosTurno2: prev.atendidosTurno2 + (turno === 2 ? 1 : 0),
        atendidosTurno3: prev.atendidosTurno3 + (turno === 3 ? 1 : 0),
        tiemposTotalPatio: [...prev.tiemposTotalPatio, tiempoPatio],
      }));
      setEnProceso(prev => { const c = { ...prev }; delete c[bahiaId]; return c; });
      const ok = await handleMarcarSalidaReal(camion.id_viaje);
      if (!ok) notify(`❌ Error al registrar salida de ${camion.placa}`, 'error');
      else     notify(`✅ Salida registrada: ${camion.placa}`, 'success');
    } finally {
      bahiasSaliendo.current.delete(bahiaId);
    }
  }, [notify]);

  const handleIncidenciaRegistrada = useCallback((camionId: string) => {
    // Actualiza el contador local del camión específico (no global)
    const actualizar = (c: Camion) => {
      if (c.id !== camionId) return c;
      const n = (c.incidencias ?? 0) + 1;
      // Alerta solo cuando ESE camión alcanza el límite de 3
      if (n >= 3) setAlertaMaxIncidencias(true);
      return { ...c, incidencias: n };
    };
    setCola(prev => prev.map(actualizar));
    setEnProceso(prev => {
      const entry = Object.entries(prev).find(([, c]) => c.id === camionId);
      if (!entry) return prev;
      const [bahiaId, c] = entry;
      return { ...prev, [bahiaId]: actualizar(c) };
    });
  }, []);

  const formatTiempo = (ms: number, modo: ConfigSimulador['modo']) => {
    if (modo === 'real') {
      const min = Math.floor(ms / 60_000);
      const h = Math.floor(min / 60); const m = min % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return `${Math.floor(ms / 1000)}s`;
  };

  const handleCerrarSesion = () => {
    if (window.confirm('¿Deseas cerrar la sesión?')) {
      setSimulacionActiva(false); setCola([]); setEnProceso({});
      notify('👋 Sesión cerrada', 'info');
      // Pequeño delay para que el toast sea visible antes de volver al login
      setTimeout(() => onLogout(), 800);
    }
  };

  const dm = darkMode;

  // imgFilter: el modo oscuro/claro define la base, modoAyuda solo añade
  // un pequeño boost de brillo ENCIMA sin cambiar el tema actual
  const imgBase   = dm ? 'brightness(0.60) saturate(0.9)' : 'brightness(0.85) saturate(1.1)';
  const imgFilter = modoAyuda
    ? (dm ? 'brightness(0.80) saturate(1.1)' : 'brightness(0.95) saturate(1.15)')
    : imgBase;

  // El velo también respeta el modo actual; modoAyuda solo lo reduce un poco
  const veilBg = modoAyuda
    ? (dm ? 'rgba(6,13,26,0.10)' : 'rgba(240,245,255,0.05)')
    : (dm ? 'rgba(6,13,26,0.28)' : 'rgba(240,245,255,0.15)');

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${dm ? 'bg-[#060d1a]' : 'bg-[#e8edf5]'}`}>

      <div className="flex-shrink-0 z-50">
        <Header
          darkMode={darkMode} simulacionActiva={simulacionActiva} config={config}
          rol={rolInicial} nombreUsuario={nombreUsuario}
          onToggleDarkMode={() => setDarkMode(p => !p)}
          onToggleModoAyuda={() => setModoAyuda(p => !p)}
          modoAyuda={modoAyuda}
          onReporte={() => setShowReport(true)}
          onIniciar={() => {
            if (!simulacionActiva) setShowConfig(true);
            else { setSimulacionActiva(false); setShowReport(true); }
          }}
          onCerrarSesion={handleCerrarSesion}
        />
      </div>

      <main id="mapa-area" className="flex-1 w-full relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/patio.png)',
          backgroundSize: '100% 100%', backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat', filter: imgFilter,
          transition: 'filter 0.6s ease', zIndex: 0,
        }} />
        <div className="absolute inset-0" style={{ background: veilBg, transition: 'background 0.6s ease', zIndex: 1 }} />

        {Object.entries(BAHIAS_CONFIG).map(([id, bay]) => (
          <div key={id} className="absolute z-20" style={{ left: `${bay.posX}%`, top: `${bay.posY}%` }}>
            <BahiaOverlay
              bahiaId={id} config={bay}
              camion={enProceso[id] || null}
              camionArrastrando={camionArrastrando}
              validarFn={validarAsignacion}
              onDrop={handleDrop}
              onDropFromBahia={handleDropFromBahia}
              onFinalizar={handleFinalizar}
              simulacionActiva={simulacionActiva}
              modoConfig={config}
              formatTiempo={formatTiempo}
              darkMode={darkMode}
              onNotify={notify}
              onIncidenciaRegistrada={handleIncidenciaRegistrada}
              modoAyuda={modoAyuda}
            />
          </div>
        ))}

        {/* Panel 1 — Unidad mayor prioridad */}
        <PanelFlotante titulo="🚨 Unidad Mayor Prioridad" darkMode={darkMode}
          style={{ top: '5.69%', left: '70.78%', width: 'clamp(160px,18vw,240px)' }}>
          {!simulacionActiva ? (
            <span className={dm ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: '0.75rem' }}>
              — Iniciar para ver datos —
            </span>
          ) : panelPrioridad ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-extrabold tracking-wider text-red-400"
                  style={{ fontSize: 'clamp(0.9rem,1.5vw,1.1rem)' }}>
                  {panelPrioridad.tracto}
                </span>
                <span className="rounded-full px-2 py-0.5 font-bold text-black bg-red-400"
                  style={{ fontSize: 'clamp(0.6rem,0.9vw,0.72rem)' }}>
                  ⏱ {intervalATexto(panelPrioridad.tiempo_transcurrido)}
                </span>
              </div>
              <div className={`leading-relajada ${dm ? 'text-slate-400' : 'text-slate-500'}`}
                style={{ fontSize: 'clamp(0.6rem,0.85vw,0.73rem)' }}>
                <div>🕐 Llegada: {panelPrioridad.hora_llegada ?? '—'}</div>
                <div>📍 Bahía: {panelPrioridad.bahia_actual ?? 'En cola'}</div>
              </div>
            </div>
          ) : (
            <span className={dm ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: '0.8rem' }}>
              Sin unidades en cola
            </span>
          )}
        </PanelFlotante>

        {/* Panel 2 — Tiempo promedio patio */}
        <PanelFlotante titulo="⏱ Tiempo Promedio Patio" darkMode={darkMode}
          style={{ top: '31.38%', left: '17.44%', width: 'clamp(140px,15vw,200px)' }}>
          {!simulacionActiva ? (
            <div className={`text-center ${dm ? 'text-slate-600' : 'text-slate-400'}`}
              style={{ fontSize: '0.75rem' }}>
              — Iniciar para ver datos —
            </div>
          ) : panelPromedio?.promedio_neto_patio ? (
            <>
              <div className="font-extrabold text-sky-400 text-center leading-none"
                style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)' }}>
                {intervalAMinutos(panelPromedio.promedio_neto_patio).toFixed(1)}
                <span className="font-normal ml-1 text-slate-400" style={{ fontSize: 'clamp(0.7rem,1vw,0.9rem)' }}>min</span>
              </div>
              <div className={`text-center mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}
                style={{ fontSize: 'clamp(0.52rem,0.7vw,0.65rem)' }}>
                promedio neto del día
              </div>
              <div className="text-green-400 text-center mt-1" style={{ fontSize: '0.58rem' }}>✓ incidencias descontadas</div>
            </>
          ) : (
            <div className={`text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}
              style={{ fontSize: 'clamp(0.72rem,0.9vw,0.82rem)' }}>
              Sin finalizados hoy
            </div>
          )}
        </PanelFlotante>

        {/* Panel 3 — Conteo por turno */}
        <PanelFlotante titulo="🔢 Conteo por Turno" darkMode={darkMode}
          style={{ top: '57.93%', left: '17.44%', width: 'clamp(155px,16vw,230px)' }}>
          {!simulacionActiva ? (
            <div className={`text-center ${dm ? 'text-slate-600' : 'text-slate-400'}`}
              style={{ fontSize: '0.75rem' }}>
              — Iniciar para ver datos —
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              {([
                { key: 'T1', campo: 'turno_1' as const, rango: '07:00–15:00' },
                { key: 'T2', campo: 'turno_2' as const, rango: '15:01–23:00' },
                { key: 'T3', campo: 'turno_3' as const, rango: '23:01–06:59' },
              ] as const).map(({ key, campo, rango }) => (
                <div key={key} className="text-center">
                  <div className="font-extrabold text-violet-400 leading-none"
                    style={{ fontSize: 'clamp(1.2rem,2vw,1.7rem)' }}>
                    {panelTurnos?.[campo] ?? 0}
                  </div>
                  <div className={`mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}
                    style={{ fontSize: 'clamp(0.52rem,0.7vw,0.68rem)' }}>{key}</div>
                  <div className={dm ? 'text-slate-600' : 'text-slate-400'}
                    style={{ fontSize: 'clamp(0.46rem,0.58vw,0.58rem)' }}>{rango}</div>
                </div>
              ))}
            </div>
          )}
        </PanelFlotante>

        {/* Leyenda semáforo */}
        <div className={`absolute bottom-2 right-3 z-30 rounded-lg backdrop-blur-md
          ${dm ? 'bg-slate-900/80 border border-slate-700/20 text-slate-300' : 'bg-white/90 border border-slate-200 text-slate-600'}`}
          style={{ padding: 'clamp(5px,0.8vw,10px) clamp(8px,1vw,14px)', fontSize: 'clamp(0.6rem,0.8vw,0.74rem)' }}>
          <div className={`font-bold mb-1 uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}
            style={{ fontSize: 'clamp(0.55rem,0.7vw,0.65rem)' }}>Semáforo de Espera</div>
          {[
            { color: '#22c55e', label: `Verde ≤ ${config.tiempoAmarillo - 1} ${config.modo === 'simulacion' ? 's' : 'min'}` },
            { color: '#eab308', label: `Amarillo ${config.tiempoAmarillo}–${config.tiempoRojo - 1} ${config.modo === 'simulacion' ? 's' : 'min'}` },
            { color: '#ef4444', label: `Rojo ≥ ${config.tiempoRojo} ${config.modo === 'simulacion' ? 's' : 'min'}` },
          ].map(l => (
            <div key={l.color} className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Toasts */}
        <div className="absolute left-4 bottom-4 z-[999] flex flex-col gap-1.5 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id}
              className={`rounded-lg px-4 py-2.5 text-white backdrop-blur-md shadow-[0_4px_14px_rgba(0,0,0,0.5)]
                ${t.tipo === 'error' ? 'bg-red-700/90' : t.tipo === 'success' ? 'bg-green-700/90' : 'bg-slate-800/90'}`}
              style={{ fontSize: 'clamp(0.72rem,0.9vw,0.85rem)', animation: 'slideIn 0.3s ease' }}>
              {t.msg}
            </div>
          ))}
        </div>
      </main>

      <footer className={`flex-shrink-0 h-44 w-full flex flex-col z-20
        ${dm ? 'bg-gray-950 border-t border-slate-800' : 'bg-slate-100 border-t border-slate-200'}`}>
        <div className={`flex items-center gap-2 px-4 pt-2 pb-1 font-semibold uppercase tracking-widest flex-shrink-0
          ${dm ? 'text-slate-500' : 'text-slate-500'}`}
          style={{ fontSize: 'clamp(0.65rem,0.85vw,0.8rem)' }}>
          <span>🚛 Cola de Espera</span>
          <span className={`rounded-full px-2 font-extrabold ${dm ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
            {cola.length}
          </span>
          {!simulacionActiva && (
            <span className={`font-normal normal-case tracking-normal ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
              Presiona ▶ Iniciar para comenzar
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-3" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-5 gap-3">
            {cola.map(c => (
              <TarjetaCamion
                key={c.id} camion={c} simulacionActiva={simulacionActiva}
                config={config} formatTiempo={formatTiempo}
                onDragStart={handleDragStart}
                onDragEnd={() => setCamionArrastrando(null)}
                darkMode={darkMode}
              />
            ))}
            {cola.length === 0 && simulacionActiva && (
              <div className={`col-span-5 self-center text-sm py-2 ${dm ? 'text-slate-700' : 'text-slate-400'}`}>
                Sin unidades en cola 🎉
              </div>
            )}
          </div>
        </div>
      </footer>

      <Footer />

      <ModalConfig show={showConfig} config={config}
        onConfirm={(c) => {
          // Cliente: ignorar cualquier intento de cambio en los tiempos
          const configFinal: ConfigSimulador = rolInicial === 'cliente'
            ? { ...c, rol: 'cliente', ...TIEMPOS_CLIENTE }
            : { ...c, rol: 'admin' };
          setConfig(configFinal); setShowConfig(false); setSimulacionActiva(true);
          setCola([]); setEnProceso({});
          setStats({ atendidosTurno1: 0, atendidosTurno2: 0, atendidosTurno3: 0, total: 0, tiemposTotalPatio: [] });
          notify('🚀 Sesión iniciada', 'success');
        }}
        onClose={() => setShowConfig(false)}
      />

      {/* ModalReporte recibe panelPromedio y panelTurnos directamente de Supabase */}
      <ModalReporte
        show={showReport}
        stats={stats}
        panelPromedio={panelPromedio}
        panelTurnos={panelTurnos}
        onClose={() => setShowReport(false)}
      />

      {alertaMaxIncidencias && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85">
          <div className="bg-red-950 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full text-center mx-4"
            style={{ animation: 'alertPulse 1s ease-out 3' }}>
            <div className="text-5xl mb-4">🚨</div>
            <h2 className="text-red-400 font-extrabold text-xl mb-3">Límite de Incidencias Alcanzado</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Un camión ha alcanzado el límite de <strong className="text-red-400">3 incidencias</strong>.<br />
              No se pueden registrar más incidencias para esa unidad.<br />
              Por favor contacte a los desarrolladores.
            </p>
            <button onClick={() => setAlertaMaxIncidencias(false)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimuladorMapa;

