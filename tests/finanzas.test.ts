import { describe, expect, it } from 'vitest';
import {
  calcularAlquiler,
  calcularAntiguedad,
  calcularPrestaciones,
  calcularPrestamo,
  calcularSalarioNeto,
  diasCesantia,
  isrAnual,
} from '../src/lib/finanzas';

describe('ISR anual 2026', () => {
  it('exento hasta RD$416,220', () => {
    expect(isrAnual(400_000)).toBe(0);
    expect(isrAnual(416_220)).toBe(0);
  });
  it('tramo 15%', () => {
    expect(isrAnual(500_000)).toBeCloseTo((500_000 - 416_220) * 0.15, 2);
  });
  it('tramo 20% y 25% usan el monto fijo de la DGII', () => {
    expect(isrAnual(700_000)).toBeCloseTo(31_216 + (700_000 - 624_329) * 0.2, 2);
    expect(isrAnual(1_000_000)).toBeCloseTo(79_776 + (1_000_000 - 867_123) * 0.25, 2);
  });
});

describe('Salario neto', () => {
  it('RD$50,000: TSS RD$2,955', () => {
    const r = calcularSalarioNeto(50_000);
    expect(r.sfs).toBe(1520);
    expect(r.afp).toBe(1435);
  });
  it('RD$65,000: ISR mensual ≈ RD$4,427.55', () => {
    const r = calcularSalarioNeto(65_000);
    expect(r.isr).toBeCloseTo(4427.55, 1);
    expect(r.neto).toBeCloseTo(65_000 - 1976 - 1865.5 - 4427.55, 1);
  });
  it('aplica el tope del SFS (RD$232,230)', () => {
    const r = calcularSalarioNeto(300_000);
    expect(r.sfs).toBeCloseTo(232_230 * 0.0304, 2);
    expect(r.afp).toBeCloseTo(300_000 * 0.0287, 2);
  });
});

describe('Prestaciones', () => {
  it('antigüedad en años, meses y días', () => {
    const a = calcularAntiguedad(new Date(2021, 0, 10), new Date(2026, 10, 14));
    expect([a.anios, a.meses, a.dias]).toEqual([5, 10, 4]);
  });
  it('cesantía: 2 años y 4 meses = 21×2 + 6', () => {
    const a = calcularAntiguedad(new Date(2024, 0, 1), new Date(2026, 4, 5));
    expect(diasCesantia(a)).toBe(48);
  });
  it('desahucio con 5 años y 10 meses', () => {
    const r = calcularPrestaciones({
      fechaIngreso: new Date(2021, 0, 10),
      fechaSalida: new Date(2026, 10, 14),
      salarioMensual: 50_000,
      motivo: 'desahucio',
    });
    const diario = 50_000 / 23.83;
    const [pre, ces, vac] = r.conceptos;
    expect(pre.dias).toBe(28);
    expect(ces.dias).toBe(23 * 5 + 13);
    expect(vac.dias).toBe(11);
    expect(ces.monto).toBeCloseTo(128 * diario, 1);
  });
  it('renuncia: sin preaviso ni cesantía', () => {
    const r = calcularPrestaciones({
      fechaIngreso: new Date(2023, 0, 1),
      fechaSalida: new Date(2026, 5, 30),
      salarioMensual: 40_000,
      motivo: 'renuncia',
    });
    expect(r.conceptos[0].monto).toBe(0);
    expect(r.conceptos[1].monto).toBe(0);
    expect(r.conceptos[3].monto).toBeGreaterThan(0);
  });
});

describe('Préstamo (sistema francés)', () => {
  it('RD$1,000,000 al 12% a 60 meses ≈ RD$22,244.45', () => {
    const r = calcularPrestamo(1_000_000, 12, 60);
    expect(r.cuota).toBeCloseTo(22_244.45, 1);
    expect(r.tabla.at(-1)!.balance).toBe(0);
  });
  it('tasa 0%', () => {
    expect(calcularPrestamo(12_000, 0, 12).cuota).toBe(1000);
  });
});

describe('Alquiler', () => {
  it('rentabilidad neta y recuperación', () => {
    const r = calcularAlquiler({
      precioCompra: 5_000_000,
      gastosIniciales: 500_000,
      alquilerMensual: 35_000,
      mesesOcupados: 11,
      gastosMensuales: 4_000,
      impuestosAnuales: 0,
      comisionAdministracionPct: 0,
    });
    expect(r.ingresoNetoAnual).toBe(35_000 * 11 - 48_000);
    expect(r.rentabilidadNeta).toBeCloseTo(337_000 / 5_500_000, 6);
    expect(r.aniosRecuperacion).toBeCloseTo(5_500_000 / 337_000, 6);
  });
});
