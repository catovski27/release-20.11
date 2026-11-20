/* ==========================================================================
   A MESA — o primeiro ecrã.
   Uma mesa de madeira ao ar livre, no meio da relva, à luz baixa do fim do
   dia (o sol está por trás, na paisagem pintada de js/ceu.js). Em cima:
   o livro dela (fechado, a capa azul e ouro) e o computador velho dele
   (CRT bege, teclado, rato), uma caneca a fumegar, uma jarra com flores do
   campo, uns óculos, pétalas. Às vezes pousa uma borboleta.

   const m = Mesa.mount(el, { capa:{para,subtitulo,ano,nota,botao}, sticker, onLivro, onPc });
   await m.pousarLivro();  await m.irAoPc();  await m.sairDoPc();
   m.esconder(bool);  m.destroy();

   Tudo é desenhado aqui (SVG gerado + CSS 3D para o livro). As coordenadas
   são de um "palco" de desenho (1200×800 no computador, 600×1000 no
   telemóvel) que é escalado para caber na janela, encostado ao fundo.
   A "câmara" (.mesa-camara) é o que se aproxima do ecrã do PC.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- composição */
  const LAY = {
    d: { // computador: livro à esquerda, PC à direita
      W: 1200, H: 800, fitW: 1180, top: 150,
      mesa: { by: 425, bl: 205, br: 995, fy: 615, fl: 70, fr: 1130, th: 24, pf: [112, 1088], pt: [236, 964], chaoF: 900, chaoT: 705, pw: 30, prado: 548 },
      pc: { x: 655, y: 166, w: 300 },
      teclado: { x: 640, y: 532, w: 290 },
      rato: { x: 962, y: 556, w: 44 },
      caneca: { x: 1000, y: 420, w: 60 },
      jarra: { x: 226, y: 262, w: 104 },
      oculos: { x: 536, y: 466, w: 96 },
      livro: { x: 420, y: 528, w: 180, rz: -9 },
      nota: { x: 168, y: 604, w: 168, r: -6, fs: 11 },
      relva: { y0: 742, y1: 820, h0: 46, h1: 128, x0: -500, x1: 1700, n: 520 },
      petalas: [[312, 476, 20], [352, 489, -40], [292, 492, 75], [578, 556, 10], [905, 612, -25], [1112, 604, 50]],
    },
    m: { // telemóvel (retrato): PC atrás, à direita; o livro à frente
      W: 600, H: 1000, fitW: 560, top: 300,
      mesa: { by: 600, bl: 40, br: 560, fy: 884, fl: -70, fr: 670, th: 30, pf: [-34, 634], pt: [84, 516], chaoF: 1150, chaoT: 960, pw: 34, prado: 720 },
      pc: { x: 262, y: 296, w: 310 },
      teclado: { x: 280, y: 676, w: 245 },
      rato: { x: 534, y: 698, w: 38 },
      caneca: { x: 158, y: 540, w: 64 },
      jarra: { x: 44, y: 388, w: 112 },
      oculos: { x: 358, y: 800, w: 110 },
      livro: { x: 196, y: 784, w: 208, rz: -8 },
      nota: { x: 330, y: 846, w: 190, r: 4, fs: 17 },
      relva: { y0: 975, y1: 1040, h0: 30, h1: 90, x0: -300, x1: 900, n: 240 },
      petalas: [[120, 612, 20], [168, 652, -40], [230, 640, 80], [470, 778, 10], [80, 860, -30]],
    },
  };
  // tamanhos naturais dos SVG (largura × altura)
  const VB = { pc: [300, 360], teclado: [300, 90], rato: [50, 44], caneca: [70, 110], jarra: [100, 200], oculos: [100, 40] };

  const C = {
    sombra: '#2a2348',
    bege: '#e9dcc4', begeLuz: '#fbf0dc', begeMeio: '#d7c6ab', begeSombra: '#a8957f', begeEsc: '#8a786a', rim: '#ffd9c7',
    ouro: '#d4ae5c',
  };

  const reduz = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f1 = (n) => Math.round(n * 10) / 10;
  const lerp = (a, b, t) => a + (b - a) * t;
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // contorno "à mão": subdivide as arestas e treme-as um pouco
  function wob(pts, amp, R, seg) {
    seg = seg || 22; const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const n = Math.max(1, Math.round(len / seg)), nx = -dy / len, ny = dx / len;
      for (let j = 0; j < n; j++) {
        const t = j / n, o = j ? (R() - 0.5) * 2 * amp : 0;
        out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
      }
    }
    return 'M' + out.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  }
  const poly = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let UID = 0;

  /* ---------------------------------------------------------------- filtros */
  // aguarela: bordas que tremem (deslocamento) + grão do papel (multiplicado)
  function svgDefs(u) {
    return `<svg class="mesa-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
<filter id="aq${u}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="g"/>
  <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.84  0 0 0 0 0.86  0 0 0 0 1" result="gc"/>
  <feColorMatrix in="g" type="luminanceToAlpha" result="ga"/>
  <feComposite in="gc" in2="ga" operator="in" result="g2"/>
  <feComposite in="g2" in2="d" operator="in" result="g3"/>
  <feBlend in="g3" in2="d" mode="multiply" result="b"/>
  <feComposite in="b" in2="d" operator="in"/>
</filter>
<filter id="bl${u}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="bs${u}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs></svg>`;
  }

  /* ------------------------------------------------------- relva e flores */
  const RELVA_LONGE = ['#7d8fa4', '#7290a0', '#86a0a6', '#6e8698'];
  const RELVA_PERTO = ['#4c6a6a', '#587a70', '#3f5a63', '#65846f', '#4f6f5f', '#6d8c74', '#3a5160'];
  function flor(tipo, x, y, h, sz, R) {
    const b = (R() - 0.5) * h * 0.35, hx = x + b, hy = y - h;
    let s = `<path d="M${f1(x)} ${f1(y)}Q${f1(x + b * 0.2)} ${f1(y - h * 0.55)} ${f1(hx)} ${f1(hy)}" stroke="#4d6a5a" stroke-width="${f1(1.1 * sz)}" fill="none"/>`;
    if (tipo === 0 || tipo === 1) { // margarida / cosmos
      const n = tipo ? 6 : 8, rr = (tipo ? 4.2 : 3.4) * sz, cor = tipo ? (R() < 0.5 ? '#ec9bb3' : '#f3b8c8') : '#f7f0ea';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 360 + R() * 10;
        s += `<ellipse cx="${f1(hx)}" cy="${f1(hy)}" rx="${f1(rr)}" ry="${f1(rr * 0.42)}" fill="${cor}" transform="rotate(${f1(a)} ${f1(hx)} ${f1(hy)}) translate(${f1(rr * 0.85)} 0) scale(1 0.7)"/>`;
      }
      s += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(1.7 * sz)}" fill="#f2c55c"/>`;
    } else if (tipo === 2) { // botão-de-ouro
      s += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(2.8 * sz)}" fill="#f3cd6b"/><circle cx="${f1(hx - 0.8 * sz)}" cy="${f1(hy - 0.9 * sz)}" r="${f1(1 * sz)}" fill="#fff0c0"/>`;
    } else if (tipo === 3) { // lavanda
      for (let i = 0; i < 6; i++) s += `<ellipse cx="${f1(hx + (i % 2 ? 1 : -1) * 1.1 * sz)}" cy="${f1(hy + i * 2.6 * sz)}" rx="${f1(1.6 * sz)}" ry="${f1(2.2 * sz)}" fill="${i % 2 ? '#a597d8' : '#b9aae6'}"/>`;
    } else if (tipo === 4) { // miosótis
      for (let i = 0; i < 4; i++) { const a = i * 1.7; s += `<circle cx="${f1(hx + Math.cos(a) * 3 * sz)}" cy="${f1(hy + Math.sin(a) * 2.2 * sz)}" r="${f1(1.7 * sz)}" fill="#9db3ec"/>`; }
      s += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(0.9 * sz)}" fill="#f6e08c"/>`;
    } else { // espiga
      s += `<ellipse cx="${f1(hx)}" cy="${f1(hy)}" rx="${f1(1.8 * sz)}" ry="${f1(5 * sz)}" fill="#cdb393" transform="rotate(${f1(b * 0.6)} ${f1(hx)} ${f1(hy)})"/>`;
    }
    return s;
  }
  function relva(R, o) {
    // o: x0,x1,y0,y1,h0,h1,n, longe(bool), flores (0..1), evitar (fn(x,y,h) -> h máx)
    const it = [];
    for (let i = 0; i < o.n; i++) {
      const x = lerp(o.x0, o.x1, R()), y = lerp(o.y0, o.y1, Math.pow(R(), 0.8));
      const dep = (y - o.y0) / Math.max(1, o.y1 - o.y0);
      let h = lerp(o.h0, o.h1, R() * 0.7 + dep * 0.3);
      if (o.limite) h = Math.min(h, o.limite(x, y));
      if (h < 4) continue;
      if (R() < (o.flores || 0)) it.push({ y, f: true, x, h: h * (0.7 + R() * 0.4) });
      it.push({ y, x, h, dep });
    }
    it.sort((a, b) => a.y - b.y);
    let s = '';
    const pal = o.longe ? RELVA_LONGE : RELVA_PERTO;
    for (const g of it) {
      if (g.f) { s += flor(Math.floor(R() * 6), g.x, g.y, g.h, o.sz || 1.6, R); continue; }
      const w = (o.longe ? 2.2 : 3.4) * (0.6 + R() * 0.8), b = (R() - 0.45) * g.h * 0.6;
      const cor = R() < 0.1 ? '#c7a9ab' : pal[Math.floor(R() * pal.length)];
      s += `<path d="M${f1(g.x - w)} ${f1(g.y)}Q${f1(g.x + b * 0.3)} ${f1(g.y - g.h * 0.55)} ${f1(g.x + b)} ${f1(g.y - g.h)}Q${f1(g.x + b * 0.3 + w * 0.5)} ${f1(g.y - g.h * 0.5)} ${f1(g.x + w)} ${f1(g.y)}Z" fill="${cor}"/>`;
    }
    return s;
  }

  /* ----------------------------------------------------- a mesa (o fundo) */
  function svgFundo(L, u) {
    const R = rng(L.W * 7 + 11), M = L.mesa, W = L.W, H = L.H;
    const P = (k) => Object.assign({}, L[k], { h: L[k].w * VB[k][1] / VB[k][0], k: L[k].w / VB[k][0] });
    const pc = P('pc'), te = P('teclado'), ra = P('rato'), ca = P('caneca'), ja = P('jarra'), oc = P('oculos');
    const x0 = -W * 0.45, x1 = W * 1.45;
    let s = `<svg class="mesa-fundo" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false" overflow="visible"><defs>
<linearGradient id="prado${u}" gradientUnits="userSpaceOnUse" x1="0" y1="${M.prado}" x2="0" y2="${H}">
  <stop offset="0" stop-color="#7f8fab" stop-opacity="0"/><stop offset="0.16" stop-color="#6f839c" stop-opacity="0.85"/>
  <stop offset="0.45" stop-color="#4e6676"/><stop offset="1" stop-color="#34475a"/></linearGradient>
<linearGradient id="tampo${u}" gradientUnits="userSpaceOnUse" x1="0" y1="${M.by}" x2="0" y2="${M.fy}">
  <stop offset="0" stop-color="#d7a68a"/><stop offset="0.25" stop-color="#b9876d"/><stop offset="0.7" stop-color="#9a6d5f"/><stop offset="1" stop-color="#835c58"/></linearGradient>
<radialGradient id="sol${u}" gradientUnits="userSpaceOnUse" cx="${W * 0.66}" cy="${M.by}" r="${(M.fr - M.fl) * 0.42}" gradientTransform="translate(0 ${M.by}) scale(1 0.42) translate(0 ${-M.by})">
  <stop offset="0" stop-color="#ffe2cc" stop-opacity="0.75"/><stop offset="0.5" stop-color="#ffc9b5" stop-opacity="0.22"/><stop offset="1" stop-color="#ffc9b5" stop-opacity="0"/></radialGradient>
<linearGradient id="aba${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a52"/><stop offset="1" stop-color="#4a3444"/></linearGradient>
<linearGradient id="perna${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3e2b3c"/><stop offset="0.7" stop-color="#5a3f4c"/><stop offset="0.86" stop-color="#8a6260"/><stop offset="1" stop-color="#c99486"/></linearGradient>
</defs>`;

    // o prado por trás da mesa
    const topo = [];
    for (let x = x0; x <= x1; x += 40) topo.push([x, M.prado + Math.sin(x * 0.006) * 10 + (R() - 0.5) * 6]);
    s += `<g filter="url(#aq${u})">`;
    s += `<path d="M${f1(x0)} ${H + 260}L${topo.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L')}L${f1(x1)} ${H + 260}Z" fill="url(#prado${u})"/>`;
    // tufos ao longe (dos lados da mesa)
    s += relva(R, { x0, x1, y0: M.prado + 40, y1: M.chaoT, h0: 8, h1: 26, n: Math.round((x1 - x0) / 9), longe: true, flores: 0.05, sz: 1.1 });
    // sombra da mesa no chão (o sol está atrás: a sombra vem para nós)
    s += `</g><g filter="url(#bl${u})" opacity="0.42"><path d="${poly([[M.pt[0] - 30, M.chaoT - 8], [M.pt[1] + 10, M.chaoT - 8], [M.pf[1] - 40, M.chaoF + 30], [M.pf[0] - 90, M.chaoF + 30]])}" fill="${C.sombra}"/></g>`;
    s += `<g filter="url(#aq${u})">`;
    // pernas de trás
    for (const px of M.pt) {
      const w = M.pw * 0.8;
      s += `<path d="${wob([[px - w / 2, M.by + 10], [px + w / 2, M.by + 10], [px + w * 0.42, M.chaoT], [px - w * 0.42, M.chaoT]], 0.8, R)}" fill="url(#perna${u})"/>`;
    }
    // relva à volta das pernas de trás
    for (const px of M.pt) s += relva(R, { x0: px - 60, x1: px + 60, y0: M.chaoT - 14, y1: M.chaoT + 18, h0: 12, h1: 34, n: 34, flores: 0.12, sz: 1.2 });
    // pernas da frente
    for (const px of M.pf) {
      const w = M.pw;
      s += `<path d="${wob([[px - w / 2, M.fy + M.th - 2], [px + w / 2, M.fy + M.th - 2], [px + w * 0.44, M.chaoF], [px - w * 0.44, M.chaoF]], 0.8, R)}" fill="url(#perna${u})"/>`;
    }
    // a aba (espessura do tampo, de frente)
    s += `<path d="${wob([[M.fl, M.fy - 1], [M.fr, M.fy - 1], [M.fr - 3, M.fy + M.th], [M.fl + 3, M.fy + M.th]], 0.9, R)}" fill="url(#aba${u})"/>`;
    // o tampo
    const tampo = [[M.bl, M.by], [M.br, M.by], [M.fr, M.fy], [M.fl, M.fy]];
    s += `<path d="${wob(tampo, 1.1, R)}" fill="url(#tampo${u})"/>`;
    // tábuas: fendas que fogem para o horizonte
    const nT = L.W > 900 ? 8 : 6;
    for (let i = 1; i < nT; i++) {
      const t = i / nT, a = [lerp(M.bl, M.br, t), M.by + 1], b = [lerp(M.fl, M.fr, t), M.fy - 1];
      s += `<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="#5b3b45" stroke-width="${L.W > 900 ? 2.2 : 2.6}" opacity="0.55"/>`;
      s += `<path d="M${f1(a[0] + 1.6)} ${f1(a[1])}L${f1(b[0] + 2.4)} ${f1(b[1])}" stroke="#f3c2a8" stroke-width="1" opacity="0.35"/>`;
    }
    // veios da madeira
    for (let i = 0; i < nT * 4; i++) {
      const t = (Math.floor(i / 4) + 0.15 + (i % 4) * 0.2 + R() * 0.1) / nT;
      let d = '';
      for (let j = 0; j <= 12; j++) {
        const v = j / 12, y = lerp(M.by + 2, M.fy - 2, v), xl = lerp(M.bl, M.fl, v), xr = lerp(M.br, M.fr, v);
        const x = lerp(xl, xr, t) + Math.sin(v * 9 + i) * 1.6 * (0.4 + v);
        d += (j ? 'L' : 'M') + f1(x) + ' ' + f1(y);
      }
      s += `<path d="${d}" stroke="#6e4a4c" stroke-width="${f1(0.7 + R() * 0.6)}" fill="none" opacity="${f1(0.18 + R() * 0.2)}"/>`;
    }
    // nós na madeira
    for (let i = 0; i < 3; i++) {
      const v = 0.3 + R() * 0.6, t = 0.1 + R() * 0.8, y = lerp(M.by, M.fy, v), x = lerp(lerp(M.bl, M.fl, v), lerp(M.br, M.fr, v), t);
      s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(5 + v * 5)}" ry="${f1(1.6 + v * 1.6)}" fill="none" stroke="#5e3e46" stroke-width="1.2" opacity="0.45"/>`;
    }
    // a luz do sol a bater no tampo, por trás
    s += `<path d="${poly(tampo)}" fill="url(#sol${u})"/>`;
    // contra-luz: a aresta de trás acesa, a da frente com um brilho fino
    s += `<path d="M${M.bl + 2} ${M.by + 0.5}L${M.br - 2} ${M.by + 0.5}" stroke="#ffe6d2" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`;
    s += `<path d="M${M.fl + 4} ${M.fy}L${M.fr - 4} ${M.fy}" stroke="#e9b29c" stroke-width="1.4" opacity="0.7"/>`;
    s += `</g>`;

    // sombras dos objetos no tampo (para a frente e um pouco para a esquerda)
    const sq = (xa, xb, yb, prof, comp, dx) => poly([[xa, yb - prof], [xb, yb - prof], [xb + (dx == null ? -comp * 0.35 : dx), yb + comp], [xa + (dx == null ? -comp * 0.5 : dx), yb + comp]]);
    let sh = '';
    sh += `<path d="${sq(pc.x + 6 * pc.k, pc.x + 292 * pc.k, pc.y + 346 * pc.k, 40 * pc.k, 56 * pc.k)}"/>`;
    sh += `<path d="${sq(te.x + 10 * te.k, te.x + 292 * te.k, te.y + 74 * te.k, 30 * te.k, 14 * te.k)}"/>`;
    sh += `<ellipse cx="${f1(ra.x + ra.w * 0.42)}" cy="${f1(ra.y + ra.h * 0.95)}" rx="${f1(ra.w * 0.5)}" ry="${f1(ra.h * 0.22)}"/>`;
    sh += `<path d="${sq(ca.x + 6 * ca.k, ca.x + 56 * ca.k, ca.y + 104 * ca.k, 8 * ca.k, 30 * ca.k)}"/>`;
    sh += `<path d="${sq(ja.x + 30 * ja.k, ja.x + 70 * ja.k, ja.y + 196 * ja.k, 6 * ja.k, 44 * ja.k)}"/>`;
    sh += `<ellipse cx="${f1(oc.x + oc.w * 0.45)}" cy="${f1(oc.y + oc.h * 0.85)}" rx="${f1(oc.w * 0.48)}" ry="${f1(oc.h * 0.24)}"/>`;
    s += `<g filter="url(#bl${u})" fill="${C.sombra}" opacity="0.4">${sh}</g>`;

    // o fio do rato, até à caixa do PC
    const r0 = [ra.x + ra.w * 0.5, ra.y + 3 * ra.k], p0 = [pc.x + 286 * pc.k, pc.y + 340 * pc.k];
    const fio = `M${f1(r0[0])} ${f1(r0[1])}C${f1(r0[0] + 4)} ${f1(r0[1] - 22 * ra.k)} ${f1(r0[0] + 34 * ra.k)} ${f1(r0[1] - 16 * ra.k)} ${f1(r0[0] + 22 * ra.k)} ${f1(r0[1] - 30 * ra.k)}S${f1(p0[0] + 24)} ${f1(p0[1] + 4)} ${f1(p0[0])} ${f1(p0[1])}`;
    s += `<path d="${fio}" stroke="#2d2440" stroke-width="5" fill="none" opacity="0.25" transform="translate(-3 4)" filter="url(#bs${u})"/>`;
    s += `<path d="${fio}" stroke="#8b7a70" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${fio}" stroke="#ffe2cf" stroke-width="0.8" fill="none" opacity="0.6" transform="translate(0.6 -0.8)"/>`;

    // pétalas caídas
    for (const [px, py, pr] of L.petalas) {
      const cor = R() < 0.5 ? '#ef9fb4' : '#f6c6d1';
      s += `<g transform="translate(${px} ${py}) rotate(${pr}) scale(1 0.55)"><path d="M0 0C4 -6 12 -6 14 0C12 5 4 6 0 0Z" fill="${cor}"/><path d="M1 0C5 -2 10 -2 13 0" stroke="#c96f8a" stroke-width="0.6" fill="none" opacity="0.6"/></g>`;
    }

    // relva e flores da frente (à frente das pernas; não sobe ao tampo)
    const rv = L.relva;
    s += `<g filter="url(#aq${u})">` + relva(R, {
      x0: rv.x0, x1: rv.x1, y0: rv.y0, y1: rv.y1, h0: rv.h0, h1: rv.h1, n: rv.n, flores: 0.14, sz: L.W > 900 ? 1.7 : 1.9,
      limite: (x, y) => { const lim = y - (M.fy + M.th + 10); return (x > M.fl - 10 && x < M.fr + 10) ? lim : lim + 60; },
    }) + `</g>`;
    s += `</svg>`;
    return s;
  }

  /* ------------------------------------------------------------- o computador */
  function svgPc(u) {
    // ponto de fuga à esquerda (o PC está à direita do centro): vê-se o lado esquerdo e o topo
    return `<svg viewBox="0 0 300 360" aria-hidden="true" focusable="false" overflow="visible"><defs>
<linearGradient id="pcF${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1e5ce"/><stop offset="0.55" stop-color="#e2d3b8"/><stop offset="1" stop-color="#cbb99f"/></linearGradient>
<linearGradient id="pcF2${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8be"/><stop offset="1" stop-color="#c3b097"/></linearGradient>
<linearGradient id="pcT${u}" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="#f5e8d2"/><stop offset="1" stop-color="#fff2e2"/></linearGradient>
<linearGradient id="pcL${u}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ab977f"/><stop offset="1" stop-color="#8b7869"/></linearGradient>
<linearGradient id="pcR${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9a68d"/><stop offset="1" stop-color="#d8c7ab"/></linearGradient>
</defs>
<g filter="url(#aq${u})">
  <!-- a caixa (desktop) -->
  <path d="M24 290L292 290L272 264L6 264Z" fill="url(#pcT${u})"/>
  <path d="M24 290L6 264L6 322L24 348Z" fill="url(#pcL${u})"/>
  <rect x="22" y="289" width="270" height="59" rx="5" fill="url(#pcF2${u})"/>
  <path d="M30 290.5H286" stroke="${C.rim}" stroke-width="2" opacity="0.9"/>
  <path d="M30 311H160" stroke="#bba98f" stroke-width="1.4"/>
  <rect x="176" y="297" width="102" height="19" rx="2" fill="#d6c6ab" stroke="#ad9a83" stroke-width="1.2"/>
  <rect x="188" y="304.5" width="64" height="3.6" rx="1.8" fill="#4f4446"/>
  <rect x="260" y="302" width="11" height="8" rx="1.5" fill="#c4b296" stroke="#a8957f" stroke-width="0.8"/>
  <rect x="176" y="322" width="102" height="19" rx="2" fill="#d6c6ab" stroke="#ad9a83" stroke-width="1.2"/>
  <rect x="188" y="329.5" width="64" height="3.6" rx="1.8" fill="#4f4446"/>
  <rect x="260" y="327" width="11" height="8" rx="1.5" fill="#c4b296" stroke="#a8957f" stroke-width="0.8"/>
  <rect x="34" y="318" width="22" height="20" rx="2.5" fill="#cfbea2" stroke="#a5927c" stroke-width="1.2"/>
  <path d="M38 333H52" stroke="#a5927c" stroke-width="1.2"/>
  <!-- o monitor CRT: o tubo atrás, o topo, o lado, a frente -->
  <path d="M66 40C70 22 84 14 104 13L186 11C204 12 214 22 220 36Z" fill="#cdbca3"/>
  <path d="M66 40C70 22 84 14 104 13C88 18 80 28 78 40Z" fill="#a8957f"/>
  <path d="M104 13.6L186 11.6" stroke="#fff3e2" stroke-width="1.6" opacity="0.8"/>
  <path d="M52 58L266 58L242 33L27 38Z" fill="url(#pcT${u})"/>
  <path d="M50 60L50 272L28 256L27 38Z" fill="url(#pcL${u})"/>
  <rect x="48" y="56" width="220" height="222" rx="15" fill="url(#pcF${u})"/>
  <path d="M60 57.5H254Q266.5 57.5 266.5 70V262" stroke="${C.rim}" stroke-width="2.6" fill="none" opacity="0.95"/>
  <path d="M33 38.5L240 33.5" stroke="#fff5ea" stroke-width="2" opacity="0.8"/>
  <!-- o vão do ecrã -->
  <rect x="66" y="72" width="184" height="148" rx="14" fill="#c8b69b"/>
  <rect x="67.5" y="73.5" width="181" height="145" rx="13" fill="none" stroke="#a8967f" stroke-width="3"/>
  <path d="M74 219.5H242" stroke="#f3e6cf" stroke-width="1.6" opacity="0.8"/>
  <rect x="80" y="84" width="156" height="120" rx="17" fill="#1d2325"/>
  <!-- grelha, placa, botão -->
  <g stroke="#b3a089" stroke-width="2.4" stroke-linecap="round"><path d="M72 240l4 16"/><path d="M81 240l4 16"/><path d="M90 240l4 16"/><path d="M99 240l4 16"/><path d="M108 240l4 16"/><path d="M117 240l4 16"/></g>
  <rect x="148" y="241" width="66" height="14" rx="3" fill="#ddcdb2" stroke="#bba98f" stroke-width="1"/>
  <text x="181" y="251" font-size="6.6" text-anchor="middle" fill="#8f7c69" font-family="Spline Sans Mono, monospace" letter-spacing="0.6">COMPUTADOR</text>
  <circle cx="236" cy="249" r="7" fill="#d2c1a5" stroke="#a8957f" stroke-width="1.2"/>
  <!-- o post-it na caixa -->
  <g transform="rotate(-6 100 318)">
    <rect x="77" y="298" width="46" height="42" fill="#3a2f2a" opacity="0.18" transform="translate(1.5 2)"/>
    <rect x="77" y="296" width="46" height="42" fill="#f6df8c"/>
    <path d="M77 296h46v7h-46z" fill="#efd376"/>
    <text x="100" y="324" font-size="15" text-anchor="middle" fill="#3b3a6e" font-family="Mrs Saint Delafield, cursive">20·11</text>
    <path d="M110 330c-2-2.4-5 0-2.6 2.6l2.6 2.4l2.6-2.4c2.4-2.6-0.6-5-2.6-2.6z" fill="#d75a78"/>
  </g>
</g>
<circle class="mesa-led" cx="256" cy="249" r="3" fill="#8ff0a8"/>
<circle class="mesa-led mesa-led--halo" cx="256" cy="249" r="7" fill="#8ff0a8" opacity="0.25"/>
<circle cx="267" cy="306" r="1.8" fill="#e8a24f" opacity="0.8"/>
</svg>`;
  }

  function svgTeclado(u) {
    const R = rng(91); let k = '';
    // tampo do teclado: aresta de trás mais curta e puxada para a esquerda
    const B = [[28, 10], [266, 10]], F = [[6, 60], [292, 60]];
    const at = (u_, v) => [lerp(lerp(B[0][0], F[0][0], v), lerp(B[1][0], F[1][0], v), u_), lerp(10, 60, v)];
    const rows = [13, 13, 12, 12];
    for (let r = 0; r < 5; r++) {
      const v0 = 0.12 + r * 0.17, v1 = v0 + 0.13;
      if (r === 4) { // espaço
        const pts = [at(0.3, v0), at(0.7, v0), at(0.7, v1), at(0.3, v1)];
        k += `<path d="${poly(pts)}" fill="#efe3cd"/><path d="M${f1(pts[3][0])} ${f1(pts[3][1] + 0.6)}L${f1(pts[2][0])} ${f1(pts[2][1] + 0.6)}" stroke="#a8957f" stroke-width="1.6"/>`;
        continue;
      }
      const n = rows[r], u0 = 0.06 + (r % 2) * 0.02, u1 = 0.94;
      for (let i = 0; i < n; i++) {
        const a = lerp(u0, u1, i / n) + 0.004, b = lerp(u0, u1, (i + 1) / n) - 0.012;
        const pts = [at(a, v0), at(b, v0), at(b, v1), at(a, v1)];
        const cor = (r === 0 && i > 9) || (i === n - 1 && r > 0) ? '#cbb89c' : (R() < 0.08 ? '#e7d6bb' : '#f1e6d1');
        k += `<path d="${poly(pts)}" fill="${cor}"/><path d="M${f1(pts[3][0])} ${f1(pts[3][1] + 0.6)}L${f1(pts[2][0])} ${f1(pts[2][1] + 0.6)}" stroke="#a8957f" stroke-width="1.4"/>`;
      }
    }
    return `<svg viewBox="0 0 300 90" aria-hidden="true" focusable="false" overflow="visible"><g filter="url(#aq${u})">
  <path d="M6 60L292 60L290 74L8 74Z" fill="#b8a48c"/>
  <path d="M28 10L6 60L8 74L22 26Z" fill="#9c8a79"/>
  <path d="M28 10L266 10L292 60L6 60Z" fill="#d9c9ae"/>
  <path d="M30 10.6L264 10.6" stroke="${C.rim}" stroke-width="2"/>
  ${k}
  <path d="M8 60.5H290" stroke="#f6e9d4" stroke-width="1" opacity="0.7"/>
</g></svg>`;
  }

  function svgRato(u) {
    return `<svg viewBox="0 0 50 44" aria-hidden="true" focusable="false" overflow="visible"><g filter="url(#aq${u})">
  <path d="M25 6C39 6 45 16 44.5 26C44 37 36 42 25 42C14 42 6 37 5.5 26C5 16 11 6 25 6Z" fill="#b9a68e"/>
  <path d="M25 4C39 4 44 14 44 23C44 33 36 38 25 38C14 38 6 33 6 23C6 14 11 4 25 4Z" fill="#ebdec7"/>
  <path d="M25 4.5V17M8 17Q25 21 42 17" stroke="#b09d86" stroke-width="1.3" fill="none"/>
  <path d="M14 7Q25 2.5 36 7" stroke="${C.rim}" stroke-width="1.6" fill="none"/>
</g></svg>`;
  }

  function svgCaneca(u) {
    return `<svg viewBox="0 0 70 110" aria-hidden="true" focusable="false" overflow="visible">
<g class="mesa-vapor" fill="none" stroke-linecap="round">
  <path class="mesa-vapor__f" d="M24 46C18 38 30 32 24 22C19 14 27 8 24 0"/>
  <path class="mesa-vapor__f" d="M34 48C40 40 28 34 34 24C39 16 31 10 34 2"/>
  <path class="mesa-vapor__f" d="M42 46C37 40 46 34 42 26"/>
</g>
<g filter="url(#aq${u})">
  <path d="M51 62C66 60 68 86 50 90" stroke="#a96a70" stroke-width="7" fill="none"/>
  <path d="M51 62C64 61 65 84 50 88" stroke="#d99597" stroke-width="3" fill="none"/>
  <path d="M10 54V96C10 104 54 104 54 96V54Z" fill="#c88589"/>
  <path d="M10 54V96C10 101 20 103 26 103V56Z" fill="#a8686f" opacity="0.6"/>
  <path d="M48 56V96" stroke="#ffd2c6" stroke-width="2.2" opacity="0.8"/>
  <ellipse cx="32" cy="54" rx="22" ry="6.5" fill="#e7aeaf"/>
  <ellipse cx="32" cy="55" rx="18.5" ry="4.8" fill="#4a2d2b"/>
  <ellipse cx="36" cy="54.2" rx="7" ry="1.4" fill="#8a5a4e" opacity="0.7"/>
  <path d="M32 80c-3-3.6-8 0-4 3.8l4 3.6l4-3.6c4-3.8-1-7.4-4-3.8z" fill="#f6e3d8" opacity="0.9"/>
</g></svg>`;
  }

  function svgJarra(u) {
    const R = rng(5); let st = '', fl = '';
    // caules (vistos através do vidro) e flores
    const heads = [[30, 46, 1, 1.9], [66, 34, 0, 1.9], [50, 20, 3, 1.6], [76, 70, 2, 1.8], [22, 82, 4, 1.8], [56, 58, 1, 1.5], [40, 30, 5, 1.6], [84, 46, 0, 1.4]];
    for (const [hx, hy, t, sz] of heads) {
      st += `<path d="M${50 + (hx - 50) * 0.12} 186Q${50 + (hx - 50) * 0.3} 130 ${hx} ${hy}" stroke="#5f7d62" stroke-width="1.6" fill="none"/>`;
      // a flor (desenhada com altura 0: só a cabeça)
      fl += flor(t, hx, hy, 0.01, sz, R).replace(/^<path[^>]*\/>/, '');
    }
    // folhinhas
    const fol = [[36, 120, -30], [62, 112, 30], [44, 96, -50], [58, 84, 40]];
    for (const [x, y, r] of fol) st += `<ellipse cx="${x}" cy="${y}" rx="9" ry="3" fill="#6f8d6c" transform="rotate(${r} ${x} ${y})"/>`;
    return `<svg viewBox="0 0 100 200" aria-hidden="true" focusable="false" overflow="visible"><g filter="url(#aq${u})">
  ${st}${fl}
  <path d="M30 140Q28 144 28 152V188Q28 196 36 196H64Q72 196 72 188V152Q72 144 70 140Z" fill="#c9d6ee" fill-opacity="0.32" stroke="#f4f1ff" stroke-opacity="0.7" stroke-width="1.6"/>
  <path d="M29.5 160H70.5V188Q70.5 194.5 64 194.5H36Q29.5 194.5 29.5 188Z" fill="#9fb6d6" fill-opacity="0.35"/>
  <path d="M30 160.5H70" stroke="#f2f6ff" stroke-width="1" opacity="0.8"/>
  <path d="M50 186L49 160M47 186L44 160M53 186L56 160" stroke="#4f6c55" stroke-width="1.4" opacity="0.7"/>
  <path d="M34 146V186" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
  <path d="M66 150V172" stroke="#ffe0d0" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>
  <ellipse cx="50" cy="140" rx="20" ry="3" fill="none" stroke="#f4f1ff" stroke-opacity="0.75" stroke-width="1.4"/>
</g></svg>`;
  }

  function svgOculos(u) {
    return `<svg viewBox="0 0 100 40" aria-hidden="true" focusable="false" overflow="visible"><g filter="url(#aq${u})">
  <path d="M10 18L30 4L78 3L92 16" stroke="#a88442" stroke-width="1.8" fill="none"/>
  <ellipse cx="27" cy="24" rx="19" ry="11" fill="#dfe6fb" fill-opacity="0.22" stroke="#caa457" stroke-width="2.4"/>
  <ellipse cx="72" cy="22" rx="19" ry="11" fill="#dfe6fb" fill-opacity="0.22" stroke="#caa457" stroke-width="2.4"/>
  <path d="M45 21Q49.5 15 54 20" stroke="#caa457" stroke-width="2.2" fill="none"/>
  <path d="M17 18Q22 15 28 15" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
  <path d="M62 16Q67 13 73 13" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
  <path d="M10 19Q9 27 15 32" stroke="#ffe3c4" stroke-width="0.9" fill="none" opacity="0.7"/>
</g></svg>`;
  }

  // a borboleta (asas que batem; pousa na jarra)
  const SVG_BORBOLETA = `<svg viewBox="-20 -16 40 32" aria-hidden="true" focusable="false">
<g class="mesa-asa mesa-asa--e"><path d="M-1 -1C-6 -14 -19 -15 -18 -6C-17 0 -9 1 -1 0Z" fill="#b7c2f4"/><path d="M-1 1C-8 2 -15 6 -12 12C-9 15 -3 9 -1 2Z" fill="#9aa8e8"/><circle cx="-11" cy="-7" r="2" fill="#fff" opacity="0.8"/><path d="M-18 -6C-17 0 -9 1 -1 0" stroke="#5c5f9e" stroke-width="0.8" fill="none"/></g>
<g class="mesa-asa mesa-asa--d"><path d="M1 -1C6 -14 19 -15 18 -6C17 0 9 1 1 0Z" fill="#b7c2f4"/><path d="M1 1C8 2 15 6 12 12C9 15 3 9 1 2Z" fill="#9aa8e8"/><circle cx="11" cy="-7" r="2" fill="#fff" opacity="0.8"/><path d="M18 -6C17 0 9 1 1 0" stroke="#5c5f9e" stroke-width="0.8" fill="none"/></g>
<path d="M0 -6V9" stroke="#3b3550" stroke-width="2" stroke-linecap="round"/><path d="M0 -6Q-3 -12 -5 -13M0 -6Q3 -12 5 -13" stroke="#3b3550" stroke-width="0.7" fill="none"/>
</svg>`;

  // a capa do livro (a mesma da antiga #gate)
  function htmlLivro(capa) {
    return `<span class="mesa-livro__pose">
  <span class="mesa-livro__sombra"></span>
  <span class="mesa-livro__corpo">
    <span class="mesa-livro__f mesa-livro__tras"></span>
    <span class="mesa-livro__f mesa-livro__cima"></span>
    <span class="mesa-livro__f mesa-livro__lombada"></span>
    <span class="mesa-livro__f mesa-livro__dir"></span>
    <span class="mesa-livro__f mesa-livro__baixo"></span>
    <span class="mesa-livro__fita"></span>
    <span class="mesa-livro__f mesa-livro__capa">
      <svg class="mesa-livro__moldura" viewBox="0 0 300 440" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect x="14" y="14" width="272" height="412" rx="3"/><rect x="22" y="22" width="256" height="396" rx="2"/>
        <path d="M150 100C150 100 127 85 127 70C127 62 133 56 140 56C145 56 148 59 150 63C152 59 155 56 160 56C167 56 173 62 173 70C173 85 150 100 150 100Z"/>
        <path d="M70 384h160M98 392h104"/><circle cx="150" cy="384" r="4"/>
      </svg>
      <span class="mesa-livro__para">${esc(capa.para)}</span>
      <span class="mesa-livro__sub">${esc(capa.subtitulo)}</span>
      <span class="mesa-livro__ano">${esc(capa.ano)}</span>
      <span class="mesa-livro__brilho"></span>
    </span>
  </span>
</span>`;
  }

  /* ================================================================== mount */
  function mount(el, cfg) {
    cfg = cfg || {};
    const capa = Object.assign({ para: 'Para a Catarina', subtitulo: 'Quatro anos de nós', ano: 'MMXXVI', nota: '', botao: 'Abrir o livro' }, cfg.capa || {});
    const stickerTxt = cfg.sticker || 'não cliques';
    const u = ++UID;

    const root = document.createElement('div');
    root.className = 'mesa';
    root.innerHTML = svgDefs(u) + `<div class="mesa-camara"><div class="mesa-palco"></div></div>`;
    el.appendChild(root);
    const camara = root.querySelector('.mesa-camara');
    const palco = root.querySelector('.mesa-palco');

    let modo = null, L = null, s = 1, ox = 0, oy = 0, vw = 0, vh = 0;
    let estado = 'mesa'; // mesa | agarrar | livro | pousar | zoom | pc | recuar
    let livro, pose, pcEl, ecra, sticker, borb, veu, dica;
    let vivo = true, tBorb = 0;

    function build() {
      L = LAY[modo];
      const P = (k) => ({ x: L[k].x, y: L[k].y, w: L[k].w, h: L[k].w * VB[k][1] / VB[k][0] });
      const pc = P('pc'), te = P('teclado'), ra = P('rato'), ca = P('caneca'), ja = P('jarra'), oc = P('oculos');
      const box = (o) => `left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${f1(o.h)}px`;
      const lv = L.livro, no = L.nota;
      const ph = /^\s*✏️/.test(capa.nota || '');
      palco.style.width = L.W + 'px'; palco.style.height = L.H + 'px';
      palco.innerHTML =
        svgFundo(L, u) +
        // o livro vem primeiro no DOM (Tab: livro → sticker); a ordem visual é dada pelo z-index
        `<button class="mesa-livro" type="button" aria-label="${esc(capa.botao)}: ${esc(capa.para)}, ${esc(capa.subtitulo)}" style="left:${lv.x}px;top:${lv.y}px;--bw:${lv.w}px;--rz:${lv.rz}deg">${htmlLivro(capa)}</button>` +
        `<div class="mesa-obj mesa-jarra" style="${box(ja)}">${svgJarra(u)}</div>` +
        `<div class="mesa-obj mesa-caneca" style="${box(ca)}">${svgCaneca(u)}</div>` +
        `<div class="mesa-obj mesa-oculos" style="${box(oc)}">${svgOculos(u)}</div>` +
        `<div class="mesa-obj mesa-pc" style="${box(pc)};--pcw:${pc.w}px">${svgPc(u)}
           <div class="mesa-pc__ecra" aria-hidden="true"><span class="mesa-pc__cursor">_</span></div>
           <button class="mesa-sticker" type="button" aria-label="${esc(stickerTxt)} (ligar o computador)">
             <span class="mesa-sticker__papel"><span class="mesa-sticker__fita"></span><span class="mesa-sticker__txt">${esc(stickerTxt)}</span>
             <svg class="mesa-sticker__coracao" viewBox="0 0 24 22" aria-hidden="true" focusable="false"><path d="M12 20C5 14 1.5 10.5 2.2 6.6C2.9 2.6 8.3 1.4 12 6C15.7 1.4 21.1 2.6 21.8 6.6C22.5 10.5 19 14 12 20Z"/></svg></span>
             <span class="mesa-sticker__brilho mesa-sticker__brilho--a">✦</span><span class="mesa-sticker__brilho mesa-sticker__brilho--b">✦</span>
           </button>
         </div>` +
        `<div class="mesa-obj mesa-teclado" style="${box(te)}">${svgTeclado(u)}</div>` +
        `<div class="mesa-obj mesa-rato" style="${box(ra)}">${svgRato(u)}</div>` +
        (capa.nota ? `<p class="mesa-nota${ph ? ' ph' : ''}" style="left:${no.x}px;top:${no.y}px;width:${no.w}px;font-size:${no.fs}px;transform:rotate(${no.r}deg)">${(ph ? capa.nota.replace(/^\s*✏️\s*/, '') : capa.nota).split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => `<span class="mesa-nota__p">${esc(t)}</span>`).join('')}</p>` : '') +
        `<div class="mesa-veu" aria-hidden="true"></div>` +
        `<p class="mesa-dica" aria-hidden="true" style="left:${lv.x}px;top:${f1(lv.y - lv.w * 0.78)}px;font-size:${modo === 'm' ? 21 : 18}px">${esc(capa.botao)}</p>` +
        `<div class="mesa-borboleta" aria-hidden="true">${SVG_BORBOLETA}</div>`;
      livro = palco.querySelector('.mesa-livro');
      pose = livro.querySelector('.mesa-livro__pose');
      pcEl = palco.querySelector('.mesa-pc');
      ecra = palco.querySelector('.mesa-pc__ecra');
      sticker = palco.querySelector('.mesa-sticker');
      borb = palco.querySelector('.mesa-borboleta');
      veu = palco.querySelector('.mesa-veu');
      dica = palco.querySelector('.mesa-dica');
      ligar();
    }

    /* ------------------------------------------------ interação */
    function ligar() {
      const hv = (on) => () => { if (estado === 'mesa') root.classList.toggle('is-livro-hover', on); };
      livro.addEventListener('pointerenter', hv(true));
      livro.addEventListener('pointerleave', hv(false));
      livro.addEventListener('focus', hv(true));
      livro.addEventListener('blur', hv(false));
      livro.addEventListener('click', () => { agarrar(); });
      const ph = (on) => () => { if (estado === 'mesa') root.classList.toggle('is-pc-hover', on); };
      pcEl.addEventListener('pointerenter', ph(true));
      pcEl.addEventListener('pointerleave', ph(false));
      sticker.addEventListener('focus', ph(true));
      sticker.addEventListener('blur', ph(false));
      pcEl.addEventListener('click', () => { irAoPc(); }); // o sticker está dentro: um só caminho
    }

    /* ------------------------------------------------ escala do palco */
    function medir() {
      vw = root.clientWidth || window.innerWidth; vh = root.clientHeight || window.innerHeight;
      const m = vw / vh < 0.85 ? 'm' : 'd';
      if (m !== modo) { modo = m; build(); root.dataset.modo = m; }
      s = Math.min(vw / L.fitW, vh / (L.H - L.top + 24));
      ox = (vw - L.W * s) / 2; oy = vh - L.H * s;
      palco.style.transform = `translate(${f1(ox)}px, ${f1(oy)}px) scale(${s.toFixed(4)})`;
      // estados parados fora da mesa: recalcula a pose final
      if (estado === 'livro') { const f = fimLivro(); livro.style.transform = f.w; pose.style.transform = f.p; }
      if (estado === 'pc') { camara.style.transform = ''; const z = framesZoom(); camara.style.transform = z[z.length - 1].transform; }
    }

    /* ------------------------------------------------ o livro: agarrar */
    const POSE0 = () => `rotateX(${modo === 'm' ? 54 : 61}deg) rotateZ(${L.livro.rz}deg)`;
    function fimLivro() {
      const lv = L.livro, tw = Math.min(vw * 0.64, 320, vh * 0.46);
      const k = tw / (lv.w * s);
      const dx = (vw / 2 - (ox + s * lv.x)) / s, dy = (vh / 2 - (oy + s * lv.y)) / s;
      return { w: `translate(${f1(dx)}px, ${f1(dy)}px) scale(${k.toFixed(4)})`, p: 'rotateX(0deg) rotateZ(0deg) translateZ(0px)', dx, dy, k };
    }
    function framesLivro() {
      const f = fimLivro();
      if (reduz()) return { w: [{ transform: 'none', opacity: 1 }, { transform: f.w, opacity: 1 }], p: [{ transform: POSE0() }, { transform: f.p }] };
      const lift = L.livro.w * 0.35;
      return {
        w: [
          { offset: 0, transform: 'translate(0px, 0px) scale(1)' },
          { offset: 0.3, transform: `translate(${f1(f.dx * 0.12)}px, ${f1(f.dy * 0.1 - lift)}px) scale(${(1 + (f.k - 1) * 0.12).toFixed(4)})` },
          { offset: 1, transform: f.w },
        ],
        p: [
          { offset: 0, transform: POSE0() + ' translateZ(0px)' },
          { offset: 0.3, transform: `rotateX(38deg) rotateZ(${f1(L.livro.rz * 0.5)}deg) translateZ(${f1(lift * 0.4)}px)` },
          { offset: 0.75, transform: 'rotateX(-6deg) rotateZ(1.5deg) translateZ(0px)' },
          { offset: 1, transform: f.p },
        ],
      };
    }
    function animar(elx, frames, ms, easing) {
      const a = elx.animate(frames, { duration: ms, easing: easing || 'linear', fill: 'forwards' });
      return a.finished.then(() => { elx.style.transform = frames[frames.length - 1].transform; a.cancel(); }, () => {});
    }
    async function agarrar() {
      if (estado !== 'mesa') return;
      estado = 'agarrar';
      root.classList.remove('is-livro-hover', 'is-pc-hover');
      root.classList.add('is-agarrar');
      const fr = framesLivro(), ms = reduz() ? 380 : 1650, ease = 'cubic-bezier(.55,.05,.2,1)';
      await Promise.all([animar(livro, fr.w, ms, ease), animar(pose, fr.p, ms, ease)]);
      estado = 'livro';
      root.classList.add('is-livro');
      if (typeof cfg.onLivro === 'function') cfg.onLivro();
    }
    async function pousarLivro() {
      if (estado === 'agarrar') await esperar('livro');
      if (estado !== 'livro') { if (estado === 'mesa') esconder(false); return; }
      estado = 'pousar';
      esconder(false);
      root.classList.remove('is-livro');
      const fr = framesLivro(), ms = reduz() ? 320 : 1300, ease = 'cubic-bezier(.45,0,.25,1)';
      const rw = fr.w.slice().reverse().map((k, i, a) => Object.assign({}, k, { offset: 1 - (k.offset == null ? (a.length - 1 - i) / (a.length - 1) : k.offset) }));
      const rp = fr.p.slice().reverse().map((k, i, a) => Object.assign({}, k, { offset: 1 - (k.offset == null ? (a.length - 1 - i) / (a.length - 1) : k.offset) }));
      root.classList.remove('is-agarrar');
      await Promise.all([animar(livro, rw, ms, ease), animar(pose, rp, ms, ease)]);
      livro.style.transform = ''; pose.style.transform = '';
      estado = 'mesa';
      try { livro.focus({ preventScroll: true }); } catch (e) { /* */ }
      root.classList.remove('is-livro-hover');
    }
    function esperar(alvo) {
      return new Promise((res) => { const t = setInterval(() => { if (estado === alvo || !vivo) { clearInterval(t); res(); } }, 40); });
    }

    /* ------------------------------------------------ o PC: a câmara aproxima-se */
    function framesZoom() {
      const r = ecra.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const cx = r.left - rr.left + r.width / 2, cy = r.top - rr.top + r.height / 2;
      const k = Math.max(vw / r.width, vh / r.height) * 1.06;
      const n = reduz() ? 2 : 36, fr = [];
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = reduz() ? t : ease(t);
        const kk = Math.exp(Math.log(k) * p);
        const fx = cx + (vw / 2 - cx) * p, fy = cy + (vh / 2 - cy) * p;
        fr.push({ offset: t, transform: `translate(${(fx - kk * cx).toFixed(2)}px, ${(fy - kk * cy).toFixed(2)}px) scale(${kk.toFixed(4)})` });
      }
      return fr;
    }
    async function irAoPc() {
      if (estado === 'livro' || estado === 'agarrar') { await pousarLivro(); }
      if (estado !== 'mesa') return;
      estado = 'zoom';
      root.classList.remove('is-livro-hover', 'is-pc-hover');
      root.classList.add('is-zoom');
      camara.style.transform = '';
      const fr = framesZoom();
      await animar(camara, fr, reduz() ? 450 : 2100);
      estado = 'pc';
      root.classList.add('is-pc');
      if (typeof cfg.onPc === 'function') cfg.onPc();
    }
    async function sairDoPc() {
      if (estado === 'zoom') await esperar('pc');
      if (estado !== 'pc') return;
      estado = 'recuar';
      root.classList.remove('is-pc');
      camara.style.transform = '';
      const fr = framesZoom();
      const rv = fr.slice().reverse().map((k) => Object.assign({}, k, { offset: 1 - k.offset }));
      camara.style.transform = fr[fr.length - 1].transform;
      await animar(camara, rv, reduz() ? 400 : 1700);
      camara.style.transform = '';
      root.classList.remove('is-zoom');
      estado = 'mesa';
      try { sticker.focus({ preventScroll: true }); } catch (e) { /* */ }
      root.classList.remove('is-pc-hover');
    }

    function esconder(on) { root.classList.toggle('is-escondida', !!on); root.setAttribute('aria-hidden', on ? 'true' : 'false'); }

    /* ------------------------------------------------ a borboleta */
    function voo() {
      if (!vivo) return;
      if (reduz() || estado !== 'mesa' || root.classList.contains('is-escondida') || document.hidden) { tBorb = setTimeout(voo, 6000); return; }
      const ja = L.jarra, k = ja.w / 100;
      const F = [ja.x + 30 * k, ja.y + 44 * k]; // a cosmos cor-de-rosa
      const S = [ja.x - 260, ja.y - 220], E = [L.W * 0.62, -120];
      const fr = [], n = 40, sc = modo === 'm' ? 1.25 : 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = 1 - Math.pow(1 - t, 2);
        const x = lerp(S[0], F[0], p) + Math.sin(t * 13) * 10 * (1 - t), y = lerp(S[1], F[1], p) - Math.sin(t * Math.PI) * 50 + Math.sin(t * 17) * 8 * (1 - t);
        fr.push({ offset: t, transform: `translate(${f1(x)}px, ${f1(y)}px) rotate(${f1(Math.sin(t * 11) * 14 * (1 - t))}deg) scale(${sc})` });
      }
      borb.classList.add('is-voar'); borb.classList.remove('is-pousada');
      const a = borb.animate(fr, { duration: 4200, fill: 'forwards' });
      a.finished.then(() => {
        if (!vivo) return;
        borb.classList.add('is-pousada');
        tBorb = setTimeout(() => {
          if (!vivo) return;
          borb.classList.remove('is-pousada');
          const g = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n, p = t * t;
            const x = lerp(F[0], E[0], p) + Math.sin(t * 12) * 12 * t, y = lerp(F[1], E[1], p) + Math.sin(t * 15) * 9 * t - Math.sin(t * Math.PI) * 30;
            g.push({ offset: t, transform: `translate(${f1(x)}px, ${f1(y)}px) rotate(${f1(Math.sin(t * 9) * 16 * t)}deg) scale(${sc})` });
          }
          a.cancel();
          const b = borb.animate(g, { duration: 4200, fill: 'forwards' });
          b.finished.then(() => { b.cancel(); borb.classList.remove('is-voar'); if (vivo) tBorb = setTimeout(voo, 11000 + Math.random() * 9000); }, () => {});
        }, 5500 + Math.random() * 3000);
      }, () => {});
    }

    /* ------------------------------------------------ arranque */
    medir();
    /* ------------------------------------------------ a entrada: acordas no meio das flores, levantas-te e vês a mesa */
    function acordar() {
      if (reduz() || !camara.animate) return;
      estado = 'intro';
      const R = rng(99);
      const frente = document.createElement('div');
      frente.className = 'mesa-frente';
      frente.setAttribute('aria-hidden', 'true');
      frente.innerHTML = `<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" focusable="false"><g class="mesa-frente__ervas">` +
        relva(R, { x0: -120, x1: 1320, y0: 640, y1: 810, h0: 150, h1: 470, n: 130, flores: 0.3, sz: 5.2 }) + `</g></svg>`;
      const veu2 = document.createElement('div'); veu2.className = 'mesa-acordar-veu';
      const txt = document.createElement('p'); txt.className = 'mesa-acordar-txt'; txt.textContent = 'Respira. Está tudo em paz.';
      root.append(frente, veu2, txt);
      const vh2 = root.clientHeight || window.innerHeight;
      const dur = 6400, ease = 'cubic-bezier(.5,.05,.25,1)';
      const fim = () => {
        [frente, veu2, txt].forEach((n) => n.remove());
        camara.style.transform = '';
        root.classList.remove('is-acordar');
        if (estado === 'intro') estado = 'mesa';
        root.removeEventListener('pointerdown', saltar, true);
      };
      const anims = [];
      let acabou = false;
      const saltar = (e) => { if (acabou) return; acabou = true; e && e.stopPropagation(); anims.forEach((a) => { try { a.finish(); } catch (x) { /* */ } }); fim(); };
      root.classList.add('is-acordar');
      anims.push(camara.animate([
        { transform: `translate(0px, ${f1(vh2 * 0.78)}px) scale(1.16) rotate(-2deg)`, offset: 0 },
        { transform: `translate(0px, ${f1(vh2 * 0.78)}px) scale(1.16) rotate(-2deg)`, offset: 0.3 },
        { transform: `translate(0px, ${f1(vh2 * 0.2)}px) scale(1.05) rotate(1.2deg)`, offset: 0.7 },
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', offset: 1 },
      ], { duration: dur, easing: ease, fill: 'both' }));
      anims.push(frente.animate([
        { transform: 'translateY(0) scale(1)', offset: 0 }, { transform: 'translateY(0) scale(1)', offset: 0.28 },
        { transform: 'translateY(112%) scale(1.04)', offset: 1 },
      ], { duration: dur, easing: ease, fill: 'both' }));
      anims.push(veu2.animate([{ opacity: 1 }, { opacity: 0.0 }], { duration: 1700, easing: 'ease-out', fill: 'both' }));
      anims.push(txt.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none', offset: 0.18 }, { opacity: 1, offset: 0.62 }, { opacity: 0 }], { duration: 3400, delay: 700, easing: 'ease-in-out', fill: 'both' }));
      const t2 = setTimeout(() => { if (!acabou) txt.textContent = 'Levantas-te… e olhas para o lado.'; }, 3900);
      const t3 = setTimeout(() => { if (!acabou) anims.push(txt.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 2500, easing: 'ease-in-out', fill: 'both' })); }, 3950);
      root.addEventListener('pointerdown', saltar, true);
      anims[0].finished.then(() => { if (!acabou) { acabou = true; clearTimeout(t2); clearTimeout(t3); fim(); } }, () => {});
    }
    // a entrada «acordar nas flores» foi desligada a pedido; para a voltar a ver: Mesa.mount(..., { intro: true })
    if (cfg.intro === true) acordar();
    let rz = 0;
    const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(medir); };
    window.addEventListener('resize', onResize);
    tBorb = setTimeout(voo, 3500);
    // a fonte manuscrita chega depois: nada a fazer (é HTML); o post-it SVG também se atualiza sozinho

    return {
      el: root,
      agarrar,
      pousarLivro,
      irAoPc,
      sairDoPc,
      esconder,
      get estado() { return estado; },
      destroy() {
        vivo = false; clearTimeout(tBorb);
        window.removeEventListener('resize', onResize);
        root.getAnimations && root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        root.remove();
      },
    };
  }

  window.Mesa = { mount };
})();
