/* VANTORA STORE — interacción del tema (sin dependencias) */
(() => {
  'use strict';
  const T = window.theme || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

  /* ---------------- toast ---------------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  /* ---------------- money ---------------- */
  function formatMoney(cents) {
    const fmt = T.moneyFormat || '${{amount}}';
    const n = (cents / 100);
    const two = n.toFixed(2);
    const withSep = (v, th, dec) => { const [i, d] = v.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, th) + (d ? dec + d : ''); };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => {
      switch (k) {
        case 'amount': return withSep(two, ',', '.');
        case 'amount_no_decimals': return withSep(Math.round(n).toString(), ',', '.');
        case 'amount_with_comma_separator': return withSep(two, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withSep(Math.round(n).toString(), '.', ',');
        case 'amount_with_apostrophe_separator': return withSep(two, "'", '.');
        case 'amount_with_space_separator': return withSep(two, ' ', ',');
        case 'amount_no_decimals_with_space_separator': return withSep(Math.round(n).toString(), ' ', ',');
        default: return withSep(two, ',', '.');
      }
    });
  }

  /* ---------------- drawers ---------------- */
  let lastFocus;
  function openDrawer(el) {
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const f = el.querySelector('[data-autofocus], button, a, input');
    setTimeout(() => f && f.focus({ preventScroll: true }), 60);
  }
  function closeDrawer(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open')) document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-drawer]');
    if (opener) {
      const d = document.getElementById(opener.dataset.openDrawer);
      if (d) { e.preventDefault(); openDrawer(d); }
      return;
    }
    const closer = e.target.closest('[data-close-drawer]');
    if (closer) { e.preventDefault(); closeDrawer(closer.closest('.drawer')); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.drawer.is-open').forEach(closeDrawer);
    closeZoom();
    $$('.nav-list details[open]').forEach((d) => d.removeAttribute('open'));
  });

  /* ---------------- header ---------------- */
  const header = $('.site-header');
  if (header) {
    const setH = () => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    setH();
    window.addEventListener('resize', debounce(setH, 150));
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 8);
      lastY = y;
    }, { passive: true });
    // Cierra el megamenú al hacer clic fuera o al abrir otro
    $$('.nav-list details').forEach((d) => {
      d.addEventListener('toggle', () => {
        if (d.open) $$('.nav-list details[open]').forEach((o) => o !== d && o.removeAttribute('open'));
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-list details')) $$('.nav-list details[open]').forEach((d) => d.removeAttribute('open'));
    });
  }

  /* ---------------- predictive search ---------------- */
  $$('[data-predictive]').forEach((wrap) => {
    const input = $('input[type="search"]', wrap);
    const results = $('[data-predictive-results]', wrap);
    if (!input || !results || !T.routes.predictiveSearch) return;
    let ctrl;
    const run = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { results.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      ctrl && ctrl.abort();
      ctrl = new AbortController();
      try {
        const url = `${T.routes.predictiveSearch}?q=${encodeURIComponent(q)}&section_id=predictive-search&resources[type]=product,collection,query&resources[limit]=6&resources[options][unavailable_products]=last`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(res.status);
        const doc = parseHTML(await res.text());
        const content = doc.querySelector('#shopify-section-predictive-search');
        results.innerHTML = content ? content.innerHTML : '';
        results.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      } catch (err) { if (err.name !== 'AbortError') results.hidden = true; }
    }, 220);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (results.innerHTML.trim() && input.value.trim().length > 1) results.hidden = false; });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) results.hidden = true; });
    input.addEventListener('keydown', (e) => {
      const links = $$('a', results);
      if (!links.length || results.hidden) return;
      const i = links.findIndex((a) => a.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        links.forEach((a) => a.removeAttribute('aria-selected'));
        const n = e.key === 'ArrowDown' ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
        links[n].setAttribute('aria-selected', 'true');
        links[n].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && i > -1) { e.preventDefault(); links[i].click(); }
    });
  });

  /* ---------------- cart ---------------- */
  const Cart = {
    sections() {
      const ids = ['cart-drawer'];
      const main = $('[data-main-cart]');
      if (main) ids.push(main.dataset.sectionId);
      return ids;
    },
    async post(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...body, sections: this.sections(), sections_url: window.location.pathname })
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || T.strings.error);
      return data;
    },
    render(sections) {
      if (!sections) return;
      const drawerHTML = sections['cart-drawer'];
      if (drawerHTML) {
        const fresh = parseHTML(drawerHTML).querySelector('[data-cart-drawer-inner]');
        const cur = $('[data-cart-drawer-inner]');
        if (fresh && cur) cur.replaceWith(fresh);
        const count = parseHTML(drawerHTML).querySelector('[data-cart-count-value]');
        if (count) this.setCount(parseInt(count.dataset.cartCountValue, 10));
      }
      const main = $('[data-main-cart]');
      if (main && sections[main.dataset.sectionId]) {
        const fresh = parseHTML(sections[main.dataset.sectionId]).querySelector('[data-main-cart]');
        if (fresh) main.replaceWith(fresh);
      }
      initCartUI();
    },
    setCount(n) {
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = n;
        el.hidden = n < 1;
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      });
    },
    async add(items, btn) {
      btn && btn.classList.add('is-loading');
      try {
        const data = await this.post(T.routes.cartAdd + '.js', { items });
        if (T.cartType === 'page' && !$('[data-main-cart]')) { window.location = T.routes.cart; return; }
        this.render(data.sections);
        document.dispatchEvent(new CustomEvent('cart:added', { detail: data }));
        const drawer = document.getElementById('CartDrawer');
        if (drawer && !$('[data-main-cart]')) openDrawer(drawer);
        else toast(T.strings.added);
        return true;
      } catch (err) {
        toast(err.message || T.strings.error);
        return false;
      } finally { btn && btn.classList.remove('is-loading'); }
    },
    async change(line, quantity, row) {
      row && row.classList.add('is-loading');
      try {
        const data = await this.post(T.routes.cartChange + '.js', { line, quantity });
        this.render(data.sections);
      } catch (err) {
        toast(err.message || T.strings.error);
        row && row.classList.remove('is-loading');
      }
    }
  };
  window.VantoraCart = Cart;

  // Formulario de producto
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const errBox = form.querySelector('.buy__error') || form.closest('section') && form.closest('section').querySelector('.buy__error');
    if (errBox) errBox.textContent = '';
    const fd = new FormData(form);
    const item = { id: Number(fd.get('id')), quantity: Number(fd.get('quantity') || 1) };
    const props = {};
    for (const [k, v] of fd.entries()) { const m = k.match(/^properties\[(.+)\]$/); if (m && v) props[m[1]] = v; }
    if (Object.keys(props).length) item.properties = props;
    if (fd.get('selling_plan')) item.selling_plan = fd.get('selling_plan');
    const extra = $$('[data-bundle-extra]:checked', form.closest('section') || document).map((c) => ({ id: Number(c.value), quantity: 1 }));
    const ok = await Cart.add([item, ...extra], btn);
    if (!ok && errBox) errBox.textContent = T.strings.error;
  });

  // Añadir rápido desde tarjetas / complementarios
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-quick-add]');
    if (!b) return;
    e.preventDefault();
    const ok = await Cart.add([{ id: Number(b.dataset.quickAdd), quantity: 1 }], b);
    if (ok) { b.classList.add('is-added'); setTimeout(() => b.classList.remove('is-added'), 1600); }
  });

  function initCartUI() {
    $$('[data-cart-line]').forEach((row) => {
      if (row.dataset.bound) return;
      row.dataset.bound = '1';
      const line = Number(row.dataset.cartLine);
      const input = $('input[data-qty-input]', row);
      $$('[data-qty]', row).forEach((b) => b.addEventListener('click', () => {
        const v = Math.max(0, Number(input.value) + (b.dataset.qty === 'plus' ? 1 : -1));
        input.value = v;
        Cart.change(line, v, row);
      }));
      input && input.addEventListener('change', () => Cart.change(line, Math.max(0, Number(input.value) || 0), row));
      const rm = $('[data-remove]', row);
      rm && rm.addEventListener('click', (e) => { e.preventDefault(); Cart.change(line, 0, row); });
    });
    // Cupón: se aplica en el checkout real de Shopify
    $$('form[data-cart-form]').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', (e) => {
        const code = (form.querySelector('[data-coupon]') || {}).value;
        const submitter = e.submitter;
        if (submitter && submitter.name === 'checkout' && code && code.trim()) {
          e.preventDefault();
          const note = form.querySelector('[name="note"]');
          const go = () => { window.location = '/checkout?discount=' + encodeURIComponent(code.trim().toUpperCase()); };
          if (note) {
            fetch(T.routes.cartUpdate + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note.value }) }).finally(go);
          } else go();
        }
      });
    });
    $$('[data-cart-note]').forEach((n) => {
      if (n.dataset.bound) return;
      n.dataset.bound = '1';
      n.addEventListener('change', () => fetch(T.routes.cartUpdate + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: n.value }) }));
    });
  }
  initCartUI();

  /* ---------------- quantity (producto) ---------------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const min = Number(input.min || 1);
    const max = input.max ? Number(input.max) : Infinity;
    const v = Math.min(max, Math.max(min, Number(input.value || 1) + (b.dataset.step === 'up' ? 1 : -1)));
    input.value = v;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------------- quantity breaks ---------------- */
  $$('[data-breaks]').forEach((wrap) => {
    const section = wrap.closest('section') || document;
    const qty = $('[data-product-qty]', section);
    const items = $$('.break', wrap);
    const sync = () => {
      const v = Number(qty && qty.value || 1);
      let active = null;
      items.forEach((b) => { if (v >= Number(b.dataset.min)) active = b; });
      items.forEach((b) => b.classList.toggle('is-active', b === active));
    };
    items.forEach((b) => b.addEventListener('click', () => { if (qty) { qty.value = b.dataset.min; qty.dispatchEvent(new Event('change', { bubbles: true })); } }));
    qty && qty.addEventListener('change', sync);
    sync();
  });

  /* ---------------- variant picker ---------------- */
  $$('[data-product]').forEach((root) => {
    const jsonEl = $('script[data-product-json]', root);
    if (!jsonEl) return;
    const product = JSON.parse(jsonEl.textContent);
    const sectionId = root.dataset.sectionId;
    const idInputs = $$('input[name="id"][data-variant-id]', root.parentElement);
    const picker = $('[data-variant-picker]', root);
    const fetchCtrl = { c: null };

    const selected = () => $$('fieldset[data-option]', picker).map((fs) => {
      const c = $('input:checked', fs); return c ? c.value : null;
    });
    const findVariant = (opts) => product.variants.find((v) => v.options.every((o, i) => o === opts[i]));

    function markAvailability(opts) {
      $$('fieldset[data-option]', picker).forEach((fs, idx) => {
        $$('input', fs).forEach((inp) => {
          const test = opts.slice(); test[idx] = inp.value;
          const v = product.variants.find((x) => x.options.every((o, i) => o === test[i]));
          const pill = inp.nextElementSibling;
          if (pill) pill.classList.toggle('is-unavailable', !v || !v.available);
        });
        const lbl = $('[data-option-value]', fs);
        if (lbl) lbl.textContent = opts[idx] || '';
      });
    }

    async function onChange() {
      const opts = selected();
      markAvailability(opts);
      const v = findVariant(opts);
      const btns = $$('[data-add-button]', document);
      if (!v) {
        btns.forEach((b) => { b.disabled = true; $('span', b).textContent = T.strings.unavailable; });
        return;
      }
      idInputs.forEach((i) => { i.value = v.id; });
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url.toString());
      btns.forEach((b) => { b.disabled = !v.available; $('span', b).textContent = v.available ? T.strings.addToCart : T.strings.soldOut; });
      if (v.featured_media) goToMedia(root, v.featured_media.id);

      // Re-render de precio, stock y CTA fijo desde Shopify (datos reales del servidor)
      fetchCtrl.c && fetchCtrl.c.abort();
      fetchCtrl.c = new AbortController();
      try {
        const res = await fetch(`${window.location.pathname}?variant=${v.id}&section_id=${sectionId}`, { signal: fetchCtrl.c.signal });
        const doc = parseHTML(await res.text());
        $$('[data-swap]', document).forEach((el) => {
          const fresh = doc.querySelector(`[data-swap="${el.dataset.swap}"]`);
          if (fresh) el.innerHTML = fresh.innerHTML;
        });
      } catch (_) { /* abortado */ }
    }
    picker && picker.addEventListener('change', onChange);
    if (picker) markAvailability(selected());
  });

  /* ---------------- gallery ---------------- */
  function goToMedia(root, mediaId) {
    const slide = $(`[data-media-id="${mediaId}"]`, root);
    const main = $('[data-gallery-main]', root);
    if (slide && main) main.scrollTo({ left: slide.offsetLeft - main.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  $$('[data-gallery]').forEach((g) => {
    const main = $('[data-gallery-main]', g);
    const slides = $$('[data-media-id]', main);
    const thumbs = $$('[data-thumb]', g);
    const counter = $('[data-gallery-counter]', g);
    const setActive = (i) => {
      thumbs.forEach((t, k) => { t.classList.toggle('is-active', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      if (counter) counter.textContent = `${i + 1} / ${slides.length}`;
      const t = thumbs[i]; if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    thumbs.forEach((t, i) => t.addEventListener('click', () => {
      main.scrollTo({ left: slides[i].offsetLeft - main.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      setActive(i);
    }));
    main.addEventListener('scroll', debounce(() => {
      const i = Math.round(main.scrollLeft / main.clientWidth);
      setActive(Math.min(slides.length - 1, Math.max(0, i)));
    }, 60), { passive: true });
    slides.forEach((s, i) => s.addEventListener('click', () => { if (s.dataset.mediaType === 'image') openZoom(g, i); }));
  });
  const zoom = $('[data-zoom]');
  function openZoom(g, i) {
    if (!zoom) return;
    const track = $('.zoom__track', zoom);
    track.innerHTML = '';
    $$('[data-media-type="image"] img', g).forEach((img) => {
      const big = document.createElement('img');
      big.src = img.dataset.zoomSrc || img.currentSrc || img.src;
      big.alt = img.alt;
      big.loading = 'lazy';
      track.appendChild(big);
    });
    zoom.classList.add('is-open');
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => { const imgs = $$('img', track); const idx = $$('[data-media-id]', g).filter((s) => s.dataset.mediaType === 'image').indexOf($$('[data-media-id]', g)[i]); if (imgs[idx]) track.scrollLeft = imgs[idx].offsetLeft; });
    $('.zoom__close', zoom).focus();
  }
  function closeZoom() {
    if (!zoom || !zoom.classList.contains('is-open')) return;
    zoom.classList.remove('is-open');
    if (!$('.drawer.is-open')) document.body.classList.remove('is-locked');
  }
  zoom && zoom.addEventListener('click', (e) => { if (e.target.closest('.zoom__close') || e.target === zoom) closeZoom(); });

  /* ---------------- sticky add to cart ---------------- */
  const sticky = $('[data-sticky-atc]');
  const mainBtn = $('[data-main-atc]');
  if (sticky && mainBtn && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      const past = !en.isIntersecting && en.boundingClientRect.top < 0;
      sticky.classList.toggle('is-visible', past);
      sticky.setAttribute('aria-hidden', String(!past));
    }).observe(mainBtn);
    sticky.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sticky-submit]');
      if (!b) return;
      const form = document.getElementById(b.dataset.stickySubmit);
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  if (document.documentElement.classList.contains('js-anim') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const watch = (root = document) => $$('[data-reveal]:not(.is-in)', root).forEach((el) => io.observe(el));
    watch();
    document.addEventListener('shopify:section:load', (e) => watch(e.target));
    window.__revealWatch = watch;
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------------- hero slideshow ---------------- */
  function initHero(hero) {
    const track = $('.hero__track', hero);
    const slides = $$('.hero__slide', hero);
    const dots = $$('.hero__dot', hero);
    if (!track || slides.length === 0) return;
    let i = 0;
    let timer;
    const speed = Number(hero.dataset.speed || 6) * 1000;
    const auto = hero.dataset.autoplay === 'true' && slides.length > 1 && !reduceMotion;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', String(k !== i)); $$('a,button', s).forEach((a) => { a.tabIndex = k === i ? 0 : -1; }); });
      dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.setAttribute('aria-current', String(k === i)); });
      restart();
    };
    const restart = () => { clearTimeout(timer); if (auto && !hero.classList.contains('is-paused')) timer = setTimeout(() => go(i + 1), speed); };
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    const prev = $('[data-hero-prev]', hero); const next = $('[data-hero-next]', hero);
    prev && prev.addEventListener('click', () => go(i - 1));
    next && next.addEventListener('click', () => go(i + 1));
    hero.addEventListener('mouseenter', () => { hero.classList.add('is-paused'); clearTimeout(timer); });
    hero.addEventListener('mouseleave', () => { hero.classList.remove('is-paused'); restart(); });
    hero.addEventListener('focusin', () => { hero.classList.add('is-paused'); clearTimeout(timer); });
    let x0 = null;
    track.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    hero.style.setProperty('--hero-speed', speed / 1000 + 's');
    go(0);
  }
  $$('[data-hero]').forEach(initHero);
  document.addEventListener('shopify:section:load', (e) => $$('[data-hero]', e.target).forEach(initHero));

  /* ---------------- sliders ---------------- */
  function initSlider(wrap) {
    const track = $('[data-slider-track]', wrap);
    const prev = $('[data-slider-prev]', wrap);
    const next = $('[data-slider-next]', wrap);
    if (!track || !prev || !next) return;
    const update = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    };
    const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 24 : track.clientWidth);
    prev.addEventListener('click', () => track.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step() * 2, behavior: 'smooth' }));
    track.addEventListener('scroll', debounce(update, 50), { passive: true });
    update();
  }
  $$('[data-slider]').forEach(initSlider);
  document.addEventListener('shopify:section:load', (e) => $$('[data-slider]', e.target).forEach(initSlider));

  /* ---------------- countdown (fecha real puesta por la tienda) ---------------- */
  function initCountdown(el) {
    const end = new Date(el.dataset.countdown).getTime();
    if (Number.isNaN(end)) { el.hidden = true; return; }
    const parts = { d: $('[data-d]', el), h: $('[data-h]', el), m: $('[data-m]', el), s: $('[data-s]', el) };
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        el.hidden = true;
        const box = el.closest('[data-offer]');
        if (box && box.dataset.hideExpired === 'true') box.hidden = true;
        return;
      }
      const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      parts.d.textContent = String(d).padStart(2, '0');
      parts.h.textContent = String(h).padStart(2, '0');
      parts.m.textContent = String(m).padStart(2, '0');
      parts.s.textContent = String(s).padStart(2, '0');
      setTimeout(tick, 1000);
    };
    tick();
  }
  $$('[data-countdown]').forEach(initCountdown);
  document.addEventListener('shopify:section:load', (e) => $$('[data-countdown]', e.target).forEach(initCountdown));

  /* ---------------- copy code / share ---------------- */
  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) {
      try { await navigator.clipboard.writeText(c.dataset.copy); toast(T.strings.copied); } catch (_) { /* sin permiso */ }
    }
    const s = e.target.closest('[data-share]');
    if (s) {
      const data = { title: document.title, url: s.dataset.share };
      if (navigator.share) { try { await navigator.share(data); } catch (_) { /* cancelado */ } }
      else { try { await navigator.clipboard.writeText(data.url); toast(T.strings.copied); } catch (_) { /* */ } }
    }
  });

  /* ---------------- product recommendations (API real de Shopify) ---------------- */
  function loadRecs(el) {
    if (el.dataset.loaded) return;
    el.dataset.loaded = '1';
    fetch(el.dataset.url).then((r) => r.text()).then((html) => {
      const fresh = parseHTML(html).querySelector('[data-recs]');
      if (fresh && fresh.innerHTML.trim()) {
        el.innerHTML = fresh.innerHTML;
        el.hidden = false;
        const sec0 = el.closest('.shopify-section');
        if (sec0) sec0.hidden = false;
        $$('[data-slider]', el).forEach(initSlider);
        if (window.__revealWatch) window.__revealWatch(el); else $$('[data-reveal]', el).forEach((x) => x.classList.add('is-in'));
      } else {
        const sec = el.closest('.shopify-section');
        (el.dataset.hideEmpty === 'true' && sec ? sec : el).hidden = true;
      }
    }).catch(() => { el.hidden = true; });
  }
  const recIO = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { loadRecs(en.target); recIO.unobserve(en.target); } }), { rootMargin: '400px 0px' }) : null;
  $$('[data-recs][data-url]').forEach((el) => (recIO ? recIO.observe(el) : loadRecs(el)));

  /* ---------------- facets (filtros de colección) ---------------- */
  function initFacets() {
    const forms = $$('form[data-facets]');
    if (!forms.length) return;
    const sectionId = forms[0].dataset.sectionId;
    const render = async (search) => {
      const url = `${window.location.pathname}?${search}`;
      const grid = $('[data-results]');
      grid && (grid.style.opacity = '.45');
      try {
        const res = await fetch(`${window.location.pathname}?section_id=${sectionId}&${search}`);
        const doc = parseHTML(await res.text());
        ['[data-results]', '[data-facets-side]', '[data-facets-drawer]', '[data-active-filters]', '[data-count]'].forEach((sel) => {
          const fresh = doc.querySelector(sel);
          $$(sel).forEach((cur) => { if (fresh) cur.innerHTML = fresh.innerHTML; });
        });
        history.replaceState({}, '', url);
        if (window.__revealWatch) window.__revealWatch(); else $$('[data-reveal]').forEach((x) => x.classList.add('is-in'));
      } finally { const g = $('[data-results]'); g && (g.style.opacity = ''); }
    };
    const serialize = (form) => new URLSearchParams(new FormData(form)).toString();
    document.addEventListener('change', debounce((e) => {
      const form = e.target.closest('form[data-facets]') || (e.target.matches('[data-sort]') ? e.target.form : null);
      if (!form) return;
      const params = new URLSearchParams(new FormData(form));
      const sort = $('[data-sort]');
      if (sort && !params.has('sort_by')) params.set('sort_by', sort.value);
      for (const [k, v] of [...params.entries()]) if (v === '') params.delete(k);
      render(params.toString());
    }, 350));
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-facet-remove]');
      if (!a) return;
      e.preventDefault();
      render(new URL(a.href).searchParams.toString());
    });
    void serialize;
  }
  initFacets();

  /* ---------------- recently viewed ---------------- */
  try {
    const p = $('[data-recent-handle]');
    if (p) {
      const key = 'vantora:recent';
      const h = p.dataset.recentHandle;
      const list = JSON.parse(localStorage.getItem(key) || '[]').filter((x) => x !== h);
      list.unshift(h);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
    }
  } catch (_) { /* almacenamiento bloqueado */ }
  $$('[data-recently-viewed]').forEach(async (wrap) => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('vantora:recent') || '[]'); } catch (_) { /* */ }
    const current = wrap.dataset.exclude;
    list = list.filter((h) => h !== current).slice(0, Number(wrap.dataset.limit || 8));
    const sec = wrap.closest('.shopify-section');
    if (!list.length) { if (sec && !window.Shopify?.designMode) sec.hidden = true; return; }
    const root = T.routes.root.replace(/\/$/, '');
    const cards = await Promise.all(list.map(async (h) => {
      try {
        const res = await fetch(`${root}/products/${encodeURIComponent(h)}?section_id=card-render`);
        if (!res.ok) return null;
        const el = parseHTML(await res.text()).querySelector('[data-card-render]');
        return el ? el.firstElementChild : null;
      } catch (_) { return null; }
    }));
    const target = $('[data-recent-items]', wrap);
    const found = cards.filter(Boolean);
    if (target && found.length) {
      found.forEach((c) => { c.classList.add('is-in'); target.appendChild(c); });
      $$('[data-slider]', wrap).forEach(initSlider);
    } else if (sec && !window.Shopify?.designMode) sec.hidden = true;
  });

  void formatMoney;
})();
