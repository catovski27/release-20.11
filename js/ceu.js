/* ==========================================================================
   O CÉU — a paisagem pintada que fica por trás do livro.
   Um único shader (WebGL 1) desenha céu, sol/lua, nuvens, estrelas, aurora,
   montanhas com neve, mar, colinas, trigo e nevoeiro, com bordas de aguarela.
   O scroll é uma viagem: as camadas passam a velocidades diferentes, e cada
   secção com data-ceu="nome" muda a cena (a hora do dia, o sítio).

   Uso:  Ceu.init(canvas)       — começa
         Ceu.scan()             — volta a procurar [data-ceu] (depois de montar a página)
         Ceu.lock('cidade', 1, { ms: 1200 })  — fixa a cena (ignora o scroll), transição suave
         Ceu.unlock()           — volta ao scroll por [data-ceu]
         Ceu.scene              — nome da cena alvo atual
         Ceu.glitch(força, ms)  — solavanco da máquina
   Pássaros: bandos em V e pássaros soltos passam de vez em quando (param. birds).
   Cidade: a megacidade à Blade Runner 2049 (param. city), pintada ou em caracteres.
   ========================================================================== */
(function () {
  'use strict';

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /* As cenas. Cores em hex; números entre 0 e 1.
     sun: posição do sol/lua no ecrã (x 0..1, y 0..1 a contar de baixo). */
  const S = {
    aurora: { // madrugada rosa sobre montanhas azuis
      skyTop: '#46508f', skyHor: '#f4b9a7', sun: '#ffd2b0', sunPos: [0.66, 0.5], sunSize: 0.05,
      far: '#8b86b8', mid: '#5f5f98', near: '#3c4675', haze: '#e7b3b5', cloud: '#ffd9cf', water: '#7c7fb4',
      clouds: 0.35, stars: 0.18, sea: 0, wheat: 0, snow: 0.25, mtn: 1, fog: 0.75, aurora: 0, moon: 0, flowers: 0.2,
    },
    manha: { // o céu do Studio Ghibli: azul cheio e nuvens gordas
      skyTop: '#2f6fc4', skyHor: '#bfe1f2', sun: '#fff6dc', sunPos: [0.2, 0.86], sunSize: 0.04,
      far: '#93b6d6', mid: '#6f9c86', near: '#5f9a4c', haze: '#d6ecf3', cloud: '#ffffff', water: '#4f9cc4',
      clouds: 1, stars: 0, sea: 0, wheat: 0, snow: 0, mtn: 0.55, fog: 0.15, aurora: 0, moon: 0, flowers: 1,
    },
    mar: { // o Algarve ao meio-dia
      skyTop: '#2a78c2', skyHor: '#cfeaf2', sun: '#fff3d4', sunPos: [0.74, 0.8], sunSize: 0.035,
      far: '#9fbfd6', mid: '#d39a5e', near: '#c98b4f', haze: '#e3f2f6', cloud: '#ffffff', water: '#1f8fb0',
      clouds: 0.45, stars: 0, sea: 1, wheat: 0, snow: 0, mtn: 0.25, fog: 0.05, aurora: 0, moon: 0, flowers: 0,
    },
    neve: { // abril, lá em cima
      skyTop: '#5b82bd', skyHor: '#e6eef6', sun: '#ffffff', sunPos: [0.3, 0.74], sunSize: 0.03,
      far: '#a9bad3', mid: '#7f93b2', near: '#e9eff6', haze: '#eef3f8', cloud: '#f7f9fc', water: '#7aa0c8',
      clouds: 0.5, stars: 0, sea: 0, wheat: 0, snow: 1, mtn: 1.15, fog: 0.4, aurora: 0, moon: 0, flowers: 0,
    },
    trigo: { // Gladiator: o campo de trigo ao fim da tarde
      skyTop: '#4a5b9a', skyHor: '#ffc27a', sun: '#ffb35c', sunPos: [0.72, 0.42], sunSize: 0.07,
      far: '#b98a8f', mid: '#8a6a6e', near: '#d9a441', haze: '#f6c48f', cloud: '#ffd5a6', water: '#c98a6a',
      clouds: 0.4, stars: 0, sea: 0, wheat: 1, snow: 0, mtn: 0.4, fog: 0.35, aurora: 0, moon: 0, flowers: 0,
    },
    poente: { // pôr do sol cor-de-rosa
      skyTop: '#33366e', skyHor: '#f58f7c', sun: '#ffb27a', sunPos: [0.5, 0.39], sunSize: 0.08,
      far: '#9c6b8c', mid: '#6b4a73', near: '#3c2e52', haze: '#f2a08f', cloud: '#ffb1a0', water: '#a0607a',
      clouds: 0.6, stars: 0.12, sea: 0.7, wheat: 0, snow: 0, mtn: 0.6, fog: 0.3, aurora: 0, moon: 0, flowers: 0,
    },
    noite: { // estrelas, lua e a Via Láctea
      skyTop: '#0a1029', skyHor: '#2b3466', sun: '#cfd6ff', sunPos: [0.78, 0.8], sunSize: 0.03,
      far: '#262c55', mid: '#1a1f40', near: '#11152d', haze: '#2d3564', cloud: '#59608f', water: '#1b2550',
      clouds: 0.18, stars: 1, sea: 0, wheat: 0, snow: 0.2, mtn: 0.8, fog: 0.25, aurora: 0, moon: 1, flowers: 0,
    },
    boreal: { // os nórdicos: aurora boreal sobre a neve
      skyTop: '#07142a', skyHor: '#1d3b5a', sun: '#d8fff0', sunPos: [0.15, 0.85], sunSize: 0.022,
      far: '#23405e', mid: '#173049', near: '#d7e4f1', haze: '#2b4d6d', cloud: '#4d6a8a', water: '#123150',
      clouds: 0.05, stars: 0.85, sea: 0, wheat: 0, snow: 1, mtn: 0.9, fog: 0.2, aurora: 1, moon: 0.6, flowers: 0,
    },
    espaco: { // Interstellar: só céu e estrelas
      skyTop: '#04060f', skyHor: '#151a38', sun: '#ffd9a0', sunPos: [0.5, 0.62], sunSize: 0.0,
      far: '#0e1226', mid: '#0a0d1c', near: '#070914', haze: '#141a36', cloud: '#2a2f55', water: '#0a1030',
      clouds: 0, stars: 1, sea: 0, wheat: 0, snow: 0, mtn: 0.15, fog: 0, aurora: 0, moon: 0, flowers: 0,
    },
    cidade: { // Blade Runner 2049: a megacidade à noite, smog magenta, néon, chuva e spinners
      // sun = a cor do holograma (e o seu brilho no smog); sunPos.x = onde ele está
      skyTop: '#07040f', skyHor: '#40164a', sun: '#ff4fd8', sunPos: [0.76, 0.52], sunSize: 0,
      far: '#3a2050', mid: '#170c26', near: '#07050d', haze: '#8a2e7e', cloud: '#2a1238', water: '#120a24',
      clouds: 0, stars: 0, sea: 0, wheat: 0, snow: 0, mtn: 0, fog: 0, aurora: 0, moon: 0, flowers: 0, birds: 0, city: 1,
    },
  };
  // pássaros por cena (à noite quase nenhuns; no espaço e na cidade, nenhuns)
  const BIRDS = { aurora: 0.75, manha: 1, mar: 0.9, neve: 0.6, trigo: 1, poente: 0.85, noite: 0.12, boreal: 0.08, espaco: 0, cidade: 0 };
  for (const k in BIRDS) if (S[k].birds == null) S[k].birds = BIRDS[k];
  const COLOR_KEYS = ['skyTop', 'skyHor', 'sun', 'far', 'mid', 'near', 'haze', 'cloud', 'water'];
  const NUM_KEYS = ['sunSize', 'clouds', 'stars', 'sea', 'wheat', 'snow', 'mtn', 'fog', 'aurora', 'moon', 'flowers', 'birds', 'city'];
  const NUM_U = NUM_KEYS.map((k) => 'u' + k[0].toUpperCase() + k.slice(1));
  // converte uma cena para um vetor plano de números (para interpolar depressa)
  function flat(s) {
    const v = [];
    COLOR_KEYS.forEach((k) => v.push(...hex(s[k])));
    v.push(s.sunPos[0], s.sunPos[1]);
    NUM_KEYS.forEach((k) => v.push(s[k] || 0));
    return v;
  }
  const FLAT = {}; for (const k in S) FLAT[k] = flat(S[k]);

  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform float uTravel; uniform vec2 uMouse;
uniform vec3 uSkyTop, uSkyHor, uSun, uFar, uMid, uNear, uHaze, uCloud, uWater;
uniform vec2 uSunPos; uniform float uSunSize;
uniform float uClouds, uStars, uSea, uWheat, uSnow, uMtn, uFog, uAurora, uMoon, uFlowers, uBirds, uCity;
uniform float uAscii, uGlitch; uniform vec2 uCell; uniform sampler2D uGlyph;
// o que a cena pintou neste ponto (para a máquina escolher o carácter)
float gMat, gEdge, gGlit;

float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h12(i), h12(i+vec2(1,0)), u.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), u.x), u.y);
}
const mat2 R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=R*p; a*=.5; } return v; }
float fbm3(vec2 p){ float v=0., a=.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=R*p; a*=.5; } return v; }
// cumeeira: picos mais vincados que o fbm normal
float ridge(float x, float seed){
  float v=0., a=.55, f=1.;
  for(int i=0;i<5;i++){ float n = noise(vec2(x*f, seed+float(i)*7.)); n = 1.-abs(n*2.-1.); v += a*n*n; f*=2.03; a*=.48; }
  return v;
}
// aplica uma camada com borda de aguarela (pigmento acumulado no contorno)
vec3 wash(vec3 col, vec3 pig, float m, float edge){
  float rim = m*(1.-m)*4.;
  return mix(col, pig*(1.-edge*rim*.35), m);
}

