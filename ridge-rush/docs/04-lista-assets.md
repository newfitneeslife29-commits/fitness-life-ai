# Fase 2 · Lista de assets 3D, VFX, audio y UI

Prioridad: **P0** = necesario para el prototipo (Fase 3) · **P1** = lanzamiento v1.0 · **P2** = actualizaciones.
Todos los assets son de **creación propia** o de bibliotecas con licencia comercial que permita uso en juegos (revisar cada licencia; nada extraído de otros juegos).

## 1. Normas técnicas

| Tipo | LOD0 | LOD1 | LOD2 | Texturas (Ultra → Bajo) | Notas |
| --- | --- | --- | --- | --- | --- |
| Moto (jugador) | 35–45 k tris | 15 k | 5 k (fantasmas/rivales) | 2× 2048 (carenado, mecánica) → 1024 | Piezas separadas para daño y suspensión |
| Piloto | 25–30 k | 12 k | 4 k | 2048 cuerpo + 1024 casco | Esqueleto compatible con ragdoll (15 huesos físicos) |
| Prop grande (coche, contenedor) | 8–15 k | 4 k | 1 k | 1024 (atlas por mundo) | Colisión simple aparte |
| Prop pequeño | 0,5–3 k | — | impostor | atlas | |
| Fondo lejano | — | — | tarjetas / impostores | 2048 panorámicas | Parallax por capas |

- Formato **ASTC** (4×4 normales/detalle, 6×6 albedo, 8×8 fondos). Mapas empaquetados: *MaskMap* = metal (R), oclusión (G), detalle (B), suavidad (A).
- Pivotes y escala reales (1 unidad = 1 m), eje Y arriba, nombres `SM_`, `SK_`, `T_`, `M_`, `FX_`, `SFX_`.
- Cada moto: piezas con nombre fijo (`frame`, `fork_upper`, `fork_lower`, `swingarm`, `wheel_f`, `wheel_r`, `fender_f`, `exhaust`, `seat`, `plastics_L/R`, `number_plate`) para que el rig y el sistema de daño sean comunes.

## 2. Motos (15) — P0: 1 · P1: 14

| Moto | Tipo | P | Particularidades |
| --- | --- | --- | --- |
| Haldane Sprout 125 | MX 125 | **P0** | Moto de referencia para el prototipo |
| Haldane Raptor 250F | MX 250 | P1 | |
| Vextor Brute 450R | MX 450 | P1 | |
| Ferrum Trailhound 300 | Enduro | P1 | Faro, protector de motor |
| Kestrel Goat T-280 | Trial | P1 | Sin asiento, depósito bajo |
| Vextor Asfalto SM 450 | Supermoto | P1 | Llantas 17", neumáticos lisos |
| Aurelion Stratos 1000 | Deportiva | P1 | Carenado completo |
| Ferrum Ironhide 1200 | Chopper | P1 | Mucho cromo |
| Solace Volt-X | Eléctrica | P1 | Emisivos animados, sin escape |
| Kestrel Mule 4x4 | Quad | P1 | 4 ruedas (sim con eje doble en el plano) |
| Nordvik Frostbite 600 | Moto de nieve | P1 | Oruga + esquí (sim especial) |
| Haldane Dune Viper 250 | Rally | P1 | Torre de navegación |
| Vextor Shadow 450 | MX nocturna | P1 | Faro LED potente |
| Aurelion Carbon Ghost 450 | Edición carbono | P1 | Material de carbono |
| Haldane Aurum 450 | Legendaria dorada | P1 | Material oro/cromo, estela propia |

Por moto: modelo + LODs, 3 pinturas de fábrica, plantilla UV para vinilos, máscara de barro, máscara de rayones, 3 piezas que se sueltan, faro (luz real en Alto/Ultra).

## 3. Pilotos y equipamiento

| Asset | Cantidad v1.0 | P |
| --- | --- | --- |
| Cuerpo base (2 complexiones) | 2 | P0 (1) |
| Cabezas/rostros (bajo el casco, para garaje y celebraciones) | 6 (pilotos originales) | P1 |
| Cascos | 20 | P0 (1) |
| Gafas | 12 | P0 (1) |
| Trajes (camiseta + pantalón) | 25 | P0 (1) |
| Botas | 10 | P1 |
| Guantes | 10 | P1 |
| Plantillas de vinilos/dorsales | 40 | P1 |

**Animaciones** (captura de movimiento o keyframe): pose neutra montado, poses de inclinación extrema adelante/atrás (para mezclar con IK), absorción de aterrizaje, wheelie, stoppie, ajuste en el aire, "superman" y "no-hander" (trucos visuales de Freestyle), levantarse tras choque, 12 celebraciones (2 por piloto), idles de garaje.

## 4. Mundos (kit modular por mundo, P1; Costa Coral P0)

Cada mundo incluye: **materiales de terreno (3–5 capas)**, **kit de pista** (rampas, plataformas, piezas específicas), **props**, **fondo en 3 capas** (medio 3D, lejano impostores, cielo HDRI/procedural), **elementos vivos**, **preset de clima y luz**, **escena de entorno con luz precalculada**.

