/* ==========================================================================
   pc.js — O interior do computador antigo (CRT bege), visto muito de perto.
   window.Pc.open({ clips, blog, onSair }) -> { close() }

   Sequência: power-on CRT (linha + flash + degauss + boot) → flores ASCII
   (crescer → viver) → clique: aproximação + glitch → a prenda a flutuar →
   clique: abre → o urso «I LOVE YOU» (corações a subir) → clique ou ~7 s →
   o urso desfaz-se em caracteres → Blog.mount(área do ecrã, blog).
   Botão de energia ou Esc → colapso CRT (linha → ponto) → onSair() → fecha.

   O ASCII é desenhado por window.Ascii (js/ascii.js) num canvas de origem;
   um canvas WebGL por cima faz o pós-processamento (curvatura do vidro,
   aberração cromática, bloom, rasgos de glitch). Sem WebGL, vê-se o canvas
   de origem tal e qual e o vidro/scanlines continuam em CSS.
   ========================================================================== */
(function () {
  'use strict';

  var reduz = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------------------------------------------------------------- WebGL */
  var VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D T;uniform vec2 R;uniform float t,G,K;varying vec2 v;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'vec3 s(vec2 u){return texture2D(T,clamp(u,0.,1.)).rgb;}',
    'void main(){',
    '  vec2 c=v*2.-1.;float r2=dot(c,c);',
    '  vec2 u=c*(1.+K*r2)*.5+.5;',                                     // curvatura do vidro
    '  float f=floor(t*22.);',
    '  float b=floor(u.y*26.+h(vec2(f,3.))*9.);',
    '  float rr=h(vec2(b,f));',
    '  u.x+=step(1.-G*.6,rr)*(h(vec2(b,f+1.))-.5)*.16*G;',              // rasgos horizontais
    '  float bb=floor(u.y*90.);',
    '  u.x+=step(1.-G*.25,h(vec2(bb,f*1.7)))*(h(vec2(bb,f))-.5)*.05*G;', // linhas finas deslocadas
    '  vec2 d=u-.5;',
    '  vec2 ca=d*(.004+.012*dot(d,d))+vec2(G*.014,0.);',                // aberração cromática
    '  vec3 col=vec3(s(u+ca).r,s(u).g,s(u-ca).b);',
    '  vec2 o=1.6/R;',                                                 // bloom barato (8 toques)
    '  vec3 bl=s(u+vec2(o.x,0.))+s(u-vec2(o.x,0.))+s(u+vec2(0.,o.y))+s(u-vec2(0.,o.y));',
    '  vec3 bl2=s(u+o*2.2)+s(u-o*2.2)+s(u+vec2(o.x,-o.y)*2.2)+s(u+vec2(-o.x,o.y)*2.2);',
    '  vec3 bg=s(vec2(.002,.5));',
    '  col+=max(bl*.25-bg,0.)*.22+max(bl2*.25-bg,0.)*.18;',
    '  col*=1.+G*.25*(h(vec2(f,b))-.3);',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function criarGL(canvas, fonte) {
    var gl;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(tipo, src) {
      var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) { return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    var U = {
      R: gl.getUniformLocation(prog, 'R'), t: gl.getUniformLocation(prog, 't'),
      G: gl.getUniformLocation(prog, 'G'), K: gl.getUniformLocation(prog, 'K')
    };
    var perdido = false;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); perdido = true; });
    return {
      render: function (tempo, glitch, curva) {
        if (perdido || !fonte.width || !fonte.height) return false;
        var w = Math.min(fonte.width, 2600), hh = Math.round(fonte.height * w / fonte.width);
        if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
        gl.viewport(0, 0, w, hh);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte); }
        catch (e) { perdido = true; return false; }
        gl.uniform2f(U.R, w, hh);
        gl.uniform1f(U.t, tempo);
        gl.uniform1f(U.G, glitch);
        gl.uniform1f(U.K, curva);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
      },
      falhou: function () { return perdido; },
      destroy: function () {
        try { gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(prog); } catch (e) { /* nada */ }
        var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      }
    };
  }

  /* ------------------------------------------------------------- Clips */
  function acharClip(clips, nomes) {
    if (!clips) return null;
    for (var i = 0; i < nomes.length; i++) if (clips[nomes[i]]) return clips[nomes[i]];
    return null;
  }
  // loop contínuo: 'loop' (se o clip disser que o segmento fecha sobre si) ou vai-e-vem
  function emLoop(clip, seg) {
    var modo = clip && clip.loops && clip.loops[seg];
    return { segmento: seg, loop: true, pingpong: modo !== 'loop' };
  }
  function duracaoSeg(clip, seg) {
    var s = clip && clip.segmentos && clip.segmentos[seg];
    var n = s ? (s[1] - s[0] + 1) : (clip && clip.frames ? clip.frames.length : 60);
    return n / ((clip && clip.fps) || 24) * 1000;
  }

  /* ------------------------------------------------------------- Textos */
  var TX = {
    boot: ['TERNURA·86  BIOS v4.0', 'memória ............ 4 anos  OK', 'coração ............ 1  OK', 'saudade ............ a postos', 'sementes ........... plantadas', 'jardim ............. a acordar'],
    dicaFlores: 'clica',
    dicaPrenda: 'abre-me',
    dicaUrso: 'continua',
    alvoFlores: 'Aproximar do ecrã',
    alvoPrenda: 'Abrir a prenda',
    alvoUrso: 'Continuar para o blog',
    desligar: 'Desligar o computador',
    semBlog: 'o blog ainda está a ser escrito…'
  };

  var atual = null;

  /* ============================================================== open */
  function open(cfg) {
    cfg = cfg || {};
    if (atual) atual.close(true);

    var rm = reduz();
    var vivo = true;
    var fase = 'off';
    var etapa = 0;               // invalida continuações antigas
    var timers = [];
    var focoAntes = document.activeElement;

    /* ---- DOM ---- */
    var root = el('div', 'pc', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'O computador antigo' });
    if (rm) root.classList.add('pc-rm');
    var caixa = el('div', 'pc-caixa');
    var vidro = el('div', 'pc-vidro');
    var ecra = el('div', 'pc-ecra');
    var mundo = el('div', 'pc-mundo');
    var src = el('canvas', 'pc-src', { 'aria-hidden': 'true' });
    var glc = el('canvas', 'pc-gl', { 'aria-hidden': 'true' });
    mundo.appendChild(src); mundo.appendChild(glc);
    var coracoes = el('div', 'pc-coracoes', { 'aria-hidden': 'true' });
    var boot = el('div', 'pc-boot', { 'aria-hidden': 'true' });
    var blogEl = el('div', 'pc-blog', { tabindex: '-1', 'aria-label': 'O blog' });
    var dica = el('div', 'pc-dica', { 'aria-hidden': 'true' });
    var alvo = el('button', 'pc-alvo', { type: 'button', 'aria-label': TX.alvoFlores });
    var logoEl = el('div', 'pc-logo', { 'aria-hidden': 'true' });
    logoEl.innerHTML =
      '<svg class="pc-logo__emb" viewBox="0 0 200 110" focusable="false">' +
      '<circle class="pc-logo__a" cx="78" cy="55" r="40"/><circle class="pc-logo__b" cx="122" cy="55" r="40"/>' +
      '<path class="pc-logo__lente" d="M100 22.5 A40 40 0 0 1 100 87.5 A40 40 0 0 1 100 22.5Z"/>' +
      '<path class="pc-logo__cor" d="M100 73 C 86 63, 85 53, 92 49 C 96 47, 99 49, 100 52 C 101 49, 104 47, 108 49 C 115 53, 114 63, 100 73Z"/>' +
      '</svg>' +
      '<div class="pc-logo__nome"><span class="pc-logo__t">tchitchiboa</span><i>&amp;</i><span class="pc-logo__c">chichiboo</span></div>' +
      '<div class="pc-logo__comp"><b></b><span>company</span><b></b></div>' +
      '<p class="pc-logo__lema">tecnologia com ternura · desde 2003</p>';
    var degauss = el('div', 'pc-degauss', { 'aria-hidden': 'true' });
    var rasgos = el('div', 'pc-rasgos', { 'aria-hidden': 'true' });
    for (var i = 0; i < 5; i++) rasgos.appendChild(el('i'));
    [mundo, coracoes, boot, logoEl, blogEl, dica, alvo, degauss, rasgos].forEach(function (n) { ecra.appendChild(n); });

    vidro.appendChild(ecra);
    ['pc-scan', 'pc-mascara', 'pc-rolo', 'pc-vinheta', 'pc-reflexo', 'pc-ponto'].forEach(function (c) {
      vidro.appendChild(el('div', c, { 'aria-hidden': 'true' }));
    });

    var queixo = el('div', 'pc-queixo');
    var marca = el('div', 'pc-marca', { 'aria-hidden': 'true' });
    marca.innerHTML = '<span class="pc-arco"><i></i><i></i><i></i><i></i></span><span class="pc-nome">ternura<b>·86</b></span>';
    var grelha = el('div', 'pc-grelha', { 'aria-hidden': 'true' });
    var comandos = el('div', 'pc-comandos');
    var led = el('span', 'pc-led', { 'aria-hidden': 'true' });
    var botao = el('button', 'pc-energia', { type: 'button', 'aria-label': TX.desligar, title: TX.desligar });
    botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" /><path d="M6.6 6.6a8 8 0 1 0 10.8 0" /></svg>';
    comandos.appendChild(led); comandos.appendChild(botao);
    queixo.appendChild(marca); queixo.appendChild(grelha); queixo.appendChild(comandos);

    caixa.appendChild(vidro); caixa.appendChild(queixo);
    root.appendChild(caixa);
    document.body.appendChild(root);

    /* ---- utilitários com cancelamento ---- */
    function espera(ms) {
      return new Promise(function (res) { timers.push(setTimeout(res, ms)); });
    }
    function ok(e) { return vivo && e === etapa; }
    function setFase(f) { fase = f; root.setAttribute('data-fase', f); }
    function mostrarDica(txt, ms) {
      dica.innerHTML = '<span class="pc-seta">▸</span> ' + txt;
      var e = etapa;
      timers.push(setTimeout(function () { if (ok(e)) dica.classList.add('is-on'); }, ms || 0));
    }
    function esconderDica() { dica.classList.remove('is-on'); }
    function corrida(p, ms) {
      return Promise.race([Promise.resolve(p).catch(function () {}), espera(ms)]);
    }

    /* ---- player ASCII + WebGL ---- */
    var clipFlores = acharClip(cfg.clips, ['flores', 'lirios', 'lírios']);
    var clipPrenda = acharClip(cfg.clips, ['prenda', 'urso', 'teddy']);
    var player = null;
    if (window.Ascii && typeof window.Ascii.player === 'function' && (clipFlores || clipPrenda)) {
      try {
        player = window.Ascii.player(src, {
          fundo: '#05030a', glow: 0.6, estrelas: true, fonte: '"Spline Sans Mono", monospace'
        });
      } catch (e) { player = null; }
    }
    var gl = null;
    if (player && !rm) gl = criarGL(glc, src);
    if (!gl) { glc.remove(); glc = null; root.classList.add('pc-sem-gl'); }

    var glitchAlvo = 0, glitchAtual = 0, curva = 0.075, raf = 0, t0 = performance.now(), visivel = true;
    function loop(agora) {
      raf = 0;
      if (!vivo || !gl) return;
      glitchAtual += (glitchAlvo - glitchAtual) * (glitchAlvo > glitchAtual ? 0.5 : 0.12);
      if (!gl.render((agora - t0) / 1000, glitchAtual, curva)) {
        // contexto perdido: volta ao canvas cru
        if (glc) { glc.remove(); glc = null; root.classList.add('pc-sem-gl'); }
        gl.destroy(); gl = null; return;
      }
      if (visivel) raf = requestAnimationFrame(loop);
    }
    function ligarLoop() { if (gl && !raf && vivo) raf = requestAnimationFrame(loop); }
    function pararLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function onVis() { visivel = !document.hidden; if (visivel) ligarLoop(); }
    document.addEventListener('visibilitychange', onVis);

    function glitchPulso(forca, ms) {
      if (rm) return espera(0);
      glitchAlvo = forca;
      root.classList.add('is-glitch');
      var e = etapa;
      return espera(ms).then(function () {
        glitchAlvo = 0;
        if (vivo) root.classList.remove('is-glitch');
        return ok(e);
      });
    }

    var rTimer = 0;
    function onResize() {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () { if (player && player.resize) try { player.resize(); } catch (e) {} }, 80);
    }
    window.addEventListener('resize', onResize);

    /* ---- teclado ---- */
    function onKey(e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (e.defaultPrevented) return;
      // se outro diálogo modal estiver aberto por cima (p.ex. xadrez), deixa-o tratar do Esc
      var outros = document.querySelectorAll('[aria-modal="true"]');
      for (var j = 0; j < outros.length; j++) {
        if (outros[j] !== root && !root.contains(outros[j]) && outros[j].offsetParent !== null) return;
      }
      e.preventDefault();
      desligar();
    }
    document.addEventListener('keydown', onKey);

    /* ================================================== sequência */
    async function ligar() {
      var e = ++etapa;
      setFase('boot');
      await espera(rm ? 60 : 380);
      if (!ok(e)) return;
      root.classList.add('is-ligado');
      led.classList.add('is-on');
      if (!rm) {
        root.classList.add('is-ligar');
        await espera(1150);
        if (!ok(e)) return;
        root.classList.remove('is-ligar');
        // o «sistema operativo» é o jardim: as flores começam a crescer enquanto o boot corre
        if (clipFlores && player) {
          mundo.style.transition = 'none'; mundo.classList.add('is-lado'); void mundo.offsetWidth; mundo.style.transition = '';
          mundo.classList.add('is-on');
          ligarLoop();
          cresceFlores = player.play(clipFlores, { segmento: 'crescer' });
        }
        // boot normal: o texto escreve-se letra a letra à esquerda e a barra enche ao ritmo das flores (à direita)
        boot.classList.add('is-on');
        var durMs = clipFlores ? Math.max(2500, duracaoSeg(clipFlores, 'crescer')) : 3000;
        var t0 = Date.now();
        var total = 0; for (var q = 0; q < TX.boot.length; q++) total += TX.boot[q].length;
        var porLetra = Math.max(8, Math.min(34, (durMs * 0.5) / total));
        var cursor = null;
        for (var i = 0; i < TX.boot.length; i++) {
          var ln = el('div', 'pc-boot-l is-cursor');
          boot.appendChild(ln);
          if (cursor) cursor.classList.remove('is-cursor');
          cursor = ln;
          for (var c = 1; c <= TX.boot[i].length; c++) {
            ln.textContent = TX.boot[i].slice(0, c);
            await espera(porLetra);
            if (!ok(e)) return;
          }
          await espera(110);
          if (!ok(e)) return;
        }
        var barra = el('div', 'pc-boot-l is-cursor');
        boot.appendChild(barra); cursor.classList.remove('is-cursor');
        var NB = 22;
        for (;;) {
          var p = Math.min(1, (Date.now() - t0) / durMs);
          var n = Math.round(p * NB);
          barra.textContent = 'flores.asc [' + new Array(n + 1).join('█') + new Array(NB - n + 1).join('░') + '] ' + Math.round(p * 100) + '%';
          if (p >= 1) break;
          await espera(70);
          if (!ok(e)) return;
        }
        await espera(450);
        if (!ok(e)) return;
      } else {
        await espera(250);
        if (!ok(e)) return;
      }
      if (clipFlores && player) {
        if (cresceFlores) {
          // as flores acabam de crescer (sempre à direita), corta-se para a marca da casa e depois para a prenda
          await corrida(cresceFlores, duracaoSeg(clipFlores, 'crescer') + 2500);
          if (!ok(e)) return;
          player.play(clipFlores, emLoop(clipFlores, 'viver'));
          await espera(rm ? 200 : 800);
          if (!ok(e)) return;
          boot.classList.add('is-sai'); // o texto e as flores desaparecem ao mesmo tempo, quando entra a marca
          mundo.classList.add('is-apaga');
          logoEl.classList.add('is-on');
          await glitchPulso(0.6, 260);
          if (!ok(e)) return;
          await espera(rm ? 900 : 3100);
          if (!ok(e)) return;
          await glitchPulso(1, 460);
          if (!ok(e)) return;
          logoEl.classList.remove('is-on'); boot.classList.remove('is-on');
          mundo.style.transition = 'none'; mundo.classList.remove('is-lado'); void mundo.offsetWidth; mundo.style.transition = '';
          prenda(false);
        } else flores();
      } else if (clipPrenda && player) prenda(false);
      else blog();
    }
    var cresceFlores = null;

    async function flores() {
      var e = ++etapa;
      setFase('flores');
      alvo.setAttribute('aria-label', TX.alvoFlores);
      mundo.classList.add('is-on');
      ligarLoop();
      var cresce = player.play(clipFlores, { segmento: 'crescer' });
      mostrarDica(TX.dicaFlores, Math.min(duracaoSeg(clipFlores, 'crescer') + 400, 5200));
      await corrida(cresce, duracaoSeg(clipFlores, 'crescer') + 2500);
      if (!ok(e)) return;
      player.play(clipFlores, emLoop(clipFlores, 'viver'));
    }

    async function prenda(comZoom) {
      var e = ++etapa;
      setFase('zoom');
      esconderDica();
      if (comZoom && !rm) {
        mundo.classList.add('is-zoom');
        await espera(520);
        if (!ok(e)) return;
        var g = player.glitch ? player.glitch(700) : null;
        glitchPulso(1, 720);
        await corrida(g, 760);
        if (!ok(e)) return;
        mundo.classList.remove('is-zoom');
        mundo.classList.add('is-chega');
      } else if (comZoom) {
        mundo.classList.add('is-apaga');
        await espera(220);
        if (!ok(e)) return;
      }
      player.play(clipPrenda, emLoop(clipPrenda, 'caixa'));
      mundo.classList.remove('is-apaga');
      if (!rm) {
        await espera(80);
        if (!ok(e)) return;
        mundo.classList.remove('is-chega');
        glitchPulso(0.25, 200);
        await espera(900);
        if (!ok(e)) return;
        mundo.classList.add('is-flutua');
      }
      setFase('prenda');
      alvo.setAttribute('aria-label', TX.alvoPrenda);
      mostrarDica(TX.dicaPrenda, rm ? 0 : 900);
    }

    async function abrir() {
      var e = ++etapa;
      setFase('abrir');
      esconderDica();
      mundo.classList.remove('is-flutua');
      glitchPulso(0.18, 140);
      var dur = duracaoSeg(clipPrenda, 'abrir');
      await corrida(player.play(clipPrenda, { segmento: 'abrir' }), dur + 2000);
      if (!ok(e)) return;
      player.play(clipPrenda, emLoop(clipPrenda, 'urso'));
      setFase('urso');
      alvo.setAttribute('aria-label', TX.alvoUrso);
      alvo.disabled = true;                 // deixa respirar
      if (!rm) coracoesInicio();
      await espera(1800);
      if (!ok(e)) return;
      alvo.disabled = false;
      mostrarDica(TX.dicaUrso, 1800);
      await espera(5200);
      if (!ok(e)) return;
      blog();
    }

    var corTimer = 0;
    var CORES = ['#ff4d6d', '#ff8fab', '#ffb3c6', '#ff2e63', '#f9a8d4', '#ffd6e0'];
    var GLIFOS = ['♥', '♥', '♡', '<3', '♥'];
    function coracoesInicio() {
      var n = 0;
      function um() {
        if (!vivo || n++ > 22) return;
        var c = el('span', 'pc-cor');
        c.textContent = GLIFOS[(Math.random() * GLIFOS.length) | 0];
        c.style.left = (22 + Math.random() * 56) + '%';
        c.style.color = CORES[(Math.random() * CORES.length) | 0];
        c.style.fontSize = (0.8 + Math.random() * 1.1).toFixed(2) + 'em';
        c.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(0) + 'px');
        c.style.animationDuration = (3.6 + Math.random() * 2.4).toFixed(2) + 's';
        coracoes.appendChild(c);
        c.addEventListener('animationend', function () { c.remove(); });
        corTimer = setTimeout(um, 240 + Math.random() * 260);
      }
      um();
    }
    function coracoesFim() { clearTimeout(corTimer); coracoes.classList.add('is-sai'); }

    var blogInst = null;
    async function blog() {
      var e = ++etapa;
      setFase('blog-entra');
      esconderDica();
      coracoesFim();
      alvo.hidden = true;
      if (player && mundo.classList.contains('is-on')) {
        if (!rm && player.dissolver) {
          glitchPulso(0.3, 260);
          await corrida(player.dissolver(1100), 1500);
        } else {
          await espera(rm ? 120 : 400);
        }
        if (!ok(e)) return;
        mundo.classList.add('is-sai');
        await espera(rm ? 150 : 450);
        if (!ok(e)) return;
      }
      pararLoop();
      if (player) { try { player.stop && player.stop(); } catch (x) {} }
      mundo.hidden = true;
      coracoes.innerHTML = '';

      blogEl.classList.add('is-on');
      if (window.Blog && typeof window.Blog.mount === 'function') {
        try { blogInst = window.Blog.mount(blogEl, cfg.blog || {}); }
        catch (x) { console.error('[Pc] Blog.mount falhou', x); blogVazio(); }
      } else blogVazio();
      setFase('blog');
      try { if (typeof cfg.onBlog === 'function') cfg.onBlog(); } catch (x) { /* */ }
      try { blogEl.focus({ preventScroll: true }); } catch (x) {}
      // o player já não faz falta: liberta GPU/CPU
      if (gl) { gl.destroy(); gl = null; }
      if (player) { try { player.destroy && player.destroy(); } catch (x) {} player = null; }
    }
    function blogVazio() {
      var d = el('div', 'pc-blog-vazio');
      d.innerHTML = '<pre aria-hidden="true">   _____\n  |     |\n  | ♥   |\n  |_____|\n</pre><p></p>';
      d.querySelector('p').textContent = TX.semBlog;
      blogEl.appendChild(d);
    }

    /* ---- cliques no ecrã ---- */
    alvo.addEventListener('click', function () {
      if (!vivo) return;
      if (fase === 'flores') prenda(true);
      else if (fase === 'prenda') abrir();
      else if (fase === 'urso') blog();
    });

    /* ---- desligar ---- */
    var saindo = false;
    async function desligar() {
      if (saindo || !vivo) return;
      saindo = true;
      ++etapa;
      setFase('off');
      esconderDica();
      coracoesFim();
      led.classList.remove('is-on');
      botao.disabled = true;
      root.classList.add('is-desligar');
      await new Promise(function (r) { setTimeout(r, rm ? 320 : 1250); });
      if (!vivo) return;
      pararLoop();
      if (player) { try { player.stop && player.stop(); } catch (x) {} }
      try { if (typeof cfg.onSair === 'function') cfg.onSair(); }
      catch (x) { console.error('[Pc] onSair', x); }
      close();
    }
    botao.addEventListener('click', desligar);

    /* ---- fechar ---- */
    var fechado = false;
    function close(imediato) {
      if (fechado) return;
      fechado = true;
      vivo = false;
      ++etapa;
      timers.forEach(clearTimeout); timers = [];
      clearTimeout(corTimer); clearTimeout(rTimer);
      pararLoop();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      if (blogInst && blogInst.destroy) { try { blogInst.destroy(); } catch (x) {} }
      if (player) { try { player.destroy && player.destroy(); } catch (x) {} player = null; }
      if (gl) { gl.destroy(); gl = null; }
      if (atual === api) atual = null;
      var remover = function () { root.remove(); };
      if (imediato || rm) remover();
      else { root.classList.add('is-fecha'); setTimeout(remover, 420); }
      if (focoAntes && focoAntes.focus && document.contains(focoAntes)) {
        try { focoAntes.focus({ preventScroll: true }); } catch (x) {}
      }
    }

    var api = {
      close: function (imediato) { close(!!imediato); },
      desligar: desligar,
      get fase() { return fase; }
    };
    atual = api;

    setFase('off');
    try { alvo.focus({ preventScroll: true }); } catch (x) {}
    ligar();
    return api;
  }

  window.Pc = { open: open };
})();
