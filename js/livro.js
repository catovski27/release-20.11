/* ==========================================================================
   O LIVRO: um livro a sério, de folhear para o lado, pousado sobre a paisagem.
   Usa St.PageFlip (vendor/page-flip.browser.js, MIT) para a curvatura da folha.

   Uso:  const livro = Livro.mount(container, paginas, {
           photos: window.PHOTOS, base: '',          // base: prefixo dos src das fotos
           titulo: 'Quatro anos de nós',             // cabeçalho corrido (opcional)
           assinatura: 'Diogo', exLibris: 'Catarina',
           onCeu(cena) {}, onAcao(nome, pagina) {}, onFim() {},
         });
         livro.goTo(i) / next() / prev() / destroy() / paginaAtual
   i = índice no array `paginas` (não no número da folha impressa).
   ========================================================================== */
(function () {
  'use strict';

  const PH = /^\s*✏️\s*/;
  const isPh = (s) => typeof s === 'string' && PH.test(s);
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) setText(e, text);
    return e;
  }
  function setText(e, text) {
    if (isPh(text)) { e.classList.add('ph'); e.textContent = text.replace(PH, ''); }
    else e.textContent = text == null ? '' : String(text);
    return e;
  }
  function svg(markup, cls) {
    const t = document.createElement('div');
    t.innerHTML = '<svg xmlns="' + SVGNS + '" ' + markup + '</svg>';
    const s = t.firstChild;
    if (cls) s.setAttribute('class', cls);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    return s;
  }
  const paras = (t) => (t == null ? [] : String(t).replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean));
  function roman(n) {
    if (typeof n !== 'number') { const k = parseInt(n, 10); if (isNaN(k)) return n == null ? '' : String(n); n = k; }
    const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* traço à mão: um caminho com tremura, a partir de pontos */
  function wobble(pts, r, amp) {
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2 + (r() - 0.5) * amp; const cy = (y0 + y1) / 2 + (r() - 0.5) * amp;
      d += ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    return d;
  }

  /* ---------------------------------------------------------------- o rabisco */
  function rabisco(texto, seed, onFim) {
    const b = el('button', 'lv-rabisco');
    b.type = 'button';
    const r = rng(seed || 7);
    // sublinhado em dois traços, como quem risca depressa
    const u1 = []; const u2 = [];
    for (let i = 0; i <= 8; i++) { u1.push([4 + i * 24, 14 + Math.sin(i * 1.3) * 2.2 + (r() - 0.5) * 2]); u2.push([10 + i * 23, 19 + Math.sin(i * 1.7 + 1) * 2 + (r() - 0.5) * 2]); }
    const under = svg('class="lv-rabisco__sub" viewBox="0 0 200 26" preserveAspectRatio="none"><path d="' + wobble(u1, r, 3) + '"/><path d="' + wobble(u2, r, 4) + '" opacity=".7"/>');
    // a seta: uma curva com laçada, a apontar para o texto
    const arrow = svg('class="lv-rabisco__seta" viewBox="0 0 90 70"><path d="M8 8 C 30 4, 52 14, 44 30 C 38 42, 22 34, 32 24 C 44 12, 64 30, 74 54"/><path d="M62 50 L75 56 L76 41"/>');
    const t = el('span', 'lv-rabisco__txt', texto || 'não cliques aqui');
    b.append(arrow, t, under);
    b.setAttribute('aria-label', (texto || 'não cliques aqui'));
    b.addEventListener('click', (e) => { e.preventDefault(); onFim(); });
    return b;
  }

  /* ---------------------------------------------------------------- ornamentos */
  const orn = (cls) => el('p', 'lv-orn' + (cls ? ' ' + cls : ''), '❦');
  function filete() {
    return svg('class="lv-filete" viewBox="0 0 220 14"><path d="M4 7 H96"/><path d="M124 7 H216"/><path d="M110 1 L116 7 L110 13 L104 7 Z"/><circle cx="99" cy="7" r="1.6"/><circle cx="121" cy="7" r="1.6"/>');
  }

  /* ---------------------------------------------------------------- ilustrações */
  // Portugal (gerado a partir do Natural Earth, ver tools/build_portugal.py), preenchido com a bandeira
  const PT_PATH = 'M171.8 394.8L170.3 394.6L168.9 394.2L166.2 394.3L164.8 394.8L157.5 399.1L157.0 399.8L147.5 405.8L145.4 407.6L142.2 407.0L138.4 406.9L137.2 406.5L136.7 407.3L134.6 406.5L135.3 407.4L135.5 408.5L134.1 406.6L131.9 404.7L127.3 402.4L124.8 401.8L122.8 401.0L115.6 401.8L111.1 400.3L109.2 401.1L106.5 401.4L103.6 400.6L100.3 398.8L97.6 398.3L93.7 398.8L90.9 401.4L87.0 401.4L83.8 402.9L81.4 403.3L80.0 404.5L78.8 404.1L77.2 405.5L74.6 407.0L73.6 406.7L72.2 405.5L71.3 406.0L72.1 402.9L74.8 398.7L76.6 394.9L76.0 392.7L78.7 390.3L79.5 387.0L78.5 384.5L79.5 382.7L81.3 380.8L81.7 379.0L82.7 376.5L83.9 371.2L84.1 367.9L83.7 366.1L82.2 363.9L82.1 363.0L83.8 355.8L86.4 355.1L86.8 353.3L84.8 353.9L83.2 353.9L82.7 352.6L83.9 344.9L83.8 342.4L83.4 340.6L82.4 338.8L80.4 338.4L77.8 336.8L79.5 335.3L82.7 328.7L83.9 323.5L85.4 319.5L84.7 310.8L84.1 306.7L82.4 303.7L78.8 300.0L76.5 298.3L74.8 297.7L75.8 296.7L77.2 297.3L79.5 299.1L83.8 300.8L86.5 301.7L92.7 303.2L95.9 302.3L92.4 301.8L87.8 299.8L87.2 299.2L86.7 297.1L87.2 295.5L87.7 294.6L86.8 294.3L86.2 293.4L86.0 292.4L86.4 291.6L84.2 293.7L82.9 294.1L84.3 294.8L85.0 295.9L85.0 297.1L81.7 297.2L79.5 296.1L77.1 295.4L74.0 295.9L71.2 298.9L68.1 300.6L62.0 301.4L59.7 302.5L58.6 302.8L56.6 302.3L56.6 300.9L59.2 298.3L59.6 296.0L59.6 292.4L58.1 289.1L56.2 286.2L55.3 284.0L56.5 283.4L62.1 282.8L63.4 283.6L64.0 284.5L64.0 283.0L64.9 282.4L67.9 281.9L69.9 279.4L74.8 275.8L73.4 272.9L73.1 271.4L73.5 270.2L72.1 270.4L71.4 269.1L70.4 265.6L73.1 260.3L74.8 258.0L77.0 256.5L80.9 256.0L82.1 255.5L84.4 253.9L85.3 253.0L86.0 251.9L81.5 254.9L76.0 255.5L75.2 256.1L74.0 258.3L70.9 262.3L67.5 268.7L64.9 271.8L64.4 273.0L65.0 278.6L64.1 280.4L60.9 281.3L57.3 281.9L53.2 281.5L50.9 283.6L48.5 282.2L45.7 281.1L44.2 280.9L41.5 281.3L40.2 280.8L40.3 279.3L40.7 278.1L39.9 274.9L39.9 273.2L42.6 270.3L44.6 264.3L44.4 259.7L43.7 257.0L44.3 255.3L44.6 253.3L47.0 249.2L49.1 244.5L49.7 239.3L48.9 235.7L48.2 234.2L45.4 231.3L49.0 231.8L54.8 228.1L56.1 228.0L56.8 228.9L58.2 228.4L57.7 227.3L56.7 226.4L59.7 222.6L62.6 220.9L65.5 216.2L65.5 213.4L66.3 211.5L66.6 208.7L71.6 196.6L79.5 175.7L80.4 174.6L81.1 175.6L82.2 176.0L84.7 176.1L82.7 174.0L78.8 173.4L77.7 172.7L77.0 171.7L77.0 170.0L77.7 168.0L79.7 164.5L83.8 149.8L84.7 145.1L85.9 141.7L86.7 137.4L87.2 139.0L88.5 137.1L89.4 136.5L90.7 136.9L90.1 135.4L90.9 134.6L91.8 135.5L93.7 133.5L92.7 132.9L92.2 132.0L96.1 130.3L98.0 128.9L97.0 128.9L93.8 130.0L92.1 129.5L91.6 128.9L91.1 126.9L93.4 123.8L92.9 122.3L92.7 123.4L92.4 124.5L91.6 123.8L90.7 125.3L90.0 127.2L89.2 132.3L87.7 135.7L86.8 136.5L92.9 111.2L92.9 108.4L92.1 103.5L92.2 100.9L93.3 99.8L90.9 99.0L89.7 96.9L88.9 94.3L87.7 92.2L88.0 91.2L87.2 88.7L87.3 86.4L86.5 85.4L86.0 84.0L85.1 82.6L84.8 81.5L84.6 78.5L85.3 76.0L84.6 74.3L84.1 70.5L83.3 68.2L82.6 65.3L82.5 64.0L81.9 62.7L81.8 60.9L83.4 59.6L87.3 59.0L88.4 58.6L90.3 57.2L81.9 59.2L79.9 58.5L78.7 56.1L78.7 53.9L79.2 50.6L78.8 48.5L79.5 47.0L86.8 38.9L91.9 36.5L93.0 34.2L94.6 32.8L98.0 32.5L102.6 30.4L112.2 29.0L115.5 26.9L118.2 26.3L120.1 25.1L121.2 27.0L121.2 31.4L122.1 31.9L125.4 31.1L127.6 32.4L128.1 33.5L127.3 35.7L122.6 39.1L119.6 43.6L119.5 45.0L120.2 46.3L122.9 47.7L122.8 50.6L128.2 50.9L131.0 50.2L134.5 46.6L137.5 46.4L138.7 43.4L140.0 42.9L140.6 47.1L142.6 47.1L143.5 45.8L151.6 44.0L155.4 45.8L158.8 46.0L157.8 48.3L158.9 49.5L162.6 49.0L164.5 46.6L167.5 47.5L169.1 50.9L172.3 48.3L176.7 48.1L183.2 45.5L184.5 43.9L184.4 39.2L187.9 37.5L193.8 40.9L197.5 39.1L200.4 40.8L206.1 40.8L207.6 40.0L208.0 37.7L209.9 38.0L212.2 41.2L214.1 41.7L220.7 40.9L221.6 39.4L223.9 40.8L223.6 45.2L226.9 46.4L223.6 55.8L225.0 60.7L225.8 61.9L228.2 62.3L230.9 60.5L236.9 61.5L242.8 64.2L246.9 68.5L242.3 73.9L242.1 76.2L239.7 80.3L236.0 81.3L236.0 82.8L234.7 82.8L232.8 85.6L228.7 88.9L224.5 90.6L219.2 90.9L215.4 96.4L212.4 99.0L211.8 102.7L209.3 106.0L206.7 106.9L202.8 106.6L201.5 107.2L200.6 109.6L204.2 114.5L206.1 119.1L208.2 120.4L208.5 121.4L208.3 122.3L207.2 122.6L207.1 128.7L208.7 136.9L206.4 141.8L206.5 143.0L208.7 146.7L206.0 152.2L206.3 154.5L209.9 158.5L208.8 160.3L205.2 163.0L204.6 165.3L203.5 166.0L199.8 166.2L196.0 168.2L194.3 171.5L196.0 176.1L199.7 177.3L204.5 184.3L203.1 186.7L202.6 190.0L201.7 191.0L201.5 195.2L199.9 197.3L197.9 198.2L197.0 199.6L197.4 201.7L196.2 204.3L196.3 206.1L195.7 207.7L185.5 209.1L182.1 208.2L175.5 209.3L161.9 208.7L164.5 215.1L168.6 219.2L170.7 220.3L171.9 222.5L176.8 224.5L177.2 225.2L176.1 230.6L176.4 233.8L181.2 239.0L180.4 240.5L180.7 243.5L181.6 244.6L186.4 246.5L187.2 247.9L186.3 250.1L187.1 251.4L189.0 252.0L192.9 250.6L197.0 252.8L197.9 254.2L198.3 255.7L197.9 256.9L198.7 258.1L195.6 263.4L192.8 266.2L193.7 267.7L193.5 269.9L190.4 272.0L187.5 272.6L185.7 274.7L180.0 278.6L179.1 280.4L178.5 284.7L178.7 286.0L180.0 287.5L177.0 292.1L175.2 296.7L175.9 298.6L174.4 300.3L177.0 301.8L184.6 311.7L186.5 313.2L189.0 319.2L190.4 320.4L193.0 320.1L195.3 318.5L199.2 318.1L200.2 318.7L195.5 331.6L193.9 331.9L189.2 330.4L186.9 333.6L185.3 334.2L182.9 333.8L179.8 335.1L180.1 337.1L177.7 344.4L176.0 347.3L169.0 353.4L167.3 360.3L164.6 363.0L163.7 366.2L167.5 372.2L167.9 376.5L169.0 378.8L170.1 387.1L169.7 388.3L170.9 393.2Z';
  const ESP_PATH = 'M170.9 393.2L169.7 388.3L170.1 387.1L169.0 378.8L167.9 376.5L167.5 372.2L163.7 366.2L164.6 363.0L167.3 360.3L169.0 353.4L176.0 347.3L177.7 344.4L180.1 337.1L179.8 335.1L182.9 333.8L185.3 334.2L186.9 333.6L189.2 330.4L193.9 331.9L195.5 331.6L200.2 318.7L199.2 318.1L195.3 318.5L193.0 320.1L190.4 320.4L189.0 319.2L186.5 313.2L184.6 311.7L177.0 301.8L174.4 300.3L175.9 298.6L175.2 296.7L177.0 292.1L180.0 287.5L178.7 286.0L178.5 284.7L179.1 280.4L180.0 278.6L185.7 274.7L187.5 272.6L190.4 272.0L193.5 269.9L193.7 267.7L192.8 266.2L195.6 263.4L198.7 258.1L197.9 256.9L198.3 255.7L197.9 254.2L197.0 252.8L192.9 250.6L189.0 252.0L187.1 251.4L186.3 250.1L187.2 247.9L186.4 246.5L181.6 244.6L180.7 243.5L180.4 240.5L181.2 239.0L176.4 233.8L176.1 230.6L177.2 225.2L176.8 224.5L171.9 222.5L170.7 220.3L168.6 219.2L164.5 215.1L161.9 208.7L175.5 209.3L182.1 208.2L185.5 209.1L195.7 207.7L196.3 206.1L196.2 204.3L197.4 201.7L197.0 199.6L197.9 198.2L199.9 197.3L201.5 195.2L201.7 191.0L202.6 190.0L203.1 186.7L204.5 184.3L199.7 177.3L196.0 176.1L194.3 171.5L196.0 168.2L199.8 166.2L203.5 166.0L204.6 165.3L205.2 163.0L208.8 160.3L209.9 158.5L206.3 154.5L206.0 152.2L208.7 146.7L206.5 143.0L206.4 141.8L208.7 136.9L207.1 128.7L207.2 122.6L208.3 122.3L208.5 121.4L208.2 120.4L206.1 119.1L204.2 114.5L200.7 110.5L201.5 107.2L202.8 106.6L206.7 106.9L209.3 106.0L211.8 102.7L212.4 99.0L215.4 96.4L219.2 90.9L224.5 90.6L228.7 88.9L232.8 85.6L234.7 82.8L236.0 82.8L236.0 81.3L239.7 80.3L242.1 76.2L242.3 73.9L246.9 68.5L242.8 64.2L236.9 61.5L230.9 60.5L228.2 62.3L225.8 61.9L225.0 60.7L223.6 55.8L226.9 46.4L223.6 45.2L223.9 40.8L221.6 39.4L220.7 40.9L214.1 41.7L212.2 41.2L209.9 38.0L208.0 37.7L207.6 40.0L206.1 40.8L200.4 40.8L197.5 39.1L193.8 40.9L187.9 37.5L184.4 39.2L184.5 43.9L183.2 45.5L176.7 48.1L172.3 48.3L169.1 50.9L167.5 47.5L164.5 46.6L162.6 49.0L158.9 49.5L157.9 49.0L158.8 46.0L155.4 45.8L151.6 44.0L143.5 45.8L142.6 47.1L140.6 47.1L140.0 42.9L138.7 43.4L137.5 46.4L134.5 46.6L131.0 50.2L128.2 50.9L122.8 50.6L122.9 47.7L120.2 46.3L119.5 45.0L119.6 43.6L122.6 39.1L127.3 35.7L128.1 33.5L127.6 32.4L125.4 31.1L122.1 31.9L121.2 31.4L121.2 27.0L120.1 25.1L118.2 26.3L115.5 26.9L112.2 29.0L102.6 30.4L98.0 32.5L94.6 32.8L93.0 34.2L91.9 36.5L86.8 38.9L290.0 12.0L290.0 411.3L170.9 411.3Z';
  function mapaSvg(seed) {
    const id = 'm' + seed;
    const pin = (n, x, y, dx, dy, a) => '<g class="m-pin"><circle class="m-pin__o" cx="' + x + '" cy="' + y + '" r="5.4"/><circle class="m-pin__i" cx="' + x + '" cy="' + y + '" r="2.3"/>' +
      '<text class="m-etiq" x="' + (x + dx) + '" y="' + (y + dy) + '" text-anchor="' + (a || 'start') + '">' + n + '</text></g>';
    return svg('class="lv-ilustra lv-ilustra--mapa lv-ilustra--pt" viewBox="0 0 300 440">' +
      '<defs>' +
      '<filter id="aq' + id + '" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="gr' + id + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 .5 -.12"/></filter>' +
      '<pattern id="az' + id + '" width="18" height="18" patternUnits="userSpaceOnUse"><g class="m-azulejo"><path d="M9 2.5 C11 5 13 7 15.5 9 C13 11 11 13 9 15.5 C7 13 5 11 2.5 9 C5 7 7 5 9 2.5Z"/><circle cx="9" cy="9" r="1.5"/><path d="M0 0h4M14 0h4M0 18h4M14 18h4" /></g></pattern>' +
      '<clipPath id="pc' + id + '"><path d="' + PT_PATH + '"/></clipPath>' +
      '<clipPath id="cx' + id + '"><rect x="10" y="12" width="280" height="416" rx="4"/></clipPath>' +
      '<linearGradient id="mar' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a4f9e" stop-opacity=".30"/><stop offset=".55" stop-color="#2a4f9e" stop-opacity=".10"/><stop offset="1" stop-color="#2a4f9e" stop-opacity=".04"/></linearGradient>' +
      '</defs>' +
      '<g clip-path="url(#cx' + id + ')">' +
        '<rect x="0" y="0" width="300" height="440" class="m-papel"/>' +
        '<rect x="0" y="0" width="300" height="440" fill="url(#az' + id + ')" opacity=".55"/>' +
        '<rect x="0" y="0" width="300" height="440" fill="url(#mar' + id + ')"/>' +
        '<g filter="url(#aq' + id + ')">' +
          '<path class="m-esp" d="' + ESP_PATH + '"/>' +
          '<g clip-path="url(#pc' + id + ')"><rect class="m-verde" x="0" y="0" width="121.5" height="440"/><rect class="m-verm" x="121.5" y="0" width="300" height="440"/></g>' +
        '</g>' +
        '<path class="m-costa m-costa--ext" d="' + PT_PATH + '"/><path class="m-costa" d="' + PT_PATH + '"/>' +
        '<rect x="0" y="0" width="300" height="440" filter="url(#gr' + id + ')" opacity=".5" style="mix-blend-mode:multiply"/>' +
      '</g>' +
      '<rect class="m-moldura" x="10" y="12" width="280" height="416" rx="4"/><rect class="m-moldura m-moldura--int" x="15" y="17" width="270" height="406" rx="2"/>' +
      // a esfera armilar (símbolo de Portugal) sobre o ponto onde a bandeira muda de cor
      '<g class="m-esfera" transform="translate(121.5 192.4)"><circle r="14"/><ellipse rx="6.5" ry="14"/><path d="M-14 0H14M-11.5 -7.5H11.5M-11.5 7.5H11.5"/><path class="m-escudo" d="M-5 -6H5V3Q5 8 0 10Q-5 8 -5 3Z"/></g>' +
      '<path id="rota' + id + '" class="m-rota" d="M62.4 279.9 C 60.4 349.9, 108.5 378.1, 138.5 406.1 L 156.1 397.9 C 196.1 405.9, 217.10000000000002 384.6, 261.1 378.6"/>' +
      '<g class="m-carro"><g transform="translate(-7 -4.5)"><path d="M1 7.5V5.2L3 2.6C3.4 2 4 1.7 4.7 1.7H9.4C10.2 1.7 10.8 2 11.2 2.6L13.2 5.2V7.5Z"/><circle cx="4" cy="8" r="1.7"/><circle cx="10.4" cy="8" r="1.7"/></g><animateMotion dur="9s" repeatCount="indefinite" rotate="0"><mpath href="#rota' + id + '"/></animateMotion></g>' +
      pin('Lisboa', 62.4, 279.9, -9, 4, 'end') + pin('Faro', 138.5, 406.1, -9, 12, 'end') + pin('Tavira', 156.1, 397.9, 9, 14, 'start') + pin('Sevilha', 261.1, 378.6, 0, -11, 'middle') +
      '<text class="m-nome m-nome--esp" x="240" y="132">Espanha</text><text class="m-nome m-nome--mar" x="38" y="150" transform="rotate(-72 38 150)">Atlântico</text>' +
      // a rosa dos ventos
      '<g class="m-rosa" transform="translate(248 318)"><circle r="19"/><circle r="13" class="m-rosa__f"/><path d="M0 -26 L4 0 L0 26 L-4 0Z"/><path d="M-26 0 L0 4 L26 0 L0 -4Z" opacity=".5"/><path class="m-rosa__n" d="M0 -26 L4 0 L-4 0Z"/><text y="-30" text-anchor="middle">N</text></g>' +
      // bandeirinha
      '<g class="m-mastro" transform="translate(218 168)"><path d="M0 0V50"/><g class="m-onda"><path class="m-verde" d="M0 2h15v24h-15z"/><path class="m-verm" d="M15 2h28v24h-28z"/><circle class="m-sol" cx="15" cy="14" r="5.4"/></g></g>' +
      '<g class="m-convite"><text class="m-clica" x="250" y="262">toca e viaja</text><path class="m-seta" d="M232 272 C 214 282, 206 298, 204 316"/><path class="m-seta" d="M198 306 L204 318 L212 308"/></g>');
  }
  function xadrezSvg(seed) {
    const r = rng(seed);
    let sq = '';
    const n = 6; const s = 20; const ox = 30; const oy = 54;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x + y) % 2) {
        let h = '';
        for (let k = -s; k < s; k += 3.2) h += 'M' + (ox + x * s + Math.max(0, k)).toFixed(1) + ' ' + (oy + y * s + Math.max(0, -k)).toFixed(1) + ' L' + (ox + x * s + Math.min(s, k + s)).toFixed(1) + ' ' + (oy + y * s + Math.min(s, s - k)).toFixed(1) + ' ';
        sq += '<path class="i-hach" d="' + h + '"/>';
      }
    }
    const borda = [[ox - 3, oy - 3], [ox + n * s + 3, oy - 3], [ox + n * s + 3, oy + n * s + 3], [ox - 3, oy + n * s + 3], [ox - 3, oy - 3]];
    // uma rainha e um cavalo, em traço
    const rainha = 'M86 104 h22 l-3 -6 h-16z M90 98 l-3 -24 l6 8 l4 -12 l4 12 l6 -8 l-3 24 M97 62 a3 3 0 1 0 0.1 0';
    const cavalo = 'M126 144 h22 l-2 -6 h-18z M130 138 c-2 -10 4 -12 2 -20 c-4 2 -8 0 -8 -4 c0 -6 10 -14 16 -16 l2 -4 l3 5 c6 4 6 18 2 39';
    return svg('class="lv-ilustra lv-ilustra--xadrez" viewBox="0 0 180 190">' + sq +
      '<path class="i-tinta" d="' + wobble(borda, r, 2.5) + '"/>' +
      '<path class="i-peca" d="' + rainha + '"/><path class="i-peca i-peca--escura" d="' + cavalo + '"/>' +
      '<path class="i-cor" d="M150 40 c-4 -6 -12 -2 -8 4 l8 8 l8 -8 c4 -6 -4 -10 -8 -4z"/>');
  }

  /* ---------------------------------------------------------------- a dança */
  function danca(box) {
    const c = el('canvas', 'lv-danca__tela');
    c.setAttribute('aria-hidden', 'true');
    box.appendChild(c);
    const ctx = c.getContext('2d');
    // a tela é para desenhar, não para virar a folha
    const stop = (e) => e.stopPropagation();
    c.addEventListener('mousedown', stop); c.addEventListener('touchstart', stop, { passive: true });
    const cores = ['200,80,107', '42,79,158', '212,174,92'];
    const N = 3; const LEN = 90;
    const trails = Array.from({ length: N }, () => []);
    let W = 0; let H = 0; let t = Math.random() * 100; let raf = 0; let on = false; let last = 0;
    const ptr = { x: 0.5, y: 0.5, k: 0 }; const cen = { x: 0.5, y: 0.55 };
    c.addEventListener('pointermove', (e) => { const b = c.getBoundingClientRect(); ptr.x = (e.clientX - b.left) / b.width; ptr.y = (e.clientY - b.top) / b.height; ptr.k = 1; });
    c.addEventListener('pointerleave', () => { ptr.k = 0; });
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = c.clientWidth; H = c.clientHeight;
      if (!W || !H) return false;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    // a bailarina: esqueleto em poses de ballet (arabesque, attitude, développé, passé) com membros afilados e tutu em camadas
    const A1 = { kn1: [0.02, 0.48], an1: [0.03, 0.94], to1: [0.04, 1.07] };
    const POSES = [
      Object.assign({ kn2: [-0.5, -0.02], an2: [-1.0, -0.2], to2: [-1.16, -0.27], sh: [0.2, -0.62], hd: [0.3, -0.83], el1: [0.56, -0.72], ha1: [0.97, -0.8], el2: [-0.12, -0.66], ha2: [-0.52, -0.56] }, A1), // arabesque
      Object.assign({ kn2: [-0.45, -0.22], an2: [-0.3, -0.66], to2: [-0.27, -0.78], sh: [0.1, -0.65], hd: [0.12, -0.87], el1: [0.42, -0.95], ha1: [0.14, -1.3], el2: [-0.2, -0.95], ha2: [0.08, -1.3] }, A1), // attitude, braços em quinta
      Object.assign({ kn2: [0.52, -0.12], an2: [1.02, -0.42], to2: [1.18, -0.5], sh: [0, -0.66], hd: [-0.03, -0.88], el1: [0.45, -0.8], ha1: [0.95, -0.7], el2: [-0.45, -0.8], ha2: [-0.95, -0.7] }, A1), // développé, braços em segunda
      Object.assign({ kn2: [0.42, 0.12], an2: [0.05, 0.38], to2: [0.04, 0.5], sh: [0.04, -0.66], hd: [0.05, -0.88], el1: [0.38, -0.98], ha1: [0.1, -1.32], el2: [-0.3, -0.98], ha2: [0.02, -1.32] }, A1), // passé
    ];
    const NOMES = ['kn1', 'an1', 'to1', 'kn2', 'an2', 'to2', 'sh', 'hd', 'el1', 'ha1', 'el2', 'ha2'];
    const smooth = (x) => x * x * (3 - 2 * x);
    function pose() {
      const S = Math.min(W / 2.5, H / 2.45);
      const hip = [cen.x * W + 0.08 * S, cen.y * H + 0.18 * S];
      const T = 2.3; const u = (t / T) % POSES.length; const i0 = Math.floor(u); const f = smooth(Math.min(1, Math.max(0, (u - i0) * 1.25)));
      const A = POSES[i0], B = POSES[(i0 + 1) % POSES.length];
      const P = { S, hip };
      NOMES.forEach((k) => { P[k] = [hip[0] + S * (A[k][0] + (B[k][0] - A[k][0]) * f), hip[1] + S * (A[k][1] + (B[k][1] - A[k][1]) * f)]; });
      P.base = [P.to1[0], P.to1[1] + 0.02 * S];
      return P;
    }
    function step(dt) {
      t += dt;
      const tx = 0.5 + 0.06 * Math.sin(t * 0.37); const ty = 0.5 + 0.015 * Math.sin(t * 0.74);
      const ax = ptr.k ? ptr.x : tx; const ay = ptr.k ? Math.min(0.56, Math.max(0.44, ptr.y)) : ty;
      cen.x += (ax - cen.x) * Math.min(1, dt * (ptr.k ? 2.2 : 1.2));
      cen.y += (ay - cen.y) * Math.min(1, dt * (ptr.k ? 2.2 : 1.2));
      if (!W || !H) return;
      const P = pose();
      [P.ha1, P.ha2, P.to2].forEach((q, i) => { trails[i].push([q[0], q[1]]); if (trails[i].length > LEN) trails[i].shift(); });
    }
    function ribbon(tr, col, wmax, phase) {
      const n = tr.length; if (n < 4) return;
      const L = []; const Rt = [];
      for (let i = 1; i < n; i++) {
        const [x0, y0] = tr[i - 1]; const [x1, y1] = tr[i];
        let nx = -(y1 - y0); let ny = x1 - x0; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const k = i / n; const w = wmax * Math.sin(Math.PI * Math.min(1, k * 0.95 + 0.05)) * (0.6 + 0.4 * Math.sin(phase + i * 0.12)) * k;
        L.push([x1 + nx * w, y1 + ny * w]); Rt.push([x1 - nx * w, y1 - ny * w]);
      }
      ctx.beginPath();
      ctx.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
      for (let i = Rt.length - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + col + ',0.28)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(tr[0][0], tr[0][1]);
      for (let i = 1; i < n - 1; i++) { const mx = (tr[i][0] + tr[i + 1][0]) / 2; const my = (tr[i][1] + tr[i + 1][1]) / 2; ctx.quadraticCurveTo(tr[i][0], tr[i][1], mx, my); }
      ctx.strokeStyle = 'rgba(' + col + ',0.7)'; ctx.lineWidth = 1.1; ctx.stroke();
    }
    // um membro afilado: da articulação a até à b, mais largo em cima
    function limb(a, b, w0, w1) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      ctx.beginPath();
      ctx.moveTo(a[0] + nx * w0, a[1] + ny * w0); ctx.lineTo(b[0] + nx * w1, b[1] + ny * w1);
      ctx.lineTo(b[0] - nx * w1, b[1] - ny * w1); ctx.lineTo(a[0] - nx * w0, a[1] - ny * w0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(a[0], a[1], w0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b[0], b[1], w1, 0, Math.PI * 2); ctx.fill();
    }
    function tutu(P, S) {
      // saia romântica em três camadas de tule, a balançar com a música
      const sway = 0.07 * Math.sin(t * 1.7);
      ctx.save(); ctx.translate(P.hip[0], P.hip[1] - 0.02 * S); ctx.rotate(sway);
      const camadas = [[0.74, 0.34, 'rgba(228,150,170,.5)'], [0.62, 0.26, 'rgba(214,100,130,.55)'], [0.48, 0.19, 'rgba(236,180,196,.75)']];
      camadas.forEach((c, k) => {
        const w = S * c[0], h = S * c[1];
        ctx.beginPath(); ctx.moveTo(-S * 0.1, 0);
        ctx.bezierCurveTo(-w * 0.55, h * 0.1, -w * 0.95, h * 0.45, -w, h * 0.9);
        const N = 8;
        for (let i = 0; i < N; i++) { const x0 = -w + (2 * w * i) / N, x1 = -w + (2 * w * (i + 1)) / N; ctx.quadraticCurveTo((x0 + x1) / 2, h * (1.12 + 0.06 * Math.sin(t * 2 + i + k)), x1, h * 0.9); }
        ctx.bezierCurveTo(w * 0.95, h * 0.45, w * 0.55, h * 0.1, S * 0.1, 0);
        ctx.closePath();
        ctx.fillStyle = c[2]; ctx.fill();
        ctx.lineWidth = Math.max(0.8, S * 0.014); ctx.strokeStyle = 'rgba(190,70,100,.55)'; ctx.stroke();
      });
      ctx.restore();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const P = pose(); const S = P.S;
      const ink = 'rgba(31,39,71,.92)'; const sapato = 'rgba(244,200,210,1)';
      // sombra no chão
      ctx.fillStyle = 'rgba(31,39,71,.10)';
      ctx.beginPath(); ctx.ellipse(P.base[0], P.base[1] + 2, S * 0.4, S * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      // fitas (ao fundo)
      ctx.globalCompositeOperation = 'multiply';
      ribbon(trails[0], cores[0], S * 0.17, t * 1.5);
      ribbon(trails[1], cores[1], S * 0.17, t * 1.5 + 2);
      ribbon(trails[2], cores[2], S * 0.15, t * 1.5 + 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ink; ctx.strokeStyle = ink;
      // perna livre e braço de trás
      limb(P.hip, P.kn2, S * 0.1, S * 0.072); limb(P.kn2, P.an2, S * 0.072, S * 0.04);
      ctx.fillStyle = sapato; limb(P.an2, P.to2, S * 0.04, S * 0.02); ctx.fillStyle = ink;
      limb(P.sh, P.el2, S * 0.045, S * 0.034); limb(P.el2, P.ha2, S * 0.034, S * 0.02);
      // perna de apoio, em ponta
      limb(P.hip, P.kn1, S * 0.11, S * 0.078); limb(P.kn1, P.an1, S * 0.078, S * 0.042);
      ctx.fillStyle = sapato; limb(P.an1, P.to1, S * 0.042, S * 0.02); ctx.fillStyle = ink;
      // tronco (corpete) e pescoço
      ctx.fillStyle = 'rgba(200,80,107,.95)'; limb(P.hip, P.sh, S * 0.12, S * 0.135); ctx.fillStyle = ink;
      limb(P.sh, P.hd, S * 0.04, S * 0.034);
      tutu(P, S);
      // cabeça com carrapito
      ctx.beginPath(); ctx.arc(P.hd[0], P.hd[1], S * 0.105, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(P.hd[0] - S * 0.09, P.hd[1] - S * 0.09, S * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,80,107,.95)'; ctx.beginPath(); ctx.arc(P.hd[0] - S * 0.12, P.hd[1] - S * 0.05, S * 0.022, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink;
      // braço da frente
      limb(P.sh, P.el1, S * 0.05, S * 0.036); limb(P.el1, P.ha1, S * 0.036, S * 0.022);
      // as mãos, a rematar
      ctx.beginPath(); ctx.arc(P.ha1[0], P.ha1[1], S * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(P.ha2[0], P.ha2[1], S * 0.03, 0, Math.PI * 2); ctx.fill();
    }
    function loop(now) {
      if (!on) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (W !== c.clientWidth || H !== c.clientHeight) size();
      if (W && H) { step(dt); draw(); }
      raf = requestAnimationFrame(loop);
    }
    let quer = false;
    function arranca() {
      on = true;
      if (trails[0].length === 0) for (let i = 0; i < LEN; i++) step(1 / 60);
      if (reduced()) { draw(); on = false; return; }
      last = 0; raf = requestAnimationFrame(loop);
    }
    function tenta(n) {
      if (!quer || on) return;
      if (size()) arranca(); else if (n < 120) requestAnimationFrame(() => tenta(n + 1)); // espera pela folha ter tamanho
    }
    return {
      ativar(v) {
        quer = !!v;
        if (!v) { on = false; cancelAnimationFrame(raf); return; }
        if (!on) tenta(0);
      },
      parar() { quer = false; on = false; cancelAnimationFrame(raf); },
    };
  }

  /* ==========================================================================
     O MOTOR
     ========================================================================== */
  function mount(container, paginas, opts) {
    opts = opts || {};
    paginas = Array.isArray(paginas) ? paginas : [];
    const photos = opts.photos || window.PHOTOS || {};
    const base = opts.base || '';
    const fire = (fn, ...a) => { try { if (typeof opts[fn] === 'function') opts[fn](...a); } catch (e) { console.error(e); } };
    const fim = () => {
      if (typeof opts.onFim === 'function') fire('onFim');
      else container.dispatchEvent(new CustomEvent('livro:fim', { bubbles: true }));
    };
    const tituloLivro = opts.titulo || ((paginas.find((p) => p && p.tipo === 'rosto') || {}).titulo) || '';

    const root = el('div', 'livro');
    root.setAttribute('lang', 'pt-PT');
    root.innerHTML =
      '<div class="lv-palco"><div class="lv-livro"><div class="lv-capa" aria-hidden="true"><i class="lv-lombada"></i></div>' +
      '<div class="lv-miolo" aria-hidden="true"></div><div class="lv-host"></div></div></div>' +
      '<nav class="lv-nav" aria-label="Folhear o livro">' +
      '<button type="button" class="lv-nav__b lv-nav__ant" aria-label="Página anterior"></button>' +
      '<span class="lv-nav__ind" aria-live="polite"></span>' +
      '<button type="button" class="lv-nav__b lv-nav__seg" aria-label="Página seguinte"></button></nav>' +
      '<div class="lv-medir" aria-hidden="true"></div>';
    container.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const livroEl = $('.lv-livro'); const hostWrap = $('.lv-host'); const medir = $('.lv-medir');
    const ind = $('.lv-nav__ind'); const bAnt = $('.lv-nav__ant'); const bSeg = $('.lv-nav__seg');
    bAnt.appendChild(svg('viewBox="0 0 24 24"><path d="M15 5 L8 12 L15 19"/>'));
    bSeg.appendChild(svg('viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19"/>'));

    let pf = null; let host = null; let geo = null; let built = []; // built: [{el, src (índice em paginas), tipo, ceu}]
    let firstOf = []; let cur = 0; let lastCeu = null; let destroyed = false; let pendingGoTo = null; let ativos = new Set();
    const rm = reduced();

    /* ---------- geometria */
    function geometry() {
      const W = container.clientWidth; const H = container.clientHeight;
      if (W < 50 || H < 50) return null;
      const retrato = W <= 700;
      const navH = retrato ? 58 : 60; const pad = retrato ? 10 : 18;
      let pw; let ph;
      if (retrato) {
        pw = W - 2 * pad - 14;
        ph = Math.min(H - navH - 2 * pad - 14, Math.round(pw * 1.72));
        if (ph < pw * 1.25) { ph = H - navH - 2 * pad - 14; pw = Math.min(pw, Math.round(ph / 1.25)); }
      } else {
        const aH = H - navH - 2 * pad - 20; const aW = (W - 2 * pad - 60) / 2;
        ph = Math.min(aH, aW * 1.5); pw = ph / 1.5;
      }
      pw = Math.floor(pw); ph = Math.floor(ph);
      const fs = +(pw / (retrato ? 23.5 : 27)).toFixed(2);
      return { W, H, retrato, pw, ph, fs, m: Math.max(6, Math.round(pw * 0.022)) };
    }

    /* ---------- folhas */
    function folha(tipo, extra) {
      const p = el('div', 'lv-p lv-p--' + tipo + (extra ? ' ' + extra : ''));
      p.dataset.density = 'soft';
      const cab = el('div', 'lv-cabeca'); cab.setAttribute('aria-hidden', 'true');
      const corpo = el('div', 'lv-corpo');
      const folio = el('div', 'lv-folio');
      const dentro = el('div', 'lv-in');
      dentro.append(cab, corpo, folio);
      p.appendChild(dentro);
      p._corpo = corpo;
      return p;
    }
    const cabe = (p) => p._corpo.scrollHeight <= p._corpo.clientHeight + 1;
    function medirFolha(p) { medir.innerHTML = ''; medir.appendChild(p); return p; }
    function encolher(p) { // último recurso: letra mais pequena, nunca texto cortado
      let s = 1;
      while (!cabe(p) && s > 0.62) { s -= 0.04; p._corpo.style.fontSize = s.toFixed(2) + 'em'; }
    }

    function foto(chave, i, legenda, w, h) {
      const ph = photos[chave];
      const f = el('figure', 'lv-foto lv-foto--' + (i % 2 ? 'cantos' : 'fita'));
      const rr = rng(hash(String(chave)));
      f.style.setProperty('--rot', ((rr() - 0.5) * 4.2 + (i % 2 ? 1.2 : -1.2)).toFixed(2) + 'deg');
      f.style.setProperty('--fita', ((rr() - 0.5) * 10).toFixed(1) + 'deg');
      const quadro = el('div', 'lv-foto__quadro');
      quadro.style.width = w + 'px'; quadro.style.height = h + 'px';
      if (ph) {
        if (ph.thumb) quadro.style.backgroundImage = 'url("' + ph.thumb + '")';
        const img = new Image();
        img.decoding = 'async'; img.alt = legenda || '';
        img.width = Math.round(w); img.height = Math.round(h);
        img.src = base + ph.src;
        img.addEventListener('load', () => quadro.classList.add('is-ok'));
        quadro.appendChild(img);
      } else quadro.classList.add('is-falta');
      f.appendChild(quadro);
      if (legenda) f.appendChild(el('figcaption', 'lv-foto__leg', legenda));
      return f;
    }
    function grupoFotos(lista, g, legendaUnica) {
      const cw = g.pw * 0.8; const mh = g.ph * 0.4;
      const items = lista.map((x) => (typeof x === 'string' ? { foto: x } : x || {}));
      const box = el('div', 'lv-fotos lv-fotos--' + items.length);
      items.forEach((it, i) => {
        const ph = photos[it.foto] || { w: 4, h: 3 };
        const ar = ph.w / ph.h;
        let w; let h;
        if (items.length === 1 && g.cheio) { w = g.pw - 10.4 * g.fs; h = g.ph * 0.7; } // a fotografia enche a folha (recortada se preciso)
        else if (items.length === 1) { w = g.grande ? Math.min(g.pw - 8.6 * g.fs, g.ph * (g.hmax || 0.68) * ar) : Math.min(cw * 0.88, mh * ar); h = w / ar; } // p.grande: a fotografia única fica maior
        else { w = Math.min(cw * 0.46, mh * 0.8 * ar); h = w / ar; }
        box.appendChild(foto(it.foto, i, it.legenda || (items.length === 1 ? legendaUnica : ''), Math.round(w), Math.round(h)));
      });
      return box;
    }

    /* cada tipo devolve { head, blocks, tail } (flui por várias folhas) ou { fixa: [nós] } */
    const B = {
      rosto(p) {
        const n = [];
        if (p.datas) n.push(el('p', 'lv-rosto__datas', p.datas));
        n.push(el('h1', 'lv-rosto__tit', p.titulo || ''));
        if (p.subtitulo) n.push(el('p', 'lv-rosto__sub', p.subtitulo));
        n.push(filete());
        if (p.epigrafe) {
          const q = el('blockquote', 'lv-rosto__epi');
          q.appendChild(el('p', '', p.epigrafe));
          if (p.autor) q.appendChild(el('footer', '', p.autor));
          n.push(q);
        }
        return { fixa: n };
      },
      indice(p, i) {
        const n = [el('h2', 'lv-indice__tit', p.titulo || 'Índice'), orn('lv-orn--peq')];
        const ol = el('ol', 'lv-indice__lista');
        (p.secoes || []).forEach((s) => {
          const li = el('li');
          const b = el('button', 'lv-indice__item'); b.type = 'button';
          b.append(el('span', 'lv-indice__num', roman(s.numero)), el('span', 'lv-indice__nome', s.titulo || ''), el('span', 'lv-indice__pont'), el('span', 'lv-indice__pag'));
          b._alvo = s;
          b.addEventListener('click', (e) => { e.preventDefault(); irPara(alvoSecao(s)); });
          li.appendChild(b); ol.appendChild(li);
        });
        n.push(ol);
        if (p.rabisco !== '' && p.rabisco !== false) n.push(rabisco(p.rabisco || 'não cliques aqui', 11 + i, fim));
        return { fixa: n };
      },
      secao(p) {
        return { fixa: [el('p', 'lv-secao__num', roman(p.numero)), filete(), el('h2', 'lv-secao__tit', p.titulo || ''), p.frase ? el('p', 'lv-secao__frase', p.frase) : null, orn()].filter(Boolean) };
      },
      carta(p, i, g) {
        const head = []; const blocks = []; const tail = [];
        if (p.titulo) head.push(el('h2', 'lv-titulo', p.titulo));
        if (isPh(p.texto)) blocks.push(el('p', 'lv-par', p.texto));
        else paras(p.texto).forEach((t, k) => blocks.push(el('p', 'lv-par' + (k === 0 ? ' lv-capitular' : ''), t)));
        if (p.assinatura) tail.push(el('p', 'lv-assin', p.assinatura));
        if (p.foto && photos[p.foto] && g) { // a fotografia no fim da carta
          const ph = photos[p.foto]; const mh = g.ph * 0.3; const w = Math.min(g.pw * 0.4, mh * ph.w / ph.h);
          const fz = foto(p.foto, 0, p.legenda || '', Math.round(w), Math.round(w * ph.h / ph.w));
          fz.classList.add('lv-carta__foto'); tail.push(fz);
        }
        return { head, blocks, tail };
      },
      momento(p, i, g) {
        const head = [];
        if (p.data) head.push(el('p', 'lv-momento__data', p.data));
        if (p.titulo) head.push(el('h2', 'lv-titulo', p.titulo));
        const blocks = [];
        const fotos = (p.fotos || []).filter(Boolean);
        // texto comprido: fotografias mais baixas, para o texto caber na mesma folha (senão sobra uma linha na seguinte)
        const gf0 = p.cheio ? Object.assign({}, g, { cheio: true }) : p.grande ? Object.assign({}, g, { grande: true, hmax: p.texto ? 0.55 : 0.76 }) : g; // com texto por baixo, a fotografia deixa-lhe lugar
        const gf = String(p.texto || '').length > 240 ? Object.assign({}, gf0, { pw: g.pw * 0.74, ph: g.ph * 0.74 }) : gf0;
        if (p.empilhar) { // uma fotografia por cima da outra, cada uma grande
          const ge = Object.assign({}, g, { grande: true, ph: g.ph * 0.4 });
          fotos.forEach((f) => blocks.push(grupoFotos([f], ge, '')));
        } else
        for (let k = 0; k < fotos.length; k += 2) blocks.push(grupoFotos(fotos.slice(k, k + 2), gf, k === 0 && fotos.length === 1 ? p.legenda || '' : ''));
        if (isPh(p.texto)) blocks.push(el('p', 'lv-par', p.texto));
        else paras(p.texto).forEach((t) => blocks.push(el('p', 'lv-par', t)));
        if (p.postit && blocks[0]) { // um post-it colado na fotografia
          const pi = el('div', 'lv-postit'); pi.appendChild(el('i', 'lv-postit__fita')); pi.appendChild(el('span', '', p.postit));
          blocks[0].classList.add('lv-comPostit'); blocks[0].appendChild(pi);
        }
        // texto e fotos alternam: primeiro a fotografia, depois o texto (como num álbum)
        return { head, blocks, tail: [], cls: p.cls || '' };
      },
      poema(p, i, g) {
        const head = [el('h2', 'lv-poema__tit', p.titulo || '')];
        if (p.autor) head.push(el('p', 'lv-poema__autor', p.autor));
        if (p.obra) head.push(el('p', 'lv-poema__obra', p.obra));
        const blocks = [];
        if (isPh(p.texto)) blocks.push(el('p', 'lv-par', p.texto));
        else paras(p.texto).forEach((st) => {
          const e = el('div', 'lv-estrofe');
          st.split('\n').forEach((l) => e.appendChild(el('span', 'lv-verso', l.replace(/\s+$/, ''))));
          blocks.push(e);
        });
        const tail = [];
        if (!p.autor) { const a = p.assinatura || opts.assinatura; if (a) tail.push(el('p', 'lv-assin', a)); }
        if (p.nota) tail.push(el('p', 'lv-poema__nota', p.nota));
        if (p.foto && photos[p.foto] && g) { // uma fotografia por baixo do poema
          const ph = photos[p.foto]; let w; let h;
          if (ph.h > ph.w) { w = (g.pw - 9.5 * g.fs) * 0.7; h = g.ph * 0.335; } // retrato: faixa horizontal, recortada em cima (as caras ficam)
          else { w = Math.min(g.pw - 9.5 * g.fs, g.ph * 0.135 * ph.w / ph.h); h = w * ph.h / ph.w; }
          const fz = foto(p.foto, 1, p.legenda || '', Math.round(w), Math.round(h));
          if (ph.h > ph.w) { const im = fz.querySelector('img'); if (im) im.style.objectPosition = '50% 56%'; }
          fz.classList.add('lv-poema__foto'); tail.push(fz);
        }
        // versos compridos: letra um pouco menor, para não quebrarem a meio com a linha seguinte indentada
        const longo = String(p.texto || '').split(/\r?\n/).some((l) => l.trim().length > 46);
        const nLinhas = String(p.texto || '').split(/\r?\n/).filter((l) => l.trim()).length; // poemas com muitas linhas: letra mais pequena, para caberem numa folha
        return { head, blocks, tail, cls: (p.autor ? '' : 'lv-p--dele') + (longo ? ' lv-p--longo' : '') + (nLinhas > 18 ? ' lv-p--denso' : '') };
      },
      danca(p, i, g) {
        const n = [];
        if (p.titulo) n.push(el('h2', 'lv-titulo', p.titulo));
        if (p.foto && photos[p.foto]) { // a fotografia dela a dançar, ao lado das fitas
          const ph = photos[p.foto]; const mh = g.ph * 0.36; const w = Math.min(g.pw * 0.5, mh * ph.w / ph.h);
          const fz = foto(p.foto, 1, p.legenda || '', Math.round(w), Math.round(w * ph.h / ph.w));
          fz.classList.add('lv-danca__foto'); n.push(fz);
        }
        const box = el('div', 'lv-danca');
        n.push(box);
        if (p.texto) { const tx = el('p', 'lv-danca__txt'); String(p.texto).split('♥').forEach((parte, k, arr) => { tx.appendChild(document.createTextNode(parte)); if (k < arr.length - 1) tx.appendChild(el('span', 'lv-danca__cor', '♥')); }); n.push(tx); }
        return { fixa: n, danca: box };
      },
      filme(p) {
        const n = [];
        const fig = el('div', 'lv-filme__img');
        fig.appendChild(el('span', 'lv-filme__nomefundo', p.nome || ''));
        if (p.imagem) {
          const img = new Image(); img.alt = p.nome || ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
          img.addEventListener('error', () => img.remove());
          img.addEventListener('load', () => fig.classList.add('is-ok'));
          img.src = p.imagem; fig.appendChild(img);
        }
        n.push(fig);
        const cab = el('div', 'lv-filme__cab');
        cab.appendChild(el('h2', 'lv-filme__nome', p.nome || ''));
        const sub = [p.nomePt, p.ano].filter(Boolean).join(' · ');
        if (sub) cab.appendChild(el('p', 'lv-filme__sub', sub));
        n.push(cab);
        if (p.mensagem) n.push(el('p', 'lv-filme__msg', p.mensagem));
        if (p.frase) n.push(el('p', 'lv-filme__frase', p.frase));
        if (p.botao) n.push(botao(p.botao, () => fire('onAcao', 'musica', p), '♪'));
        return { fixa: n };
      },
      viagem(p, i) {
        const mb = el('button', 'lv-mapa-btn'); mb.type = 'button'; mb.setAttribute('aria-label', p.rotulo || p.botao || 'Ver a viagem');
        mb.appendChild(mapaSvg(31 + i));
        mb.addEventListener('click', (e) => { e.preventDefault(); fire('onAcao', 'viagem', p); });
        return { fixa: [p.titulo ? el('h2', 'lv-titulo', p.titulo) : null, mb, p.texto ? el('p', 'lv-par lv-par--centro', p.texto) : null, p.botao === false ? null : botao(p.botao || 'Vem comigo', () => fire('onAcao', 'viagem', p), '➶')].filter(Boolean) };
      },
      xadrez(p, i) {
        const PE = 'assets/xadrez/pecas/';
        const w = el('div', 'lv-gx');
        /* o teto: de noite, as peças a jogar sozinhas (a visão da Beth) */
        const pecas = [['wK', 4, 40, 30, -12], ['bN', 52, 56, 26, 14], ['wQ', 346, 38, 32, 6], ['bR', 300, 58, 24, -10], ['wB', 20, 4, 24, 12], ['bP', 364, 6, 22, -6], ['wN', 330, 8, 24, 18], ['bQ', 70, 8, 20, -16]];
        let im = '';
        pecas.forEach((q, k) => { im += '<image class="gx-peca gx-peca--' + (q[0][0] === 'b' ? 'p' : 'b') + '" href="' + PE + q[0] + '.svg" x="' + q[1] + '" y="' + q[2] + '" width="' + q[3] + '" height="' + q[3] + '" transform="rotate(' + q[4] + ' ' + (q[1] + q[3] / 2) + ' ' + (q[2] + q[3] / 2) + ')" style="animation-delay:' + (k * 0.7).toFixed(1) + 's"/>'; });
        let ripas = '';
        for (let k = 0; k <= 10; k++) ripas += '<path d="M' + (k * 40) + ' 0 L' + (200 + (k - 5) * 14) + ' 90"/>';
        let est = ''; const r = rng(77 + i);
        for (let k = 0; k < 22; k++) est += '<circle cx="' + (r() * 400).toFixed(0) + '" cy="' + (r() * 90).toFixed(0) + '" r="' + (0.5 + r() * 0.9).toFixed(1) + '" opacity="' + (0.25 + r() * 0.5).toFixed(2) + '"/>';
        w.appendChild(svg('class="gx-teto" viewBox="0 0 400 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="gx-ripas">' + ripas + '</g><g class="gx-est">' + est + '</g>' + im + '</svg>'));
        const cab = el('div', 'lv-gx__cab');
        cab.append(el('p', 'lv-gx__sobre', 'torneio de xadrez'), el('h2', 'lv-gx__tit', p.titulo || 'O nosso gambito'), el('p', 'lv-gx__vs', 'Brancas: Catarina · Pretas: Diogo'));
        w.appendChild(cab);
        /* o tabuleiro de madeira, à antiga: 1.d4 d5 2.c4, o gambito da dama; toca para jogar */
        const fen = 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR';
        const tab = el('button', 'lv-gx__tab'); tab.type = 'button'; tab.setAttribute('aria-label', 'Jogar xadrez comigo');
        const grelha = el('div', 'lv-gx__grelha');
        const rows = fen.split('/');
        for (let y = 0; y < 8; y++) {
          let x = 0;
          const quad = (cod) => {
            const q = el('i', 'gx-q ' + ((x + y) % 2 ? 'gx-q--e' : 'gx-q--c'));
            const col = 'abcdefgh'[x], lin = 8 - y;
            if ((col + lin) === 'c4' || (col + lin) === 'c2') q.classList.add('gx-q--ult');
            if (cod) { const pi = new Image(); pi.alt = ''; pi.decoding = 'async'; pi.src = PE + (cod === cod.toUpperCase() ? 'w' : 'b') + cod.toUpperCase() + '.svg'; q.appendChild(pi); }
            if (x === 0) q.appendChild(el('b', 'gx-n', String(lin)));
            if (y === 7) q.appendChild(el('b', 'gx-l', col));
            grelha.appendChild(q); x++;
          };
          for (const ch of rows[y]) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) quad(''); else quad(ch); }
        }
        tab.appendChild(grelha);
        tab.addEventListener('click', (e) => { e.preventDefault(); fire('onAcao', 'xadrez', p); });
        w.appendChild(tab);
        /* a secretária do torneio: a folha de jogadas e o cartaz */
        const mesa = el('div', 'lv-gx__mesa');
        const fol = el('div', 'lv-gx__folha');
        fol.append(el('b', '', 'Folha de jogo'), el('span', '', '1.  d4  d5'), el('span', '', '2.  c4  …'), el('i', '', 'a tua vez, Catarina'));
        mesa.appendChild(fol);
        if (p.imagem) {
          const pol = el('figure', 'lv-gx__poster');
          const pi = new Image(); pi.alt = 'O Gambito de Dama'; pi.decoding = 'async';
          pi.addEventListener('error', () => pol.remove());
          pi.src = p.imagem;
          pol.append(el('i', 'lv-gx__fita'), pi);
          mesa.appendChild(pol);
        }
        w.appendChild(mesa);
        w.appendChild(el('p', 'lv-gx__dica', 'toca no tabuleiro para jogar comigo'));
        return { fixa: [w] };
      },
      ementa(p) {
        const IC = {
          queijo: '<path d="M3 17 L21 13 V18 H3Z M3 17 L12 7 L21 13"/><circle cx="12" cy="14.5" r="1"/><circle cx="17" cy="15" r=".8"/>',
          bruschetta: '<path d="M5 9 C5 5.5 9 4 12 4 C15 4 19 5.5 19 9 C19 10 18.5 10.6 18 11 V19 H6 V11 C5.5 10.6 5 10 5 9Z"/><circle cx="10" cy="13" r="1.4"/><circle cx="14.5" cy="15.5" r="1.4"/>',
          pao: '<path d="M3 16 C3 10.5 7 7 12 7 C17 7 21 10.5 21 16Z"/><path d="M8 10.5 L10 13.5 M12 9.5 L14 12.5 M16 10.5 L18 13.5"/><path d="M4 18.5 H20"/>',
          tremocos: '<circle cx="8" cy="15" r="3.2"/><circle cx="15.5" cy="15" r="3.2"/><circle cx="11.7" cy="8.5" r="3.2"/>',
          pizza: '<path d="M12 21 L4 6 C9 3 15 3 20 6Z"/><circle cx="10" cy="9" r="1.2"/><circle cx="14.5" cy="9.5" r="1.2"/><circle cx="12" cy="14" r="1.2"/>',
          frango: '<path d="M15 4 C19 4 21 8 18.5 11 C17 13 14 13 12.5 12 L6.5 18 C5.5 19.4 3.8 19 3.6 17.6 C3.2 16.2 4.2 15.6 5.2 15 L11 9.2 C10 7 11.5 4 15 4Z"/>',
          bacalhau: '<path d="M3 12 C7 6 14 6 18 12 C14 18 7 18 3 12Z M18 12 L22 8 V16Z"/><circle cx="7.5" cy="11" r=".8"/>',
          cheesecake: '<path d="M3 18 H21 V12 L3 8Z M3 12.4 L21 15"/><path d="M14 3.6 C14 3.6 11.6 4.6 12.1 6.8 C12.6 8.4 15.4 8.4 15.9 6.8 C16.4 4.6 14 3.6 14 3.6Z"/>',
          shake: '<path d="M7 8 H17 L15.8 20 H8.2Z M6 8 H18 M13 8 L15 3 H18"/><path d="M8.6 13 H15.4"/>',
          mousse: '<path d="M7 5 H17 L16 12 C15.5 15 8.5 15 8 12Z M12 15 V20 M8 20 H16"/><path d="M7.5 8.4 C10 6.4 14 10.4 16.6 8.4"/>',
        };
        const chave = (n) => { n = n.toLowerCase(); return n.includes('queijo') ? 'queijo' : n.includes('brusch') ? 'bruschetta' : n.includes('pão') ? 'pao' : n.includes('tremo') ? 'tremocos' : n.includes('pizza') ? 'pizza' : n.includes('frango') ? 'frango' : n.includes('bacalhau') ? 'bacalhau' : n.includes('shake') ? 'shake' : (n.includes('cheese') || n.includes('chess')) ? 'cheesecake' : 'mousse'; };
        const head = [el('p', 'lv-ementa__sobre', 'a casa dos chefs'), el('h2', 'lv-ementa__tit', p.titulo || 'Menu'), el('p', 'lv-ementa__sub', 'ementa de hoje · para dois')];
        const blocks = [];
        (p.grupos || []).forEach((g) => {
          const t = el('p', 'lv-ementa__grupo'); t.append(el('i'), el('span', '', g.titulo), el('i')); blocks.push(t);
          const mk = (it) => {
            const nome = typeof it === 'string' ? it : it.nome, nota = typeof it === 'string' ? '' : it.nota;
            const d = el('div', 'lv-ementa__item');
            const l = el('p', 'lv-ementa__linha');
            l.appendChild(svg('class="lv-ementa__ico" viewBox="0 0 24 24" aria-hidden="true">' + IC[chave(nome)]));
            l.appendChild(el('span', 'lv-ementa__nome', nome));
            d.appendChild(l);
            if (nota) d.appendChild(el('p', 'lv-ementa__nota', nota));
            return d;
          };
          if (g.colunas) { const gr = el('div', 'lv-ementa__grade'); g.itens.forEach((it) => gr.appendChild(mk(it))); blocks.push(gr); }
          else g.itens.forEach((it) => blocks.push(mk(it)));
        });
        return { head, blocks, tail: [el('p', 'lv-ementa__fim', 'Bom apetite, meu amor.')] };
      },
      fim(p, i) {
        const n = [el('p', 'lv-fim__fim', 'Fim.')];
        if (p.texto) n.push(el('p', 'lv-fim__txt', p.texto));
        n.push(orn());
        if (p.rabisco !== '' && p.rabisco !== false) n.push(rabisco(p.rabisco || 'não cliques aqui', 23 + i, fim));
        return { fixa: n };
      },
      // uma fotografia grande e uma frase escrita à mão por baixo (p.foto, p.linhas = [3 linhas])
      imagem(p, i, g) {
        const n = [];
        const ph = photos[p.foto];
        const fig = el('figure', 'lv-cartaz__foto');
        fig.style.setProperty('--ar', ph ? (ph.w / ph.h).toFixed(3) : '1.5');
        if (ph && ph.h > ph.w) fig.classList.add('lv-cartaz__foto--retrato');
        const q = el('div', 'lv-cartaz__quadro');
        if (ph) {
          if (ph.thumb) q.style.backgroundImage = 'url("' + ph.thumb + '")';
          const img = new Image(); img.decoding = 'async'; img.alt = '';
          img.addEventListener('load', () => q.classList.add('is-ok'));
          img.src = base + ph.src; q.appendChild(img);
        }
        fig.append(el('i', 'lv-cartaz__fita lv-cartaz__fita--a'), el('i', 'lv-cartaz__fita lv-cartaz__fita--b'), q);
        n.push(fig);
        const L = (p.linhas && p.linhas.length ? p.linhas : [p.legenda || '']);
        const t = el('div', 'lv-cartaz__txt');
        L.forEach((l, k) => t.appendChild(el('p', 'lv-cartaz__l lv-cartaz__l' + (k + 1) + (k === L.length - 1 ? ' lv-cartaz__ult' : ''), l)));
        t.appendChild(svg('class="lv-cartaz__traco" viewBox="0 0 220 24" preserveAspectRatio="none"><path d="M6 15 C 40 6, 70 20, 110 12 S 180 6, 214 13"/><path d="M30 20 C 80 14, 140 22, 196 17" opacity=".55"/>'));
        n.push(t);
        return { fixa: n };
      },
      branca() { return { fixa: [] }; },
    };
    function botao(txt, fn, ico) {
      const b = el('button', 'lv-botao'); b.type = 'button';
      setText(b, txt);
      if (ico) b.dataset.ico = ico;
      b.addEventListener('click', (e) => { e.preventDefault(); fn(); });
      return b;
    }

    /* parte um parágrafo/estrofe para encher o resto da folha */
    function partir(bloco, p) {
      const corpo = p._corpo;
      if (bloco.classList.contains('lv-estrofe')) {
        const versos = [...bloco.children]; const a = bloco.cloneNode(false); corpo.appendChild(a);
        let k = 0;
        for (; k < versos.length; k++) { a.appendChild(versos[k]); if (!cabe(p)) { a.removeChild(versos[k]); break; } }
        corpo.removeChild(a);
        if (k === 0) return [null, bloco];
        const b = bloco.cloneNode(false); versos.slice(k).forEach((v) => b.appendChild(v));
        b.classList.add('lv-cont');
        return [a, b.children.length ? b : null];
      }
      if (bloco.tagName === 'P' && !bloco.classList.contains('ph')) {
        const pal = bloco.textContent.split(/(\s+)/);
        const a = bloco.cloneNode(false); corpo.appendChild(a);
        let lo = 0; let hi = pal.length; // maior n que cabe
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; a.textContent = pal.slice(0, mid).join(''); if (cabe(p)) lo = mid; else hi = mid - 1; }
        corpo.removeChild(a);
        while (lo > 0 && /^\s+$/.test(pal[lo - 1])) lo--;
        if (lo < 3) return [null, bloco];
        a.textContent = pal.slice(0, lo).join('');
        a.classList.add('lv-partido');
        const b = bloco.cloneNode(false); b.classList.remove('lv-capitular'); b.classList.add('lv-cont');
        b.textContent = pal.slice(lo).join('').replace(/^\s+/, '');
        return [a, b];
      }
      return [null, bloco];
    }

    function paginar(p, i, g) {
      const tipo = B[p.tipo] ? p.tipo : 'carta';
      const spec = B[tipo](p, i, g);
      const out = [];
      if (spec.fixa) {
        const f = medirFolha(folha(tipo, spec.cls));
        spec.fixa.forEach((n) => f._corpo.appendChild(n));
        encolher(f);
        if (spec.danca) f._danca = danca(spec.danca);
        out.push(f);
        return out;
      }
      let f = medirFolha(folha(tipo, spec.cls));
      spec.head.forEach((n) => f._corpo.appendChild(n));
      const novo = () => { out.push(f); f = medirFolha(folha(tipo, (spec.cls || '') + ' lv-p--cont')); };
      const queue = spec.blocks.slice();
      while (queue.length) {
        const b = queue.shift();
        f._corpo.appendChild(b);
        if (cabe(f)) continue;
        f._corpo.removeChild(b);
        const [a, resto] = partir(b, f);
        if (a) { f._corpo.appendChild(a); novo(); if (resto) queue.unshift(resto); continue; }
        if (f._corpo.children.length > spec.head.length || out.length) { novo(); f._corpo.appendChild(b); if (!cabe(f)) encolher(f); continue; }
        // nem numa folha só com o cabeçalho: vai na mesma, com letra menor
        f._corpo.appendChild(b); encolher(f);
      }
      for (const t of spec.tail) {
        f._corpo.appendChild(t);
        if (cabe(f)) continue;
        f._corpo.removeChild(t);
        const prev = f._corpo.lastElementChild;
        const podeLevar = prev && f._corpo.children.length > 1 && !spec.head.includes(prev);
        if (podeLevar) f._corpo.removeChild(prev);
        novo();
        if (podeLevar) f._corpo.appendChild(prev);
        f._corpo.appendChild(t);
        if (!cabe(f)) encolher(f);
      }
      out.push(f);
      return out;
    }

    function guarda(fim) {
      const p = el('div', 'lv-p lv-p--guarda' + (fim ? ' lv-p--guarda-fim' : ''));
      p.dataset.density = 'soft';
      if (!fim && opts.exLibris !== '') {
        const ex = el('div', 'lv-exlibris');
        ex.append(el('p', 'lv-exlibris__sob', 'ex libris'), el('p', 'lv-exlibris__nome', opts.exLibris || tituloLivro || ''), el('p', 'lv-orn lv-orn--peq', '❦'));
        const dentro = el('div', 'lv-in'); dentro.appendChild(ex); p.appendChild(dentro);
      }
      return p;
    }


    /* ---------- a capa abre: o livro fechado (o que ela agarrou) abre-se de verdade, em vez de aparecer de repente */
    function abrirCapa() {
      if (!geo || destroyed || !livroEl.animate) return;
      const g = geo; const cp = opts.capa || {};
      const tw = Math.min(g.W * 0.64, 320, g.H * 0.46);            // a largura do livro fechado na mesa (ver js/mesa.js)
      const pw = g.pw; const k0 = Math.min(1, tw / pw);
      const palco = $('.lv-palco');
      const dur = 2300; const ease = 'cubic-bezier(.45,.05,.2,1)';
      const dy = 30;                                                // o palco tem os controlos por baixo: o centro difere
      root.classList.add('is-abrindo');
      const fim2 = () => { root.classList.remove('is-abrindo'); if (cover) cover.remove(); [lc, miolo, hostW].forEach((n) => { n.style.clipPath = ''; }); };
      const lc = $('.lv-capa'); const miolo = $('.lv-miolo'); const hostW = $('.lv-host');
      let cover = null;
      if (g.retrato) {
        const a = livroEl.animate([{ transform: 'translateY(' + dy + 'px) scale(' + k0.toFixed(3) + ')', opacity: 0.0 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: ease });
        a.finished.then(fim2, fim2);
        return;
      }
      livroEl.style.perspective = '2600px';
      cover = el('div', 'lv-capa-abre');
      cover.setAttribute('aria-hidden', 'true');
      cover.innerHTML =
        '<div class="lv-capa-abre__f lv-capa-abre__frente"><span class="lv-capa-abre__mold"></span>' +
        '<span class="lv-capa-abre__para">' + (cp.para || '') + '</span><span class="lv-capa-abre__sub">' + (cp.subtitulo || '') + '</span><span class="lv-capa-abre__ano">' + (cp.ano || '') + '</span></div>' +
        '<div class="lv-capa-abre__f lv-capa-abre__verso"></div>';
      livroEl.appendChild(cover);
      const meio = '-' + (pw / 2).toFixed(1) + 'px';
      // 1) só a metade direita à vista (o livro fechado); 2) a metade esquerda aparece quando a capa passa a lombada
      const clip = [{ clipPath: 'inset(-30px -30px -30px 50%)', offset: 0 }, { clipPath: 'inset(-30px -30px -30px 50%)', offset: 0.46 }, { clipPath: 'inset(-30px)', offset: 0.47 }, { clipPath: 'inset(-30px)', offset: 1 }];
      [lc, miolo, hostW].forEach((n) => n.animate(clip, { duration: dur, fill: 'both' }));
      livroEl.animate([
        { transform: 'translate(' + meio + ', ' + dy + 'px) scale(' + k0.toFixed(3) + ')', offset: 0 },
        { transform: 'translate(' + meio + ', ' + dy + 'px) scale(' + k0.toFixed(3) + ')', offset: 0.16 },
        { transform: 'translate(0, 0) scale(1)', offset: 1 },
      ], { duration: dur, easing: ease, fill: 'both' });
      const a = cover.animate([
        { transform: 'rotateY(0deg)', opacity: 1, offset: 0 },
        { transform: 'rotateY(0deg)', opacity: 1, offset: 0.14 },
        { transform: 'rotateY(-95deg)', opacity: 1, offset: 0.5 },
        { transform: 'rotateY(-176deg)', opacity: 1, offset: 0.93 },
        { transform: 'rotateY(-180deg)', opacity: 0, offset: 1 },
      ], { duration: dur, easing: 'cubic-bezier(.4,.1,.25,1)', fill: 'both' });
      a.finished.then(() => { livroEl.style.perspective = ''; fim2(); }, () => { livroEl.style.perspective = ''; fim2(); });
    }

    /* ---------- construir (e reconstruir quando o tamanho muda) */
    function construir(manter) {
      const g = geometry();
      if (!g) return;
      if (geo && pf && g.pw === geo.pw && g.ph === geo.ph && g.retrato === geo.retrato) return;
      const alvo = manter != null ? manter : (built[cur] ? built[cur].src : 0);
      parar();
      if (pf) { try { pf.destroy(); } catch (e) { /* já foi */ } pf = null; }
      geo = g;
      root.style.setProperty('--lv-fs', g.fs + 'px');
      root.style.setProperty('--lv-pw', g.pw + 'px');
      root.style.setProperty('--lv-ph', g.ph + 'px');
      root.style.setProperty('--lv-m', g.m + 'px');
      root.classList.toggle('is-retrato', g.retrato);
      medir.style.width = g.pw + 'px'; medir.style.height = g.ph + 'px';

      built = []; firstOf = [];
      if (!g.retrato) built.push({ el: guarda(false), src: 0, tipo: 'guarda', ceu: null });
      let ceu = null; let secTit = '';
      paginas.forEach((p, i) => {
        if (!p) return;
        if (p.ceu) ceu = p.ceu;
        if (p.tipo === 'secao') secTit = p.titulo || '';
        firstOf[i] = built.length;
        paginar(p, i, g).forEach((f) => built.push({ el: f, src: i, tipo: p.tipo, ceu, sec: secTit }));
      });
      medir.innerHTML = '';
      if (!g.retrato && built.length % 2) built.push({ el: guarda(true), src: paginas.length - 1, tipo: 'guarda', ceu });
      // fólios, cabeçalhos corridos, lados
      const off = g.retrato ? 0 : 1;
      const semFolio = new Set(['rosto', 'secao', 'branca', 'guarda', 'indice', 'fim']);
      built.forEach((b, k) => {
        const lado = g.retrato ? 'dir' : (k % 2 ? 'dir' : 'esq');
        b.el.classList.add('lv-p--' + lado);
        b.folio = k + 1 - off;
        const fo = b.el.querySelector('.lv-folio'); const cab = b.el.querySelector('.lv-cabeca');
        if (fo) fo.textContent = semFolio.has(b.tipo) ? '' : String(b.folio);
        if (cab) cab.textContent = semFolio.has(b.tipo) ? '' : (lado === 'esq' ? tituloLivro : (b.sec || tituloLivro));
      });
      // o índice: números das folhas a sério
      built.forEach((b) => b.el.querySelectorAll('.lv-indice__item').forEach((it) => {
        const k = firstOf[alvoSecao(it._alvo)];
        it.querySelector('.lv-indice__pag').textContent = k != null && built[k] ? built[k].folio : '';
      }));

      host = el('div', 'lv-flip');
      hostWrap.innerHTML = ''; hostWrap.appendChild(host);
      livroEl.style.width = (g.retrato ? g.pw : 2 * g.pw) + 'px';
      livroEl.style.height = g.ph + 'px';
      host.style.width = (g.retrato ? g.pw : 2 * g.pw) + 'px';
      const start = firstOf[alvo] != null ? firstOf[alvo] : 0;
      pf = new window.St.PageFlip(host, {
        width: g.pw, height: g.ph, size: 'fixed', autoSize: true, maxWidth: 4000, maxHeight: 4000,
        usePortrait: true, showCover: false, drawShadow: true, maxShadowOpacity: 0.55,
        flippingTime: rm ? 1 : 900, startPage: g.retrato ? start : start - (start % 2),
        mobileScrollSupport: false, swipeDistance: 24, clickEventForward: true,
        useMouseEvents: !rm && !g.retrato, showPageCorners: !rm && !g.retrato, disableFlipByClick: false,
      });
      pf.on('flip', (e) => atualizar(e.data));
      pf.on('changeOrientation', () => atualizar(pf.getCurrentPageIndex()));
      pf.loadFromHTML(built.map((b) => b.el));
      atualizar(pf.getCurrentPageIndex());
      if (pendingGoTo != null) { const k = pendingGoTo; pendingGoTo = null; irPara(k, true); }
    }

    function alvoSecao(s) {
      if (s == null) return 0;
      if (typeof s.pagina === 'number' && paginas[s.pagina]) return s.pagina;
      if (s.id) { const k = paginas.findIndex((p) => p && p.id === s.id); if (k >= 0) return k; }
      const k = paginas.findIndex((p) => p && p.tipo === 'secao' && String(p.numero) === String(s.numero));
      return k >= 0 ? k : 0;
    }

    function visiveis(k) {
      if (!geo || geo.retrato) return [k];
      const l = k - (k % 2); return [l, l + 1];
    }
    function parar() { ativos.forEach((k) => { const b = built[k]; if (b && b.el._danca) b.el._danca.ativar(false); }); ativos = new Set(); }

    function atualizar(k) {
      if (!pf) return;
      cur = Math.max(0, Math.min(built.length - 1, k | 0));
      const vis = visiveis(cur).filter((x) => built[x]);
      // a dança só corre quando está à vista
      const novo = new Set(vis);
      ativos.forEach((x) => { if (!novo.has(x) && built[x] && built[x].el._danca) built[x].el._danca.ativar(false); });
      novo.forEach((x) => { if (built[x].el._danca) built[x].el._danca.ativar(true); });
      ativos = novo;
      // o céu: a página da direita (ou a única)
      const dir = built[vis[vis.length - 1]] || built[cur];
      const cena = (dir && dir.ceu) || (built[vis[0]] && built[vis[0]].ceu) || null;
      if (cena && cena !== lastCeu) { lastCeu = cena; fire('onCeu', cena); }
      // folhas empilhadas nos lados: quanto já se leu, quanto falta
      const n = Math.max(1, built.length - 1); const f = cur / n;
      const max = Math.max(4, Math.round(geo.pw * 0.022));
      root.style.setProperty('--lv-esq', (geo.retrato ? 0 : Math.round(1 + (max - 1) * f)) + 'px');
      root.style.setProperty('--lv-dir', Math.round(1 + (max - 1) * (1 - f)) + 'px');
      // indicador e botões
      const fol = vis.map((x) => built[x]).filter((b) => b && b.tipo !== 'guarda').map((b) => b.folio);
      const total = built.filter((b) => b.tipo !== 'guarda').length;
      ind.textContent = fol.length ? (fol.length > 1 ? fol[0] + '–' + fol[fol.length - 1] : fol[0]) + ' de ' + total : '';
      if (vis[vis.length - 1] >= built.length - 1) fire('onUltima');
      bAnt.disabled = vis[0] <= 0;
      bSeg.disabled = vis[vis.length - 1] >= built.length - 1;
      root.classList.toggle('is-inicio', vis[0] <= 0);
    }

    function irPara(i, semAnim) {
      if (!pf) { pendingGoTo = i; return; }
      const k = firstOf[i];
      if (k == null) return;
      if (rm || semAnim) { pf.turnToPage(k); atualizar(k); }
      else if (visiveis(cur).includes(k)) return;
      else pf.flip(k);
    }
    function passo(d) {
      if (!pf) return;
      const s = geo.retrato ? 1 : 2;
      if (rm) {
        const k = Math.max(0, Math.min(built.length - 1, (geo.retrato ? cur : cur - (cur % 2)) + d * s));
        pf.turnToPage(k); atualizar(k);
      } else if (d > 0) pf.flipNext(); else pf.flipPrev();
    }
    bAnt.addEventListener('click', () => passo(-1));
    bSeg.addEventListener('click', () => passo(1));

    // teclado: só se o livro estiver à vista e nada por cima (diálogos)
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'PageUp' && e.key !== 'PageDown') return;
      if (!root.offsetParent && getComputedStyle(root).position !== 'fixed') return;
      const a = document.activeElement;
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      if (a && a.closest && a.closest('[role="dialog"],[aria-modal="true"]')) return;
      if (document.querySelector('[aria-modal="true"]:not([hidden])')) return;
      e.preventDefault();
      passo(e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 1);
    }
    document.addEventListener('keydown', onKey);

    // gestos próprios: com movimento reduzido (folha muda logo) e no telemóvel (o PageFlip
    // em modo retrato perde gestos; aqui o swipe/toque chama flipNext/flipPrev, com a curva da folha)
    const manual = () => rm || (geo && geo.retrato);
    let g0 = null;
    hostWrap.addEventListener('pointerdown', (e) => {
      if (!manual() || e.target.closest('canvas')) { g0 = null; return; }
      g0 = { x: e.clientX, y: e.clientY, t: Date.now(), btn: !!e.target.closest('button,a') };
    });
    hostWrap.addEventListener('pointercancel', () => { g0 = null; });
    hostWrap.addEventListener('pointerup', (e) => {
      const s = g0; g0 = null;
      if (!s || !manual()) return;
      const dx = e.clientX - s.x; const dy = e.clientY - s.y; const b = hostWrap.getBoundingClientRect();
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.2) { passo(dx < 0 ? 1 : -1); return; }
      if (s.btn || Math.abs(dx) > 8 || Math.abs(dy) > 8 || Date.now() - s.t > 600) return;
      const fx = (e.clientX - b.left) / b.width; const zona = geo && geo.retrato ? 0.3 : 0.5;
      if (fx > 1 - zona) passo(1); else if (fx < zona) passo(-1);
    });
    // tamanho: espera pelas letras (a paginação mede texto) e reconstrói quando muda
    let t = 0;
    const ro = window.ResizeObserver ? new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!destroyed && fontesProntas) construir(); }, 180); }) : null;
    let fontesProntas = false;
    const fontes = document.fonts && document.fonts.load
      ? Promise.race([
        Promise.all(['400 20px "Ibarra Real Nova"', 'italic 400 20px "Ibarra Real Nova"', '600 20px "Ibarra Real Nova"', '400 30px "Mrs Saint Delafield"'].map((f) => document.fonts.load(f).catch(() => {}))).then(() => document.fonts.ready),
        new Promise((r) => setTimeout(r, 3000)),
      ])
      : Promise.resolve();
    fontes.then(() => {
      if (destroyed) return;
      fontesProntas = true; construir(0);
      if (!rm && opts.abrirCapa !== false) abrirCapa();
      if (ro) ro.observe(container); else window.addEventListener('resize', construir);
    });

    const api = {
      goTo(i) { irPara(i | 0); },
      next() { passo(1); },
      prev() { passo(-1); },
      destroy() {
        destroyed = true; parar();
        document.removeEventListener('keydown', onKey);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', construir);
        if (pf) { try { pf.destroy(); } catch (e) { /* nada */ } }
        pf = null; root.remove();
        if (Livro._atual === api) Livro._atual = null;
      },
      get paginaAtual() { return built[cur] ? built[cur].src : 0; },
      get folha() { return cur; },
    };
    Livro._atual = api;
    return api;
  }

  const Livro = {
    mount,
    _atual: null,
    get paginaAtual() { return Livro._atual ? Livro._atual.paginaAtual : 0; },
  };
  window.Livro = Livro;
})();
