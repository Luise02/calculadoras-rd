// Datos generales del sitio. Cambia el nombre aquí cuando elijas el definitivo.
export const SITE = {
  nombre: 'CalculaRD',
  descripcion:
    'Calculadoras financieras gratuitas para República Dominicana: salario neto, prestaciones laborales, préstamos y rentabilidad de alquiler.',
  email: 'luiselopezb06@gmail.com',
};

export type IconName = 'sueldo' | 'prestaciones' | 'prestamo' | 'casa';

export interface Herramienta {
  href: string;
  icono: IconName;
  color: string; // variable CSS del color de la herramienta
  titulo: string;
  texto: string;
}

export const HERRAMIENTAS: Herramienta[] = [
  {
    href: '/salario-neto/',
    icono: 'sueldo',
    color: 'var(--mar)',
    titulo: 'Salario neto',
    texto: 'Lo que te llega a la cuenta después de AFP, SFS e ISR.',
  },
  {
    href: '/prestaciones-laborales/',
    icono: 'prestaciones',
    color: 'var(--flamboyan)',
    titulo: 'Prestaciones laborales',
    texto: 'Preaviso, cesantía, vacaciones y salario de Navidad al salir de un trabajo.',
  },
  {
    href: '/prestamos/',
    icono: 'prestamo',
    color: 'var(--mango-oscuro)',
    titulo: 'Simulador de préstamos',
    texto: 'La cuota mensual, los intereses totales y la tabla mes a mes.',
  },
  {
    href: '/rentabilidad-alquiler/',
    icono: 'casa',
    color: 'var(--palma)',
    titulo: 'Rentabilidad de alquiler',
    texto: 'Cuánto te deja un inmueble y en cuántos años recuperas lo invertido.',
  },
];

/**
 * Convierte una ruta interna ('/prestamos/') en un enlace que funciona tanto en tu dominio propio
 * como en GitHub Pages, donde el sitio vive dentro de una subcarpeta (/calculadoras-rd/).
 */
export const url = (ruta: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + ruta;
