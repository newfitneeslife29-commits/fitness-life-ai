# Funcionamiento de una App de Subastas — Guía Detallada

> Documento de referencia que explica, de principio a fin, cómo funciona una aplicación de subastas en línea: conceptos de negocio, actores, flujos, reglas, arquitectura técnica, modelo de datos, tiempo real, pagos, seguridad, aspectos legales y métricas.

---

## Índice

1. [¿Qué es una app de subastas?](#1-qué-es-una-app-de-subastas)
2. [Actores y roles](#2-actores-y-roles)
3. [Tipos de subasta](#3-tipos-de-subasta)
4. [Ciclo de vida de una subasta](#4-ciclo-de-vida-de-una-subasta)
5. [Flujo del vendedor](#5-flujo-del-vendedor)
6. [Flujo del comprador (pujador)](#6-flujo-del-comprador-pujador)
7. [Reglas de puja](#7-reglas-de-puja)
8. [Cierre de la subasta y adjudicación](#8-cierre-de-la-subasta-y-adjudicación)
9. [Pagos, garantías y liquidación](#9-pagos-garantías-y-liquidación)
10. [Envío, entrega y postventa](#10-envío-entrega-y-postventa)
11. [Arquitectura técnica](#11-arquitectura-técnica)
12. [Modelo de datos](#12-modelo-de-datos)
13. [API: endpoints principales](#13-api-endpoints-principales)
14. [Tiempo real y concurrencia](#14-tiempo-real-y-concurrencia)
15. [Notificaciones](#15-notificaciones)
16. [Búsqueda, descubrimiento y recomendaciones](#16-búsqueda-descubrimiento-y-recomendaciones)
17. [Confianza, reputación y moderación](#17-confianza-reputación-y-moderación)
18. [Seguridad y prevención de fraude](#18-seguridad-y-prevención-de-fraude)
19. [Aspectos legales y regulatorios](#19-aspectos-legales-y-regulatorios)
20. [Modelo de negocio y monetización](#20-modelo-de-negocio-y-monetización)
21. [Panel de administración](#21-panel-de-administración)
22. [Métricas y analítica](#22-métricas-y-analítica)
23. [Escalabilidad y rendimiento](#23-escalabilidad-y-rendimiento)
24. [Pruebas y calidad](#24-pruebas-y-calidad)
25. [Hoja de ruta sugerida (MVP → producto completo)](#25-hoja-de-ruta-sugerida-mvp--producto-completo)
26. [Glosario](#26-glosario)

---

## 1. ¿Qué es una app de subastas?

Una app de subastas es un **mercado digital** donde un vendedor publica un artículo (o servicio) y varios compradores compiten ofreciendo precios (**pujas**) durante un tiempo limitado. Al terminar, el artículo se adjudica según las reglas del tipo de subasta — normalmente a la puja más alta — y la plataforma coordina el pago, la entrega y la resolución de incidencias.

Frente a una tienda de precio fijo, la subasta:

- **Descubre el precio real de mercado**: el precio lo fija la demanda, no el vendedor.
- **Genera urgencia y emoción**: cuenta atrás, competencia entre pujadores.
- **Es ideal para artículos únicos o de valor incierto**: coleccionables, arte, vehículos, antigüedades, excedentes de inventario, inmuebles, etc.

Ejemplos conocidos: eBay (subastas por tiempo), Catawiki (objetos curados), Sotheby's/Christie's online (subastas en vivo), Copart (vehículos), plataformas de subastas judiciales.

---

## 2. Actores y roles

| Actor | Qué hace | Necesidades clave |
|---|---|---|
| **Vendedor** | Publica lotes, fija precio de salida/reserva, envía el artículo | Visibilidad, buen precio final, cobro seguro |
| **Comprador / Pujador** | Busca, sigue y puja por lotes; paga y recibe | Confianza, información clara, avisos a tiempo |
| **Plataforma** | Aplica reglas, custodia pagos, cobra comisiones | Liquidez (muchos compradores y vendedores), reputación |
| **Moderador / Experto** | Revisa anuncios, autentica piezas, valora | Herramientas de revisión, historial |
| **Soporte** | Atiende disputas, devoluciones, reclamaciones | Acceso a historial de pujas, mensajes y pagos |
| **Administrador** | Configura comisiones, categorías, reglas, usuarios | Panel, métricas, auditoría |
| **Terceros** | Pasarela de pago, transportista, KYC, email/SMS | Integraciones vía API y webhooks |

Un mismo usuario puede ser comprador y vendedor a la vez; lo habitual es modelarlo como una sola cuenta con **capacidades** (puede vender si ha completado verificación de vendedor).

---

## 3. Tipos de subasta

### 3.1 Subasta inglesa (ascendente) — la más común
- El precio empieza bajo y sube con cada puja.
- Gana la puja más alta al cierre.
- Puede tener **precio de reserva** (mínimo oculto) y **precio de salida** (mínimo visible).

### 3.2 Subasta holandesa (descendente)
- El precio empieza alto y **baja** automáticamente cada X segundos.
- El primero que acepta el precio actual gana.
- Útil para productos perecederos o liquidación rápida (flores, pescado, stock).

### 3.3 Subasta en sobre cerrado (sealed-bid)
- Cada participante envía **una única oferta secreta**.
- **Primer precio**: gana la más alta y paga lo que ofertó.
- **Segundo precio (Vickrey)**: gana la más alta, pero paga el importe de la segunda. Incentiva a pujar el valor real.
- Común en licitaciones públicas y B2B.

### 3.4 Subasta en vivo (live / híbrida)
- Un subastador conduce la sesión en directo (vídeo/streaming); los lotes salen uno tras otro con poco tiempo cada uno.
- Exige latencia muy baja y sincronización entre sala física y online.

### 3.5 Subasta inversa (reverse auction)
- El comprador publica una necesidad y los **vendedores** pujan a la baja.
- Típica en compras corporativas y servicios.

### 3.6 Variantes y añadidos
- **Compra inmediata ("¡Cómpralo ya!")**: precio fijo que, si se paga, termina la subasta.
- **Penny auction**: cada puja cuesta dinero y sube el precio unos céntimos. Polémica; en muchos países se considera juego de azar. **No recomendada.**
- **Subasta por lotes múltiples (multi-unidad)**: varias unidades idénticas; ganan las N pujas más altas.
- **Subasta benéfica**: recaudación para causas; a menudo con donaciones adicionales.

> **Recomendación para un MVP:** subasta inglesa por tiempo, con precio de salida, precio de reserva opcional, puja automática (proxy) y extensión anti-sniping.

---

## 4. Ciclo de vida de una subasta

```
 BORRADOR ──► EN_REVISIÓN ──► PROGRAMADA ──► ACTIVA ──► FINALIZADA ──► PAGADA ──► ENVIADA ──► COMPLETADA
     │             │                            │            │            │                      ▲
     │             └─► RECHAZADA                │            ├─► SIN_PUJAS / RESERVA_NO_ALCANZADA
     │                                          │            │            └─► IMPAGADA ─► (2ª oportunidad / relistado)
     └─► CANCELADA ◄────────────────────────────┘            └─► EN_DISPUTA ─► REEMBOLSADA / COMPLETADA
```

| Estado | Descripción | Quién lo dispara |
|---|---|---|
| `BORRADOR` | El vendedor está creando el anuncio | Vendedor |
| `EN_REVISIÓN` | Moderación automática/manual | Sistema / Moderador |
| `RECHAZADA` | No cumple políticas; se notifica el motivo | Moderador |
| `PROGRAMADA` | Aprobada; espera su fecha de inicio | Sistema |
| `ACTIVA` | Acepta pujas | Scheduler (al llegar `start_at`) |
| `FINALIZADA` | Llegó `end_at`; se calcula ganador | Scheduler |
| `SIN_PUJAS` / `RESERVA_NO_ALCANZADA` | No hay adjudicación | Sistema |
| `PAGADA` | El ganador abonó el importe | Pasarela de pago (webhook) |
| `IMPAGADA` | Venció el plazo de pago | Scheduler |
| `ENVIADA` | El vendedor registró el envío | Vendedor / Transportista |
| `COMPLETADA` | Entrega confirmada; se libera el dinero al vendedor | Comprador / Sistema |
| `EN_DISPUTA` | Hay una reclamación abierta | Comprador / Vendedor |
| `CANCELADA` | Retirada antes de terminar (reglas estrictas si ya hay pujas) | Vendedor / Admin |

Las transiciones deben implementarse como una **máquina de estados** explícita en el backend: cualquier transición no permitida se rechaza y cada cambio queda registrado en un log de auditoría.

---

## 5. Flujo del vendedor

1. **Registro y verificación**
   - Email/teléfono verificados.
   - KYC (identidad) para vendedores, especialmente profesionales o importes altos.
   - Alta en la pasarela de pagos como "cuenta conectada" (p. ej. Stripe Connect) para recibir fondos.
2. **Creación del lote**
   - Título, descripción, categoría, estado (nuevo, usado, restaurado…).
   - Fotos (mínimo recomendado 3–5) y, opcionalmente, vídeo.
   - Atributos por categoría (marca, talla, año, kilometraje, dimensiones…).
   - Ubicación y opciones de envío/recogida con costes.
3. **Configuración de la subasta**
   - Precio de salida.
   - Precio de reserva (opcional, oculto).
   - Precio de compra inmediata (opcional).
   - Duración (p. ej. 1, 3, 5, 7, 10 días) o fecha/hora de inicio y fin.
   - Política de devoluciones.
4. **Revisión y publicación**
   - Validaciones automáticas (campos, imágenes, palabras prohibidas, artículos vetados).
   - Revisión humana para categorías sensibles o de alto valor.
5. **Seguimiento**
   - Panel con nº de visitas, seguidores, pujas, precio actual.
   - Responder preguntas públicas de los interesados.
6. **Tras el cierre**
   - Notificación del resultado.
   - Esperar el pago (la plataforma lo custodia).
   - Enviar el artículo y subir número de seguimiento.
   - Cobrar (pago liberado tras la entrega o tras X días).
   - Valorar al comprador.

---

## 6. Flujo del comprador (pujador)

1. **Descubrimiento**: búsqueda, filtros, categorías, recomendaciones, "terminan pronto".
2. **Ficha del lote**: fotos, descripción, precio actual, nº de pujas, tiempo restante, reputación del vendedor, costes de envío, preguntas y respuestas.
3. **Seguir el lote** (watchlist) para recibir avisos.
4. **Pujar**
   - Requisitos previos: cuenta verificada y método de pago registrado (a veces una **preautorización** o depósito).
   - Puja manual (importe concreto) o **puja máxima automática** (proxy bidding).
   - Confirmación explícita: "Vas a pujar 120 €. Si ganas, te comprometes a pagar 120 € + 9 € de envío + 6 € de comisión".
5. **Durante la subasta**: avisos de "te han superado", actualización del precio en tiempo real.
6. **Ganar**: notificación inmediata con instrucciones y plazo de pago (p. ej. 48 h).
7. **Pagar**: tarjeta, transferencia, wallet, etc.
8. **Recibir**: seguimiento del envío; confirmar recepción o abrir incidencia.
9. **Valorar** al vendedor.

---

## 7. Reglas de puja

### 7.1 Validación de una puja
Una puja es válida solo si **todas** estas condiciones se cumplen:

- La subasta está en estado `ACTIVA` y `now < end_at`.
- El pujador **no es el vendedor** (ni una cuenta vinculada).
- El usuario no está bloqueado y tiene método de pago válido.
- El importe es `>= precio_actual + incremento_mínimo` (o `>= precio_salida` si es la primera).
- El importe no supera límites de seguridad (p. ej. tope por usuario nuevo).
- La puja no viene de una petición duplicada (clave de idempotencia).

### 7.2 Tabla de incrementos mínimos (ejemplo)

| Precio actual | Incremento mínimo |
|---|---|
| 0,01 € – 0,99 € | 0,05 € |
| 1,00 € – 4,99 € | 0,25 € |
| 5,00 € – 24,99 € | 0,50 € |
| 25,00 € – 99,99 € | 1,00 € |
| 100,00 € – 249,99 € | 2,50 € |
| 250,00 € – 499,99 € | 5,00 € |
| 500,00 € – 999,99 € | 10,00 € |
| 1.000,00 € – 2.499,99 € | 25,00 € |
| 2.500,00 € – 4.999,99 € | 50,00 € |
| ≥ 5.000,00 € | 100,00 € |

### 7.3 Puja automática (proxy bidding)
El usuario indica su **máximo** (oculto). El sistema puja por él lo justo para mantenerlo en cabeza.

**Algoritmo (subasta inglesa con proxy):**

```text
al recibir puja_máxima M del usuario U:
    líder   = usuario con mayor máximo actual (L, con máximo ML)
    actual  = precio visible actual

    si no hay líder:
        precio_visible = precio_salida
        líder = U
    si U == líder:
        actualizar ML = max(ML, M)            # solo sube su techo, el precio no cambia
    si M > ML:
        precio_visible = min(M, ML + incremento(ML))
        líder = U
    si M <= ML:
        precio_visible = min(ML, M + incremento(M))
        líder sigue siendo L                  # U es superado al instante
    empate (M == ML): gana quien pujó ANTES
```

**Ejemplo:**
- Precio de salida 50 €. Ana pone máximo 100 € → precio visible 50 €, líder Ana.
- Luis puja 70 € → el sistema puja 71,00 € por Ana (70 + 1,00 de incremento). Líder Ana.
- Luis pone máximo 120 € → precio = 100 + 2,50 = 102,50 €. Líder Luis. Ana recibe "te han superado".

### 7.4 Precio de reserva
- Si al cierre la puja más alta no alcanza la reserva → `RESERVA_NO_ALCANZADA`.
- Se muestra "Reserva no alcanzada / alcanzada" pero nunca el importe.
- Con proxy: si un máximo supera la reserva, el precio visible salta **directamente** a la reserva.

### 7.5 Anti-sniping (extensión automática)
El *sniping* es pujar en los últimos segundos para que nadie pueda reaccionar.
- Regla típica: **si entra una puja en los últimos 2 minutos, el cierre se amplía 2 minutos** (soft close).
- Se puede limitar el nº de extensiones o no (las casas de subastas suelen no limitarlo).
- La nueva `end_at` debe propagarse en tiempo real a todos los clientes.

### 7.6 Retirada de pujas
Por norma, **una puja es un compromiso vinculante**. Solo se permite retirarla en casos tasados (error tipográfico evidente, cambio sustancial en la descripción), con límites y registro para detectar abusos.

### 7.7 Compra inmediata
- Disponible mientras no haya pujas (o mientras el precio actual sea < X % del precio de compra inmediata, según la política).
- Al usarla, la subasta pasa a `FINALIZADA` con ese comprador como ganador.

---

## 8. Cierre de la subasta y adjudicación

1. Un **scheduler** (cola con tareas diferidas o job cada pocos segundos) detecta subastas con `end_at <= now` y estado `ACTIVA`.
2. Se toma un **bloqueo** sobre la subasta para evitar que entren pujas concurrentes durante el cierre.
3. Se recalcula definitivamente el ganador a partir del histórico de pujas (no confiar solo en el caché).
4. Se comprueba la reserva.
5. Se cambia el estado (`FINALIZADA` / `SIN_PUJAS` / `RESERVA_NO_ALCANZADA`).
6. Se crea un **pedido** (`Order`) con el importe final, envío, comisión e impuestos.
7. Se emiten eventos: `auction.closed`, `order.created` → notificaciones a ganador, vendedor y resto de pujadores.
8. Se abre el **plazo de pago**.

**Si el ganador no paga:**
- Recordatorios automáticos (24 h, 6 h antes del vencimiento).
- Al vencer: estado `IMPAGADA`, penalización en la reputación del comprador ("strike") y posible bloqueo.
- El vendedor puede ofrecer el artículo al **segundo mejor pujador** (*second chance offer*) a su última puja, o volver a publicarlo.

> **Importante:** el cierre debe ser **idempotente** — si el job se ejecuta dos veces, el resultado ha de ser el mismo y no deben crearse dos pedidos.

---

## 9. Pagos, garantías y liquidación

### 9.1 Modelo recomendado: plataforma como intermediaria (escrow)
```
Comprador ──paga──► Plataforma (custodia) ──libera tras entrega──► Vendedor
                         │
                         └── retiene comisión
```
Ventajas: protege a ambas partes, permite reembolsos y reduce fraude. Se implementa con pasarelas tipo **Stripe Connect, Adyen for Platforms, Mangopay, PayPal Commerce Platform** o Mercado Pago (Latam), que gestionan la custodia y el cumplimiento normativo (no se recomienda custodiar fondos uno mismo sin licencia de entidad de pago).

### 9.2 Momentos de cobro
- **Preautorización al pujar** (opcional): se retiene un importe en la tarjeta para garantizar solvencia; se libera si no gana.
- **Depósito de garantía**: en subastas de alto valor (vehículos, inmuebles) se exige un depósito previo para poder pujar.
- **Cobro al ganar**: el más habitual.

### 9.3 Desglose del pedido (ejemplo)
| Concepto | Importe |
|---|---|
| Precio de remate | 200,00 € |
| Comisión del comprador (*buyer's premium*, 5 %) | 10,00 € |
| Envío | 8,50 € |
| IVA sobre comisión (21 %) | 2,10 € |
| **Total comprador** | **220,60 €** |
| Comisión del vendedor (8 % del remate) | −16,00 € |
| **Neto vendedor** | **184,00 € + envío** |

### 9.4 Reglas técnicas imprescindibles
- **Guardar dinero como enteros** (céntimos) o tipo decimal exacto, **nunca float**.
- Moneda explícita en cada importe (`amount`, `currency`).
- **Idempotencia** en cada llamada a la pasarela.
- Procesar **webhooks** de la pasarela (pago confirmado, fallido, contracargo) como fuente de verdad.
- **Libro mayor** (ledger) de doble entrada para conciliar: cada movimiento de dinero genera asientos que cuadran.
- Pagos 3-D Secure / SCA (obligatorio en la UE por PSD2).

### 9.5 Liquidación al vendedor (payout)
- Se libera tras confirmación de entrega o X días tras la entrega según el transportista.
- Calendario de pagos (diario/semanal), umbral mínimo y retención para vendedores nuevos.

---

## 10. Envío, entrega y postventa

- **Opciones**: envío por el vendedor, envío gestionado por la plataforma (etiquetas prepagadas), recogida en mano, punto de recogida.
- **Integración con transportistas** para calcular tarifas, generar etiquetas y seguir el paquete (tracking por webhooks).
- **Plazo máximo de envío** (p. ej. 3 días hábiles tras el pago), con avisos.
- **Confirmación de recepción**: manual por el comprador o automática al marcar "entregado" + X días sin reclamar.
- **Devoluciones y disputas**:
  1. El comprador abre incidencia (no recibido, no coincide con la descripción, dañado).
  2. Conversación con el vendedor en un plazo.
  3. Si no hay acuerdo, media la plataforma con evidencias (fotos, tracking, mensajes).
  4. Resolución: reembolso total/parcial, devolución del artículo, o fallo a favor del vendedor.
- **Valoraciones mutuas** tras la transacción.

---

## 11. Arquitectura técnica

### 11.1 Visión general

```
                ┌───────────────┐      ┌──────────────┐
  App móvil ───►│               │      │   CDN /      │◄── imágenes
  Web (SPA) ───►│  API Gateway  │      │  Object      │
                │  + Auth       │      │  Storage     │
                └──────┬────────┘      └──────────────┘
                       │
   ┌───────────┬───────┼────────────┬──────────────┬────────────────┐
   ▼           ▼       ▼            ▼              ▼                ▼
 Usuarios   Catálogo  Subastas/   Pagos &       Notificaciones   Búsqueda
 & KYC      (lotes)   Pujas       Pedidos       (push/email/sms) (Elastic/
                      (núcleo)                                    Meilisearch)
   │           │       │            │              ▲                ▲
   └───────────┴───────┴─────┬──────┴──────────────┴────────────────┘
                             ▼
                 Bus de eventos (Kafka / RabbitMQ / Redis Streams)
                             │
          ┌──────────────────┼──────────────────────┐
          ▼                  ▼                      ▼
     PostgreSQL          Redis (caché,          Servidor de tiempo real
     (fuente de verdad)  locks, pub/sub)        (WebSocket / SSE)
```

### 11.2 Componentes
| Componente | Responsabilidad | Tecnologías posibles |
|---|---|---|
| **Clientes** | UI web y móvil | React/Next.js, React Native, Flutter, Swift/Kotlin |
| **API Gateway** | Enrutado, rate limiting, autenticación | Nginx, Kong, AWS API Gateway |
| **Servicio de usuarios** | Registro, login, perfiles, KYC | OAuth2/OIDC, JWT, Auth0/Cognito/Supabase Auth |
| **Catálogo** | Lotes, categorías, imágenes | Node/NestJS, Go, Python/Django, Java/Spring |
| **Motor de subastas** | Pujas, proxy, cierre, anti-sniping | Servicio dedicado, el más crítico |
| **Pagos y pedidos** | Cobro, escrow, payouts, ledger | Stripe Connect / Adyen / Mangopay |
| **Tiempo real** | Difundir pujas y cambios de estado | WebSockets (Socket.IO, ws), SSE, Pusher/Ably, Firebase |
| **Scheduler** | Abrir/cerrar subastas, recordatorios | BullMQ, Sidekiq, Celery, Temporal, cron + cola |
| **Notificaciones** | Push, email, SMS, in-app | FCM/APNs, SendGrid/SES, Twilio |
| **Búsqueda** | Texto completo, filtros, facetas | Elasticsearch/OpenSearch, Meilisearch, Algolia |
| **Almacenamiento** | Imágenes y vídeos | S3/GCS + CDN, redimensionado automático |
| **Observabilidad** | Logs, métricas, trazas, alertas | OpenTelemetry, Grafana, Datadog, Sentry |

### 11.3 ¿Monolito o microservicios?
Para empezar, un **monolito modular** bien separado por dominios (usuarios, catálogo, subastas, pagos, notificaciones) es más rápido y barato. Se extraen servicios (normalmente primero el motor de pujas y el de tiempo real) cuando el volumen lo justifique.

---

## 12. Modelo de datos

### 12.1 Entidades principales

```
User 1───* Auction *───1 Category
 │            │
 │            ├──* AuctionImage
 │            ├──* Bid ──────────────* (User)
 │            ├──* MaxBid (proxy)
 │            ├──* Question/Answer
 │            ├──* WatchlistItem
 │            └──0..1 Order ──* Payment
 │                          ──0..1 Shipment
 │                          ──0..1 Dispute
 ├──* Review (como comprador y como vendedor)
 ├──* PaymentMethod
 └──* Notification
```

### 12.2 Esquema SQL orientativo (PostgreSQL)

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  password_hash   TEXT,
  kyc_status      TEXT NOT NULL DEFAULT 'none',  -- none|pending|verified|rejected
  can_sell        BOOLEAN NOT NULL DEFAULT false,
  rating_avg      NUMERIC(3,2),
  unpaid_strikes  INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active', -- active|suspended|banned
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auctions (
  id                  UUID PRIMARY KEY,
  seller_id           UUID NOT NULL REFERENCES users(id),
  category_id         UUID NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  condition           TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'english',  -- english|dutch|sealed|reverse
  currency            CHAR(3) NOT NULL DEFAULT 'EUR',
  starting_price      BIGINT NOT NULL,          -- en céntimos
  reserve_price       BIGINT,                   -- oculto
  buy_now_price       BIGINT,
  current_price       BIGINT NOT NULL,
  current_winner_id   UUID REFERENCES users(id),
  bid_count           INT NOT NULL DEFAULT 0,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  original_end_at     TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL,            -- ver máquina de estados
  version             INT NOT NULL DEFAULT 0,   -- bloqueo optimista
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON auctions (status, end_at);

CREATE TABLE bids (
  id               UUID PRIMARY KEY,
  auction_id       UUID NOT NULL REFERENCES auctions(id),
  bidder_id        UUID NOT NULL REFERENCES users(id),
  amount           BIGINT NOT NULL,             -- importe visible de esta puja
  is_proxy         BOOLEAN NOT NULL DEFAULT false,
  idempotency_key  TEXT NOT NULL,
  ip_address       INET,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (bidder_id, idempotency_key)
);
CREATE INDEX ON bids (auction_id, amount DESC, created_at ASC);

CREATE TABLE max_bids (
  auction_id  UUID NOT NULL REFERENCES auctions(id),
  bidder_id   UUID NOT NULL REFERENCES users(id),
  max_amount  BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (auction_id, bidder_id)
);

CREATE TABLE orders (
  id               UUID PRIMARY KEY,
  auction_id       UUID UNIQUE NOT NULL REFERENCES auctions(id), -- 1 pedido por subasta
  buyer_id         UUID NOT NULL REFERENCES users(id),
  seller_id        UUID NOT NULL REFERENCES users(id),
  hammer_price     BIGINT NOT NULL,
  buyer_fee        BIGINT NOT NULL,
  seller_fee       BIGINT NOT NULL,
  shipping_cost    BIGINT NOT NULL,
  tax              BIGINT NOT NULL,
  total            BIGINT NOT NULL,
  currency         CHAR(3) NOT NULL,
  status           TEXT NOT NULL,   -- awaiting_payment|paid|shipped|delivered|completed|unpaid|disputed|refunded
  payment_due_at   TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id          UUID PRIMARY KEY,
  order_id    UUID REFERENCES orders(id),
  account     TEXT NOT NULL,    -- buyer|escrow|seller|platform_revenue|tax
  amount      BIGINT NOT NULL,  -- +debe / -haber; la suma por transacción = 0
  currency    CHAR(3) NOT NULL,
  tx_id       UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Otras tablas: `categories`, `auction_images`, `watchlist`, `questions`, `reviews`, `shipments`, `disputes`, `notifications`, `audit_log`, `payment_methods`.

---

## 13. API: endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register`, `/auth/login`, `/auth/refresh` | Autenticación |
| `GET` | `/auctions?q=&category=&status=&sort=ending_soon` | Listado y búsqueda |
| `GET` | `/auctions/{id}` | Detalle del lote (sin reserva) |
| `POST` | `/auctions` | Crear borrador (vendedor) |
| `PATCH` | `/auctions/{id}` | Editar (solo en borrador o sin pujas) |
| `POST` | `/auctions/{id}/submit` | Enviar a revisión |
| `POST` | `/auctions/{id}/bids` | Pujar (`amount`, `max_amount`, `Idempotency-Key`) |
| `GET` | `/auctions/{id}/bids` | Historial de pujas (pujadores anonimizados) |
| `POST` | `/auctions/{id}/buy-now` | Compra inmediata |
| `POST` / `DELETE` | `/auctions/{id}/watch` | Seguir / dejar de seguir |
| `POST` | `/auctions/{id}/questions` | Preguntar al vendedor |
| `GET` | `/me/bids`, `/me/won`, `/me/selling` | Paneles del usuario |
| `POST` | `/orders/{id}/pay` | Iniciar pago |
| `POST` | `/orders/{id}/shipment` | Registrar envío |
| `POST` | `/orders/{id}/confirm-delivery` | Confirmar recepción |
| `POST` | `/orders/{id}/disputes` | Abrir disputa |
| `POST` | `/webhooks/payments`, `/webhooks/shipping` | Eventos de terceros (firma verificada) |
| `WS` | `/realtime` | Suscripción a canales `auction:{id}`, `user:{id}` |

**Ejemplo — pujar:**

```http
POST /auctions/8b1c.../bids
Authorization: Bearer <token>
Idempotency-Key: 5f0e2a9c-...
Content-Type: application/json

{ "max_amount": 12000 }
```

```json
201 Created
{
  "auction_id": "8b1c...",
  "current_price": 7250,
  "currency": "EUR",
  "you_are_winning": true,
  "your_max": 12000,
  "end_at": "2026-10-10T19:02:00Z",
  "bid_count": 14,
  "reserve_met": true
}
```

**Errores típicos:** `409 BID_TOO_LOW` (con `min_next_bid`), `409 AUCTION_ENDED`, `403 SELLER_CANNOT_BID`, `402 PAYMENT_METHOD_REQUIRED`, `429 RATE_LIMITED`.

---

## 14. Tiempo real y concurrencia

### 14.1 El problema
En los últimos segundos pueden llegar decenas o cientos de pujas casi simultáneas. Sin control, dos pujas podrían leer el mismo precio actual y ambas "ganar", corrompiendo el estado.

### 14.2 Estrategias de consistencia
1. **Bloqueo pesimista en BD** — dentro de una transacción:
   ```sql
   BEGIN;
   SELECT * FROM auctions WHERE id = $1 FOR UPDATE;   -- serializa pujas de ESA subasta
   -- validar estado, end_at, importe mínimo
   -- aplicar algoritmo proxy, insertar bids, actualizar current_price/winner/end_at
   COMMIT;
   ```
   Sencillo y correcto; suficiente para la gran mayoría de plataformas.
2. **Bloqueo optimista** — `UPDATE auctions SET ..., version = version + 1 WHERE id = $1 AND version = $2`; si afecta 0 filas, se reintenta.
3. **Actor/cola por subasta** — todas las pujas de una subasta se envían a una partición (Kafka por `auction_id`, o un actor en memoria) que las procesa **en orden, una a una**. Escala a volúmenes muy altos.
4. **Redis + script Lua atómico** — para latencia mínima en subastas en vivo, persistiendo después en BD.

### 14.3 La hora del servidor manda
- El cierre se decide **siempre con el reloj del servidor**, nunca con el del cliente.
- El cliente muestra la cuenta atrás calculando el desfase (`server_time - client_time`) que el servidor envía en cada respuesta/mensaje.
- La puja se considera dentro de plazo según el instante en que **la transacción la acepta**.

### 14.4 Difusión en tiempo real
Tras confirmar una puja (después del `COMMIT`), se publica un evento:

```json
{
  "type": "bid.placed",
  "auction_id": "8b1c...",
  "current_price": 7250,
  "bid_count": 14,
  "leader_alias": "c***3",
  "end_at": "2026-10-10T19:02:00Z",
  "server_time": "2026-10-10T19:00:12.381Z",
  "seq": 1043
}
```

- Canal público `auction:{id}`: precio, nº pujas, fin.
- Canal privado `user:{id}`: "te han superado", "has ganado".
- Los servidores WebSocket se escalan horizontalmente usando **Redis Pub/Sub** u otro broker para repartir los mensajes.
- `seq` (número de secuencia) permite al cliente descartar mensajes desordenados y detectar huecos (entonces vuelve a pedir el estado completo por REST).
- **Fallback**: si el WebSocket cae, el cliente hace *polling* cada pocos segundos.

---

## 15. Notificaciones

| Evento | Destinatario | Canal |
|---|---|---|
| Subasta seguida empieza / termina en 1 h / 10 min | Seguidores | Push, email |
| Te han superado | Pujador anterior | Push (inmediato), in-app |
| Has ganado | Ganador | Push, email |
| Subasta terminada (con/sin venta) | Vendedor | Push, email |
| Recordatorio de pago | Ganador | Email, push |
| Pago recibido | Vendedor | Push, email |
| Artículo enviado / entregado | Comprador | Push, email |
| Nueva pregunta | Vendedor | Push, in-app |
| Disputa abierta / resuelta | Ambos | Email, in-app |

Buenas prácticas: preferencias por usuario y canal, agrupación ("te han superado en 3 subastas"), horarios silenciosos, plantillas multilingües y cumplimiento de la normativa de comunicaciones comerciales (consentimiento, baja fácil).

---

## 16. Búsqueda, descubrimiento y recomendaciones

- **Índice de búsqueda** alimentado por eventos (`auction.published`, `bid.placed`, `auction.closed`) para mantener precio y estado actualizados.
- Filtros: categoría, rango de precio, estado, ubicación/envío, "sin pujas", "con compra inmediata", "termina hoy".
- Ordenaciones: termina antes, recién publicadas, precio, más pujas, relevancia.
- Búsquedas guardadas con alertas.
- Recomendaciones: "similares", "otros usuarios también siguieron", basadas en historial de navegación/pujas.
- Secciones editoriales: destacados, colecciones curadas, subastas temáticas.

---

## 17. Confianza, reputación y moderación

- **Perfil público**: antigüedad, nº de ventas/compras, valoración media, % de valoraciones positivas, verificaciones (identidad, teléfono).
- **Valoraciones** solo de transacciones reales, en ventana de tiempo limitada.
- **Insignias**: vendedor top, envío rápido, experto verificado.
- **Moderación de anuncios**: listas de artículos prohibidos (armas, fármacos, falsificaciones, especies protegidas…), filtros automáticos de texto e imagen, revisión humana de casos dudosos.
- **Autenticación de piezas** para categorías de alto valor (relojes, bolsos de lujo, arte), con certificados.
- **Mensajería interna** moderada (evitar que se saque la transacción fuera de la plataforma).
- **Sistema de denuncias** de anuncios y usuarios.

---

## 18. Seguridad y prevención de fraude

### 18.1 Fraudes típicos y contramedidas

| Fraude | Descripción | Contramedidas |
|---|---|---|
| **Shill bidding** | El vendedor (o cómplices) puja por su propio artículo para inflar el precio | Detección de cuentas vinculadas (dispositivo, IP, pago, dirección), análisis de patrones (siempre pierde, solo puja a ese vendedor), sanciones |
| **Impago** | El ganador no paga | Método de pago obligatorio, preautorización, strikes, bloqueo |
| **Artículo inexistente / no conforme** | El vendedor cobra y no envía o envía otra cosa | Escrow, tracking obligatorio, protección al comprador |
| **Cuentas robadas** | Uso de cuentas ajenas | 2FA, detección de inicio de sesión anómalo, verificación en pujas altas |
| **Tarjetas robadas / contracargos** | Pagos fraudulentos | 3-D Secure, scoring antifraude de la pasarela (Stripe Radar, etc.) |
| **Bots** | Automatización de pujas o scraping | Rate limiting, CAPTCHA adaptativo, detección de comportamiento |
| **Bid shielding** | Puja alta de cómplice que se retira al final | Restringir retirada de pujas, sanciones |
| **Pago fuera de la plataforma** | Evitar comisiones / estafas | Filtrar datos de contacto en mensajes, sin protección fuera |

### 18.2 Seguridad técnica
- HTTPS en todo; HSTS.
- Contraseñas con Argon2/bcrypt; 2FA opcional (obligatoria para vendedores profesionales).
- Tokens de corta duración + refresh tokens rotatorios.
- Autorización por recurso (un usuario solo ve sus pedidos, un vendedor no puede pujar en lo suyo).
- Validación de entrada en servidor; protección OWASP Top 10 (inyección SQL, XSS, CSRF, IDOR).
- Verificación de firma en todos los webhooks.
- Nunca exponer el precio de reserva ni los máximos de proxy en ninguna respuesta.
- **Log de auditoría inmutable** de pujas, cambios de estado y acciones de administración.
- Datos de tarjeta solo en la pasarela (cumplimiento PCI DSS delegado).
- Copias de seguridad cifradas y plan de recuperación ante desastres.

---

## 19. Aspectos legales y regulatorios

> Esta sección es orientativa y no constituye asesoramiento jurídico. Conviene validar con un abogado del país de operación.

- **Términos y condiciones** claros: carácter vinculante de las pujas, comisiones, plazos de pago, política de cancelación, resolución de disputas.
- **Protección de datos** (RGPD en la UE, LOPDGDD en España, leyes equivalentes en Latam): base legal, consentimiento, derechos ARCO/ARSULIPO, encargados de tratamiento, retención de datos.
- **Consumidores**: el derecho de desistimiento de 14 días en la UE tiene excepciones para subastas públicas, pero **puede aplicarse a vendedores profesionales en subastas online**; analizar caso por caso.
- **Vendedores profesionales vs. particulares**: obligaciones distintas (facturación, garantías legales, información precontractual). La DAC7 (UE) obliga a las plataformas a **reportar a Hacienda** los ingresos de vendedores que superen ciertos umbrales.
- **Ley de Servicios Digitales (DSA)** en la UE: trazabilidad de comerciantes (KYBC), mecanismos de notificación de contenido ilegal, transparencia.
- **Prevención de blanqueo de capitales (AML)**: KYC en importes altos y categorías de riesgo (arte, joyas, vehículos).
- **Pagos**: operar a través de una entidad de pago autorizada (la pasarela) para no necesitar licencia propia.
- **Fiscalidad**: IVA sobre comisiones, régimen especial de bienes usados/arte/antigüedades (REBU) en su caso.
- **Artículos restringidos**: armas, alcohol, tabaco, medicamentos, bienes culturales protegidos, especies CITES, etc.
- **Penny auctions** y mecánicas con pago por puja pueden considerarse **juego** y requerir licencia.
- **Accesibilidad** (Ley Europea de Accesibilidad desde 2025 para servicios de comercio electrónico).

---

## 20. Modelo de negocio y monetización

| Fuente | Descripción | Rango típico |
|---|---|---|
| Comisión al vendedor | % del precio final | 5 % – 15 % |
| Comisión al comprador (*buyer's premium*) | % sobre el remate | 3 % – 25 % (casas de lujo más) |
| Tarifa de publicación | Fijo por anuncio | 0 € – unos pocos € |
| Extras de visibilidad | Destacar, portada, subtítulo, más fotos | Fijo por extra |
| Suscripción profesional | Tiendas con más anuncios y herramientas | Mensual |
| Servicios | Envío gestionado, autenticación, fotografía, valoración | Por servicio |
| Publicidad | Banners o anuncios patrocinados | CPM/CPC |

**Problema del huevo y la gallina:** un marketplace necesita a la vez compradores y vendedores. Estrategias: empezar en un **nicho** (p. ej. relojes, sneakers, maquinaria agrícola), comisiones cero para los primeros vendedores, subastas curadas y semanales para concentrar la demanda.

---

## 21. Panel de administración

- **Usuarios**: buscar, verificar KYC, suspender, ver historial y cuentas vinculadas.
- **Subastas**: cola de moderación, aprobar/rechazar, cancelar, ampliar plazo, destacar.
- **Pujas**: historial completo con IP/dispositivo; anular pujas fraudulentas (con registro).
- **Pedidos y pagos**: estado, reembolsos, conciliación con la pasarela, payouts.
- **Disputas**: bandeja de casos, evidencias, resolución.
- **Configuración**: categorías y atributos, tabla de incrementos, comisiones, duración de anti-sniping, plazos de pago, listas de artículos prohibidos.
- **Contenido**: banners, colecciones destacadas, textos legales.
- **Roles y permisos** del equipo interno (soporte, moderador, finanzas, admin), con auditoría.

---

## 22. Métricas y analítica

**Negocio**
- **GMV** (valor bruto de mercancía vendida) y **ingresos netos** (take rate = ingresos / GMV).
- Tasa de venta (*sell-through rate*): subastas con venta / subastas finalizadas.
- Precio final medio vs. precio de salida.
- Nº medio de pujas y pujadores únicos por subasta.
- Tasa de impago y de disputas.
- Tiempo hasta pago y hasta entrega.

**Usuarios**
- Usuarios activos (DAU/MAU), conversión visita → registro → primera puja → primera compra.
- Retención de compradores y vendedores por cohortes.
- NPS / satisfacción.

**Técnicas**
- Latencia p95/p99 de `POST /bids` (objetivo < 200 ms).
- Retardo de difusión en tiempo real (objetivo < 500 ms).
- Errores de cierre de subastas (objetivo 0), conexiones WebSocket activas, disponibilidad (99,9 %+).

---

## 23. Escalabilidad y rendimiento

- **Lecturas >> escrituras**: cachear detalle y listados (Redis/CDN) con invalidación por eventos; réplicas de lectura en BD.
- **Pico de cierre**: muchas subastas terminan a la misma hora (p. ej. 20:00 del domingo). Escalonar cierres (cada lote 30–60 s después del anterior en una misma venta) y escalar horizontalmente el motor de pujas.
- **Particionado por `auction_id`** del procesamiento de pujas para paralelizar sin conflictos.
- **WebSockets**: escalar servidores, balanceo con *sticky sessions* o broker compartido; limitar mensajes por segundo agregando actualizaciones.
- **Imágenes**: subida directa a almacenamiento con URL firmada, redimensionado asíncrono, formatos modernos (WebP/AVIF) y CDN.
- **Patrón outbox**: guardar el evento en la misma transacción que la puja y publicarlo después, para no perder eventos ni publicar pujas no confirmadas.
- **Pruebas de carga** de los últimos minutos de una subasta popular antes de cada gran evento.

---

## 24. Pruebas y calidad

- **Unitarias**: algoritmo proxy, tabla de incrementos, cálculo de comisiones/impuestos, máquina de estados.
- **Propiedades / fuzzing**: generar secuencias aleatorias de pujas y verificar invariantes:
  - el precio visible nunca baja;
  - el líder siempre tiene el máximo más alto (o el más antiguo en empate);
  - el precio visible nunca supera el máximo del líder;
  - nunca se acepta una puja con `now > end_at`.
- **Concurrencia**: lanzar cientos de pujas simultáneas sobre una subasta y comprobar consistencia.
- **Integración**: pasarela de pagos en modo sandbox, webhooks simulados.
- **End-to-end**: flujo completo publicar → pujar → ganar → pagar → enviar → valorar.
- **Reloj simulado** en tests para probar cierres y anti-sniping sin esperas reales.
- **Carga**: k6, Gatling o Locust.

---

## 25. Hoja de ruta sugerida (MVP → producto completo)

**Fase 1 – MVP (8–12 semanas, equipo pequeño)**
- Registro/login, perfiles básicos.
- Publicación de lotes con fotos y moderación manual.
- Subasta inglesa con precio de salida, puja automática y anti-sniping.
- Tiempo real básico (WebSocket) y notificaciones por email/push.
- Pago del ganador vía pasarela con escrow; envío gestionado por el vendedor con tracking manual.
- Valoraciones y panel de administración mínimo.

**Fase 2 – Confianza y crecimiento**
- Precio de reserva y compra inmediata.
- Watchlist, búsquedas guardadas, recomendaciones.
- KYC de vendedores, disputas formalizadas, integración con transportistas.
- Detección de shill bidding y antifraude.

**Fase 3 – Escala y diferenciación**
- Subastas en vivo con streaming.
- Otros formatos (holandesa, sobre cerrado, inversa).
- Autenticación de piezas, servicios premium, programa de vendedores profesionales.
- Internacionalización (multi-moneda, idiomas, impuestos por país).
- Analítica avanzada y precios sugeridos con IA.

---

## 26. Glosario

| Término | Definición |
|---|---|
| **Lote** | Artículo o conjunto de artículos que se subasta como unidad |
| **Puja** | Oferta de un comprador por un lote |
| **Precio de salida** | Importe mínimo visible para la primera puja |
| **Precio de reserva** | Mínimo oculto por debajo del cual el vendedor no está obligado a vender |
| **Remate / precio de martillo** | Precio final por el que se adjudica el lote |
| **Incremento** | Diferencia mínima entre una puja y la siguiente |
| **Puja automática / proxy** | El sistema puja por el usuario hasta su máximo |
| **Sniping** | Pujar en el último segundo |
| **Soft close / anti-sniping** | Ampliación del cierre al recibir pujas finales |
| **Buyer's premium** | Comisión que paga el comprador sobre el remate |
| **Escrow** | Custodia del pago por un tercero hasta completar la entrega |
| **Shill bidding** | Puja fraudulenta del vendedor o cómplices para inflar el precio |
| **Second chance offer** | Oferta al segundo mejor pujador si el ganador no paga |
| **GMV** | Valor bruto de las ventas realizadas en la plataforma |
| **Take rate** | Porcentaje del GMV que se queda la plataforma |
| **KYC** | *Know Your Customer*: verificación de identidad |
| **Idempotencia** | Propiedad de una operación que produce el mismo resultado aunque se repita |
