/**
 * Panel de administración (v1.2): https://<servidor>/admin
 * Protegido con la variable PARQUES_ADMIN_TOKEN (sin ella el panel está apagado).
 * API: /api/admin/{stats,find,reports,grant,ban,resolve,broadcast} con la cabecera `x-admin-token`.
 */
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { grantReward } from '@parques/engine';
import type { Social } from './social';
import type { Store } from './store';

export interface AdminCtx {
  store: Store;
  social: Social;
  online: () => number;
  rooms: () => number;
  broadcast: (text: string) => void;
  pushProfile: (id: string) => void;
  kick: (id: string) => void;
}

const json = (res: ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 20000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function tokenOk(req: IncomingMessage): boolean {
  const want = process.env.PARQUES_ADMIN_TOKEN ?? '';
  if (want.length < 12) return false;
  const got = String(req.headers['x-admin-token'] ?? '');
  const a = Buffer.from(want);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Atiende /admin y /api/admin/*. Devuelve false si la ruta no es del panel. */
export async function adminRoute(req: IncomingMessage, res: ServerResponse, ctx: AdminCtx): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/admin') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' });
    res.end(ADMIN_HTML);
    return true;
  }
  if (!url.pathname.startsWith('/api/admin/')) return false;
  if (!tokenOk(req)) {
    json(res, 401, { error: process.env.PARQUES_ADMIN_TOKEN ? 'Clave incorrecta' : 'Panel apagado: falta PARQUES_ADMIN_TOKEN en el servidor' });
    return true;
  }
  const what = url.pathname.slice('/api/admin/'.length);
  try {
    if (what === 'stats') return json(res, 200, { ...(await ctx.social.adminStats()), online: ctx.online(), rooms: ctx.rooms() }), true;
    if (what === 'find') return json(res, 200, await ctx.social.adminFind(url.searchParams.get('q') ?? '')), true;
    if (what === 'reports') return json(res, 200, await ctx.social.adminReports()), true;
    if (req.method !== 'POST') return json(res, 405, { error: 'Usa POST' }), true;
    const b = await readJson(req);
    const id = String(b.id ?? '').toUpperCase();
    if (what === 'grant') {
      const coins = Math.max(-10_000_000, Math.min(10_000_000, Math.trunc(Number(b.coins) || 0)));
      const gems = Math.max(-100_000, Math.min(100_000, Math.trunc(Number(b.gems) || 0)));
      const r = await ctx.store.update(id, (p) => grantReward(p, coins, gems));
      if (r.ok) ctx.pushProfile(id);
      return json(res, r.ok ? 200 : 404, { ok: r.ok, error: r.ok ? undefined : r.error }), true;
    }
    if (what === 'ban') {
      const hours = Math.max(0, Math.min(24 * 365, Number(b.hours) || 0));
      await ctx.social.ban(id, hours, String(b.reason ?? ''));
      if (hours > 0) ctx.kick(id);
      return json(res, 200, { ok: true }), true;
    }
    if (what === 'resolve') {
      await ctx.social.resolveReports(id);
      return json(res, 200, { ok: true }), true;
    }
    if (what === 'broadcast') {
      const text = String(b.text ?? '').trim().slice(0, 200);
      if (!text) return json(res, 400, { error: 'Mensaje vacío' }), true;
      ctx.broadcast(text);
      return json(res, 200, { ok: true }), true;
    }
    json(res, 404, { error: 'No existe' });
  } catch (e) {
    json(res, 500, { error: String((e as Error).message ?? e) });
  }
  return true;
}