/* ---------------------------------------------------------------- pássaros
   Um pássaro = duas asas curvas (gaivota). l em unidades de meia envergadura;
   w = bater de asa (-1 em baixo .. 1 em cima); aa = tamanho de um píxel. */
float bird(vec2 l, float w, float aa){
  float x = abs(l.x);
  if (x > 1.25 || abs(l.y) > 1.1) return 0.;
  float xc = min(x, 1.);
  float A = .9*w + .5, B = -(.6 + .3*w);
  float y = A*xc + B*xc*xc;
  float dy = A + 2.*B*xc;
  float d = abs(l.y - y)/sqrt(1. + dy*dy);
  d = length(vec2(max(x - 1., 0.), d));
  float th = .1*(1. - .7*xc) + .035;
  float wing = smoothstep(th + aa, th - aa*.5, d);
  float body = smoothstep(.2 + aa, .2 - aa*.5, length(l*vec2(1.5, 3.2) + vec2(0., .12)));
  return max(wing, body);
}
// bandos que atravessam o céu de vez em quando: 2 «vagas» de bandos em V (até 5) + 1 de soltos (até 2)
float birds(vec2 q, float t, float asp){
  float cov = 0.;
  float hw = asp*.5 + .12;
  for (int s=0; s<3; s++){
    float fs = float(s);
    float P = s==2 ? 11. : 32.;
    float tt = t + fs*16.3 + 6.;
    float ep = floor(tt/P); float te = tt - ep*P;
    vec2 seed = vec2(ep, fs*31.7 + 1.3);
    if (h12(seed + .3) < (s==2 ? .5 : .15)) continue;
    float dir = h12(seed + 1.1) > .5 ? 1. : -1.;
    float depth = h12(seed + 2.3);
    float span = mix(.0065, .0135, depth) * (s==2 ? 1.2 : 1.);
    float spd = max(mix(.075, .13, depth), 2.*hw/(P*.94));
    float bx = -dir*hw + dir*spd*te - uTravel*.025*(.4 + depth);
    float by = mix(.6, .88, h12(seed + 4.7)) + .012*sin(te*.45 + ep) + (h12(seed + 5.) - .5)*.003*te;
    float ext = span*(s==2 ? 9. : 11.) + .01;
    if (abs(q.x - bx) > ext || abs(q.y - by) > ext) continue;
    float nb = s==2 ? (h12(seed + 6.) > .6 ? 2. : 1.) : 3. + floor(h12(seed + 6.)*2.99);
    float alpha = mix(.5, .92, depth);
    float aa = 1.6/(uRes.y*span);
    for (int i=0; i<5; i++){
      float fi = float(i);
      if (fi >= nb) break;
      float rank = floor((fi + 1.)*.5);
      float side = mod(fi, 2.) < .5 ? 1. : -1.;
      vec2 off = s==2 ? vec2(-dir*fi*4., fi*1.4) : vec2(-dir*rank*2.6, side*rank*1.6);
      off += vec2(sin(t*.9 + fi*2.1), cos(t*.7 + fi*1.3))*.3;
      vec2 l = (q - vec2(bx, by))/span - off;
      float ph = t*(7.5 + 2.*h12(seed + fi)) + fi*1.9;
      float glide = smoothstep(.35, .85, sin(t*.4 + fi*1.3 + ep*2.));
      float w = mix(sin(ph), .2, glide);
      cov = max(cov, bird(l, w, aa)*alpha);
    }
  }
  return cov;
}

/* ---------------------------------------------------------------- a cidade
   Megacidade (Blade Runner 2049): três camadas de torres com janelas,
   letreiros de néon, um holograma rosa ao longe, spinners e chuva.
   Marca gMat 8..14 para a máquina escolher os caracteres. */
vec3 neonC(float h){ return h < .42 ? vec3(1., .184, .816) : (h < .74 ? vec3(.224, .902, 1.) : vec3(1., .62, .24)); }

