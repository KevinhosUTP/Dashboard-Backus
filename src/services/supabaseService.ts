/**
 * src/services/supabaseService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FUENTE DE VERDAD ÚNICA: toda la lógica de datos pasa por este archivo.
 *
 *   ✅ SELECT  → vistas y tablas de Supabase (lectura de paneles y cola)
 *   ✅ INSERT  → incidencias directamente en la tabla `incidencias`
 *   ✅ UPDATE  → viajes_camiones (bahia_actual, estado, hora_salida)
 *   ✅ Realtime → suscripciones a postgres_changes para actualizar la UI
 */

import { supabase } from '../supabaseClient';
import type {
  Camion,
  TipoCamion,
  OperacionCodigo,
  VwUnidadPrioridad,
  VwDashboardTurnos,
  VwPromedioPatioNeto,
} from '../types';

// ─── Nombres de tablas y vistas — DEBEN declararse antes de las funciones ─────
const T_VIAJES      = import.meta.env.VITE_TABLE_VIAJES      ?? 'viajes_camiones';
const T_INCIDENCIAS = import.meta.env.VITE_TABLE_INCIDENCIAS  ?? 'incidencias';
const T_USUARIOS    = 'usuarios';
const V_PRIORIDAD   = import.meta.env.VITE_VIEW_PRIORIDAD     ?? 'vista_unidad_prioridad';
const V_TURNOS      = import.meta.env.VITE_VIEW_TURNOS        ?? 'vista_dashboard_turnos';
const V_PROMEDIO    = import.meta.env.VITE_VIEW_PROMEDIO      ?? 'vista_promedio_patio_neto';

// ─── Tipo de usuario autenticado ─────────────────────────────────────────────
export interface UsuarioLogin {
  id:     number;
  email:  string;
  rol:    'admin' | 'cliente';
  nombre: string | null;
}

