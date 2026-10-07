const $ = (sel) => document.querySelector(sel);
const state = { config: null, registering: false };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const usd = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD' });
const btc = (n) => `${n.toFixed(8)} BTC`;
const date = (ms) => new Date(ms).toLocaleDateString('es-ES');
const tag = (s) => {
  const label = { active: 'activo', expired: 'finalizado', paid: 'pagado', pending: 'pendiente', rejected: 'rechazado', cancelled: 'cancelado' }[s] || s;
  return `<span class="tag ${esc(s)}">${label}</span>`;
};

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function flash(message, kind = '') {
  const el = $('#flash');
  el.textContent = message;
  el.className = `banner ${kind}`;
  el.hidden = false;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { el.hidden = true; }, 6000);
}

function table(el, headers, rows, empty = 'Sin registros todavía.') {
  el.innerHTML = rows.length
    ? `<thead><tr>${headers.map((h) => `<th class="${h.num ? 'num' : ''}">${h.label}</th>`).join('')}</tr></thead>
       <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${headers[i].num ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>`
    : `<tbody><tr><td class="muted">${empty}</td></tr></tbody>`;
}

// ---------- config, session, routing ----------

async function loadConfig() {
  state.config = await api('/config');
  const { network: n, user, paymentMode, availableTh } = state.config;
  $('#demo-banner').hidden = paymentMode !== 'demo';
  $('#network').innerHTML = `
    <span>BTC <b>${usd(n.priceUsd)}</b></span>
    <span>Dificultad <b>${(n.difficulty / 1e12).toFixed(2)} T</b></span>
    <span>Recompensa por bloque <b>${n.blockRewardBtc} BTC</b></span>
    <span>Datos <b>${n.source === 'live' ? 'en vivo' : 'por defecto'}</b></span>`;
  $('#capacity').textContent = `Capacidad real disponible para la venta: ${availableTh.toFixed(1)} TH/s`;
  $('#session').innerHTML = user
    ? `<span class="muted">${esc(user.email)}</span><button class="btn ghost small" id="logout">Salir</button>`
    : '<button class="btn small" id="login">Entrar</button>';
  document.querySelectorAll('[data-auth]').forEach((a) => { a.hidden = !user; });
  document.querySelectorAll('[data-admin]').forEach((a) => { a.hidden = !user?.isAdmin; });
  $('#logout')?.addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.hash = '#mineros'; await refresh(); });
  $('#login')?.addEventListener('click', () => openAuth(false));
}

const views = {
  mineros: renderPlans,
  panel: renderDashboard,
  retiros: renderWithdrawals,
  admin: renderAdmin,
};

async function route() {
  let view = location.hash.slice(1) || 'mineros';
  if (!views[view]) view = 'mineros';
  if (view !== 'mineros' && !state.config.user) { openAuth(false); view = 'mineros'; }
  document.querySelectorAll('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== view; });
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${view}`));
  try { await views[view](); } catch (err) { flash(err.message, 'error'); }
}

async function refresh() {
  await loadConfig();
  await route();
}

// ---------- auth ----------

function openAuth(registering) {
  state.registering = registering;
  $('#auth-title').textContent = registering ? 'Crear cuenta' : 'Iniciar sesión';
  $('#auth-toggle').textContent = registering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  $('#auth-error').textContent = '';
  $('#auth-dialog').showModal();
}

$('#auth-toggle').addEventListener('click', () => openAuth(!state.registering));
$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    await api(state.registering ? '/register' : '/login', { method: 'POST', body });
    $('#auth-dialog').close();
    e.target.reset();
    await refresh();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
});

// ---------- plans ----------

async function renderPlans() {
  const plans = await api('/plans');
  $('#plans').innerHTML = plans.map((p) => {
    const e = p.estimate;
    const days = p.duration_days;
    return `<div class="card plan">
      <h3>${esc(p.name)}</h3>
      <div class="hash">${p.hashrate_th} TH/s</div>
      <div class="price">${usd(p.price_cents / 100)} <span class="muted">/ ${days} días</span></div>
      <dl>
        <dt>Producción bruta hoy</dt><dd>${usd(e.grossUsd)}/día</dd>
        <dt>Mantenimiento</dt><dd>−${usd(e.feeUsd)}/día</dd>
        <dt>Neto estimado hoy</dt><dd><b>${usd(e.netUsd)}/día</b></dd>
        <dt>Neto en ${days} días si nada cambia</dt><dd>${usd(e.netUsd * days)}</dd>
      </dl>
      <div class="qty"><label class="muted" for="q${p.id}">Cantidad</label><input id="q${p.id}" type="number" min="1" max="100" value="1"></div>
      <button class="btn" data-buy="${p.id}">Comprar</button>
    </div>`;
  }).join('') || '<p class="muted">No hay planes activos.</p>';

  document.querySelectorAll('[data-buy]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!state.config.user) return openAuth(true);
    const id = btn.dataset.buy;
    btn.disabled = true;
    try {
      const res = await api('/checkout', { method: 'POST', body: { planId: Number(id), quantity: Number($(`#q${id}`).value) } });
      if (res.url) { location.href = res.url; return; }
      flash('Compra DEMO activada: tu contrato ya está minando.');
      location.hash = '#panel';
      await refresh();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }));
}

