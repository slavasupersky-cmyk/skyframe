/* ═════════════════════════════════════════════════════════════════════
   Studio — конфигуратор домов.
   Данные приходят из <script id="catalog"> (собирает tools/studio_build.py).
   Адрес страницы хранит конфигурацию: #/aframe?v=1&seam=ral7016… — ей можно поделиться.
   ═════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const C = JSON.parse(document.getElementById('catalog').textContent);
const B = C.brand;
const GROUPS = C.groups;
const G = Object.fromEntries(GROUPS.map(g => [g.id, g]));
const PKG = B.packages || [];
const app = document.getElementById('app');

/* ─────────── утилиты ─────────── */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rub = n => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
const m2 = n => String(n).replace('.', ',') + ' м²';
const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
const sum = (v, cols) => cols.reduce((s, c) => s + (+v.prices[c] || 0), 0);
const kit = v => sum(v, B.base.parts.map(p => p[0]));
const pkPrice = (v, p) => sum(v, p.price);
const minKit = m => Math.min.apply(null, m.variants.map(kit));
const areaRange = m => { const a = m.variants.map(v => v.area), lo = Math.min.apply(null, a), hi = Math.max.apply(null, a);
  return lo === hi ? m2(lo) : String(lo).replace('.', ',') + '–' + m2(hi); };
const ICON = {
  back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>',
  prev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>',
  next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 5 5-5 5"/></svg>',
  check: '<svg viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 6.2 2.3 2.3 4.7-5"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m3.5 3.5 9 9m0-9-9 9"/></svg>',
  link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.1-2.1a3 3 0 0 0-4.2-4.2l-.8.8M9.5 6.5a3 3 0 0 0-4.2 0L3.2 8.6a3 3 0 0 0 4.2 4.2l.8-.8"/></svg>',
  tel: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4.5 2.5h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 2.5 4.5a2 2 0 0 1 2-2Z"/></svg>'
};
const stacked = window.matchMedia('(max-width:999px) and (orientation:portrait), (max-width:639px)');

/* ─────────── шапка (общая для экранов) ─────────── */
function header(inStudio) {
  return '<header class="top' + (inStudio ? ' lined' : ' wide') + '">' +
    '<a class="logo" href="#/" aria-label="' + esc(B.title) + ' — все модели">' +
      (B.logo ? '<img src="' + esc(B.logo) + '" alt="' + esc(B.title) + '" width="98" height="26">' : '<b>' + esc(B.title) + '</b>') + '</a>' +
    '<nav>' + (inStudio ? '<a class="models" href="#/">Все модели</a>' : '') +
      (B.phone ? '<a class="tel-txt num" href="' + esc(B.phone_href) + '">' + esc(B.phone) + '</a>' +
                 '<a class="tel-ico" href="' + esc(B.phone_href) + '" aria-label="Позвонить ' + esc(B.phone) + '">' + ICON.tel + '</a>' : '') +
    '</nav></header>';
}
function footer() {
  return '<footer class="foot">' +
    (B.phone ? '<div><b>Телефон</b><a class="num" href="' + esc(B.phone_href) + '">' + esc(B.phone) + '</a>' +
      (B.phone_note ? '<span>' + esc(B.phone_note) + '</span>' : '') + '</div>' : '') +
    (B.email ? '<div><b>Почта</b><a href="mailto:' + esc(B.email) + '">' + esc(B.email) + '</a></div>' : '') +
    (B.address ? '<div><b>Производство</b><span>' + esc(B.address) + '</span></div>' : '') +
    (B.site ? '<div><b>Сайт</b><a href="' + esc(B.site) + '" target="_blank" rel="noopener">' + esc(B.site_label || B.site) + '</a>' +
      (B.hours ? '<span>' + esc(B.hours) + '</span>' : '') + '</div>' : '') +
    (B.legal ? '<p class="legal">' + esc(B.legal) + '. ' + esc((B.notes || {}).offer || '') + '</p>' : '') +
    '</footer>';
}

