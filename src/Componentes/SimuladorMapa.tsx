// src/Componentes/SimuladorMapa.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Camion, ConfigSimulador, StatsSimulador,
  EstadoAlerta,
  VwDashboardTurnos, VwPromedioPatioNeto,
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
  fetchDashboardTurnos,
  fetchPromedioPatioNeto,
  intervalAMinutos,
  marcarSalidaDirecto,
  actualizarBahiaDirecto,
} from '../services/supabaseService';
import { BAHIAS_CONFIG } from './bahiasConfig';

// Tiempos fijos para el rol cliente — no editables
const TIEMPOS_CLIENTE = { tiempoAmarillo: 60, tiempoRojo: 120 } as const;
const TIEMPOS_AJUSTE_REAL = { tiempoAmarillo: 61, tiempoRojo: 121 } as const;
const INTERVALO_GENERACION_SIM_MS = 7_000;
const INTERVALO_POLLING_MS = 6_000;
const MOBILE_HEADER_HEIGHT = 105;
const MOBILE_QUEUE_HEIGHT = 176;
const MOBILE_QUEUE_HEADER_HEIGHT = 40;
const MOBILE_CREDITS_HEIGHT = 38;

const TIPOS_TODOS = ['P', 'J', 'B', 'T', 'O'] as const;
const TIPOS_SIN_PLATAFORMA = ['P', 'J', 'B', 'O'] as const;
const ACCIONES = ['C', 'D'] as const;

