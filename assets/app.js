/* Danny's Music Library — static catalog viewer. Data comes from catalog.js (window.CATALOG). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n.toLocaleString();

  const data = window.CATALOG;
  if (!data || !Array.isArray(data.albums)) {
    $('#stats').textContent = 'catalog.js is missing. Run build_catalog.ps1 first, then reload this page.';
    return;
  }

  /* ---------- prepare data ---------- */
  const SEC = { artists: 'Artist', top500: 'Rolling Stone 500', compilations: 'Compilation', soundtracks: 'Soundtrack' };
  const fold = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, "'");
  const albums = data.albums;
  const byId = new Map();
  const tracks = [];
  const artistMap = new Map();
  let coverCount = 0;
  albums.forEach((al, i) => {
    al.i = i;
    al.key = fold(`${al.a} ${al.t} ${al.y}`);
    al.sortA = fold(al.sa || al.a);
    al.letter = /^[a-z]/.test(al.sortA) ? al.sortA[0].toUpperCase() : '#';
    if (al.c) coverCount++;
    byId.set(al.id, al);
    al.tr.forEach((t, j) => {
      tracks.push({ al, j, t: t[2], a: t[3], key: fold(`${t[2]} ${t[3] || al.a} ${al.t}`) });
    });
    if (al.s === 'artists' || al.s === 'top500') {
      const k = fold(al.a);
      if (!artistMap.has(k)) artistMap.set(k, { name: al.a, albums: [] });
      artistMap.get(k).albums.push(al);
    }
  });
  const artists = [...artistMap.values()];

  /* ---------- covers & placeholders ---------- */
  const hue = id => parseInt(id.slice(0, 4), 16) % 360;
  const phStyle = al => { const h = hue(al.id); return `--phbg:linear-gradient(140deg,hsl(${h} 55% 34%),hsl(${(h + 50) % 360} 60% 16%))`; };
  // placeholder always sits underneath; the cover image (if any) fades in over it and removes itself if missing
  const coverHTML = (al, alt = true) => `<div class="ph" style="${phStyle(al)}"><span>${esc(al.t)}</span></div>` +
    (al.c ? `<img class="cov" src="covers/${al.id}.jpg" alt="${alt ? esc(al.t) + ' cover' : ''}" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()">` : '');

  /* ---------- stats + hero wall ---------- */
  function countUp(el, to) {
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 1100;
    const step = now => { const p = Math.min(1, (now - t0) / d); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  $('#stats').innerHTML = `<b data-n="${albums.length}">0</b> albums · <b data-n="${tracks.length}">0</b> songs · <b data-n="${artists.length}">0</b> artists`;
  document.querySelectorAll('#stats b').forEach(b => countUp(b, +b.dataset.n));
  $('#gen').textContent = data.generated ? `Catalog built ${data.generated}` : '';

  (function buildWall() {
    const pool = albums.filter(a => a.c);
    const src = pool.length >= 24 ? pool : albums;
    const pick = n => Array.from({ length: n }, () => src[(Math.random() * src.length) | 0]);
    const rows = 4, per = 16;
    let html = '';
    for (let r = 0; r < rows; r++) {
      const items = pick(per).map(al => al.c ? `<img src="covers/${al.id}.jpg" alt="" loading="lazy" decoding="async">` : `<div class="ph" style="${phStyle(al)}"></div>`).join('');
      html += `<div class="wall-row" style="--dur:${70 + r * 18}s">${items}${items}</div>`;
    }
    $('#wall').innerHTML = html;
  })();

  /* ---------- browse grid ---------- */
  const grid = $('#grid'), sentinel = $('#sentinel');
  const state = { sec: 'all', sort: 'artist', list: [], shown: 0 };
  const CHUNK = 96;
  const cardHTML = (al, idx) => `
    <article class="card" tabindex="0" data-id="${al.id}" data-idx="${idx}" data-letter="${al.letter}">
      <div class="sleeve">${coverHTML(al)}<div class="glare"></div>${al.s !== 'artists' ? `<span class="badge">${SEC[al.s] === 'Rolling Stone 500' ? 'RS 500' : SEC[al.s]}</span>` : ''}</div>
      <div class="meta"><div class="t">${esc(al.t)}</div><div class="a">${esc(al.a)}</div>${al.y ? `<div class="y">${al.y}</div>` : ''}</div>
    </article>`;

  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -5% 0px' });

  function applyBrowse() {
    let list = state.sec === 'all' ? albums.slice() : albums.filter(a => a.s === state.sec);
    const cmp = (x, y) => x < y ? -1 : x > y ? 1 : 0;
    if (state.sort === 'artist') list.sort((a, b) => cmp(a.sortA, b.sortA) || cmp(a.y, b.y) || cmp(fold(a.t), fold(b.t)));
    else if (state.sort === 'title') list.sort((a, b) => cmp(fold(a.t), fold(b.t)));
    else if (state.sort === 'new') list.sort((a, b) => cmp(b.y || '0', a.y || '0') || cmp(a.sortA, b.sortA));
    else if (state.sort === 'old') list.sort((a, b) => cmp(a.y || '9999', b.y || '9999') || cmp(a.sortA, b.sortA));
    else for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
    state.list = list; state.shown = 0;
    grid.innerHTML = '';
    $('#gridTitle').textContent = state.sec === 'all' ? 'All albums' : ({ artists: 'Artist albums', top500: 'Rolling Stone 500', compilations: 'Compilations', soundtracks: 'Soundtracks' })[state.sec];
    $('#gridCount').textContent = `${fmt(list.length)} albums`;
    renderMore();
    buildRail();
  }
  function renderMore(upTo) {
    const end = Math.min(state.list.length, Math.max(state.shown + CHUNK, upTo || 0));
    if (state.shown >= end) return;
    const frag = document.createElement('template');
    frag.innerHTML = state.list.slice(state.shown, end).map((al, k) => cardHTML(al, state.shown + k)).join('');
    const nodes = [...frag.content.children];
    grid.append(frag.content);
    nodes.forEach((n, k) => { if (reduce) n.classList.add('in'); else { n.style.transitionDelay = `${(k % 12) * 25}ms`; revealIO.observe(n); } });
    state.shown = end;
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting && !$('#browse').hidden) renderMore(); }, { rootMargin: '1200px' }).observe(sentinel);

  /* A–Z rail */
  function buildRail() {
    const rail = $('#rail');
    if (state.sort !== 'artist') { rail.hidden = true; return; }
    const first = new Map();
    state.list.forEach((al, i) => { if (!first.has(al.letter)) first.set(al.letter, i); });
    rail.innerHTML = [...first.keys()].map(l => `<button data-l="${l}" aria-label="Jump to ${l}">${l}</button>`).join('');
    rail.hidden = false;
    rail.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const idx = first.get(b.dataset.l);
      renderMore(idx + CHUNK);
      const el = grid.querySelector(`[data-idx="${idx}"]`);
      if (el) { const y = el.getBoundingClientRect().top + scrollY - $('#toolbar').offsetHeight - 70; scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
    };
  }

  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === c));
    state.sec = c.dataset.sec;
    if ($('#q').value) { $('#q').value = ''; runSearch(); }
    applyBrowse();
    jumpToBrowse();
  }));
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; applyBrowse(); jumpToBrowse(); });
  function jumpToBrowse() {
    const y = $('#main').getBoundingClientRect().top + scrollY - $('#toolbar').offsetHeight;
    if (scrollY > y) scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* 3D tilt + glare */
  let tiltEl = null, raf = 0, lastEv = null;
  function tilt() {
    raf = 0; if (!tiltEl || !lastEv) return;
    const r = tiltEl.getBoundingClientRect();
    const x = (lastEv.clientX - r.left) / r.width, y = (lastEv.clientY - r.top) / r.height;
    tiltEl.style.transform = `perspective(700px) rotateY(${(x - .5) * 16}deg) rotateX(${(.5 - y) * 16}deg) scale(1.04)`;
    tiltEl.style.setProperty('--gx', `${x * 100}%`); tiltEl.style.setProperty('--gy', `${y * 100}%`);
  }
  if (!reduce && matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', e => {
      const s = e.target.closest?.('.card .sleeve');
      if (s !== tiltEl) { if (tiltEl) tiltEl.style.transform = ''; tiltEl = s; }
      lastEv = e; if (tiltEl && !raf) raf = requestAnimationFrame(tilt);
    }, { passive: true });
  }

  /* ---------- search ---------- */
  const qEl = $('#q'), results = $('#results');
  let sel = -1, songRows = [];
  const hl = (text, toks) => {
    let s = esc(text);
    toks.forEach(t => { if (t.length < 2) return; const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'); s = s.replace(re, '<mark>$1</mark>'); });
    return s;
  };
  function runSearch() {
    const raw = qEl.value.trim();
    const q = fold(raw);
    if (!q) { results.hidden = true; $('#browse').hidden = false; $('#rail').hidden = state.sort !== 'artist'; return; }
    const t0 = performance.now();
    const toks = q.split(/\s+/).filter(Boolean);
    const match = k => toks.every(t => k.includes(t));
    const inSec = al => state.sec === 'all' || al.s === state.sec;
    const arts = artists.filter(a => match(fold(a.name)) && a.albums.some(inSec)).sort((a, b) => b.albums.length - a.albums.length);
    const als = albums.filter(a => inSec(a) && match(a.key));
    const sn = []; let songTotal = 0;
    for (const t of tracks) { if (inSec(t.al) && match(t.key)) { songTotal++; if (sn.length < 200) sn.push(t); } }
    const ms = (performance.now() - t0).toFixed(1);
    songRows = sn; sel = -1;
    const rawToks = raw.split(/\s+/).filter(Boolean);
    let html = `<p class="mono" style="color:var(--dim);margin:0;font-size:12px">${fmt(arts.length + als.length + songTotal)} matches in ${ms} ms</p>`;
    if (arts.length) html += `<div class="res-block"><h3>Artists <span>${arts.length}</span></h3><div class="artist-pills">${arts.slice(0, 16).map(a => {
      const c = a.albums.find(x => x.c) || a.albums[0];
      return `<button class="artist-pill" data-artist="${esc(a.name)}">${c.c ? `<img src="covers/${c.id}.jpg" alt="" loading="lazy">` : `<span class="ph" style="${phStyle(c)}"></span>`}${hl(a.name, rawToks)} <small>${a.albums.length}</small></button>`;
    }).join('')}</div></div>`;
    if (als.length) html += `<div class="res-block"><h3>Albums <span>${als.length}</span></h3><div class="grid">${als.slice(0, 24).map((al, i) => cardHTML(al, 'r' + i)).join('')}</div>${als.length > 24 ? `<p class="more-note">Showing 24 of ${fmt(als.length)}. Add another word to narrow it down.</p>` : ''}</div>`;
    if (sn.length) html += `<div class="res-block"><h3>Songs <span>${fmt(songTotal)}</span></h3><div class="songs">${sn.map((t, i) => `
      <div class="song" data-i="${i}" role="button" tabindex="-1"><div class="th">${coverHTML(t.al, false)}</div>
      <div style="min-width:0"><div class="st">${hl(t.t, rawToks)}</div><div class="sa">${hl(t.a || t.al.a, rawToks)} · ${hl(t.al.t, rawToks)}</div></div><span class="sy">${t.al.y || ''}</span></div>`).join('')}</div>
      ${songTotal > 200 ? `<p class="more-note">Showing 200 of ${fmt(songTotal)} songs.</p>` : ''}</div>`;
    if (!arts.length && !als.length && !sn.length) html += `<p class="empty">Nothing matches “${esc(raw)}”. Try fewer words or a different spelling.</p>`;
    results.innerHTML = html;
    results.querySelectorAll('.card').forEach(n => n.classList.add('in'));
    results.hidden = false; $('#browse').hidden = true; $('#rail').hidden = true;
  }
  let sq = 0;
  qEl.addEventListener('input', () => { cancelAnimationFrame(sq); sq = requestAnimationFrame(() => { runSearch(); jumpToBrowse(); }); });
  qEl.addEventListener('keydown', e => {
    if (!songRows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = Math.max(0, Math.min(songRows.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      results.querySelectorAll('.song').forEach(r => r.classList.toggle('sel', +r.dataset.i === sel));
      results.querySelector(`.song[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && sel >= 0) { const t = songRows[sel]; openAlbum(t.al.id, t.j); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== qEl && $('#sheet').hidden) { e.preventDefault(); qEl.focus(); qEl.select(); }
  });

  /* ---------- clicks ---------- */
  document.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) return openAlbum(card.dataset.id);
    const song = e.target.closest('.song');
    if (song) { const t = songRows[+song.dataset.i]; return openAlbum(t.al.id, t.j); }
    const ap = e.target.closest('[data-artist]');
    if (ap) { closeSheet(); qEl.value = ap.dataset.artist; runSearch(); jumpToBrowse(); }
  });
  document.addEventListener('keydown', e => {
    const card = e.target.closest?.('.card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openAlbum(card.dataset.id); }
  });
  $('#dice').addEventListener('click', e => {
    const b = e.currentTarget; b.classList.remove('roll'); void b.offsetWidth; b.classList.add('roll');
    const pool = state.sec === 'all' ? albums : albums.filter(a => a.s === state.sec);
    openAlbum(pool[(Math.random() * pool.length) | 0].id);
  });

  /* ---------- album sheet ---------- */
  const sheet = $('#sheet'), panel = $('#sheetPanel');
  let current = null, lastFocus = null;
  function accentFrom(img, al) {
    const fallback = () => { const h = hue(al.id); setAccent(`hsl(${h} 85% 62%)`, hslToRgb(h, .85, .62)); };
    try {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const wt = (mx - mn) / 255 * (mx > 40 ? 1 : .1) + .02;
        r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
      }
      let [h, s, l] = rgbToHsl(r / w, g / w, b / w);
      s = Math.max(s, .55); l = Math.min(Math.max(l, .55), .68);
      setAccent(`hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`, hslToRgb(h * 360, s, l));
    } catch { fallback(); }   // opened from disk (file://) the browser blocks pixel reads; use a stable colour per album
  }
  function setAccent(css, rgb) {
    document.documentElement.style.setProperty('--accent', css);
    document.documentElement.style.setProperty('--glow', rgb.join(','));
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return [f(0), f(8), f(4)];
  }

  function openAlbum(id, hit) {
    const al = byId.get(id); if (!al) return;
    current = al;
    if (sheet.hidden) lastFocus = document.activeElement;
    const discs = new Set(al.tr.map(t => t[0])).size > 1;
    let lastDisc = 0, rows = '';
    al.tr.forEach((t, j) => {
      if (discs && t[0] !== lastDisc) { lastDisc = t[0]; rows += `<li class="disc-h">Disc ${t[0]}</li>`; }
      rows += `<li class="track${j === hit ? ' hit' : ''}" style="--i:${Math.min(j, 40)}" ${j === hit ? 'id="hitTrack"' : ''}><span class="n">${t[1] || '·'}</span><div><div class="tt">${esc(t[2])}</div>${t[3] ? `<div class="ta">${esc(t[3])}</div>` : ''}</div></li>`;
    });
    const share = '\\\\Synology01\\music\\' + al.p;
    panel.innerHTML = `
      ${al.c ? `<div class="sheet-backdrop" style="background-image:url('covers/${al.id}.jpg')"></div>` : ''}
      <button class="x" id="closeSheet" aria-label="Close">×</button>
      <div class="sheet-head">
        <div class="disc-wrap"><div class="vinyl"></div><div class="big">${al.c ? `<img src="covers/${al.id}.jpg" alt="${esc(al.t)} cover" id="bigImg">` : `<div class="ph" style="${phStyle(al)}"><span>${esc(al.t)}</span></div>`}</div></div>
        <div class="sheet-info">
          <div class="kind">${al.s === 'artists' ? 'Album' : SEC[al.s]}</div>
          <h2 id="sheetTitle">${esc(al.t)}</h2>
          <div class="by">${al.s === 'artists' || al.s === 'top500' ? `<button data-artist="${esc(al.a)}">${esc(al.a)}</button>` : esc(al.a)}</div>
          <div class="facts">${al.y ? `<span class="fact">${al.y}</span>` : ''}<span class="fact">${al.tr.length} tracks</span>${discs ? `<span class="fact">${lastDisc} discs</span>` : ''}</div>
          <div class="path"><span>${esc(share)}</span><button id="copyPath">Copy path</button></div>
        </div>
      </div>
      <ol class="tracks">${rows}</ol>`;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => sheet.classList.add('open'));
    const big = $('#bigImg');
    if (big) { if (big.complete) accentFrom(big, al); else big.onload = () => accentFrom(big, al); } else accentFrom(null, al);
    $('#closeSheet').onclick = closeSheet;
    $('#copyPath').onclick = e => {
      const btn = e.currentTarget;
      navigator.clipboard?.writeText(share).then(() => { btn.textContent = 'Copied'; }, () => { btn.textContent = 'Select the path to copy'; });
      setTimeout(() => { btn.textContent = 'Copy path'; }, 1600);
    };
    if (location.hash !== '#album-' + al.id) history.replaceState(null, '', '#album-' + al.id);
    panel.scrollTop = 0;
    if (hit != null) setTimeout(() => $('#hitTrack')?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }), 350);
    $('#closeSheet').focus({ preventScroll: true });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('open'); sheet.hidden = true; current = null;
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    lastFocus?.focus?.({ preventScroll: true });
  }
  $('#sheetBg').addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') closeSheet();
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && current) {
      const list = state.list; const i = list.indexOf(current);
      if (i >= 0) { const n = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]; openAlbum(n.id); }
    }
  });
  addEventListener('hashchange', () => { const m = location.hash.match(/^#album-([0-9a-f]+)$/); if (m) openAlbum(m[1]); else closeSheet(); });

  /* hide the A–Z rail while the hero is on screen */
  new IntersectionObserver(es => $('#rail').classList.toggle('away', es[0].isIntersecting), { rootMargin: '-120px 0px 0px 0px' }).observe($('#top'));

  /* ---------- go ---------- */
  applyBrowse();
  const m = location.hash.match(/^#album-([0-9a-f]+)$/);
  if (m) openAlbum(m[1]);
})();