/* ═════════════════════ КАТАЛОГ ═════════════════════ */
const BUCKETS = [['all', 'Все', 0, 1e9], ['s', 'До 30 м²', 0, 30], ['m', '30–60 м²', 30.01, 60], ['l', '60–100 м²', 60.01, 100], ['xl', 'Больше 100 м²', 100.01, 1e9]];
let bucket = 'all';

function renderGallery() {
  document.title = B.site_title || B.title;
  const nCfg = C.models.reduce((s, m) => s + m.variants.length, 0);
  const hm = C.models.find(m => m.id === (B.intro || {}).model) || C.models[0];
  const heroSrc = hm.img['ext-evening'] || hm.img.cover || hm.img._card;
  app.innerHTML = header(false) +
    '<section class="hero"><img src="' + esc(heroSrc) + '" alt="' + esc(hm.name) + '" fetchpriority="high">' +
      '<div class="hero-in"><h1>' + esc((B.intro || {}).title || B.title).replace(/\n/g, '<br>') + '</h1>' +
        '<p>' + esc((B.intro || {}).lead || '') + '</p>' +
        '<div class="hero-cta"><a class="btn main" href="#/' + esc(hm.id) + '">Собрать ' + esc(hm.name) + '</a>' +
        '<button class="btn glass" id="toGrid">Все модели</button></div></div>' +
      '<a class="hero-tag" href="#/' + esc(hm.id) + '">На фото — ' + esc(hm.name) + '</a></section>' +
    '<main class="gallery" id="models">' +
      '<div class="ghead"><h2>Модели</h2><p>' + C.models.length + ' ' + pl(C.models.length, 'модель', 'модели', 'моделей') +
        ', ' + nCfg + ' ' + pl(nCfg, 'планировка', 'планировки', 'планировок') + '. Цены — за домокомплект с окнами и фальцем.</p></div>' +
      '<div class="filters" role="group" aria-label="Площадь">' + BUCKETS.map(b =>
        '<button class="chip" data-b="' + b[0] + '" aria-pressed="' + (b[0] === bucket) + '">' + b[1] + '</button>').join('') + '</div>' +
      '<div class="grid" id="grid"></div>' + footer() +
    '</main>';
  $('#toGrid').onclick = () => { const g = $('#models'); window.scrollTo({ top: g.getBoundingClientRect().top + window.pageYOffset - $('.top').offsetHeight, behavior: 'smooth' }); };
  $$('.chip').forEach(b => b.onclick = () => { bucket = b.dataset.b; $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); fillGrid(); });
  fillGrid();
  window.scrollTo(0, 0);
}
function fillGrid() {
  const bk = BUCKETS.find(b => b[0] === bucket);
  const list = C.models.filter(m => m.variants.some(v => v.area >= bk[2] && v.area <= bk[3]));
  $('#grid').innerHTML = list.length ? list.map(m =>
    '<a class="card" href="#/' + esc(m.id) + '">' +
      '<div class="ph"><img src="' + esc(m.img._card || m.img.cover) + '" alt="' + esc(m.name) + '" loading="lazy" width="760" height="507"></div>' +
      '<h3>' + esc(m.name) + '</h3>' +
      '<div class="meta">' + areaRange(m) + ', ' + m.variants.length + ' ' + pl(m.variants.length, 'планировка', 'планировки', 'планировок') + '</div>' +
      '<div class="from num">от ' + rub(minKit(m)) + '</div></a>').join('')
    : '<p class="empty">В этом диапазоне моделей нет.</p>';
}

/* ═════════════════════ КОНФИГУРАТОР ═════════════════════ */
let S = null;          // состояние конфигурации
let M = null;          // текущая модель
let stage = null;      // состояние сцены
let spyRaf = 0;

