// src/types.ts

export type TipoCamion = 'P' | 'J' | 'B' | 'T' | 'O';
export type OperacionCodigo = 'C' | 'D';
export type EstadoAlerta = 'verde' | 'amarillo' | 'rojo';
export type Rol = 'admin' | 'cliente';

// ─── Entidad principal ────────────────────────────────────────────────────────
export interface Camion {
  id: string;                  // clave interna React (string del id integer de la DB)
  id_db: number;               // viajes_camiones.id  — FK para la tabla incidencias
  id_viaje: string;            // viajes_camiones.id_viaje (text UNIQUE) — para queries por viaje
  placa: string;
  frotcom?: string;
  propietario: string;
  fecha: string;
  hora: string;
  tipoOriginal: string;
  tipoCodigo: TipoCamion;
  operacionCodigo: OperacionCodigo;
  producto: string;
  tiempoEntradaPatio: number;  // timestamp ms — solo para referencia local
  tiempoLlegadaCola: number;   // timestamp ms — semáforo en cola
  estadoAlerta: EstadoAlerta;
  maxAlertaReached: EstadoAlerta;
  bahiaActual?: string;
  turno?: 1 | 2 | 3;
  incidencias?: number;        // contador de incidencias registradas (máx 3)
  incidenciaAbierta?: boolean; // true si hay una incidencia sin hora_fin — muestra alerta en bahía
}

export interface BahiaConfig {
  nombre: string;
  camionesPermitidos: TipoCamion[];
  tareas: { D: string[]; C: string[] };
  alerta?: string;
  posX: number;
  posY: number;
}

export interface ConfigSimulador {
  modo: 'simulacion' | 'real';
  tiempoAmarillo: number;
  tiempoRojo: number;
  rol: Rol;
}

// ─── Tipos de las VISTAS de Supabase (solo lectura desde el frontend) ─────────

/**
 * Vista: vista_unidad_prioridad
 * Unidad con mayor tiempo esperando (estado ≠ 'Finalizado'), ordenada por hora_llegada.
 * tiempo_transcurrido viene como string "HH:MM:SS+TZ" desde Postgres.
 */
export interface VwUnidadPrioridad {
  tracto:              string;
  hora_llegada:        string;   // "HH:MM:SS"
  bahia_actual:        string | null;
  tiempo_transcurrido: string;   // "HH:MM:SS+00" — interval calculado por Supabase
}

/**
 * Vista: vista_dashboard_turnos
 * Conteo de unidades finalizadas por turno agrupado por fecha.
 * Una fila = un día. El frontend usa la fila del día de hoy.
 */
export interface VwDashboardTurnos {
  fecha:   string;   // "YYYY-MM-DD"
  turno_1: number;   // 07:00–15:00
  turno_2: number;   // 15:01–23:00
  turno_3: number;   // 23:01–06:59
}

/**
 * Vista: vista_promedio_patio_neto
 * Promedio neto de tiempo en patio (bruto − incidencias) para unidades Finalizadas.
 * promedio_neto_patio es un interval de Postgres → llega como string "HH:MM:SS".
 */
export interface VwPromedioPatioNeto {
  promedio_neto_patio: string | null;   // "HH:MM:SS" o null si no hay datos
}

// ── Aliases de compatibilidad para no romper imports existentes ───────────────
/** @deprecated Usa VwUnidadPrioridad */
export type VwCamionMayorEspera  = VwUnidadPrioridad;
/** @deprecated Usa VwDashboardTurnos */
export type VwAtendidosPorTurno  = VwDashboardTurnos;
/** @deprecated Usa VwPromedioPatioNeto */
export type VwTiempoPromedioPatio = VwPromedioPatioNeto;

// ─── Stats locales (solo para ModalReporte mientras no haya vista) ─────────────
export interface StatsSimulador {
  atendidosTurno1: number;
  atendidosTurno2: number;
  atendidosTurno3: number;
  total: number;
  tiemposTotalPatio: number[];
}
