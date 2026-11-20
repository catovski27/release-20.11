/* ascii.js — window.Ascii: player de clips ASCII (window.ASCII_CLIPS, ver docs/ASCII.md).
   Glifos reais numa fonte mono, desenhados a partir de um atlas (glifo x cor) pré-renderizado,
   brilho de fósforo por bloom reduzido (downscale + 'lighter'), estrelinhas e leve cintilar.
   Funciona em file:// (sem fetch, sem getImageData). */
(function () {
  'use strict';

  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return !!RM.matches; }
  function agora() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* ------------------------------------------------------------ descodificação */
  function b64(s) {
    var bin = atob(s), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  var CACHE = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  /* devolve { c:[Uint8Array], k:[Uint8Array] } (um par por frame), em cache por clip */
  function descodificar(clip) {
    if (CACHE && CACHE.has(clip)) return CACHE.get(clip);
    if (clip.__dec) return clip.__dec;
    var N = clip.cols * clip.rows, cs = [], ks = [], i, f;
    var enc = clip.enc || 'raw';
    if (enc === 'raw') {
      for (i = 0; i < clip.frames.length; i++) {
        f = clip.frames[i];
        cs.push(b64(f.c)); ks.push(b64(f.k));
      }
    } else if (enc === 'delta') {
      var c = new Uint8Array(N), k = new Uint8Array(N);
      for (i = 0; i < clip.frames.length; i++) {
        var d = b64(typeof clip.frames[i] === 'string' ? clip.frames[i] : clip.frames[i].d);
        var p = 0, j = 0;
        while (j < d.length) {
          var v = 0, s = 0, b;
          do { b = d[j++]; v |= (b & 127) << s; s += 7; } while (b & 128);
          p += v;
          v = 0; s = 0;
          do { b = d[j++]; v |= (b & 127) << s; s += 7; } while (b & 128);
          for (var q = 0; q < v; q++, p++) { c[p] = d[j++]; k[p] = d[j++]; }
        }
        cs.push(c.slice()); ks.push(k.slice());
      }
    } else {
      throw new Error('Ascii: enc desconhecido ' + enc);
    }
    var dec = { c: cs, k: ks };
    if (CACHE) CACHE.set(clip, dec); else clip.__dec = dec;
    return dec;
  }

  function segmento(clip, nome) {
    var n = clip.frames.length;
    if (Array.isArray(nome)) return [nome[0], nome[1]];
    var s = nome && clip.segmentos && clip.segmentos[nome];
    if (nome && !s) console.warn('Ascii: segmento desconhecido', nome);
    return s ? [s[0], s[1]] : [0, n - 1];
  }

  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mkCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    return c;
  }

  /* ------------------------------------------------------------ player */
  function player(canvas, opts) {
    opts = opts || {};
    var cfg = {
      fundo: opts.fundo || '#05030a',
      glow: opts.glow == null ? 0.6 : opts.glow,
      estrelas: opts.estrelas !== false,
      fonte: opts.fonte || '"Spline Sans Mono", ui-monospace, Menlo, Consolas, monospace',
      margem: opts.margem == null ? 0.03 : opts.margem,
      cintilar: opts.cintilar !== false,
      escala: opts.escala || 1,          // escala do glifo dentro da célula
      alinhar: opts.alinhar || 'centro'  // 'centro' | 'baixo'
    };
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, cssW = 0, cssH = 0;
    var off = mkCanvas(1, 1), offx = off.getContext('2d');
    var g1 = mkCanvas(1, 1), g1x = g1.getContext('2d');
    var g2 = mkCanvas(1, 1), g2x = g2.getContext('2d');
    var ant = null;               // instantâneo para crossfade
    var L = null;                 // layout atual {cw, ch, ox, oy, fs, sw, sh, clip}
    var atlas = null;             // {pages:[{cv,cx}], map:{}, n, per, cols}
    var estrelas = [];
    var clip = null, dec = null, curC = null, curK = null, frameAtual = -1;
    var anim = null;              // {seg, fps, t0, loop, pingpong, resolve}
    var glitchSt = null, dissolveSt = null, fadeSt = null;
    var flick = [];               // células a cintilar
    var proxFlick = 0;
    var raf = 0, vivo = true, sujoGlow = false;
    var ro = null;

    function layout() {
      if (!clip) { L = null; return; }
      var m = cfg.margem;
      var aw = W * (1 - 2 * m), ah = H * (1 - 2 * m);
      var ch = Math.min(ah / clip.rows, aw / (clip.cols * clip.cell));
      if (ch >= 6) ch = Math.floor(ch);
      var cw = ch * clip.cell;
      var fs = Math.min(ch * 1.05, Math.min(ch, cw / 0.6) * cfg.escala * (clip.escala || 1));
      fs = Math.max(2, fs);
      var gw = clip.cols * cw, gh = clip.rows * ch;
      var ox = Math.round((W - gw) / 2);
      var oy = cfg.alinhar === 'baixo' ? Math.round(H - gh - H * m) : Math.round((H - gh) / 2);
      var sw = Math.ceil(Math.max(cw, fs * 0.62)) + 2, sh = Math.ceil(Math.max(ch, fs * 1.2)) + 2;
      L = { cw: cw, ch: ch, ox: ox, oy: oy, fs: fs, sw: sw, sh: sh, clip: clip };
      // atlas novo (tamanhos mudaram)
      var per = Math.max(1, Math.floor(1024 / sw));
      atlas = { pages: [], map: Object.create(null), n: 0, per: per, linhas: Math.max(1, Math.floor(1024 / sh)), rgb: null };
    }

    function sprite(g, k) {
      var key = g * 256 + k, s = atlas.map[key];
      if (s) return s;
      var porPag = atlas.per * atlas.linhas;
      var pi = Math.floor(atlas.n / porPag), r = atlas.n % porPag;
      if (!atlas.pages[pi]) {
        var cv = mkCanvas(atlas.per * L.sw, atlas.linhas * L.sh);
        var cx = cv.getContext('2d');
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.font = Math.round(L.fs * 10) / 10 + 'px ' + cfg.fonte;
        atlas.pages[pi] = { cv: cv, cx: cx };
      }
      var pg = atlas.pages[pi];
      var x = (r % atlas.per) * L.sw, y = Math.floor(r / atlas.per) * L.sh;
      pg.cx.fillStyle = clip.palette[k] || '#ffffff';
      pg.cx.fillText(clip.ramp.charAt(g), x + L.sw / 2, y + L.sh / 2 + L.fs * 0.04);
      s = { cv: pg.cv, x: x, y: y };
      atlas.map[key] = s;
      atlas.n++;
      return s;
    }

    function celXY(i) {
      var q = i % clip.cols, r = (i / clip.cols) | 0;
      return [Math.round(L.ox + (q + 0.5) * L.cw - L.sw / 2), Math.round(L.oy + (r + 0.5) * L.ch - L.sh / 2)];
    }

    function desenharCelula(i, g, k) {
      var s = sprite(g, k), p = celXY(i);
      offx.drawImage(s.cv, s.x, s.y, L.sw, L.sh, p[0], p[1], L.sw, L.sh);
    }

    function render() {
      offx.clearRect(0, 0, W, H);
      if (!L || !curC) { sujoGlow = true; return; }
      var c = curC, k = curK, n = c.length;
      for (var i = 0; i < n; i++) if (c[i]) desenharCelula(i, c[i], k[i]);
      flick.length = 0;
      sujoGlow = true;
    }

    function atualizarGlow() {
      g1x.clearRect(0, 0, g1.width, g1.height);
      g1x.drawImage(off, 0, 0, g1.width, g1.height);
      g2x.clearRect(0, 0, g2.width, g2.height);
      g2x.drawImage(g1, 0, 0, g2.width, g2.height);
      sujoGlow = false;
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      cssW = Math.max(1, r.width || canvas.clientWidth || 300);
      cssH = Math.max(1, r.height || canvas.clientHeight || 150);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(cssW * dpr); H = Math.round(cssH * dpr);
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      off.width = W; off.height = H;
      g1.width = Math.max(1, Math.round(W / 4)); g1.height = Math.max(1, Math.round(H / 4));
      g2.width = Math.max(1, Math.round(W / 10)); g2.height = Math.max(1, Math.round(H / 10));
      g1x.imageSmoothingEnabled = g2x.imageSmoothingEnabled = true;
      // estrelas (em px do dispositivo)
      estrelas = [];
      if (cfg.estrelas) {
        var n = Math.round(cssW * cssH / 5200);
        for (var i = 0; i < n; i++) {
          estrelas.push({
            x: Math.random() * W, y: Math.random() * H,
            r: (Math.random() < 0.85 ? 1 : 1.6) * dpr,
            a: 0.15 + Math.random() * 0.55, f: 0.4 + Math.random() * 1.6, p: Math.random() * 6.28,
            cor: Math.random() < 0.7 ? '255,255,255' : (Math.random() < 0.5 ? '255,200,230' : '190,210,255')
          });
        }
      }
      layout();
      render();
    }

    /* ---------- composição por frame de ecrã */
    function compor(t) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = cfg.fundo;
      ctx.fillRect(0, 0, W, H);
      var rm = reduzido();
      for (var i = 0; i < estrelas.length; i++) {
        var e = estrelas[i];
        var a = rm ? e.a : e.a * (0.55 + 0.45 * Math.sin(t * 0.001 * e.f + e.p));
        ctx.fillStyle = 'rgba(' + e.cor + ',' + a.toFixed(3) + ')';
        ctx.fillRect(e.x, e.y, e.r, e.r);
      }
      if (dissolveSt) { comporDissolver(t); return; }
      var alfa = 1;
      if (fadeSt) {
        var f = Math.min(1, (t - fadeSt.t0) / fadeSt.ms);
        if (ant) { ctx.globalAlpha = 1 - f; ctx.drawImage(ant, 0, 0); }
        alfa = f;
        if (f >= 1) { fadeSt = null; ant = null; }
      }
      if (sujoGlow) atualizarGlow();
      if (glitchSt) { comporGlitch(t, alfa); return; }
      if (cfg.glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, cfg.glow * 0.85) * alfa;
        ctx.drawImage(g2, 0, 0, W, H);
        ctx.globalAlpha = Math.min(1, cfg.glow * 0.75) * alfa;
        ctx.drawImage(g1, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = alfa;
      ctx.drawImage(off, 0, 0);
      ctx.globalAlpha = 1;
    }

    /* ---------- cintilar: poucos caracteres trocam de glifo por instantes */
    function cintilar(t) {
      if (!cfg.cintilar || reduzido() || !curC || !L) return;
      if (t < proxFlick) return;
      proxFlick = t + 70;
      var n = curC.length, mudou = false, i;
      // restaura os que acabaram
      for (i = flick.length - 1; i >= 0; i--) {
        var f = flick[i];
        if (t > f.ate) {
          limparCelula(f.i);
          if (curC[f.i]) desenharCelula(f.i, curC[f.i], curK[f.i]);
          flick.splice(i, 1); mudou = true;
        }
      }
      var nr = clip.ramp.length - 1;
      var quantos = Math.max(1, Math.round(n * 0.0012));
      for (i = 0; i < quantos; i++) {
        var j = (Math.random() * n) | 0;
        if (!curC[j]) continue;
        var g = curC[j] + (Math.random() < 0.5 ? -1 : 1);
        if (g < 1) g = 2; if (g > nr) g = nr - 1;
        limparCelula(j);
        desenharCelula(j, g, curK[j]);
        flick.push({ i: j, ate: t + 90 + Math.random() * 260 });
        mudou = true;
      }
      return mudou;
    }
    function limparCelula(i) {
      var q = i % clip.cols, r = (i / clip.cols) | 0;
      var x = Math.floor(L.ox + q * L.cw), y = Math.floor(L.oy + r * L.ch);
      offx.clearRect(x, y, Math.ceil(L.cw), Math.ceil(L.ch));
    }

    /* ---------- reprodução */
    function mostrarFrame(i) {
      if (!dec) return;
      i = Math.max(0, Math.min(dec.c.length - 1, i));
      if (i === frameAtual) return;
      frameAtual = i;
      curC = dec.c[i]; curK = dec.k[i];
      render();
    }

    function setClip(c) {
      if (c === clip) return;
      clip = c;
      dec = c ? descodificar(c) : null;
      frameAtual = -1;
      layout();
    }

    function snapshot() {
      ant = mkCanvas(W, H);
      ant.getContext('2d').drawImage(off, 0, 0);
    }

    /* A Promise de play() só resolve quando o segmento acaba naturalmente (sem loop).
       Se for interrompida (outro play, stop, dissolver, destroy) fica pendente para sempre:
       assim um `await p.play(a); p.play(b)` antigo nunca "pisa" o que entretanto começou. */
    function terminarAnim(motivo) {
      if (anim) { var r = anim.resolve; anim = null; if (motivo === 'fim') r('fim'); }
    }

    function play(c, o) {
      o = o || {};
      if (!c) return Promise.resolve('sem clip');
      terminarAnim('interrompido');
      dissolveSt = null;
      if (o.fade && curC) { snapshot(); fadeSt = { t0: agora(), ms: o.fade }; }
      setClip(c);
      var seg = segmento(c, o.segmento);
      if (o.inverso) seg = [seg[1], seg[0]];
      return new Promise(function (resolve) {
        if (reduzido()) {
          mostrarFrame(seg[1]);
          resolve('reduzido');
          return;
        }
        anim = {
          seg: seg, fps: o.fps || c.fps || 15, t0: agora(),
          loop: !!o.loop,
          pingpong: o.pingpong != null ? !!o.pingpong : !!(c.loops && typeof o.segmento === 'string' && c.loops[o.segmento] === 'pingpong'),
          resolve: resolve
        };
        mostrarFrame(seg[0]);
      });
    }

    function passo(t) {
      if (!anim) return;
      var a = anim.seg[0], b = anim.seg[1], dir = b >= a ? 1 : -1, len = Math.abs(b - a) + 1;
      var n = Math.floor((t - anim.t0) / 1000 * anim.fps);
      var idx;
      if (anim.loop) {
        if (anim.pingpong && len > 1) {
          var per = 2 * (len - 1), m = n % per;
          idx = m < len ? m : per - m;
        } else idx = n % len;
        mostrarFrame(a + dir * idx);
      } else if (n >= len - 1) {
        mostrarFrame(b);
        terminarAnim('fim');
      } else mostrarFrame(a + dir * n);
    }

    /* ---------- glitch */
    function tingido(cor) {
      var cv = mkCanvas(W, H), cx = cv.getContext('2d');
      cx.drawImage(off, 0, 0);
      cx.globalCompositeOperation = 'multiply';
      cx.fillStyle = cor; cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = 'destination-in';
      cx.drawImage(off, 0, 0);
      return cv;
    }
    function glitch(ms) {
      ms = ms || 600;
      return new Promise(function (resolve) {
        if (glitchSt) glitchSt.resolve();
        if (reduzido()) ms = Math.min(ms, 160);
        glitchSt = { t0: agora(), ms: ms, resolve: resolve, r: tingido('#ff2050'), c: tingido('#20f0ff'), prox: 0, fat: [] };
      });
    }
    function comporGlitch(t, alfa) {
      var G = glitchSt, p = (t - G.t0) / G.ms;
      if (p >= 1) { glitchSt = null; G.resolve(); compor(t); return; }
      var rm = reduzido();
      var env = Math.sin(Math.PI * p); // 0 -> 1 -> 0
      if (rm) env = 0.25;
      if (t > G.prox) {
        G.prox = t + 45 + Math.random() * 60;
        G.fat = [];
        var nf = 2 + ((Math.random() * 7 * env) | 0);
        for (var i = 0; i < nf; i++) {
          var y = Math.random() * H, h = (4 + Math.random() * 60) * dpr * (0.4 + env);
          G.fat.push({ y: y, h: h, dx: (Math.random() - 0.5) * 80 * dpr * env });
        }
        G.sx = (Math.random() - 0.5) * 14 * dpr * env;
        G.bloco = Math.random() < 0.5 * env;
        G.by = Math.random() * H; G.bh = (10 + Math.random() * 40) * dpr; G.bx = Math.random() * W * 0.6;
      }
      ctx.globalAlpha = alfa;
      // glow
      if (cfg.glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = cfg.glow * 0.8 * alfa;
        ctx.drawImage(g2, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      // separação RGB
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * alfa;
      ctx.drawImage(G.r, G.sx, 0);
      ctx.drawImage(G.c, -G.sx, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alfa * (1 - 0.5 * env);
      ctx.drawImage(off, 0, 0);
      // faixas deslocadas
      ctx.globalAlpha = alfa;
      for (var j = 0; j < G.fat.length; j++) {
        var f = G.fat[j];
        ctx.fillStyle = cfg.fundo;
        ctx.fillRect(0, f.y, W, f.h);
        ctx.drawImage(off, 0, f.y, W, f.h, f.dx, f.y, W, f.h);
      }
      // bloco de ruído de caracteres
      if (G.bloco && L && clip) {
        var nc = Math.round(W * 0.4 / Math.max(2, L.cw)), nr2 = Math.max(1, Math.round(G.bh / L.ch));
        for (var r = 0; r < nr2; r++) for (var q = 0; q < nc; q++) {
          if (Math.random() < 0.5) continue;
          var s = sprite(1 + ((Math.random() * (clip.ramp.length - 1)) | 0), 1 + ((Math.random() * (clip.palette.length - 1)) | 0));
          ctx.drawImage(s.cv, s.x, s.y, L.sw, L.sh, G.bx + q * L.cw, G.by + r * L.ch, L.sw, L.sh);
        }
      }
      // linha de varrimento
      ctx.globalAlpha = 0.12 * env;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, ((t * 0.9) % H), W, 2 * dpr);
      ctx.globalAlpha = 1;
    }

    /* ---------- dissolver */
    function dissolver(ms) {
      ms = ms || 900;
      terminarAnim('dissolvido');
      return new Promise(function (resolve) {
        if (!curC || !L) { resolve(); return; }
        if (reduzido()) {
          snapshot(); fadeSt = { t0: agora(), ms: Math.min(ms, 400) };
          curC = null; curK = null; frameAtual = -1; render();
          setTimeout(resolve, Math.min(ms, 400));
          return;
        }
        var ps = [], n = curC.length, cx0 = L.ox + clip.cols * L.cw / 2, cy0 = L.oy + clip.rows * L.ch / 2;
        var passoAm = n > 9000 ? 2 : 1;
        for (var i = 0; i < n; i += passoAm) {
          var j = i;
          if (passoAm > 1 && ((i / clip.cols) | 0) % 2) j = i + 1;
          if (j >= n || !curC[j]) continue;
          var p = celXY(j), dx = p[0] - cx0, dy = p[1] - cy0, d = Math.sqrt(dx * dx + dy * dy) + 1;
          var forca = (60 + Math.random() * 220) * dpr;
          ps.push({
            x: p[0], y: p[1], vx: dx / d * forca * 0.6 + (Math.random() - 0.3) * 90 * dpr,
            vy: dy / d * forca * 0.4 - (40 + Math.random() * 120) * dpr,
            g: curC[j], k: curK[j], atraso: Math.random() * 0.35 + (p[1] / H) * 0.25 * (Math.random()),
            vida: 0.45 + Math.random() * 0.55
          });
        }
        dissolveSt = { t0: agora(), ms: ms, ps: ps, resolve: resolve };
        curC = null; curK = null; frameAtual = -1; render();
      });
    }
    function comporDissolver(t) {
      var D = dissolveSt, p = (t - D.t0) / D.ms;
      if (p >= 1) { dissolveSt = null; D.resolve(); return; }
      var nr = clip.ramp.length - 1;
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < D.ps.length; i++) {
        var q = D.ps[i];
        var tl = (p - q.atraso) / q.vida;   // tempo local 0..1
        var a, x = q.x, y = q.y, g = q.g;
        if (tl <= 0) { a = 1; }
        else {
          if (tl >= 1) continue;
          var s = tl * D.ms / 1000 * q.vida;
          x += q.vx * s; y += q.vy * s + 60 * dpr * s * s;
          a = 1 - tl;
          if (Math.random() < 0.25) g = 1 + ((Math.random() * nr) | 0);
          else g = Math.max(1, q.g - Math.floor(tl * nr));
        }
        var sp = sprite(g, q.k);
        ctx.globalAlpha = a;
        ctx.drawImage(sp.cv, sp.x, sp.y, L.sw, L.sh, x, y, L.sw, L.sh);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ---------- ciclo */
    function ciclo() {
      if (!vivo) return;
      raf = requestAnimationFrame(ciclo);
      if (!W || !H) return;
      var t = agora();
      passo(t);
      cintilar(t);
      compor(t);
    }

    function hit(x, y) {
      if (!L || !curC) return false;
      var X = x * dpr, Y = y * dpr;
      var q = Math.floor((X - L.ox) / L.cw), r = Math.floor((Y - L.oy) / L.ch);
      for (var dr = -1; dr <= 1; dr++) for (var dq = -1; dq <= 1; dq++) {
        var rr = r + dr, qq = q + dq;
        if (rr < 0 || qq < 0 || rr >= clip.rows || qq >= clip.cols) continue;
        if (curC[rr * clip.cols + qq]) return true;
      }
      return false;
    }

    function stop() {
      terminarAnim('parado');
    }

    function mostrar(c, i) {
      terminarAnim('interrompido');
      setClip(c);
      frameAtual = -1;
      mostrarFrame(i == null ? c.frames.length - 1 : i);
    }

    function limpar() {
      terminarAnim('limpo');
      curC = null; curK = null; frameAtual = -1; render();
    }

    function destroy() {
      vivo = false;
      cancelAnimationFrame(raf);
      terminarAnim('destruido');
      if (glitchSt) { glitchSt.resolve(); glitchSt = null; }
      if (dissolveSt) { dissolveSt.resolve(); dissolveSt = null; }
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      atlas = null; dec = null;
    }

    // fonte: quando carregar, reconstrói o atlas
    if (document.fonts && document.fonts.load) {
      try {
        document.fonts.load('16px ' + cfg.fonte).then(function () {
          if (!vivo) return; layout(); render();
        }, function () {});
      } catch (e) { /* noop */ }
    }
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () { if (vivo) resize(); });
      ro.observe(canvas);
    } else window.addEventListener('resize', resize);
    resize();
    raf = requestAnimationFrame(ciclo);

    return {
      play: play, glitch: glitch, dissolver: dissolver, resize: resize, stop: stop, destroy: destroy,
      hit: hit, mostrar: mostrar, limpar: limpar,
      get clip() { return clip; }, get frame() { return frameAtual; },
      set glow(v) { cfg.glow = v; }, get glow() { return cfg.glow; }
    };
  }

  function desenhar(canvas, clip, o) {
    o = o || {};
    var p = player(canvas, {
      fundo: o.fundo, glow: o.glow, estrelas: !!o.estrelas, fonte: o.fonte,
      margem: o.margem, cintilar: o.cintilar !== false, escala: o.escala
    });
    p.mostrar(clip, o.frame || 0);
    return { destroy: p.destroy, player: p };
  }

  window.Ascii = { player: player, desenhar: desenhar, descodificar: descodificar };
})();