function defaults(m) {
  const sel = {};
  GROUPS.forEach(g => { sel[g.id] = g.free || g.items[0].id; });
  return { m: m.id, v: m.variants[0].id, sel, pk: new Set(), form: { name: '', phone: '', city: '' }, sent: false };
}
function fromQuery(m, q) {
  const s = defaults(m);
  if (q.get('v') && m.variants.some(v => v.id === q.get('v'))) s.v = q.get('v');
  GROUPS.forEach(g => { const x = q.get(g.id); if (x && g.items.some(i => i.id === x)) s.sel[g.id] = x; });
  (q.get('p') || '').split('.').forEach(p => { if (PKG.some(k => k.id === p)) s.pk.add(p); });
  return s;
}
function toHash() {
  const q = new URLSearchParams();
  q.set('v', S.v);
  GROUPS.forEach(g => q.set(g.id, S.sel[g.id]));
  if (S.pk.size) q.set('p', Array.from(S.pk).join('.'));
  return '#/' + S.m + '?' + q.toString();
}
const V = () => M.variants.find(v => v.id === S.v);
const item = (g, id) => G[g].items.find(i => i.id === (id || S.sel[g]));
function total() {
  const v = V();
  return kit(v) + PKG.filter(p => S.pk.has(p.id)).reduce((s, p) => s + pkPrice(v, p), 0);
}
function level() {
  const on = PKG.filter(p => S.pk.has(p.id)).length;
  return on === 0 ? 'Только домокомплект' : on === PKG.length ? 'Под ключ' : 'Своя комплектация';
}

/* ─────────── кадры сцены ─────────── */
// Для каждой вкладки сцены — список кадров. Картинки ищутся по соглашению имён,
// если точной нет — берётся запасная и в подписи честно сказано, что на фото.
function frames(tab) {
  const I = M.img, SH = C.shared || {}, out = [];
  const add = (src, cap, kind, fit) => { if (src) out.push({ src, cap, kind, fit: !!fit }); };
  if (tab === 'ext') {
    const seam = item('seam');
    const exact = I['ext-hero-' + S.sel.seam];
    const anyColour = Object.keys(I).some(k => k.indexOf('ext-hero-') === 0);
    const capSeam = exact ? gname(G.seam) + ': ' + seam.name.toLowerCase() + ', ' + seam.note
      : anyColour ? 'Фото в цвете «' + seam.name.toLowerCase() + '» скоро появится'
      : 'Цвет фальца на фото может отличаться от выбранного';
    add(exact || I['ext-hero'] || I.cover, capSeam, 'hero');
    ['facade', 'terrace'].forEach(g => {
      if (!G[g]) return;
      const src = I['ext-' + g + '-' + S.sel[g]] || SH['ext-' + g + '-' + S.sel[g]];
      if (src) add(src, gname(G[g]) + ': ' + item(g).name.toLowerCase() + ', ' + item(g).note, g);
    });
    add(I['ext-side'], 'Вид сзади', 'side');
    add(I['ext-evening'], 'Вечером', 'evening');
  } else if (tab === 'plan') {
    const v = V();
    add(I['plan-' + v.id], 'Планировка ' + m2(v.area) + (v.label ? ', ' + v.label.toLowerCase() : ''), 'plan', true);
  } else if (tab === 'int' && G.interior) {
    const st = S.sel.interior, it = item('interior');
    const exact = I['int-' + st] || SH['int-' + st];
    if (exact) add(exact, gname(G.interior) + ': ' + it.name.toLowerCase(), 'int');
    else Object.keys(SH).filter(k => k.indexOf('int-sample') === 0).sort()
      .forEach(k => add(SH[k], 'Пример отделки в наших домах. Фото выбранного варианта скоро появится', 'int'));
  }
  return out;
}
const TABS = [['ext', 'Снаружи'], ['plan', 'Планировка'], ['int', 'Внутри']];
const VIEW_TAB = { hero: 'ext', facade: 'ext', terrace: 'ext', plan: 'plan', interior: 'int' };

