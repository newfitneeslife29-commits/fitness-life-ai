# Versión Android

> Aprobado: *Ridge Rush: Pro Moto* sale en **iPhone y Android** desde el mismo proyecto de Unity, con el mismo progreso en los dos y juego cruzado online.

## 1. Requisitos mínimos

| | iPhone | Android |
| --- | --- | --- |
| Sistema | iOS 17+ | Android 10 (API 29)+ |
| Procesador | A12 (iPhone XS/XR) en adelante | ARM64 (64 bits), 6+ núcleos |
| Gráficos | Metal | **Vulkan** (OpenGL ES 3 si el móvil no tiene Vulkan) |
| Memoria | — | 4 GB recomendado (3 GB funciona en calidad Baja) |
| Formato de publicación | IPA (App Store) | **AAB** (Google Play), mundos 2–7 con **Play Asset Delivery** |
| Tamaño inicial | < 200 MB | < 200 MB (límite de Google Play para la base: 200 MB) |

## 2. Qué cambia respecto a iOS

| Área | iOS | Android | Decisión |
| --- | --- | --- | --- |
| Inicio de sesión | Game Center + Sign in with Apple | Google Play Games + Sign in with Google | **Cuenta propia** vinculada a cualquiera de ellas: el jugador puede pasar del iPhone a un Android y conservar el progreso |
| Guardado en la nube | ~~CloudKit~~ | — | CloudKit solo funciona en Apple → **guardado en nuestro backend** para las dos plataformas |
| Clasificaciones y logros | Game Center | Google Play Games | La **clasificación real vive en nuestro servidor** (común a todos); se refleja en Game Center y Play Games para la parte social del sistema |
| Multijugador | ~~GameKit~~ | — | GameKit solo empareja dispositivos Apple → **relé dedicado propio** desde el principio, con juego cruzado iOS ↔ Android |
| Compras | StoreKit 2 | Google Play Billing | Unity IAP 5 cubre ambas; los recibos se validan en el servidor |
| Antitrampas | App Attest | **Play Integrity** | Además de la validación de tiempos re-simulando la carrera (igual en ambas) |
| Vibración | Core Haptics (motor continuo + golpes) | `Vibrator` con amplitud | En Android solo golpes cortos: la mayoría de motores de vibración Android no reproducen bien una vibración continua de motor. En Pixel y Galaxy de gama alta se podrá usar `VibrationEffect.Composition` (API 30+) |
| Compartir clips | ReplayKit | MediaProjection | **Se renderiza la repetición a vídeo dentro del juego** (AVAssetWriter / MediaCodec): mismo resultado en las dos y sin pedir permiso de grabar pantalla |
| Botón atrás | — | Gesto / botón atrás | Abre la pausa (en menús, vuelve atrás) — ya implementado |
| Pantallas | Dynamic Island, notch | Recortes de cámara de todo tipo, plegables | El HUD usa el Safe Area en ambas — ya implementado |
| Frecuencia | 60 / 120 Hz (ProMotion) | 60 / 90 / 120 / 144 Hz | Ritmo de fotogramas optimizado (Swappy) activado; 120 FPS solo en calidad Alta/Ultra |
| Temperatura | `ProcessInfo.thermalState` | `PowerManager` (margen térmico, API 30+) | Unity **Adaptive Performance** (proveedor Samsung y genérico de Android) baja la calidad antes de que el móvil limite el rendimiento |
| Privacidad | App Tracking Transparency | Formulario de "Seguridad de los datos" de Google Play | Consentimiento GDPR con Google UMP en ambas |

## 3. Calidad gráfica en Android

Hay miles de modelos, así que no se puede hacer una tabla por modelo como en iPhone. Se detecta por **familia de GPU + memoria** (`Platform/QualityManager.cs`) y la tabla se podrá **ajustar desde el servidor** con datos reales de rendimiento de los jugadores.

| Calidad | GPU (ejemplos) | Memoria |
| --- | --- | --- |
| Baja | Adreno 610 o anterior, Mali-G57/G52, PowerVR | < 3,5 GB o < 6 núcleos |
| Media | Adreno 618–650, Mali-G68–G78 | ≥ 4,5 GB para pasar de Media |
| Alta | Adreno 660–735 (8+ Gen 1, 7+ Gen 2), Mali-G710+, Xclipse | ≥ 4,5 GB |
| Ultra | Adreno 740+ (8 Gen 2 en adelante), Immortalis (Dimensity 9200+) | ≥ 4,5 GB |

## 4. Móviles de prueba recomendados

| Gama | iPhone | Android |
| --- | --- | --- |
| Baja | iPhone XR / 11 | Samsung Galaxy A15, Motorola Moto G (2024) |
| Media | iPhone 13 | Google Pixel 7a, Samsung Galaxy A55 |
| Alta | iPhone 15 Pro | Samsung Galaxy S24, Google Pixel 9 Pro |
| Especial | iPhone SE (pantalla 16:9, sin isla) | Un plegable (Galaxy Z Fold) y un móvil de 144 Hz |

## 5. Ya hecho en el código del prototipo

- Ajustes de Android en el menú **Ridge Rush → Configurar proyecto**: Vulkan + OpenGL ES 3, ARM64, IL2CPP, Android 10+, vertical, dibujar bajo los recortes, ritmo de fotogramas optimizado.
- Vibración Android (`Platform/Haptics.cs`) con el permiso en `Plugins/Android/RRHaptics.androidlib`.
- Detección de calidad por GPU y memoria; 90/120 Hz si la pantalla lo permite.
- Botón atrás → pausa; Safe Area para cualquier recorte; mandos Bluetooth (Xbox, PlayStation) en ambas plataformas.

## 6. Pendiente (en sus fases)

- Fase 5: Google Play Billing (Unity IAP 5) y guardado en el backend.
- Fase 6: Google Play Games, cuenta propia, relé multijugador con juego cruzado, Play Integrity.
- Fase 7: Adaptive Performance, pruebas en la lista de móviles, ajuste de la tabla de calidad.
- Fase 8: ficha de Google Play (capturas, vídeo, clasificación IARC, formulario de seguridad de datos).