vec3 city(vec3 col, vec2 q, vec2 uv, vec2 sp, float t, float asp, vec2 ms){
  float hor = .34;
  float cy = uCell.y/uRes.y, cx = uCell.x/uRes.y;
  vec3 smog = mix(uHaze, uSun, .2);
  float mat = 8., edge = 0., gi = 0.;
  // céu: o smog magenta acende o horizonte, em bandas que se arrastam
  float sky = q.y - hor;
  float smogN = fbm3(vec2(q.x*1.6 + t*.015 + uTravel*.01, q.y*5.));
  col += smog*.42*exp(-pow(max(sky, 0.)*4., 2.))*(.55 + .55*smogN);
  col = mix(col, uSkyTop, .35*smoothstep(.25, .65, sky));
  gi = clamp(dot(col, vec3(.3,.59,.11))*3., 0., 1.);
  // calma no meio do ecrã (é onde está o texto)
  float holoK = mix(.6, 1., smoothstep(.6, 1.2, asp));

  for (int L=0; L<3; L++){
    float fL = float(L);
    float W = .03*pow(1.85, fL);
    float par = uTravel*(.02 + .05*fL + .07*fL*fL) + ms.x*(1. + fL*2.5) + t*.0015*(1. + fL*2.) + fL*3.7;
    float xs = q.x + par;
    float id = floor(xs/W), u = fract(xs/W);
    float h1 = h12(vec2(id, fL*17. + 1.)), h2 = h12(vec2(id, fL*17. + 2.)), h3 = h12(vec2(id, fL*17. + 3.)), h4 = h12(vec2(id, fL*17. + 4.));
    float ux = ((id + .5)*W - par)/asp + .5;
    float side = smoothstep(.08, .42, abs(ux - .5));
    float top, gap;
    if (L == 0) { top = hor + .03 + .26*h1*h1 + .08*h2; gap = 0.; }
    else if (L == 1) { top = hor - .03 + (.12 + .34*h1)*mix(.6, 1., side); gap = step(h4, .16); }
    else { top = .1 + (.3 + .55*h1)*mix(.22, 1., side); gap = step(h4, mix(.62, .3, side)); }
    float mg = .05 + .12*h2;
    float tier = step(.55, h3)*(.025 + .05*h2)*(1. + fL*.6);
    float inner = step(.28, u)*step(u, .72);
    float topH = top - tier*(1. - inner);
    float inside = step(mg, u)*step(u, 1. - mg);
    float ant = step(.82, h3)*step(abs(u - .5), .018 + fL*.006)*step(q.y, top + .05 + .04*h1)*step(top, q.y);
    float m = max(inside*smoothstep(topH + .0012, topH - .0012, q.y), ant)*(1. - gap);
    // corpo: o smog engole as bases; a camada mais perto é quase preta
    vec3 base = L == 0 ? mix(uFar, smog, .18) : (L == 1 ? uMid : uNear);
    float low = 1. - smoothstep(0., top, q.y);
    vec3 body = mix(base, smog, (L == 0 ? .38 : (L == 1 ? .15 : .05))*low*low*mix(.45, 1., side));
    body *= .9 + .2*smoothstep(mg, 1. - mg, u)*(L == 2 ? 1. : .5);
    // luz do holograma e do néon a lamber as arestas
    body += uSun*.06*exp(-abs(q.x - sp.x)*4.)*(2. - fL)*.5;
    // janelas
    float rh = .0058*pow(1.65, fL);
    vec2 wg = vec2((u - mg)*W/(rh*.85), q.y/rh);
    vec2 wid = floor(wg), wf = fract(wg);
    float shape = step(.2, wf.x)*step(wf.x, .78)*step(.3, wf.y)*step(wf.y, .82);
    float floorOn = step(.25, h12(vec2(wid.y, id + fL*9.)));
    float hw = h12(wid*1.37 + id*7.3 + fL*41.);
    float lit = step(1. - mix(.2, .45, h2)*floorOn, hw) * step(.02, h12(wid + floor(t*.5 + hw*20.)));
    lit *= step(wg.x, (1. - 2.*mg)*W/(rh*.85) - .2)*step(q.y, topH - rh*.6);
    float hc2 = fract(hw*31.);
    vec3 wc = hc2 < .62 ? vec3(1., .7, .36) : (hc2 < .86 ? vec3(.6, .9, 1.) : vec3(1., .45, .85));
    float wb = (L == 0 ? .2 : (L == 1 ? .5 : .85))*mix(L == 0 ? .7 : .3, 1., side)*(.75 + .25*hc2);
    // prédios às riscas: andares inteiros acesos a ciano ou magenta
    float strip = step(.84, h4)*step(.72, fract(q.y/(rh*3.)))*step(q.y, topH - .01)*inside;
    vec3 sc = neonC(fract(h4*13.));
    vec3 bc = mix(body, wc*wb*1.2, lit*shape*inside);
    bc = mix(bc, sc*.8*mix(.5, 1., side), strip*.85);
    // luz vermelha no cimo das antenas
    float tip = step(.82, h3)*exp(-length(vec2((u - .5)*W, q.y - top - .05 - .04*h1))*900.)*step(.5, fract(t*.6 + h1));
    col = mix(col, bc, m);
    col += vec3(1., .2, .15)*tip*1.5;
    if (m > .5) {
      mat = 9.; gi = 0.;
      float ed = step(q.y, topH)*step(topH - q.y, cy);
      float es = step(min(abs(u - mg), abs(u - 1. + mg))*W, cx*.9);
      edge = L == 0 ? 0. : (ed > .5 ? 2. : es*step(1.5, fL));
      if (lit*shape*inside > .5 && L > 0) { mat = 10.; gi = wb*(.7 + .3*hc2); }
      if (strip > .5) { mat = 10.; gi = .9; }
    }
    if (tip > .3) { mat = 14.; gi = 1.; }
    // letreiros de néon (camadas do meio e de perto)
    if (L > 0 && h3 < .5 && gap < .5) {
      float nh = h12(vec2(id, fL*5. + 9.));
      vec3 nc = neonC(nh);
      float on = step(.07, h12(vec2(id, floor(t*2.3 + h1*9.))));
      float calm = mix(.22, 1., side);
      vec2 c0, c1;
      if (h3 < .3 || L == 1) { // vertical, de kanjis, encostado a um lado
        float sw = L == 1 ? .2 : .16;
        float sx = h2 > .5 ? mg + .03 : 1. - mg - .03 - sw;
        float len = .05 + .12*h1;
        float syc = topH - .03 - (topH*.45 - .03)*h4 - len*.5;
        c0 = vec2(sx*W, syc - len*.5); c1 = vec2((sx + sw)*W, syc + len*.5);
      } else {                  // painel horizontal
        float yy = topH - .04 - .12*h4;
        c0 = vec2((mg + .06)*W, yy - .045); c1 = vec2((1. - mg - .06)*W, yy);
      }
      vec2 lp = vec2(u*W, q.y);
      vec2 dd = max(max(c0 - lp, lp - c1), 0.);
      float dr = length(dd);
      float inS = step(dr, 0.);
      // por dentro: blocos de letras a acender
      float ch = (c1.x - c0.x);
      vec2 gq = (lp - c0)/vec2(ch, ch*1.1);
      float glyphs = step(.18, fract(gq.y))*step(.35, h12(floor(gq*vec2(3., 1.)) + id + floor(t*.7)*step(.7, h4)));
      float frame = 1. - step(.004, min(min(lp.x - c0.x, c1.x - lp.x), min(lp.y - c0.y, c1.y - lp.y)));
      float lumN = inS*(.35 + .65*max(glyphs, frame))*on;
      col = mix(col, nc*(.75 + .45*lumN), inS*on*calm);
      col += nc*exp(-dr*55.)*.45*on*(1. - inS)*calm;
      if (inS*on > .5) { mat = 11.; gi = fract(nh*7.3 + floor(gq.y)*.37); }
      else if (exp(-dr*55.)*on*calm > .32 && mat < 9.5) { mat = 12.; gi = exp(-dr*55.)*calm; }
    }

    if (L == 1) {
      // o holograma: uma figura de luz rosa, abstrata, enorme, entre as torres
      float hs = mix(.62, 1., smoothstep(.5, 1.2, asp));
      vec2 hp = vec2(sp.x + .012*sin(t*.23), hor - .14);
      float hy = (q.y - hp.y)/(.66*hs);
      float dx = (q.x - hp.x - .012*sin(hy*3. + t*.4))/hs;
      float wB = mix(.034, .07, smoothstep(.08, .5, hy)) + .012*smoothstep(.6, .74, hy) - .062*smoothstep(.75, .83, hy);
      float bodyH = exp(-pow(dx/max(wB, .01), 2.)*1.3)*smoothstep(-.03, .12, hy)*smoothstep(.86, .8, hy);
      float head = exp(-dot((q - vec2(hp.x + .01*sin(t*.31), hp.y + .66*.89*hs))*vec2(1., .8)/hs, (q - vec2(hp.x + .01*sin(t*.31), hp.y + .66*.89*hs))*vec2(1., .8)/hs)*520.);
      float f = max(bodyH, head);
      float scan = .9 + .1*sin(q.y*300. - t*3.);
      float flick = (.86 + .14*sin(t*11.)*sin(t*6.7))*(1. - .5*step(.97, h12(vec2(floor(t*8.), 1.))));
      float aura = exp(-length((q - vec2(hp.x, hp.y + .38*hs))*vec2(2.6, 1.2)/hs)*3.2);
      vec3 hcol = mix(uSun, vec3(.62, .35, 1.), clamp(smoothstep(.1, .95, hy)*.55 + (fbm3(q*vec2(14., 6.) + vec2(0., t*.3)) - .5)*.6, 0., 1.));
      float holo = (f*.8*scan*(.75 + .45*fbm3(q*vec2(30., 9.) - vec2(0., t*.6))) + aura*.28)*flick*holoK;
      col += hcol*holo;
      if (f*scan*flick > .22) { mat = 13.; gi = f*scan; }
      // a seguir ao fundo, mais smog
      col = mix(col, smog*.8, .12*(1. - smoothstep(hor - .1, hor + .2, q.y)));
    }
    if (L == 1) {
      // spinners: luzes a voar, com rasto
      for (int k=0; k<6; k++){
        float fk = float(k);
        float dir = h12(vec2(fk, 7.7)) > .5 ? 1. : -1.;
        float spd = .035 + .07*h12(vec2(fk, 3.3));
        float span = asp + .8;
        float vx = dir*(mod(h12(vec2(fk, 5.1))*span + t*spd, span) - span*.5);
        float vy = hor + .06 + .5*h12(vec2(fk, 9.9)) + .012*sin(t*.5 + fk*2.);
        vec2 d = q - vec2(vx, vy);
        if (abs(d.y) > .03 || abs(d.x) > .2) continue;
        vec3 lc = (k == 1 || k == 4) ? vec3(1., .3, .25) : (k == 2 ? vec3(.4, .95, 1.) : vec3(1., .9, .75));
        float r = length(d);
        float core = exp(-r*r*70000.);
        float glow = exp(-r*95.)*.45;
        float bxx = -d.x*dir;
        float trail = step(0., bxx)*exp(-bxx*16.)*exp(-pow(d.y/.0016, 2.))*.55;
        float blink = .75 + .25*step(.5, fract(t*1.7 + fk*.3));
        col += lc*(core*1.4 + glow + trail)*blink;
        if (abs(d.x) < cx*.6 && abs(d.y) < cy*.5) { mat = 14.; gi = 1.; }
        else if (bxx > 0. && bxx < .1 && abs(d.y) < cy*.5 && mat < 9.5) { mat = 14.; gi = .45*exp(-bxx*12.); }
      }
    }
  }
  // chuva diagonal (duas camadas)
  for (int k=0; k<2; k++){
    float fk = float(k);
    float sc = 1. + fk*.9;
    vec2 r = vec2(q.x - q.y*.2, q.y);
    float cw = .0055*sc;
    float lane = floor(r.x/cw);
    float hl = h12(vec2(lane, fk*7. + 3.));
    float lx = abs(fract(r.x/cw) - .5)*cw;
    float f = fract((r.y + t*(1.1 + .5*hl)*sc*.8 + hl*13.)/(.55*sc));
    float len = .16;
    float streak = step(.62, hl)*step(f, len)*(1. - f/len)*smoothstep(.0007*sc, 0., lx);
    col += vec3(.62, .6, .95)*streak*(.16 + .12*fk);
  }
  // o meio fica mais escuro e calmo; nevoeiro rasteiro magenta em baixo
  col *= 1. - .45*exp(-pow((uv.x - .5)*2.2, 2.))*smoothstep(.12, .45, uv.y)*smoothstep(1., .7, uv.y);
  col += smog*.12*exp(-q.y*9.);
  gMat = mat; gEdge = edge; gGlit = gi;
  return col;
}

