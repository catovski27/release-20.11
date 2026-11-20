/* ==========================================================================
   O FINAL — depois de ela ter visto o livro e o computador, aparece uma chave
   dourada em cima da mesa. Ao clicar: as folhas levantam voo e abre-se o
   desafio, com dois quadros para os retratos (ela a pintá-lo, ele a pintá-la).

   Final.chave({ onAbrir })  -> mostra a chave
   Final.desafio(cfg)        -> cfg = { titulo, texto, quadros:[{legenda, imagem}], fechar }
   As imagens dos quadros põem-se em assets/desafio/ e o caminho em js/content.js (desafio.quadros).
   ========================================================================== */
(function () {
  'use strict';
  const reduz = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

  /* A chave dourada, pintada como os objetos da mesa (js/mesa.js): filtro de aguarela (contorno a tremer + grão de papel),
     ouro suave em dois tons, brilho cor de creme, sombra desfocada e uma gema em coração rosa (a cor da caneca).
     Desenhada deitada (arco à esquerda, dentes à direita). */
  const FORMA = '<circle cx="46" cy="45" r="26"/><circle cx="46" cy="15" r="11"/><circle cx="46" cy="75" r="11"/><circle cx="14" cy="45" r="11"/><circle cx="77" cy="45" r="9"/>' +
    '<rect x="74" y="41" width="130" height="8" rx="4"/><rect x="84" y="35" width="8" height="20" rx="3"/><rect x="98" y="38" width="6" height="14" rx="2.5"/><rect x="112" y="35" width="8" height="20" rx="3"/>' +
    '<path d="M168 48V69H175V61H182V71H189V59H196V67H203V48Z"/><circle cx="205" cy="45" r="5"/>';
  const CHAVE_SVG = '<svg viewBox="0 0 220 90" aria-hidden="true" focusable="false" overflow="visible">' +
    '<defs>' +
    '<linearGradient id="fk-ouro" gradientUnits="userSpaceOnUse" x1="20" y1="4" x2="130" y2="88"><stop offset="0" stop-color="#f8e6a8"/><stop offset=".38" stop-color="#e9c46c"/><stop offset=".72" stop-color="#c99743"/><stop offset="1" stop-color="#e3bb62"/></linearGradient>' +
    '<filter id="fk-aq" filterUnits="userSpaceOnUse" x="-12" y="-12" width="244" height="114" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="g"/>' +
      '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.84  0 0 0 0 0.86  0 0 0 0 1" result="gc"/>' +
      '<feColorMatrix in="g" type="luminanceToAlpha" result="ga"/>' +
      '<feComposite in="gc" in2="ga" operator="in" result="g2"/><feComposite in="g2" in2="d" operator="in" result="g3"/>' +
      '<feBlend in="g3" in2="d" mode="multiply" result="b"/><feComposite in="b" in2="d" operator="in"/></filter>' +
    '<filter id="fk-bs" filterUnits="userSpaceOnUse" x="-30" y="-30" width="290" height="150"><feGaussianBlur stdDeviation="4"/></filter>' +
    '<g id="fk-forma">' + FORMA + '</g></defs>' +
    /* sombra pousada na mesa */
    '<g filter="url(#fk-bs)" opacity=".34" transform="translate(5 11)" fill="#2d2440" stroke="#2d2440" stroke-width="4" stroke-linejoin="round"><use href="#fk-forma"/></g>' +
    '<g filter="url(#fk-aq)">' +
      /* contorno quente e depois o ouro por cima (assim só se vê o contorno exterior) */
      '<use href="#fk-forma" fill="#8f5f2b" stroke="#8f5f2b" stroke-width="4.2" stroke-linejoin="round"/>' +
      '<use href="#fk-forma" fill="url(#fk-ouro)"/>' +
      /* arco: recesso, filigrana, gema em coração */
      '<circle cx="46" cy="45" r="18" fill="#c58f3f"/><circle cx="46" cy="45" r="16" fill="#e2b960" stroke="#a9763a" stroke-width="1.2"/>' +
      '<circle cx="46" cy="45" r="21.8" fill="none" stroke="#a9763a" stroke-width="1.3" stroke-dasharray="2 3.2" opacity=".75"/>' +
      '<path d="M46 57C32 49 34 36 41 36C44 36 46 38.5 46 41C46 38.5 48 36 51 36C58 36 60 49 46 57Z" fill="#e7aeaf" stroke="#a8686f" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M46 57C57 51 61 42 56 37C56 46 52 52 46 57Z" fill="#c88589" opacity=".6"/>' +
      '<path d="M39.5 41Q40.5 38.8 43 38.6" stroke="#fff4e4" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".95"/>' +
      '<g fill="#fdf0c8" stroke="#a9763a" stroke-width=".9"><circle cx="46" cy="15" r="3.4"/><circle cx="46" cy="75" r="3.4"/><circle cx="14" cy="45" r="3.4"/></g>' +
      /* haste: brilho em cima, sombra em baixo, losangos gravados */
      '<path d="M80 42.6H200" stroke="#fff6dc" stroke-width="1.5" stroke-linecap="round" opacity=".9"/><path d="M80 48H200" stroke="#9a6a30" stroke-width="1.1" opacity=".5"/>' +
      '<path d="M87.5 38V52M101 40V50M115.5 38V52" stroke="#fff6dc" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>' +
      '<path d="M132 45l3.2-2.4 3.2 2.4-3.2 2.4zM144 45l3.2-2.4 3.2 2.4-3.2 2.4zM156 45l3.2-2.4 3.2 2.4-3.2 2.4z" fill="#a9763a" opacity=".75"/>' +
      '<path d="M170 50V67M177 63V68M184 61V69M191 61V65M198 50V65" stroke="#fff6dc" stroke-width="1" opacity=".55"/><path d="M168 69H203" stroke="#9a6a30" stroke-width="1.1" opacity=".5"/>' +
      /* luz no arco e nos lóbulos */
      '<path d="M26.5 33Q33 22.5 45 20" stroke="#fff6dc" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".85"/>' +
      '<path d="M7 40Q8 36 12 34M40 9Q43 7 47 7" stroke="#fff6dc" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".75"/>' +
    '</g></svg>';

  const FOLHA = (cor) => '<svg viewBox="0 0 30 40" width="100%" height="100%" aria-hidden="true"><path d="M15 2C26 12 28 28 15 38C2 28 4 12 15 2Z" fill="' + cor + '"/><path d="M15 6V36" stroke="rgba(0,0,0,.25)" stroke-width="1" fill="none"/></svg>';
  const CORES = ['#5f8f6a', '#79a47c', '#4a7a63', '#9bbf86', '#e59ab0', '#f3c2d0', '#f0d27a', '#b8a6e8'];

  /* as folhas levantam voo: nascem em baixo (a relva) e sobem com o vento */
  function folhas(n) {
    if (!n) return null;
    const camada = el('div', 'fn-folhas'); camada.setAttribute('aria-hidden', 'true');
    document.body.appendChild(camada);
    const W = window.innerWidth, H = window.innerHeight;
    let fim = 0;
    for (let i = 0; i < n; i++) {
      const f = el('div', 'fn-folha');
      const s = 14 + Math.random() * 30;
      f.style.width = s + 'px'; f.style.height = (s * 1.33) + 'px';
      f.style.left = (Math.random() * W) + 'px'; f.style.top = (H * (0.72 + Math.random() * 0.3)) + 'px';
      f.innerHTML = FOLHA(CORES[(Math.random() * CORES.length) | 0]);
      camada.appendChild(f);
      const dx = 160 + Math.random() * 520, dy = -(H * (0.9 + Math.random() * 0.7));
      const dur = 3200 + Math.random() * 3800, delay = Math.random() * 1500, r = (Math.random() - 0.5) * 900;
      f.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.1 },
        { transform: 'translate(' + (dx * 0.35) + 'px, ' + (dy * 0.4) + 'px) rotate(' + (r * 0.4) + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + (dx * 0.7) + 'px, ' + (dy * 0.75 + 30) + 'px) rotate(' + (r * 0.75) + 'deg)', opacity: 1, offset: 0.8 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + r + 'deg)', opacity: 0, offset: 1 },
      ], { duration: dur, delay: delay, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'both' });
      fim = Math.max(fim, dur + delay);
    }
    setTimeout(() => camada.remove(), fim + 300);
    return camada;
  }

  function chave(cfg) {
    cfg = cfg || {};
    if (document.querySelector('.fn-chave')) return;
    const b = el('button', 'fn-chave'); b.type = 'button';
    b.setAttribute('aria-label', 'Uma chave dourada pousada na mesa. Clica para a rodar.');
    b.innerHTML = '<span class="fn-chave__cai"><span class="fn-chave__halo"></span>' +
      '<span class="fn-chave__giro"><span class="fn-chave__svg">' + CHAVE_SVG + '</span></span>' +
      '<i class="fn-chave__b fn-chave__b--a">✦</i><i class="fn-chave__b fn-chave__b--b">✦</i><i class="fn-chave__b fn-chave__b--c">✦</i></span>';
    document.body.appendChild(b);
    // ancorada ao vaso (a mesa tem a sua própria escala): fica à esquerda do livro, por baixo do vaso
    const pos = () => {
      const j = document.querySelector('.mesa-jarra');
      const r = j && j.getBoundingClientRect();
      if (!r || !r.width) return;
      const w = Math.round(r.width * 0.95);
      b.style.width = w + 'px';
      b.style.left = Math.max(w / 2 + 6, r.left + r.width * 0.3) + 'px';
      b.style.top = Math.round(r.bottom + r.height * 0.22) + 'px';
    };
    pos();
    window.addEventListener('resize', () => { pos(); setTimeout(pos, 150); setTimeout(pos, 700); });
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('is-on')));
    // a chave fica na mesa: pode clicar-se as vezes que quiserem (brilha, e aparece o desafio)
    let aberta = false;
    b.addEventListener('click', () => {
      if (aberta) return;
      aberta = true;
      b.classList.remove('is-clica'); void b.offsetWidth; b.classList.add('is-clica');
      folhas(reduz() ? 0 : 70);
      setTimeout(() => { if (typeof cfg.onAbrir === 'function') cfg.onAbrir(); }, reduz() ? 0 : 900);
      setTimeout(() => { b.classList.remove('is-clica'); aberta = false; }, 4200);
    });
  }

  function desafio(cfg) {
    cfg = cfg || {};
    const root = el('section', 'fn-desafio');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', cfg.titulo || 'O desafio');
    const cx = el('div', 'fn-desafio__cx');
    cx.appendChild(el('p', 'fn-desafio__sobre', 'um desafio para os dois'));
    cx.appendChild(el('h2', 'fn-desafio__tit', cfg.titulo || 'O nosso desafio'));
    if (cfg.texto) cx.appendChild(el('p', 'fn-desafio__txt', cfg.texto));
    const par = el('div', 'fn-desafio__par');
    const quadros = cfg.quadros || [];
    const vazio = (m) => { m.classList.add('is-vazio'); m.appendChild(el('span', 'fn-quadro__vazio', 'aqui vai o desenho')); };
    quadros.forEach((q, i) => {
      const fig = el('figure', 'fn-quadro');
      const moldura = el('div', 'fn-quadro__moldura');
      if (q.imagem) {
        const im = new Image(); im.alt = q.legenda || ''; im.decoding = 'async';
        im.addEventListener('error', () => { im.remove(); vazio(moldura); });
        im.src = q.imagem; moldura.appendChild(im);
      } else vazio(moldura);
      fig.append(el('i', 'fn-quadro__fita'), moldura, el('figcaption', '', q.legenda || ''));
      par.appendChild(fig);
      if (i === 0 && quadros.length > 1) par.appendChild(el('span', 'fn-desafio__e', '♥'));
    });
    cx.appendChild(par);
    const fechar = el('button', 'fn-desafio__fechar', 'voltar à mesa'); fechar.type = 'button';
    cx.appendChild(fechar);
    root.appendChild(cx);
    document.body.appendChild(root);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-on')));
    const onKey = (e) => { if (e.key === 'Escape') sair(); };
    const sair = () => {
      root.classList.remove('is-on'); document.removeEventListener('keydown', onKey);
      setTimeout(() => { root.remove(); if (typeof cfg.fechar === 'function') cfg.fechar(); }, 600);
    };
    document.addEventListener('keydown', onKey);
    fechar.addEventListener('click', sair);
    try { fechar.focus({ preventScroll: true }); } catch (e) { /* */ }
  }

  window.Final = { chave: chave, desafio: desafio, folhas: folhas };
})();