function showStage(tab, kind, force) {
  const list = frames(tab);
  if (!list.length) { if (tab !== 'ext') return showStage('ext', 'hero', force); return; }
  let i = kind ? list.findIndex(f => f.kind === kind) : (stage.tab === tab ? stage.i : 0);
  if (i < 0) i = 0;
  if (i >= list.length) i = 0;
  stage.tab = tab; stage.list = list; stage.i = i;
  paintStage(force);
}
function paintStage() {
  const el = $('.stage'); if (!el) return;
  const f = stage.list[stage.i];
  el.classList.toggle('plan', !!f.fit);
  $$('.views button', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === stage.tab)));
  const cap = $('.cap', el); cap.textContent = f.cap;
  $('.dots', el).innerHTML = stage.list.length > 1 ? stage.list.map((_, k) => '<i class="' + (k === stage.i ? 'on' : '') + '"></i>').join('') : '';
  $$('.arrow', el).forEach(a => { a.hidden = stage.list.length < 2; });
  const on = $('.layer.on', el), off = $('.layer:not(.on)', el);
  if (on && on.dataset.src === f.src) { on.classList.toggle('fit', f.fit); return; }
  const token = (stage.token = (stage.token || 0) + 1);
  const pre = new Image();
  pre.onload = pre.onerror = () => {
    if (token !== stage.token) return;
    off.src = f.src; off.dataset.src = f.src; off.alt = M.name + ': ' + f.cap;
    off.classList.toggle('fit', f.fit);
    requestAnimationFrame(() => { off.classList.add('on'); if (on) on.classList.remove('on'); });
  };
  pre.src = f.src;
}
function stepFrame(d) {
  if (!stage.list || stage.list.length < 2) return;
  stage.i = (stage.i + d + stage.list.length) % stage.list.length;
  stage.manual = activeSec;
  paintStage();
}

/* ─────────── разметка панели ─────────── */
function renderStudio(m, q) {
  M = m; S = fromQuery(m, q); stage = { tab: 'ext', i: 0, list: [], manual: null };
  document.title = m.name + ' — ' + B.title;
  const v0 = m.variants;
  app.innerHTML = header(true) +
    '<main class="studio">' +
      '<section class="stage" aria-label="Изображение дома" tabindex="0">' +
        '<img class="layer" alt=""><img class="layer" alt="">' +
        '<div class="shade"></div>' +
        '<button class="arrow prev" aria-label="Предыдущий кадр">' + ICON.prev + '</button>' +
        '<button class="arrow next" aria-label="Следующий кадр">' + ICON.next + '</button>' +
        '<p class="cap"></p><div class="dots" aria-hidden="true"></div>' +
        '<div class="views" role="group" aria-label="Что показать">' + TABS.map(t =>
          '<button data-t="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>').join('') + '</div>' +
      '</section>' +
      '<aside class="panel">' +
        '<div class="scroll" id="scroll">' +
          '<div class="ph-head" data-view="hero">' +
            '<a class="back" href="#/">' + ICON.back + 'Все модели</a>' +
            '<h1>' + esc(m.name) + '</h1>' +
            (m.description ? '<p>' + esc(m.description) + '</p>' : '') +
            '<div class="specs">' +
              '<div><b class="num">' + areaRange(m) + '</b><span>площадь</span></div>' +
              '<div><b class="num">' + v0.length + '</b><span>' + pl(v0.length, 'планировка', 'планировки', 'планировок') + '</span></div>' +
            '</div>' +
          '</div>' +
          '<section class="sec" data-view="plan"><h2>Планировка</h2><div class="body plans" id="plans"></div></section>' +
          GROUPS.filter(g => g.id !== 'interior').map(g =>
            '<section class="sec" data-view="' + esc(g.view || 'hero') + '" data-g="' + esc(g.id) + '"><h2>' + esc(g.title) + '</h2>' +
              '<div class="body"><div class="sw" role="radiogroup" aria-label="' + esc(g.title) + '"></div><p class="picked"></p></div></section>').join('') +
          '<section class="sec" data-view="hero"><h2>Комплектация</h2>' +
            '<p class="hint">Домокомплект входит всегда. Остальное можно заказать сразу или позже.</p>' +
            '<div class="body pk" id="pk"></div></section>' +
          (G.interior ? '<section class="sec" data-view="interior" data-g="interior"><h2>' + esc(G.interior.title) + '</h2>' +
            '<p class="hint" id="intHint"></p><div class="body styles" id="styles"></div></section>' : '') +
          '<section class="sec" data-view="hero" id="order"><h2>Ваш дом</h2><div class="body" id="summary"></div>' +
            '<button class="share" id="share">' + ICON.link + 'Скопировать ссылку на эту конфигурацию</button>' +
            '<div id="lead"></div>' +
            '<p class="contacts">Вопросы по модели — <a class="num" href="' + esc(B.phone_href) + '">' + esc(B.phone) + '</a>' +
              (B.phone_note ? ', ' + esc(B.phone_note) : '') + '</p>' +
          '</section>' +
        '</div>' +
        '<div class="bar">' +
          '<button class="price" id="priceBtn" aria-label="Открыть расчёт"><small>Цена от</small><b class="num" id="tot"></b></button>' +
          '<button class="btn main" id="cta">Оставить заявку</button>' +
        '</div>' +
      '</aside>' +
    '</main>' +
    '<div class="sheet" id="sheet" aria-hidden="true"><div class="scrim"></div>' +
      '<div class="card2" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">' +
        '<header><b id="sheetTitle">Ваш расчёт</b><button class="x" id="sheetX" aria-label="Закрыть">' + ICON.x + '</button></header>' +
        '<div class="in" id="sheetIn"></div>' +
        '<footer><button class="btn main wide" id="sheetGo">Оставить заявку</button></footer>' +
      '</div></div>' +
    '<div class="toast" id="toast" role="status"></div>';
  bindStudio();
  renderLead();
  update(true);
  showStage('ext', 'hero');
  window.scrollTo(0, 0);
  warm();
}

