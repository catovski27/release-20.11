/* Viagem: o mapa ilustrado da viagem de verão.

   Viagem.open(cfg) abre um overlay de ecrã inteiro: a câmara «sobe» através
   das nuvens, o mapa (aguarela + tinta, desenhado em canvas à resolução do
   ecrã) inclina-se até ficar plano, e o percurso desenha-se paragem a
   paragem, com uma polaroid em cada uma.

   cfg = { titulo, paragens: [{ nome, lat, lon, data, texto, fotos: [chaves], via?: [[lat,lon],...] }], raiz? }
   Depende de window.PORTUGAL (js/portugal.js) e window.PHOTOS (js/photos.js).
   Devolve { close(), repetir(), el }. Viagem.close() fecha o que estiver aberto. */
(function () {
  'use strict';

  const ROSA = '#c8506b', TINTA = '#2a2b3d', OURO = '#d4ae5c';
  const LAT0 = 38.5, K = Math.cos(LAT0 * Math.PI / 180);
  const FONT_MAO = '"Mrs Saint Delafield", "Segoe Script", cursive';
  const FONT_LIVRO = '"Ibarra Real Nova", "Palatino Linotype", Georgia, serif';
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const W2 = (lon, lat) => [(lon + 8) * K, LAT0 - lat];          // mundo: x para a direita, y para baixo
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeRise = t => 1 - Math.pow(1 - t, 4);
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function h(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function textoOuPh(tag, cls, s) {
    s = s == null ? '' : String(s);
    const e = h(tag, cls);
    if (s.trim().startsWith('✏️')) { const ph = h('span', 'ph', s.trim().replace(/^✏️\s*/, '')); e.appendChild(ph); }
    else e.textContent = s;
    return e;
  }
  function fmtData(d) {
    if (!d) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
    return m ? (+m[3]) + ' de ' + MESES[+m[2] - 1] + ' de ' + m[1] : String(d);
  }
  function raizAuto() { return /\/tests\//.test(location.pathname) ? '../' : ''; }

  /* ---------------- geografia (feita uma vez) ---------------- */
  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const P = window.PORTUGAL || { land: [], coast: [], border: [], outras: [], rivers: [] };
    const toPath = (lines, close, jit, seed) => {
      const p = new Path2D(), r = rng(seed || 1);
      for (const ln of lines) {
        ln.forEach((q, i) => {
          const w = W2(q[0], q[1]);
          if (jit) { w[0] += (r() - 0.5) * jit; w[1] += (r() - 0.5) * jit; }
          i ? p.lineTo(w[0], w[1]) : p.moveTo(w[0], w[1]);
        });
        if (close) p.closePath();
      }
      return p;
    };
    const land = toPath(P.land, true);
    const test = document.createElement('canvas').getContext('2d');
    const onLand = (x, y) => test.isPointInPath(land, x, y, 'evenodd');
    const r = rng(7);

    // manchas de aguarela sobre a terra: cor por região
    const blots = [];
    for (let i = 0; i < 260; i++) {
      const lon = -10 + r() * 13.5, lat = 35.6 + r() * 8.6;
      const w = W2(lon, lat);
      if (!onLand(w[0], w[1])) continue;
      let c;
      if (lat > 40.6) c = r() < 0.6 ? [150, 178, 128] : [182, 196, 146];         // norte verde
      else if (lat > 39.2) c = r() < 0.5 ? [196, 196, 140] : [214, 190, 132];
      else if (lon < -7 && lat > 37.6) c = r() < 0.6 ? [224, 188, 112] : [214, 168, 120]; // Alentejo: trigo e terra
      else if (lat < 37.5 && lon < -7.3) c = r() < 0.5 ? [232, 206, 150] : [200, 196, 140]; // Algarve
      else c = r() < 0.45 ? [214, 178, 110] : r() < 0.5 ? [186, 186, 128] : [222, 196, 150]; // Andaluzia/Espanha
      blots.push({ x: w[0], y: w[1], r: 0.25 + r() * 0.6, c, a: 0.18 + r() * 0.22 });
    }
    // montes: [lat, lon, rx, ry, quantos]
    const SERRAS = [[40.32, -7.6, 0.45, 0.22, 26], [41.75, -8.1, 0.35, 0.2, 16], [41.25, -7.85, 0.3, 0.25, 14], [37.31, -8.58, 0.18, 0.09, 9],
      [37.26, -7.95, 0.3, 0.1, 12], [38.1, -5.6, 1.4, 0.22, 34], [37.9, -6.6, 0.4, 0.15, 12], [39.35, -7.35, 0.18, 0.12, 6], [38.49, -9.0, 0.1, 0.04, 4],
      [37.05, -3.3, 0.6, 0.15, 18], [36.75, -5.2, 0.4, 0.2, 12], [40.3, -5.3, 1.0, 0.25, 26], [40.9, -3.8, 0.8, 0.2, 18], [42.9, -5.5, 1.6, 0.25, 30],
      [38.4, -2.6, 0.7, 0.25, 16], [40.5, -1.6, 0.9, 0.5, 20], [42.6, -0.4, 1.4, 0.25, 26], [39.6, -6.0, 0.6, 0.18, 10], [41.1, -6.9, 0.3, 0.3, 8]];
    const hills = [];
    for (const [la, lo, rx, ry, n] of SERRAS) {
      for (let i = 0; i < n * 3 && hills.filter(q => q.g === la).length < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        const w = W2(lo + Math.cos(a) * rx * d, la + Math.sin(a) * ry * d);
        if (!onLand(w[0], w[1]) || !onLand(w[0], w[1] - 0.06) || !onLand(w[0] + 0.06, w[1])) continue;
        if (hills.some(q => Math.hypot(q.x - w[0], q.y - w[1]) < 0.06)) continue;
        hills.push({ x: w[0], y: w[1], s: 0.03 + r() * 0.025, g: la });
      }
    }
    hills.sort((a, b) => a.y - b.y);
    // ondas no mar
    const waves = [];
    for (let i = 0; i < 900; i++) {
      const w = W2(-12 + r() * 16, 34.6 + r() * 10);
      let perto = false;
      for (let k = 0; k < 6 && !perto; k++) { const a = k / 6 * Math.PI * 2; if (onLand(w[0] + Math.cos(a) * 0.14, w[1] + Math.sin(a) * 0.14)) perto = true; }
      if (perto || onLand(w[0], w[1])) continue;
      if (waves.some(q => Math.hypot(q.x - w[0], q.y - w[1]) < 0.22)) continue;
      waves.push({ x: w[0], y: w[1], p: r() * 6.28, s: 0.8 + r() * 0.5 });
    }
    GEO = {
      land, onLand, blots, hills, waves,
      coast: toPath(P.coast, false), coastJ: toPath(P.coast, false, 0.006, 3),
      border: toPath(P.border, false), outras: toPath(P.outras || [], false),
      rivers: toPath((P.rivers || []).map(q => q.p), false),
    };
    return GEO;
  }

  const LUGARES = [ // [lat, lon, nome, prioridade]
    [41.15, -8.61, 'Porto', 1], [40.21, -8.43, 'Coimbra', 2], [38.57, -7.91, 'Évora', 1], [38.01, -7.86, 'Beja', 2], [38.52, -8.89, 'Setúbal', 2],
    [37.10, -8.67, 'Lagos', 2], [37.26, -6.95, 'Huelva', 2], [36.53, -6.29, 'Cádis', 1], [36.14, -5.35, 'Gibraltar', 2], [37.88, -4.78, 'Córdova', 1],
    [36.72, -4.42, 'Málaga', 2], [40.42, -3.70, 'Madrid', 1], [38.88, -6.97, 'Badajoz', 2], [37.18, -3.6, 'Granada', 2], [39.24, -8.69, 'Santarém', 3],
    [41.55, -8.42, 'Braga', 3], [39.47, -0.38, 'Valência', 2], [41.65, -0.88, 'Saragoça', 3], [35.78, -5.81, 'Tânger', 3]];
  const LETREIROS = [ // [lat, lon, texto, tipo, rotação]
    [39.75, -8.05, 'PORTUGAL', 'pais', -0.08], [39.35, -4.6, 'ESPANHA', 'pais', 0], [38.0, -10.75, 'Oceano Atlântico', 'mar', -1.45],
    [36.55, -7.35, 'Golfo de Cádis', 'mar', -0.12], [36.35, -2.4, 'Mar Mediterrâneo', 'mar', 0], [37.72, -4.45, 'ANDALUZIA', 'reg', 0],
    [38.15, -7.55, 'ALENTEJO', 'reg', 0], [37.38, -8.05, 'ALGARVE', 'reg', 0], [35.3, -5.2, 'MARROCOS', 'pais', 0]];

  /* ---------------- nuvens pintadas ---------------- */
  let NUVENS = null;
  function nuvens() {
    if (NUVENS) return NUVENS;
    NUVENS = [0, 1, 2].map(s => {
      const c = document.createElement('canvas'); c.width = 520; c.height = 300;
      const x = c.getContext('2d'), r = rng(40 + s);
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        const px = 260 + Math.cos(a) * d * 190, py = 160 + Math.sin(a) * d * 70 - (1 - d) * 20;
        const rad = 40 + r() * 70;
        const sombra = py > 175;
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        const col = sombra ? '196,204,222' : '255,253,250';
        g.addColorStop(0, `rgba(${col},${sombra ? 0.35 : 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
      return c;
    });
    return NUVENS;
  }

  /* ---------------- o overlay ---------------- */
  let ATUAL = null;

  function open(cfg) {
    if (ATUAL) ATUAL.close(true);
    cfg = cfg || {};
    const PH = window.PHOTOS || {};
    const raiz = cfg.raiz != null ? cfg.raiz : raizAuto();
    const paragens = (cfg.paragens || []).filter(p => isFinite(p.lat) && isFinite(p.lon));
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const G = geo();
    const opener = document.activeElement;

    // --- DOM
    const root = h('div', 'vg');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', cfg.titulo || 'A nossa viagem'); root.tabIndex = -1;
    const ceuEl = h('div', 'vg-ceu');
    const stage = h('div', 'vg-stage');
    const cv = h('canvas', 'vg-mapa'); stage.appendChild(cv);
    const cvN = h('canvas', 'vg-nuvens');
    const papel = h('div', 'vg-papel');
    const pins = h('div', 'vg-pins');
    const tray = h('div', 'vg-tray');
    const topo = h('header', 'vg-topo');
    const cart = h('div', 'vg-cartela');
    cart.appendChild(h('p', 'vg-sobre', 'vista de cima'));
    cart.appendChild(textoOuPh('h2', 'vg-titulo', cfg.titulo || 'A nossa viagem'));
    const acts = h('div', 'vg-acts');
    const bRep = h('button', 'vg-btn', '↺ repetir viagem'); bRep.type = 'button';
    const bFechar = h('button', 'vg-btn vg-btn--x', 'fechar ✕'); bFechar.type = 'button'; bFechar.setAttribute('aria-label', 'fechar o mapa');
    acts.append(bRep, bFechar); topo.append(cart, acts);
    const live = h('p', 'vg-sr'); live.setAttribute('aria-live', 'polite');
    root.append(ceuEl, stage, cvN, papel, topo, pins, tray, live);

    // polaroids e alfinetes
    const pols = paragens.map((p, i) => {
      const b = h('button', 'vg-pol'); b.type = 'button';
      b.setAttribute('aria-label', `${p.nome}${p.data ? ', ' + fmtData(p.data) : ''}: ver fotografias`);
      b.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (1.5 + (i * 7 % 3))) + 'deg');
      b.appendChild(h('span', 'vg-fita'));
      const fr = h('span', 'vg-pol-foto');
      const k = (p.fotos || [])[0], ph = PH[k];
      if (ph) { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = raiz + ph.src; fr.appendChild(im); }
      else fr.appendChild(h('span', 'vg-pol-vazio', '✏️ foto'));
      if ((p.fotos || []).length > 1) fr.appendChild(h('span', 'vg-pol-n', '+' + (p.fotos.length - 1)));
      b.appendChild(fr);
      const leg = h('span', 'vg-pol-leg');
      leg.appendChild(h('span', 'vg-pol-num', String(i + 1)));
      leg.appendChild(textoOuPh('span', 'vg-pol-nome', p.nome));
      if (p.data) leg.appendChild(textoOuPh('span', 'vg-pol-data', fmtData(p.data)));
      b.appendChild(leg);
      if (p.texto) b.appendChild(textoOuPh('span', 'vg-pol-txt', p.texto));
      b.addEventListener('click', () => galeria(i, 0));
      tray.appendChild(b);
      return b;
    });
    const pinEls = paragens.map((p, i) => {
      const b = h('button', 'vg-pin'); b.type = 'button';
      b.setAttribute('aria-label', `${i + 1}. ${p.nome}: ver fotografias`);
      b.addEventListener('click', () => galeria(i, 0));
      pins.appendChild(b); return b;
    });

    // lightbox
    const lb = h('div', 'vg-lb'); lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    const lbFig = h('figure', 'vg-lb-fig');
    const lbImg = new Image(); lbImg.alt = '';
    const lbCap = h('figcaption', 'vg-lb-cap');
    lbFig.append(lbImg, lbCap);
    const lbPrev = h('button', 'vg-lb-seta vg-lb-seta--prev', '‹'); lbPrev.type = 'button'; lbPrev.setAttribute('aria-label', 'fotografia anterior');
    const lbNext = h('button', 'vg-lb-seta vg-lb-seta--next', '›'); lbNext.type = 'button'; lbNext.setAttribute('aria-label', 'fotografia seguinte');
    const lbX = h('button', 'vg-btn vg-lb-x', 'voltar ao mapa ✕'); lbX.type = 'button';
    lb.append(lbFig, lbPrev, lbNext, lbX);
    root.appendChild(lb);

    document.body.appendChild(root);
    const html = document.documentElement;
    const prevOv = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';

    // --- estado
    const ctx = cv.getContext('2d'), ctxN = cvN.getContext('2d');
    const ring = document.createElement('canvas'), rctx = ring.getContext('2d');
    let W = 0, H = 0, DPR = 1, mob = false;
    let cam = { x: 0, y: 0, z: 100 };
    let tilt = 0, blur = 0, nuvensT = -1, haze = 0;
    let prog = 0, heart = null, chegou = -1, fim = false, liderA = 0;
    let paused = false, alive = true, runId = 0, raf = 0, tAnim = 0;
    const lado = [];         // lado da polaroid em foco por paragem

    // percurso: pontos de mundo, com pontos intermédios empurrados para terra
    const stopsW = paragens.map(p => W2(p.lon, p.lat));
    const route = (() => {
      const ctrl = [];
      stopsW.forEach((s, i) => {
        if (i > 0) {
          const p = paragens[i];
          if (Array.isArray(p.via) && p.via.length) p.via.forEach(v => ctrl.push(W2(v[1], v[0])));
          else {
            const a = stopsW[i - 1], L = Math.hypot(s[0] - a[0], s[1] - a[1]);
            const n = L > 1.2 ? 4 : L > 0.5 ? 2 : 1;
            const nx = -(s[1] - a[1]) / (L || 1), ny = (s[0] - a[0]) / (L || 1);
            for (let k = 1; k <= n; k++) {
              const t = k / (n + 1);
              let m = [lerp(a[0], s[0], t), lerp(a[1], s[1], t)];
              const ok = q => [[0, 0], [0.04, 0], [-0.04, 0], [0, 0.04], [0, -0.04]].every(d => G.onLand(q[0] + d[0], q[1] + d[1]));
              if (!ok(m)) {
                for (let d = 0.03; d < 1; d += 0.03) {
                  const c1 = [m[0] + nx * d, m[1] + ny * d], c2 = [m[0] - nx * d, m[1] - ny * d];
                  if (ok(c1)) { m = c1; break; } if (ok(c2)) { m = c2; break; }
                }
              }
              ctrl.push(m);
            }
          }
        }
        ctrl.push(s.slice(0, 2).concat([i]));
      });
      // Catmull-Rom
      const pts = [], stopAt = [];
      for (let i = 0; i < ctrl.length; i++) {
        if (ctrl[i][2] != null) stopAt[ctrl[i][2]] = pts.length;
        if (i === ctrl.length - 1) { pts.push(ctrl[i]); break; }
        const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
        for (let k = 0; k < 16; k++) {
          const t = k / 16, t2 = t * t, t3 = t2 * t;
          pts.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, total: cum[cum.length - 1], stopLen: stopAt.map(i => cum[i]) };
    })();
    function pointAt(L) {
      const { pts, cum } = route;
      if (pts.length < 2) return { x: pts[0] ? pts[0][0] : 0, y: pts[0] ? pts[0][1] : 0, a: 0 };
      let i = 1; while (i < cum.length - 1 && cum[i] < L) i++;
      const t = clamp((L - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0, 1);
      return { x: lerp(pts[i - 1][0], pts[i][0], t), y: lerp(pts[i - 1][1], pts[i][1], t), a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) };
    }

    // --- câmaras
    const S = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
    function fit(b, r) { // b: [x0,y0,x1,y1] mundo; r: [x0,y0,x1,y1] ecrã
      const z = Math.min((r[2] - r[0]) / Math.max(0.01, b[2] - b[0]), (r[3] - r[1]) / Math.max(0.01, b[3] - b[1]));
      return { x: (b[0] + b[2]) / 2 - ((r[0] + r[2]) / 2 - W / 2) / z, y: (b[1] + b[3]) / 2 - ((r[1] + r[3]) / 2 - H / 2) / z, z };
    }
    function routeBox() {
      const xs = stopsW.map(s => s[0]).concat(route.pts.map(p => p[0])), ys = stopsW.map(s => s[1]).concat(route.pts.map(p => p[1]));
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    const trayH = () => mob ? Math.min(250, H * 0.32) : 0;
    function camFinal() {
      const b = routeBox();
      return mob ? fit(b, [34, 120, W - 34, H - trayH() - 40]) : fit(b, [W * 0.3, 170, W * 0.7, H - 150]);
    }
    function camPortugal() {
      const a = W2(-9.7, 42.2), b = W2(-5.6, 36.8);
      return fit([a[0], a[1], b[0], b[1]], mob ? [12, 110, W - 12, H - 30] : [W * 0.2, 90, W * 0.8, H - 30]);
    }
    const zTour = () => camFinal().z * (mob ? 1.45 : 1.7);
    function camStop(i) {
      const z = zTour(), s = stopsW[i];
      if (mob) return { x: s[0], y: s[1] + (H / 2 - (H - trayH()) * 0.48) / z, z };
      const dir = lado[i] === 'esq' ? 1 : -1;
      return { x: s[0] + dir * W * 0.13 / z, y: s[1], z };
    }

    function resize() {
      W = root.clientWidth; H = root.clientHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
      mob = W < 720;
      root.classList.toggle('is-m', mob);
      for (const c of [cv, cvN, ring]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
      cv.style.width = cvN.style.width = W + 'px'; cv.style.height = cvN.style.height = H + 'px';
      stopsW.forEach((s, i) => { lado[i] = 'dir'; });
      const cf = camFinal();
      stopsW.forEach((s, i) => { const x = (s[0] - cf.x) * cf.z + W / 2; lado[i] = x > W * 0.6 ? 'esq' : 'dir'; });
      if (fim) { cam = camFinal(); layoutFinal(); }
    }

    /* ---------------- desenho ---------------- */
    function draw(t) {
      const z = cam.z, d = DPR;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      // mar
      const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
      g.addColorStop(0, '#87a9b8'); g.addColorStop(0.55, '#a3c1c6'); g.addColorStop(1, '#b8d0cc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const world = () => ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - cam.x * z), d * (H / 2 - cam.y * z));
      // manchas do mar (aguarela)
      world();
      const rs = rng(11);
      for (let i = 0; i < 40; i++) {
        const x = -4 + rs() * 12, y = -6 + rs() * 12, r = 0.6 + rs() * 1.4;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = rs() < 0.5;
        gg.addColorStop(0, dark ? 'rgba(70,110,140,0.16)' : 'rgba(220,236,232,0.2)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      // águas rasas junto à costa
      ctx.lineJoin = ctx.lineCap = 'round';
      [[34, 'rgba(214,232,226,0.22)'], [18, 'rgba(222,238,230,0.3)'], [8, 'rgba(232,242,232,0.45)']].forEach(([w, c]) => { ctx.lineWidth = w / z; ctx.strokeStyle = c; ctx.stroke(G.coast); });
      // linhas de água (anéis) via canvas auxiliar
      rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.clearRect(0, 0, ring.width, ring.height);
      rctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - cam.x * z), d * (H / 2 - cam.y * z));
      rctx.lineJoin = rctx.lineCap = 'round';
      for (const off of [9, 17]) {
        rctx.globalCompositeOperation = 'source-over'; rctx.strokeStyle = '#2f5d78'; rctx.lineWidth = (2 * off + 1) / z; rctx.stroke(G.coast);
        rctx.globalCompositeOperation = 'destination-out'; rctx.lineWidth = (2 * off - 0.6) / z; rctx.stroke(G.coast);
      }
      rctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.28; ctx.drawImage(ring, 0, 0); ctx.globalAlpha = 1;
      // ondas
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.strokeStyle = 'rgba(40,78,110,0.42)'; ctx.lineWidth = 1.1;
      const ws = clamp(z / 260, 0.55, 1.5);
      for (const w of G.waves) {
        const p = S(w.x, w.y);
        if (p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
        const ph = reduz ? w.p : t * 0.0012 + w.p, dx = Math.sin(ph) * 2.5, s = 7 * w.s * ws;
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(ph * 0.7);
        ctx.beginPath();
        for (let k = 0; k < 2; k++) {
          const x0 = p[0] + dx + k * s * 0.55, y0 = p[1] + k * s * 0.35;
          ctx.moveTo(x0 - s, y0); ctx.quadraticCurveTo(x0 - s / 2, y0 - s * 0.45, x0, y0); ctx.quadraticCurveTo(x0 + s / 2, y0 - s * 0.45, x0 + s, y0);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // terra
      world();
      ctx.fillStyle = '#efe2c2'; ctx.fill(G.land, 'evenodd');
      ctx.save(); ctx.clip(G.land, 'evenodd');
      for (const b of G.blots) {
        const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        gg.addColorStop(0, `rgba(${b.c},${b.a})`); gg.addColorStop(0.6, `rgba(${b.c},${b.a * 0.6})`); gg.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = gg; ctx.fillRect(b.x - b.r, b.y - b.r, 2 * b.r, 2 * b.r);
      }
      // aguarela que se acumula na orla
      ctx.strokeStyle = 'rgba(176,128,70,0.16)'; ctx.lineWidth = 16 / z; ctx.stroke(G.coast);
      ctx.strokeStyle = 'rgba(160,110,60,0.22)'; ctx.lineWidth = 5 / z; ctx.stroke(G.coast);
      // rios
      ctx.strokeStyle = 'rgba(70,118,150,0.55)'; ctx.lineWidth = 1.1 / z; ctx.stroke(G.rivers);
      ctx.strokeStyle = 'rgba(120,160,180,0.25)'; ctx.lineWidth = 3.5 / z; ctx.stroke(G.rivers);
      ctx.restore();
      // montes (desenhados em ecrã, tamanho em mundo)
      ctx.setTransform(d, 0, 0, d, 0, 0);
      for (const hl of G.hills) {
        const s = hl.s * z; if (s < 3.5) continue;
        const p = S(hl.x, hl.y);
        if (p[0] < -30 || p[0] > W + 30 || p[1] < -30 || p[1] > H + 30) continue;
        const x = p[0], y = p[1], hh = s * 0.75;
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.3, y - hh * 1.5, x + s * 0.05, y - hh); ctx.quadraticCurveTo(x + s * 0.45, y - hh * 0.6, x + s, y); ctx.closePath();
        ctx.fillStyle = 'rgba(204,170,112,0.45)'; ctx.fill();
        ctx.strokeStyle = 'rgba(92,70,48,0.55)'; ctx.lineWidth = clamp(s / 9, 0.6, 1.2);
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.3, y - hh * 1.5, x + s * 0.05, y - hh); ctx.quadraticCurveTo(x + s * 0.45, y - hh * 0.6, x + s, y); ctx.stroke();
        ctx.beginPath();
        for (let k = 1; k <= 3; k++) { const hx = x + s * (0.05 + k * 0.2); ctx.moveTo(hx, y - hh * (0.9 - k * 0.22)); ctx.lineTo(hx - s * 0.12, y - 0.5); }
        ctx.lineWidth = clamp(s / 14, 0.5, 0.9); ctx.stroke();
      }
      // fronteiras
      world();
      ctx.strokeStyle = 'rgba(200,80,107,0.13)'; ctx.lineWidth = 9 / z; ctx.stroke(G.border);
      ctx.setLineDash([7 / z, 5 / z]);
      ctx.strokeStyle = 'rgba(122,52,72,0.75)'; ctx.lineWidth = 1.3 / z; ctx.stroke(G.border);
      ctx.strokeStyle = 'rgba(80,60,60,0.4)'; ctx.lineWidth = 0.9 / z; ctx.stroke(G.outras);
      ctx.setLineDash([]);
      // costa a tinta
      ctx.strokeStyle = 'rgba(38,36,46,0.88)'; ctx.lineWidth = 1.35 / z; ctx.stroke(G.coast);
      ctx.strokeStyle = 'rgba(38,36,46,0.35)'; ctx.lineWidth = 0.7 / z; ctx.stroke(G.coastJ);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      letreiros();
      percurso(t);
      lideres();
      rosa();
    }

    const boxes = [];
    function cabe(x, y, w, hh) {
      for (const b of boxes) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + hh > b[1]) return false;
      boxes.push([x, y, w, hh]); return true;
    }
    function letreiros() {
      boxes.length = 0;
      // paragens ocupam espaço
      stopsW.forEach(s => { const p = S(s[0], s[1]); boxes.push([p[0] - 16, p[1] - 16, 32, 32]); });
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const zf = cam.z;
      for (const [la, lo, txt, tipo, rot] of LETREIROS) {
        const w = W2(lo, la), p = S(w[0], w[1]);
        let size, font, col, sp;
        if (tipo === 'pais') { size = clamp(zf / 13, 11, 26); font = `600 ${size}px ${FONT_LIVRO}`; col = 'rgba(92,62,52,0.55)'; sp = size * 0.55; }
        else if (tipo === 'mar') { size = clamp(zf / 13, 13, 30); font = `italic 400 ${size}px ${FONT_LIVRO}`; col = 'rgba(28,62,92,0.62)'; sp = size * 0.18; }
        else { size = clamp(zf / 24, 9, 14); font = `500 ${size}px ${FONT_LIVRO}`; col = 'rgba(110,80,50,0.5)'; sp = size * 0.5; }
        if (tipo === 'reg' && zf < 200) continue;
        ctx.font = font; ctx.fillStyle = col;
        const chars = [...txt], ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
        if (Math.abs(rot) < 0.3 && !cabe(p[0] - tw / 2, p[1] - size / 2, tw, size)) continue;
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot);
        let x = -tw / 2;
        chars.forEach((c, i) => { ctx.fillText(c, x + ws[i] / 2, 0); x += ws[i] + sp; });
        ctx.restore();
      }
      // cidades
      ctx.textAlign = 'left';
      for (const [la, lo, nome, pr] of LUGARES) {
        if (pr > (zf > 420 ? 3 : zf > 220 ? 2 : 1)) continue;
        const w = W2(lo, la), p = S(w[0], w[1]);
        if (p[0] < -50 || p[0] > W + 50 || p[1] < -20 || p[1] > H + 20) continue;
        const size = clamp(zf / 22, 11, 15);
        ctx.font = `italic 400 ${size}px ${FONT_LIVRO}`;
        const tw = ctx.measureText(nome).width;
        if (!cabe(p[0] - 4, p[1] - size / 2 - 2, tw + 12, size + 4)) continue;
        ctx.fillStyle = 'rgba(38,36,46,0.75)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(52,44,48,0.78)'; ctx.fillText(nome, p[0] + 6, p[1]);
      }
    }

    function heartPath(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.8, y - s * 1.2, x, y - s * 0.45);
      ctx.bezierCurveTo(x + s * 0.8, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
      ctx.closePath();
    }
    // onde fica o nome de cada paragem (sem chocar com os outros nomes nem marcadores)
    function nomesPos() {
      const size = clamp(cam.z / 8, 26, 44), out = [];
      ctx.font = `400 ${size}px ${FONT_MAO}`;
      const ms = stopsW.map(q => S(q[0], q[1]));
      paragens.forEach((p, i) => {
        const txt = String(p.nome).replace(/^✏️\s*/, ''), tw = ctx.measureText(txt).width, s = ms[i];
        const cands = [[s[0] + 14, s[1] - 8], [s[0] - 14 - tw, s[1] - 8], [s[0] - tw / 2, s[1] - 18], [s[0] - tw / 2, s[1] + size * 0.8]];
        if (!mob && lado[i] === 'esq') cands.unshift(cands.splice(1, 1)[0]);
        let pick = null;
        for (const [x, y] of cands) {
          const b = [x - 2, y - size * 0.62, tw + 4, size * 0.8];
          if (b[0] < 6 || b[0] + b[2] > W - 6) continue;
          if (out.some(o => b[0] < o.b[0] + o.b[2] && b[0] + b[2] > o.b[0] && b[1] < o.b[1] + o.b[3] && b[1] + b[3] > o.b[1])) continue;
          if (ms.some(m => m[0] > b[0] - 10 && m[0] < b[0] + b[2] + 10 && m[1] > b[1] - 10 && m[1] < b[1] + b[3] + 10)) continue;
          pick = { x, y, b }; break;
        }
        if (!pick) { const [x, y] = cands[0]; pick = { x, y, b: [x, y - size * 0.62, tw, size * 0.8] }; }
        out.push(Object.assign(pick, { txt, size }));
      });
      return out;
    }
    function percurso(t) {
      const nomes = nomesPos();
      const { pts, cum } = route;
      // estrada fantasma (o que falta)
      if (!fim && pts.length > 1) {
        ctx.beginPath(); pts.forEach((q, i) => { const p = S(q[0], q[1]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.setLineDash([1, 7]); ctx.strokeStyle = 'rgba(122,52,72,0.28)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      }
      if (prog > 0 && pts.length > 1) {
        ctx.beginPath();
        let i = 0; const p0 = S(pts[0][0], pts[0][1]); ctx.moveTo(p0[0], p0[1]);
        for (i = 1; i < pts.length && cum[i] <= prog; i++) { const p = S(pts[i][0], pts[i][1]); ctx.lineTo(p[0], p[1]); }
        const hd = pointAt(prog), ph = S(hd.x, hd.y); ctx.lineTo(ph[0], ph[1]);
        ctx.strokeStyle = 'rgba(200,80,107,0.18)'; ctx.lineWidth = 9; ctx.stroke();
        ctx.setLineDash([9, 6]); ctx.strokeStyle = ROSA; ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
      }
      // paragens
      paragens.forEach((p, i) => {
        const s = S(stopsW[i][0], stopsW[i][1]);
        const feito = i <= chegou;
        if (!feito) {
          ctx.beginPath(); ctx.arc(s[0], s[1], 5, 0, 7); ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(122,52,72,0.5)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
          return;
        }
        const pulse = reduz ? 0 : (Math.sin(t * 0.004 + i) + 1) / 2;
        ctx.beginPath(); ctx.arc(s[0], s[1], 13 + pulse * 3, 0, 7); ctx.fillStyle = `rgba(200,80,107,${0.14 + pulse * 0.08})`; ctx.fill();
        ctx.beginPath(); ctx.arc(s[0], s[1], 8.5, 0, 7); ctx.fillStyle = '#fbf6ea'; ctx.fill();
        ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(s[0], s[1], 5, 0, 7); ctx.fillStyle = ROSA; ctx.fill();
        // nome à mão
        const nr = nomes[i];
        ctx.font = `400 ${nr.size}px ${FONT_MAO}`; ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(251,246,234,0.75)'; ctx.textAlign = 'left';
        ctx.strokeText(nr.txt, nr.x, nr.y); ctx.fillStyle = '#2a2140'; ctx.fillText(nr.txt, nr.x, nr.y);
        ctx.textBaseline = 'middle';
      });
      // coração a viajar
      if (heart) {
        const p = S(heart.x, heart.y), bob = reduz ? 0 : Math.sin(t * 0.012) * 1.5;
        ctx.save(); ctx.shadowColor = 'rgba(60,20,30,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
        heartPath(p[0], p[1] - 13 + bob, 9); ctx.fillStyle = ROSA; ctx.fill(); ctx.restore();
        heartPath(p[0], p[1] - 13 + bob, 9); ctx.strokeStyle = TINTA; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }

    let finalRects = [];
    function lideres() {
      if (mob || !fim || liderA <= 0) return;
      ctx.save(); ctx.globalAlpha = liderA;
      finalRects.forEach((r, i) => {
        const s = S(stopsW[i][0], stopsW[i][1]);
        const tx = clamp(s[0], r[0] + 10, r[0] + r[2] - 10), ty = clamp(s[1], r[1] + 10, r[1] + r[3] - 10);
        const mx = (s[0] + tx) / 2 + (ty - s[1]) * 0.15, my = (s[1] + ty) / 2 - (tx - s[0]) * 0.15;
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(42,43,61,0.6)'; ctx.lineWidth = 1.1; ctx.stroke(); ctx.setLineDash([]);
      });
      ctx.restore();
    }

    function rosa() {
      const R = mob ? 26 : 42, x = mob ? W - R - 16 : 34 + R + 10, y = mob ? 118 + R : H - R - 46;
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(42,43,61,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, 7); ctx.setLineDash([1.5, 2.5]); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 - Math.PI / 2, L = k % 2 ? R * 0.6 : R, w = k % 2 ? R * 0.09 : R * 0.14;
        for (const sd of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
          ctx.lineTo(Math.cos(a + sd * Math.PI / 2) * w, Math.sin(a + sd * Math.PI / 2) * w);
          ctx.closePath();
          ctx.fillStyle = k % 2 ? (sd > 0 ? '#e9dcc0' : OURO) : (sd > 0 ? '#fbf6ea' : (k === 0 ? ROSA : '#3b3d55'));
          ctx.fill(); ctx.stroke();
        }
      }
      ctx.beginPath(); ctx.arc(0, 0, R * 0.07, 0, 7); ctx.fillStyle = OURO; ctx.fill(); ctx.stroke();
      ctx.font = `600 ${mob ? 11 : 14}px ${FONT_LIVRO}`; ctx.fillStyle = 'rgba(42,43,61,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('N', 0, -R - (mob ? 8 : 10));
      ctx.restore();
      // escala
      if (!mob) {
        const kmPx = cam.z / 111, opts = [10, 20, 25, 50, 100, 200, 250, 500];
        const km = opts.find(k => k * kmPx > 70) || 500, len = km * kmPx;
        const sx = x + R + 30, sy = y + R * 0.75;
        ctx.save(); ctx.strokeStyle = 'rgba(42,43,61,0.8)'; ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy - 3, len, 5);
        ctx.fillStyle = 'rgba(42,43,61,0.8)'; ctx.fillRect(sx, sy - 3, len / 2, 5);
        ctx.font = `italic 12px ${FONT_LIVRO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(km + ' km', sx + len + 6, sy + 3);
        ctx.restore();
      }
    }

    function drawNuvens() {
      ctxN.setTransform(DPR, 0, 0, DPR, 0, 0); ctxN.clearRect(0, 0, W, H);
      if (haze > 0) { ctxN.fillStyle = `rgba(250,248,244,${haze})`; ctxN.fillRect(0, 0, W, H); }
      if (nuvensT < 0) return;
      const sp = nuvens(), r = rng(5), tt = nuvensT;
      const list = [];
      for (let i = 0; i < 22; i++) {
        const x = (r() - 0.5) * 2.6, y = (r() - 0.5) * 2.2, d0 = 0.35 + r() * 2.6, sp_ = sp[i % 3];
        const dd = d0 - tt * 1.25;
        if (dd <= 0.08) continue;
        list.push({ x, y, d: dd, s: sp_ });
      }
      list.sort((a, b) => b.d - a.d);
      for (const c of list) {
        const sc = 0.55 / c.d, w = c.s.width * sc * (W / 1100), hh = c.s.height * sc * (W / 1100);
        const px = W / 2 + c.x * W * 0.5 / c.d, py = H / 2 + c.y * H * 0.5 / c.d;
        const a = clamp((3 - c.d) / 0.6, 0, 1) * clamp((c.d - 0.08) / 0.35, 0, 1);
        if (a <= 0) continue;
        ctxN.globalAlpha = a; ctxN.drawImage(c.s, px - w / 2, py - hh / 2, w, hh);
      }
      ctxN.globalAlpha = 1;
    }

    function posPins() {
      paragens.forEach((p, i) => {
        const s = S(stopsW[i][0], stopsW[i][1]);
        pinEls[i].style.transform = `translate(${s[0] - 22}px, ${s[1] - 22}px)`;
        pinEls[i].hidden = i > chegou;
      });
    }

    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - (frame.last || now)); frame.last = now;
      if (!paused) tAnim += dt;
      if (tick) tick();
      stage.style.transform = tilt > 0.01 ? `perspective(900px) rotateX(${tilt}deg) scale(${1 + tilt / 40})` : '';
      // horizonte suave: o topo do mapa inclinado desvanece no céu
      const mk = tilt > 0.3 ? `linear-gradient(to bottom, transparent 0%, #000 ${Math.round(tilt * 0.75)}%)` : '';
      if (stage.style.webkitMaskImage !== mk) { stage.style.webkitMaskImage = mk; stage.style.maskImage = mk; }
      cv.style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
      draw(now);
      drawNuvens();
      posPins();
    }
    let tick = null;

    // tween pausável; resolve false se a viagem foi cancelada
    function anim(ms, fn) {
      const id = runId;
      return new Promise(res => {
        const t0 = tAnim;
        tick = () => {
          if (id !== runId) { tick = null; return res(false); }
          const k = clamp((tAnim - t0) / ms, 0, 1);
          fn(k);
          if (k >= 1) { tick = null; res(true); }
        };
      });
    }
    const espera = ms => anim(ms, () => {});
    function camTo(to, ms, ease) {
      const from = { ...cam };
      return anim(ms, k => {
        const e = (ease || easeIO)(k);
        const lz = lerp(Math.log(from.z), Math.log(to.z), e);
        cam = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), z: Math.exp(lz) };
      });
    }

    /* ---------------- polaroids ---------------- */
    const PW = 240;
    function polSize(i) { return [pols[i].offsetWidth, pols[i].offsetHeight]; }
    function setPol(i, x, y, s) { pols[i].style.transform = `translate(${x}px, ${y}px) rotate(var(--rot)) scale(${s})`; }
    function focoPol(i) {
      if (mob) {
        pols[i].classList.add('is-on', 'is-foco');
        const it = pols[i];
        tray.scrollTo({ left: it.offsetLeft - (tray.clientWidth - it.offsetWidth) / 2, behavior: reduz ? 'auto' : 'smooth' });
        return;
      }
      const el = pols[i];
      el.classList.remove('is-final'); el.classList.add('is-on', 'is-foco');
      const [w, hh] = polSize(i);
      const s = S(stopsW[i][0], stopsW[i][1]);
      const x = lado[i] === 'esq' ? s[0] - 60 - w : s[0] + 60;
      const y = clamp(s[1] - hh * 0.5, 90, H - hh - 20);
      el.style.transition = 'none';
      setPol(i, x, y + 30, 0.6); el.style.opacity = '0';
      el.getBoundingClientRect();
      el.style.transition = ''; el.style.opacity = '';
      setPol(i, x, y, 1);
    }
    function layoutFinal() {
      if (mob) { pols.forEach(p => { p.classList.add('is-on'); p.classList.remove('is-foco'); p.style.transform = ''; }); return; }
      pols.forEach(p => p.classList.add('is-final'));
      const sc = clamp(W / 1366, 0.62, 0.82) * 0.86;
      const pts = stopsW.map(s => S(s[0], s[1]));
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      // posição por candidatos: à volta de cada paragem, a evitar paragens, percurso,
      // nomes, outras polaroids, a cartela e os botões
      const top = 84, M = 16;
      const rp = route.pts.filter((q, k) => k % 3 === 0).map(q => S(q[0], q[1]));
      const proibido = [[0, 0, 380, 110], [W - 270, 0, 270, 70], [0, H - 110, 340, 110]];
      const sobre = (r, x, y, pad) => x > r[0] - pad && x < r[0] + r[2] + pad && y > r[1] - pad && y < r[1] + r[3] + pad;
      const inter = (r, q) => Math.max(0, Math.min(r[0] + r[2], q[0] + q[2]) - Math.max(r[0], q[0])) * Math.max(0, Math.min(r[1] + r[3], q[1] + q[3]) - Math.max(r[1], q[1]));
      const rotulos = nomesPos().map(n => n.b);
      const rects = [];
      const ordem = pts.map((p, i) => i);
      for (const i of ordem) {
        const p = pts[i], [w0, h0] = polSize(i), w = w0 * sc, hh = h0 * sc;
        let best = null, bs = Infinity;
        for (let k = 0; k < 24; k++) {
          const a = k / 24 * Math.PI * 2;
          for (const d of [0.62, 0.8, 1.0, 1.25, 1.55]) {
            const dist = Math.max(w, hh) * d;
            const r = [p[0] + Math.cos(a) * dist - w / 2, p[1] + Math.sin(a) * dist - hh / 2, w, hh];
            let sc_ = dist * 0.6;
            if (r[0] < M || r[1] < top || r[0] + w > W - M || r[1] + hh > H - M) sc_ += 1e6;
            for (const q of pts) if (sobre(r, q[0], q[1], 30)) sc_ += 4e4;
            for (const q of rp) if (sobre(r, q[0], q[1], 8)) sc_ += 900;
            for (const q of rects) sc_ += inter(r, [q[0] - 14, q[1] - 14, q[2] + 28, q[3] + 28]) * 40;
            for (const q of proibido) sc_ += inter(r, q) * 4;
            for (const q of rotulos) sc_ += inter(r, q) * 30;
            // dá preferência a afastar-se do centro do percurso
            sc_ -= ((r[0] + w / 2 - cx) * Math.cos(a) + (r[1] + hh / 2 - cy) * Math.sin(a)) * 0.15;
            if (sc_ < bs) { bs = sc_; best = r; }
          }
        }
        rects[i] = best;
      }
      finalRects = rects;
      rects.forEach((r, i) => { pols[i].classList.add('is-on'); pols[i].classList.remove('is-foco'); setPol(i, r[0], r[1], sc); });
    }
    function arrumaPol(i) { // ao sair da paragem: vai para o canto, pequena
      if (mob) { pols[i].classList.remove('is-foco'); return; }
      pols[i].classList.remove('is-foco'); pols[i].classList.add('is-final', 'is-arrumada');
      const sc = 0.5, [w0] = polSize(i), w = w0 * sc;
      const x = W - 24 - (w + 10) * (i + 1) + 10, y = H - 20 - pols[i].offsetHeight * sc;
      setPol(i, x, y, sc);
    }

    /* ---------------- a viagem ---------------- */
    function reset() {
      prog = 0; heart = null; chegou = -1; fim = false; liderA = 0; finalRects = [];
      pols.forEach(p => { p.classList.remove('is-on', 'is-foco', 'is-final', 'is-arrumada'); p.style.transform = ''; });
      root.classList.remove('is-fim');
    }
    function estadoFinal() {
      tick = null; prog = route.total; chegou = paragens.length - 1; heart = null; fim = true; liderA = 1;
      tilt = 0; blur = 0; haze = 0; nuvensT = -1;
      cam = camFinal(); layoutFinal(); root.classList.add('is-fim');
    }
    async function viagem() {
      const id = ++runId;
      reset();
      if (reduz) { estadoFinal(); return; }
      const cp = camPortugal(), L0 = stopsW[0] || [0, 0];
      // 1) a subida
      cam = { x: L0[0], y: L0[1], z: cp.z * 9 }; tilt = 62; blur = 7; haze = 0.85; nuvensT = 0;
      const from = { ...cam };
      if (!await anim(2600, k => {
        const e = easeRise(k);
        cam = { x: lerp(from.x, cp.x, easeIO(k)), y: lerp(from.y, cp.y, easeIO(k)), z: Math.exp(lerp(Math.log(from.z), Math.log(cp.z), e)) };
        tilt = 62 * (1 - easeOut(k)); blur = 7 * Math.max(0, 1 - k * 2.2); haze = 0.85 * Math.max(0, 1 - k * 2.5); nuvensT = k * 2.6;
      })) return;
      tilt = 0; blur = 0; haze = 0; nuvensT = -1;
      live.textContent = 'Vista de cima: Portugal e o sul de Espanha.';
      if (!await espera(700)) return;
      // 2) paragem a paragem
      for (let i = 0; i < paragens.length; i++) {
        if (i === 0) { if (!await camTo(camStop(0), 1500)) return; }
        else {
          const a = route.stopLen[i - 1], b = route.stopLen[i], c0 = { ...cam }, c1 = camStop(i);
          const ms = clamp((b - a) * 1500, 1300, 3000);
          if (!await anim(ms, k => {
            const e = easeIO(k);
            prog = lerp(a, b, e);
            const hp = pointAt(prog); heart = hp;
            // a câmara segue o coração, a deslizar entre os enquadramentos das paragens
            const bx = lerp(c0.x - stopsW[i - 1][0], c1.x - stopsW[i][0], e), by = lerp(c0.y - stopsW[i - 1][1], c1.y - stopsW[i][1], e);
            const tx = hp.x + bx, ty = hp.y + by;
            const w = Math.min(1, k * 4, (1 - k) * 4);
            cam = { x: lerp(lerp(c0.x, c1.x, e), tx, w), y: lerp(lerp(c0.y, c1.y, e), ty, w), z: Math.exp(lerp(Math.log(c0.z), Math.log(c1.z), e)) * (1 - 0.18 * Math.sin(Math.PI * k)) };
          })) return;
          cam = c1;
        }
        heart = { x: stopsW[i][0], y: stopsW[i][1] }; prog = route.stopLen[i];
        chegou = i;
        live.textContent = `${i + 1}. ${paragens[i].nome}`;
        focoPol(i);
        if (!await espera(2900)) return;
        if (i < paragens.length - 1) arrumaPol(i);
      }
      // 3) tudo à vista
      heart = null;
      pols.forEach(p => p.classList.remove('is-arrumada'));
      fim = true;
      const cf = camFinal(), c0 = { ...cam };
      // calcula a disposição final com a câmara final
      cam = cf; layoutFinal(); cam = c0;
      root.classList.add('is-fim');
      if (!await camTo(cf, 1600)) return;
      await anim(700, k => { liderA = k; });
    }

    /* ---------------- galeria ---------------- */
    let gi = 0, gj = 0;
    function galeria(i, j) {
      const p = paragens[i]; if (!p) return;
      const fs = (p.fotos || []).filter(k => PH[k]);
      if (!fs.length) return;
      gi = i; gj = (j + fs.length) % fs.length;
      const ph = PH[fs[gj]];
      lbImg.src = raiz + ph.src; lbImg.width = ph.w; lbImg.height = ph.h;
      lbCap.textContent = '';
      const t = h('p', 'vg-lb-t');
      t.appendChild(h('span', 'vg-lb-nome', String(p.nome).replace(/^✏️\s*/, '')));
      if (p.data) t.appendChild(h('span', 'vg-lb-data', fmtData(p.data)));
      if (fs.length > 1) t.appendChild(h('span', 'vg-lb-cont', `${gj + 1} / ${fs.length}`));
      lbCap.appendChild(t);
      if (p.texto) lbCap.appendChild(textoOuPh('p', 'vg-lb-txt', p.texto));
      lbPrev.hidden = lbNext.hidden = fs.length < 2;
      lb.setAttribute('aria-label', `${p.nome}, fotografia ${gj + 1} de ${fs.length}`);
      if (lb.hidden) { lb.hidden = false; paused = true; lb.dataset.volta = ''; lbX.focus(); }
    }
    function fechaGaleria() { lb.hidden = true; paused = false; (pols[gi] || root).focus({ preventScroll: true }); }
    lbPrev.addEventListener('click', () => galeria(gi, gj - 1));
    lbNext.addEventListener('click', () => galeria(gi, gj + 1));
    lbX.addEventListener('click', fechaGaleria);
    lb.addEventListener('click', e => { if (e.target === lb) fechaGaleria(); });
    let sx0 = null;
    lb.addEventListener('pointerdown', e => { sx0 = e.clientX; });
    lb.addEventListener('pointerup', e => { if (sx0 != null && Math.abs(e.clientX - sx0) > 50 && !lbPrev.hidden) galeria(gi, gj + (e.clientX < sx0 ? 1 : -1)); sx0 = null; });

    /* ---------------- teclado, foco, fecho ---------------- */
    function focaveis() {
      const scope = lb.hidden ? root : lb;
      return [...scope.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter(e => !e.hidden && !e.closest('[hidden]') && e.offsetParent !== null && (lb.hidden ? !lb.contains(e) : true) && getComputedStyle(e).visibility !== 'hidden');
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); if (!lb.hidden) fechaGaleria(); else close(); return; }
      if (!lb.hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); if (!lbPrev.hidden) galeria(gi, gj + (e.key === 'ArrowRight' ? 1 : -1)); return; }
      if (e.key === 'Tab') {
        const f = focaveis(); if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    let rT = 0;
    const onResize = () => { clearTimeout(rT); rT = setTimeout(resize, 120); };
    window.addEventListener('resize', onResize);
    bRep.addEventListener('click', () => { viagem(); });
    bFechar.addEventListener('click', () => close());

    function close(imediato) {
      if (!alive) return;
      alive = false; runId++; cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      html.style.overflow = prevOv[0]; document.body.style.overflow = prevOv[1];
      const fora = () => root.remove();
      if (imediato || reduz) fora(); else { root.classList.add('is-saindo'); setTimeout(fora, 380); }
      if (opener && opener.focus) opener.focus({ preventScroll: true });
      if (ATUAL === api) ATUAL = null;
      if (typeof cfg.onClose === 'function') cfg.onClose();
    }

    resize();
    cam = camPortugal();
    requestAnimationFrame(() => root.classList.add('is-in'));
    raf = requestAnimationFrame(frame);
    root.focus({ preventScroll: true });
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load(`40px ${FONT_MAO}`), document.fonts.load(`italic 16px ${FONT_LIVRO}`), document.fonts.load(`600 16px ${FONT_LIVRO}`)]).catch(() => {});
    }
    viagem();

    const api = { el: root, close: () => close(), repetir: () => viagem() };
    ATUAL = api;
    return api;
  }

  window.Viagem = { open, close() { if (ATUAL) ATUAL.close(); } };
})();
