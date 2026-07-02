import { describe, it, expect } from 'vitest';

// Función simulada de la lógica de negocio de Backus 2.0
function calcularColorSemaforo(minutosEnPatio: number): string {
  if (minutosEnPatio <= 60) return 'Verde';
  if (minutosEnPatio <= 120) return 'Amarillo';
  return 'Rojo';
}

// Suite de Pruebas Unitarias (Equivalente a JUnit)
describe('Pruebas Unitarias - Lógica del Semáforo Logístico', () => {
  
  it('Debe retornar Verde si la unidad tiene 60 minutos o menos', () => {
    const resultado = calcularColorSemaforo(45);
    expect(resultado).toBe('Verde');
  });

  it('Debe retornar Amarillo si la unidad está entre 61 y 120 minutos', () => {
    const resultado = calcularColorSemaforo(85);
    expect(resultado).toBe('Amarillo');
  });

  it('Debe retornar Rojo (Alerta Crítica) si supera los 120 minutos', () => {
    const resultado = calcularColorSemaforo(130);
    expect(resultado).toBe('Rojo');
  });

});
