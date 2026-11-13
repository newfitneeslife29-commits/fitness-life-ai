/**
 * Lista de TODAS las claves de texto de la app (para la prueba de traducciones):
 * textos con t()/tr() en el código + textos de los catálogos de datos.
 */
import { TABLES, PRODUCTS } from '@parques/engine';
import { CATEGORY_NAMES, ITEMS } from '@parques/engine';
import { CATEGORIES } from '@parques/engine';
import { DAILY_POOL, WEEKLY_POOL } from '@parques/engine';
import { SEASONS, EVENTS, TOURNAMENT_TIERS, CHESTS } from '@parques/engine';
import { REGIONS } from '../game/phrases';
import { TIPS } from '../game/phrases';
import { LOBBY_TOUR, MUSIC_TRACKS, TUTORIAL_STEPS } from '../game/tutorialData';
import { COUNTRIES } from './countries';

export const SERVER_MESSAGES = [
  'No se pudo conectar con el servidor', 'El servidor no responde', 'No se pudo buscar partida', 'Sin conexión',
  'No es tu turno', 'La mesa está llena', 'No existe una mesa con ese código', 'Solo el anfitrión puede empezar',
  'La partida ya empezó', 'Solo para el top {n} del ranking', 'No estás en una mesa privada', 'Mesa desconocida',
  'La semana pasada no hubo torneo', 'Quedaste {n}º: premios solo para el top 3', 'No jugaste la semana pasada',
  'Ya reclamaste ese premio', 'Sin premio por reclamar', 'Ya lo tienes', 'Este objeto no se compra con monedas',
  'No se pudo comprar', 'La máquina está jugando por ti', 'No hay partida en curso', 'Acción no permitida', 'No estás en esta mesa',
  'Los anuncios con premio son para cuando te quedas sin monedas', 'Ya viste todos los anuncios de hoy', 'Espera un momento para el siguiente anuncio',
  'Premio desconocido', 'Todavía no llegas a ese premio', 'Esa oferta ya no está', 'Cofre desconocido', 'Te faltan gemas', 'Cambio desconocido',
  'Torneo desconocido', 'Ya estás inscrito', 'No se pudo inscribir', 'Primero inscríbete en el torneo', 'Ya jugaste las {n} partidas de esta semana',
  'Necesitas quedar en el top 3 entre al menos 3 amigos que jueguen', 'Ya reclamaste el premio de esta semana', 'Tu amigo no está conectado',
  'Proveedor desconocido', 'No se pudo verificar la cuenta', 'Los premios de los torneos ahora se entregan solos al cerrar la semana',
  'No se pudo crear la mesa', 'No se pudo abrir', 'No se pudo', 'Te faltan monedas',
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
    ...EVENTS.flatMap((e) => [e.name, e.how]),
    ...TOURNAMENT_TIERS.map((t) => t.name),
    ...CHESTS.map((c) => c.name),
    ...PRODUCTS.flatMap((p) => (p.badge ? [p.badge] : [])),
    ...REGIONS.map((r) => r.name),
    ...TUTORIAL_STEPS.map((s) => s.text),
    ...LOBBY_TOUR.flatMap((s) => [s.title, s.text]),
    ...MUSIC_TRACKS.map((m) => m.name),
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
