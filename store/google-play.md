# Fitness Life en Google Play: textos y respuestas

Todo lo que pide Play Console, listo para copiar. Las imágenes están en [`google-play/`](google-play/):
- **Icono de la app:** `icon-512.png` (512×512).
- **Gráfico de funciones:** `feature-graphic.png` (1024×500).
- **Capturas de pantalla del teléfono** (1080×1920), una carpeta por idioma: [`google-play/es`](google-play/es), [`google-play/en`](google-play/en) y [`google-play/pt`](google-play/pt), en este orden:
  `01-inicio`, `02-guiado`, `03-progreso`, `04-nutricion`, `05-retos`, `06-insignias`, `07-pasos`, `08-premium`.
- **Capturas para computadoras y Chromebook:** en horizontal (1920×1080), en [`google-play/chromebook/`](google-play/chromebook/).

## Ficha de Play Store principal

Los textos (nombre, descripción breve, descripción completa y novedades) en español, inglés y portugués están en [`textos-tiendas.md`](textos-tiendas.md).

**Categoría:** Aplicación → Salud y bienestar.

**Datos de contacto:**
- Correo: el que quieras mostrar al público (sale en la ficha).
- Sitio web: `https://newfitneeslife29-commits.github.io/fitness-life-ai/`

**Política de privacidad:** `https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#privacidad`

## Contenido de la app (Panel → «Configura tu app»)

| Formulario | Respuesta |
|---|---|
| Política de privacidad | La URL de arriba |
| Acceso a la app | Todas las funciones están disponibles sin acceso especial (se puede entrar con «Continuar sin cuenta» y crear una cuenta gratis) |
| Anuncios | No, la app no contiene anuncios |
| Clasificación de contenido | Ver abajo |
| Público objetivo | 18 años o más. La app no está dirigida a niños |
| Apps de noticias | No |
| Apps gubernamentales | No |
| Funciones financieras | La app no ofrece funciones financieras |
| Apps de salud | Actividad física y fitness, y Nutrición y control de peso. No es un dispositivo médico |
| Seguridad de los datos | Ver abajo |
| Eliminación de cuenta (URL) | `https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#eliminar-cuenta` |

### Clasificación de contenido (cuestionario IARC)

- **Correo de contacto:** el tuyo.
- **Categoría:** «Todos los demás tipos de apps» (no es un juego, ni una red social pura, ni una app de citas).
- **Violencia, sexo, lenguaje, drogas, apuestas:** No en todas.
- **¿Los usuarios pueden interactuar o compartir contenido entre ellos?** Sí: comunidad con publicaciones, fotos y comentarios.
- **¿Comparte la ubicación del usuario?** No.
- **¿Permite comprar productos digitales?** Sí: suscripción Premium.

### Seguridad de los datos

**Preguntas generales:**
- **¿Recopila o comparte datos?** Sí.
- **¿Se cifran en tránsito?** Sí.
- **¿Se pueden eliminar?** Sí: Ajustes → Cuenta → Eliminar cuenta, o la URL de eliminación.

**Datos que recopila.** Todos son **recopilados, no compartidos**: Supabase, Anthropic y RevenueCat son proveedores de servicios. Todos son **opcionales**, porque la app funciona sin cuenta y sin IA.

| Tipo de datos | Para qué |
|---|---|
| Información personal → Dirección de correo | Funciones de la app; gestión de la cuenta |
| Información personal → Nombre | Funciones de la app (se muestra en la comunidad) |
| Información personal → ID de usuario | Funciones de la app; gestión de la cuenta |
| Salud y fitness → Información de fitness | Funciones de la app (entrenos y peso en la copia en la nube) |
| Salud y fitness → Información de salud | Funciones de la app (comidas y macros; la IA los usa para responder) |
| Fotos y videos → Fotos | Funciones de la app: foto de perfil, publicaciones y foto de comida. La foto de comida se procesa de forma efímera y no se guarda |
| Actividad en la app → Otro contenido generado por el usuario | Funciones de la app (publicaciones, comentarios y preguntas al coach) |
| Información financiera → Historial de compras | Funciones de la app (saber si Premium está activo) |

## Prueba cerrada (obligatoria para cuentas personales nuevas)

Google exige **12 testers durante 14 días seguidos** antes de dejarte publicar en producción.

1. Ve a **Pruebas → Prueba cerrada → Crear pista** (o usa la pista «Alpha»).
2. **Testers:** crea una lista de correo con al menos 12 cuentas de Gmail (familia y amigos). Guarda la lista.
3. **Crear versión:**
   - La primera vez, Play pregunta por la firma: elige **«Usar clave generada por Google»** (firma de apps de Google Play).
   - Sube el archivo `.aab` del flujo **Android for Google Play**.
   - **Nombre de la versión:** `1.0.N`. Play lo pone solo.
   - **Notas de la versión:** «Primera versión de prueba de Fitness Life».
4. **Países:** elige dónde estará disponible (por ejemplo, toda Latinoamérica, España y Estados Unidos).
5. Envía a revisión. Cuando la aprueben, copia el **enlace de participación** y mándalo a los testers. Cada uno lo abre con su Gmail, acepta e instala la app.
6. Tras 14 días con 12 o más testers activos, ve a **Panel → Solicitar acceso a producción**.

## Solicitar acceso a producción (cuestionario)

Al terminar los 14 días, Play pregunta cómo fue la prueba. Borradores de respuesta. Cámbialos por lo que pase de verdad en la prueba: Google revisa que sean ciertos.

- **¿Cómo reclutaste a los testers?** Familiares, amigos y compañeros del gimnasio que entrenan o quieren empezar. Les mandé el enlace de participación por WhatsApp y correo.
- **¿Qué tan fácil fue reclutarlos?** Fácil: es una app que cualquiera que va al gimnasio o entrena en casa puede usar.
- **Describe cómo usaron la app.** Crearon su plan, registraron entrenos en el gimnasio y en casa, usaron el temporizador de descanso, el entrenador con IA, la nutrición y compartieron su Gym Wrapped.
- **¿Qué comentarios recibiste y cómo los recogiste?** Por mensajes directos y por los comentarios de prueba de Play. Anota aquí lo que te digan tus testers (lo que les gustó, lo que falló y lo que pidieron).
- **¿Para quién es la app?** Adultos (18+) que quieren ganar músculo, bajar de peso o ponerse en forma, en el gimnasio o en casa.
- **¿Qué valor aporta?** Un plan de fuerza a la medida que avanza cada semana, registro de series con progresión automática, nutrición y un entrenador con IA, todo en español, inglés y portugués.
- **Instalaciones esperadas el primer año:** elige el rango que te parezca realista (por ejemplo, de 1.000 a 10.000).
- **¿Hiciste cambios por la prueba?** Durante la prueba salieron las versiones 1.0.12 a 1.0.16: rutinas para casa con IA, sección para mujeres, máquina ocupada, compartir en redes, rutinas que avanzan cada semana, permisos de Health Connect corregidos y prueba gratis de Premium. Añade lo que cambies por los comentarios de tus testers.
- **¿Está lista para producción?** Sí, si en la prueba no hubo cierres ni errores graves. Revisa antes **Calidad → Android vitals** en Play Console.
