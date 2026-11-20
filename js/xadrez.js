/* ==========================================================================
   XADREZ — «O nosso gambito». Estética The Queen's Gambit (anos 60):
   tabuleiro de nogueira e bordo envernizado, feltro verde, luz âmbar.
   Regras: chess.js (vendor/chess.min.js, window.Chess). IA própria (0x88,
   alfa-beta com quiescência), leve e às vezes generosa.

   Uso:
     Xadrez.open(cfg)          → overlay de ecrã inteiro (Esc / botão fecham)
     Xadrez.mount(el, cfg)     → dentro de um elemento
     Xadrez.close()
   cfg = CONTENT.xadrez  { titulo?, brancas:{nome}, pretas:{nome},
                           frases:{vez, xeque, mate, empate, novo, desfazer},
                           mensagens?:{ xequeDela:[], xequeDele:[], capturaDela:[],
                                        capturaDele:[], vitoria, derrota } }
   (cfg.pecas com emojis é ignorado.)

   Peças: «staunty» de sadsnake1 (lichess.org), CC BY-NC-SA 4.0, recoloridas
   em assets/xadrez/pecas/.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ constantes */
  const SCRIPT = document.currentScript && document.currentScript.src;
  const PECAS_URL = SCRIPT ? new URL('../assets/xadrez/pecas/', SCRIPT).href : 'assets/xadrez/pecas/';
  const FILES = 'abcdefgh';
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const NOME_PECA = { k: 'rei', q: 'dama', r: 'torre', b: 'bispo', n: 'cavalo', p: 'peão' };
  const PT = { K: 'R', Q: 'D', R: 'T', N: 'C', B: 'B' };
  const pt = (san) => san.replace(/[KQRNB]/g, (c) => PT[c]);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (s, o) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ''));

  const FRASES = {
    vez: 'Vez de {nome}', xeque: 'Xeque!', mate: 'Xeque-mate. Ganhou {nome}!',
    empate: 'Empate. Ganhámos os dois.', novo: 'Novo jogo', desfazer: 'Desfazer jogada',
  };
  const MSG = {
    xequeDela: [
      'O meu rei já estava encurralado há quatro anos.',
      'Assim não vale: sorris e eu perco a concentração.',
      'O meu rei rende-se mais depressa do que eu.',
      'Até o rei treme quando olhas assim.',
    ],
    xequeDele: [
      'Só para veres que eu também sei. Desculpa.',
      'O teu rei está sempre a salvo comigo. Quase sempre.',
      'Um xequezinho com amor.',
    ],
    capturaDela: [
      'Leva-a. Leva tudo, até o coração.',
      'Que jogada linda, como tu.',
      'Capturada. Tal como eu, há quatro anos.',
      'Essa doeu um bocadinho. Valeu a pena.',
      'Boa! Estou a ficar sem desculpas.',
    ],
    capturaDele: [
      'Fico com esta, mas devolvo-ta em beijinhos.',
      'Uma peça a menos, um abraço a mais.',
      'Desculpa, foi sem querer. (Foi de propósito.)',
    ],
    inicio: ['As brancas começam. Como sempre, começas tu.', 'Um tabuleiro, um candeeiro e tu. Joga.'],
    gambito: 'O Gambito da Dama. Claro que sim.',
    vitoria: ['Xeque-mate.', 'Ganhaste-me há quatro anos.'],
    derrota: ['Xeque-mate, meu amor.', 'Desta vez ganhei eu. Mas quem ganhou fui eu, no dia em que te conheci.'],
    afogado: 'Rei afogado. Ninguém perde: ficamos os dois.',
    gentil: ['Hmm, não vi esta…', 'Ups. O Diogo distraiu-se a olhar para ti.', 'Isto foi de propósito? Nunca saberás.'],
  };

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const svgIcon = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  const ICON = {
    undo: 'M9 7 4 12l5 5M4.5 12H15a5 5 0 0 1 0 10h-3',
    novo: 'M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8',
    flip: 'M7 4v15M7 19l-3-3M7 19l3-3M17 20V5M17 5l-3 3M17 5l3 3',
    olho: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
    fechar: 'M6 6l12 12M18 6 6 18',
  };

  /* ===================================================== texturas de madeira */
  let TEX = null;
  function noise2(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const p = new Uint8Array(512), g = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; g[i] = rnd() * 2 - 1; }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const X = xi & 255, Y = yi & 255;
      const a = g[p[p[X] + Y]], b = g[p[p[X + 1] + Y]], c = g[p[p[X] + Y + 1]], d = g[p[p[X + 1] + Y + 1]];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function woodCanvas(W, H, A, B, o) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); const d = img.data;
    const n1 = noise2(o.seed), n2 = noise2(o.seed + 77), n3 = noise2(o.seed + 913);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const warp = n1(x / 260, y / 30) * 1.3 + n1(x / 90, y / 11) * 0.35 + n2(x / 700, y / 220) * 2.2;
        const t = (y / H) * o.rings + warp;
        let s = 0.5 + 0.5 * Math.sin(t * 6.2832); s = s * s * s;
        const fib = 0.5 + 0.5 * n3(x / 26, y / 1.3);
        const fig = 0.5 + 0.5 * n2(x / 55, y / 160);
        let k = s * o.band + fib * o.fiber + fig * 0.12;
        k = Math.min(1, Math.max(0, k));
        const i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * k; d[i + 1] = A[1] + (B[1] - A[1]) * k; d[i + 2] = A[2] + (B[2] - A[2]) * k; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // poros
    let s = o.seed * 31 + 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    ctx.lineCap = 'round';
    for (let i = 0; i < o.pores; i++) {
      const x = rnd() * W, y = rnd() * H, l = 2 + rnd() * 7;
      ctx.strokeStyle = 'rgba(' + o.pore + ',' + (0.08 + rnd() * 0.16) + ')'; ctx.lineWidth = 0.6 + rnd() * 0.7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (rnd() - 0.5) * 0.8); ctx.stroke();
    }
    return cv.toDataURL('image/jpeg', 0.88);
  }
  function textures() {
    if (TEX) return TEX;
    try {
      TEX = {
        light: woodCanvas(512, 512, [236, 202, 146], [192, 138, 76], { seed: 11, rings: 9, band: 0.42, fiber: 0.28, pores: 500, pore: '120,80,40' }),
        dark: woodCanvas(512, 512, [128, 80, 48], [58, 32, 18], { seed: 29, rings: 7, band: 0.55, fiber: 0.3, pores: 1400, pore: '25,10,4' }),
        frame: woodCanvas(512, 256, [104, 58, 32], [38, 18, 9], { seed: 53, rings: 5, band: 0.6, fiber: 0.32, pores: 900, pore: '15,6,2' }),
      };
    } catch (e) { TEX = { light: '', dark: '', frame: '' }; }
    return TEX;
  }

  /* ================================================================ motor */
  // 0x88, linha 0 = 8.ª fila. Peças: 1 P, 2 N, 3 B, 4 R, 5 Q, 6 K; brancas > 0, pretas < 0.
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], KG = [-17, -16, -15, -1, 1, 15, 16, 17];
  const DG = [-17, -15, 15, 17], OR = [-16, -1, 1, 16];
  const CODE = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 }, LET = ' pnbrqk';
  const PV = [0, 100, 320, 330, 500, 900, 0];
  const PST = [null,
    [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  ];
  const KEND = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  const MATE = 100000, INF = 1e9;
  const idx = (n) => (8 - +n[1]) * 16 + (n.charCodeAt(0) - 97);
  const nm = (i) => FILES[i & 7] + (8 - (i >> 4));

  function Pos(fen) {
    const parts = fen.split(/\s+/);
    this.b = new Int8Array(128); this.kw = 116; this.kb = 4;
    let r = 0, f = 0;
    for (const ch of parts[0]) {
      if (ch === '/') { r++; f = 0; continue; }
      if (/\d/.test(ch)) { f += +ch; continue; }
      const c = CODE[ch.toLowerCase()], w = ch === ch.toUpperCase();
      const i = r * 16 + f; this.b[i] = w ? c : -c;
      if (c === 6) { if (w) this.kw = i; else this.kb = i; }
      f++;
    }
    this.side = parts[1] === 'b' ? -1 : 1;
    const c = parts[2] || '-';
    this.castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
    this.ep = parts[3] && parts[3] !== '-' ? idx(parts[3]) : -1;
    this.stack = [];
  }
  Pos.prototype.attacked = function (sq, by) {
    const b = this.b;
    if (by > 0) { if (!((sq + 15) & 0x88) && b[sq + 15] === 1) return true; if (!((sq + 17) & 0x88) && b[sq + 17] === 1) return true; }
    else { if (!((sq - 15) & 0x88) && b[sq - 15] === -1) return true; if (!((sq - 17) & 0x88) && b[sq - 17] === -1) return true; }
    for (let k = 0; k < 8; k++) { const t = sq + KN[k]; if (!(t & 0x88) && b[t] === 2 * by) return true; }
    for (let k = 0; k < 8; k++) { const t = sq + KG[k]; if (!(t & 0x88) && b[t] === 6 * by) return true; }
    for (let k = 0; k < 4; k++) { let t = sq + DG[k]; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === 3 * by || p === 5 * by) return true; break; } t += DG[k]; } }
    for (let k = 0; k < 4; k++) { let t = sq + OR[k]; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === 4 * by || p === 5 * by) return true; break; } t += OR[k]; } }
    return false;
  };
  Pos.prototype.inCheck = function () { return this.attacked(this.side > 0 ? this.kw : this.kb, -this.side); };
  Pos.prototype.gen = function (capsOnly) {
    const b = this.b, s = this.side, out = [];
    const add = (f, t, fl) => {
      const pc = b[f] * s, cap = fl === 2 ? 1 : Math.abs(b[t]);
      if (pc === 1 && ((s > 0 && t < 8) || (s < 0 && t >= 112))) { for (const pr of [5, 4, 3, 2]) out.push({ f, t, fl, cap, pr }); }
      else if (!capsOnly || cap) out.push({ f, t, fl, cap, pr: 0 });
    };
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i] * s; if (p <= 0) continue;
      if (p === 1) {
        const fw = s > 0 ? -16 : 16, t = i + fw;
        if (!(t & 0x88) && !b[t]) {
          if (!capsOnly || t < 8 || t >= 112) add(i, t, 0);
          const start = s > 0 ? (i >> 4) === 6 : (i >> 4) === 1;
          if (start && !capsOnly && !b[t + fw]) add(i, t + fw, 1);
        }
        for (const d of [fw - 1, fw + 1]) { const c = i + d; if (c & 0x88) continue; if (b[c] * s < 0) add(i, c, 0); else if (c === this.ep) add(i, c, 2); }
      } else if (p === 2 || p === 6) {
        const D = p === 2 ? KN : KG;
        for (let k = 0; k < 8; k++) { const t = i + D[k]; if (t & 0x88) continue; const q = b[t] * s; if (q > 0) continue; if (capsOnly && !q) continue; add(i, t, 0); }
      } else {
        const dirs = p === 3 ? DG : p === 4 ? OR : KG;
        for (let k = 0; k < dirs.length; k++) {
          let t = i + dirs[k];
          while (!(t & 0x88)) { const q = b[t] * s; if (q > 0) break; if (!capsOnly || q < 0) add(i, t, 0); if (q < 0) break; t += dirs[k]; }
        }
      }
    }
    if (!capsOnly) {
      if (s > 0) {
        if ((this.castle & 1) && !b[117] && !b[118] && b[119] === 4 && !this.attacked(116, -1) && !this.attacked(117, -1) && !this.attacked(118, -1)) out.push({ f: 116, t: 118, fl: 3, cap: 0, pr: 0 });
        if ((this.castle & 2) && !b[115] && !b[114] && !b[113] && b[112] === 4 && !this.attacked(116, -1) && !this.attacked(115, -1) && !this.attacked(114, -1)) out.push({ f: 116, t: 114, fl: 4, cap: 0, pr: 0 });
      } else {
        if ((this.castle & 4) && !b[5] && !b[6] && b[7] === -4 && !this.attacked(4, 1) && !this.attacked(5, 1) && !this.attacked(6, 1)) out.push({ f: 4, t: 6, fl: 3, cap: 0, pr: 0 });
        if ((this.castle & 8) && !b[3] && !b[2] && !b[1] && b[0] === -4 && !this.attacked(4, 1) && !this.attacked(3, 1) && !this.attacked(2, 1)) out.push({ f: 4, t: 2, fl: 4, cap: 0, pr: 0 });
      }
    }
    return out;
  };
  const CR = new Uint8Array(128).fill(15);
  CR[0] = 15 & ~8; CR[7] = 15 & ~4; CR[4] = 15 & ~12; CR[112] = 15 & ~2; CR[119] = 15 & ~1; CR[116] = 15 & ~3;
  Pos.prototype.make = function (m) {
    const b = this.b, s = this.side, pc = b[m.f];
    const u = { m, capPc: b[m.t], castle: this.castle, ep: this.ep, kw: this.kw, kb: this.kb };
    b[m.t] = m.pr ? m.pr * s : pc; b[m.f] = 0;
    if (m.fl === 2) { const c = m.t + (s > 0 ? 16 : -16); u.capPc = b[c]; u.epSq = c; b[c] = 0; }
    if (m.fl === 3) { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = 0; }
    if (m.fl === 4) { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = 0; }
    if (pc === 6) this.kw = m.t; else if (pc === -6) this.kb = m.t;
    this.castle &= CR[m.f] & CR[m.t];
    this.ep = m.fl === 1 ? m.f + (s > 0 ? -16 : 16) : -1;
    this.side = -s; this.stack.push(u);
    if (this.attacked(s > 0 ? this.kw : this.kb, -s)) { this.unmake(); return false; }
    return true;
  };
  Pos.prototype.unmake = function () {
    const u = this.stack.pop(), m = u.m, b = this.b; this.side = -this.side; const s = this.side;
    b[m.f] = m.pr ? s : b[m.t]; b[m.t] = 0;
    if (m.fl === 2) b[u.epSq] = u.capPc; else b[m.t] = u.capPc;
    if (m.fl === 3) { b[m.t + 1] = b[m.t - 1]; b[m.t - 1] = 0; }
    if (m.fl === 4) { b[m.t - 2] = b[m.t + 1]; b[m.t + 1] = 0; }
    this.castle = u.castle; this.ep = u.ep; this.kw = u.kw; this.kb = u.kb;
  };
  Pos.prototype.material = function () { let w = 0, k = 0; for (let i = 0; i < 128; i++) { if (i & 0x88) { i += 7; continue; } const p = this.b[i]; if (p && Math.abs(p) !== 6) { if (p > 0) w += PV[p]; else k += PV[-p]; } } return { w, b: k }; };
  Pos.prototype.evaluate = function () { // perspetiva das brancas
    const b = this.b; let s = 0, heavy = 0;
    for (let i = 0; i < 128; i++) { if (i & 0x88) { i += 7; continue; } const p = b[i]; if (p && Math.abs(p) > 1 && Math.abs(p) < 6) heavy += PV[Math.abs(p)]; }
    const end = heavy <= 2600;
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i]; if (!p) continue;
      const a = Math.abs(p), r = i >> 4, f = i & 7, j = p > 0 ? r * 8 + f : (7 - r) * 8 + f;
      const v = PV[a] + (a === 6 && end ? KEND[j] : PST[a][j]);
      s += p > 0 ? v : -v;
    }
    return s;
  };
  function order(ms, b) { for (const m of ms) m.o = (m.cap ? 10 * PV[m.cap] - PV[Math.abs(b[m.f])] + 10000 : 0) + (m.pr ? 8000 + PV[m.pr] : 0); ms.sort((x, y) => y.o - x.o); return ms; }
  function quies(P, alpha, beta, qd, st) {
    st.n++;
    const stand = P.evaluate() * P.side;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd <= 0) return stand;
    const ms = order(P.gen(true), P.b);
    for (const m of ms) {
      if (!P.make(m)) continue;
      const v = -quies(P, -beta, -alpha, qd - 1, st); P.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function search(P, depth, alpha, beta, ply, st) {
    if (depth <= 0) return quies(P, alpha, beta, 4, st);
    st.n++;
    const ms = order(P.gen(false), P.b); let legal = 0, best = -INF;
    for (const m of ms) {
      if (!P.make(m)) continue; legal++;
      const v = -search(P, depth - 1, -beta, -alpha, ply + 1, st); P.unmake();
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (!legal) return P.inCheck() ? -MATE + ply : 0;
    return best;
  }
  /** Analisa todas as jogadas de raiz; devolve [{from,to,promotion,score}] (score exato se ≥ melhor - margem). */
  function analyse(fen, depth, margin) {
    const P = new Pos(fen), st = { n: 0 };
    const ms = order(P.gen(false), P.b), res = [];
    let best = -INF;
    for (const m of ms) {
      if (!P.make(m)) continue;
      const floor = best === -INF ? -INF : best - margin;
      const v = -search(P, depth - 1, -INF, -floor, 1, st); P.unmake();
      res.push({ from: nm(m.f), to: nm(m.t), promotion: m.pr ? LET[m.pr] : undefined, score: v, exact: v > floor });
      if (v > best) best = v;
    }
    res.sort((a, b) => b.score - a.score);
    return { moves: res, best, nodes: st.n };
  }

  /* ========================================================== a instância */
  function mount(root, cfgIn, opts) {
    if (!root) return null;
    opts = opts || {};
    if (typeof window.Chess !== 'function') { root.textContent = 'O xadrez não carregou (falta vendor/chess.min.js).'; return null; }
    const cfg = cfgIn || (window.CONTENT && window.CONTENT.xadrez) || {};
    const F = Object.assign({}, FRASES, cfg.frases || {});
    const M = Object.assign({}, MSG, cfg.mensagens || {});
    const NAME = { w: (cfg.brancas && cfg.brancas.nome) || 'Catarina', b: (cfg.pretas && cfg.pretas.nome) || 'Diogo' };
    const game = new window.Chess();
    const T = textures();

    let flipped = false, mode = 'ia', selected = null, targets = [], thinking = 0, over = false;
    let promoPending = null, dragging = null, suppressClick = false, hoverTimer = 0, hoverSq = null, ghostTimer = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

    /* ---------------------------------------------------------------- DOM */
    root.textContent = '';
    root.classList.add('xq');
    if (opts.overlay) root.classList.add('xq--overlay');
    root.style.setProperty('--xq-light', T.light ? 'url(' + T.light + ')' : 'none');
    root.style.setProperty('--xq-dark', T.dark ? 'url(' + T.dark + ')' : 'none');
    root.style.setProperty('--xq-frame', T.frame ? 'url(' + T.frame + ')' : 'none');

    const room = el('div', 'xq-room'); room.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 16; i++) {
      const d = el('i', 'xq-mote');
      d.style.cssText = 'left:' + (30 + Math.random() * 40).toFixed(1) + '%;top:' + (Math.random() * 70).toFixed(1) + '%;animation-delay:-' + (Math.random() * 18).toFixed(1) + 's;animation-duration:' + (14 + Math.random() * 12).toFixed(1) + 's';
      room.append(d);
    }

    const head = el('header', 'xq-head');
    head.append(el('p', 'xq-kicker', cfg.etiqueta || 'The Queen’s Gambit'), el('h2', 'xq-title', cfg.titulo || 'O nosso gambito'));

    const grid = el('div', 'xq-grid');

    const mkPlayer = (c) => {
      const box = el('section', 'xq-player xq-player--' + c);
      const plate = el('div', 'xq-plate');
      const lamp = el('span', 'xq-turn'); lamp.setAttribute('aria-hidden', 'true');
      const name = el('span', 'xq-name', NAME[c]);
      const role = el('span', 'xq-role', c === 'w' ? 'brancas' : 'pretas');
      plate.append(lamp, name, role);
      const tray = el('div', 'xq-tray'); tray.setAttribute('aria-label', 'Peças capturadas por ' + NAME[c]);
      const adv = el('span', 'xq-adv');
      const trayRow = el('div', 'xq-trayrow'); trayRow.append(tray, adv);
      box.append(plate, trayRow);
      return { box, tray, adv };
    };
    const P = { b: mkPlayer('b'), w: mkPlayer('w') };

    const stage = el('div', 'xq-stage');
    const frame = el('div', 'xq-frame');
    const coordsF = el('div', 'xq-coords xq-coords--f'), coordsR = el('div', 'xq-coords xq-coords--r');
    coordsF.setAttribute('aria-hidden', 'true'); coordsR.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 8; i++) { coordsF.append(el('span')); coordsR.append(el('span')); }
    const board = el('div', 'xq-board'); board.setAttribute('role', 'grid'); board.setAttribute('aria-label', 'Tabuleiro de xadrez');
    const sqEl = {};
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const n = FILES[f] + r, b = el('button', 'xq-sq ' + ((f + r) % 2 ? 'xq-sq--l' : 'xq-sq--d'));
      b.type = 'button'; b.dataset.sq = n;
      b.style.backgroundPosition = Math.floor(Math.random() * 100) + '% ' + Math.floor(Math.random() * 100) + '%';
      sqEl[n] = b; board.append(b);
    }
    const sheen = el('div', 'xq-sheen'); sheen.setAttribute('aria-hidden', 'true');
    const layer = el('div', 'xq-layer'); layer.setAttribute('aria-hidden', 'true');
    board.append(sheen, layer);
    frame.append(board, coordsF, coordsR);
    const ghost = el('div', 'xq-ghost'); ghost.setAttribute('aria-hidden', 'true');
    const toastEl = el('div', 'xq-toast'); toastEl.setAttribute('role', 'status');
    const promo = el('div', 'xq-promo'); promo.hidden = true;
    stage.append(ghost, frame, toastEl, promo);

    const status = el('p', 'xq-status'); status.setAttribute('aria-live', 'polite');

    const ctrl = el('div', 'xq-ctrl');
    const mkBtn = (icon, label, cls) => { const b = el('button', 'xq-btn ' + (cls || '')); b.type = 'button'; b.innerHTML = svgIcon(ICON[icon]); b.append(el('span', '', label)); return b; };
    const bUndo = mkBtn('undo', F.desfazer), bNew = mkBtn('novo', F.novo), bFlip = mkBtn('flip', 'Virar'), bImag = mkBtn('olho', 'Imaginar', 'xq-btn--imag');
    bImag.title = 'Como a Beth: imaginar o lance no teto';
    const modeBox = el('div', 'xq-mode'); modeBox.setAttribute('role', 'radiogroup'); modeBox.setAttribute('aria-label', 'Modo de jogo');
    const mIa = el('button', 'xq-mode__b', 'Contra o ' + NAME.b), mDois = el('button', 'xq-mode__b', 'A dois');
    [mIa, mDois].forEach((b) => { b.type = 'button'; b.setAttribute('role', 'radio'); modeBox.append(b); });
    ctrl.append(bUndo, bNew, bFlip, bImag, modeBox);

    const sheet = el('aside', 'xq-sheet'); sheet.setAttribute('aria-label', 'Folha de partida');
    const sheetHead = el('div', 'xq-sheet__head');
    sheetHead.append(el('span', 'xq-sheet__t', 'Folha de partida'), el('span', 'xq-sheet__ev', 'Torneio dos quatro anos'));
    const cols = el('div', 'xq-sheet__cols');
    cols.append(el('span', '', ''), el('span', '', 'Brancas'), el('span', '', 'Pretas'));
    const list = el('ol', 'xq-sheet__list');
    const sigs = el('div', 'xq-sheet__sig');
    const sig = (c) => { const s = el('div', 'xq-sig'); s.append(el('span', 'xq-sig__n', NAME[c]), el('span', 'xq-sig__l', c === 'w' ? 'brancas' : 'pretas')); return s; };
    sigs.append(sig('w'), sig('b'));
    const result = el('p', 'xq-sheet__res');
    sheet.append(sheetHead, cols, list, result, sigs);

    grid.append(P.b.box, stage, P.w.box, status, ctrl, sheet);
    const fin = el('div', 'xq-fin'); fin.hidden = true;
    root.append(room, head, grid, fin);

    /* --------------------------------------------------------- tamanho */
    function layout() {
      const W = root.clientWidth; if (!W) return;
      const wide = W >= 860;
      root.classList.toggle('xq--wide', wide);
      let S;
      if (wide) {
        const side = Math.min(300, Math.max(210, W * 0.2));
        S = W - 2 * side - 80;
        const vh = opts.overlay ? root.clientHeight - head.offsetHeight - 40 : window.innerHeight * 0.8;
        S = Math.min(S, vh, 720);
      } else {
        S = Math.min(W - 24, 600);
      }
      root.style.setProperty('--S', Math.max(240, Math.floor(S)) + 'px');
    }
    const ro = 'ResizeObserver' in window ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(root); else window.addEventListener('resize', layout);

    /* -------------------------------------------------------- geometria */
    const xy = (n) => { const f = n.charCodeAt(0) - 97, r = +n[1]; return flipped ? [7 - f, r - 1] : [f, 8 - r]; };
    const sqAt = (cx, cy) => {
      const rc = board.getBoundingClientRect(); const s = rc.width / 8;
      let x = Math.floor((cx - rc.left) / s), y = Math.floor((cy - rc.top) / s);
      if (x < 0 || x > 7 || y < 0 || y > 7) return null;
      return flipped ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y);
    };
    const img = (c, t) => PECAS_URL + c + t.toUpperCase() + '.svg';

    /* ------------------------------------------------------------ peças */
    let pcs = {}; // casa → elemento
    function makePiece(c, t, n) {
      const p = el('div', 'xq-pc xq-pc--' + c);
      p.dataset.c = c; p.dataset.t = t;
      p.style.backgroundImage = 'url("' + img(c, t) + '")';
      place(p, n);
      return p;
    }
    function place(p, n) { const [x, y] = xy(n); p.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)'; p.dataset.at = n; }
    function rebuild() {
      layer.textContent = ''; pcs = {};
      const bd = game.board();
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const q = bd[r][f]; if (!q) continue;
        const n = FILES[f] + (8 - r);
        const p = makePiece(q.color, q.type, n); p.classList.add('no-anim');
        layer.append(p); pcs[n] = p;
      }
      requestAnimationFrame(() => layer.querySelectorAll('.no-anim').forEach((p) => p.classList.remove('no-anim')));
    }
    function reposition() {
      const order = Object.keys(sqEl).sort((a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return ay - by || ax - bx; });
      order.forEach((n) => board.insertBefore(sqEl[n], sheen));
      for (const n in pcs) place(pcs[n], n); coords();
    }
    function coords() {
      const fs = coordsF.children, rs = coordsR.children;
      for (let i = 0; i < 8; i++) { fs[i].textContent = flipped ? FILES[7 - i] : FILES[i]; rs[i].textContent = flipped ? i + 1 : 8 - i; }
    }

    /* ---------------------------------------------------- realces/estado */
    function highlights() {
      for (const n in sqEl) sqEl[n].classList.remove('is-sel', 'is-tgt', 'is-cap', 'is-last', 'is-check');
      const h = game.history({ verbose: true }); const last = h[h.length - 1];
      if (last) { sqEl[last.from].classList.add('is-last'); sqEl[last.to].classList.add('is-last'); }
      if (selected) sqEl[selected].classList.add('is-sel');
      for (const m of targets) sqEl[m.to].classList.add(m.captured ? 'is-cap' : 'is-tgt');
      if (game.in_check()) {
        const bd = game.board(), c = game.turn();
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const q = bd[r][f]; if (q && q.type === 'k' && q.color === c) sqEl[FILES[f] + (8 - r)].classList.add('is-check'); }
      }
      for (const n in sqEl) {
        const q = game.get(n);
        sqEl[n].setAttribute('aria-label', n + (q ? ', ' + NOME_PECA[q.type] + (q.color === 'w' ? ' branco' : ' preto') : ''));
      }
    }
    function trays() {
      const caps = { w: [], b: [] }; // capturadas POR c
      for (const m of game.history({ verbose: true })) if (m.captured) caps[m.color].push(m.captured);
      let mat = 0;
      for (const c of ['w', 'b']) {
        const t = P[c].tray; t.textContent = '';
        const opp = c === 'w' ? 'b' : 'w';
        caps[c].sort((a, b) => VAL[b] - VAL[a] || a.localeCompare(b)).forEach((ty) => {
          const i = el('span', 'xq-cap'); i.style.backgroundImage = 'url("' + img(opp, ty) + '")'; i.dataset.t = ty; t.append(i);
          mat += (c === 'w' ? 1 : -1) * VAL[ty];
        });
      }
      for (const m of game.history({ verbose: true })) if (m.promotion) mat += (m.color === 'w' ? 1 : -1) * (VAL[m.promotion] - 1);
      P.w.adv.textContent = mat > 0 ? '+' + mat : ''; P.b.adv.textContent = mat < 0 ? '+' + -mat : '';
    }
    function scoresheet(animate) {
      const h = game.history(); list.textContent = '';
      for (let i = 0; i < h.length; i += 2) {
        const li = el('li', 'xq-row');
        li.append(el('span', 'xq-n', i / 2 + 1 + '.'), el('span', 'xq-mv', pt(h[i])), el('span', 'xq-mv', h[i + 1] ? pt(h[i + 1]) : ''));
        list.append(li);
      }
      if (animate && h.length) {
        const cells = list.querySelectorAll('.xq-mv'); const last = cells[h.length - 1];
        if (last) last.classList.add('is-new');
      }
      list.scrollTop = list.scrollHeight;
    }
    function turnUI() {
      const t = game.turn();
      P.w.box.classList.toggle('is-turn', !over && t === 'w');
      P.b.box.classList.toggle('is-turn', !over && t === 'b');
      root.classList.toggle('is-thinking', !!thinking);
      bUndo.disabled = !game.history().length;
      bImag.disabled = over;
      mIa.setAttribute('aria-checked', String(mode === 'ia')); mDois.setAttribute('aria-checked', String(mode === 'dois'));
    }
    function setStatus(text, cls) { status.className = 'xq-status' + (cls ? ' ' + cls : ''); status.textContent = text; }
    function idleStatus() {
      if (over) return;
      const t = game.turn();
      if (mode === 'ia') {
        if (t === 'w') setStatus(game.in_check() ? 'Xeque! Salva o teu rei, ' + NAME.w + '.' : 'A tua vez, ' + NAME.w + '.');
        else setStatus('O ' + NAME.b + ' está a pensar', 'is-dots');
      } else setStatus(fmt(F.vez, { nome: NAME[t] }) + (game.in_check() ? ' · ' + F.xeque : '') + '.');
    }
    function refresh(animateSheet) { highlights(); trays(); scoresheet(animateSheet); turnUI(); idleStatus(); }

    /* ----------------------------------------------------------- toast */
    let toastT = 0;
    function toast(title, line, tone) {
      toastEl.className = 'xq-toast' + (tone ? ' xq-toast--' + tone : '');
      toastEl.innerHTML = '';
      if (title) toastEl.append(el('strong', '', title));
      if (line) toastEl.append(el('span', '', line));
      void toastEl.offsetWidth; toastEl.classList.add('is-on');
      clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3600);
    }

    /* ------------------------------------------------------- jogar lance */
    function canMove(color) {
      if (over || thinking || promoPending) return false;
      if (game.turn() !== color) return false;
      return mode === 'dois' || color === 'w';
    }
    function select(n) {
      selected = n; targets = n ? game.moves({ square: n, verbose: true }) : [];
      highlights();
    }
    function flyToTray(pieceEl, capturer) {
      const tray = P[capturer].tray;
      if (reduced() || !pieceEl.isConnected) { pieceEl.remove(); return; }
      const r0 = pieceEl.getBoundingClientRect();
      const fly = el('div', 'xq-flyer'); fly.style.backgroundImage = pieceEl.style.backgroundImage;
      fly.style.cssText += ';left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;height:' + r0.height + 'px';
      pieceEl.remove();
      document.body.append(fly);
      const dst = tray.lastElementChild || tray; const r1 = dst.getBoundingClientRect();
      const tx = r1.left + (dst === tray ? 0 : r1.width / 2) - (r0.left + r0.width / 2), ty = r1.top + r1.height / 2 - (r0.top + r0.height / 2);
      const sc = Math.max(0.3, (r1.height || 24) / r0.height);
      if (dst !== tray) dst.style.opacity = '0';
      const a = fly.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        { transform: 'translate(' + tx * 0.5 + 'px,' + (ty * 0.5 - 70) + 'px) scale(' + (1 + sc) / 1.6 + ') rotate(' + (capturer === 'w' ? 160 : -160) + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ') rotate(360deg)', opacity: 1 },
      ], { duration: 780, easing: 'cubic-bezier(.3,.1,.25,1)' });
      a.onfinish = () => { fly.remove(); if (dst !== tray) dst.style.opacity = ''; };
    }
    /** Aplica um lance (já validado pelo chess.js) com animação. */
    function apply(mv, how) {
      how = how || {};
      const res = game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
      if (!res) return null;
      selected = null; targets = [];
      const anim = !how.instant && !reduced();
      const p = pcs[res.from];
      // captura
      let capEl = null;
      if (res.flags.includes('e')) { const c = res.to[0] + res.from[1]; capEl = pcs[c]; delete pcs[c]; }
      else if (res.captured) { capEl = pcs[res.to]; }
      delete pcs[res.from];
      if (p) {
        if (how.dropped || !anim) p.classList.add('no-anim');
        p.classList.add('is-moving');
        place(p, res.to); pcs[res.to] = p;
        later(() => { p.classList.remove('is-moving', 'no-anim'); if (res.promotion) { p.dataset.t = res.promotion; p.style.backgroundImage = 'url("' + img(res.color, res.promotion) + '")'; p.classList.add('is-promo'); } }, anim && !how.dropped ? 330 : 16);
      }
      // roque: torre
      if (res.flags.includes('k') || res.flags.includes('q')) {
        const r = res.color === 'w' ? '1' : '8';
        const [rf, rt] = res.flags.includes('k') ? ['h' + r, 'f' + r] : ['a' + r, 'd' + r];
        const rk = pcs[rf]; if (rk) { delete pcs[rf]; pcs[rt] = rk; if (!anim) rk.classList.add('no-anim'); place(rk, rt); }
      }
      trays();
      if (capEl) { if (anim) later(() => flyToTray(capEl, res.color), how.dropped ? 0 : 140); else capEl.remove(); }
      if (how.instant) layer.querySelectorAll('.no-anim').forEach((x) => requestAnimationFrame(() => x.classList.remove('no-anim')));
      highlights(); scoresheet(!how.instant); turnUI();
      if (!how.instant) react(res);
      if (!how.silent) afterMove(res, how);
      return res;
    }
    function react(res) {
      const ela = res.color === 'w';
      const h = game.history();
      if (game.game_over()) return;
      if (game.in_check()) {
        if (mode === 'dois') toast(F.xeque, null, 'check');
        else toast(F.xeque, ela ? pick(M.xequeDela) : pick(M.xequeDele), 'check');
      } else if (h.length === 3 && h[0] === 'd4' && h[1] === 'd5' && h[2] === 'c4') toast('The Queen’s Gambit', M.gambito, 'gold');
      else if (res.captured && mode === 'ia') {
        if (ela && Math.random() < 0.7) toast(null, pick(M.capturaDela));
        else if (!ela && Math.random() < 0.5) toast(null, pick(M.capturaDele));
      }
    }
    function afterMove(res, how) {
      if (game.game_over()) { endGame(); return; }
      idleStatus();
      if (mode === 'ia' && game.turn() === 'b' && !how.noAI) aiMove();
    }

    /* ------------------------------------------------------------- IA */
    function aiMove() {
      const token = ++thinking; turnUI(); idleStatus();
      const t0 = performance.now();
      later(() => {
        if (thinking !== token) return;
        const fen = game.fen(); const Ps = new Pos(fen); const mat = Ps.material();
        const deficit = mat.b - mat.w; // > 0: ela está a perder
        const ahead = mat.w - mat.b >= 300;
        let margin = 70, kind = 0.14, depth = ahead ? 3 : 2;
        if (deficit >= 300) { margin = 260; kind = 0.5; }
        if (deficit >= 700) { margin = 520; kind = 0.75; depth = 2; }
        const A = analyse(fen, depth, margin);
        let choice = A.moves[0];
        // ruído ligeiro
        const pool = A.moves.filter((m) => m.exact && m.score >= A.best - margin).map((m) => Object.assign({}, m, { s: m.score + (Math.random() - 0.5) * 30 }));
        pool.sort((a, b) => b.s - a.s);
        if (pool.length) choice = pool[0];
        let gentle = false;
        if (pool.length > 1 && Math.random() < kind) {
          let c = pool.slice(1);
          if (deficit >= 300 && Math.random() < 0.6) { const nm = c.filter((m) => m.score < MATE - 1000); if (nm.length) c = nm; }
          choice = pick(c.slice(0, 4)); gentle = deficit >= 300;
        }
        const wait = Math.max(0, 650 + Math.random() * 500 - (performance.now() - t0));
        later(() => {
          if (thinking !== token) return;
          thinking = 0;
          if (!choice) { turnUI(); return; }
          const res = apply(choice);
          if (res && gentle && !game.game_over() && !game.in_check() && Math.random() < 0.5) toast(null, pick(M.gentil));
        }, wait);
      }, 30);
    }

    /* ------------------------------------------- tabuleiro fantasma (teto) */
    function imagine() {
      if (over || thinking || promoPending) return;
      clearTimeout(hoverTimer);
      setStatus('A imaginar no teto', 'is-dots');
      later(() => {
        const A = analyse(game.fen(), 3, 0); const m = A.moves[0];
        idleStatus();
        if (m) showGhost(m);
      }, 40);
    }
    function showGhost(m) {
      clearTimeout(ghostTimer);
      ghost.textContent = '';
      const plane = el('div', 'xq-ghost__plane');
      const grid8 = el('div', 'xq-ghost__grid'); plane.append(grid8);
      const bd = game.board(); let mover = null, victim = null;
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const q = bd[r][f]; if (!q) continue; const n = FILES[f] + (8 - r);
        const g = el('div', 'xq-gp'); g.style.backgroundImage = 'url("' + img(q.color, q.type) + '")';
        const [x, y] = xy(n); g.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)';
        if (n === m.from) { g.classList.add('is-hint'); mover = g; }
        if (n === m.to) victim = g;
        plane.append(g);
      }
      const [x0, y0] = xy(m.from), [x1, y1] = xy(m.to);
      const trail = el('div', 'xq-ghost__trail');
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
      trail.style.cssText = 'left:' + (x0 + 0.5) * 12.5 + '%;top:' + (y0 + 0.5) * 12.5 + '%;width:' + len * 12.5 + '%;transform:rotate(' + Math.atan2(dy, dx) + 'rad)';
      plane.append(trail);
      const tmp = new window.Chess(game.fen()); const r = tmp.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      const cap = el('p', 'xq-ghost__cap'); cap.textContent = 'e se… ' + (r ? pt(r.san) : m.from + '-' + m.to) + '?';
      ghost.append(plane, cap);
      ghost.classList.add('is-on'); stage.classList.add('is-dream');
      later(() => {
        if (mover) mover.style.transform = 'translate(' + x1 * 100 + '%,' + y1 * 100 + '%)';
        trail.classList.add('is-on');
        if (victim) victim.classList.add('is-gone');
      }, reduced() ? 0 : 900);
      ghostTimer = setTimeout(hideGhost, 6200);
    }
    function hideGhost() { clearTimeout(ghostTimer); ghost.classList.remove('is-on'); stage.classList.remove('is-dream'); }

    /* --------------------------------------------------------- promoção */
    function askPromotion(from, to) {
      promoPending = { from, to };
      const c = game.turn(); promo.textContent = '';
      const card = el('div', 'xq-promo__card');
      card.append(el('p', 'xq-promo__t', 'Promover a…'));
      const row = el('div', 'xq-promo__row');
      for (const t of ['q', 'r', 'b', 'n']) {
        const b = el('button', 'xq-promo__b'); b.type = 'button'; b.setAttribute('aria-label', NOME_PECA[t]);
        const pi = el('i', 'xq-promo__p'); pi.style.backgroundImage = 'url("' + img(c, t) + '")'; b.append(pi);
        b.addEventListener('click', () => { promo.hidden = true; const p = promoPending; promoPending = null; apply({ from: p.from, to: p.to, promotion: t }); });
        row.append(b);
      }
      card.append(row); promo.append(card); promo.hidden = false;
      row.firstChild.focus({ preventScroll: true });
    }
    function cancelPromotion() { if (!promoPending) return false; promoPending = null; promo.hidden = true; select(null); return true; }
    function tryMove(from, to, how) {
      const mv = game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
      if (!mv.length) return false;
      if (mv.some((m) => m.promotion)) {
        if (how && how.dropped) { const p = pcs[from]; if (p) { p.classList.add('no-anim'); place(p, to); } }
        askPromotion(from, to); return true;
      }
      apply(mv[0], how); return true;
    }

    /* -------------------------------------------------- rato, dedo, teclado */
    function onClick(e) {
      if (suppressClick) { suppressClick = false; return; }
      const b = e.target.closest('[data-sq]'); if (!b || !board.contains(b)) return;
      hideGhost();
      const n = b.dataset.sq, q = game.get(n);
      if (selected && targets.some((m) => m.to === n)) { tryMove(selected, n); return; }
      if (q && canMove(q.color)) { select(selected === n ? null : n); return; }
      select(null);
    }
    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      const n = sqAt(e.clientX, e.clientY); if (!n) return;
      const q = game.get(n); if (!q || !canMove(q.color) || !pcs[n]) return;
      dragging = { n, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    }
    function onMove(e) {
      if (dragging) {
        if (!dragging.on && Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > 6) {
          dragging.on = true; select(dragging.n); hideGhost();
          const p = pcs[dragging.n]; p.classList.add('is-drag', 'no-anim');
          try { board.setPointerCapture(dragging.id); } catch (_) {}
        }
        if (dragging.on) {
          const rc = board.getBoundingClientRect(), s = rc.width / 8;
          const p = pcs[dragging.n];
          p.style.transform = 'translate(' + (e.clientX - rc.left - s / 2) + 'px,' + (e.clientY - rc.top - s * 0.62) + 'px)';
          const over = sqAt(e.clientX, e.clientY);
          for (const k in sqEl) sqEl[k].classList.toggle('is-hover', k === over && targets.some((m) => m.to === k));
        }
        return;
      }
      // pensar demorado sobre uma peça → tabuleiro no teto
      if (e.pointerType !== 'mouse') return;
      const n = sqAt(e.clientX, e.clientY);
      if (n === hoverSq) return;
      hoverSq = n; clearTimeout(hoverTimer);
      const q = n && game.get(n);
      if (q && canMove(q.color) && !ghost.classList.contains('is-on')) hoverTimer = setTimeout(() => { if (hoverSq === n && !selected) imagine(); }, 2600);
    }
    function onUp(e) {
      const d = dragging; dragging = null; if (!d || !d.on) return;
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 50);
      for (const k in sqEl) sqEl[k].classList.remove('is-hover');
      const p = pcs[d.n]; if (p) p.classList.remove('is-drag');
      const to = sqAt(e.clientX, e.clientY);
      if (to && to !== d.n && targets.some((m) => m.to === to)) { tryMove(d.n, to, { dropped: true }); return; }
      if (p) { p.classList.remove('no-anim'); place(p, d.n); }
      if (to !== d.n) select(null);
    }
    board.addEventListener('click', onClick);
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onUp);
    board.addEventListener('pointerleave', () => { if (!dragging) { clearTimeout(hoverTimer); hoverSq = null; } });
    board.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-sq]'); if (!b) return;
      const n = b.dataset.sq; const [x, y] = xy(n); let nx = x, ny = y;
      if (e.key === 'ArrowLeft') nx--; else if (e.key === 'ArrowRight') nx++; else if (e.key === 'ArrowUp') ny--; else if (e.key === 'ArrowDown') ny++; else return;
      e.preventDefault(); nx = Math.max(0, Math.min(7, nx)); ny = Math.max(0, Math.min(7, ny));
      const t = flipped ? FILES[7 - nx] + (ny + 1) : FILES[nx] + (8 - ny); sqEl[t].focus();
    });
    stage.addEventListener('pointerdown', (e) => { if (ghost.classList.contains('is-on') && !e.target.closest('.xq-promo')) hideGhost(); });

    /* -------------------------------------------------------- controlos */
    function stopThinking() { thinking = 0; }
    function undo() {
      if (promoPending) cancelPromotion();
      stopThinking(); hideGhost(); hideFin();
      if (!game.history().length) return;
      game.undo();
      if (mode === 'ia' && game.turn() === 'b' && game.history().length) game.undo();
      over = false; selected = null; targets = [];
      rebuild(); refresh(false); result.textContent = '';
      if (mode === 'ia' && game.turn() === 'b') aiMove();
    }
    function newGame(silent) {
      cancelPromotion(); stopThinking(); hideGhost(); hideFin();
      game.reset(); over = false; selected = null; targets = []; result.textContent = '';
      rebuild(); refresh(false);
      if (!silent) toast(null, pick(M.inicio), 'gold');
    }
    function flip() { flipped = !flipped; root.classList.toggle('is-flipped', flipped); reposition(); hideGhost(); }
    function setMode(m) {
      mode = m === 'dois' ? 'dois' : 'ia'; stopThinking(); turnUI(); idleStatus(); select(null);
      if (mode === 'ia' && game.turn() === 'b' && !over) aiMove();
    }
    bUndo.addEventListener('click', undo);
    bNew.addEventListener('click', () => newGame());
    bFlip.addEventListener('click', flip);
    bImag.addEventListener('click', imagine);
    mIa.addEventListener('click', () => setMode('ia'));
    mDois.addEventListener('click', () => setMode('dois'));

    /* ------------------------------------------------------- fim de jogo */
    let petals = null;
    function endGame() {
      over = true; thinking = 0; turnUI(); highlights();
      if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'b' : 'w';
        result.textContent = winner === 'w' ? '1–0' : '0–1';
        setStatus(fmt(F.mate, { nome: NAME[winner] }), 'is-end');
        later(() => showFin(winner === 'w' ? 'win' : 'lose'), reduced() ? 200 : 900);
      } else {
        result.textContent = '½–½';
        const t = game.in_stalemate() ? M.afogado : F.empate;
        setStatus(t, 'is-end');
        later(() => showFin('draw', t), 700);
      }
    }
    function showFin(kind, drawText) {
      fin.textContent = ''; fin.className = 'xq-fin xq-fin--' + kind;
      const card = el('div', 'xq-fin__card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Fim da partida');
      const L = kind === 'win' ? M.vitoria : kind === 'lose' ? M.derrota : ['Empate.', drawText];
      card.append(el('p', 'xq-fin__k', kind === 'win' ? '1 – 0' : kind === 'lose' ? '0 – 1' : '½ – ½'));
      card.append(el('h3', 'xq-fin__t', L[0]), el('p', 'xq-fin__l', L[1]));
      card.append(el('p', 'xq-fin__sig', kind === 'win' ? 'o teu ' + NAME.b : 'com amor, ' + NAME.b));
      const row = el('div', 'xq-fin__row');
      const again = el('button', 'xq-btn xq-btn--gold', kind === 'lose' ? 'Desforra' : 'Outra partida'); again.type = 'button';
      const look = el('button', 'xq-btn', 'Ver o tabuleiro'); look.type = 'button';
      again.addEventListener('click', () => newGame()); look.addEventListener('click', hideFin);
      row.append(again, look); card.append(row);
      let cv = null;
      if (kind === 'win') { cv = el('canvas', 'xq-petals'); fin.append(cv); }
      fin.append(card); fin.hidden = false;
      if (cv) petals = rain(cv);
      requestAnimationFrame(() => fin.classList.add('is-on'));
      again.focus({ preventScroll: true });
    }
    function hideFin() { if (petals) { petals(); petals = null; } fin.classList.remove('is-on'); fin.hidden = true; fin.textContent = ''; }
    function rain(cv) {
      const ctx = cv.getContext('2d'); const dpr = Math.min(2, window.devicePixelRatio || 1);
      let W = 0, H = 0; const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      size();
      const COLS = ['#e8738f', '#f2a5b5', '#c8506b', '#f6d2d8', '#d4ae5c', '#fff1e6'];
      const N = reduced() ? 26 : 150;
      const parts = Array.from({ length: N }, (_, i) => ({
        x: Math.random() * W, y: reduced() ? Math.random() * H : -Math.random() * H * 1.2, s: 8 + Math.random() * 10,
        vy: 0.5 + Math.random() * 1.3, ph: Math.random() * 6.28, sw: 0.6 + Math.random() * 1.4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.05,
        heart: i % 3 === 0, c: COLS[i % COLS.length],
      }));
      const heart = (s) => { ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45); ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35); ctx.fill(); };
      const petal = (s) => { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.2, s * 0.15, s * 0.5, 0, 0, 6.283); ctx.fill(); };
      let raf = 0, t = 0, alive = true;
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          if (!reduced()) { p.y += p.vy; p.ph += 0.02; p.x += Math.sin(p.ph) * p.sw * 0.6; p.r += p.vr; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; } }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r + Math.sin(p.ph) * 0.4); ctx.fillStyle = p.c; ctx.globalAlpha = 0.9;
          if (p.heart) heart(p.s * 0.8); else petal(p.s * 0.7);
          ctx.restore();
        }
        t++;
        if (alive && !reduced()) raf = requestAnimationFrame(draw);
      };
      window.addEventListener('resize', size);
      draw();
      return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
    }

    /* ------------------------------------------------------------ início */
    coords(); rebuild(); refresh(false); layout();
    requestAnimationFrame(layout);
    // pré-carregar as peças
    for (const c of 'wb') for (const t of 'kqrbnp') { const i = new Image(); i.src = img(c, t); }

    const api = {
      game, root,
      render() { rebuild(); refresh(false); },
      load(fen) { cancelPromotion(); stopThinking(); hideFin(); hideGhost(); const ok = game.load(fen); over = false; rebuild(); refresh(false); if (game.game_over()) endGame(); return ok; },
      play(san, o) { const mv = game.moves({ verbose: true }).find((m) => m.san === san || m.from + m.to === san); return mv ? apply(mv, o || {}) : null; },
      select(n) { select(n); },
      undo, newGame, flip, setMode, imagine, layout,
      get mode() { return mode; },
      destroy() {
        stopThinking(); hideFin(); hideGhost(); timers.forEach(clearTimeout); timers.clear(); clearTimeout(hoverTimer); clearTimeout(toastT);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', layout);
        root.textContent = ''; root.classList.remove('xq', 'xq--overlay', 'xq--wide');
      },
      keydown(e) { // usado pelo overlay
        if (e.key === 'Escape') { if (cancelPromotion()) return true; if (!fin.hidden) { hideFin(); return true; } if (ghost.classList.contains('is-on')) { hideGhost(); return true; } if (selected) { select(null); return true; } }
        return false;
      },
    };
    later(() => { if (!game.history().length) toast(null, pick(M.inicio), 'gold'); }, 700);
    return api;
  }

  /* ============================================================= overlay */
  let OV = null;
  function open(cfg) {
    if (OV) return OV.api;
    const lastFocus = document.activeElement;
    const ov = el('div', 'xq-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', (cfg && cfg.titulo) || 'Xadrez');
    const close = el('button', 'xq-close'); close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.innerHTML = svgIcon(ICON.fechar);
    const host = el('div');
    ov.append(host, close);
    document.body.append(ov);
    const prev = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    const api = mount(host, cfg, { overlay: true });
    const onKey = (e) => {
      if (e.key === 'Escape') { if (api && api.keydown(e)) return; e.preventDefault(); closeOv(); return; }
      if (e.key === 'Tab') { // prender o foco
        const f = Array.from(ov.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
        if (!f.length) return; const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    close.addEventListener('click', () => closeOv());
    requestAnimationFrame(() => { ov.classList.add('is-on'); close.focus({ preventScroll: true }); if (api) api.layout(); });
    function closeOv() {
      if (!OV) return;
      document.removeEventListener('keydown', onKey, true);
      ov.classList.remove('is-on');
      const done = () => { if (api) api.destroy(); ov.remove(); };
      if (reduced()) done(); else setTimeout(done, 420);
      document.documentElement.style.overflow = prev.html; document.body.style.overflow = prev.body;
      OV = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    OV = { api, close: closeOv };
    if (api) setTimeout(() => { if (OV && OV.api === api) api.root && api.root.isConnected && api.layout(); }, 50);
    return api;
  }
  function closeOverlay() { if (OV) OV.close(); }

  window.Xadrez = { mount, open, close: closeOverlay, _analyse: analyse, _Pos: Pos };
})();