function update(first) {
  const v = V();
  // планировки
  $('#plans').innerHTML = M.variants.map(x =>
    '<button class="opt" data-v="' + esc(x.id) + '" aria-pressed="' + (x.id === S.v) + '">' +
      '<span class="t"><b class="num">' + m2(x.area) + '</b>' + (x.label ? '<span>' + esc(x.label) + '</span>' : '') + '</span>' +
      '<span class="p num">' + rub(kit(x)) + '</span></button>').join('');
  // образцы
  GROUPS.filter(g => g.id !== 'interior').forEach(g => {
    const sec = $('.sec[data-g="' + g.id + '"]'); if (!sec) return;
    $('.sw', sec).innerHTML = g.items.map(i =>
      '<button role="radio" data-g="' + g.id + '" data-i="' + esc(i.id) + '" aria-checked="' + (i.id === S.sel[g.id]) + '" aria-pressed="' + (i.id === S.sel[g.id]) +
      '" aria-label="' + esc(i.name + ', ' + i.note) + '" title="' + esc(i.name) + '" style="background:' + esc(i.color) + '"></button>').join('');
    const it = item(g.id);
    $('.picked', sec).innerHTML = '<b>' + esc(it.name) + '</b>' + (it.note ? ' <span>' + esc(it.note) + '</span>' : '');
  });
  // комплектация
  const parts = B.base.parts.map(p => p[1] + ' ' + rub(+v.prices[p[0]] || 0)).join(' + ');
  $('#pk').innerHTML =
    '<div class="opt base"><span class="box">' + ICON.check + '</span><span class="t">' +
      '<span class="row"><b>' + esc(B.base.title) + '</b><span class="p num">' + rub(kit(v)) + '</span></span>' +
      '<span class="d">' + esc(B.base.desc) + '</span><span class="parts num">' + esc(parts) + '</span></span></div>' +
    PKG.map(p => { const pr = pkPrice(v, p);
      return '<button class="opt" data-p="' + p.id + '" aria-pressed="' + S.pk.has(p.id) + '"><span class="box">' + ICON.check + '</span>' +
        '<span class="t"><span class="row"><b>' + esc(p.title) + (p.regional ? '&nbsp;<span class="star">*</span>' : '') + '</b>' +
        '<span class="p num' + (pr > 0 ? '' : ' ind') + '">' + (pr > 0 ? rub(pr) : 'индивидуально') + '</span></span>' +
        '<span class="d">' + esc(p.desc) + '</span></span></button>'; }).join('');
  // отделка внутри
  if (G.interior) {
    const fin = PKG.find(p => p.id === G.interior.requires);
    const fp = fin ? pkPrice(v, fin) : 0;
    $('#intHint').textContent = fin ? 'Стиль отделки добавляет в комплектацию «' + fin.title.toLowerCase() + '».' : '';
    $('#styles').innerHTML = G.interior.items.map(i => {
      const free = i.id === G.interior.free;
      return '<button class="opt" data-st="' + esc(i.id) + '" aria-pressed="' + (i.id === S.sel.interior) + '">' +
        '<i style="background:' + esc(i.color) + '"></i><span class="t"><b>' + esc(i.name) + '</b><span>' + esc(i.note) + '</span></span>' +
        '<span class="p num">' + (free ? 'без доплаты' : fp > 0 ? '+ ' + rub(fp) : 'по проекту') + '</span></button>';
    }).join('');
  }
  $('#tot').textContent = rub(total());
  renderSummary();
  if (!first) history.replaceState(null, '', toHash());
}

