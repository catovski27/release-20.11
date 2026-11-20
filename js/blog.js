/* ==========================================================================
   O BLOG — o mundo do Diogo, dentro do ecrã do computador antigo.

   Uma página pessoal feita de caracteres, como as dos anos 90 (BBS, ANSI,
   tilde.club), no estilo dos vídeos: fundo preto, caracteres a cores e
   luminosos, estrelinhas. Os textos vêm todos de cfg (js/content.js + textos/).

     const b = Blog.mount(el, cfg);   // el = área com scroll dentro do CRT
     b.destroy();

   cfg = { ela, ele, alcunhas, inicio:[a,m,d], computador, fim, mapa, fotos }

   A arte grande (letreiros, gráficos, fórmulas desenhadas) é desenhada em
   <canvas> com glifos reais: cada célula é um carácter. As imagens (fotos,
   jogos, mapa) vêm pré-calculadas em assets/ascii/blog-*.js (formato da
   docs/SPEC-v5.md); se ainda não estiverem carregadas, o blog injeta-as.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ base */
  const SCRIPT = document.currentScript;
  const BASE = (SCRIPT && SCRIPT.src) ? SCRIPT.src.replace(/js\/blog\.js(\?.*)?$/, '') : '';
  const VER = (SCRIPT && SCRIPT.src && (SCRIPT.src.match(/\?v=([\w.-]+)/) || [])[1]) || '';
  const MONO = '"Spline Sans Mono", ui-monospace, "Cascadia Mono", Consolas, monospace';
  const SERIF = '"Ibarra Real Nova", Georgia, serif';
  const CELL = 0.6; // largura / altura de cada célula

  // as cores do fósforo (dos vídeos: lírios, caules, o urso, as estrelas)
  const COR = {
    rosa: '#ff7eb6', vermelho: '#ff4d6a', amarelo: '#ffd66b', pessego: '#ffb38a', verde: '#86e57f',
    lilas: '#a993ff', azul: '#72c2ff', ciano: '#7fe8d8', branco: '#fbf1e8', tenue: '#8c84a3', escuro: '#3a3450',
  };
  const ARCO = [COR.verde, COR.amarelo, COR.pessego, COR.rosa, COR.vermelho, COR.lilas, COR.azul];

  const PH = /^\s*✏️\s*/;
  const isPh = (t) => typeof t === 'string' && PH.test(t);
  function setText(e, t) {
    if (isPh(t)) { e.classList.add('b-ph'); e.textContent = t.replace(PH, ''); e.title = 'por escrever'; }
    else e.textContent = t == null ? '' : String(t);
    return e;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) setText(e, text);
    return e;
  }
  function botao(cls, text, label) {
    const b = el('button', cls, text); b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    return b;
  }
  const pad = (n, w, c = '0') => String(n).padStart(w, c);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function grad(cores, t) {
    t = Math.max(0, Math.min(0.9999, t)) * (cores.length - 1);
    const i = Math.floor(t);
    return mix(cores[i], cores[i + 1] || cores[i], t - i);
  }
  function b64(s) {
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  /* ----------------------------------------------- carregar os clips */
  function clips() { return window.ASCII_CLIPS || {}; }
  const pedidos = {};
  function carregar(ficheiro) {
    if (pedidos[ficheiro]) return pedidos[ficheiro];
    pedidos[ficheiro] = new Promise((res) => {
      const s = document.createElement('script');
      s.src = BASE + 'assets/ascii/' + ficheiro + (VER ? '?v=' + VER : '');
      s.onload = () => res(true);
      s.onerror = () => res(false);
      document.head.appendChild(s);
    });
    return pedidos[ficheiro];
  }
  async function clip(nome, ficheiro) {
    if (clips()[nome]) return clips()[nome];
    await carregar(ficheiro);
    return clips()[nome] || null;
  }

  /* =================================================================
     ARTE: uma grelha de caracteres desenhada em canvas, com brilho.
     ================================================================= */
  function Arte(host, cols, rows, o = {}) {
    const box = el('div', 'b-arte' + (o.cls ? ' ' + o.cls : ''));
    box.setAttribute('aria-hidden', 'true');
    const glow = el('canvas', 'b-arte__glow'), cv = el('canvas', 'b-arte__cv');
    box.append(glow, cv);
    host.appendChild(box);
    const n = cols * rows;
    const ch = new Array(n).fill(' '), co = new Array(n).fill(COR.branco), al = new Float32Array(n).fill(1);
    const maxFs = o.maxFs || 15;
    let W = 0, fs = 0, dpr = 1;
    const api = {
      box, cols, rows, ch, co, al,
      clear() { ch.fill(' '); al.fill(1); },
      set(x, y, c, cor, a = 1) {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= cols || y >= rows) return;
        const i = y * cols + x; ch[i] = c; if (cor) co[i] = cor; al[i] = a;
      },
      get(x, y) { x = Math.round(x); y = Math.round(y); return (x < 0 || y < 0 || x >= cols || y >= rows) ? ' ' : ch[y * cols + x]; },
      text(x, y, s, cor, a = 1) { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') api.set(x + i, y, s[i], typeof cor === 'function' ? cor(i) : cor, a); },
      resize() {
        const w = host.clientWidth || 300;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        fs = Math.min(maxFs, w / (cols * CELL));
        W = cols * fs * CELL;
        const H = rows * fs;
        for (const c of [cv, glow]) {
          c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
          c.style.width = W + 'px'; c.style.height = H + 'px';
        }
        api.draw();
      },
      draw() {
        if (!fs) return;
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, rows * fs);
        ctx.font = (o.peso || 500) + ' ' + fs + 'px ' + MONO;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const cw = fs * CELL;
        let last = '', lastA = 1;
        for (let i = 0; i < n; i++) {
          const c = ch[i];
          if (c === ' ' || al[i] <= 0.01) continue;
          if (co[i] !== last) { ctx.fillStyle = last = co[i]; }
          if (al[i] !== lastA) { ctx.globalAlpha = lastA = al[i]; }
          ctx.fillText(c, (i % cols) * cw + cw / 2, Math.floor(i / cols) * fs + fs * 0.55);
        }
        ctx.globalAlpha = 1;
        const g = glow.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, glow.width, glow.height);
        g.drawImage(cv, 0, 0);
      },
      // célula (col, row) a partir de coordenadas do rato
      cellAt(px, py) { const r = cv.getBoundingClientRect(); return [Math.floor((px - r.left) / (fs * CELL)), Math.floor((py - r.top) / fs)]; },
      get fs() { return fs; },
    };
    return api;
  }

  // um clip do formato partilhado → arte (fallback se window.Ascii não existir)
  function preencherClip(arte, c) {
    const f = c.frames[0], cc = b64(f.c), kk = b64(f.k);
    for (let i = 0; i < cc.length; i++) { arte.ch[i] = cc[i] ? c.ramp[cc[i]] || '#' : ' '; arte.co[i] = c.palette[kk[i]] || '#fff'; }
  }

  /* =================================================================
     LETREIRO: texto grande feito de caracteres (um figlet desenhado na
     hora a partir de uma fonte verdadeira, em gradiente de cores).
     ================================================================= */
  const RAMPA = ' .:-=+*#%@';
  async function fontes() {
    if (!document.fonts || !document.fonts.load) return;
    const t = sleep(1500);
    await Promise.race([Promise.all([
      document.fonts.load('italic 600 80px "Ibarra Real Nova"'),
      document.fonts.load('600 80px "Ibarra Real Nova"'),
      document.fonts.load('500 20px "Spline Sans Mono"'),
      document.fonts.load('400 80px "Mrs Saint Delafield"'),
    ]).catch(() => {}), t]);
  }
  const mediCanvas = document.createElement('canvas');
  function rasterizar(texto, font, rows) {
    const ctx = mediCanvas.getContext('2d');
    const S = 120;
    ctx.font = font.replace('{px}', S + 'px');
    const m = ctx.measureText(texto);
    const asc = m.actualBoundingBoxAscent || S * 0.75, desc = m.actualBoundingBoxDescent || S * 0.2;
    const left = m.actualBoundingBoxLeft || 0;
    const tw = Math.ceil((m.actualBoundingBoxRight || m.width) + left) + 4, th = Math.ceil(asc + desc) + 4;
    const cellH = th / rows, cellW = cellH * CELL;
    const cols = Math.max(1, Math.ceil(tw / cellW));
    return { cols, rows, tw, th, asc, left, cellW, cellH, font: ctx.font };
  }
  function amostrar(texto, r) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(r.cols * r.cellW); c.height = Math.ceil(r.th);
    const ctx = c.getContext('2d');
    ctx.font = r.font; ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(texto, r.left + 2 + (c.width - r.tw) / 2, r.asc + 2);
    const img = ctx.getImageData(0, 0, c.width, c.height).data; // canvas só com texto: não fica «tainted»
    const out = new Float32Array(r.cols * r.rows);
    for (let y = 0; y < r.rows; y++) for (let x = 0; x < r.cols; x++) {
      let s = 0, k = 0;
      const x0 = Math.floor(x * r.cellW), x1 = Math.floor((x + 1) * r.cellW), y0 = Math.floor(y * r.cellH), y1 = Math.floor((y + 1) * r.cellH);
      for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) { s += img[(yy * c.width + xx) * 4 + 3]; k++; }
      out[y * r.cols + x] = k ? s / k / 255 : 0;
    }
    return out;
  }
  /* letreiro(host, texto, {font, rows, cores, maxFs, enche}) → arte (com .anima(t)) */
  function letreiro(host, texto, o = {}) {
    const font = o.font || 'italic 600 {px} ' + SERIF;
    const rows0 = o.rows || 9, minCell = o.minCell || 4.2;
    const largura = Math.max(200, host.clientWidth || 320);
    const maxCols = Math.floor(largura / minCell);
    // procura o tamanho: encolhe até 5 linhas; depois parte em palavras
    let linhas = [texto], R = rows0, medidas;
    for (let guard = 0; guard < 40; guard++) {
      medidas = linhas.map((l) => rasterizar(l, font, R));
      const maior = Math.max(...medidas.map((m) => m.cols));
      if (maior <= maxCols) break;
      const i = medidas.findIndex((m) => m.cols === maior), pal = linhas[i].split(' ');
      const minR = o.minRows || 5, antesDePartir = Math.max(minR, Math.ceil(rows0 * 0.7));
      if (R > antesDePartir || (pal.length < 2 && R > minR)) { R--; continue; }
      if (pal.length < 2) break;
      const meio = Math.ceil(pal.length / 2);
      linhas.splice(i, 1, pal.slice(0, meio).join(' '), pal.slice(meio).join(' '));
      R = rows0;
    }
    const cols = Math.min(maxCols, Math.max(...medidas.map((m) => m.cols))) + 2;
    const gap = 1, rows = medidas.reduce((s, m) => s + m.rows, 0) + gap * (linhas.length - 1);
    const arte = Arte(host, cols, rows, { maxFs: o.maxFs || 11, cls: 'b-letreiro', peso: 600 });
    const cobre = new Float32Array(cols * rows);
    let y0 = 0;
    linhas.forEach((l, li) => {
      const m = medidas[li], a = amostrar(l, m), dx = Math.floor((cols - m.cols) / 2);
      for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) if (x + dx < cols) cobre[(y0 + y) * cols + x + dx] = a[y * m.cols + x];
      y0 += m.rows + gap;
    });
    const cores = o.cores || ARCO;
    const enche = o.enche || null; // string de letras para encher (ex.: 'amo-te')
    arte.anima = (t) => {
      for (let i = 0; i < cobre.length; i++) {
        const v = cobre[i];
        if (v < 0.16) { arte.ch[i] = ' '; continue; }
        const x = i % cols, y = Math.floor(i / cols);
        arte.ch[i] = enche && v > 0.55 ? enche[(x + y * 3) % enche.length] : RAMPA[Math.min(9, Math.round(v * 9))];
        const onda = (x / cols) + (y / rows) * 0.25 - t * 0.00006;
        arte.co[i] = grad(cores, ((onda % 1) + 1) % 1 * 0.999);
        arte.al[i] = 0.55 + 0.45 * Math.min(1, v * 1.4);
      }
      arte.draw();
    };
    arte.resize();
    arte.anima(0);
    return arte;
  }

  /* =================================================================
     O MOTOR: animações só quando visíveis (raiz do IntersectionObserver
     = el), num só requestAnimationFrame.
     ================================================================= */
  function Motor(raiz, reduzido) {
    const vivos = new Set(), visiveis = new WeakSet();
    let raf = 0, ultimo = 0, morto = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const n = e.target;
        if (e.isIntersecting) {
          visiveis.add(n);
          if (!n.classList.contains('is-in')) { n.classList.add('is-in'); if (n._aoEntrar) { const f = n._aoEntrar; n._aoEntrar = null; f(); } }
        } else visiveis.delete(n);
      }
      ligar();
    }, { root: raiz, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    function loop(t) {
      raf = 0;
      if (morto) return;
      let algum = false;
      if (t - ultimo >= 33) {
        ultimo = t;
        for (const a of vivos) if (visiveis.has(a.node)) { algum = true; try { a.tick(t); } catch (e) { console.warn('blog:', e); vivos.delete(a); } }
      } else algum = true;
      if (algum) raf = requestAnimationFrame(loop);
    }
    function ligar() { if (!raf && !morto && !reduzido) raf = requestAnimationFrame(loop); }
    return {
      observar(node, aoEntrar) { node._aoEntrar = aoEntrar || null; io.observe(node); },
      animar(node, tick) { const a = { node, tick }; vivos.add(a); io.observe(node); ligar(); return () => vivos.delete(a); },
      destroy() { morto = true; cancelAnimationFrame(raf); io.disconnect(); vivos.clear(); },
    };
  }

  /* ------------------------------------------------ a escrever (typing) */
  async function escrever(node, texto, o = {}) {
    const vel = o.vel || 18, reduzido = o.reduzido, vivo = o.vivo || (() => true);
    if (reduzido) { node.textContent = texto; return; }
    node.textContent = '';
    for (let i = 0; i <= texto.length; i += o.passo || 1) {
      if (!vivo()) return;
      node.textContent = texto.slice(0, i);
      await sleep(vel + (texto[i] === ' ' ? vel * 0.6 : 0));
    }
    node.textContent = texto;
  }

  /* =================================================================
     COMPONENTES
     ================================================================= */
  function moldura(rotulo, o = {}) {
    // ── [ rótulo ] ───────────────── ♥
    const h = el('div', 'b-moldura' + (o.cls ? ' ' + o.cls : ''));
    h.setAttribute('aria-hidden', 'true');
    h.append(el('span', 'b-moldura__ponta', o.esq || '+--'), el('span', 'b-moldura__rot', rotulo ? '[ ' + rotulo + ' ]' : ''),
      el('span', 'b-moldura__fio', '-'.repeat(240)), el('span', 'b-moldura__ponta', o.dir || '--+'));
    return h;
  }

  // tex → HTML simples (mono, sem KaTeX): frações, índices, raízes, letras gregas
  const GREGO = { pi: 'π', varphi: 'φ', phi: 'φ', theta: 'θ', xi: 'ξ', infty: '∞', to: '→', mid: '|', cdot: '·', alpha: 'α', beta: 'β', sum: 'Σ', int: '∫', lim: 'lim', sin: 'sin', cos: 'cos', ln: 'ln' };
  function texHTML(tex) {
    let i = 0;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    function grupo() {
      while (tex[i] === ' ') i++;
      if (tex[i] === '{') { i++; const s = seq('}'); i++; return s; }
      if (tex[i] === '\\') return cmd();
      return esc(tex[i++] || '');
    }
    function cmd() {
      i++;
      let nome = '';
      while (i < tex.length && /[a-zA-Z]/.test(tex[i])) nome += tex[i++];
      if (!nome) { const c = tex[i++]; return c === ',' ? '<span class="b-tx-s"> </span>' : c === ' ' ? ' ' : esc(c); }
      if (nome === 'frac') { const a = grupo(), b = grupo(); return '<span class="b-tx-frac"><span>' + a + '</span><span>' + b + '</span></span>'; }
      if (nome === 'sqrt') { const a = grupo(); return '√<span class="b-tx-raiz">' + a + '</span>'; }
      if (nome === 'hat') { const a = grupo(); return '<span class="b-tx-hat">' + a + '</span>'; }
      if (nome === 'left' || nome === 'right') { return esc(tex[i++] || ''); }
      if (nome === 'qquad') return '<span class="b-tx-qq"></span>';
      if (nome === 'quad') return '<span class="b-tx-q"></span>';
      if (GREGO[nome]) return /^[a-z]{2,}$/.test(GREGO[nome]) ? '<span class="b-tx-op">' + GREGO[nome] + '</span>' : GREGO[nome];
      return esc(nome);
    }
    function seq(fim) {
      let out = '';
      while (i < tex.length && tex[i] !== fim) {
        const c = tex[i];
        if (c === '^' || c === '_') {
          i++; const g = grupo();
          while (tex[i] === ' ') i++;
          const o = c === '^' ? '_' : '^';
          if (tex[i] === o) { i++; const h = grupo(); const sup = c === '^' ? g : h, sub = c === '^' ? h : g; out += '<span class="b-tx-lim"><sup>' + sup + '</sup><sub>' + sub + '</sub></span>'; }
          else out += c === '^' ? '<sup>' + g + '</sup>' : '<sub>' + g + '</sub>';
        }
        else if (c === '\\') out += cmd();
        else if (c === '{') { i++; out += seq('}'); i++; }
        else if (/[a-zA-Z]/.test(c)) { out += '<i>' + c + '</i>'; i++; }
        else if (c === '=' || c === '+') { out += ' ' + c + ' '; i++; }
        else if (c === '-' ) { out += ' − '; i++; }
        else { out += esc(c); i++; }
      }
      return out;
    }
    return seq(null).replace(/\s{2,}/g, ' ');
  }

  // grelha de um gráfico: mapeia (x,y) do mundo para (col,row), com células 0.6 de largura
  function plano(arte, xmin, xmax, ymin, ymax, margem = 1) {
    const cw = arte.cols - margem * 2, rh = arte.rows - margem * 2;
    const k = Math.min(cw / (xmax - xmin), rh / ((ymax - ymin) * CELL));
    const cx = arte.cols / 2 - ((xmin + xmax) / 2) * k, cy = arte.rows / 2 + ((ymin + ymax) / 2) * k * CELL;
    return { x: (x) => cx + x * k, y: (y) => cy - y * k * CELL, k };
  }
  // plano esticado (não isotrópico), para gráficos de dados
  function eixos(arte, xmin, xmax, ymin, ymax, m = { l: 6, r: 2, t: 1, b: 2 }) {
    const W = arte.cols - m.l - m.r, H = arte.rows - m.t - m.b;
    return { x: (x) => m.l + (x - xmin) / (xmax - xmin) * W, y: (y) => m.t + H - (y - ymin) / (ymax - ymin) * H, m, W, H };
  }

  /* ----------------------------------------- as fórmulas, desenhadas */
  const DESENHOS = {
    euler(arte) {
      const p = plano(arte, -1.9, 1.9, -1.25, 1.25);
      const base = () => {
        arte.clear();
        for (let x = 0; x < arte.cols; x++) arte.set(x, p.y(0), '-', COR.escuro);
        for (let y = 0; y < arte.rows; y++) arte.set(p.x(0), y, '|', COR.escuro);
        arte.set(p.x(0), p.y(0), '+', COR.tenue);
        for (let a = 0; a < Math.PI * 2; a += 0.02) arte.set(p.x(Math.cos(a)), p.y(Math.sin(a)), '.', COR.tenue, 0.8);
        arte.text(p.x(1) + 1, p.y(0) - 1, '1', COR.verde);
        arte.text(p.x(-1) - 3, p.y(0) - 1, '-1', COR.vermelho);
        arte.text(p.x(0) + 1, p.y(1) - 1, 'i', COR.azul);
      };
      return (t) => {
        base();
        const ciclo = 7000, f = (t % ciclo) / ciclo, th = Math.min(1, f / 0.62) * Math.PI;
        for (let a = 0; a <= th; a += 0.015) arte.set(p.x(Math.cos(a)), p.y(Math.sin(a)), '*', grad([COR.verde, COR.amarelo, COR.rosa, COR.vermelho], a / Math.PI));
        const px = p.x(Math.cos(th)), py = p.y(Math.sin(th));
        arte.text(px - 1, py, '<@>', COR.branco);
        if (f > 0.62) {
          const s = 'e^(iπ) = -1   →   e^(iπ) + 1 = 0  ♥';
          arte.text(Math.floor(arte.cols / 2 - s.length / 2), arte.rows - 1, s, (i) => grad([COR.amarelo, COR.rosa], i / s.length));
        } else {
          const s = 'θ = ' + (th / Math.PI).toFixed(2) + 'π';
          arte.text(Math.floor(arte.cols / 2 - s.length / 2), arte.rows - 1, s, COR.tenue);
        }
        arte.draw();
      };
    },
    identidade(arte) {
      // a fórmula do anel: um ponto roda na circunferência; o triângulo mostra cos e sen, e a soma dos quadrados fica sempre em 1
      const p = plano(arte, -1.75, 1.75, -1.3, 1.3);
      const linha = (x0, y0, x1, y1, ch, cor, o = 1) => {
        const n = Math.max(2, Math.ceil(Math.hypot(p.x(x1) - p.x(x0), (p.y(y1) - p.y(y0)) / CELL) * 1.4));
        for (let i = 0; i <= n; i++) { const u = i / n; arte.set(p.x(x0 + (x1 - x0) * u), p.y(y0 + (y1 - y0) * u), ch, cor, o); }
      };
      return (t) => {
        arte.clear();
        for (let x = 0; x < arte.cols; x++) arte.set(x, p.y(0), '-', COR.escuro);
        for (let y = 0; y < arte.rows; y++) arte.set(p.x(0), y, '|', COR.escuro);
        for (let a = 0; a < Math.PI * 2; a += 0.02) arte.set(p.x(Math.cos(a)), p.y(Math.sin(a)), '.', COR.tenue, 0.85);
        const th = (t / 2600) % (Math.PI * 2), c = Math.cos(th), sn = Math.sin(th);
        linha(0, 0, c, sn, '·', COR.branco, 0.8);
        linha(0, 0, c, 0, '=', COR.azul);
        linha(c, 0, c, sn, '#', COR.rosa);
        arte.text(p.x(c) - 1, p.y(sn), '<@>', COR.amarelo);
        arte.text(Math.max(0, Math.min(arte.cols - 4, Math.round(p.x(c / 2)) - 1)), p.y(0) + (sn >= 0 ? 1 : -1), 'cos', COR.azul);
        arte.text(Math.max(0, Math.min(arte.cols - 4, Math.round(p.x(c)) + (c >= 0 ? 2 : -4))), p.y(sn / 2), 'sen', COR.rosa);
        const s = 'sen² = ' + (sn * sn).toFixed(2) + '   cos² = ' + (c * c).toFixed(2) + '   →   soma = 1.00  ♥';
        arte.text(Math.floor(arte.cols / 2 - s.length / 2), arte.rows - 1, s, (i) => grad([COR.rosa, COR.amarelo, COR.azul], i / s.length));
        arte.draw();
      };
    },
    coracao(arte) {
      const p = plano(arte, -18, 18, -17.5, 13.5);
      const pts = [];
      for (let t = 0; t <= Math.PI * 2 + 0.001; t += 0.01) {
        const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([x, y]);
      }
      return (t) => {
        arte.clear();
        const ciclo = 9000, f = (t % ciclo) / ciclo, ate = Math.floor(Math.min(1, f / 0.55) * pts.length);
        const bate = 0.75 + 0.25 * Math.abs(Math.sin(t / 420));
        if (f > 0.55) {
          // por dentro, enche-se de «amo-te»
          const enche = 'amo-te', fill = Math.min(1, (f - 0.55) / 0.2);
          for (let y = 0; y < arte.rows; y++) for (let x = 0; x < arte.cols; x++) {
            const wx = (x - p.x(0)) / p.k, wy = -(y - p.y(0)) / (p.k * CELL);
            // dentro do coração?  ((x/16)^2 + (y/13)^2 - 1)^3 - (x/16)^2 (y/13)^3 < 0 (aprox.)
            const X = wx / 16 * 1.1, Y = (wy + 2) / 14 * 1.1;
            if ((X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 < 0 && Math.random() < fill) arte.set(x, y, enche[(x + y) % enche.length], mix(COR.vermelho, COR.rosa, (y / arte.rows)), 0.35 + 0.4 * bate);
          }
        }
        for (let i = 0; i < ate; i++) {
          const [x, y] = pts[i];
          arte.set(p.x(x), p.y(y), i > ate - 6 ? '@' : '*', grad([COR.rosa, COR.vermelho, COR.rosa], i / pts.length), f > 0.55 ? bate : 1);
        }
        const s = 't = ' + (Math.min(1, f / 0.55) * 2).toFixed(2) + 'π';
        arte.text(1, arte.rows - 1, s, COR.tenue);
        arte.draw();
      };
    },
    cardioide(arte) {
      const p = plano(arte, -1.6, 1.6, -2.15, 0.4);
      return (t) => {
        arte.clear();
        for (let x = 0; x < arte.cols; x++) arte.set(x, p.y(0), '-', COR.escuro);
        for (let y = 0; y < arte.rows; y++) arte.set(p.x(0), y, ':', COR.escuro);
        const ciclo = 8000, f = (t % ciclo) / ciclo, ate = Math.min(1, f / 0.6) * Math.PI * 2;
        const bate = f > 0.6 ? 1 + 0.06 * Math.sin(t / 160) * Math.max(0, Math.sin(t / 700)) : 1;
        for (let a = 0; a <= ate; a += 0.008) {
          const r = (1 - Math.sin(a)) * bate;
          arte.set(p.x(r * Math.cos(a)), p.y(r * Math.sin(a)), a > ate - 0.08 ? '@' : '#', grad([COR.pessego, COR.rosa, COR.vermelho, COR.rosa], a / (Math.PI * 2)));
        }
        if (f <= 0.6) {
          const r = 1 - Math.sin(ate);
          // o raio a rodar
          for (let s = 0; s < 1; s += 0.04) arte.set(p.x(r * Math.cos(ate) * s), p.y(r * Math.sin(ate) * s), '.', COR.amarelo, 0.7);
        }
        arte.text(1, 0, 'r = 1 - sin θ', COR.tenue);
        arte.draw();
      };
    },
    phi(arte) {
      // quadrados de Fibonacci (a crescer: direita, cima, esquerda, baixo) e a espiral de ouro
      const fib = [1, 1, 2, 3, 5, 8, 13, 21];
      const quads = [[0, 0, 1, 0]]; // [x, y(baixo), lado, direção]
      let bx = 0, by = 0, bw = 1, bh = 1;
      for (let i = 1; i < fib.length; i++) {
        const s = fib[i], d = i % 4;
        const q = d === 1 ? [bx + bw, by, s, d] : d === 2 ? [bx, by + bh, s, d] : d === 3 ? [bx - s, by, s, d] : [bx, by - s, s, d];
        quads.push(q);
        const nx = Math.min(bx, q[0]), ny = Math.min(by, q[1]);
        bw = Math.max(bx + bw, q[0] + s) - nx; bh = Math.max(by + bh, q[1] + s) - ny; bx = nx; by = ny;
      }
      const p = plano(arte, bx, bx + bw, by, by + bh, 2);
      // cada quarto de círculo: centro num canto do quadrado, ângulo inicial pela direção
      const arcos = quads.map(([qx, qy, s, d]) => {
        const c = d === 1 ? [qx, qy + s] : d === 2 ? [qx, qy] : d === 3 ? [qx + s, qy] : [qx + s, qy + s];
        return { cx: c[0], cy: c[1], r: s, a0: [Math.PI, -Math.PI / 2, 0, Math.PI / 2][d] };
      });
      return (t) => {
        arte.clear();
        const ciclo = 9000, f = (t % ciclo) / ciclo;
        const cor = mix(COR.escuro, COR.amarelo, 0.3), corN = mix(COR.escuro, COR.amarelo, 0.55);
        quads.forEach(([qx, qy, s]) => {
          const x0 = Math.round(p.x(qx)), x1 = Math.round(p.x(qx + s)), y0 = Math.round(p.y(qy + s)), y1 = Math.round(p.y(qy));
          for (let xx = x0; xx <= x1; xx++) { arte.set(xx, y0, '-', cor); arte.set(xx, y1, '-', cor); }
          for (let yy = y0; yy <= y1; yy++) { arte.set(x0, yy, '|', cor); arte.set(x1, yy, '|', cor); }
          [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([a, b]) => arte.set(a, b, '+', cor));
          if (s >= 3) { const n = String(s); arte.text(Math.round((x0 + x1) / 2 - n.length / 2), Math.round((y0 + y1) / 2), n, corN); }
        });
        const total = arcos.length, ate = Math.min(1, f / 0.7) * total;
        arcos.forEach((a, i) => {
          if (i > ate) return;
          const fr = Math.min(1, ate - i), passo = 0.6 / Math.max(2, a.r * p.k);
          for (let s = 0; s <= fr; s += passo) {
            const ang = a.a0 + s * Math.PI / 2;
            arte.set(p.x(a.cx + a.r * Math.cos(ang)), p.y(a.cy + a.r * Math.sin(ang)), '*', grad([COR.amarelo, COR.pessego, COR.rosa], (i + s) / total));
          }
        });
        const s = 'φ ≈ 1.6180339887…';
        arte.text(arte.cols - s.length - 1, arte.rows - 1, s, COR.amarelo);
        arte.draw();
      };
    },
    gauss(arte) {
      const ax = eixos(arte, -2.6, 2.6, 0, 1.05, { l: 2, r: 2, t: 1, b: 2 });
      const RAMP = '.:-=+*#%@';
      return (t) => {
        arte.clear();
        const ciclo = 8000, f = (t % ciclo) / ciclo, ate = -2.6 + Math.min(1, f / 0.7) * 5.2;
        for (let c = 0; c < arte.cols; c++) arte.set(c, ax.y(0) + 0, '-', COR.escuro);
        for (let col = Math.ceil(ax.x(-2.6)); col <= ax.x(2.6); col++) {
          const x = -2.6 + (col - ax.m.l) / ax.W * 5.2, y = Math.exp(-x * x), top = ax.y(y);
          if (x <= ate) for (let r = Math.ceil(top); r < ax.y(0); r++) {
            const d = (ax.y(0) - r) / (ax.y(0) - top + 0.01);
            arte.set(col, r, RAMP[Math.min(8, Math.floor((1 - d) * 7) + 1)], grad([COR.lilas, COR.azul, COR.ciano], Math.abs(x) / 3), 0.9);
          }
          arte.set(col, top, x <= ate ? '*' : '.', x <= ate ? COR.branco : COR.tenue);
        }
        const area = (Math.sqrt(Math.PI) * (1 + erf(ate)) / 2);
        const s = 'área = ' + area.toFixed(4) + (f > 0.7 ? ' = √π ♥' : '');
        arte.text(Math.floor(arte.cols / 2 - s.length / 2), arte.rows - 1, s, f > 0.7 ? COR.rosa : COR.tenue);
        arte.draw();
      };
    },
    limite(arte) {
      const ns = [1, 2, 5, 10, 100, 1000, 10000, 100000, 1e6, 1e7];
      const E = Math.E;
      return (t) => {
        arte.clear();
        const ciclo = 9000, f = (t % ciclo) / ciclo, ate = Math.min(ns.length, Math.floor(f / 0.75 * ns.length) + 1);
        arte.text(1, 0, 'n', COR.tenue); arte.text(12, 0, '(1 + 1/n)^n', COR.tenue);
        const bw = arte.cols - 28;
        for (let i = 0; i < ate; i++) {
          const n = ns[i], v = Math.pow(1 + 1 / n, n), y = i + 2;
          arte.text(1, y, n >= 1e6 ? n.toExponential(0).replace('+', '') : String(n), COR.azul);
          arte.text(12, y, v.toFixed(7), i === ate - 1 ? COR.branco : COR.amarelo);
          const fill = Math.round((v - 1.9) / (E - 1.9) * bw);
          for (let k = 0; k < bw; k++) arte.set(24 + k, y, k < fill ? '=' : '.', k < fill ? grad([COR.verde, COR.amarelo, COR.rosa], k / bw) : COR.escuro);
        }
        if (ate >= ns.length) arte.text(1, arte.rows - 1, 'e = 2.718281828459045…  ♥', COR.rosa);
        arte.draw();
      };
    },
    bayes(arte) {
      const ax = eixos(arte, 0, 30, 0, 1, { l: 6, r: 2, t: 1, b: 2 });
      return (t) => {
        arte.clear();
        const ciclo = 8000, f = (t % ciclo) / ciclo, ate = Math.min(30, f / 0.7 * 30);
        for (let r = ax.m.t; r <= ax.y(0); r++) arte.set(ax.m.l - 1, r, '|', COR.escuro);
        for (let c = ax.m.l - 1; c < arte.cols; c++) arte.set(c, ax.y(0) + 1, '-', COR.escuro);
        arte.text(0, ax.y(1), '1.0', COR.tenue); arte.text(0, ax.y(0.5), '0.5', COR.tenue); arte.text(0, ax.y(0), '0.0', COR.tenue);
        let p = 0.5, P = [];
        for (let d = 0; d <= 30; d++) { P.push(p); p = (0.62 * p) / (0.62 * p + 0.45 * (1 - p)); }
        for (let c = ax.m.l; c < arte.cols - ax.m.r; c++) {
          const d = (c - ax.m.l) / ax.W * 30;
          if (d > ate) break;
          const v = P[Math.floor(d)] + (P[Math.min(30, Math.floor(d) + 1)] - P[Math.floor(d)]) * (d % 1);
          arte.set(c, ax.y(v), '*', grad([COR.azul, COR.lilas, COR.rosa], v));
          for (let r = Math.round(ax.y(v)) + 1; r <= ax.y(0); r++) arte.set(c, r, '.', mix(COR.escuro, COR.lilas, 0.3));
        }
        const dia = Math.floor(ate), v = P[dia];
        arte.text(ax.m.l + 1, arte.rows - 1, 'evidência nº ' + dia + '   P(és tu | tudo) = ' + v.toFixed(5), dia >= 30 ? COR.rosa : COR.tenue);
        arte.draw();
      };
    },
    fourier(arte) {
      const ax = eixos(arte, 0, Math.PI * 4, -1.4, 1.4, { l: 1, r: 1, t: 1, b: 1 });
      const notas = [[1, COR.azul], [3, COR.verde], [5, COR.amarelo], [7, COR.rosa]];
      return (t) => {
        arte.clear();
        const fase = t / 900, mostrar = 1 + Math.floor((t % 10000) / 2000) % 5;
        for (let c = 0; c < arte.cols; c++) arte.set(c, ax.y(0), '-', COR.escuro);
        let prev = null;
        for (let c = ax.m.l; c < arte.cols - ax.m.r; c++) {
          const x = (c - ax.m.l) / ax.W * Math.PI * 4 + fase;
          let soma = 0;
          notas.forEach(([k, cor], i) => {
            const v = Math.sin(k * x) / k * (4 / Math.PI) * 0.9;
            if (i < mostrar) { soma += v; if (mostrar <= notas.length) arte.set(c, ax.y(v), '~', cor, 0.75); }
          });
          const ry = Math.round(ax.y(soma));
          if (prev != null) for (let r = Math.min(prev, ry) + 1; r < Math.max(prev, ry); r++) arte.set(c, r, '|', COR.branco, 0.8);
          arte.set(c, ry, '#', COR.branco);
          prev = ry;
        }
        const s = mostrar >= 5 ? 'todas as frequências juntas: o teu nome' : mostrar + (mostrar === 1 ? ' nota pura' : ' notas puras');
        arte.text(Math.floor(arte.cols / 2 - s.length / 2), arte.rows - 1, s, mostrar >= 5 ? COR.rosa : COR.tenue);
        arte.draw();
      };
    },
  };
  function erf(x) { // Abramowitz-Stegun
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  }
  function qualDesenho(b) {
    const t = b.tex || '';
    if (/e\^\{i\\pi\}/.test(t)) return 'euler';
    if (/sin\^\{2\}x/.test(t)) return 'identidade';
    if (/16\\sin\^3/.test(t)) return 'coracao';
    if (/P\(A/.test(t)) return 'bayes';
    if (/varphi/.test(t)) return 'phi';
    if (/e\^\{-x\^\{2\}\}/.test(t)) return 'gauss';
    if (/\\lim/.test(t)) return 'limite';
    if (/hat\{f\}/.test(t)) return 'fourier';
    if (/1 - \\sin/.test(t)) return 'cardioide';
    return null;
  }

  /* ----------------------------------- realce de sintaxe (python-ish) */
  const KW = /\b(def|while|True|False|if|elif|else|for|in|return|try|except|finally|raise|import|as|assert|not|and|or|None|print|range)\b/;
  function realcar(linha) {
    const frag = document.createDocumentFragment();
    const re = /(#.*$)|("[^"]*"|'[^']*'|f"[^"]*")|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_À-ÿ][\wÀ-ÿ]*\b)(?=\s*\()|(\b[A-Za-z_À-ÿ][\wÀ-ÿ]*\b)|([=+\-<>*/!]+|→|∞)/g;
    let i = 0, m;
    while ((m = re.exec(linha))) {
      if (m.index > i) frag.appendChild(document.createTextNode(linha.slice(i, m.index)));
      let cls = '';
      if (m[1]) cls = 'com'; else if (m[2]) cls = 'str'; else if (m[3]) cls = 'num';
      else if (m[4]) cls = KW.test(m[4]) ? 'kw' : 'fn';
      else if (m[5]) cls = KW.test(m[5]) ? 'kw' : /^[A-Z]/.test(m[5]) ? 'cls' : 'id';
      else if (m[6]) cls = 'op';
      frag.appendChild(el('span', 'sx-' + cls, m[0]));
      i = m.index + m[0].length;
    }
    if (i < linha.length) frag.appendChild(document.createTextNode(linha.slice(i)));
    return frag;
  }
  function codigoPre(codigo, cls) {
    const pre = el('pre', 'b-codigo' + (cls ? ' ' + cls : ''));
    const code = el('code');
    codigo.split('\n').forEach((l, i) => {
      const linha = el('span', 'b-codigo__l');
      linha.appendChild(el('span', 'b-codigo__n', pad(i + 1, 2, ' ')));
      linha.appendChild(realcar(l));
      code.appendChild(linha);
    });
    pre.appendChild(code);
    return pre;
  }

  /* =================================================================
     MOUNT
     ================================================================= */
  function mount(host, cfg = {}) {
    const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vivo = true;
    const limpar = [];
    if (getComputedStyle(host).overflowY === 'visible') { host.style.overflowY = 'auto'; limpar.push(() => { host.style.overflowY = ''; }); }

    const root = el('div', 'blog' + (reduzido ? ' blog--rm' : ''));
    root.setAttribute('lang', 'pt-PT');
    const motor = Motor(host, reduzido);
    const artes = []; // para redimensionar
    const comp = cfg.computador || { blocos: [] };
    const alc = cfg.alcunhas || {};
    const dele = alc.dele || cfg.ele || 'ele', dela = alc.dela || cfg.ela || 'ela';

    /* ------------ o céu de estrelinhas (fica atrás, preso ao ecrã) */
    const ceu = el('canvas', 'blog__ceu'); ceu.setAttribute('aria-hidden', 'true');
    root.appendChild(ceu);
    const col = el('div', 'blog__col');
    root.appendChild(col);
    host.appendChild(root);

    let estrelas = [];
    function prepararCeu() {
      const w = host.clientWidth, h = host.clientHeight;
      root.style.setProperty('--b-h', h + 'px');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ceu.width = Math.round(w * dpr); ceu.height = Math.round(h * dpr);
      ceu.style.width = w + 'px'; ceu.style.height = h + 'px';
      const n = Math.round(w * h / 5200);
      estrelas = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, c: pick(['.', '.', '.', '·', '*', '+', '✦']),
        cor: pick([COR.branco, COR.branco, COR.azul, COR.rosa, COR.amarelo, COR.lilas]),
        f: rnd(0.4, 1.6), p: rnd(0, 6.28), s: rnd(8, 13),
      }));
      desenharCeu(0);
    }
    function desenharCeu(t) {
      const ctx = ceu.getContext('2d'), dpr = ceu.width / Math.max(1, ceu.clientWidth || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ceu.width, ceu.height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const s of estrelas) {
        const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.f + s.p));
        ctx.globalAlpha = reduzido ? 0.5 : a;
        ctx.fillStyle = s.cor;
        ctx.font = s.s + 'px ' + MONO;
        ctx.fillText(s.c, s.x, s.y);
      }
      ctx.globalAlpha = 1;
    }
    // o céu anima sempre (é pequeno); fica preso ao topo do ecrã com position: sticky
    let rafCeu = 0, tCeu = 0;
    function loopCeu(t) { rafCeu = 0; if (!vivo) return; if (t - tCeu > 90) { tCeu = t; desenharCeu(t); } rafCeu = requestAnimationFrame(loopCeu); }

    /* ---------------------------------------------- ajudantes de layout */
    let nPost = 0;
    function post(tipo, rotulo, o = {}) {
      const a = el('article', 'b-post b-post--' + tipo + ' b-rev');
      if (o.id) a.id = o.id;
      a.appendChild(moldura(rotulo, o));
      const corpo = el('div', 'b-post__corpo');
      a.appendChild(corpo);
      col.appendChild(a);
      motor.observar(a, o.aoEntrar);
      return { a, corpo };
    }
    function titulo(corpo, t, cls) { const h = el('h2', 'b-titulo' + (cls ? ' ' + cls : ''), t); corpo.appendChild(h); return h; }
    function paragrafos(corpo, texto, cls) {
      String(texto || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).forEach((p, i) => {
        const e = el('p', 'b-texto' + (cls ? ' ' + cls : ''), p);
        e.style.setProperty('--i', i);
        corpo.appendChild(e);
      });
    }
    function registarArte(a, anima) {
      artes.push(a);
      if (anima) {
        if (reduzido) { anima(60000); }
        else motor.animar(a.box, anima);
      }
      return a;
    }
    function largura() { return col.clientWidth || host.clientWidth || 320; }
    // quantas colunas de arte cabem: densidade alvo de ~6.4px por célula
    function colsPara(alvo, min = 40) { return Math.max(min, Math.min(alvo, Math.floor(largura() / 5.2))); }

    // um clip (foto, jogo): Ascii.desenhar do agente A, ou o nosso fallback
    function desenharClip(host2, c, o = {}) {
      const wrap = el('div', 'b-clip' + (o.cls ? ' ' + o.cls : ''));
      wrap.style.setProperty('--ar', (c.cols * (c.cell || CELL)) / c.rows);
      host2.appendChild(wrap);
      // por omissão usamos o nosso desenho: o bloom do Ascii.desenhar (feito para os clips esparsos dos vídeos)
      // queima as fotografias densas. cfg.usarAscii = true para usar o do agente A.
      if (cfg.usarAscii && window.Ascii && typeof window.Ascii.desenhar === 'function') {
        try {
          const cv = el('canvas', 'b-clip__cv'); cv.setAttribute('aria-hidden', 'true');
          wrap.appendChild(cv);
          const h = window.Ascii.desenhar(cv, c, { frame: 0, glow: o.glow != null ? o.glow : 0.1, cintilar: !reduzido, fundo: 'transparent' });
          if (h && h.destroy) limpar.push(() => h.destroy());
          return wrap;
        } catch (e) { console.warn('blog: Ascii.desenhar falhou, uso o meu', e); wrap.innerHTML = ''; }
      }
      const a = Arte(wrap, c.cols, c.rows, { maxFs: o.maxFs || 9, cls: 'b-arte--clip' });
      preencherClip(a, c);
      artes.push(a);
      a.resize();
      return wrap;
    }
    // revela a fotografia verdadeira numa «lente» macia que segue o rato (ou o dedo)
    function comFoto(wrap, fotoId) {
      const f = cfg.fotos && cfg.fotos[fotoId];
      if (!f || !f.src) return;
      const img = el('img', 'b-clip__foto');
      img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
      img.src = (/^(https?:|data:|\/)/.test(f.src) ? '' : BASE) + f.src;
      wrap.appendChild(img);
      const dica = el('span', 'b-clip__dica', matchMedia('(hover: none)').matches ? '✦ toca para ver' : '✦ passa o rato');
      dica.setAttribute('aria-hidden', 'true');
      wrap.appendChild(dica);
      wrap.classList.add('b-clip--foto');
      // posição e raio da lente: seguem o alvo com atraso (lerp), parando quando assentam
      const st = { x: 50, y: 50, r: 0, tx: 50, ty: 50, tr: 0, raf: 0 };
      const aplicar = () => {
        wrap.style.setProperty('--mx', st.x.toFixed(2) + '%');
        wrap.style.setProperty('--my', st.y.toFixed(2) + '%');
        wrap.style.setProperty('--r', st.r.toFixed(1) + 'px');
      };
      const passo = () => {
        st.raf = 0;
        if (!vivo) return;
        const k = reduzido ? 1 : 0.2;
        st.x += (st.tx - st.x) * k; st.y += (st.ty - st.y) * k; st.r += (st.tr - st.r) * (reduzido ? 1 : 0.14);
        aplicar();
        if (Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) + Math.abs(st.tr - st.r) > 0.15) st.raf = requestAnimationFrame(passo);
      };
      const mexe = () => { if (!st.raf) st.raf = requestAnimationFrame(passo); };
      const raio = () => Math.max(90, Math.min(200, wrap.clientWidth * 0.42));
      const mover = (e) => {
        const r = wrap.getBoundingClientRect();
        st.tx = (e.clientX - r.left) / r.width * 100; st.ty = (e.clientY - r.top) / r.height * 100;
        if (st.tr === 0) { st.x = st.tx; st.y = st.ty; }
        st.tr = raio();
        wrap.classList.add('is-ver');
        mexe();
      };
      wrap.addEventListener('pointermove', mover);
      wrap.addEventListener('pointerdown', mover);
      wrap.addEventListener('pointerleave', () => { st.tr = 0; wrap.classList.remove('is-ver'); mexe(); });
      wrap.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(() => { st.tr = 0; wrap.classList.remove('is-ver'); mexe(); }, 1800); });
      limpar.push(() => { if (st.raf) cancelAnimationFrame(st.raf); });
    }
    function dataDoId(id) {
      const m = String(id).match(/(20\d\d)(\d\d)(\d\d)/);
      return m ? m[3] + '·' + m[2] + '·' + m[1] : '';
    }

    /* ======================================================= CABEÇALHO */
    const hoje = new Date();
    const ini = Array.isArray(cfg.inicio) ? new Date(cfg.inicio[0], cfg.inicio[1] - 1, cfg.inicio[2]) : null;
    const diaMs = 86400000;
    const diasJuntos = ini ? Math.floor((Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) - Date.UTC(ini.getFullYear(), ini.getMonth(), ini.getDate())) / diaMs) : 0;
    const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dataCurta = (d) => pad(d.getDate(), 2) + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();

    const cab = el('header', 'b-cab');
    col.appendChild(cab);
    cab.appendChild(el('p', 'b-cab__url', 'http://www.' + dele + '.pt/~' + dela + '/'));
    const letreiroCab = el('div', 'b-cab__letreiro');
    cab.appendChild(letreiroCab);
    const sub = el('p', 'b-cab__sub');
    sub.append(el('span', 'b-cor-rosa', '♥ '), el('span', '', 'a página pessoal do computador do ' + (cfg.ele || 'Diogo') + ', feita só para a '), el('span', 'b-cor-amarelo', dela), el('span', 'b-cor-rosa', ' ♥'));
    cab.appendChild(sub);
    const meta = el('div', 'b-cab__meta');
    const visit = el('p', 'b-contador-visitas');
    visit.append(el('span', '', 'visitante nº '), el('span', 'b-odometro', '000001'), el('span', 'b-tenue', ' (a única que importa)'));
    meta.append(
      visit,
      el('p', 'b-tenue', 'última atualização: ' + dataCurta(hoje) + (ini ? ' · no ar há ' + diasJuntos + ' dias' : '')),
      el('p', 'b-tenue', 'melhor visto com: os teus olhos · 800×600 · coração ligado'),
    );
    cab.appendChild(meta);

    // menu à BBS: salta para as secções
    const nav = el('nav', 'b-menu');
    nav.setAttribute('aria-label', 'Secções do blog');
    cab.appendChild(nav);
    const menu = [];
    function entradaMenu(tecla, nome, alvoId) { menu.push({ tecla, nome, alvoId }); }

    /* =========================================================== BLOCOS */
    const blocos = (comp.blocos || []).slice();
    let primeiraVez = {};
    let nMsg = 0;
    const ICONES = ['<3', '*', '~', '@>-', ':)', '♪', '✿', '☆'];

    function bloco(b) {
      const tipo = b.tipo;
      const id = 'b-' + tipo + '-' + (++nPost);
      if (!primeiraVez[tipo]) primeiraVez[tipo] = id;
      if (tipo === 'neon') return capitulo(b, id);
      if (tipo === 'mensagem') return mensagem(b, id);
      if (tipo === 'terminal') return terminal(b, id);
      if (tipo === 'piadas') return piadas(b, id);
      if (tipo === 'formula') return formula(b, id);
      if (tipo === 'poemacodigo') return poemaCodigo(b, id);
      if (tipo === 'previsao') return previsao(b, id);
      if (tipo === 'perda') return perda(b, id);
      if (tipo === 'tars') return tars(b, id);
      if (tipo === 'jogos') return jogos(b, id);
      if (tipo === 'gifs') return gifs(b, id);
      if (tipo === 'retrato') return retrato(b, id);
      if (tipo === 'mapa') return mapa(b, id);
      if (tipo === 'contador') return contador(b, id);
      const { corpo } = post('outro', tipo, { id });
      if (b.titulo) titulo(corpo, b.titulo);
      paragrafos(corpo, b.texto || '');
      return null;
    }

    function capitulo(b, id) {
      const s = el('section', 'b-cap b-rev'); s.id = id;
      s.setAttribute('aria-label', b.texto || '');
      const deco = el('p', 'b-cap__deco', '.  *  .   ✦   .  *  .'); deco.setAttribute('aria-hidden', 'true');
      s.appendChild(deco);
      const lt = el('div', 'b-cap__letreiro'); s.appendChild(lt);
      const t = el('p', 'b-sr', b.texto || ''); s.appendChild(t);
      if (b.kana) { const k = el('p', 'b-cap__kana', b.kana); k.setAttribute('aria-hidden', 'true'); s.appendChild(k); }
      if (b.imagem) {
        const fg = el('figure', 'b-cap__cena');
        const im = el('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
        im.addEventListener('error', () => fg.remove());
        im.src = b.imagem;
        fg.appendChild(im); if (b.legenda) fg.appendChild(el('figcaption', 'b-tenue', b.legenda));
        s.appendChild(fg);
      }
      col.appendChild(s);
      motor.observar(s);
      tarefas.push(() => {
        const a = letreiro(lt, b.texto || '', { rows: 12, minRows: 5, minCell: 3.6, cores: [COR.lilas, COR.azul, COR.ciano, COR.verde, COR.lilas], maxFs: 11 });
        registarArte(a, (tt) => a.anima(tt));
      });
      return null;
    }

    function mensagem(b, id) {
      nMsg++;
      const rot = b.titulo ? 'post' : 'nota ' + pad(nMsg, 2);
      const { corpo } = post('mensagem', rot, { id, dir: ' ' + ICONES[nMsg % ICONES.length] + ' --+' });
      if (b.titulo) titulo(corpo, b.titulo);
      paragrafos(corpo, b.texto);
      if (b.assinatura) corpo.appendChild(el('p', 'b-assinatura', '— ' + b.assinatura));
      const cur = el('span', 'b-cursor', '_'); cur.setAttribute('aria-hidden', 'true');
      const ult = corpo.lastElementChild; if (ult) ult.appendChild(cur);
      if (!entrouMenu.mensagem) { entrouMenu.mensagem = true; entradaMenu('1', 'mensagens', id); }
      return null;
    }
    const entrouMenu = {};

    function terminal(b, id) {
      const { corpo } = post('terminal', b.titulo || 'terminal', { id, aoEntrar: () => correr() });
      const win = el('div', 'b-term');
      const barra = el('div', 'b-term__barra');
      barra.append(el('span', 'b-term__pontos', '● ● ●'), el('span', 'b-term__nome', b.titulo || ''));
      const ecr = el('div', 'b-term__ecra');
      ecr.setAttribute('role', 'log');
      win.append(barra, ecr);
      corpo.appendChild(win);
      const again = botao('b-botao b-botao--mini', '↻ correr outra vez');
      again.hidden = true;
      corpo.appendChild(again);
      const linhas = Array.isArray(b.linhas) ? b.linhas : String(b.linhas || '').split('\n').map((l) => /^\s*>>>/.test(l) ? { cmd: l.trim() } : { out: l, tom: 'ok' });
      let corrida = 0;
      async function correr() {
        const minha = ++corrida;
        const ok = () => vivo && minha === corrida;
        ecr.innerHTML = ''; again.hidden = true;
        for (const l of linhas) {
          if (!ok()) return;
          const p = el('p', 'b-term__l ' + (l.cmd ? 'b-term__cmd' : 'b-term__out b-tom-' + (l.tom || 'ok')));
          ecr.appendChild(p);
          if (l.cmd) {
            p.appendChild(el('span', 'b-term__prompt', dele + '@amor:~$ '));
            const s = el('span'); p.appendChild(s);
            const cur = el('span', 'b-cursor', '█'); p.appendChild(cur);
            await escrever(s, l.cmd.replace(/^>>>\s*/, ''), { vel: 34, reduzido, vivo: ok });
            await sleep(reduzido ? 0 : 260);
            cur.remove();
          } else {
            setText(p, l.out);
            if (!reduzido) { p.classList.add('is-novo'); await sleep(320); }
          }
        }
        if (!ok()) return;
        const fim = el('p', 'b-term__l b-term__cmd');
        fim.append(el('span', 'b-term__prompt', dele + '@amor:~$ '), el('span', 'b-cursor', '█'));
        ecr.appendChild(fim);
        again.hidden = false;
      }
      again.addEventListener('click', correr);
      return null;
    }

    function piadas(b, id) {
      const itens = (b.itens || []).map((x, i) => (typeof x === 'string' ? { cat: '', texto: x, i } : Object.assign({ i }, x)));
      const { corpo } = post('piadas', 'fortune', { id, aoEntrar: () => mostrar(true) });
      if (b.titulo) titulo(corpo, b.titulo);
      const cats = ['todas'].concat([...new Set(itens.map((x) => x.cat).filter(Boolean))]);
      const tabs = el('div', 'b-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Categorias');
      let cat = 'todas';
      const botoesCat = cats.map((c) => {
        const bt = botao('b-tab', c === 'todas' ? 'todas' : c);
        bt.setAttribute('aria-pressed', String(c === cat));
        bt.addEventListener('click', () => { cat = c; botoesCat.forEach((x, i) => x.setAttribute('aria-pressed', String(cats[i] === cat))); mostrar(); });
        tabs.appendChild(bt);
        return bt;
      });
      corpo.appendChild(tabs);
      const caixa = el('div', 'b-fortune');
      const bolacha = el('pre', 'b-fortune__bolacha', [
        '    .-~~~-.',
        '  .\'  .-.  \'.',
        ' /   ( ♥ )   \\',
        ' |    \'-\'    |~~.',
        '  \\         /   |',
        '   \'-.___.-\'  ~~\'',
      ].join('\n'));
      bolacha.setAttribute('aria-hidden', 'true');
      const cabF = el('p', 'b-fortune__cab');
      const texto = el('p', 'b-fortune__texto'); texto.setAttribute('aria-live', 'polite');
      caixa.append(bolacha, cabF, texto);
      corpo.appendChild(caixa);
      const acoes = el('div', 'b-acoes');
      const outra = botao('b-botao', '> outra piada');
      const lidas = el('p', 'b-tenue b-lidas');
      acoes.append(outra, lidas);
      corpo.appendChild(acoes);
      const vistas = new Set();
      let atual = null, corrida = 0;
      function mostrar(primeira) {
        const pool = itens.filter((x) => cat === 'todas' || x.cat === cat);
        if (!pool.length) return;
        let livres = pool.filter((x) => !vistas.has(x.i) && x !== atual);
        if (!livres.length) { pool.forEach((x) => vistas.delete(x.i)); livres = pool.filter((x) => x !== atual); }
        atual = primeira ? pool[0] : pick(livres.length ? livres : pool);
        vistas.add(atual.i);
        cabF.innerHTML = '';
        cabF.append(el('span', 'b-cor-amarelo', 'fortune #' + pad(atual.i + 1, 2)), el('span', 'b-tenue', ' / ' + itens.length + '  '), el('span', 'b-cat b-cat--' + slug(atual.cat), atual.cat ? '[' + atual.cat + ']' : ''));
        const minha = ++corrida;
        escrever(texto, atual.texto, { vel: 9, passo: 2, reduzido, vivo: () => vivo && minha === corrida });
        lidas.textContent = 'já leste ' + vistasTotal.add(atual.i).size + ' de ' + itens.length;
        caixa.classList.remove('is-abre'); void caixa.offsetWidth; caixa.classList.add('is-abre');
      }
      const vistasTotal = new Set();
      outra.addEventListener('click', () => mostrar());
      entradaMenu('2', 'piadas', id);
      return null;
    }
    function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase(); }

    function formula(b, id) {
      const { corpo } = post('formula', 'fórmula', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      const f = el('p', 'b-formula');
      f.innerHTML = texHTML(b.tex || '');
      f.setAttribute('aria-label', b.tex || '');
      corpo.appendChild(f);
      const qual = b.conta ? null : qualDesenho(b);
      if (Array.isArray(b.conta)) {
        const pre = el('pre', 'b-conta');
        b.conta.forEach((l) => { const ln = el('span', 'b-conta__l' + (/^P\(A\|B\)/.test(l) ? ' b-conta__res' : ''), l || ' '); pre.appendChild(ln); });
        corpo.appendChild(pre);
      }
      if (qual) {
        const zona = el('div', 'b-plot');
        corpo.appendChild(zona);
        tarefas.push(() => {
          const altos = { limite: 13, euler: 24, identidade: 24, coracao: 26, cardioide: 24, phi: 24, gauss: 18, bayes: 16, fourier: 16 };
          const cols = colsPara(qual === 'limite' ? 62 : 76, 52);
          const a = Arte(zona, cols, altos[qual] || 22, { maxFs: 13 });
          a.resize();
          const anima = DESENHOS[qual](a);
          registarArte(a, anima);
          if (!reduzido) anima(0); else anima(60000);
        });
      }
      // fotografias a acompanhar a fórmula (os anéis)
      if (Array.isArray(b.fotos) && b.fotos.length) {
        const par = el('div', 'b-anel');
        b.fotos.forEach((id) => {
          const ph = cfg.fotos && cfg.fotos[id]; if (!ph || !ph.src) return;
          const fig = el('figure', 'b-anel__f');
          const im = el('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
          im.src = (/^(https?:|data:|\/)/.test(ph.src) ? '' : BASE) + ph.src;
          fig.appendChild(im); par.appendChild(fig);
        });
        if (par.children.length) corpo.appendChild(par);
      }
      if (b.notas) paragrafos(corpo, b.texto || '', 'b-texto--nota'); // as notas explicativas ficam desligadas (b.notas = true para as ver)
      if (!entrouMenu.formula) { entrouMenu.formula = true; entradaMenu('3', 'fórmulas', id); }
      return null;
    }

    function poemaCodigo(b, id) {
      const { corpo } = post('poemacodigo', 'poema.py', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      const duo = el('div', 'b-duo');
      const poema = el('div', 'b-duo__poema');
      String(b.poema || '').split(/\n\s*\n/).forEach((estrofe) => {
        const p = el('p', 'b-verso');
        estrofe.split('\n').forEach((l, i) => { if (i) p.appendChild(el('br')); p.appendChild(document.createTextNode(l)); });
        poema.appendChild(p);
      });
      duo.append(poema, codigoPre(b.codigo || ''));
      corpo.appendChild(duo);
      return null;
    }

    function barraTxt(v, w) { const n = Math.round(Math.max(0, Math.min(1, v)) * w); return '#'.repeat(n) + '.'.repeat(w - n); }
    function previsao(b, id) {
      const { corpo } = post('previsao', 'modelo.prever()', { id, aoEntrar: () => correr() });
      if (b.titulo) titulo(corpo, b.titulo);
      const verso = el('p', 'b-previsao__verso');
      const vtxt = el('span'), vfalta = el('span', 'b-previsao__falta', ' ____'), cur = el('span', 'b-cursor', '█');
      verso.append(vtxt, vfalta, cur);
      corpo.appendChild(verso);
      const lista = el('div', 'b-barras');
      corpo.appendChild(lista);
      const nota = el('p', 'b-texto b-texto--nota b-previsao__nota', b.notas ? (b.nota || '') : ''); nota.hidden = true;
      corpo.appendChild(nota);
      const op = (b.opcoes || []).slice();
      const W = 22;
      let feito = false;
      async function correr() {
        if (feito) return; feito = true;
        await escrever(vtxt, b.verso || '', { vel: 40, reduzido, vivo: () => vivo });
        const linhas = op.concat(b.certa ? [Object.assign({ certa: true }, b.certa)] : []);
        const max = Math.max(...op.map((o) => o.p), 0.0001);
        for (const o of linhas) {
          if (!vivo) return;
          const row = el('p', 'b-barra' + (o.certa ? ' b-barra--certa' : ''));
          const nome = el('span', 'b-barra__nome', o.w.padEnd(8, ' '));
          const bar = el('span', 'b-barra__bar', '[' + '.'.repeat(W) + ']');
          const pct = el('span', 'b-barra__pct', '');
          row.append(nome, bar, pct);
          lista.appendChild(row);
          const alvo = o.p / max;
          const passos = reduzido ? 1 : 14;
          for (let s = 1; s <= passos; s++) {
            bar.textContent = '[' + barraTxt(alvo * s / passos, W) + ']';
            pct.textContent = ' ' + (o.p * 100 * s / passos).toFixed(o.p < 0.01 ? 2 : 0) + '%';
            if (!reduzido) await sleep(28);
          }
          if (!reduzido) await sleep(140);
        }
        if (!vivo) return;
        await sleep(reduzido ? 0 : 500);
        vfalta.textContent = ' ' + (b.certa ? b.certa.w : '');
        vfalta.classList.add('is-certa');
        cur.remove();
        nota.hidden = false;
      }
      return null;
    }

    function perda(b, id) {
      const { corpo } = post('perda', 'treino.log', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      const zona = el('div', 'b-plot'); corpo.appendChild(zona);
      const E = b.epocas || 1461;
      const marcos = b.marcos || [];
      tarefas.push(() => {
        const cols = colsPara(76, 52), rows = 18;
        const a = Arte(zona, cols, rows, { maxFs: 13 });
        a.resize();
        const ax = eixos(a, 0, E, 0, 1, { l: 5, r: 2, t: 1, b: 3 });
        // ruído estável
        const ruido = Array.from({ length: cols }, (_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1);
        const L = (e) => 0.05 + 0.85 * Math.exp(-e / 260) + 0.03 * Math.abs(Math.sin(e / 37));
        const T = (e) => 0.015 + 0.78 * Math.exp(-e / 190) + 0.012 * Math.abs(Math.sin(e / 23)); // perda do treino: sempre abaixo da de validação
        const anima = (t) => {
          a.clear();
          const ciclo = 9000, f = Math.min(1, ((t % ciclo) / ciclo) / 0.75);
          for (let r = ax.m.t; r <= ax.y(0); r++) a.set(ax.m.l - 1, r, '|', COR.escuro);
          for (let c = ax.m.l - 1; c < cols; c++) a.set(c, ax.y(0) + 1, '-', COR.escuro);
          a.text(0, ax.y(1), '1.0', COR.tenue); a.text(0, ax.y(0), '0.0', COR.tenue);
          const ate = ax.m.l + f * ax.W;
          let ult = null;
          for (let c = ax.m.l; c < ate; c++) { const e = (c - ax.m.l) / ax.W * E; a.set(c, Math.round(ax.y(T(e) + (ruido[(c * 7) % cols] || 0) * 0.025)), 'o', COR.ciano, 0.9); }
          for (let c = ax.m.l; c < ate; c++) {
            const e = (c - ax.m.l) / ax.W * E, v = L(e) + (ruido[c] || 0) * 0.04;
            const cor = grad([COR.vermelho, COR.pessego, COR.amarelo, COR.verde], e / E), ry = Math.round(ax.y(v));
            if (ult) for (let r = Math.round(ult[1]) + 1; r < ry; r++) a.set(c - 1, r, ':', cor, 0.8);
            a.set(c, ry, '*', cor);
            ult = [c, ax.y(v), e];
          }
          marcos.forEach((m, i) => {
            const c = ax.x(m.epoca);
            if (c > ate) return;
            const r = ax.y(L(m.epoca)) - 1 - (i % 2);
            a.set(c, Math.max(0, r), '♥', COR.rosa);
            a.set(c, ax.y(0) + 1, '+', COR.rosa);
          });
          if (ult) a.text(Math.max(ax.m.l, Math.min(cols - 36, ult[0] - 36)), rows - 1, 'época ' + pad(Math.round(ult[2]) || 1, 4, ' ') + '  treino ' + T(ult[2]).toFixed(3) + '  valid. ' + L(ult[2]).toFixed(3), COR.tenue);
          a.draw();
        };
        registarArte(a, anima);
        anima(reduzido ? 9000 * 0.75 : 0);
      });
      const chave = el('p', 'b-texto b-texto--nota b-chave'); chave.append(el('span', 'b-cor-ciano', 'o'), document.createTextNode(' perda do treino   '), el('span', 'b-cor-rosa', '*'), document.createTextNode(' perda de validação')); corpo.appendChild(chave);
      const leg = el('ul', 'b-marcos');
      marcos.forEach((m) => { const li = el('li'); li.append(el('span', 'b-cor-rosa', '♥ '), document.createTextNode(m.txt)); leg.appendChild(li); });
      corpo.appendChild(leg);
      if (b.notas && b.legenda) paragrafos(corpo, b.legenda, 'b-texto--nota');
      return null;
    }

    function tars(b, id) {
      const { corpo } = post('tars', 'tars.cfg', { id, aoEntrar: () => correr() });
      if (b.titulo) titulo(corpo, b.titulo);
      if (b.texto) paragrafos(corpo, b.texto);
      const lista = el('div', 'b-barras b-barras--tars');
      corpo.appendChild(lista);
      const W = 20;
      const linhas = (b.itens || []).map((it) => {
        const row = el('div', 'b-tars' + (it.overflow ? ' b-tars--over' : ''));
        const nome = el('p', 'b-tars__nome', it.nome);
        const linha = el('p', 'b-barra');
        const bar = el('span', 'b-barra__bar', '[' + '.'.repeat(W) + ']');
        const extra = el('span', 'b-tars__extra', '');
        const pct = el('span', 'b-barra__pct', ' 0%');
        linha.append(bar, extra, pct);
        row.append(nome, linha);
        lista.appendChild(row);
        return { it, bar, pct, extra, row };
      });
      let feito = false;
      async function correr() {
        if (feito) return; feito = true;
        for (const l of linhas) {
          const passos = reduzido ? 1 : 16;
          for (let s = 1; s <= passos; s++) {
            const v = l.it.v / 100 * s / passos;
            l.bar.textContent = '[' + barraTxt(v, W) + ']';
            l.pct.textContent = ' ' + Math.round(l.it.v * s / passos) + '%';
            if (!reduzido) await sleep(26);
          }
          if (l.it.overflow) {
            const coisas = '###♥##♥#♥♥';
            for (let k = 1; k <= coisas.length; k++) { l.extra.textContent = coisas.slice(0, k); if (!reduzido) await sleep(60); }
            l.pct.textContent = ' 100%… ∞';
            const err = el('p', 'b-tars__erro', 'aviso: valor acima do máximo permitido. não corrigir.');
            l.row.appendChild(err);
          }
          if (!vivo) return;
        }
      }
      return null;
    }

    function jogos(b, id) {
      const { corpo } = post('jogos', 'jogos.sav', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      (b.itens || []).forEach((j, n) => {
        const card = el('div', 'b-jogo');
        const arte = el('div', 'b-jogo__arte');
        card.appendChild(arte);
        const info = el('div', 'b-jogo__info');
        info.appendChild(el('h3', 'b-jogo__nome', j.nome));
        if (j.texto) info.appendChild(el('p', 'b-texto', j.texto));
        if (j.detalhe) {
          const d = el('p', 'b-jogo__det');
          d.append(el('span', 'b-cor-amarelo', '★ conquista: '), document.createTextNode(j.detalhe));
          info.appendChild(d);
        }
        card.appendChild(info);
        corpo.appendChild(card);
        // os jogos não precisam de ser ASCII: a capa a sério, com inclinação e brilho ao passar o rato
        // (sem ligação, ou sem imagem, cai de volta para o desenho em caracteres)
        const caiParaAscii = () => {
          arte.textContent = '';
          clip('blog-jogo-' + n, 'blog-jogos.js').then((c) => {
            if (!vivo) return;
            if (c) desenharClip(arte, c, { maxFs: 11 });
            else { arte.classList.add('b-jogo__arte--vazia'); arte.appendChild(el('pre', '', '[ ' + j.nome + ' ]')); }
          });
        };
        if (j.imagem) {
          const capa = el('div', 'b-jogo__capa');
          const im = new Image(); im.alt = j.nome; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
          im.addEventListener('error', caiParaAscii);
          im.src = j.imagem;
          capa.append(im, el('span', 'b-jogo__selo', '2P · co-op'));
          if (!reduzido) {
            capa.addEventListener('pointermove', (e) => {
              const r = capa.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
              capa.style.setProperty('--rx', ((x - 0.5) * 9).toFixed(2) + 'deg');
              capa.style.setProperty('--ry', ((0.5 - y) * 7).toFixed(2) + 'deg');
              capa.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); capa.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
            });
            capa.addEventListener('pointerleave', () => { capa.style.setProperty('--rx', '0deg'); capa.style.setProperty('--ry', '0deg'); });
          }
          arte.appendChild(capa);
        } else caiParaAscii();
      });
      entradaMenu('4', 'jogos', id);
      return null;
    }

    function retrato(b, id) {
      const { corpo } = post('retrato', b.rotulo || 'retrato.jpg', { id });
      const pessoas = b.pessoas || [{ foto: b.foto, legenda: b.legendaFoto }];
      const par = el('div', 'b-retratos' + (pessoas.length > 1 ? ' b-retratos--par' : ''));
      corpo.appendChild(par);
      pessoas.forEach((pp) => {
        const fig = el('figure', 'b-retrato');
        const zona = el('div', 'b-retrato__zona');
        fig.appendChild(zona);
        if (pp.legenda) fig.appendChild(el('figcaption', 'b-retrato__nome', pp.legenda));
        par.appendChild(fig);
        clip('blog-foto-' + pp.foto, 'blog-fotos.js').then((c) => {
          if (!vivo || !c) return;
          const w = desenharClip(zona, c, { maxFs: pessoas.length > 1 ? 8 : 11 });
          comFoto(w, pp.foto);
        });
      });
      if (b.legenda) corpo.appendChild(el('p', 'b-legenda', b.legenda));
      return null;
    }

    function album(id) {
      const { corpo } = post('album', 'us.jpg', { id });
      titulo(corpo, 'Us');
      const grelha = el('div', 'b-album');
      corpo.appendChild(grelha);
      carregar('blog-fotos.js').then(() => {
        if (!vivo) return;
        const ret = []; blocos.filter((x) => x.tipo === 'retrato').forEach((x) => (x.pessoas || [x]).forEach((pp) => ret.push('blog-foto-' + pp.foto)));
        const lista = Object.keys(clips()).filter((k) => k.indexOf('blog-foto-') === 0 && ret.indexOf(k) < 0);
        lista.sort((x, y) => (clips()[x].cols > clips()[x].rows * 2) - (clips()[y].cols > clips()[y].rows * 2));
        lista.forEach((k) => {
          const c = clips()[k], fid = c.foto || k.replace('blog-foto-', '');
          const fig = el('figure', 'b-album__f' + (c.cols > c.rows * 2 ? ' b-album__f--largo' : ''));
          grelha.appendChild(fig);
          const w = desenharClip(fig, c, { maxFs: 9 });
          comFoto(w, fid);
          fig.appendChild(el('figcaption', 'b-tenue', dataDoId(fid)));
        });
        if (!lista.length) corpo.parentNode && corpo.parentNode.remove();
      });
    }

    function gifs(b, id) {
      const { corpo } = post('gifs', 'aranha.gif', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      if (b.filme) { // o filme em destaque: cartaz à esquerda, informação à direita
        const cartao = el('div', 'b-filme');
        const fp = el('figure', 'b-filme__cartaz');
        const im = el('img'); im.alt = b.filme.nome; im.decoding = 'async'; im.addEventListener('error', () => cartao.remove()); im.src = (/^(https?:|data:|\/)/.test(b.filme.imagem) ? '' : BASE) + b.filme.imagem;
        fp.appendChild(im);
        const info = el('div', 'b-filme__info');
        info.append(el('p', 'b-filme__tag', 'em cartaz · 2026'), el('h3', 'b-filme__nome', b.filme.nome), el('p', 'b-filme__txt', b.filme.legenda || ''));
        cartao.append(fp, info);
        corpo.appendChild(cartao);
      }
      const grade = el('div', 'b-gifs');
      (b.itens || []).forEach((it, k) => {
        const fig = el('figure', 'b-gifs__f');
        fig.style.setProperty('--rot', ((k % 2 ? 1 : -1) * (1 + (k % 3) * 0.5)) + 'deg');
        const im = el('img'); im.alt = it.legenda || ''; im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
        im.addEventListener('error', () => fig.remove());
        im.src = it.src;
        fig.append(im, el('figcaption', '', it.legenda || ''));
        grade.appendChild(fig);
      });
      corpo.appendChild(grade);
      return null;
    }

    function mapa(b, id) {
      const M = cfg.mapa || (window.CONTENT && window.CONTENT.mapa) || {};
      const { corpo } = post('mapa', 'mundo.map', { id });
      if (b.titulo) titulo(corpo, b.titulo);
      if (b.texto) paragrafos(corpo, b.texto);
      const zona = el('div', 'b-plot b-mapa'); corpo.appendChild(zona);
      const lista = el('ul', 'b-destinos'); corpo.appendChild(lista);
      const KEY = 'mapa-ja-fomos';
      let visit = {};
      try { visit = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { visit = {}; }
      const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(visit)); } catch (e) { /* sem armazenamento */ } };
      const destinos = M.destinos || [];
      let arteMapa = null, desenhar = () => {};
      destinos.forEach((d, i) => {
        const li = el('li', 'b-destino');
        const bt = botao('b-destino__bt', '');
        const pintar = () => {
          const ja = !!visit[d.nome];
          bt.setAttribute('aria-pressed', String(ja));
          bt.textContent = (ja ? '[x] ' : '[ ] ') + d.nome;
          li.classList.toggle('is-ja', ja);
        };
        bt.addEventListener('click', () => { if (visit[d.nome]) delete visit[d.nome]; else visit[d.nome] = true; pintar(); desenhar(); guardar(); });
        bt.addEventListener('mouseenter', () => { foco = i; desenhar(); });
        bt.addEventListener('focus', () => { foco = i; desenhar(); });
        li.append(bt, el('span', 'b-destino__nota', d.nota || ''));
        lista.appendChild(li);
        pintar();
      });
      let foco = -1;
      clip('blog-mundo', 'blog-mundo.js').then((c) => {
        if (!vivo || !c) return;
        // recorte: do Canadá ao Japão, do Ártico ao equador
        const lon0 = -135, lon1 = 150, lat0 = 72, lat1 = 2;
        const cx = (lon) => Math.round((lon - c.lonLeft) / (c.lonRight - c.lonLeft) * c.cols);
        const ry = (lat) => Math.round((c.latTop - lat) / (c.latTop - c.latBottom) * c.rows);
        const x0 = cx(lon0), x1 = cx(lon1), y0 = Math.max(0, ry(lat0)), y1 = ry(lat1);
        const W = x1 - x0, H = y1 - y0;
        // o mapa original tem células «quadradas»: estica 1.6× na vertical para ficar com aspeto certo
        const esc = (1 / CELL) * ((c.lonRight - c.lonLeft) / c.cols) / ((c.latTop - c.latBottom) / c.rows);
        const rows = Math.max(8, Math.round(H * esc));
        const a = Arte(zona, W, rows, { maxFs: 12 });
        arteMapa = a;
        const cc = b64(c.frames[0].c);
        const lx = (lon) => (lon - c.lonLeft) / (c.lonRight - c.lonLeft) * c.cols - x0;
        const ly = (lat) => ((c.latTop - lat) / (c.latTop - c.latBottom) * c.rows - y0) * rows / H;
        desenhar = (t = 0) => {
          a.clear();
          for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
            const sy = Math.min(c.rows - 1, y0 + Math.floor(y * H / rows)), v = cc[sy * c.cols + x0 + x];
            if (v) a.set(x, y, c.ramp[v], c.palette[Math.min(3, v)], 0.85);
          }
          const casa = M.casa;
          if (casa) { a.set(lx(casa.lon), ly(casa.lat), '⌂', COR.amarelo); }
          destinos.forEach((d, i) => {
            const ja = !!visit[d.nome], on = i === foco;
            const pisca = reduzido ? 1 : 0.55 + 0.45 * Math.sin(t / 300 + i);
            a.set(lx(d.lon), ly(d.lat), ja ? '✓' : '♥', ja ? COR.verde : on ? COR.amarelo : COR.rosa, on ? 1 : pisca);
            if (on) a.text(Math.min(W - d.nome.length - 1, Math.max(0, Math.round(lx(d.lon)) - Math.floor(d.nome.length / 2))), Math.max(0, Math.round(ly(d.lat)) - 1), d.nome, COR.branco);
          });
          a.draw();
        };
        a.resize();
        registarArte(a, (t) => desenhar(t));
        desenhar(0);
        a.box.addEventListener('pointermove', (e) => {
          const [x, y] = a.cellAt(e.clientX, e.clientY);
          let best = -1, bd = 9;
          destinos.forEach((d, i) => { const dd = Math.hypot(lx(d.lon) - x, (ly(d.lat) - y) * 1.6); if (dd < bd) { bd = dd; best = i; } });
          if (best !== foco) { foco = best; desenhar(); }
        });
      });
      void arteMapa;
      entradaMenu('5', 'o mundo', id);
      return null;
    }

    function contador(b, id) {
      const { corpo } = post('contador', 'uptime', { id });
      if (b.antes) corpo.appendChild(el('p', 'b-contador__antes', b.antes));
      const zona = el('div', 'b-contador__num'); corpo.appendChild(zona);
      const sr = el('p', 'b-sr', String(diasJuntos)); corpo.appendChild(sr);
      if (b.depois) corpo.appendChild(el('p', 'b-contador__depois', b.depois));
      const seg = el('p', 'b-contador__seg'); corpo.appendChild(seg);
      tarefas.push(() => {
        const a = letreiro(zona, String(diasJuntos), { font: '600 {px} ' + SERIF, rows: 14, cores: [COR.rosa, COR.vermelho, COR.amarelo, COR.rosa], maxFs: 12, minRows: 8 });
        registarArte(a, (t) => a.anima(t));
      });
      const tick = () => {
        if (!ini) return;
        const s = Math.floor((Date.now() - ini.getTime()) / 1000);
        seg.textContent = '= ' + s.toLocaleString('pt-PT') + ' segundos, e a contar';
      };
      tick();
      const iv = setInterval(tick, 1000);
      limpar.push(() => clearInterval(iv));
      return null;
    }

    /* ============================================================= FIM */
    function fim() {
      const F = cfg.fim || {};
      const s = el('section', 'b-fim b-rev'); s.id = 'b-fim';
      const chuva = el('canvas', 'b-fim__chuva'); chuva.setAttribute('aria-hidden', 'true');
      s.appendChild(chuva);
      s.appendChild(moldura('fim.txt'));
      const lt = el('div', 'b-fim__letreiro'); s.appendChild(lt);
      const tituloSr = el('h2', 'b-sr', F.titulo || 'Amo-te'); s.appendChild(tituloSr);
      const pares = el('div', 'b-pares');
      String(F.mensagem || '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((l, i) => {
        const [verso, codigo] = l.split('||').map((x) => (x || '').trim());
        const par = el('div', 'b-par b-rev'); par.style.setProperty('--i', i);
        par.appendChild(el('p', 'b-par__verso', verso));
        if (codigo) { const c = el('p', 'b-par__codigo'); c.appendChild(realcar(codigo)); par.appendChild(c); }
        pares.appendChild(par);
        motor.observar(par);
      });
      s.appendChild(pares);
      if (F.assinatura) s.appendChild(el('p', 'b-fim__assinatura', F.assinatura));
      if (F.aranha) {
        const ar = el('div', 'b-aranha');
        const bt = botao('b-aranha__bt', '', 'Aranha');
        const fio = el('span', 'b-aranha__fio', '|\n|\n|\n|'), corpoA = el('span', 'b-aranha__corpo', '/\\(oo)/\\\n //\\\\ ');
        bt.append(fio, corpoA);
        const fala = el('p', 'b-aranha__fala', F.aranha); fala.hidden = true;
        bt.setAttribute('aria-expanded', 'false');
        bt.addEventListener('click', () => { fala.hidden = !fala.hidden; ar.classList.toggle('is-desce', !fala.hidden); bt.setAttribute('aria-expanded', String(!fala.hidden)); });
        ar.append(bt, fala);
        s.appendChild(ar);
      }
      const rod = el('footer', 'b-rodape');
      rod.append(
        el('p', 'b-tenue', '-- fim da transmissão --'),
        el('p', '', 'feito à mão, carácter a carácter, por ' + dele + ' para ' + dela + '.'),
      );
      const topo = botao('b-botao b-botao--mini', '↑ voltar ao início');
      topo.addEventListener('click', () => { host.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' }); });
      rod.appendChild(topo);
      s.appendChild(rod);
      col.appendChild(s);
      motor.observar(s);
      tarefas.push(() => {
        const a = letreiro(lt, F.titulo || 'Amo-te', { rows: 18, minRows: 10, minCell: 3.4, font: 'italic 700 {px} ' + SERIF, cores: [COR.rosa, COR.vermelho, COR.pessego, COR.rosa], enche: 'amo-te', maxFs: 12 });
        registarArte(a, (t) => a.anima(t));
      });
      // pétalas em caracteres a cair
      const petalas = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(0.02, 0.06), d: rnd(-0.02, 0.02), c: pick(['*', '❀', '✿', '.', '·', '♥', '*']), cor: pick([COR.rosa, COR.pessego, COR.vermelho, COR.branco, COR.amarelo]), s: rnd(9, 16), p: rnd(0, 6) }));
      let tPrev = 0;
      const chuvaTick = (t) => {
        const w = s.clientWidth, h = s.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
        if (chuva.width !== Math.round(w * dpr) || chuva.height !== Math.round(h * dpr)) { chuva.width = Math.round(w * dpr); chuva.height = Math.round(h * dpr); }
        const ctx = chuva.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const dt = tPrev ? Math.min(0.1, (t - tPrev) / 1000) : 0; tPrev = t;
        ctx.textAlign = 'center';
        for (const p of petalas) {
          p.y += p.v * dt * (600 / Math.max(300, h)); p.x += (p.d + Math.sin(t / 900 + p.p) * 0.01) * dt;
          if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = p.cor; ctx.font = p.s + 'px ' + MONO;
          ctx.fillText(p.c, p.x * w, p.y * h);
        }
        ctx.globalAlpha = 1;
      };
      if (!reduzido) motor.animar(s, chuvaTick);
    }

    /* ======================================================== montar */
    const tarefas = []; // arte que precisa de largura/fonte: corre depois de montado
    const idAlbum = 'b-album';
    let albumFeito = false;
    blocos.forEach((b, i) => {
      try { bloco(b); } catch (e) { console.warn('blog: bloco ' + b.tipo, e); }
      // o álbum entra depois do primeiro terminal (o boot), ou ao fim do 3.º bloco
      if (!albumFeito && (b.tipo === 'terminal' || i === 2)) { albumFeito = true; try { album(idAlbum); } catch (e) { console.warn('blog: álbum', e); } }
    });
    if (!albumFeito) album(idAlbum);
    try { fim(); } catch (e) { console.warn('blog: fim', e); }
    entradaMenu('6', 'fim', 'b-fim');
    menu.sort((x, y) => x.tecla.localeCompare(y.tecla));
    const ul = el('ul', 'b-menu__lista');
    menu.forEach((m) => {
      const li = el('li');
      const bt = botao('b-menu__item', '');
      bt.append(el('span', 'b-menu__tecla', '[' + m.tecla + ']'), document.createTextNode(' ' + m.nome));
      bt.addEventListener('click', () => {
        const alvo = root.querySelector('#' + CSS.escape(m.alvoId));
        if (!alvo) return;
        const top = alvo.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop - 12;
        host.scrollTo({ top, behavior: reduzido ? 'auto' : 'smooth' });
      });
      li.appendChild(bt); ul.appendChild(li);
    });
    nav.appendChild(el('p', 'b-menu__tit b-tenue', 'menu principal — escolhe uma tecla:'));
    nav.appendChild(ul);
    const onKey = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (!host.contains(document.activeElement) && document.activeElement !== document.body) return;
      const m = menu.find((x) => x.tecla === e.key);
      if (m) { const b = ul.children[menu.indexOf(m)]; if (b) b.firstChild.click(); }
    };
    window.addEventListener('keydown', onKey);
    limpar.push(() => window.removeEventListener('keydown', onKey));

    // depois de o DOM existir: o céu, as letras grandes, a arte
    let pronto = false;
    (async () => {
      prepararCeu();
      if (!reduzido) rafCeu = requestAnimationFrame(loopCeu);
      await fontes();
      if (!vivo) return;
      const a = letreiro(letreiroCab, dele, { rows: 13, minRows: 8, minCell: 3.4, cores: [COR.verde, COR.amarelo, COR.pessego, COR.rosa, COR.lilas, COR.azul, COR.verde], maxFs: 11 });
      registarArte(a, (t) => a.anima(t));
      for (const f of tarefas) { try { f(); } catch (e) { console.warn('blog: arte', e); } }
      tarefas.length = 0;
      pronto = true;
      artes.forEach((x) => x.draw());
    })();

    // redimensionar: as letras grandes refazem-se (a largura muda o corte das palavras)
    let ultimaL = 0, tRes = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(tRes);
      tRes = setTimeout(() => {
        if (!vivo) return;
        prepararCeu();
        const l = largura();
        if (Math.abs(l - ultimaL) < 2) return;
        ultimaL = l;
        artes.forEach((x) => x.resize());
      }, 120);
    });
    ro.observe(host);
    void pronto;

    return {
      el: root,
      destroy() {
        vivo = false;
        cancelAnimationFrame(rafCeu);
        ro.disconnect();
        motor.destroy();
        limpar.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
        root.remove();
      },
    };
  }

  window.Blog = { mount };
})();
