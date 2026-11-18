/**
 * Páginas públicas que piden las tiendas: política de privacidad, términos de uso y soporte.
 * Se sirven en /privacidad, /terminos y /soporte. El correo de contacto sale de PARQUES_SUPPORT_EMAIL.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

const UPDATED = '18 de noviembre de 2026';

function page(title: string, body: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Parqués Colombia</title>
<style>
:root{color-scheme:light dark}body{margin:0;font:16px/1.6 system-ui,-apple-system,sans-serif;background:#1c0a3a;color:#f4efff}
main{max-width:760px;margin:0 auto;padding:28px 18px 60px}h1{font-size:1.7rem;color:#ffcf3f;margin:.2em 0}h2{font-size:1.15rem;margin-top:1.6em;color:#ffe27a}
a{color:#8fd3ff}small{opacity:.75}nav{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:.9rem}li{margin:.25em 0}
</style></head><body><main><nav><a href="/privacidad">Privacidad</a><a href="/terminos">Términos</a><a href="/soporte">Soporte</a></nav>
<h1>${title}</h1><small>Parqués Colombia · actualizado el ${UPDATED}</small>${body}</main></body></html>`;
}

function contact(): string {
  const email = process.env.PARQUES_SUPPORT_EMAIL?.trim();
  return email ? `<a href="mailto:${email}">${email}</a>` : 'el formulario de soporte de la tienda de aplicaciones (App Store o Google Play)';
}

function privacy(): string {
  return page(
    'Política de privacidad',
    `<p>Parqués Colombia es un juego de parqués en línea. Esta política explica qué datos usamos, para qué y cómo puedes borrarlos.</p>
<h2>Datos que usamos</h2>
<ul>
<li><b>Cuenta de juego:</b> un identificador aleatorio y una clave secreta que crea el juego. No pedimos tu nombre real, teléfono ni dirección.</li>
<li><b>Perfil:</b> el nombre de jugador, el avatar o la foto que tú elijas, el país que escojas, tu nivel, monedas, gemas, objetos, estadísticas, logros y amigos.</li>
<li><b>Iniciar sesión con Apple o Google (opcional):</b> el identificador que entrega Apple o Google y, si lo comparten, tu correo. Solo se usa para recuperar tu cuenta en otro celular.</li>
<li><b>Mensajes:</b> los mensajes a amigos y del chat de clubes se guardan para mostrarlos. El chat de la mesa no se guarda. Los mensajes pasan por un filtro de groserías.</li>
<li><b>Reportes:</b> si reportas a alguien (o te reportan) guardamos el reporte para revisar abusos.</li>
<li><b>Compras:</b> las compras se hacen con Apple o Google; nosotros no vemos tu tarjeta. Usamos RevenueCat para verificar la compra y guardamos el número de transacción y el producto para entregarlo una sola vez.</li>
<li><b>Anuncios:</b> la app puede mostrar anuncios de Google AdMob <b>no personalizados</b>. AdMob puede usar datos técnicos del dispositivo para mostrar el anuncio y evitar fraude, según la <a href="https://policies.google.com/privacy">política de Google</a>.</li>
<li><b>Datos técnicos:</b> nuestro servidor (Railway) y la base de datos (Supabase) registran datos técnicos como la dirección IP para que el servicio funcione y sea seguro.</li>
</ul>
<h2>Para qué los usamos</h2>
<p>Solo para que el juego funcione: guardar tu progreso, jugar en línea, rankings, torneos, amigos y clubes, entregar compras y evitar trampas o abusos. <b>No vendemos tus datos</b> ni los usamos para publicidad personalizada.</p>
<h2>Notificaciones</h2>
<p>Los recordatorios (regalo diario, racha) los programa tu propio celular; puedes apagarlos en Ajustes del juego o del teléfono.</p>
<h2>Cuánto tiempo los guardamos</h2>
<p>Mientras tengas tu cuenta. Si la eliminas, borramos tu perfil y tus datos personales; solo queda el registro anónimo de compras que exige la contabilidad.</p>
<h2>Cómo borrar tu cuenta</h2>
<p>En el juego: <b>Ajustes → Cuenta → Eliminar mi cuenta</b>. Se borra al instante. También puedes pedirlo escribiendo a ${contact()}.</p>
<h2>Niños</h2>
<p>El juego no está dirigido a menores de 13 años y no recogemos a sabiendas datos de ellos. Las monedas y gemas son virtuales y no se pueden cambiar por dinero.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir ver, corregir o borrar tus datos escribiendo a ${contact()}.</p>
<h2>Cambios</h2>
<p>Si cambiamos esta política, actualizaremos la fecha de arriba.</p>`,
  );
}

function terms(): string {
  return page(
    'Términos de uso',
    `<p>Al jugar Parqués Colombia aceptas estos términos.</p>
<h2>El juego</h2>
<p>Las monedas, gemas, objetos y premios son <b>virtuales</b>: no tienen valor en dinero, no se pueden cambiar por dinero ni transferir fuera del juego. Las "apuestas" de las mesas son solo con monedas virtuales.</p>
<h2>Compras</h2>
<p>Las compras se hacen con Apple o Google y siguen sus condiciones de reembolso. Lo comprado se entrega en tu cuenta de juego.</p>
<h2>Comportamiento</h2>
<p>No se permiten trampas, insultos, acoso ni abandonar partidas a propósito. Podemos suspender cuentas que incumplan estas reglas.</p>
<h2>Servicio</h2>
<p>El juego se ofrece "tal cual". Podemos cambiar o mejorar funciones. Si eliminas tu cuenta pierdes tu progreso y lo comprado.</p>
<h2>Contacto</h2>
<p>${contact()}</p>`,
  );
}

function support(): string {
  return page(
    'Soporte',
    `<p>¿Tienes un problema o una pregunta? Escríbenos a ${contact()} con tu <b>código de jugador</b> (lo ves en tu perfil) y te ayudamos.</p>
<h2>Preguntas frecuentes</h2>
<ul>
<li><b>¿Cómo no pierdo mi progreso?</b> Ajustes → Cuenta: vincula Apple o Google, o guarda tu código de recuperación.</li>
<li><b>Compré y no me llegó.</b> Cierra y abre el juego; las compras se verifican solas. Si no aparece, escríbenos con tu código de jugador.</li>
<li><b>¿Cómo elimino mi cuenta?</b> Ajustes → Cuenta → Eliminar mi cuenta.</li>
<li><b>¿Cómo aprendo a jugar?</b> Ajustes → Cómo jugar: tutorial paso a paso.</li>
</ul>`,
  );
}

const PAGES: Record<string, () => string> = { '/privacidad': privacy, '/privacy': privacy, '/terminos': terms, '/terms': terms, '/soporte': support, '/support': support };

/** Devuelve true si atendió la petición. */
export function legalRoute(req: IncomingMessage, res: ServerResponse): boolean {
  const path = (req.url ?? '/').split('?')[0]!.replace(/\/$/, '');
  const fn = PAGES[path];
  if (!fn) return false;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' });
  res.end(fn());
  return true;
}