function lines() {
  const v = V(), out = [[B.base.title, rub(kit(v)), false]];
  PKG.filter(p => S.pk.has(p.id)).forEach(p => { const pr = pkPrice(v, p); out.push([p.title + (p.regional ? ' *' : ''), pr > 0 ? rub(pr) : 'индивидуально', !(pr > 0)]); });
  return out;
}
// выбранное: пары [что, значение]
const gname = g => g.short || g.title;
function chosen() {
  const v = V();
  return [['Планировка', m2(v.area) + (v.label ? ', ' + v.label.toLowerCase() : '')]].concat(GROUPS.map(g => {
    const it = item(g.id); return [gname(g), it.name + (it.note && /\d/.test(it.note) ? ', ' + it.note : '')];
  }));
}
const chosenText = () => chosen().map(p => p[0] + ': ' + p[1]);
function summaryHtml(withName) {
  const anyRegional = PKG.some(p => p.regional && S.pk.has(p.id));
  const anyInd = lines().some(l => l[2]);
  const n = B.notes || {};
  return (withName ? '<h3>' + esc(M.name) + '</h3><p class="sub">' + esc(level()) + '</p>' : '') +
    '<div class="sum">' +
      chosen().map(p => '<div class="ln"><span>' + esc(p[0]) + '</span><b>' + esc(p[1]) + '</b></div>').join('') +
      lines().map(l => '<div class="ln"><span>' + esc(l[0]) + '</span><b class="num' + (l[2] ? ' ind' : '') + '">' + l[1] + '</b></div>').join('') +
      '<div class="tot"><span>Итого</span><b class="num">от ' + rub(total()) + '</b></div>' +
    '</div>' +
    '<div class="notes">' + (anyRegional && n.regional ? '<p>* ' + esc(n.regional) + '</p>' : '') +
      (anyInd && n.individual ? '<p>' + esc(n.individual) + '</p>' : '') + (n.offer ? '<p>' + esc(n.offer) + '</p>' : '') + '</div>';
}
function renderSummary() {
  $('#summary').innerHTML = summaryHtml(false);
  if ($('#sheet').classList.contains('on')) $('#sheetIn').innerHTML = summaryHtml(true);
}

