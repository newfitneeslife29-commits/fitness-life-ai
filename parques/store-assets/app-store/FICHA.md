# Parqués Colombia · ficha de la App Store

Todo lo que pide App Store Connect, listo para copiar y pegar. Las capturas (1320×2868, iPhone 6,9") están en esta
misma carpeta: `1-inicio.png`, `2-partida.png`, `3-tienda.png`, `4-pase.png`.

## 1. Información de la app (App Store Connect → tu app → Información de la app)

| Campo | Valor |
|---|---|
| Nombre (máx. 30) | `Parqués Colombia` |
| Subtítulo (máx. 30) | `El parqués de siempre, online` |
| Categoría principal | Juegos → **Juegos de mesa** |
| Categoría secundaria | Juegos → **Familiares** |
| URL de la política de privacidad | `https://parques-server-production.up.railway.app/privacidad` |
| Derechos de autor | `2026 Parqués Colombia` |

## 2. Versión 1.0 (pestaña de la versión para iOS)

**Texto promocional** (máx. 170, se puede cambiar sin nueva versión):

```
¡Llegó la temporada navideña! Juega parqués online con gente de toda Colombia, gana monedas en las mesas y estrena tableros de Navidad.
```

**Descripción** (máx. 4.000):

```
¡El parqués de toda la vida, ahora en tu celular! Juega con personas de verdad en línea, con tus amigos o contra la máquina, con las reglas colombianas de siempre.

🎲 REGLAS DE AQUÍ
• Sales de la cárcel con par: tienes 3 intentos.
• Par = otra tirada. Tres pares seguidos… ¡pa' la cárcel!
• Capturar y coronar te dan otra tirada.
• Si no capturas cuando podías, ¡te soplan!
• Seguros, salidas y llegada con el número exacto.

🌐 JUEGA COMO QUIERAS
• Partida rápida online contra personas de verdad.
• Mesas privadas con código para jugar con tus amigos.
• Parejas 2 vs 2, Modo Rápido y partidas de 6 jugadores contra la máquina.
• Varias personas en el mismo celular.
• Torneo relámpago, copas semanales y ranking por país y amigos.

🏆 MESAS Y PREMIOS
Entra a mesas de Barrio, Ciudad, Capital y Leyenda con monedas virtuales, gana y sube de nivel. Reto del día, modo Historia por las regiones de Colombia, misiones, logros, liga semanal y pase de batalla.

🎨 HECHO EN COLOMBIA
Tableros pintados con escenarios del Caribe, el Eje Cafetero, los Llanos y mucho más; fichas, dados y avatares bien nuestros; música de cumbia, vallenato y salsa; frases de la Costa, paisas, rolas y de todas las regiones.

👥 CON TUS PARCEROS
Clubes, chat con frases y emotes, mensajes a amigos e invitaciones por WhatsApp.

Nuevo en el parqués? Dadito, nuestra mascota, te enseña a jugar paso a paso.

Las monedas y gemas son virtuales: no tienen valor en dinero ni se pueden cambiar por dinero. El juego es gratis e incluye compras opcionales.
```

**Palabras clave** (máx. 100, separadas por coma, sin espacios):

```
parques,parchis,ludo,dados,juego de mesa,colombia,fichas,online,amigos,clasico,familia,multijugador
```

| Campo | Valor |
|---|---|
| URL de soporte | `https://parques-server-production.up.railway.app/soporte` |
| URL de marketing (opcional) | (vacío) |
| Novedades de esta versión | `¡Primera versión de Parqués Colombia!` |

## 3. Clasificación por edad (Información de la app → Clasificación por edad)

Responde con la verdad; Apple calcula la edad sola. Lo que aplica a este juego:

- **Juegos de azar simulados: Sí, poco frecuente / leve.** (Las mesas cobran entrada en monedas virtuales.)
- **Contenido generado por usuarios / chat: Sí** — hay chat, mensajes a amigos y clubes, con filtro de groserías,
  bloqueo y reportes.
- **Compras dentro de la app: Sí.**
- Violencia, sexo, drogas, terror, lenguaje vulgar, etc.: **Ninguno.**
- Juegos de azar con dinero real: **No.**

## 4. Privacidad de la app (App Store Connect → Privacidad de la app)

1. ¿Recopilas datos? → **Sí**.
2. Marca estos tipos de datos. Para todos: **vinculados a la identidad = Sí**, **rastreo = No**, uso = **Funcionalidad de la app**:
   - **Información de contacto → Correo electrónico** (solo si inician sesión con Apple o Google).
   - **Contenido del usuario → Fotos** (foto de perfil opcional) y **Otro contenido del usuario** (mensajes, nombre de jugador).
   - **Identificadores → ID de usuario** (código de jugador).
   - **Compras → Historial de compras**.
   - **Uso → Interacción con el producto** (partidas, estadísticas, progreso).
3. **No** marques "Datos usados para rastrearte". El juego no pide permiso de rastreo y los anuncios están desactivados
   en esta versión.

## 5. Notas para el revisor (Versión → Información de la revisión de la app)

- Inicio de sesión requerido: **No** (desmarcar). El juego crea solo una cuenta de invitado.
- Contacto: tu nombre, teléfono y correo (solo los ve Apple).
- Notas:

```
No se necesita cuenta: al abrir la app se crea un jugador de invitado. Para jugar: toca JUGAR (partida contra la máquina) o "Partida rápida" (online; si no hay personas, la mesa se completa con la máquina en 10 segundos).
Compras: Tienda → recarga de monedas/gemas, Pase VIP, paquetes y Pase de batalla (15 productos consumibles). Las monedas y gemas son virtuales y no se pueden cambiar por dinero.
Eliminar cuenta: Ajustes → Cuenta → Eliminar mi cuenta.
Las "apuestas" de las mesas usan solo monedas virtuales del juego.
```

## 6. Compras dentro de la app

En la página de la versión, sección **Compras dentro de la app y suscripciones** → **+** → selecciona los 15 productos
(coins_s, coins_m, coins_l, coins_xl, coins_xxl, gems_s, gems_m, gems_l, gems_xl, vip_30, bundle_inicio,
bundle_semana, bundle_leyenda, pass_premium, pass_elite). Cada uno necesita su captura de revisión
(`../captura-revision-compras.png`) y estar en estado "Listo para enviar".

## 7. Antes de enviar

- [ ] Elegir la compilación más reciente de TestFlight en la versión.
- [ ] Variable `PARQUES_SUPPORT_EMAIL` en Railway con el correo de soporte (aparece en /soporte y /privacidad).
- [ ] Subir las 4 capturas a "iPhone 6,9 pulgadas".
- [ ] Precio: Gratis · Disponibilidad: todos los países (o solo Colombia/Latinoamérica).
- [ ] **Enviar a revisión.**