// ─── Helper de error ──────────────────────────────────────────────────────────
function manejarError(contexto: string, error: unknown): null {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[supabaseService] ${contexto}:`, msg);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. CAMIONES EN COLA
//    Tabla: viajes_camiones
//    Trae todos los registros con estado = 'En cola'  y los mapea al tipo
//    Camion que usa React internamente.
// ─────────────────────────────────────────────────────────────────────────────

/** Mapa de tipo_unidad (texto libre DB) → código interno TipoCamion */
const TIPO_MAP: Record<string, TipoCamion> = {
  parihuelero: 'P', pariholero: 'P', 'pari-holero': 'P',
  jumbo: 'J',
  'bi-tren': 'B', bitren: 'B',
  tolva: 'T',
};
function parseTipo(raw: string | null): TipoCamion {
  const key = (raw ?? '').toLowerCase().trim();
  return TIPO_MAP[key] ?? 'O';
}

/** Convierte hora_llegada "HH:MM:SS" a timestamp ms del día de hoy */
function horaATimestamp(hora: string | null): number {
  if (!hora) return Date.now();
  const [h, m, s] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, s ?? 0, 0);
  return d.getTime();
}

export async function fetchCamionesCola(): Promise<Camion[]> {
  const { data, error } = await supabase
    .from(T_VIAJES)
    .select('*')
    .eq('estado', 'En cola')
    .order('hora_llegada', { ascending: true });

  if (error) { manejarError('fetchCamionesCola', error); return []; }
  if (!data?.length) return [];

  return (data as Record<string, unknown>[]).map((row) => {
    const tipoRaw    = (row.tipo_unidad as string | null) ?? '';
    const tipoCodigo = parseTipo(tipoRaw);

    // operacion: "Carga" → 'C' | cualquier otra cosa → 'D'
    const opRaw: string = ((row.operacion as string | null) ?? '').toLowerCase();
    const operacionCodigo: OperacionCodigo = opRaw.startsWith('c') ? 'C' : 'D';

    // producto: unir tipo_descarga / tipo_carga según la operación
    const producto = operacionCodigo === 'C'
      ? ((row.tipo_carga    as string | null) ?? 'Sin especificar')
      : ((row.tipo_descarga as string | null) ?? 'Sin especificar');

    const tsLlegada = horaATimestamp(row.hora_llegada as string | null);

    return {
      id:                 String(row.id),
      id_db:              row.id as number,
      id_viaje:           (row.id_viaje as string | null) ?? String(row.id),
      placa:              (row.tracto   as string | null) ?? '—',
      frotcom:            (row.frotcom  as string | null) ?? undefined,
      propietario:        (row.propietario as string | null) ?? '—',
      fecha:              (row.fecha    as string | null) ?? '',
      hora:               (row.hora_llegada as string | null) ?? '',
      tipoOriginal:       tipoRaw,
      tipoCodigo,
      operacionCodigo,
      producto,
      tiempoEntradaPatio: tsLlegada,
      tiempoLlegadaCola:  tsLlegada,
      estadoAlerta:       'verde' as const,
      maxAlertaReached:   'verde' as const,
      bahiaActual:        (row.bahia_actual as string | null) ?? undefined,
      incidencias:        (row.conteo_incidencias as number | null) ?? 0,
      incidenciaAbierta:  false,
    } satisfies Camion;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PANEL MAYOR PRIORIDAD
//    Vista: vista_unidad_prioridad
//    Unidad con más tiempo esperando (estado ≠ 'Finalizado'), ordenada por hora_llegada.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchUnidadPrioridad(): Promise<VwUnidadPrioridad | null> {
  const { data, error } = await supabase
    .from(V_PRIORIDAD)
    .select('tracto, hora_llegada, bahia_actual, tiempo_transcurrido')
    .limit(1)
    .maybeSingle();

  if (error) return manejarError('fetchUnidadPrioridad', error);
  return data as VwUnidadPrioridad | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PANEL CONTEO POR TURNO
//    Vista: vista_dashboard_turnos
//    Una fila por día con los 3 conteos de turno.
//    El frontend filtra la fila de hoy para mostrar el turno actual.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchDashboardTurnos(): Promise<VwDashboardTurnos | null> {
  const hoy = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const { data, error } = await supabase
    .from(V_TURNOS)
    .select('fecha, turno_1, turno_2, turno_3')
    .eq('fecha', hoy)
    .maybeSingle();

  if (error) return manejarError('fetchDashboardTurnos', error);
  return data as VwDashboardTurnos | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PANEL TIEMPO PROMEDIO NETO
//    Vista: vista_promedio_patio_neto
//    Devuelve un interval de Postgres como string "HH:MM:SS".
//    El frontend lo parsea a minutos para mostrarlo.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPromedioPatioNeto(): Promise<VwPromedioPatioNeto | null> {
  const { data, error } = await supabase
    .from(V_PROMEDIO)
    .select('promedio_neto_patio')
    .maybeSingle();

  if (error) return manejarError('fetchPromedioPatioNeto', error);
  return data as VwPromedioPatioNeto | null;
}

/**
 * Convierte un interval de Postgres a minutos (number, 0 si no hay datos).
 *
 * Formatos que maneja:
 *   "HH:MM:SS"            → normal
 *   "HH:MM:SS.mmm"        → con milisegundos
 *   "-HH:MM:SS"           → negativo (turno de noche, hora_llegada > CURRENT_TIME)
 *   "1 day 02:30:00"      → más de 24h
 *   "1 day 02:30:00+00"   → con zona horaria
 */
export function intervalAMinutos(interval: string | null | undefined): number {
  // Bug 3 fix: guard completo — null, undefined, no-string, string vacío
  if (!interval) return 0;
  if (typeof interval !== 'string') return 0;
  if (!interval.trim()) return 0;

  // Eliminar offset de zona horaria "+HH" al final
  const clean = interval.replace(/[+-]\d{2}$/, '').trim();

  // Detectar si el intervalo es negativo
  const negativo = clean.startsWith('-');
  const sinSigno = negativo ? clean.slice(1) : clean;

  // Extraer días si existe "X day(s)"
  let dias = 0;
  let resto = sinSigno;
  const diaMatch = sinSigno.match(/^(\d+)\s+days?\s+/i);
  if (diaMatch) {
    dias = parseInt(diaMatch[1], 10);
    resto = sinSigno.slice(diaMatch[0].length);
  }

  // Parsear "HH:MM:SS" o "HH:MM:SS.mmm"
  const parts = resto.split(':').map(parseFloat);
  if (parts.length < 2 || parts.some(Number.isNaN)) return 0;

  const [h, m, s = 0] = parts;
  const total = dias * 24 * 60 + h * 60 + m + s / 60;
  return negativo ? -total : total;
}

/**
 * Formatea un interval de Postgres a texto legible: "Xh Ym" o "Ym" o "< 1m".
 * Útil para mostrar tiempo_transcurrido de vista_unidad_prioridad en los paneles.
 */
export function intervalATexto(interval: string | null | undefined): string {
  const min = intervalAMinutos(interval);
  if (min <= 0) return '< 1m';
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}


// ─────────────────────────────────────────────────────────────────────────────
// 6. CRUD DIRECTO — INCIDENCIAS
//    INSERT para abrir una incidencia, UPDATE para cerrarla.
//    Esquema real:
//      id_incidencia (PK), id_camion (FK → viajes_camiones.id),
//      hora_inicio (TIME), hora_fin (TIME nullable),
//      duracion_calculada (interval, calculada por Postgres)
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidenciaRow {
  id_incidencia?: number;
  id_camion:      number;   // FK → viajes_camiones.id  (integer)
  hora_inicio:    string;   // "HH:MM:SS"
  hora_fin?:      string;   // "HH:MM:SS" | null si aún abierta
}

/** Hora actual formateada como "HH:MM:SS" para columnas TIME de Postgres */
function horaActualTime(): string {
  return new Date().toLocaleTimeString('es-PE', { hour12: false }); // "HH:mm:ss"
}

/**
 * Abre una nueva incidencia. Recibe el id interno de viajes_camiones (integer).
 */
export async function abrirIncidencia(id_camion: number): Promise<IncidenciaRow | null> {
  const { data, error } = await supabase
    .from(T_INCIDENCIAS)
    .insert({
      id_camion,
      hora_inicio: horaActualTime(),
      hora_fin:    null,
    })
    .select()
    .maybeSingle();  // 406 fix: no lanza error si el INSERT no devuelve fila

  if (error) return manejarError('abrirIncidencia', error);
  return data as IncidenciaRow | null;
}

/**
 * Cierra la incidencia abierta más reciente de un camión (hora_fin IS NULL).
 * Una sola query UPDATE directa — sin SELECT previo, sin condición de carrera.
 */
export async function cerrarIncidencia(id_camion: number): Promise<IncidenciaRow | null> {
  const { data, error } = await supabase
    .from(T_INCIDENCIAS)
    .update({ hora_fin: horaActualTime() })
    .eq('id_camion', id_camion)
    .is('hora_fin', null)          // solo la(s) que estén abiertas
    .select()
    .maybeSingle();                // toma la primera fila actualizada

  if (error) return manejarError('cerrarIncidencia', error);
  if (!data) {
    console.warn('[supabaseService] cerrarIncidencia: no hay incidencia abierta para id_camion =', id_camion);
    return null;
  }
  return data as IncidenciaRow;
}

/**
 * Cuenta las incidencias totales (abiertas + cerradas) de un camión.
 */
export async function contarIncidencias(id_camion: number): Promise<number> {
  const { count, error } = await supabase
    .from(T_INCIDENCIAS)
    .select('*', { count: 'exact', head: true })
    .eq('id_camion', id_camion);

  if (error) { manejarError('contarIncidencias', error); return 0; }
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CRUD DIRECTO — VIAJES_CAMIONES
//    Actualiza bahía, estado y hora de salida directamente en Supabase.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve true si id_viaje es un número puro (fallback cuando la columna es NULL en DB).
 * Ej: "42" → true (usar PK), "VJ-2024-001" → false (usar columna id_viaje)
 */
function esIdNumerico(id_viaje: string): boolean {
  const n = Number(id_viaje);
  return !isNaN(n) && n > 0 && String(n) === id_viaje;
}

/**
 * Actualiza la bahía y el estado de un viaje tras un drag & drop.
 * Si id_viaje es un número puro usa la PK (id), si no usa la columna id_viaje.
 */
export async function actualizarBahiaDirecto(
  id_viaje: string,
  bahia_actual: string,
  estado: 'Cargando' | 'Descargando'
): Promise<boolean> {
  const payload = { bahia_actual, estado };
  const { data, error } = esIdNumerico(id_viaje)
    ? await supabase.from(T_VIAJES).update(payload).eq('id', Number(id_viaje)).select('id')
    : await supabase.from(T_VIAJES).update(payload).eq('id_viaje', id_viaje).select('id');

  if (error) { manejarError('actualizarBahiaDirecto', error); return false; }
  if (!data?.length) {
    console.warn(`[supabaseService] actualizarBahiaDirecto: ninguna fila actualizada para id_viaje="${id_viaje}"`);
    return false;
  }
  return true;
}

/**
 * Registra la hora de salida y marca el viaje como Finalizado.
 * Si id_viaje es un número puro usa la PK (id), si no usa la columna id_viaje.
 */
export async function marcarSalidaDirecto(id_viaje: string): Promise<boolean> {
  const horaActual = new Date().toLocaleTimeString('es-PE', { hour12: false });
  const payload = { estado: 'Finalizado', hora_salida: horaActual };
  const { data, error } = esIdNumerico(id_viaje)
    ? await supabase.from(T_VIAJES).update(payload).eq('id', Number(id_viaje)).select('id')
    : await supabase.from(T_VIAJES).update(payload).eq('id_viaje', id_viaje).select('id');

  if (error) { manejarError('marcarSalidaDirecto', error); return false; }
  if (!data?.length) {
    console.warn(`[supabaseService] marcarSalidaDirecto: ninguna fila actualizada para id_viaje="${id_viaje}"`);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CONSULTAS DE INCIDENCIAS PARA UI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve true si el camión tiene al menos una incidencia con hora_fin IS NULL.
 * Usado por BahiaOverlay para mostrar el ícono de alerta pulsante.
 */
export async function fetchIncidenciaAbierta(id_camion: number): Promise<boolean> {
  const { count, error } = await supabase
    .from(T_INCIDENCIAS)
    .select('*', { count: 'exact', head: true })
    .eq('id_camion', id_camion)
    .is('hora_fin', null);

  if (error) { manejarError('fetchIncidenciaAbierta', error); return false; }
  return (count ?? 0) > 0;
}

/**
 * Devuelve el promedio de duracion_calculada de las incidencias CERRADAS de un camión.
 * Formato de retorno: "HH:MM:SS" (interval de Postgres) o null si no hay datos.
 * Úsalo con intervalATexto() para mostrarlo en el modal.
 */
export async function fetchPromedioIncidencias(id_camion: number): Promise<string | null> {
  // Traemos todas las duraciones calculadas y promediamos en el cliente
  // ya que Supabase JS no expone AVG directamente en el cliente sin RPC
  const { data, error } = await supabase
    .from(T_INCIDENCIAS)
    .select('duracion_calculada')
    .eq('id_camion', id_camion)
    .not('hora_fin', 'is', null)     // solo incidencias cerradas
    .not('duracion_calculada', 'is', null);

  if (error) { manejarError('fetchPromedioIncidencias', error); return null; }
  if (!data?.length) return null;

  // Convertir cada duracion_calculada (string interval) a minutos y promediar
  const minutos = (data as { duracion_calculada: string }[])
    .map(r => intervalAMinutos(r.duracion_calculada))
    .filter(m => m > 0);

  if (!minutos.length) return null;

  const promedioMin = minutos.reduce((a, b) => a + b, 0) / minutos.length;
  const h = Math.floor(promedioMin / 60);
  const m = Math.floor(promedioMin % 60);
  const s = Math.floor((promedioMin % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. AUTENTICACIÓN — tabla usuarios
//    La tabla almacena pin = md5(pin_texto) calculado con PostgreSQL md5().
//    Aquí usamos la misma función MD5 (RFC 1321) en JS puro para comparar.
//    Una sola query: busca username + pin_hash + activo en un solo SELECT.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Autentica un usuario contra la tabla `usuarios`.
 * Hashea el PIN con MD5 (igual que PostgreSQL md5()) y hace un SELECT único.
 * Devuelve el usuario si las credenciales son correctas, null si no.
 */
export async function loginUsuario(
  email: string,
  password: string
): Promise<UsuarioLogin | null> {
  const pinHash = md5Hex(password);

  const { data, error } = await supabase
    .from(T_USUARIOS)
    .select('id, email, rol, nombre')
    .eq('email', email.trim().toLowerCase())
    .eq('pin', pinHash)
    .eq('activo', true)
    .maybeSingle();

  if (error) { manejarError('loginUsuario', error); return null; }
  if (!data)  return null;

  return {
    id:     data.id     as number,
    email:  data.email  as string,
    rol:    data.rol    as 'admin' | 'cliente',
    nombre: data.nombre as string | null,
  };
}

/**
 * MD5 puro en JavaScript (RFC 1321) — produce el mismo resultado que PostgreSQL md5().
 * Usado para hashear el PIN antes de compararlo con la DB.
 */
function md5Hex(input: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
  }
  function rol(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&c)|(~b&d),a,b,x,s,t);}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&d)|(c&~d),a,b,x,s,t);}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t);}

  const str = unescape(encodeURIComponent(input));
  const x: number[] = [];
  for (let i = 0; i < str.length * 8; i += 8)
    x[i >> 5] = (x[i >> 5] || 0) | (str.charCodeAt(i / 8) << (i % 32));
  const len = str.length * 8;
  x[len >> 5]                      = (x[len >> 5] || 0) | (0x80 << (len % 32));
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a=ff(a,b,c,d,x[i+ 0]|| 0, 7,-680876936);  d=ff(d,a,b,c,x[i+ 1]||0,12,-389564586);
    c=ff(c,d,a,b,x[i+ 2]|| 0,17, 606105819);  b=ff(b,c,d,a,x[i+ 3]||0,22,-1044525330);
    a=ff(a,b,c,d,x[i+ 4]|| 0, 7,-176418897);  d=ff(d,a,b,c,x[i+ 5]||0,12, 1200080426);
    c=ff(c,d,a,b,x[i+ 6]|| 0,17,-1473231341); b=ff(b,c,d,a,x[i+ 7]||0,22,  -45705983);
    a=ff(a,b,c,d,x[i+ 8]|| 0, 7,1770035416);  d=ff(d,a,b,c,x[i+ 9]||0,12,-1958414417);
    c=ff(c,d,a,b,x[i+10]|| 0,17,     -42063); b=ff(b,c,d,a,x[i+11]||0,22,-1990404162);
    a=ff(a,b,c,d,x[i+12]|| 0, 7,1804603682);  d=ff(d,a,b,c,x[i+13]||0,12,  -40341101);
    c=ff(c,d,a,b,x[i+14]|| 0,17,-1502002290); b=ff(b,c,d,a,x[i+15]||0,22, 1236535329);
    a=gg(a,b,c,d,x[i+ 1]|| 0, 5,-165796510);  d=gg(d,a,b,c,x[i+ 6]||0, 9,-1069501632);
    c=gg(c,d,a,b,x[i+11]|| 0,14, 643717713);  b=gg(b,c,d,a,x[i+ 0]||0,20, -373897302);
    a=gg(a,b,c,d,x[i+ 5]|| 0, 5,-701558691);  d=gg(d,a,b,c,x[i+10]||0, 9,   38016083);
    c=gg(c,d,a,b,x[i+15]|| 0,14,-660478335);  b=gg(b,c,d,a,x[i+ 4]||0,20, -405537848);
    a=gg(a,b,c,d,x[i+ 9]|| 0, 5, 568446438);  d=gg(d,a,b,c,x[i+14]||0, 9,-1019803690);
    c=gg(c,d,a,b,x[i+ 3]|| 0,14,-187363961);  b=gg(b,c,d,a,x[i+ 8]||0,20, 1163531501);
    a=gg(a,b,c,d,x[i+13]|| 0, 5,-1444681467); d=gg(d,a,b,c,x[i+ 2]||0, 9,  -51403784);
    c=gg(c,d,a,b,x[i+ 7]|| 0,14,1735328473);  b=gg(b,c,d,a,x[i+12]||0,20,-1926607734);
    a=hh(a,b,c,d,x[i+ 5]|| 0, 4,   -378558);  d=hh(d,a,b,c,x[i+ 8]||0,11,-2022574463);
    c=hh(c,d,a,b,x[i+11]|| 0,16,1839030562);  b=hh(b,c,d,a,x[i+14]||0,23,  -35309556);
    a=hh(a,b,c,d,x[i+ 1]|| 0, 4,-1530992060); d=hh(d,a,b,c,x[i+ 4]||0,11, 1272893353);
    c=hh(c,d,a,b,x[i+ 7]|| 0,16,-155497632);  b=hh(b,c,d,a,x[i+10]||0,23,-1094730640);
    a=hh(a,b,c,d,x[i+13]|| 0, 4, 681279174);  d=hh(d,a,b,c,x[i+ 0]||0,11, -358537222);
    c=hh(c,d,a,b,x[i+ 3]|| 0,16,-722521979);  b=hh(b,c,d,a,x[i+ 6]||0,23,   76029189);
    a=hh(a,b,c,d,x[i+ 9]|| 0, 4,-640364487);  d=hh(d,a,b,c,x[i+12]||0,11, -421815835);
    c=hh(c,d,a,b,x[i+15]|| 0,16, 530742520);  b=hh(b,c,d,a,x[i+ 2]||0,23, -995338651);
    a=ii(a,b,c,d,x[i+ 0]|| 0, 6,-198630844);  d=ii(d,a,b,c,x[i+ 7]||0,10, 1126891415);
    c=ii(c,d,a,b,x[i+14]|| 0,15,-1416354905); b=ii(b,c,d,a,x[i+ 5]||0,21,  -57434055);
    a=ii(a,b,c,d,x[i+12]|| 0, 6,1700485571);  d=ii(d,a,b,c,x[i+ 3]||0,10,-1894986606);
    c=ii(c,d,a,b,x[i+10]|| 0,15,   -1051523); b=ii(b,c,d,a,x[i+ 1]||0,21,-2054922799);
    a=ii(a,b,c,d,x[i+ 8]|| 0, 6,1873313359);  d=ii(d,a,b,c,x[i+15]||0,10,  -30611744);
    c=ii(c,d,a,b,x[i+ 6]|| 0,15,-1560198380); b=ii(b,c,d,a,x[i+13]||0,21, 1309151649);
    a=ii(a,b,c,d,x[i+ 4]|| 0, 6,-145523070);  d=ii(d,a,b,c,x[i+11]||0,10,-1120210379);
    c=ii(c,d,a,b,x[i+ 2]|| 0,15, 718787259);  b=ii(b,c,d,a,x[i+ 9]||0,21, -343485551);
    a=safeAdd(a,oa); b=safeAdd(b,ob); c=safeAdd(c,oc); d=safeAdd(d,od);
  }
  return [a, b, c, d]
    .flatMap(n => Array.from({length:4}, (_,i) => (n >>> (i*8)) & 0xff))
    .map(byte => byte.toString(16).padStart(2,'0'))
    .join('');
}