| Mundo | Kit de pista / obstáculos | Props | Elementos vivos | Fondo |
| --- | --- | --- | --- | --- |
| **Costa Coral (P0)** | Rampas de madera (S/M/L), muelle modular, pasarelas, troncos de palmera | Barcas, cabañas, tablas de surf, boyas, palmeras (3 variantes + viento) | Gaviotas, olas (shader + malla), bañistas a lo lejos (impostores) | Faro, islas, mar abierto |
| Cañón Ceniza | Puentes de cuerda, rocas que caen, vías de mina | Vagonetas, coches oxidados, cactus, depósitos de agua | Buitres, remolinos de polvo | Mesetas, arcos de roca |
| Selva Verdor | Ruinas desmoronables, troncos flotantes, puentes de lianas | Estatuas, columnas, raíces gigantes, cascadas | Pájaros, monos (siluetas), niebla | Pirámides en la niebla, dosel |
| Pico Glaciar | Puentes de hielo, telesillas, rampas de nieve | Cabañas, señales, pinos nevados, quitanieves | Copos, aurora, avalancha (VFX + malla) | Picos, glaciar |
| Neón Bay | Andamios, grúas, rampas metálicas, azoteas modulares | Contenedores, aires acondicionados, letreros neón inventados, vagones | Tráfico lejano, helicóptero, dron | Rascacielos con ventanas animadas |
| Forja Volcán | Cintas transportadoras, prensas, puentes grúa, plataformas sobre lava | Barriles explosivos, tuberías, maquinaria, crisoles | Chorros de vapor, ríos de lava, erupción | Volcán, chimeneas industriales |
| Thunderdome | Whoops, triples, rhythm sections, peraltes, puerta de salida | Vallas publicitarias (marcas inventadas), banderines, podio | Público (impostores animados por GPU), pirotecnia, focos móviles | Gradas, techo |

**Objetos comunes (P0/P1)**: contenedor marítimo, coche abandonado (2 tipos), barril explosivo, caja de madera, neumático apilado, rampa metálica, puente derrumbable (genérico), plataforma móvil, checkpoint (arco inflable con marca del juego), meta.

## 5. Garaje 3D (P1)
Taller con elevador hidráulico de moto, focos, banco de herramientas, estanterías, cartel del logotipo, suelo de hormigón pulido (reflejos), sonda de reflexión de alta calidad, luz precalculada + 3 focos dinámicos. Cámaras: orbital 360°, primeros planos de motor, escape, suspensión, ruedas.

## 6. VFX

Todo con **Particle System** (funciona en todos los chips); la cantidad de partículas se escala por nivel de calidad.

| Efecto | P | Variantes |
| --- | --- | --- |
| Polvo de rueda | P0 | Tierra, arena, nieve |
| Proyección de tierra / barro | P0 | Barro (salpica cámara en Alto+) |
| Humo del escape | P0 | Normal, de color (cosmético) |
| Huellas en el terreno | P0 | Barro, arena, nieve |
| Chispas | P1 | Roce de metal, choque |
| Agua | P1 | Salpicadura, estela, gotas en cámara |
| Lluvia, charcos con ondas | P1 | |
| Nieve cayendo / ventisca | P1 | |
| Tormenta de arena | P1 | |
| Niebla volumétrica ligera | P1 | |
| Fuego y explosión | P1 | Barril, lava |
| Estelas de cosmético | P1 | 10 |
| Confeti / pirotecnia | P1 | Estadio, récord |
| Destellos de truco y aterrizaje perfecto | P0 | |

## 7. Audio

| Categoría | Contenido | P |
| --- | --- | --- |
| Motores | Grabaciones propias por tipo (2T 125, 4T 250, 4T 450, bicilíndrico deportivo, V-twin chopper, eléctrico sintetizado, quad, moto de nieve): rampas de RPM con y sin carga, ralentí, corte de encendido, petardeo | P0 (125) / P1 |
| Transmisión | Cambios de marcha, embrague, cadena | P0 |
| Neumáticos y terreno | Rodadura y derrape en 9 superficies, aterrizajes (3 intensidades × superficie) | P0 (tierra, madera) / P1 |
| Suspensión | Compresión y tope de recorrido | P0 |
| Choques | Plástico, metal, piloto (sin gritos de dolor), piezas que se sueltan | P0 |
| Mundo | Olas, viento, lluvia, trueno, selva, ciudad, maquinaria, lava, público de estadio | P1 |
| Música | 2–3 pistas originales por mundo + menú + garaje + estadio (stems para mezcla adaptativa) | P1 |
| UI | Toques, recompensas, estrellas, compra | P0 |
| Voz | Locutor de estadio (es/en) para Supercross | P2 |

## 8. UI
Logotipo y variantes · icono de la app (1024 px + variantes oscuro/tinted de iOS 18) · iconos de moto, superficie, truco, moneda, gema · marcos de rareza · fondos de menú por mundo · tipografías con licencia · pantallas: inicio, mapa de mundos, selección de nivel, HUD, pausa, resultados, repetición, garaje, tienda, pase de temporada, perfil, clubs, ajustes, accesibilidad.

## 9. Resumen de volumen (v1.0)

| Categoría | Cantidad aproximada |
| --- | --- |
| Motos | 15 (+ 45 pinturas de fábrica) |
| Piezas de equipamiento del piloto | ~110 |
| Animaciones | ~60 |
| Kits de mundo | 7 (6 + estadio) |
| Props únicos | ~220 |
| Efectos de partículas | ~45 |
| Sonidos | ~900 archivos + 8 motores modelados |
| Pistas musicales | ~20 |
| Niveles | 150 + estadio + bloques procedurales (~60) |
| Tamaño estimado | ~180 MB inicial (mundo 1 + garaje) + ~250 MB por mundo descargable |