// ---------- dashboard ----------

async function renderDashboard() {
  const d = await api('/dashboard');
  const price = state.config.network.priceUsd;
  $('#stats').innerHTML = `
    <div class="stat"><span>Saldo</span><b>${btc(d.balanceBtc)}</b><div class="muted">${usd(d.balanceBtc * price)}</div></div>
    <div class="stat"><span>Hashrate activo</span><b>${d.activeTh.toFixed(1)} TH/s</b></div>
    <div class="stat"><span>Neto estimado hoy</span><b>${btc(d.estimate.netBtc)}</b><div class="muted">${usd(d.estimate.netUsd)}</div></div>
    <div class="stat"><span>Contratos</span><b>${d.contracts.length}</b></div>`;
  table($('#contracts'),
    [{ label: 'Plan' }, { label: 'TH/s', num: 1 }, { label: 'Inicio' }, { label: 'Fin' }, { label: 'Minado', num: 1 }, { label: 'Estado' }],
    d.contracts.map((c) => [esc(c.plan_name), c.hashrate_th, date(c.start_at), date(c.end_at), btc(c.mined_btc), tag(c.status)]),
    'Aún no tienes contratos. Compra uno en Mineros.');
  table($('#rewards'),
    [{ label: 'Día' }, { label: 'Bruto', num: 1 }, { label: 'Mantenimiento', num: 1 }, { label: 'Neto', num: 1 }],
    d.rewards.map((r) => [r.day, btc(r.gross_btc), btc(r.fee_btc), btc(r.net_btc)]));
  table($('#orders'),
    [{ label: '#' }, { label: 'Plan' }, { label: 'Cant.', num: 1 }, { label: 'Importe', num: 1 }, { label: 'Fecha' }, { label: 'Estado' }],
    d.orders.map((o) => [o.id, esc(o.plan_name), o.quantity, usd(o.amount_cents / 100), date(o.created_at), tag(o.status)]));
}

// ---------- withdrawals ----------

async function renderWithdrawals() {
  const d = await api('/dashboard');
  const s = state.config.settings;
  $('#withdraw-info').textContent =
    `Saldo disponible: ${btc(d.balanceBtc)}. Mínimo ${s.minWithdrawBtc} BTC; comisión de red ${s.withdrawFeeBtc} BTC descontada del importe. Cada retiro se revisa manualmente.`;
  table($('#withdrawals'),
    [{ label: 'Fecha' }, { label: 'Dirección' }, { label: 'Importe', num: 1 }, { label: 'Recibes', num: 1 }, { label: 'Estado' }, { label: 'TXID' }],
    d.withdrawals.map((w) => [date(w.created_at), esc(w.address), btc(w.amount_btc), btc(w.amount_btc - w.fee_btc), tag(w.status),
      w.txid ? `<a href="https://mempool.space/tx/${esc(w.txid)}" target="_blank" rel="noopener">${esc(w.txid.slice(0, 12))}…</a>` : '']));
}

$('#withdraw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    await api('/withdrawals', { method: 'POST', body: { address: body.address, amountBtc: Number(body.amountBtc) } });
    e.target.reset();
    flash('Retiro solicitado. Lo revisaremos y te enviaremos el TXID.');
    await renderWithdrawals();
  } catch (err) {
    flash(err.message, 'error');
  }
});

// ---------- admin ----------