/* ─────────── заявка ─────────── */
function renderLead() {
  const f = S.form;
  $('#lead').innerHTML = S.sent ? '' :
    '<form class="form" id="form" novalidate>' +
      '<div class="field"><input id="fName" name="name" autocomplete="name" placeholder=" " value="' + esc(f.name) + '"><label for="fName">Имя</label></div>' +
      '<div class="field"><input id="fPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder=" " value="' + esc(f.phone) + '"><label for="fPhone">Телефон</label></div>' +
      '<div class="field"><input id="fCity" name="city" autocomplete="address-level2" placeholder=" " value="' + esc(f.city) + '"><label for="fCity">Город или область — для расчёта доставки</label></div>' +
      '<label class="agree" id="fAgreeL"><input type="checkbox" id="fAgree"><span>Согласен на обработку персональных данных</span></label>' +
      '<p class="err" id="fErr" hidden></p>' +
      '<button class="btn main wide" type="submit" id="send">Отправить заявку</button>' +
    '</form>';
  if (S.sent) return;
  ['fName', 'fPhone', 'fCity'].forEach(id => $('#' + id).addEventListener('input', e => {
    S.form[{ fName: 'name', fPhone: 'phone', fCity: 'city' }[id]] = e.target.value; e.target.parentNode.classList.remove('bad'); }));
  $('#fPhone').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d+()\-\s]/g, ''); });
  $('#fAgree').addEventListener('change', () => $('#fAgreeL').classList.remove('bad'));
  $('#form').addEventListener('submit', e => { e.preventDefault(); submit(); });
}
async function submit() {
  const name = S.form.name.trim(), phone = S.form.phone.trim(), digits = phone.replace(/\D/g, '');
  const okN = name.length >= 2, okP = digits.length >= 10 && digits.length <= 15, agree = $('#fAgree').checked;
  $('#fName').parentNode.classList.toggle('bad', !okN);
  $('#fPhone').parentNode.classList.toggle('bad', !okP);
  $('#fAgreeL').classList.toggle('bad', !agree);
  const miss = []; if (!okN) miss.push('имя'); if (!okP) miss.push('телефон');
  let msg = miss.length ? 'Укажите ' + miss.join(' и ') + '.' : '';
  if (!agree) msg += (msg ? ' ' : '') + 'Отметьте согласие на обработку данных.';
  const err = $('#fErr');
  if (msg) { err.textContent = msg; err.hidden = false; (!okN ? $('#fName') : !okP ? $('#fPhone') : $('#fAgree')).focus(); return; }
  err.hidden = true;
  const lead = { name, phone, city: S.form.city.trim(), model: M.name, variant: m2(V().area) + (V().label ? ', ' + V().label : ''),
    options: chosenText(), packages: lines().map(l => l[0] + ': ' + l[1]), total: total(), total_text: 'от ' + rub(total()),
    link: location.href.split('#')[0] + toHash(), ts: new Date().toISOString() };
  if (B.lead_endpoint) {
    const btn = $('#send'); btn.disabled = true; btn.textContent = 'Отправляем…';
    try {
      const r = await fetch(B.lead_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
      if (!r.ok) throw new Error(r.status);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Отправить заявку';
      err.innerHTML = 'Заявка не отправилась. Позвоните нам: <a class="num" href="' + esc(B.phone_href) + '">' + esc(B.phone) + '</a>'; err.hidden = false; return;
    }
  }
  S.sent = true;
  $('#lead').innerHTML = '<div class="done"><b>' + (B.lead_endpoint ? 'Заявка отправлена' : 'Расчёт готов') + '</b>' +
    '<p>' + esc(M.name) + ', ' + esc(lead.variant) + ' — ' + esc(lead.total_text) + '. Контакт: ' + esc(name) + ', ' + esc(phone) + '.</p>' +
    (B.lead_endpoint ? '<p>Менеджер перезвонит и посчитает доставку.</p>'
      : '<p class="demo">Это демо-версия: заявка никуда не уходит. В рабочей версии она сразу попадает к менеджеру — в CRM, Telegram или на почту.</p>') +
    '<button id="again">Изменить данные</button></div>';
  $('#again').onclick = () => { S.sent = false; renderLead(); };
  $('#cta').textContent = 'Заявка готова';
}

/* ─────────── события ─────────── */
let activeSec = null;
function bindStudio() {
  const st = $('.stage');
  $$('.views button', st).forEach(b => b.onclick = () => { stage.manual = activeSec; showStage(b.dataset.t); });
  $('.arrow.prev', st).onclick = () => stepFrame(-1);
  $('.arrow.next', st).onclick = () => stepFrame(1);
  st.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') stepFrame(-1); if (e.key === 'ArrowRight') stepFrame(1); });
  let x0 = null, y0 = 0;
  st.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  st.addEventListener('pointerup', e => {
    if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) stepFrame(dx < 0 ? 1 : -1);
  });

  const panel = $('.panel');
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) { S.v = b.dataset.v; update(); showStage('plan'); stage.manual = activeSec; }
    else if (b.dataset.g && b.dataset.i) { S.sel[b.dataset.g] = b.dataset.i; update(); showStage(VIEW_TAB[G[b.dataset.g].view] || 'ext', G[b.dataset.g].view); stage.manual = activeSec; }
    else if (b.dataset.p) {
      const id = b.dataset.p; S.pk.has(id) ? S.pk.delete(id) : S.pk.add(id);
      if (G.interior && id === G.interior.requires && !S.pk.has(id)) S.sel.interior = G.interior.free || G.interior.items[0].id;
      update();
    }
    else if (b.dataset.st) {
      S.sel.interior = b.dataset.st;
      if (G.interior.requires && b.dataset.st !== G.interior.free) S.pk.add(G.interior.requires);
      update(); showStage('int'); stage.manual = activeSec;
    }
  });
  $('#share').onclick = () => {
    const url = location.href.split('#')[0] + toHash();
    const done = () => toast('Ссылка скопирована');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => prompt('Ссылка на конфигурацию', url));
    else prompt('Ссылка на конфигурацию', url);
  };
  $('#cta').onclick = goOrder;
  $('#priceBtn').onclick = openSheet;
  $('#sheetX').onclick = closeSheet;
  $('.sheet .scrim').onclick = closeSheet;
  $('#sheetGo').onclick = () => { closeSheet(); goOrder(); };
  document.addEventListener('keydown', escClose);

  const sc = $('#scroll');
  sc.addEventListener('scroll', onSpy, { passive: true });
  window.addEventListener('scroll', onSpy, { passive: true });
  window.addEventListener('resize', onSpy, { passive: true });
}
function escClose(e) { if (e.key === 'Escape') closeSheet(); }
function goOrder() {
  const t = $('#order'); if (!t) return;
  if (stacked.matches) {
    const y = t.getBoundingClientRect().top + window.pageYOffset - $('.top').offsetHeight - $('.stage').offsetHeight - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  } else {
    const sc = $('#scroll'); sc.scrollTo({ top: t.offsetTop - 12, behavior: 'smooth' });
  }
  setTimeout(() => { const n = $('#fName'); if (n && !S.form.name) n.focus({ preventScroll: true }); }, 650);
}
function openSheet() { $('#sheetIn').innerHTML = summaryHtml(true); const s = $('#sheet'); s.classList.add('on'); s.setAttribute('aria-hidden', 'false'); $('#sheetX').focus(); }
function closeSheet() { const s = $('#sheet'); if (!s || !s.classList.contains('on')) return; s.classList.remove('on'); s.setAttribute('aria-hidden', 'true'); $('#priceBtn').focus(); }
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); }

