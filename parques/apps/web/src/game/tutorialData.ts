/** Datos de texto del tutorial, del recorrido guiado y de las canciones (se traducen; ver i18nKeys). */

export interface CoachStep {
  /** Selector CSS del elemento a iluminar (si no existe, el paso se muestra centrado). */
  sel: string;
  title: string;
  text: string;
}

/** Pasos de la partida de práctica. `wait` = qué tiene que hacer el jugador para seguir. */
type Wait = 'next' | 'roll' | 'exit' | 'move' | 'capture';
interface Step {
  text: string;
  wait: Wait;
  /** Dados que salen en este paso (preparados para que la lección siempre funcione). */
  dice?: [number, number];
}

export const TUTORIAL_STEPS: Step[] = [
  { text: '¡Hola! Soy Dadito y te voy a enseñar a jugar Parqués. Tú eres el AMARILLO: tus 4 fichas empiezan en la cárcel, tu esquina.', wait: 'next' },
  { text: 'Para salir de la cárcel necesitas sacar PAR (los dos dados iguales). ¡Toca los dados para tirar!', wait: 'roll', dice: [3, 3] },
  { text: '¡Par de 3! Con un par sacas 1 o 2 fichas (con doble 1 o doble 6 salen todas). Elige cuántas sacar.', wait: 'exit' },
  { text: 'Si te sobra un dado, mueves con él. Toca una ficha que brille y luego el número para moverla.', wait: 'move' },
  { text: 'Sacar par te da OTRA tirada. ¡Tira otra vez!', wait: 'roll', dice: [2, 3] },
  { text: '¡Mira! Hay una ficha verde a 5 casillas. Toca tu ficha y elige 2+3 para caerle encima y CAPTURARLA.', wait: 'capture' },
  { text: '¡La capturaste! La ficha rival vuelve a su cárcel y tú ganas otra tirada. ¡Así se juega!', wait: 'next' },
  { text: 'Las casillas con ⭐ y las SALIDAS son SEGUROS: ahí nadie te puede capturar.', wait: 'next' },
  { text: '¡Pilas! Si pudiste capturar y no lo hiciste, un rival te puede SOPLAR y mandar esa ficha a la cárcel.', wait: 'next' },
  { text: 'Tres pares seguidos castigan: tu ficha más adelantada se va a la cárcel. ¡No te emociones tanto!', wait: 'next' },
  { text: 'Gana quien lleve primero sus 4 fichas al CIELO (el centro), con el número exacto. Cada partida da monedas, XP y gemas.', wait: 'next' },
];


/** Recorrido del inicio para jugadores nuevos. */
export const LOBBY_TOUR: CoachStep[] = [
  { sel: '.topbar-me', title: 'Tu perfil', text: 'Aquí ves tu nombre, tu nivel y tu XP. Tócalo para cambiar avatar, nombre y ver tus estadísticas.' },
  { sel: '.pill-coin', title: 'Monedas y gemas', text: 'Las monedas sirven para entrar a las mesas y comprar skins. Las gemas, para emotes. Toca + para conseguir más.' },
  { sel: '.play-btn', title: '¡JUGAR!', text: 'Juega contra la máquina en mesas con apuesta: Barrio, Ciudad, Capital, Leyenda… Ganas monedas, XP y gemas.' },
  { sel: '.m-online', title: 'Partida rápida online', text: 'Juega contra personas de verdad. Así subes en el ranking y en el torneo de la semana.' },
  { sel: '.m-private', title: 'Mesa privada', text: 'Crea una mesa con código e invita a tus amigos a jugar contigo.' },
  { sel: '.side-btn', title: 'Recompensa diaria', text: 'Entra todos los días: reclama tu premio, gira la ruleta y cumple misiones.' },
  { sel: '.nav-item:nth-child(1)', title: 'Tienda', text: 'Tableros con paisajes de Colombia, dados, fichas, avatares, marcos y paquetes de monedas y gemas.' },
  { sel: '.nav-item:nth-child(2)', title: 'Eventos', text: 'Misiones diarias y semanales, el evento de 15 días y las temporadas con premios exclusivos.' },
  { sel: '.nav-item:nth-child(4)', title: 'Ranking', text: 'Compite con todo el mundo, con tu país y con tus amigos. Cada semana hay premios.' },
  { sel: '.nav-item:nth-child(5)', title: 'Amigos', text: 'Busca jugadores por su código, agrégalos e invítalos a tu mesa.' },
];

/** Canciones que se pueden elegir en Ajustes (public/music/<id>.mp3). */
export const MUSIC_TRACKS: { id: string; name: string; emoji: string }[] = [
  { id: 'auto', name: 'Automática (menú y partida)', emoji: '✨' },
  { id: 'lobby', name: 'Cumbia', emoji: '🪇' },
  { id: 'game', name: 'Vallenato', emoji: '🪗' },
  { id: 'salsa', name: 'Salsa caleña', emoji: '💃' },
  { id: 'champeta', name: 'Champeta', emoji: '🌴' },
  { id: 'porro', name: 'Porro y papayera', emoji: '🎺' },
];

/** Ventajas del Pase VIP. */
export const VIP_PERKS = [
  { icon: '🎁', text: 'Recompensa diaria al doble' },
  { icon: '🧰', text: 'Cofre de victorias cada 2 partidas ganadas (en vez de 3)' },
  { icon: '💎', text: 'Marco VIP dorado exclusivo (es tuyo para siempre)' },
  { icon: '👑', text: 'Insignia VIP junto a tu nombre' },
];