async function renderAdmin() {
  const d = await api('/admin/overview');
  const s = d.settings;
  const sold = d.committed.active;
  $('#admin-stats').innerHTML = `
    <div class="stat"><span>Capacidad real</span><b>${s.capacity_th} TH/s</b></div>
    <div class="stat"><span>Vendido activo</span><b>${sold.toFixed(1)} TH/s</b><div class="muted">${((sold / (s.capacity_th || 1)) * 100).toFixed(1)}% de la capacidad</div></div>
    <div class="stat"><span>Ingresos</span><b>${usd(d.revenueCents / 100)}</b></div>
    <div class="stat"><span>Saldo adeudado a usuarios</span><b>${btc(d.owedBtc)}</b></div>
    <div class="stat"><span>Usuarios</span><b>${d.users}</b></div>`;

  const sf = $('#settings-form');
  for (const k of ['capacity_th', 'maintenance_usd_per_th_day', 'withdraw_fee_btc', 'min_withdraw_btc']) sf.elements[k].value = s[k];

  table($('#admin-plans'),
    [{ label: 'Nombre' }, { label: 'TH/s', num: 1 }, { label: 'Días', num: 1 }, { label: 'Precio', num: 1 }, { label: 'USD/TH', num: 1 }, { label: 'Estado' }, { label: '' }],
    d.plans.map((p) => [esc(p.name), p.hashrate_th, p.duration_days, usd(p.price_cents / 100), usd(p.price_cents / 100 / p.hashrate_th),
      p.active ? tag('active') : tag('cancelled'), `<button class="btn ghost small" data-edit='${esc(JSON.stringify(p))}'>Editar</button>`]));
  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    const p = JSON.parse(b.dataset.edit);
    const f = $('#plan-form').elements;
    f.id.value = p.id; f.name.value = p.name; f.hashrate_th.value = p.hashrate_th;
    f.duration_days.value = p.duration_days; f.price_usd.value = p.price_cents / 100; f.active.checked = !!p.active;
  }));

  table($('#admin-withdrawals'),
    [{ label: 'Fecha' }, { label: 'Usuario' }, { label: 'Dirección' }, { label: 'Enviar', num: 1 }, { label: 'Estado' }, { label: '' }],
    d.withdrawals.map((w) => [date(w.created_at), esc(w.email), esc(w.address), btc(w.amount_btc - w.fee_btc), tag(w.status),
      w.status === 'pending'
        ? `<button class="btn small" data-approve="${w.id}">Marcar pagado</button> <button class="btn ghost small" data-reject="${w.id}">Rechazar</button>`
        : esc(w.txid ? `${w.txid.slice(0, 12)}…` : '')]));
  document.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', async () => {
    const txid = prompt('TXID de la transacción enviada (64 caracteres hex):');
    if (!txid) return;
    try { await api(`/admin/withdrawals/${b.dataset.approve}/approve`, { method: 'POST', body: { txid } }); await renderAdmin(); }
    catch (err) { flash(err.message, 'error'); }
  }));
  document.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Rechazar y devolver el importe al saldo del usuario?')) return;
    try { await api(`/admin/withdrawals/${b.dataset.reject}/reject`, { method: 'POST' }); await renderAdmin(); }
    catch (err) { flash(err.message, 'error'); }
  }));
}

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, Number(v)]));
  try { await api('/admin/settings', { method: 'PUT', body }); flash('Ajustes guardados.'); await refresh(); }
  catch (err) { flash(err.message, 'error'); }
});

$('#plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  const body = {
    name: f.name.value, hashrate_th: Number(f.hashrate_th.value), duration_days: Number(f.duration_days.value),
    price_usd: Number(f.price_usd.value), active: f.active.checked,
  };
  try {
    await api(f.id.value ? `/admin/plans/${f.id.value}` : '/admin/plans', { method: f.id.value ? 'PUT' : 'POST', body });
    e.target.reset();
    f.id.value = '';
    flash('Plan guardado.');
    await renderAdmin();
  } catch (err) {
    flash(err.message, 'error');
  }
});

// ---------- boot ----------

const params = new URLSearchParams(location.search);
if (params.get('pago') === 'ok') flash('Pago recibido. Tu contrato se activa en cuanto Stripe confirma el cobro (normalmente segundos).');
if (params.get('pago') === 'cancelado') flash('Pago cancelado. No se ha cobrado nada.', 'error');
if (params.has('pago')) history.replaceState(null, '', location.pathname + location.hash);

window.addEventListener('hashchange', route);
setInterval(() => { if (location.hash === '#panel') renderDashboard().catch(() => {}); }, 60_000);
refresh().catch((err) => flash(err.message, 'error'));