const ADMIN_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Parqués · Administración</title>
<style>
:root{--bg:#0f1530;--card:#1a2147;--line:#2c3570;--tx:#f3f5ff;--mut:#9aa3d6;--ok:#22c55e;--bad:#ef4444;--acc:#ffcf3f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,sans-serif;padding:16px;max-width:1100px;margin:auto}
h1{font-size:22px;margin:4px 0 14px}h2{font-size:16px;margin:0 0 10px;color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.stat{background:#222a58;border-radius:10px;padding:10px}.stat b{display:block;font-size:22px}.stat span{color:var(--mut);font-size:12px}
input,button,select{font:inherit;border-radius:9px;border:1px solid var(--line);background:#11173a;color:var(--tx);padding:8px 10px}
button{background:#2f7bff;border:0;cursor:pointer;font-weight:700}button.bad{background:var(--bad)}button.ok{background:var(--ok)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--mut);font-weight:600}.tag{background:var(--bad);border-radius:6px;padding:1px 6px;font-size:11px}
#msg{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#000c;padding:10px 16px;border-radius:10px;display:none}
.wrap{overflow-x:auto}
</style></head><body>
<h1>🎲 Parqués Colombia · Administración</h1>
<div class="card" id="login"><h2>Entrar</h2><div class="row"><input id="tok" type="password" placeholder="Clave de administrador" size="34"><button onclick="login()">Entrar</button></div>
<small style="color:var(--mut)">La clave es la variable PARQUES_ADMIN_TOKEN del servidor. Se guarda solo en este navegador.</small></div>
<div id="app" style="display:none">
<div class="card"><h2>Resumen</h2><div class="stats" id="stats"></div></div>
<div class="card"><h2>Buscar jugador</h2><div class="row"><input id="q" placeholder="ID o nombre" onkeydown="if(event.key==='Enter')find()"><button onclick="find()">Buscar</button></div>
<div class="wrap"><table id="players"></table></div></div>
<div class="card"><h2>Reportes abiertos</h2><div class="wrap"><table id="reports"></table></div></div>
<div class="card"><h2>Aviso a todos los conectados</h2><div class="row"><input id="bc" size="50" maxlength="200" placeholder="Ej.: ¡Hoy doble premio en la mesa Barrio!"><button onclick="broadcast()">Enviar</button></div></div>
</div>
<div id="msg"></div>
<script>
let T=localStorage.getItem('pq-admin')||'';
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){const m=$('msg');m.textContent=t;m.style.display='block';clearTimeout(m._t);m._t=setTimeout(()=>m.style.display='none',2500)}
async function api(path,body){const r=await fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{'x-admin-token':T,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j}
async function login(){T=$('tok').value.trim()||T;try{await load();localStorage.setItem('pq-admin',T);$('login').style.display='none';$('app').style.display='block'}catch(e){toast(e.message)}}
async function load(){const s=await api('stats');const L={online:'Conectados ahora',rooms:'Mesas activas',accounts:'Cuentas',newToday:'Nuevas (24 h)',activeWeek:'Activas (7 días)',onlineGames:'Partidas online',openReports:'Reportes abiertos',purchases:'Compras reales',clubs:'Clubes'};
$('stats').innerHTML=Object.keys(L).map(k=>'<div class="stat"><b>'+Number(s[k]||0).toLocaleString('es-CO')+'</b><span>'+L[k]+'</span></div>').join('');loadReports()}
async function find(){const rows=await api('find?q='+encodeURIComponent($('q').value));$('players').innerHTML='<tr><th>ID</th><th>Nombre</th><th>Nivel</th><th>🪙</th><th>💎</th><th>Trofeos</th><th>Última vez</th><th>Acciones</th></tr>'+rows.map(p=>'<tr><td>'+esc(p.id)+'</td><td>'+esc(p.name)+(p.bannedUntil?' <span class="tag">suspendido</span>':'')+'</td><td>'+p.level+'</td><td>'+Number(p.coins).toLocaleString('es-CO')+'</td><td>'+p.gems+'</td><td>'+p.rating+'</td><td>'+new Date(p.updated).toLocaleString('es-CO')+'</td><td><div class="row"><button class="ok" onclick="grant(\\''+p.id+'\\')">Regalar</button><button class="bad" onclick="ban(\\''+p.id+'\\')">Suspender</button>'+(p.bannedUntil?'<button onclick="unban(\\''+p.id+'\\')">Quitar</button>':'')+'</div></td></tr>').join('')}
async function loadReports(){const rows=await api('reports');$('reports').innerHTML=rows.length?'<tr><th>Reportado</th><th>Motivo</th><th>Veces</th><th>Por</th><th>Fecha</th><th></th></tr>'+rows.map(r=>'<tr><td>'+esc(r.tname)+' ('+esc(r.target)+')</td><td>'+esc(r.reason)+'</td><td>'+r.count+'</td><td>'+esc(r.reporter)+'</td><td>'+new Date(r.at).toLocaleString('es-CO')+'</td><td><div class="row"><button class="bad" onclick="ban(\\''+r.target+'\\')">Suspender</button><button onclick="resolve(\\''+r.target+'\\')">Descartar</button></div></td></tr>').join(''):'<tr><td>Sin reportes 🎉</td></tr>'}
async function grant(id){const c=prompt('Monedas a regalar a '+id+' (negativo para quitar):','1000');if(c===null)return;const g=prompt('Gemas:','0');if(g===null)return;try{await api('grant',{id,coins:+c,gems:+g});toast('Listo');find()}catch(e){toast(e.message)}}
async function ban(id){const h=prompt('¿Cuántas horas suspender a '+id+'? (24 = un día)','24');if(!h)return;const why=prompt('Motivo:','Reportes de la comunidad')||'';try{await api('ban',{id,hours:+h,reason:why});await api('resolve',{id});toast('Suspendido');load();if($('q').value)find()}catch(e){toast(e.message)}}
async function unban(id){try{await api('ban',{id,hours:0});toast('Suspensión quitada');find()}catch(e){toast(e.message)}}
async function resolve(id){try{await api('resolve',{id});toast('Descartado');load()}catch(e){toast(e.message)}}
async function broadcast(){const t=$('bc').value.trim();if(!t)return;if(!confirm('¿Enviar a todos los conectados?\\n\\n'+t))return;try{await api('broadcast',{text:t});$('bc').value='';toast('Enviado')}catch(e){toast(e.message)}}
if(T)login();setInterval(()=>{if($('app').style.display==='block')load().catch(()=>{})},30000);
</script></body></html>`;