// Сцена следует за разделом, который сейчас читает человек: планировка → план, отделка → интерьер.
function onSpy() { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }
function spy() {
  spyRaf = 0;
  const secs = $$('.ph-head, .sec'); if (!secs.length) return;
  let line;
  if (stacked.matches) line = $('.top').offsetHeight + $('.stage').offsetHeight + 60;
  else { const r = $('#scroll').getBoundingClientRect(); line = r.top + Math.min(170, r.height * 0.3); }
  let cur = secs[0];
  secs.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
  if (cur === activeSec) return;
  activeSec = cur;
  if (stage.manual && stage.manual !== cur) stage.manual = null;
  if (stage.manual) return;
  const view = cur.dataset.view || 'hero';
  const tab = VIEW_TAB[view] || 'ext';
  if (tab === stage.tab && (view === 'hero' ? (stage.list[stage.i] || {}).kind === 'hero' : true) && view !== 'facade' && view !== 'terrace') return;
  showStage(tab, view === 'hero' ? 'hero' : view === 'facade' || view === 'terrace' ? view : null);
}

// Подгружаем кадры текущей модели заранее — переключения без ожидания.
function warm() {
  const srcs = Object.keys(M.img).filter(k => k[0] !== '_').map(k => M.img[k]);
  let i = 0;
  (function next() { if (i >= srcs.length || !M) return; const im = new Image(); im.onload = im.onerror = () => setTimeout(next, 40); im.src = srcs[i++]; })();
}

/* ═════════════════════ МАРШРУТЫ ═════════════════════ */
function route() {
  closeSheet();
  document.removeEventListener('keydown', escClose);
  const h = location.hash.replace(/^#\/?/, '');
  const [id, qs] = h.split('?');
  const m = C.models.find(x => x.id === (id || '').toLowerCase());
  if (m) {
    if (M && M.id === m.id && S && $('.studio')) return; // это наш же replaceState
    renderStudio(m, new URLSearchParams(qs || ''));
  } else { M = null; S = null; activeSec = null; renderGallery(); }
}
window.addEventListener('hashchange', route);
route();
})();
