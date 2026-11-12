/**
 * Lista de TODAS las claves de texto de la app (para la prueba de traducciones):
 * textos con t()/tr() en el código + textos de los catálogos de datos.
 */
import { TABLES, PRODUCTS } from '@parques/engine';
import { CATEGORY_NAMES, ITEMS } from '@parques/engine';
import { CATEGORIES } from '@parques/engine';
import { DAILY_POOL, WEEKLY_POOL } from '@parques/engine';
import { SEASONS } from '@parques/engine';
import { TIPS } from '../game/phrases';
import { COUNTRIES } from './countries';

export const SERVER_MESSAGES = [
  'No se pudo conectar con el servidor', 'El servidor no responde', 'No se pudo buscar partida', 'Sin conexión',
  'No es tu turno', 'La mesa está llena', 'No existe una mesa con ese código', 'Solo el anfitrión puede empezar',
  'La partida ya empezó', 'Solo para el top {n} del ranking', 'No estás en una mesa privada', 'Mesa desconocida',
  'La semana pasada no hubo torneo', 'Quedaste {n}º: premios solo para el top 3', 'No jugaste la semana pasada',
  'Ya reclamaste ese premio', 'Sin premio por reclamar', 'Ya lo tienes', 'Este objeto no se compra con monedas',
  'No se pudo comprar', 'La máquina está jugando por ti', 'No hay partida en curso', 'Acción no permitida', 'No estás en esta mesa',
  'Cuenta no válida', 'Primero inicia sesión', 'Ya reclamaste hoy', 'Ya la reclamaste', 'Todavía no la completas', 'Todavía no llegas a ese nivel', 'Necesitas el Pase Premium', 'Ya lo reclamaste', 'Ese emote es del Pase Premium', 'Compras de prueba desactivadas', 'Foto inválida o muy grande', 'Ya es tu amigo', 'No tienes ese objeto', 'Solo disponible en su temporada', 'Cuenta no encontrada', 'Operación desconocida', 'No estás en una mesa',
];

export function dataKeys(): string[] {
  return [
    ...TABLES.flatMap((t) => [t.name, t.blurb]),
    ...PRODUCTS.map((p) => p.name),
    ...ITEMS.map((i) => i.name),
    ...Object.values(CATEGORY_NAMES),
    ...CATEGORIES.flatMap((c) => [c.name, c.desc]),
    ...[...DAILY_POOL, ...WEEKLY_POOL].map((m) => m.text),
    ...SEASONS.flatMap((s) => [s.name, s.blurb]),
    ...TIPS,
    ...COUNTRIES.map((c) => c.name),
    'Amarillo', 'Azul', 'Rojo', 'Verde', 'Morado', 'Naranja',
    'Práctica libre', 'Partida local', 'Parejas 2 vs 2', 'Modo Rápido', 'Online',
    'Fácil', 'Normal', 'Experto',
    // Accesos del lobby y navegación (llegan como variables a t()).
    'online', 'con amigos', 'Local', 'en el mismo celular', 'Parejas', '2 vs 2', 'Rápido', '2 fichas · 5 min', '4 o 6 jugadores', 'Inicio',
    // Mensajes del servidor y de la tienda.
    ...SERVER_MESSAGES,
  ];
}