vec3 scene(vec2 fc){
  gMat = 0.; gEdge = 0.; gGlit = 0.;
  vec2 uv = fc / uRes;
  float cy = uCell.y / uRes.y;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x-.5)*asp, uv.y);
  float t = uTime;
  vec2 ms = (uMouse-.5)*vec2(.018,.01);
  // tremura de papel molhado
  vec2 wob = vec2(fbm3(p*5.+1.7), fbm3(p*5.+9.2)) - .5;
  vec2 q = p + wob*.01;

  float hor = .34;
  float sy = clamp((q.y-hor)/(1.-hor), 0., 1.);
  vec3 col = mix(uSkyHor, uSkyTop, pow(sy, .62));
  // luz difusa a subir do horizonte
  col = mix(col, uHaze, .25*exp(-sy*5.));

  vec2 sp = vec2((uSunPos.x-.5)*asp, uSunPos.y) + ms*.4;
  float sd = length(q - sp);
  col += uSun * (.42*exp(-sd*3.) + .22*exp(-sd*10.)) * (1.-uMoon*.55) * (1.-uCity*.75);

  // estrelas e Via Láctea
  if (uStars > .01) {
    vec2 sq = q*vec2(1., 1.) + vec2(uTravel*.004, 0.);
    float band = exp(-pow((q.y - .62 - (q.x)*.28)*3.2, 2.));
    float neb = fbm(sq*3.+3.) * band;
    col += (vec3(.55,.5,.85)*neb*.55 + vec3(.9,.7,.8)*pow(neb,3.)*.6) * uStars;
    for (int k=0;k<2;k++){
      float sc = k==0 ? 140. : 300.;
      vec2 g = sq*sc; vec2 id = floor(g); vec2 f = fract(g)-.5;
      float h = h12(id + float(k)*17.);
      float on = step(k==0 ? .965 : .985 - band*.05, h);
      vec2 o = vec2(h12(id+3.1), h12(id+7.7))-.5;
      float d = length(f - o*.6);
      float tw = .55 + .45*sin(t*(1.+h*4.) + h*60.);
      col += on * smoothstep(k==0 ? .14 : .1, 0., d) * tw * uStars * (k==0 ? 1.3 : .8) * mix(vec3(1.,.9,.8), vec3(.8,.9,1.), h);
    }
  }

  // aurora boreal: cortinas verdes e magenta
  if (uAurora > .01) {
    for (int k=0;k<3;k++){
      float fk = float(k);
      float cx = q.x*1.2 + fk*.7;
      float yc = .64 + fk*.07 + .08*sin(cx*2.3 + t*.08 + fk) + .05*(fbm3(vec2(cx*1.5, t*.03+fk))-.5);
      float dy = q.y - yc;
      float curtain = smoothstep(-.02, .0, dy) * exp(-max(dy,0.)*7.) ;
      float rays = .55 + .45*fbm3(vec2(cx*18., t*.25 + fk*3.));
      vec3 ac = mix(vec3(.2,1.,.65), vec3(.85,.35,1.), smoothstep(.02,.16,dy));
      col += ac * curtain * rays * .5 * uAurora;
    }
  }

  // sol ou lua
  if (uSunSize > .001) {
    float disc = smoothstep(uSunSize, uSunSize*.86, sd);
    vec3 moon = vec3(.96,.94,.88) - fbm(q*40.)*.18;
    vec3 sun = uSun*1.15 + .1;
    col = mix(col, mix(sun, moon, uMoon), disc);
    if (disc > .5) gMat = 7.;
  }

  // nuvens (duas camadas, iluminadas do lado do sol)
  if (uClouds > .01) {
    // cúmulos: base plana, topo fofo (como nos filmes do Ghibli)
    for (int k=0;k<2;k++){
      float fk = float(k);
      float sx = 1.5 + fk*.9;
      vec2 cp = vec2(q.x*sx + t*.007*(1.+fk) + uTravel*(.04+fk*.05) + fk*5., q.y*(2.2+fk*.6));
      float base = hor + .14 + fk*.22 + .03*sin(cp.x*.7);
      float above = q.y - base;
      float d = fbm(cp + vec2(0., -t*.004));
      // a nuvem nasce numa linha plana e incha para cima
      float body = d - smoothstep(0., .26 - fk*.06, above)*.55 + smoothstep(.0, .02, above)*.12 - smoothstep(0., -.012, above)*1.;
      float thr = mix(.62, .38, uClouds);
      float m = smoothstep(thr, thr+.035, body);
      if (m*clamp(uClouds*1.6,0.,1.) > .5) gMat = 1.;
      vec2 ts = normalize(sp - q + vec2(0.0001))*.045;
      float d2 = fbm(cp + vec2(ts.x*sx, ts.y*(2.2+fk*.6)) + vec2(0., -t*.004));
      float lit = clamp(.6 + (d - d2)*9. + above*1.2, 0., 1.);
      vec3 shade = mix(uCloud, mix(uSkyTop, uHaze, .4), .42);
      vec3 cc = mix(shade, uCloud, smoothstep(.25, .8, lit));
      cc += uSun*.18*pow(lit, 3.)*(1.-uMoon);
      // um fio de luz na borda virada para o sol
      cc = mix(cc, uCloud + uSun*.25, smoothstep(thr+.03, thr, body)*m*.5);
      col = wash(col, cc, m*clamp(uClouds*1.6,0.,1.), .6);
    }
  }

  // pássaros (só na aguarela: desaparecem quando a máquina toma conta)
  if (uBirds > .01 && uAscii < .6) {
    float bc = birds(q, t, asp) * uBirds * (1. - smoothstep(.05, .6, uAscii));
    vec3 ink = mix(vec3(.09, .09, .15), uSkyTop*.4, .35);
    col = mix(col, ink, bc);
  }

  vec3 skyCol = col;
  if (uCity < .999) {
  // montanhas: longe, meio
  float x = q.x;
  float hFar = hor - .02 + uMtn*(.05 + .26*ridge(x*.9 + uTravel*.012 + ms.x, 3.));
  float mFar = smoothstep(hFar+.0025, hFar-.0025, q.y);
  vec3 cFar = mix(uFar, uHaze, .35) * (.92 + .16*fbm3(vec2(x*8., q.y*20.)));
  float snowLine = hFar - .05 - .04*fbm3(vec2(x*12., 1.));
  float snow = uSnow * smoothstep(snowLine-.01, snowLine+.01, q.y) * smoothstep(hor+.08, hor+.2, hFar);
  cFar = mix(cFar, mix(vec3(.97,.98,1.), uHaze, .25), snow);
  col = wash(col, cFar, mFar, 1.);
  if (mFar > .5) { gMat = 2.; gEdge = step(hFar - q.y, cy); }
  col = mix(col, uHaze, uFog*.55*smoothstep(hFar-.02, hor-.02, q.y)*mFar);

  float hMid = hor - .05 + uMtn*(.03 + .17*ridge(x*1.5 + uTravel*.035 + ms.x*2., 11.));
  float mMid = smoothstep(hMid+.003, hMid-.003, q.y);
  vec3 cMid = uMid * (.86 + .22*fbm3(vec2(x*6., q.y*14.)));
  float snowM = uSnow*.8 * smoothstep(hMid-.06, hMid-.03, q.y + .03*fbm3(vec2(x*14., 4.))) * smoothstep(hor+.05, hor+.14, hMid);
  cMid = mix(cMid, vec3(.95,.97,1.), snowM);
  col = wash(col, cMid, mMid, 1.);
  if (mMid > .5) { gMat = 3.; gEdge = step(hMid - q.y, cy); }
  // nevoeiro no vale
  float fogBand = exp(-pow((q.y - hor + .01)*14., 2.)) * (.6 + .4*fbm3(vec2(x*2. + t*.01 + uTravel*.05, q.y*9.)));
  col = mix(col, uHaze, uFog*fogBand*.8);

  // mar
  if (uSea > .01) {
    float below = smoothstep(hor+.002, hor-.002, q.y);
    float dpt = clamp((hor - q.y)/hor, 0., 1.);
    vec3 sea = mix(mix(uSkyHor, uWater, .55), uWater*.7, pow(dpt, .6));
    float waves = fbm(vec2(q.x*10./(.15+dpt), q.y*90. + t*.6));
    sea += (waves-.5)*.08;
    float glit = exp(-abs(q.x - sp.x)*(6. + 18.*dpt)) * smoothstep(.55,.85, noise(vec2(q.x*60., q.y*260. - t*1.5)));
    sea += uSun*glit*.9*(1.-dpt*.5);
    col = mix(col, sea, below*uSea);
    if (below*uSea > .5) { gMat = 4.; gEdge = 0.; gGlit = glit; }
  }

  // colinas perto (relva, trigo ou neve)
  float xn = x + uTravel*.11 + ms.x*4.;
  float hNear = hor - .13 - uSea*.1 + .2*fbm(vec2(xn*1.05, 21.)) + .045*sin(xn*1.7 + 1.);
  float mNear = smoothstep(hNear+.003, hNear-.003, q.y);
  float dn = clamp((hNear - q.y)/max(hNear,.01), 0., 1.);
  // luz no cimo da colina, sombra em baixo, pinceladas pelo meio
  vec3 cNear = uNear * (.8 + .32*fbm3(vec2(xn*4., q.y*10.))) * mix(1.12, .78, smoothstep(0., .9, dn));
  cNear = mix(cNear, uHaze, .18*exp(-dn*9.));
  // neve no chão: sombras azuis
  cNear = mix(cNear, cNear*mix(vec3(.82,.88,1.), vec3(1.), fbm3(vec2(xn*3., q.y*7.))), uSnow);
  // trigo: espigas a balançar ao vento
  if (uWheat > .01) {
    float sway = sin(t*1.1 + xn*2.4 - q.y*3.)*.006*(1.-dn*.6);
    vec2 wp = vec2((xn + sway)*(38. + dn*55.), q.y*(2.5 + dn*4.));
    float stalk = noise(wp) * .6 + noise(wp*vec2(2.3, 1.7) + 4.) * .4;
    float gust = fbm3(vec2(xn*1.6 - t*.15, q.y*2.));
    vec3 gold = mix(uNear*.6, uNear*1.18, smoothstep(.25, .8, stalk));
    gold = mix(gold, uNear*1.25 + uSun*.15, smoothstep(.55, .8, gust)*.45);
    gold = mix(gold, uSun*.85 + .12, .3*exp(-dn*6.));
    gold *= mix(1., .55, smoothstep(.4, 1., dn));
    cNear = mix(cNear, gold, uWheat);
  }
  // florinhas no prado
  if (uFlowers > .01) {
    vec2 fg = vec2(xn, q.y)*vec2(170., 170.); vec2 fid = floor(fg);
    float fh = h12(fid);
    float fl = step(.93, fh) * smoothstep(.36, .1, length(fract(fg)-.5)) * smoothstep(.0, .25, dn);
    vec3 fc = mix(vec3(1.,.72,.8), vec3(1.,.95,.75), h12(fid+2.));
    cNear = mix(cNear, fc, fl*uFlowers);
  }
  col = wash(col, cNear, mNear, 1.);
  if (mNear > .5) { gMat = 5.; gEdge = step(hNear - q.y, cy)*2.; }

  // primeiro plano: erva escura a emoldurar o fundo
  float xf = x + uTravel*.26;
  float hFront = .06 + .05*fbm3(vec2(xf*1.4, 33.)) + .05*pow(abs(uv.x*2.-1.), 3.);
  float blades = fbm3(vec2(xf*90., t*.15));
  hFront += (blades-.4)*.05*(1.-uSnow*.6);
  float mFront = smoothstep(hFront+.003, hFront-.003, q.y);
  vec3 cFront = mix(uNear*.45, mix(uMid, vec3(0.), .45), .5);
  cFront = mix(cFront, vec3(.86,.9,.97), uSnow*.7);
  col = wash(col, cFront, mFront*(1.-uSea*.6), 1.);
  if (mFront*(1.-uSea*.6) > .5) { gMat = 6.; gEdge = 0.; }
  }
  // a megacidade por cima do mesmo céu
  if (uCity > .001) {
    float m0 = gMat, e0 = gEdge, g0 = gGlit;
    vec3 cc = city(skyCol, q, uv, sp, t, asp, ms);
    col = uCity > .999 ? cc : mix(col, cc, uCity);
    if (uCity < .5) { gMat = m0; gEdge = e0; gGlit = g0; }
  }

  // grão do papel e vinheta
  float grain = h12(fc) - .5;
  float fiber = fbm3(p*vec2(60., 140.)) - .5;
  col += grain*.035 + fiber*.035;
  float vig = smoothstep(1.25, .35, length((uv-.5)*vec2(1.,1.2)));
  col *= mix(.78, 1., vig);
  return clamp(col, 0., 1.);
}