const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const generarPlacaFicticia = (): string => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l1 = letras[Math.floor(Math.random() * letras.length)];
  const l2 = letras[Math.floor(Math.random() * letras.length)];
  const l3 = letras[Math.floor(Math.random() * letras.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${l1}${l2}${l3}-${n}`;
};

const generarCamionAleatorio = (): Camion => {
  // 5 perfiles equiprobables usando un único random [0..4]
  const perfil = Math.floor(Math.random() * 5);

  let tipoCodigo = 'O' as Camion['tipoCodigo'];
  let operacionCodigo = 'D' as Camion['operacionCodigo'];
  let producto = 'MIXD';

  if (perfil === 0) {
    // Perfil 1: bahías 0.1, 0.2, 1
    tipoCodigo = pickRandom(TIPOS_TODOS);
    operacionCodigo = 'D';
    producto = pickRandom(['Fardos', 'Envases', 'CPC', 'PH', 'MIXD'] as const);
  } else if (perfil === 1) {
    // Perfil 2: bahía 2
    tipoCodigo = 'P';
    operacionCodigo = pickRandom(ACCIONES);
    producto = 'PP';
  } else if (perfil === 2) {
    // Perfil 3: bahías 3, 4, 5
    tipoCodigo = pickRandom(TIPOS_SIN_PLATAFORMA);
    operacionCodigo = pickRandom(ACCIONES);
    producto = operacionCodigo === 'D'
      ? pickRandom(['PT', 'PP', 'MIXD'] as const)
      : pickRandom(['PT', 'PP', 'MIXC'] as const);
  } else if (perfil === 3) {
    // Perfil 4: bahías 10 y 12
    tipoCodigo = 'P';
    operacionCodigo = pickRandom(ACCIONES);
    producto = operacionCodigo === 'D'
      ? pickRandom(['PT', 'PP', 'MIXD'] as const)
      : pickRandom(['PT', 'PP', 'MIXC'] as const);
  } else {
    // Perfil 5: bahía 14
    tipoCodigo = pickRandom(TIPOS_SIN_PLATAFORMA);
    operacionCodigo = 'C';
    producto = 'ENVLT';
  }

  // Filtro final de seguridad transversal
  if (tipoCodigo === 'T') {
    operacionCodigo = 'D';
    producto = pickRandom(['Fardos', 'PH'] as const);
  }

  const now = new Date();
  const llegadaISO = now.toISOString();
  const idUnico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: idUnico,
    id_db: 0,
    id_viaje: `SIM-${idUnico}`,
    placa: generarPlacaFicticia(),
    frotcom: undefined,
    propietario: 'Simulado',
    fecha: llegadaISO.slice(0, 10),
    hora: llegadaISO,
    tipoOriginal: tipoCodigo,
    tipoCodigo,
    operacionCodigo,
    producto,
    tiempoEntradaPatio: now.getTime(),
    tiempoLlegadaCola: now.getTime(),
    estadoAlerta: 'verde',
    maxAlertaReached: 'verde',
    bahiaActual: undefined,
    turno: getTurnoActual(),
    incidencias: 0,
    incidenciaAbierta: false,
  };
};

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

const formatHoraCorta = (raw: string | undefined): string => {
  if (!raw) return '—';
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString('es-PE', { hour12: false });
  }
  if (raw.includes(':')) return raw.slice(0, 8);
  return raw;
};

const minutosATexto = (min: number): string => {
  if (min <= 0) return '< 1m';
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
  const [isMobile, setIsMobile]                         = useState(window.innerWidth < 1024);
  const [isCompactMobile, setIsCompactMobile]           = useState(window.innerWidth < 768);
  const [camionDetalle, setCamionDetalle]               = useState<Camion | null>(null);

  const colaRef        = useRef<Camion[]>([]);
  const enProcesoRef   = useRef<Record<string, Camion>>({});
  const bahiasSaliendo = useRef<Set<string>>(new Set());
  const camionesFinalizados = useRef<Set<string>>(new Set());

  const [config, setConfig] = useState<ConfigSimulador>({
    modo: rolInicial === 'cliente' ? 'real' : 'simulacion',
    rol: rolInicial,
    // Cliente: tiempos fijos no modificables
    tiempoAmarillo: rolInicial === 'cliente' ? TIEMPOS_CLIENTE.tiempoAmarillo : 60,
    tiempoRojo:     rolInicial === 'cliente' ? TIEMPOS_CLIENTE.tiempoRojo     : 120,
  });
  const [stats, setStats] = useState<StatsSimulador>({
    atendidosTurno1: 0, atendidosTurno2: 0, atendidosTurno3: 0,
    total: 0, tiemposTotalPatio: [],
  });

  const [panelTurnos,    setPanelTurnos]    = useState<VwDashboardTurnos | null>(null);
  const [panelPromedio,  setPanelPromedio]  = useState<VwPromedioPatioNeto | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(MouseSensor),
  );
  const modoActual = config.modo;
  const rolActual = config.rol;
  const tiempoAmarilloActual = config.tiempoAmarillo;
  const tiempoRojoActual = config.tiempoRojo;

  const notify = useCallback((msg: string, tipo = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, tipo }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { colaRef.current = cola; },           [cola]);
  useEffect(() => { enProcesoRef.current = enProceso; }, [enProceso]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsCompactMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!simulacionActiva || !isCompactMobile) {
      setCamionDetalle(null);
    }
  }, [simulacionActiva, isCompactMobile]);

  // ── useEffect principal: switch entre Modo Ajuste Real y Modo Simulación ──
  useEffect(() => {
    if (!simulacionActiva) return;

    if (modoActual === 'real') {
      const cargarColaReal = async () => {
        const camiones = await fetchCamionesCola();
        // IDs de camiones ya asignados a bahías — no deben volver a la cola
        const idsEnBahia = new Set(Object.values(enProcesoRef.current).map(c => c.id));
        setCola(camiones.filter(c => !idsEnBahia.has(c.id)));
      };

      cargarColaReal();
      const pollerReal = setInterval(cargarColaReal, INTERVALO_POLLING_MS);
      return () => clearInterval(pollerReal);
    }

    // Simulación solo para admin: no consulta a Supabase, genera unidades locales.
    if (rolActual === 'admin') {
      const generador = setInterval(() => {
        setCola(prev => [...prev, generarCamionAleatorio()]);
      }, INTERVALO_GENERACION_SIM_MS);
      return () => clearInterval(generador);
    }
  }, [simulacionActiva, modoActual, rolActual]);

  // ── Función compartida de recarga de paneles ─────────────────────────────
  const recargarPaneles = useCallback(async () => {
    if (modoActual === 'simulacion') {
      setPanelTurnos(null);
      setPanelPromedio(null);
      return;
    }

    const [turnos, promedio] = await Promise.all([
      fetchDashboardTurnos(),
      fetchPromedioPatioNeto(),
    ]);
    // En real conservamos el último dato válido para evitar quedar en blanco por respuestas nulas intermitentes.
    if (turnos != null) setPanelTurnos(turnos);
    if (promedio != null) setPanelPromedio(promedio);
  }, [modoActual]);

  // ── Polling de PANELES cada 6s — solo modo real y sesión activa ──
  useEffect(() => {
    if (!simulacionActiva) return;
    recargarPaneles();
    if (modoActual === 'simulacion') return;

    const poller = setInterval(recargarPaneles, INTERVALO_POLLING_MS);
    return () => clearInterval(poller);
  }, [simulacionActiva, modoActual, recargarPaneles]);

  // ── Semáforo visual ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!simulacionActiva) return;
    const umbrales = modoActual === 'real'
      ? TIEMPOS_AJUSTE_REAL
      : { tiempoAmarillo: tiempoAmarilloActual, tiempoRojo: tiempoRojoActual };
    const factor = modoActual === 'real' ? 60_000 : 1_000;
    const interval = setInterval(() => {
      setCola(prev => prev.map(c => {
        const unidad = (Date.now() - c.tiempoLlegadaCola) / factor;
        const estado: EstadoAlerta =
          unidad >= umbrales.tiempoRojo ? 'rojo' :
          unidad >= umbrales.tiempoAmarillo ? 'amarillo' : 'verde';
        const maxAlerta: EstadoAlerta =
          estado === 'rojo' ? 'rojo' :
          (c.maxAlertaReached === 'rojo' ? 'rojo' : estado);
        return { ...c, estadoAlerta: estado, maxAlertaReached: maxAlerta };
      }));
    }, 1_000);
    return () => clearInterval(interval);
  }, [simulacionActiva, modoActual, tiempoAmarilloActual, tiempoRojoActual]);

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

  const handleDragStartDnd = useCallback((event: DragStartEvent) => {
    if (!simulacionActiva) return;
    const truckId = event.active.data.current?.truckId as string | undefined;
    if (truckId) {
      const camion = colaRef.current.find(c => c.id === truckId);
      if (camion) setCamionArrastrando(camion);
      return;
    }

    const fromBahia = event.active.data.current?.fromBahia as string | undefined;
    if (!fromBahia) return;
    const camion = enProcesoRef.current[fromBahia];
    if (camion) setCamionArrastrando(camion);
  }, [simulacionActiva]);

  const registrarFinalizacionUnica = useCallback((camion: Camion): boolean => {
    if (camionesFinalizados.current.has(camion.id)) return false;
    camionesFinalizados.current.add(camion.id);

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

    return true;
  }, []);

  const handleDrop = useCallback((bahiaId: string) => {
    setCamionArrastrando(null);
    if (!camionArrastrando) return;
    const resultado = validarAsignacion(camionArrastrando, bahiaId);
    if (resultado !== true) { notify(resultado, 'error'); return; }
    const bay = BAHIAS_CONFIG[bahiaId];
    if (bay.alerta && !window.confirm(bay.alerta)) return;

    const camion = camionArrastrando;
    setCola(prev => prev.filter(c => c.id !== camion.id));

    const factor = config.modo === 'real' ? 60_000 : 1_000;
    setEnProceso(prev => ({ ...prev, [bahiaId]: { ...camion, bahiaActual: bahiaId } }));
    if (config.modo === 'real') {
      void handleDropBahiaReal(camion.id_viaje, bay.nombre);
      void recargarPaneles();
    }

    if (config.modo === 'simulacion') {
      setTimeout(() => {
        setEnProceso(prev => {
          const camionEnBahia = prev[bahiaId];
          // Evita que un timeout viejo contabilice otro camión en la misma bahía.
          if (!camionEnBahia || camionEnBahia.id !== camion.id) return prev;
          const registrado = registrarFinalizacionUnica(camionEnBahia);
          if (registrado) notify(`✅ Finalizado (auto): ${camionEnBahia.placa}`, 'success');
          const c = { ...prev }; delete c[bahiaId]; return c;
        });
      }, 8 * factor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camionArrastrando, config.modo, notify, recargarPaneles, registrarFinalizacionUnica]);

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
    if (config.modo === 'real') {
      void handleDropBahiaReal(camion.id_viaje, BAHIAS_CONFIG[toBahiaId].nombre);
      void recargarPaneles();
    }
    notify(`🔄 ${camion.placa} → ${BAHIAS_CONFIG[toBahiaId].nombre}`, 'info');
  };

  const handleDragEndDnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setCamionArrastrando(null);
      return;
    }

    const truckId = active.data.current?.truckId as string | undefined;
    const fromBahia = active.data.current?.fromBahia as string | undefined;
    const toBahia = String(over.id);

    if (truckId) {
      const camion = colaRef.current.find(c => c.id === truckId);
      if (!camion) {
        setCamionArrastrando(null);
        return;
      }
      flushSync(() => setCamionArrastrando(camion));
      handleDrop(toBahia);
      return;
    }

    if (fromBahia && fromBahia !== toBahia) {
      handleDropFromBahia(fromBahia, toBahia);
    }

    setCamionArrastrando(null);
  };

  const handleFinalizar = useCallback(async (bahiaId: string, camion: Camion) => {
    if (bahiasSaliendo.current.has(bahiaId)) return;
    bahiasSaliendo.current.add(bahiaId);
    try {
      registrarFinalizacionUnica(camion);
      setEnProceso(prev => { const c = { ...prev }; delete c[bahiaId]; return c; });
      if (config.modo === 'real') {
        const ok = await handleMarcarSalidaReal(camion.id_viaje);
        if (!ok) notify(`❌ Error al registrar salida de ${camion.placa}`, 'error');
        else     notify(`✅ Salida registrada: ${camion.placa}`, 'success');
        await recargarPaneles();
      } else {
        notify(`✅ Salida registrada: ${camion.placa}`, 'success');
      }
    } finally {
      bahiasSaliendo.current.delete(bahiaId);
    }
  }, [config.modo, notify, recargarPaneles, registrarFinalizacionUnica]);

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
      camionesFinalizados.current.clear();
      setCamionDetalle(null);
      setSimulacionActiva(false); setCola([]); setEnProceso({});
      notify('👋 Sesión cerrada', 'info');
      // Pequeño delay para que el toast sea visible antes de volver al login
      setTimeout(() => onLogout(), 800);
    }
  };

  const dm = darkMode;
  const abrirDetalleCamion = (camion: Camion) => setCamionDetalle(camion);
  const cerrarDetalleCamion = () => setCamionDetalle(null);
  const mobileMainHeight = `calc(100vh - ${MOBILE_HEADER_HEIGHT + MOBILE_QUEUE_HEIGHT + MOBILE_CREDITS_HEIGHT}px)`;
  const mobileQueueBodyHeight = `calc(${MOBILE_QUEUE_HEIGHT}px - ${MOBILE_QUEUE_HEADER_HEIGHT}px)`;

  const getSemaforoClase = (estado: Camion['estadoAlerta']) => (
    estado === 'verde' ? 'bg-green-400' : estado === 'amarillo' ? 'bg-yellow-400' : 'bg-red-400'
  );

  const getEstadoOperacion = (camion: Camion) => (
    camion.operacionCodigo === 'C' ? 'CARGA' : 'DESCARGA'
  );
  const semaforoLimites = config.modo === 'real'
    ? TIEMPOS_AJUSTE_REAL
    : { tiempoAmarillo: config.tiempoAmarillo, tiempoRojo: config.tiempoRojo };

  const panelPrioridadLocal = useMemo(() => {
    const candidatos = [...cola, ...Object.values(enProceso)];
    if (!candidatos.length) return null;

    const [primero, ...resto] = candidatos;
    const prioridad = resto.reduce((prev, curr) => (
      curr.tiempoLlegadaCola < prev.tiempoLlegadaCola ? curr : prev
    ), primero);

    const minEspera = (Date.now() - prioridad.tiempoLlegadaCola) / 60_000;
    const bahiaNombre = prioridad.bahiaActual
      ? (BAHIAS_CONFIG[prioridad.bahiaActual]?.nombre ?? prioridad.bahiaActual)
      : 'En cola';

    return {
      tracto: prioridad.placa,
      hora_llegada: formatHoraCorta(prioridad.hora),
      bahia_actual: bahiaNombre,
      tiempoTexto: minutosATexto(minEspera),
    };
  }, [cola, enProceso]);

  // Prioridad siempre basada en cola local: cuando se asigna a bahía sale de inmediato del panel.
  const prioridadUI = panelPrioridadLocal;

  const turnosUI = config.modo === 'simulacion'
    ? {
        turno_1: stats.atendidosTurno1,
        turno_2: stats.atendidosTurno2,
        turno_3: stats.atendidosTurno3,
      }
    : {
        turno_1: panelTurnos?.turno_1 ?? stats.atendidosTurno1,
        turno_2: panelTurnos?.turno_2 ?? stats.atendidosTurno2,
        turno_3: panelTurnos?.turno_3 ?? stats.atendidosTurno3,
      };

  const promedioSesionSim = useMemo(() => {
    const tiempos = stats.tiemposTotalPatio.filter(t => t > 0);
    if (!tiempos.length) return null;
    return tiempos.reduce((acc, t) => acc + t, 0) / tiempos.length;
  }, [stats.tiemposTotalPatio]);

  const promedioPatioUI = config.modo === 'simulacion'
    ? promedioSesionSim
    : (panelPromedio?.promedio_neto_patio
      ? intervalAMinutos(panelPromedio.promedio_neto_patio)
      : promedioSesionSim);

  const promedioEsFallbackLocal = config.modo === 'real' && !panelPromedio?.promedio_neto_patio && promedioSesionSim != null;

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

  const panelPrioridadContent = !simulacionActiva ? (
    <span className={dm ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: '0.75rem' }}>
      — Iniciar para ver datos —
    </span>
  ) : prioridadUI ? (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-extrabold tracking-wider text-red-400"
          style={{ fontSize: 'clamp(0.9rem,1.5vw,1.1rem)' }}>
          {prioridadUI.tracto}
        </span>
        <span className="rounded-full px-2 py-0.5 font-bold text-black bg-red-400"
          style={{ fontSize: 'clamp(0.6rem,0.9vw,0.72rem)' }}>
          ⏱ {prioridadUI.tiempoTexto}
        </span>
      </div>
      <div className={`leading-relajada ${dm ? 'text-slate-400' : 'text-slate-500'}`}
        style={{ fontSize: 'clamp(0.6rem,0.85vw,0.73rem)' }}>
        <div>🕐 Llegada: {prioridadUI.hora_llegada ?? '—'}</div>
        <div>📍 Bahía: {prioridadUI.bahia_actual ?? 'En cola'}</div>
      </div>
    </div>
  ) : (
    <span className={dm ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: '0.8rem' }}>
      Sin unidades en cola
    </span>
  );

  const panelPromedioContent = !simulacionActiva ? (
    <div className={`text-center ${dm ? 'text-slate-600' : 'text-slate-400'}`}
      style={{ fontSize: '0.75rem' }}>
      — Iniciar para ver datos —
    </div>
  ) : promedioPatioUI != null ? (
    <>
      <div className="font-extrabold text-sky-400 text-center leading-none"
        style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)' }}>
        {promedioPatioUI.toFixed(1)}
        <span className="font-normal ml-1 text-slate-400" style={{ fontSize: 'clamp(0.7rem,1vw,0.9rem)' }}>min</span>
      </div>
      <div className={`text-center mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}
        style={{ fontSize: 'clamp(0.52rem,0.7vw,0.65rem)' }}>
        {config.modo === 'simulacion'
          ? 'promedio neto de la sesión'
          : (promedioEsFallbackLocal ? 'promedio local (esperando sincronización del día)' : 'promedio neto del día')}
      </div>
      <div className="text-green-400 text-center mt-1" style={{ fontSize: '0.58rem' }}>
        {config.modo === 'simulacion' ? '✓ basado en unidades de la sesión' : '✓ incidencias descontadas'}
      </div>
    </>
  ) : (
    <div className={`text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}
      style={{ fontSize: 'clamp(0.72rem,0.9vw,0.82rem)' }}>
      Sin finalizados hoy
    </div>
  );

  const panelTurnoContent = !simulacionActiva ? (
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
            {turnosUI[campo]}
          </div>
          <div className={`mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}
            style={{ fontSize: 'clamp(0.52rem,0.7vw,0.68rem)' }}>{key}</div>
          <div className={dm ? 'text-slate-600' : 'text-slate-400'}
            style={{ fontSize: 'clamp(0.46rem,0.58vw,0.58rem)' }}>{rango}</div>
        </div>
      ))}
    </div>
  );

  const semaforoContent = (
    <>
      <div className={`font-bold mb-1 uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}
        style={{ fontSize: 'clamp(0.55rem,0.7vw,0.65rem)' }}>Semáforo de Espera</div>
      {[
        { color: '#22c55e', label: `Verde ≤ ${semaforoLimites.tiempoAmarillo - 1} ${config.modo === 'simulacion' ? 's' : 'min'}` },
        { color: '#eab308', label: `Amarillo ${semaforoLimites.tiempoAmarillo}–${semaforoLimites.tiempoRojo - 1} ${config.modo === 'simulacion' ? 's' : 'min'}` },
        { color: '#ef4444', label: `Rojo ≥ ${semaforoLimites.tiempoRojo} ${config.modo === 'simulacion' ? 's' : 'min'}` },
      ].map(l => (
        <div key={l.color} className="flex items-center gap-1.5 mt-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
          {l.label}
        </div>
      ))}
    </>
  );

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${dm ? 'bg-[#060d1a]' : 'bg-[#e8edf5]'}`}>

      <div className="shrink-0 z-50">
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

      <DndContext sensors={sensors} onDragStart={handleDragStartDnd} onDragEnd={handleDragEndDnd}>
      <main id="mapa-area" className={`flex-1 w-full relative ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {!isMobile && (
          <>
            <div className="absolute inset-0" style={{
              backgroundImage: 'url(/patio.png)',
              backgroundSize: '100% 100%', backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat', filter: imgFilter,
              transition: 'filter 0.6s ease', zIndex: 0,
            }} />
            <div className="absolute inset-0" style={{ background: veilBg, transition: 'background 0.6s ease', zIndex: 1 }} />
          </>
        )}

        {isMobile ? (
          <div
            className="relative z-20 p-4 overflow-y-scroll"
            style={{ height: mobileMainHeight, WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="relative grid grid-cols-2 md:grid-cols-3 gap-3 p-4 overflow-y-scroll rounded-lg"
              style={{
                backgroundImage: 'url(/patio.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: '60vh',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="absolute inset-0 bg-black/50 rounded-lg pointer-events-none z-0" />
              {Object.entries(BAHIAS_CONFIG).map(([id, bay]) => (
                <div key={id} className="relative z-10 min-h-[120px]">
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
            </div>

            <div className="flex flex-col gap-3 p-4 w-full">
              <PanelFlotante titulo="🚨 Unidad Mayor Prioridad" darkMode={darkMode}
                style={{ width: '100%', position: 'relative' }}>
                {panelPrioridadContent}
              </PanelFlotante>
              <PanelFlotante titulo="⏱ Tiempo Promedio Patio" darkMode={darkMode}
                style={{ width: '100%', position: 'relative' }}>
                {panelPromedioContent}
              </PanelFlotante>
              <PanelFlotante titulo="🔢 Conteo por Turno" darkMode={darkMode}
                style={{ width: '100%', position: 'relative' }}>
                {panelTurnoContent}
              </PanelFlotante>
              <div className={`rounded-lg backdrop-blur-md
                ${dm ? 'bg-slate-900/80 border border-slate-700/20 text-slate-300' : 'bg-white/90 border border-slate-200 text-slate-600'}`}
                style={{ padding: 'clamp(5px,0.8vw,10px) clamp(8px,1vw,14px)', fontSize: 'clamp(0.6rem,0.8vw,0.74rem)' }}>
                {semaforoContent}
              </div>
            </div>
          </div>
        ) : (
          Object.entries(BAHIAS_CONFIG).map(([id, bay]) => (
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
          ))
        )}

        {!isMobile && (
          <>
            <PanelFlotante titulo="🚨 Unidad Mayor Prioridad" darkMode={darkMode}
              style={{ top: '5.69%', left: '70.78%', width: 'clamp(160px,18vw,240px)' }}>
              {panelPrioridadContent}
            </PanelFlotante>

            <PanelFlotante titulo="⏱ Tiempo Promedio Patio" darkMode={darkMode}
              style={{ top: '31.38%', left: '17.44%', width: 'clamp(140px,15vw,200px)' }}>
              {panelPromedioContent}
            </PanelFlotante>

            <PanelFlotante titulo="🔢 Conteo por Turno" darkMode={darkMode}
              style={{ top: '57.93%', left: '17.44%', width: 'clamp(155px,16vw,230px)' }}>
              {panelTurnoContent}
            </PanelFlotante>

            <div className={`absolute bottom-2 right-3 z-30 rounded-lg backdrop-blur-md
              ${dm ? 'bg-slate-900/80 border border-slate-700/20 text-slate-300' : 'bg-white/90 border border-slate-200 text-slate-600'}`}
              style={{ padding: 'clamp(5px,0.8vw,10px) clamp(8px,1vw,14px)', fontSize: 'clamp(0.6rem,0.8vw,0.74rem)' }}>
              {semaforoContent}
            </div>
          </>
        )}

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

      <footer className={`flex-shrink-0 w-full flex flex-col z-20 ${isCompactMobile ? '' : 'h-44'}
        ${dm ? 'bg-gray-950 border-t border-slate-800' : 'bg-slate-100 border-t border-slate-200'}`}
        style={{ height: isCompactMobile ? `${MOBILE_QUEUE_HEIGHT}px` : undefined }}>
        <div className="flex items-center gap-2 px-4 pt-2 pb-1 font-semibold uppercase tracking-widest shrink-0 text-slate-500"
          style={{
            fontSize: isCompactMobile ? '0.75rem' : 'clamp(0.65rem,0.85vw,0.8rem)',
            minHeight: isCompactMobile ? `${MOBILE_QUEUE_HEADER_HEIGHT}px` : undefined,
          }}>
          <span className="whitespace-nowrap">🚛 COLA DE ESPERA · {cola.length}</span>
          <span className={`${isCompactMobile ? 'hidden' : 'inline-flex'} rounded-full px-2 font-extrabold ${dm ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
            {cola.length}
          </span>
          {!simulacionActiva && (
            <span className={`${isCompactMobile ? 'hidden' : 'inline'} font-normal normal-case tracking-normal ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
              Presiona ▶ Iniciar para comenzar
            </span>
          )}
        </div>
        {isCompactMobile ? (
          <div className="flex-1" style={{ height: mobileQueueBodyHeight }}>
            <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}>
              {cola.map(camion => (
                <button
                  type="button"
                  key={camion.id}
                  className={`shrink-0 flex flex-col items-center rounded-lg px-3 py-2 min-w-[72px]
                    border select-none ${
                      dm ? 'bg-gray-800 border-gray-600' : 'bg-slate-200 border-slate-300'
                    }`}
                  onClick={() => abrirDetalleCamion(camion)}
                >
                  <div className={`w-2 h-2 rounded-full mb-1 ${getSemaforoClase(camion.estadoAlerta)}`} />
                  <span className={`font-bold text-xs leading-tight ${dm ? 'text-white' : 'text-slate-800'}`}>
                    {camion.placa}
                  </span>
                  <span className={`text-[10px] mt-1 px-1 rounded font-medium ${
                    camion.operacionCodigo === 'C'
                      ? 'bg-blue-600 text-white'
                      : 'bg-orange-600 text-white'
                  }`}>
                    {getEstadoOperacion(camion)}
                  </span>
                </button>
              ))}
              {cola.length === 0 && simulacionActiva && (
                <div className="self-center text-xs py-2 text-slate-500">
                  Sin unidades en cola 🎉
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </footer>
      </DndContext>

      {isCompactMobile && camionDetalle && (
        <>
          <button type="button" className="fixed inset-0 bg-black/60 z-40" onClick={cerrarDetalleCamion} aria-label="Cerrar detalle del camión" />
          <div className={`fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 z-50 ${dm ? 'bg-gray-900' : 'bg-white border-t border-slate-200'}`}>
            <button
              onClick={cerrarDetalleCamion}
              className={`absolute top-3 right-3 text-lg leading-none ${dm ? 'text-slate-300' : 'text-slate-500'}`}
              aria-label="Cerrar detalle"
            >
              ×
            </button>
            <div className="pr-8">
              <h3 className={`font-extrabold text-sm ${dm ? 'text-white' : 'text-slate-900'}`}>{camionDetalle.placa}</h3>
              <div className={`mt-2 space-y-1 text-xs ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                <div><span className="font-semibold">Tipo:</span> {camionDetalle.tipoCodigo}</div>
                <div><span className="font-semibold">Producto:</span> {camionDetalle.producto}</div>
                <div><span className="font-semibold">Estado:</span> {getEstadoOperacion(camionDetalle)}</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Semáforo:</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${getSemaforoClase(camionDetalle.estadoAlerta)}`} />
                  <span className="capitalize">{camionDetalle.estadoAlerta}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />

      <ModalConfig key={`${showConfig ? 'open' : 'closed'}-${config.rol}-${config.modo}-${config.tiempoAmarillo}-${config.tiempoRojo}`} show={showConfig} config={config}
        onConfirm={(c) => {
          // Cliente: ignorar cualquier intento de cambio en los tiempos
          const configFinal: ConfigSimulador = rolInicial === 'cliente'
            ? { ...c, modo: 'real', rol: 'cliente', ...TIEMPOS_CLIENTE }
            : { ...c, rol: 'admin' };
          setConfig(configFinal); setShowConfig(false); setSimulacionActiva(true);
          camionesFinalizados.current.clear();
          setCola([]); setEnProceso({});
          setStats({ atendidosTurno1: 0, atendidosTurno2: 0, atendidosTurno3: 0, total: 0, tiemposTotalPatio: [] });
          notify('🚀 Sesión iniciada', 'success');
        }}
        onClose={() => setShowConfig(false)}
      />

      {/* En simulación usa métricas de sesión; en real usa métricas del día vía Supabase */}
      <ModalReporte
        show={showReport}
        modo={config.modo}
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

