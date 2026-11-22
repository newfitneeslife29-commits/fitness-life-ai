# VANTORA STORE — tema de Shopify

Tema de Shopify (Online Store 2.0) hecho a medida para una tienda multimarca de dropshipping.
**La tienda está en inglés**; el editor del tema (lo que ves tú en Shopify) está en español.

Archivo para subir: **`vantora-store-theme.zip`** (en esta misma carpeta).

---

## 1. Instalar el tema (5 minutos)

1. Crea tu tienda en [shopify.com](https://www.shopify.com) (tiene prueba gratis).
2. En el panel: **Tienda online › Temas › Agregar tema › Subir archivo .zip** y elige `vantora-store-theme.zip`.
3. Pulsa **Personalizar** para revisarlo y luego **Publicar**.
4. **Configuración › Idiomas**: deja **English** como idioma predeterminado.

## 2. Lo que hace Shopify (no hay que programar nada)

Todo esto es real y funciona en cuanto activas cada opción en el panel de Shopify:

| Función | Dónde se activa |
| --- | --- |
| Carrito, checkout seguro y cálculo de envío | Ya incluido. Envíos en **Configuración › Envío y entrega** |
| Pagos | **Configuración › Pagos** (Shopify Payments, PayPal, etc., según tu país) |
| Cuentas de cliente e historial de pedidos | **Configuración › Cuentas de cliente** → con *cuentas clásicas* se usan las páginas de cuenta del tema; si tu tienda solo ofrece las cuentas nuevas, Shopify aloja sus propias páginas y también funcionan |
| Seguimiento de pedidos | Shopify envía el número de seguimiento por correo y aparece en la cuenta del cliente. Las apps de dropshipping lo sincronizan solas |
| Cupones de descuento | **Descuentos › Crear descuento** |
| Correos de confirmación | **Configuración › Notificaciones** (ya vienen activados; tradúcelos a inglés si hace falta) |
| Recuperación de carritos abandonados | **Marketing › Automatizaciones › Carrito abandonado** |
| Políticas legales (privacidad, términos, envíos, devoluciones) | **Configuración › Políticas** (Shopify genera plantillas; revísalas y pon tus datos reales). El pie de página las enlaza solo |

## 3. Productos (dropshipping)

La tienda arranca **sin productos inventados**. Para importarlos con fotos, descripciones y stock reales del proveedor:

- Instala una app de dropshipping: **DSers** (AliExpress), **CJdropshipping**, **AutoDS** o **Zendrop**.
- Importa productos y revisa siempre título, fotos y descripción en inglés antes de publicar.
- **Precio de comparación (compare at price)**: ponlo solo si es un precio anterior real. El tema calcula el % de descuento y el "Save $X" con ese dato.
- **Etiquetas opcionales**: `new` muestra la etiqueta *New* y `bestseller` muestra *Best seller*.

### Especificaciones y descuentos por cantidad (opcional)

En **Configuración › Datos personalizados › Productos** crea dos metacampos:

- `custom.specs` (texto de varias líneas): una característica por línea, p. ej. `Material: Aluminum`.
- `custom.quantity_breaks` (texto de una línea): p. ej. `2:10,3:15` (2 uds −10 %, 3 uds −15 %).
  ⚠️ Crea **el mismo descuento** en **Descuentos › Descuento automático › Cantidad mínima de artículos**. El tema solo lo muestra; quien lo cobra es Shopify.

## 4. Categorías

1. Crea una **colección** por categoría (**Productos › Colecciones**): Tech & Electronics, Home & Decor, Beauty & Personal Care, Accessories, Kitchen, Sports & Fitness, Pets, Toys & Entertainment, Fashion, Innovative Products. Usa colecciones automáticas (por tipo de producto o etiqueta) para que se llenen solas.
2. Crea también: **Best sellers** (orden *Más vendidos*), **New arrivals** (orden *Más reciente*) y **Deals** (condición: *precio de comparación* mayor que 0).
3. En **Personalizar › Inicio** asigna cada colección a su bloque. Las categorías se añaden, cambian o eliminan desde ahí sin tocar código.
4. **Menú principal** (**Tienda online › Navegación › Main menu**): pon las categorías. Si añades subenlaces se convierte en megamenú.
5. **Menú del pie** (`footer`): About us, Contact, FAQ, Order tracking, Shipping policy, Refund policy.

## 5. Páginas de confianza

En **Tienda online › Páginas** crea estas páginas y elige su plantilla:

| Página | Plantilla |
| --- | --- |
| About us | `page.about` (escribe tu historia real en el editor) |
| Contact | `page.contact` (añade tu correo, WhatsApp y horario en el editor) |
| FAQ | `page.faq` (revisa las respuestas con tus datos reales) |
| Track your order (dirección `/pages/track-order`) | `page.tracking` |

Las políticas de privacidad, términos, envíos y devoluciones salen de **Configuración › Políticas**.

## 6. Reseñas verificadas

Instala **Judge.me** (tiene plan gratuito) o **Loox**. Solo publican reseñas de compradores reales.
El tema muestra las estrellas en las tarjetas y en Google automáticamente **solo si hay reseñas**.
Añade el widget de reseñas en **Personalizar › Productos › Agregar bloque › Apps**.

## 7. Marketing y analítica

Instala estas apps oficiales (todas gratis). Configuran los píxeles **sin tocar el código** y con API de conversiones:

- **Facebook & Instagram** (Meta Pixel + Conversions API, catálogo para Instagram Shopping).
- **Google & YouTube** (Google Analytics 4, Google Ads, Merchant Center).
- **TikTok** (píxel + catálogo para TikTok Ads).
- Email marketing: **Shopify Email** o **Klaviyo**. El formulario de suscripción del tema guarda los contactos en Shopify con consentimiento.

> No pegues códigos de píxel dentro del tema: las apps ya lo hacen y contarías las ventas dos veces.

**SEO incluido en el tema:** títulos y descripciones, Open Graph para compartir, datos estructurados de producto, migas de pan, FAQ y buscador para Google, imágenes responsive con carga diferida.

## 8. Ajustes del tema

**Personalizar › Configuración del tema**:

- **Marca**: nombre, logotipo (opcional), favicon.
- **Colores y tipografía**.
- **Carrito**: barra de envío gratis (pon el importe **solo** si creaste esa tarifa de envío gratis en Shopify).
- **Redes sociales**.

Ofertas con cuenta atrás (**Inicio › Oferta especial**): pon el código y la fecha de fin **iguales** a los del descuento en Shopify. Al terminar la oferta, la sección se oculta sola.

## 9. Antes de abrir

- [ ] Pagos activos y un pedido de prueba hecho
- [ ] Envíos y plazos reales configurados
- [ ] Políticas revisadas con tus datos
- [ ] Páginas About, Contact, FAQ y Track your order creadas
- [ ] Apps de Facebook & Instagram, Google y TikTok conectadas
- [ ] Dominio propio conectado (**Configuración › Dominios**)
- [ ] Quita la contraseña de la tienda (**Preferencias**)

> **Nombre y legalidad**: antes de invertir en el nombre "Vantora Store", comprueba que el dominio y el nombre estén libres en tu país y en EE. UU. Vender sin empresa registrada puede tener implicaciones fiscales y limitar los métodos de pago disponibles; consúltalo con un contador de tu país.

---

## Estructura del código

```
layout/     theme.liquid (estructura, SEO, colores), password.liquid
sections/   cada bloque de página (hero, categorías, producto, carrito…)
snippets/   piezas reutilizables (tarjeta de producto, precio, iconos…)
templates/  qué secciones lleva cada página
assets/     base.css (diseño) y theme.js (carrito lateral, buscador, galería…)
locales/    textos de la tienda (inglés)
config/     ajustes del tema
```

Para volver a generar el .zip después de cambios:

```bash
cd tienda-shopify
zip -r vantora-store-theme.zip assets config layout locales sections snippets templates
```
