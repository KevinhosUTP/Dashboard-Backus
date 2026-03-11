/**
 * src/Componentes/bahiasConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Constantes y helpers de dominio compartidos entre SimuladorMapa y BahiaOverlay.
 * Separados del componente para cumplir con react-refresh/only-export-components.
 */
import type { BahiaConfig, TipoCamion, EstadoAlerta } from '../types';

// ─── Configuración estática de bahías ────────────────────────────────────────
// posX / posY = porcentajes del brief (1061×580px de referencia)
export const BAHIAS_CONFIG: Record<string, BahiaConfig> = {
  'b0.1': { nombre: 'Bahía 0.1', camionesPermitidos: ['P','J','B','T','O'], tareas: { D: ['Fardos','Envases','CPC','PH','MIXD'], C: [] },               posX: 2.92,  posY: 31.38 },
  'b0.2': { nombre: 'Bahía 0.2', camionesPermitidos: ['P','J','B','T','O'], tareas: { D: ['Fardos','Envases','CPC','PH','MIXD'], C: [] },               posX: 2.92,  posY: 57.93 },
  'b1':   { nombre: 'Bahía 1',   camionesPermitidos: ['P','J','B','T','O'], tareas: { D: ['Fardos','Envases','CPC','PH','MIXD'], C: [] },               posX: 2.45,  posY: 5.69  },
  'b2':   { nombre: 'Bahía 2',   camionesPermitidos: ['P','J','B','T','O'], tareas: { D: ['Fardos','Envases','CPC','PH','MIXD'], C: [] },               posX: 13.38, posY: 5.69  },
  'b3':   { nombre: 'Bahía 3',   camionesPermitidos: ['P','J','B','O'],     tareas: { D: ['PT','MIXD'], C: ['PP','PT','MIXC'] },                        posX: 24.03, posY: 5.69  },
  'b4':   { nombre: 'Bahía 4',   camionesPermitidos: ['P','J','B','O'],     tareas: { D: ['PT','MIXD'], C: ['PP','PT','MIXC'] },                        posX: 34.97, posY: 5.69  },
  'b5':   { nombre: 'Bahía 5',   camionesPermitidos: ['P','J','B','O'],     tareas: { D: ['PT','MIXD'], C: ['PP','PT','MIXC'] },                        posX: 45.9,  posY: 5.69  },
  'b14':  { nombre: 'Bahía 14',  camionesPermitidos: ['P','J','B','O'],     tareas: { D: ['PT','MIXD'], C: ['PP','PT','MIXC','ENVLT'] },                posX: 58.91, posY: 26.21 },
  'b10':  { nombre: 'Bahía 10',  camionesPermitidos: ['P'],                 tareas: { D: ['PT','PP','MIXD'], C: ['PP','PT','MIXC'] }, alerta: '¡ATENCIÓN! Coordina con T2.', posX: 76.81, posY: 33.62 },
  'b12':  { nombre: 'Bahía 12',  camionesPermitidos: ['P'],                 tareas: { D: ['PT','PP','MIXD'], C: ['PP','PT','MIXC'] }, alerta: '¡ATENCIÓN! Coordina con T2.', posX: 76.81, posY: 57.93 },
};

// ─── Nombres completos de tipos de camión ─────────────────────────────────────
export const NOMBRES_TIPO_CAMION: Record<TipoCamion, string> = {
  P: 'Parihuelero', J: 'Jumbo', B: 'Bi-tren', T: 'Tolva', O: 'Otros',
};

// ─── Helper de color semáforo ─────────────────────────────────────────────────
export const getColorEstado = (estado: EstadoAlerta): string => {
  if (estado === 'rojo')     return '#ef4444';
  if (estado === 'amarillo') return '#eab308';
  return '#22c55e';
};

