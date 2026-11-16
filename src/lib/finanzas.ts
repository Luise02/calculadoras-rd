/**
 * Lógica de cálculo de todas las calculadoras.
 * Está separada de la interfaz para poder probarla con tests (ver tests/finanzas.test.ts).
 *
 * IMPORTANTE: revisa CONFIG cada año. La escala del ISR cambia desde 2027 (Ley 30-26)
 * y los topes de la TSS cambian cada vez que sube el salario mínimo cotizable.
 */

export const CONFIG = {
  anio: 2026,
  actualizado: 'noviembre 2026',
  tss: {
    sfsEmpleado: 0.0304, // Seguro Familiar de Salud
    afpEmpleado: 0.0287, // Pensiones
    salarioMinimoCotizable: 23_223, // desde febrero 2026
    topeSfsVeces: 10, // tope SFS = 10 salarios mínimos cotizables
    topeAfpVeces: 20, // tope AFP = 20 salarios mínimos cotizables
  },
  // Escala anual de retención ISR asalariados 2026 (DGII)
  isr: [
    { desde: 0, hasta: 416_220.0, fijo: 0, tasa: 0 },
    { desde: 416_220.0, hasta: 624_329.0, fijo: 0, tasa: 0.15 },
    { desde: 624_329.0, hasta: 867_123.0, fijo: 31_216.0, tasa: 0.2 },
    { desde: 867_123.0, hasta: Infinity, fijo: 79_776.0, tasa: 0.25 },
  ],
  divisorSalarioDiario: 23.83, // Código de Trabajo / Ministerio de Trabajo
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------- ISR + TSS */

export function isrAnual(rentaNetaAnual: number): number {
  for (const t of CONFIG.isr) {
    if (rentaNetaAnual <= t.hasta) {
      return r2(t.fijo + Math.max(0, rentaNetaAnual - t.desde) * t.tasa);
    }
  }
  return 0;
}

export interface SalarioNeto {
  bruto: number;
  sfs: number;
  afp: number;
  isr: number;
  totalDescuentos: number;
  neto: number;
  tasaEfectiva: number; // % del bruto que se descuenta
  tramoIsr: number; // tasa marginal del ISR (0, 0.15, 0.2, 0.25)
}

export function calcularSalarioNeto(brutoMensual: number, otrosIngresosGravados = 0): SalarioNeto {
  const { tss } = CONFIG;
  const bruto = Math.max(0, brutoMensual);
  const topeSfs = tss.salarioMinimoCotizable * tss.topeSfsVeces;
  const topeAfp = tss.salarioMinimoCotizable * tss.topeAfpVeces;
  const sfs = r2(Math.min(bruto, topeSfs) * tss.sfsEmpleado);
  const afp = r2(Math.min(bruto, topeAfp) * tss.afpEmpleado);
  const gravableAnual = (bruto + Math.max(0, otrosIngresosGravados) - sfs - afp) * 12;
  const isr = r2(isrAnual(gravableAnual) / 12);
  const tramo = CONFIG.isr.find((t) => gravableAnual <= t.hasta)?.tasa ?? 0;
  const totalDescuentos = r2(sfs + afp + isr);
  return {
    bruto,
    sfs,
    afp,
    isr,
    totalDescuentos,
    neto: r2(bruto - totalDescuentos),
    tasaEfectiva: bruto > 0 ? totalDescuentos / bruto : 0,
    tramoIsr: tramo,
  };
}

/* ------------------------------------------------------------ Prestaciones */

export type MotivoSalida =
  | 'desahucio'
  | 'despido_injustificado'
  | 'despido_justificado'
  | 'renuncia'
  | 'dimision_justificada';

export interface EntradaPrestaciones {
  fechaIngreso: Date;
  fechaSalida: Date;
  salarioMensual: number;
  motivo: MotivoSalida;
  preavisoTrabajado?: boolean; // el empleador avisó con tiempo y el trabajador lo laboró
  vacacionesPendientes?: boolean; // tiene un año completo de vacaciones sin disfrutar
  regaliaYaPagada?: boolean; // ya le pagaron el salario de Navidad de este año
}

export interface Antiguedad {
  anios: number;
  meses: number;
  dias: number;
  mesesTotales: number; // con decimales
}

export function calcularAntiguedad(desde: Date, hasta: Date): Antiguedad {
  let anios = hasta.getFullYear() - desde.getFullYear();
  let meses = hasta.getMonth() - desde.getMonth();
  let dias = hasta.getDate() - desde.getDate();
  if (dias < 0) {
    meses -= 1;
    const diasMesAnterior = new Date(hasta.getFullYear(), hasta.getMonth(), 0).getDate();
    dias += diasMesAnterior;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  if (anios < 0) return { anios: 0, meses: 0, dias: 0, mesesTotales: 0 };
  return { anios, meses, dias, mesesTotales: anios * 12 + meses + dias / 30 };
}

/** Art. 76: días de preaviso según antigüedad. */
export function diasPreaviso(a: Antiguedad): number {
  if (a.mesesTotales < 3) return 0;
  if (a.mesesTotales < 6) return 7;
  if (a.mesesTotales < 12) return 14;
  return 28;
}

/** Art. 80: días de auxilio de cesantía según antigüedad. */
export function diasCesantia(a: Antiguedad): number {
  if (a.mesesTotales < 3) return 0;
  if (a.mesesTotales < 6) return 6;
  if (a.mesesTotales < 12) return 13;
  const porAnio = a.anios >= 5 ? 23 : 21;
  // Toda fracción de año mayor de tres meses se paga según los ordinales 1 y 2.
  const fraccion = a.meses + a.dias / 30;
  const diasFraccion = fraccion >= 6 ? 13 : fraccion > 3 ? 6 : 0;
  return a.anios * porAnio + diasFraccion;
}

/** Arts. 177 y 180: vacaciones proporcionales del año de servicio en curso. */
export function diasVacacionesProporcionales(a: Antiguedad): number {
  // Art. 180: 5 meses = 6 días, 6 = 7, 7 = 8, 8 = 9, 9 = 10, 10 = 11, 11 = 12
  return a.meses >= 5 ? a.meses + 1 : 0;
}

export function diasVacacionesAnuales(a: Antiguedad): number {
  return a.anios >= 5 ? 18 : 14;
}

export interface ConceptoPrestacion {
  concepto: string;
  articulo: string;
  dias: number | null;
  monto: number;
  aplica: boolean;
  nota?: string;
}

export interface ResultadoPrestaciones {
  antiguedad: Antiguedad;
  salarioDiario: number;
  conceptos: ConceptoPrestacion[];
  total: number;
}

export function calcularPrestaciones(e: EntradaPrestaciones): ResultadoPrestaciones {
  const ant = calcularAntiguedad(e.fechaIngreso, e.fechaSalida);
  const diario = e.salarioMensual / CONFIG.divisorSalarioDiario;
  const conIndemnizacion = ['desahucio', 'despido_injustificado', 'dimision_justificada'].includes(e.motivo);

  const dPre = diasPreaviso(ant);
  const preavisoAplica = conIndemnizacion && !e.preavisoTrabajado && dPre > 0;

  const dCes = diasCesantia(ant);
  const cesantiaAplica = conIndemnizacion && dCes > 0;

  const dVacProp = diasVacacionesProporcionales(ant);
  const dVacPend = e.vacacionesPendientes ? diasVacacionesAnuales(ant) : 0;
  const dVac = dVacProp + dVacPend;

  // Art. 219: 1/12 del salario devengado en el año calendario de la salida.
  const inicioAnio = new Date(e.fechaSalida.getFullYear(), 0, 1);
  const desdeRegalia = e.fechaIngreso > inicioAnio ? e.fechaIngreso : inicioAnio;
  const mesesAnio = Math.min(12, calcularAntiguedad(desdeRegalia, e.fechaSalida).mesesTotales);
  const regalia = e.regaliaYaPagada ? 0 : (e.salarioMensual * mesesAnio) / 12;

  const conceptos: ConceptoPrestacion[] = [
    {
      concepto: 'Preaviso',
      articulo: 'Art. 76',
      dias: dPre,
      monto: preavisoAplica ? r2(dPre * diario) : 0,
      aplica: preavisoAplica,
      nota: !conIndemnizacion
        ? 'No aplica para este motivo de salida.'
        : e.preavisoTrabajado
          ? 'No se paga porque el preaviso fue trabajado.'
          : undefined,
    },
    {
      concepto: 'Auxilio de cesantía',
      articulo: 'Art. 80',
      dias: dCes,
      monto: cesantiaAplica ? r2(dCes * diario) : 0,
      aplica: cesantiaAplica,
      nota: !conIndemnizacion ? 'No aplica para este motivo de salida.' : undefined,
    },
    {
      concepto: 'Vacaciones no disfrutadas',
      articulo: 'Arts. 177 y 180',
      dias: dVac,
      monto: r2(dVac * diario),
      aplica: dVac > 0,
    },
    {
      concepto: 'Salario de Navidad (proporcional)',
      articulo: 'Art. 219',
      dias: null,
      monto: r2(regalia),
      aplica: regalia > 0,
      nota: e.regaliaYaPagada ? 'Marcaste que ya fue pagado este año.' : undefined,
    },
  ];

  return {
    antiguedad: ant,
    salarioDiario: r2(diario),
    conceptos,
    total: r2(conceptos.reduce((s, c) => s + c.monto, 0)),
  };
}

/* ----------------------------------------------------------------- Préstamo */

export interface FilaAmortizacion {
  numero: number;
  cuota: number;
  interes: number;
  capital: number;
  cargos: number;
  balance: number;
}

export interface ResultadoPrestamo {
  cuota: number; // capital + interés
  cuotaTotal: number; // incluye cargos mensuales (seguro, etc.)
  totalIntereses: number;
  totalPagado: number;
  tabla: FilaAmortizacion[];
}

/** Sistema francés (cuota fija), el que usan casi todos los bancos dominicanos. */
export function calcularPrestamo(
  monto: number,
  tasaAnualPct: number,
  plazoMeses: number,
  cargosMensuales = 0,
): ResultadoPrestamo {
  const n = Math.max(1, Math.round(plazoMeses));
  const i = tasaAnualPct / 100 / 12;
  const cuota = i === 0 ? monto / n : (monto * i) / (1 - Math.pow(1 + i, -n));
  const tabla: FilaAmortizacion[] = [];
  let balance = monto;
  let totalIntereses = 0;
  for (let k = 1; k <= n; k++) {
    const interes = balance * i;
    let capital = cuota - interes;
    if (k === n) capital = balance; // corrige redondeo en la última cuota
    balance = Math.max(0, balance - capital);
    totalIntereses += interes;
    tabla.push({
      numero: k,
      cuota: r2(capital + interes),
      interes: r2(interes),
      capital: r2(capital),
      cargos: r2(cargosMensuales),
      balance: r2(balance),
    });
  }
  return {
    cuota: r2(cuota),
    cuotaTotal: r2(cuota + cargosMensuales),
    totalIntereses: r2(totalIntereses),
    totalPagado: r2(monto + totalIntereses + cargosMensuales * n),
    tabla,
  };
}

/* --------------------------------------------------------------- Alquiler */

export interface EntradaAlquiler {
  precioCompra: number;
  gastosIniciales: number; // cierre, impuestos de transferencia, remodelación, muebles
  alquilerMensual: number;
  mesesOcupados: number; // de 12
  gastosMensuales: number; // mantenimiento, condominio, servicios a cargo del dueño
  impuestosAnuales: number; // IPI u otros
  comisionAdministracionPct: number; // % del alquiler cobrado
}

export interface ResultadoAlquiler {
  inversionTotal: number;
  ingresoBrutoAnual: number;
  gastosAnuales: number;
  ingresoNetoAnual: number;
  ingresoNetoMensual: number;
  rentabilidadBruta: number; // alquiler de 12 meses / precio de compra
  rentabilidadNeta: number; // ingreso neto / inversión total (cap rate)
  aniosRecuperacion: number | null;
}

export function calcularAlquiler(e: EntradaAlquiler): ResultadoAlquiler {
  const inversionTotal = e.precioCompra + e.gastosIniciales;
  const meses = Math.min(12, Math.max(0, e.mesesOcupados));
  const ingresoBrutoAnual = e.alquilerMensual * meses;
  const comision = ingresoBrutoAnual * (e.comisionAdministracionPct / 100);
  const gastosAnuales = e.gastosMensuales * 12 + e.impuestosAnuales + comision;
  const ingresoNetoAnual = ingresoBrutoAnual - gastosAnuales;
  return {
    inversionTotal: r2(inversionTotal),
    ingresoBrutoAnual: r2(ingresoBrutoAnual),
    gastosAnuales: r2(gastosAnuales),
    ingresoNetoAnual: r2(ingresoNetoAnual),
    ingresoNetoMensual: r2(ingresoNetoAnual / 12),
    rentabilidadBruta: e.precioCompra > 0 ? (e.alquilerMensual * 12) / e.precioCompra : 0,
    rentabilidadNeta: inversionTotal > 0 ? ingresoNetoAnual / inversionTotal : 0,
    aniosRecuperacion: ingresoNetoAnual > 0 ? inversionTotal / ingresoNetoAnual : null,
  };
}

/* ---------------------------------------------------------------- Formato */

export const formatoRD = (n: number) =>
  'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatoPct = (n: number, decimales = 2) =>
  (n * 100).toLocaleString('es-DO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + '%';
