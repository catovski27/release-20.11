/* ==========================================================================
   A MESA — monta a página a partir de js/content.js.

   No meio da natureza (a paisagem pintada, js/ceu.js) há uma mesa (js/mesa.js)
   com duas coisas em cima:
   1. O LIVRO (o mundo dela): agarra-se e abre-se (js/livro.js); folheia-se
      para o lado. «pousar o livro» devolve-o à mesa.
   2. O COMPUTADOR ANTIGO (o mundo dele): clica-se no sticker, a câmara
      aproxima-se e ele liga (js/pc.js): flores em ASCII, glitch, a prenda,
      o urso «I LOVE YOU», e depois o blog em ASCII (js/blog.js).
   O rabisco «não cliques» dentro do livro também leva ao computador.

   Os textos vêm da pasta textos/ (ver resolverTextos).
   ========================================================================== */
(function () {
  'use strict';

  const C = window.CONTENT, PHOTOS = window.PHOTOS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!C) {
    // js/content.js não carregou (quase sempre uma vírgula ou aspa em falta)
    console.error('js/content.js tem um erro: vê a primeira mensagem vermelha da consola.');
    document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 0 2rem;text-align:center;color:#fff">Erro no js/content.js</p>');
    return;
  }

  /* ------------------------------------------------------------- textos */
  // '@pasta/ficheiro'  → o conteúdo de textos/pasta/ficheiro.txt
  // '@@pasta/ficheiro' → uma lista: cada parágrafo (separado por linha vazia) é um item
  const TEXTOS = window.TEXTOS || {};
  async function lerTexto(chave) {
    if (location.protocol !== 'file:') {
      try {
        const r = await fetch('textos/' + chave + '.txt', { cache: 'no-store' });
        if (r.ok) return (await r.text()).replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
      } catch (e) { /* sem rede: usa a cópia em js/textos.js */ }
    }
    return TEXTOS[chave];
  }
  async function resolverTextos(obj) {
    const pend = [];
    (function walk(o) {
      for (const k in o) {
        const v = o[k];
        if (typeof v === 'string' && v[0] === '@') {
          const lista = v.startsWith('@@'), chave = v.replace(/^@+/, '');
          pend.push(lerTexto(chave).then((t) => {
            if (t === undefined || t === '') t = '✏️ falta escrever textos/' + chave + '.txt';
            if (lista) {
              const itens = t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
              // [categoria] no início de um item → { cat, texto }
              o[k] = itens.map((s) => { const m = s.match(/^\[([^\]]+)\]\s*/); return m ? { cat: m[1], texto: s.slice(m[0].length) } : s; });
            } else o[k] = t;
          }));
        } else if (v && typeof v === 'object') walk(v);
      }
    })(obj);
    await Promise.all(pend);
  }

  /* --------------------------------------------------------- utilidades */
  const PH = /^\s*✏️\s*/;
  const isPh = (t) => typeof t === 'string' && PH.test(t);
  const setText = (e, text) => { if (isPh(text)) { e.classList.add('ph'); e.textContent = text.replace(PH, ''); } else e.textContent = text == null ? '' : text; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) setText(e, text); return e; };
  const safe = (nome, fn) => { try { return fn(); } catch (e) { console.warn(nome + ':', e); return null; } };

  /* ----------------------------------------------------------- música */
  const VOLUME = 32; // de 0 a 100 (estava a 70: a pedido, mais baixinho)
  const Music = (() => {
    const list = (C.musicas || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'en', { sensitivity: 'base' })); // ordem alfabética
    const iniciar = () => { const k = typeof C.musicaInicial === 'string' ? list.findIndex((t) => t.nome === C.musicaInicial) : C.musicaInicial; return k >= 0 ? k : 0; };
    let vol = VOLUME; try { const v = parseInt(localStorage.getItem('musica-volume'), 10); if (v >= 0 && v <= 100) vol = v; } catch (e) { /* */ }
    const online = /^https?:/.test(location.protocol);
    const btn = $('#music'), panel = $('#music-panel'), label = $('.music__label');
    let cur = -1, yt = null, ytReady = false, audio = null, playing = false, pending = null, errors = 0;
    const PC_MUSICA = 'MX7FSAnRPug'; // Tame Impala, «Loser»: toca enquanto o computador está ligado
    let modoPc = false, pendPc = false, antes = null;
    if (!list.length) return { play() {}, start() {}, pcOn() {}, pcOff() {} };
    btn.hidden = false;
    panel.appendChild(el('p', 'music__head', 'O que está a tocar'));
    const vrow = el('label', 'music__vol'); vrow.append(el('span', '', 'volume'));
    const vr = el('input'); vr.type = 'range'; vr.min = '0'; vr.max = '100'; vr.step = '1'; vr.value = String(vol); vr.setAttribute('aria-label', 'Volume da música');
    const vn = el('output', '', vol + '%'); vrow.append(vr, vn); panel.appendChild(vrow);
    vr.addEventListener('input', () => {
      vol = +vr.value; vn.textContent = vol + '%';
      if (audio) audio.volume = vol / 100; if (yt && ytReady) yt.setVolume(vol);
      try { localStorage.setItem('musica-volume', String(vol)); } catch (e) { /* */ }
    });
    const tracks = el('div', 'music__tracks');
    list.forEach((t, i) => {
      const b = el('button', 'music__track', t.nome); b.type = 'button';
      b.addEventListener('click', () => (cur === i && playing ? pause() : play(i)));
      tracks.appendChild(b);
    });
    const holder = el('div', 'music__video'); const slot = el('div'); slot.id = 'yt-slot'; holder.appendChild(slot);
    panel.append(tracks, holder);
    const needsYT = list.some((t) => t.youtube);
    if (needsYT && !online) panel.appendChild(el('p', 'music__note', 'A música do YouTube só toca com a página online.'));
    function update() {
      [...tracks.children].forEach((b, i) => { b.classList.toggle('is-on', i === cur && playing); b.setAttribute('aria-pressed', String(i === cur && playing)); });
      btn.classList.toggle('is-playing', playing);
      label.textContent = playing ? 'a tocar' : 'música';
    }
    function pause() { if (audio) audio.pause(); if (yt && ytReady) yt.pauseVideo(); playing = false; update(); }
    function play(i) {
      const t = list[i]; if (!t) return;
      modoPc = false; pendPc = false;
      cur = i;
      if (t.ficheiro && !t.semFicheiro) { // primeiro o ficheiro local; se não existir, cai para o YouTube
        if (yt && ytReady) yt.pauseVideo();
        audio = audio || new Audio(); audio.loop = false; audio.volume = vol / 100;
        audio.onerror = () => { t.semFicheiro = true; if (t.youtube) play(i); else { playing = false; update(); } };
        audio.onended = () => play((cur + 1) % list.length);
        if (!audio.src.endsWith(encodeURI(t.ficheiro))) audio.src = t.ficheiro;
        audio.play().then(() => { playing = true; update(); }).catch(() => {});
      } else if (ytReady) { if (audio) audio.pause(); yt.loadVideoById(t.youtube); yt.setVolume(vol); }
      else pending = i;
      update();
    }
    if (needsYT && online) {
      window.onYouTubeIframeAPIReady = () => {
        const first = list[iniciar()] || list[0];
        yt = new YT.Player('yt-slot', {
          width: 240, height: 135, videoId: first.youtube || list.find((t) => t.youtube).youtube,
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => { ytReady = true; yt.setVolume(vol); if (pendPc) { pendPc = false; yt.loadVideoById(PC_MUSICA); } else if (pending !== null) { const p = pending; pending = null; play(p); } },
            onStateChange: (e) => {
              if (e.data === 1) { playing = true; errors = 0; yt.setVolume(vol); }
              else if (e.data === 2) playing = false;
              else if (e.data === 0) { if (modoPc) { yt.seekTo(0); yt.playVideo(); return; } play((cur + 1) % list.length); return; }
              update();
            },
            onError: () => { if (modoPc) return; if (++errors < list.length) play((cur + 1) % list.length); },
          },
        });
      };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      document.head.appendChild(s);
    }
    btn.addEventListener('click', () => { const open = panel.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#music, #music-panel')) { panel.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
    update();
    // o computador liga: as músicas param e dá a «Loser»; ao sair, volta o que estava a tocar
    function pcOn() {
      if (modoPc) return;
      antes = playing || pending !== null ? { i: cur >= 0 ? cur : iniciar() } : { i: cur >= 0 ? cur : iniciar(), mudo: !playing && pending === null };
      modoPc = true; pending = null; cur = -1;
      if (audio) audio.pause();
      if (ytReady) { yt.loadVideoById(PC_MUSICA); yt.setVolume(vol); } else pendPc = true;
      playing = true; update();
    }
    function pcOff() {
      if (!modoPc) return;
      modoPc = false; pendPc = false;
      if (yt && ytReady) yt.pauseVideo();
      playing = false; update();
      if (antes) play(antes.i);
    }
    return {
      play, pcOn, pcOff,
      start() { const i = iniciar(), t = list[i]; if (t && !t.ficheiro && t.youtube && ytReady) { cur = i; yt.playVideo(); update(); } else play(i); },
    };
  })();

  /* -------------------------------------------------------------- o céu */
  const ceuOk = !!(window.Ceu && safe('Céu', () => { Ceu.init($('#ceu')); return true; }));
  if (ceuOk) document.body.classList.add('has-ceu'); else { const c = $('#ceu'); if (c) c.remove(); }
  const lockCeu = (scene, ascii = 0, ms) => { if (ceuOk && Ceu.lock && scene) Ceu.lock(scene, ascii, ms ? { ms } : undefined); };
  lockCeu('aurora', 0);

  // os ficheiros de texto trazem formatos simples; aqui passam para o que cada módulo espera
  function prepararConteudo() {
    const pags = (C.livro && C.livro.paginas) || [];
    pags.forEach((p) => {
      // ficheiro com título: a primeira linha é o título, depois uma linha vazia e o texto
      if (typeof p.t === 'string') {
        const m = p.t.match(/^([^\n]*)\n\s*\n([\s\S]*)$/);
        if (m) { p.titulo = p.titulo || m[1].trim(); p.texto = m[2].trim(); } else p.texto = p.t;
        delete p.t;
      }
      // ementa: «Nome: nota»
      if (p.tipo === 'ementa' && Array.isArray(p.itens)) {
        p.itens = p.itens.map((s) => { if (typeof s !== 'string') return s; const i = s.indexOf(':'); return i > 0 ? { nome: s.slice(0, i).trim(), nota: s.slice(i + 1).trim() } : { nome: s, nota: '' }; });
      }
    });
    // o índice aponta para a página de cada secção
    pags.filter((p) => p.tipo === 'indice').forEach((ix) => (ix.secoes || []).forEach((s) => {
      if (s.pagina == null) s.pagina = pags.findIndex((p) => p.tipo === 'secao' && p.numero === s.numero);
    }));
    // o teu poema não tem autor: assina o Diogo
    if (C.livro) C.livro.assinatura = C.livro.assinatura || (C.alcunhas && C.alcunhas.dele) || C.ele;
    const comp = C.computador || { blocos: [] }, msgs = Array.isArray(comp.mensagens) ? comp.mensagens : [];
    comp.blocos.forEach((b) => {
      // terminal: «>>> comando» ou uma linha de resposta
      if (b.tipo === 'terminal' && typeof b.linhas === 'string') {
        b.linhas = b.linhas.split('\n').filter((l) => l.trim()).map((l) => {
          if (/^\s*>>>/.test(l)) return { cmd: l.trim() };
          const tom = /erro|error/i.test(l) ? 'erro' : /aviso|\[aviso\]/i.test(l) ? 'aviso' : /amo-te|apaixonado/i.test(l) ? 'rosa' : 'ok';
          return { out: l.trim(), tom };
        });
      }
      if (b.tipo === 'mensagem' && b.n != null) b.texto = msgs[b.n] || '';
    });
    // sem as «notas» soltas: só ficam as mensagens com título (Olá, Conclusão)
    comp.blocos = comp.blocos.filter((b) => !(b.tipo === 'mensagem' && (!b.texto || !b.titulo)));
  }

  const pronto = (async () => {
    await resolverTextos(C);
    prepararConteudo();
  })().catch((e) => console.error('Erro a montar a página:', e));

  /* ------------------------------------------------------------- a mesa */
  // a primeira coisa que se vê: a mesa no meio da natureza, com o livro e o computador antigo
  let fase = 'mesa', livro = null, pc = null, musicaComecou = false;
  const comecarMusica = () => { if (!musicaComecou) { musicaComecou = true; safe('Música', () => Music.start()); } };
  const setFase = (f) => {
    fase = f;
    document.body.classList.toggle('is-mesa', f === 'mesa');
    document.body.classList.toggle('is-livro', f === 'livro');
    document.body.classList.toggle('is-pc', f === 'pc');
  };
  setFase('mesa');

  let mesa = null;
  pronto.then(() => {
    const P = C.porta || {};
    if (!window.Mesa) { console.error('A mesa não carregou (js/mesa.js).'); return; }
    mesa = safe('Mesa', () => Mesa.mount($('#mesa'), {
      capa: { para: P.para, subtitulo: P.subtitulo, ano: P.ano || 'MMXXVI', nota: P.nota, botao: P.botao },
      sticker: P.sticker || 'não cliques',
      onLivro: abrirLivro,
      onPc: abrirPc,
    }));
  });

  /* ------------------------------------------------------------ o livro */
  function abrirLivro() {
    if (fase === 'livro') return;
    comecarMusica();
    visto.livro = true;
    setFase('livro');
    if (mesa) mesa.esconder(true);
    $('#pousar').hidden = false;
    const stage = $('#livro-stage');
    if (livro) return;
    if (!window.Livro) { stage.appendChild(el('p', 'livro-erro', 'O livro não carregou (js/livro.js).')); return; }
    livro = safe('Livro', () => Livro.mount(stage, C.livro.paginas, {
      photos: PHOTOS,
      titulo: (C.porta && C.porta.subtitulo) || '',
      capa: { para: (C.porta || {}).para, subtitulo: (C.porta || {}).subtitulo, ano: (C.porta || {}).ano || 'MMXXVI' },
      assinatura: C.livro.assinatura, exLibris: C.ele + ' e ' + C.ela,
      onCeu: (scene) => { if (fase === 'livro') lockCeu(scene || 'aurora', 0); },
      onAcao: (nome, pagina) => {
        if (nome === 'viagem' && window.Viagem) safe('Viagem', () => Viagem.open(C.viagem));
        else if (nome === 'xadrez' && window.Xadrez) safe('Xadrez', () => (Xadrez.open ? Xadrez.open(C.xadrez) : null));
        else if (nome === 'musica') Music.play(pagina && pagina.musica != null ? pagina.musica : 0);
      },
      // o rabisco «não cliques» (ou a última página): pousa o livro e vai ao computador
      onFim: async () => { await pousarLivro(); if (mesa && mesa.irAoPc) mesa.irAoPc(); },
    }));
  }
  async function pousarLivro() {
    if (fase !== 'livro') return;
    $('#pousar').hidden = true;
    if (livro && livro.destroy) safe('Livro', () => livro.destroy());
    livro = null;
    $('#livro-stage').textContent = '';
    setFase('mesa');
    lockCeu('aurora', 0);
    if (mesa) { mesa.esconder(false); await mesa.pousarLivro(); }
    talvezChave();
  }
  $('#pousar').addEventListener('click', pousarLivro);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fase === 'livro' && !document.querySelector('[aria-modal="true"]:not([hidden])')) pousarLivro();
  });

  /* ------------------------------------------------- o computador antigo */
  function abrirPc() {
    if (fase === 'pc') return;
    comecarMusica();
    safe('Música do PC', () => Music.pcOn());
    visto.pc = true;
    setFase('pc');
    if (!window.Pc) { console.error('O computador não carregou (js/pc.js).'); sairDoPc(); return; }
    pc = safe('PC', () => Pc.open({
      clips: window.ASCII_CLIPS || {},
      blog: { ela: C.ela, ele: C.ele, alcunhas: C.alcunhas, inicio: C.inicio, computador: C.computador, fim: C.fim, mapa: C.mapa, fotos: PHOTOS },
      onSair: sairDoPc,
    }));
  }
  async function sairDoPc() {
    pc = null;
    safe('Música', () => Music.pcOff());
    setFase('mesa');
    if (mesa) await mesa.sairDoPc();
    talvezChave();
  }

  /* -------------------------------------------------- o final: a chave */
  // depois de entrarem no livro e no computador, quando voltam à mesa aparece a chave dourada, e fica lá
  const visto = { livro: false, pc: false };
  let chaveMostrada = false;
  function talvezChave(forcar) {
    if (chaveMostrada || !window.Final || fase !== 'mesa') return;
    if (!forcar && !(visto.livro && visto.pc)) return;
    chaveMostrada = true;
    setTimeout(() => {
      if (fase !== 'mesa') { chaveMostrada = false; return; }
      Final.chave({
        onAbrir: () => setTimeout(() => Final.desafio({
          titulo: (C.desafio || {}).titulo, texto: (C.desafio || {}).texto, quadros: (C.desafio || {}).quadros,
        }), 1100),
      });
    }, 1400);
  }
  // para testar: abre a página com #chave no fim do endereço
  if (/chave/.test(location.hash)) pronto.then(() => setTimeout(() => talvezChave(true), 2500));

  /* ---------------------------------------------------- segredos da casa */
  const toast = el('p', 'toast'); toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  function spiderSense() {
    toast.textContent = 'Sentido de aranha: alguém aqui é muito amada.';
    document.body.classList.add('spider-sense');
    setTimeout(() => document.body.classList.remove('spider-sense'), 2600);
  }
  let typed = '';
  window.addEventListener('keydown', (e) => { typed = (typed + (e.key || '')).slice(-6).toLowerCase(); if (typed === 'aranha') spiderSense(); });
  console.log('%c🕷️ Do teu Homem-Aranha favorito.', 'font-size:16px;color:#c8506b');
  console.log('%c>>> modelo.prever("amanhã")\namo-te  (confiança: 100%)', 'font-family:monospace;color:#2a4f9e');
})();
