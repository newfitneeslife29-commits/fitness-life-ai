# Fitness Life en Google Play: textos y respuestas

Todo lo que pide Play Console, listo para copiar. Las imágenes están en [`google-play/`](google-play/):
- **Icono de la app:** `icon-512.png` (512×512).
- **Gráfico de funciones:** `feature-graphic.png` (1024×500).
- **Capturas de pantalla del teléfono:** de `01-inicio.png` a `08-premium.png` (1080×1920), en ese orden.

## Ficha de Play Store principal

**Nombre de la app** (máx. 30): `Fitness Life: Gym y Nutrición`

**Descripción breve** (máx. 80): `Plan de gimnasio a tu medida, progreso y coach de nutrición con IA.`

**Descripción completa:**

```
Fitness Life arma tu plan de fuerza en un minuto y te acompaña en cada entreno, cada comida y cada récord.

TU PLAN, A TU MEDIDA
• Dinos tu objetivo (ganar músculo, ganar fuerza o ponerte en forma), tu nivel y cuántos días entrenas.
• Recibe rutinas listas para el gimnasio, con mancuernas o en casa sin material, con series, repeticiones y descansos.
• Inicio te muestra qué toca entrenar hoy y cómo vas en la semana.

ENTRENA CON TÉCNICA
• Fotos de los 45 ejercicios y consejos para hacerlos bien.
• Registra peso y repeticiones serie a serie, con temporizador de descanso.
• La app te dice cuándo subir de peso: progresión automática en cada ejercicio.

MIRA CÓMO PROGRESAS
• Constancia por semanas, 1RM estimado por ejercicio y volumen total.
• Peso corporal con gráfica.
• Logros y récords celebrados al terminar cada entreno.

NUTRICIÓN SIN COMPLICARTE
• Calorías, proteína, carbohidratos y grasa del día, con objetivos según tu meta.
• Tabla de alimentos con 94 alimentos comunes: huevo, pollo, pescado, arroz, frutas y más.
• Premium: toma una foto de tu comida y la IA calcula los macros.
• Premium: coach de nutrición con IA que conoce tu objetivo y lo que llevas comido hoy.

COMUNIDAD
• Publica tu progreso con fotos, da like y comenta.
• Reporta y bloquea con un toque: tolerancia cero con el contenido ofensivo.

TU CUENTA, TUS DATOS
• Úsala sin cuenta o crea una para guardar una copia en la nube.
• Sin anuncios. No vendemos tus datos.
• En español, inglés y portugués, con modo claro y oscuro.

FITNESS LIFE PREMIUM
Entrenar es gratis. Premium añade la IA: coach de nutrición y comidas calculadas desde una foto o una descripción. Plan mensual o anual; cancela cuando quieras desde Google Play.

Fitness Life no sustituye el consejo de un médico o nutricionista. Consulta a un profesional antes de empezar un programa de ejercicio o cambiar tu dieta.
```

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