/* ---------------------------------------------------------------- a máquina
   Atlas (uma linha de 32 caixas): 0-10 rampa " .·:-=+*#%@", 11 '0', 12 '1',
   13 '~', 14 '^', 15 '/', 16 '|', 17 '\', 18 ',', 19 "'", 20 '_', 21 'o', 22 '"',
   23 '[', 24 ']', 25 '$', 26 '&', 27-30 katakana KA TA RI NA, 31 kanji AI (letreiros da cidade) */
float glyph(float idx, vec2 l){
  l = clamp(l, vec2(.03, .02), vec2(.97, .98));
  return texture2D(uGlyph, vec2((idx + l.x)/32., l.y)).r;
}
vec3 boost(vec3 c){
  float l = dot(c, vec3(.3,.59,.11));
  vec3 s = max(mix(vec3(l), c, 1.4), 0.);
  float mx = max(s.r, max(s.g, s.b));
  return clamp(s * mix(1.2, 1./max(mx, .06), .45), 0., 1.);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float G = uGlitch;
  float tq = floor(uTime*16.);
  float band = 0., bandOn = 0.;
  // glitch: faixas horizontais deslocadas
  if (G > .002) {
    float bh = uRes.y*(.012 + .05*h12(vec2(tq, 3.1)));
    band = floor(fc.y / bh);
    float r = h12(vec2(band, tq));
    bandOn = step(1. - G*.6, r);
    fc.x += (h12(vec2(band, tq + 1.7)) - .5) * bandOn * G * uRes.x * .14;
  }
  vec2 cell = floor(fc / uCell);
  vec2 cuv = (cell + .5) * uCell / uRes;
  float hc = h12(cell + 7.13);
  // a fronteira entre o pintado e o calculado sobe do chão, carácter a carácter
  float front = cuv.y*.66 + h12(cell)*.2 + noise(cell*.09 + vec2(uTime*.05, 0.))*.14;
  float isA = step(front, uAscii*1.04 - .02);
  if (G > .002) isA = max(isA, step(1. - G*G*.14, h12(cell + tq*.37)));

  vec3 col;
  if (isA < .5) {
    col = scene(fc);
    if (G > .002) {
      col = mix(col, vec3(col.r*1.22, col.g*.88, col.b*1.25), bandOn*G*.7);
      col *= 1. - G*.16*step(.5, fract(fc.y/3.));
    }
  } else {
    vec3 c = scene((cell + .5) * uCell);
    vec2 l = fract(fc / uCell);
    float lum = dot(c, vec3(.3,.59,.11));
    // densidade relativa ao brilho da própria cena: o céu de dia fica leve, as nuvens e o sol cheios
    vec3 W = vec3(.3,.59,.11);
    float ref = max(max(dot(uSkyHor, W), dot(uSkyTop, W)), max(dot(uCloud, W)*.85, .22));
    float rel = clamp(lum / (ref*1.08), 0., 1.);
    float idx = floor(clamp(pow(rel, 1.55)*1.06, 0., .999)*11.);
    vec3 gc = boost(c);
    // na fusão: glifos escuros sobre o claro, claros sobre o escuro
    gc = mix(gc, lum > .42 ? c*.52 : c*1.45 + .1, 1. - smoothstep(.55, .95, uAscii));
    if (gMat > 7.5) {
      // a cidade: fundo quase preto, cores de néon vivas
      bool rainy = false;
      if (gMat < 8.5) {          // céu e smog
        idx = gGlit > .6 ? (hc > .82 ? 3. : (hc > .55 ? 2. : 0.)) : (gGlit > .35 ? (hc > .8 ? 1. : 0.) : (hc > .993 ? 1. : 0.));
        gc = boost(c)*.8;
        rainy = true;
      } else if (gMat < 9.5) {   // corpo das torres: escuro, só as arestas
        idx = gEdge > 1.5 ? 20. : (gEdge > .5 ? 16. : (hc > .9 ? 1. : 0.));
        gc = boost(c)*.5 + vec3(.06, .02, .1);
        if (gEdge > .5) gc = mix(gc, vec3(.75, .45, 1.), .35);
        rainy = true;
      } else if (gMat < 10.5) {  // janelas acesas
        idx = gGlit > .7 ? (hc > .5 ? 8. : 5.) : (gGlit > .4 ? (hc > .5 ? 3. : 6.) : (hc > .5 ? 1. : 2.));
        gc = boost(c)*(.6 + .5*gGlit);
      } else if (gMat < 11.5) {  // letreiros: kanjis e @
        idx = gGlit < .62 ? 27. + floor(gGlit/.62*4.99) : (gGlit < .82 ? 10. : 8.);
        gc = min(boost(c)*1.15 + .08, 1.);
      } else if (gMat < 12.5) {  // halo do néon
        idx = gGlit > .55 ? 7. : (gGlit > .42 ? 6. : 2.);
        gc = boost(c);
        rainy = true;
      } else if (gMat < 13.5) {  // o holograma
        idx = floor(1. + clamp(gGlit, 0., 1.)*6.5 - hc*1.5);
        if (hc > .93) idx = hc > .965 ? 11. : 12.;
        gc = mix(boost(c), vec3(1., .8, .97), .25*gGlit);
      } else {                   // spinners
        idx = gGlit > .8 ? 7. : (gGlit > .3 ? 5. : 4.);
        gc = boost(c) + .15;
      }
      // chuva digital: riscos «/» a descer na diagonal
      if (rainy) {
        float lane = floor(cell.x - cell.y*.5);
        float hl = h12(vec2(lane, 5.3));
        float per = 26. + 18.*hl;
        float fr = mod(cell.y + uTime*(9. + 7.*hl) + hl*97., per);
        float rl = 3. + 4.*fract(hl*13.);
        float calmR = mix(.8, .55, smoothstep(.12, .4, abs(cuv.x - .5)));
        if (hl > calmR && fr < rl) {
          idx = 15.;
          gc = mix(vec3(.55, .6, 1.), vec3(.85, .95, 1.), 1. - fr/rl) * (.45 + .55*(1. - fr/rl));
        }
      }
    } else if (gMat > 6.5) {
      idx = uMoon > .5 ? (rel > .8 ? 10. : 21.) : 10.;
    } else if (gMat < .5) {
      idx = max(min(idx, 8.) - floor(hc*2.2), 0.);
      // céu: um ou outro dígito, e as estrelas viram asteriscos
      if (hc > .988) idx = hc > .994 ? 11. : 12.;
      if (uStars > .01) {
        float hs = h12(cell*1.31 + .7);
        float tw = .55 + .45*sin(uTime*(1. + hs*5.) + hs*80.);
        if (hs > 1. - .05*uStars) {
          idx = hs > 1. - .012*uStars ? 7. : (hs > 1. - .028*uStars ? 6. : 1.);
          gc = mix(vec3(1., .93, .85), vec3(.85, .92, 1.), fract(hs*91.)) * (.6 + .4*tw);
        }
      }
    } else if (gMat < 1.5) {
      idx = clamp(min(idx, 8.) - floor(hc*2.6), 3., 8.);
    } else if (gMat < 3.5) {
      idx = clamp(min(idx, 8.) - floor(hc*2.4), 2., 8.);
      if (gEdge > .5) idx = 14.;
    } else if (gMat < 4.5) {
      if (gGlit > .25) { idx = 7.; gc = vec3(1., .97, .85); }
      else if (idx > 1. && idx < 9.) idx = hc > .45 ? 13. : (hc > .2 ? 4. : 5.);
    } else if (gMat < 5.5) {
      idx = max(idx, 2.);
      if (uWheat > .5) idx = hc > .62 ? 15. : (hc > .18 ? 16. : 19.);
      else if (gEdge > 1.5) idx = 20.;
      else if (uSnow < .5 && idx > 2.) idx = hc > .7 ? 22. : idx;
      if (uFlowers > .01 && hc < .07*uFlowers) { idx = hc < .025*uFlowers ? 21. : 7.; gc = mix(vec3(1., .62, .76), vec3(1., .9, .55), fract(hc*173.)); }
    } else {
      idx = hc > .55 ? 22. : (hc > .25 ? 18. : 19.);
      gc = max(gc, c*1.6 + vec3(.05, .07, .11));
    }
    float m = glyph(idx, l);
    vec3 mm = vec3(m);
    if (G > .002) mm = vec3(glyph(idx, l + vec2(G*.3, 0.)), m, glyph(idx, l - vec2(G*.3, 0.)));
    // na fusão o fundo fica perto da tinta da paisagem; com tudo em caracteres, é ecrã escuro
    vec3 bg = mix(vec3(.02, .026, .06), c, mix(.86, .2, smoothstep(.55, .95, uAscii)));
    col = mix(bg, gc, mm);
    // linhas de ecrã, muito leves
    col *= .95 + .05*sin(fc.y*3.14159*2./max(uCell.y*.5, 1.));
  }
  if (G > .002) col *= 1. - G*.25*step(.93, h12(vec2(floor(fc.y/2.), tq)));
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

  const st = {
    gl: null, prog: null, u: {}, canvas: null, marks: [], cur: null, target: null,
    travel: 0, mouse: [0.5, 0.5], mouseT: [0.5, 0.5], t0: performance.now(), last: 0, scale: 1,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, visible: true,
    ascii: 0, asciiPrev: 0, pulse: null, glitch: 0, tex: null,
    lock: null, sceneName: 'aurora', travelOff: 0,
  };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const asciiOf = (n) => clamp01(parseFloat(n.dataset.ascii) || 0);

  /* o atlas dos caracteres da máquina: 32 caixas de 32×64 numa só linha */
  const ATLAS = [' ', '.', '·', ':', '-', '=', '+', '*', '#', '%', '@', '0', '1', '~', '^', '/', '|', String.fromCharCode(92), ',', "'", '_', 'o', '"',
    '[', ']', '$', '&', '\u30AB', '\u30BF', '\u30EA', '\u30CA', '\u611B'];
  // tamanho da célula em píxeis do canvas (inteiro: o atlas é desenhado à mesma escala, 1 para 1)
  function cellPx() {
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    return [Math.max(4, Math.round((small ? 8.5 : 10) * st.scale)), Math.max(7, Math.round((small ? 14 : 17) * st.scale))];
  }
  function buildAtlas() {
    const gl = st.gl; if (!gl) return;
    const [W, H] = cellPx();
    st.cell = [W, H];
    const c = document.createElement('canvas'); c.width = 32 * W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, H);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const fs = Math.min(H * 0.86, W / 0.6);
    x.font = `500 ${fs.toFixed(1)}px "Spline Sans Mono", ui-monospace, Menlo, Consolas, monospace`;
    // os kanjis são largos: apertam-se na caixa
    ATLAS.forEach((ch, i) => { if (ch.charCodeAt(0) > 255) x.fillText(ch, i * W + W / 2, H * 0.54, W * 0.96); else x.fillText(ch, i * W + W / 2, H * 0.54); });
    if (!st.tex) st.tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, st.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }


  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function resize() {
    const c = st.canvas, small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // com caracteres no ecrã a máquina precisa de mais píxeis para as letras ficarem nítidas
    if (st.hi) st.scale = small ? Math.min(dpr, 2) * 0.62 : Math.min(1.25, dpr) * 0.9;
    else st.scale = small ? 0.55 : Math.min(1, 1.25 / dpr) * dpr * 0.75;
    const w = Math.max(2, Math.round(window.innerWidth * st.scale)), h = Math.max(2, Math.round(window.innerHeight * st.scale));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    st.gl.viewport(0, 0, w, h);
    const cp = cellPx();
    if (!st.cell || cp[0] !== st.cell[0] || cp[1] !== st.cell[1]) buildAtlas();
  }

  function scan() {
    st.marks = [...document.querySelectorAll('[data-ceu]')].filter((n) => FLAT[n.dataset.ceu]);
  }

  // qual a cena para o scroll atual: interpola entre as duas secções à volta do meio do ecrã
  function targetScene() {
    const H = window.innerHeight, mid = H * 0.78, m = st.marks;
    const vec = (n) => FLAT[n.dataset.ceu].concat(asciiOf(n));
    if (!m.length) { st.sceneName = 'aurora'; return FLAT.aurora.concat(0); }
    const c = m.map((n) => { const r = n.getBoundingClientRect(); return r.top + Math.min(r.height, H) * 0.5; });
    if (mid <= c[0]) { st.sceneName = m[0].dataset.ceu; return vec(m[0]); }
    for (let i = 0; i < m.length - 1; i++) {
      if (mid >= c[i] && mid <= c[i + 1]) {
        let k = (mid - c[i]) / Math.max(1, c[i + 1] - c[i]);
        // fica mais tempo em cada cena e passa depressa no meio
        k = Math.min(1, Math.max(0, (k - 0.3) / 0.4)); k = k * k * (3 - 2 * k);
        const a = vec(m[i]), b = vec(m[i + 1]);
        st.sceneName = (k < 0.5 ? m[i] : m[i + 1]).dataset.ceu;
        return a.map((v, j) => v + (b[j] - v) * k);
      }
    }
    st.sceneName = m[m.length - 1].dataset.ceu;
    return vec(m[m.length - 1]);
  }
  // a cena fixada por Ceu.lock: interpolação no tempo (suave) entre onde estava e o destino
  function lockScene(now) {
    const L = st.lock;
    let k = L.ms > 0 ? Math.min(1, (now - L.t0) / L.ms) : 1;
    k = k * k * k * (k * (k * 6 - 15) + 10);
    return L.from.map((v, j) => v + (L.to[j] - v) * k);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!st.visible || document.hidden) return;
    const dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now;
    const gl = st.gl, u = st.u;
    st.target = st.lock ? lockScene(now) : targetScene();
    const k = st.reduced || st.lock ? 1 : 1 - Math.exp(-dt * 3.4);
    if (!st.cur) st.cur = st.target.slice();
    for (let i = 0; i < st.cur.length; i++) st.cur[i] += (st.target[i] - st.cur[i]) * k;
    // fixada, a viagem continua devagar para a paisagem não parar
    if (st.lock && !st.reduced) st.travelOff += dt * 0.03;
    const travelTarget = window.scrollY / Math.max(1, window.innerHeight) + st.travelOff;
    st.travel += (travelTarget - st.travel) * (st.reduced ? 1 : 1 - Math.exp(-dt * 5));
    st.mouse[0] += (st.mouseT[0] - st.mouse[0]) * (1 - Math.exp(-dt * 2));
    st.mouse[1] += (st.mouseT[1] - st.mouse[1]) * (1 - Math.exp(-dt * 2));

    const v = st.cur; let j = 0;
    const names = ['uSkyTop', 'uSkyHor', 'uSun', 'uFar', 'uMid', 'uNear', 'uHaze', 'uCloud', 'uWater'];
    for (const n of names) { gl.uniform3f(u[n], v[j], v[j + 1], v[j + 2]); j += 3; }
    gl.uniform2f(u.uSunPos, v[j], v[j + 1]); j += 2;
    for (const n of NUM_U) gl.uniform1f(u[n], v[j++]);
    // a máquina: quanto da paisagem já é feito de caracteres, e o glitch da passagem
    const a = clamp01(v[j]);
    if ((a > 0.02) !== !!st.hi) { st.hi = a > 0.02; resize(); }
    const speed = Math.abs(a - st.asciiPrev) / Math.max(dt, 1e-3); st.asciiPrev = a; st.ascii = a;
    let g = 0;
    if (!st.reduced) {
      if (a > 0.05 && a < 0.95) g = Math.min(0.32, speed * 0.55) * 4 * a * (1 - a);
      if (st.pulse) {
        const k = (now - st.pulse.t0) / st.pulse.ms;
        if (k >= 1) st.pulse = null;
        else g = Math.max(g, st.pulse.s * Math.pow(1 - k, 1.6) * (0.55 + 0.45 * Math.abs(Math.sin(now * 0.031))));
      }
    }
    st.glitch += (g - st.glitch) * (g > st.glitch ? 1 : 1 - Math.exp(-dt * 8));
    gl.uniform1f(u.uAscii, a);
    gl.uniform1f(u.uGlitch, st.glitch);
    gl.uniform2f(u.uCell, st.cell[0], st.cell[1]);
    gl.uniform2f(u.uRes, st.canvas.width, st.canvas.height);
    gl.uniform1f(u.uTime, st.reduced ? 20 : (now - st.t0) / 1000);
    gl.uniform1f(u.uTravel, st.travel);
    gl.uniform2f(u.uMouse, st.mouse[0], st.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const Ceu = {
    scenes: S,
    init(canvas) {
      st.canvas = canvas;
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('Sem WebGL');
      st.gl = gl;
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog); st.prog = prog;
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uTime', 'uTravel', 'uMouse', 'uSkyTop', 'uSkyHor', 'uSun', 'uFar', 'uMid', 'uNear', 'uHaze', 'uCloud', 'uWater', 'uSunPos',
        ...NUM_U, 'uAscii', 'uGlitch', 'uCell', 'uGlyph'].forEach((n) => { st.u[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(st.u.uGlyph, 0);
      if (document.fonts && document.fonts.load) document.fonts.load('500 44px "Spline Sans Mono"').then(buildAtlas, () => {});
      resize(); scan();
      window.addEventListener('resize', resize);
      window.addEventListener('pointermove', (e) => { st.mouseT = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight]; }, { passive: true });
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); st.visible = false; });
      requestAnimationFrame(frame);
      return true;
    },
    scan,
    /* um solavanco da máquina: glitch(força 0..1, duração em ms) */
    glitch(strength = 1, ms = 1400) {
      if (st.reduced) return;
      st.pulse = { s: clamp01(strength), ms: Math.max(60, ms), t0: performance.now() };
    },
    // 0 = tudo pintado, 1 = tudo em caracteres (valor suavizado do scroll)
    get ascii() { return st.ascii; },
    // para outras partes da página saberem a cena atual (ex.: cor do texto)
    get travel() { return st.travel; },
    /* fixa a cena (e quanto dela é máquina), ignorando o scroll; transição de ms */
    lock(scene, ascii = 0, { ms = 1200 } = {}) {
      if (!FLAT[scene]) return false;
      const from = (st.cur || (st.lock ? lockScene(performance.now()) : targetScene())).slice();
      st.lock = { name: scene, from, to: FLAT[scene].concat(clamp01(+ascii || 0)), t0: performance.now(), ms: st.reduced ? 0 : Math.max(0, +ms || 0) };
      return true;
    },
    /* volta ao scroll por [data-ceu] (a transição é a suavização normal) */
    unlock() { st.lock = null; },
    get locked() { return !!st.lock; },
    // nome da cena alvo (a fixada, ou a mais perto do scroll)
    get scene() { return st.lock ? st.lock.name : st.sceneName; },
    // só para testes: avança o relógio da paisagem (ex.: para apanhar um bando)
    _skip(sec) { st.t0 -= sec * 1000; },
  };
  window.Ceu = Ceu;
})();
