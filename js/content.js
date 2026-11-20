/* ==========================================================================
   A ESTRUTURA DO LIVRO — que páginas há, por que ordem, com que fotografias.

   OS TEXTOS NÃO SE ESCREVEM AQUI: estão na pasta textos/ (um ficheiro por texto).
   Aqui, '@1-livro/03-carta-de-abertura' quer dizer «o texto do ficheiro
   textos/1-livro/03-carta-de-abertura.txt». '@@...' é uma lista (um item por parágrafo).
   Lê textos/LEIA-ME.txt.

   Aqui só mexes para mudar a ORDEM das páginas, as FOTOGRAFIAS de cada momento,
   ou os poemas dos poetas.

   ceu: a paisagem por trás de cada página:
        'aurora', 'manha', 'mar', 'neve', 'trigo', 'poente', 'noite', 'boreal', 'espaco', 'cidade'
   ========================================================================== */
window.CONTENT = {
  ela: 'Catarina',
  ele: 'Diogo',
  alcunhas: { dela: 'tchtchiboa', dele: 'chichiboo' },

  // Dia em que tudo começou (ano, mês, dia).
  inicio: [2022, 11, 20],

  /* Música (YouTube só toca com a página online). Para um mp3: { nome: '...', ficheiro: 'assets/musica/x.mp3' } */
  musicas: [
    { nome: 'Calming Meditation', youtube: 'uwEaQk5VeS4' },
    { nome: 'Idea 22', youtube: 'lfdiha7QFSo' },
    { nome: 'Floating in Reverie', youtube: 'bQE2ptNiQ9s' },
    { nome: 'Honor Him', youtube: 'b-ZDNzwXaQg' },
    { nome: 'Now We Are Free', youtube: 'h5SRTD_rapQ' },
    { nome: 'Cornfield Chase', youtube: 'JuSsvM8B4Jc' },
    { nome: "One Summer's Day", youtube: '-ZleCZAeINY' },
    { nome: 'Merry-Go-Round of Life', youtube: 'KeAFDXMcjLQ' },
    { nome: 'The Immigrant', youtube: 'IimjCj13ft0' },
    { nome: 'After Dark x Sweater Weather', youtube: 'hvL-2TF9bLY' },
  ], // a lista aparece por ordem alfabética (o main.js ordena)
  musicaInicial: 'Honor Him', // nome da música que toca ao início

  // A capa (ecrã de abertura)
  porta: {
    para: 'Diogo e Catarina',
    subtitulo: 'Quatro anos de nós',
    nota: '@1-livro/00-nota-da-capa',
    botao: 'Abrir o livro',
    sticker: 'I <3 U', // o autocolante no computador
  },

  /* ##################################################################
     PARTE UM — O LIVRO (o mundo dela)
     Folheia-se para o lado. Cada objeto é uma página (ou mais, se o texto for longo).
     ################################################################## */
  livro: {
    paginas: [
      {
        tipo: 'rosto', ceu: 'aurora',
        titulo: 'Quatro anos de nós', subtitulo: 'o nosso livro',
        datas: '20 de novembro de 2022 · 20 de novembro de 2026',
        epigrafe: '@1-livro/01-epigrafe', autor: 'Luís de Camões, Rimas',
      },
      // o índice: só as três secções
      { tipo: 'indice', ceu: 'aurora', titulo: 'Índice', rabisco: false,
        secoes: [{ numero: 'I', titulo: 'We (Chichiboo & Tchitchiboa)' }, { numero: 'II', titulo: 'Love' }, { numero: 'III', titulo: 'You' }] },

      /* =============================== I =============================== */
      { tipo: 'secao', numero: 'I', titulo: 'We (Chichiboo & Tchitchiboa)', frase: '@1-livro/02-capitulo-1-frase', ceu: 'aurora' },
      { tipo: 'carta', ceu: 'aurora', foto: 'namoro', texto: '@1-livro/03-carta-de-abertura' },
      {
        tipo: 'poema', ceu: 'manha', autor: 'Florbela Espanca', titulo: 'Fanatismo', obra: 'Livro de Sóror Saudade, 1923',
        texto: `Minh'alma, de sonhar-te, anda perdida.
Meus olhos andam cegos de te ver.
Não és sequer razão do meu viver
Pois que tu és já toda a minha vida!

Não vejo nada assim enlouquecida...
Passo no mundo, meu Amor, a ler
No misterioso livro do teu ser
A mesma história tantas vezes lida!...

"Tudo no mundo é frágil, tudo passa...
Quando me dizem isto, toda a graça
Duma boca divina fala em mim!

E, olhos postos em ti, digo de rastros:
"Ah! podem voar mundos, morrer astros,
Que tu és como Deus: princípio e fim!..."`,
      },
      // ✏️ FOTOGRAFIAS: diz-me como as queres organizar (por agora, por data)
      { tipo: 'momento', ceu: 'manha', data: '18 de abril de 2025', t: '@1-livro/04-momento-18-abril-2025', fotos: ['2025-04-18_19-06-14', '2025-04-18_19-08-22'] },
      { tipo: 'momento', ceu: 'manha', data: '29 de maio de 2025', t: '@1-livro/05-momento-29-maio-2025', fotos: ['2025-05-29-whatsapp-0022', '2025-05-29-whatsapp-0024'] },
      {
        tipo: 'poema', ceu: 'manha', autor: 'Alberto Caeiro', titulo: 'O meu olhar é nítido como um girassol', obra: 'O Guardador de Rebanhos, II',
        texto: `O meu olhar é nítido como um girassol.
Tenho o costume de andar pelas estradas
Olhando para a direita e para a esquerda,
E de vez em quando olhando para trás...
E o que vejo a cada momento
É aquilo que nunca antes eu tinha visto,
E eu sei dar por isso muito bem...

Eu não tenho filosofia: tenho sentidos...
Se falo na Natureza não é porque saiba o que ela é,
Mas porque a amo, e amo-a por isso,
Porque quem ama nunca sabe o que ama
Nem sabe porque ama, nem o que é amar...`,
      },
      { tipo: 'momento', ceu: 'mar', data: 'Verão de 2025', fotos: ['selfie_us5'], grande: true },
      {
        tipo: 'poema', ceu: 'mar', autor: 'Alberto Caeiro', titulo: 'Como quem num dia de Verão abre a porta', obra: 'O Guardador de Rebanhos',
        texto: `Como quem num dia de Verão abre a porta de casa
E espreita para o calor dos campos com a cara toda,
Às vezes, de repente, bate-me a Natureza de chapa
Na cara dos meus sentidos,
E eu fico confuso, perturbado, querendo perceber
Não sei bem como nem o quê...

Mas quem me mandou a mim querer perceber?
Quem me disse que havia que perceber?

Quando o Verão me passa pela cara
A mão leve e quente da sua brisa,
Só tenho que sentir agrado porque é brisa
Ou que sentir desagrado porque é quente,
E de qualquer maneira que eu o sinta,
Assim, porque assim o sinto, é que é meu dever senti-lo...`,
      },
      { tipo: 'momento', ceu: 'neve', data: 'Inverno de 2026', fotos: ['selfie_us_11'], grande: true },
      { tipo: 'poema', ceu: 'poente', obra: 'Um poema do chichiboo', t: '@1-livro/07-poema-dele' }, // o teu poema: escreve-o em textos/1-livro/07-poema-dele.txt
      {
        tipo: 'poema', ceu: 'neve', autor: 'Sophia de Mello Breyner Andresen', titulo: 'Para atravessar contigo o deserto do mundo', obra: 'Livro Sexto, 1962 (excerto)', foto: 'photo_us2',
        texto: `Para atravessar contigo o deserto do mundo
Para enfrentarmos juntos o terror da morte
Para ver a verdade para perder o medo
Ao lado dos teus passos caminhei`,
      },
      { tipo: 'momento', ceu: 'neve', fotos: ['photo_us3'], cheio: true }, // a fotografia enche a página
      { tipo: 'momento', ceu: 'aurora', data: '3 de abril de 2026', t: '@1-livro/11-momento-3-abril-2026', fotos: ['2026-04-03_20-20-00'], grande: true },
      { tipo: 'viagem', ceu: 'mar', botao: false, rotulo: 'Subir e ver a nossa viagem' },
      {
        tipo: 'poema', ceu: 'mar', autor: 'Ricardo Reis', titulo: 'Vem sentar-te comigo, Lídia, à beira do rio', obra: 'Odes (excerto)', foto: 'selfie_us_meme',
        texto: `Vem sentar-te comigo, Lídia, à beira do rio.
Sossegadamente fitemos o seu curso e aprendamos
Que a vida passa, e não estamos de mãos enlaçadas.
(Enlacemos as mãos).

Amemo-nos tranquilamente, pensando que podíamos,
Se quiséssemos, trocar beijos e abraços e carícias,
Mas que mais vale estarmos sentados ao pé um do outro
Ouvindo correr o rio e vendo-o.`,
      },
      { tipo: 'momento', ceu: 'trigo', data: '6 de agosto de 2026', t: '@1-livro/17-momento-sevilha', fotos: ['2026-08-06_10-31-06'], grande: true },
      { tipo: 'momento', ceu: 'trigo', fotos: ['barco'], grande: true }, // só a fotografia
      {
        tipo: 'poema', ceu: 'mar', autor: 'Fernando Pessoa', titulo: 'Mar Português', obra: 'Mensagem, 1934',
        texto: `Ó mar salgado, quanto do teu sal
São lágrimas de Portugal!
Por te cruzarmos, quantas mães choraram,
Quantos filhos em vão rezaram!
Quantas noivas ficaram por casar
Para que fosses nosso, ó mar!

Valeu a pena? Tudo vale a pena
Se a alma não é pequena.
Quem quer passar além do Bojador
Tem que passar além da dor.
Deus ao mar o perigo e o abismo deu,
Mas nele é que espelhou o céu.`,
      },
      { tipo: 'momento', ceu: 'mar', fotos: ['kiss'], grande: true }, // só a fotografia
      { tipo: 'imagem', ceu: 'poente', foto: 'parede', linhas: ['Uma imagem', 'vale mais que', 'mil palavras'] }, // só a fotografia e a frase à mão

      /* =============================== II ============================ */
      { tipo: 'secao', numero: 'II', titulo: 'Love', frase: '@1-livro/20-capitulo-2-frase', ceu: 'poente' },
      {
        tipo: 'filme', ceu: 'trigo', nome: 'Gladiator', nomePt: 'Gladiador', ano: 2000,
        imagem: 'https://image.tmdb.org/t/p/w1280/hND7xAaxxBgaIspp9iMsaEXOSTz.jpg',
        mensagem: 'Por baixo das batalhas, Gladiador é a história de um homem que só quer voltar para casa, para o campo de trigo onde o espera quem ama. A coragem verdadeira é ser fiel ao que se é e a quem se ama, mesmo quando o mundo inteiro empurra para o contrário. «What we do in life echoes in eternity.»',
        frase: '@1-livro/25-filme-gladiador',
      },
      {
        tipo: 'filme', ceu: 'espaco', nome: 'Interstellar', nomePt: 'Interstellar', ano: 2014,
        imagem: 'https://image.tmdb.org/t/p/w1280/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
        mensagem: 'O amor é a única coisa que sentimos que atravessa o tempo e o espaço, e pode ser tão real como a gravidade. No fim, o pai fala com a filha através de uma estante de livros, traduzindo o amor em dados que ela sabe ler.',
        frase: '@1-livro/26-filme-interstellar',
      },
      {
        tipo: 'filme', ceu: 'manha', nome: 'Spirited Away', nomePt: 'A Viagem de Chihiro', ano: 2001,
        imagem: 'https://image.tmdb.org/t/p/w1280/m4TUa2ciEWSlk37rOsjiSIvZDXE.jpg',
        mensagem: 'A Chihiro entra num mundo estranho e só sai dele porque nunca esquece quem é, e porque ajuda o Haku a lembrar-se do seu verdadeiro nome. A bondade, a coragem tranquila e a memória de quem amamos salvam-nos; quem conhecemos de verdade nunca se esquece.',
        frase: '@1-livro/27-filme-chihiro',
      },
      {
        tipo: 'filme', ceu: 'manha', nome: "Howl's Moving Castle", nomePt: 'O Castelo Andante', ano: 2004,
        imagem: 'https://image.tmdb.org/t/p/w1280/xqaN2WYQclQlqvKvsOcNgOx2vRn.jpg',
        mensagem: 'Ver alguém para lá da aparência: a Sophie rejuvenesce quando deixa de se ver como velha, e o Howl só fica inteiro quando tem coragem de entregar o coração. O amor não é perfeito, é corajoso, e transforma uma casa feita de peças desencontradas num lar.',
        frase: '@1-livro/28-filme-castelo-andante',
      },
      { tipo: 'xadrez', ceu: 'noite', titulo: 'O nosso gambito', imagem: 'assets/img/gambito-de-dama.png', texto: '@1-livro/29-xadrez' },
      { tipo: 'imagem', ceu: 'poente', foto: 'us_kitchen', linhas: ['Os nossos', 'dois', 'chefs'] },
      {
        tipo: 'ementa', ceu: 'poente', titulo: 'Menu',
        grupos: [
          { titulo: 'Entradas', colunas: 2, itens: ['Queijo', 'Bruschettas', 'Pão', 'Tremoços'] },
          { titulo: 'Refeições', itens: ['Pizza', 'Frango', 'Bacalhau com Natas'] },
          { titulo: 'Sobremesas', itens: ['Cheesecake de Morango', 'Mousse de manga', 'Shake proteico'] },
        ],
      },
      /* =============================== III ============================= */
      { tipo: 'secao', numero: 'III', titulo: 'You', frase: '@1-livro/24-capitulo-3-frase', ceu: 'poente' },
      {
        tipo: 'poema', ceu: 'trigo', autor: 'Luís de Camões', titulo: 'Amor é fogo que arde sem se ver', obra: 'Rimas, 1598',
        texto: `Amor é fogo que arde sem se ver,
é ferida que dói, e não se sente;
é um contentamento descontente,
é dor que desatina sem doer.

É um não querer mais que bem querer;
é um andar solitário entre a gente;
é nunca contentar-se de contente;
é um cuidar que ganha em se perder.

É querer estar preso por vontade;
é servir a quem vence, o vencedor;
é ter com quem nos mata, lealdade.

Mas como causar pode seu favor
nos corações humanos amizade,
se tão contrário a si é o mesmo Amor?`,
      },
      { tipo: 'momento', ceu: 'aurora', data: 'Ginásio', t: '@1-livro/22-momento-ginasio', fotos: ['2025-09-05_12-40-31'], grande: true },
      { tipo: 'danca', ceu: 'poente', titulo: 'Quando tu danças', foto: 'catarina_dancing', texto: '@1-livro/23-danca' },
      {
        tipo: 'poema', ceu: 'poente', autor: 'Alberto Caeiro', titulo: 'Leve, leve, muito leve', obra: 'O Guardador de Rebanhos', foto: '2025-05-23-whatsapp-0012',
        texto: `Leve, leve, muito leve,
Um vento muito leve passa,
E vai-se, sempre muito leve.`,
      },
      {
        tipo: 'poema', ceu: 'manha', autor: 'Cesário Verde', titulo: 'De Tarde', obra: 'O Livro de Cesário Verde, 1887',
        texto: `Naquele pic-nic de burguesas,
Houve uma coisa simplesmente bela,
E que, sem ter histórias nem grandezas,
Em todo o caso dava uma aguarela.

Foi quando tu, descendo do burrico,
Foste colher, sem imposturas tolas,
A um granzoal azul de grão-de-bico
Um ramalhete rubro de papoulas.`,
      },
      { tipo: 'momento', ceu: 'manha', fotos: ['Mestres'], grande: true, postit: 'Parabéns aos novos Mestres!' }, // só a fotografia e um post-it

      { tipo: 'fim', ceu: 'noite', texto: '@1-livro/31-fim-do-livro', rabisco: false },
    ],
  },

  // a viagem de verão (abre por cima do livro, no botão da página «Estrada fora»)
  viagem: {
    titulo: 'Verão de 2026',
    paragens: [
      { nome: 'Lisboa', lat: 38.72, lon: -9.14, data: 'a partida', texto: '@1-livro/13-viagem-lisboa', fotos: ['2026-04-03_20-20-00'] },
      { nome: 'Faro', lat: 37.02, lon: -7.93, data: 'agosto de 2026', texto: '@1-livro/14-viagem-faro', fotos: ['2026-08-09_13-16-47'] },
      { nome: 'Tavira', lat: 37.13, lon: -7.65, data: 'agosto de 2026', texto: '@1-livro/15-viagem-tavira', fotos: ['barco2'] },
      { nome: 'Sevilha', lat: 37.39, lon: -5.98, data: '6 de agosto de 2026', texto: '@1-livro/16-viagem-sevilha', fotos: ['sevilha', 'sevilha2', 'sevilha3', '2026-08-06_12-55-41', '2026-08-06_10-31-06', '2026-08-06_11-58-43', '2026-08-06_13-14-30'] },
    ],
  },

  // a quebra: o livro avaria e entra o computador
  quebra: {
    verso: 'Passo no mundo, meu Amor, a ler\nNo misterioso livro do teu ser',
    linhas: [
      '> a interromper o livro...',
      '> a carregar o mundo do Diogo',
      '> erro: «poesia» não existe no dicionário',
      '> a traduzir tudo para a minha língua',
    ],
    fim: 'olá, Catarina.',
  },

  /* ##################################################################
     PARTE DOIS — O COMPUTADOR (o mundo dele)
     Escuro, néon, chuva, código no fundo. À frente, texto bonito.
     ################################################################## */
  computador: {
    mensagens: '@@2-computador/03-mensagens',
    blocos: [
      { tipo: 'neon', texto: 'o computador', kana: '愛' },
      { tipo: 'mensagem', titulo: 'Olá, Catarina.', texto: '@2-computador/01-ola', assinatura: 'o computador do Diogo' },
      { tipo: 'terminal', titulo: 'boot.sh', linhas: '@2-computador/02-boot' },
      { tipo: 'mensagem', n: 0 },
      { tipo: 'piadas', titulo: 'Piadas de um coração em código', itens: '@@2-computador/04-piadas' },
      { tipo: 'mensagem', n: 1 },
      { tipo: 'formula', titulo: 'Identidade de Euler', tex: 'e^{i\\pi} + 1 = 0', texto: 'Cinco números que vêm de mundos diferentes (a análise, a álgebra, a geometria, a aritmética) e que, juntos, dão a igualdade mais bonita da matemática. É a prova de que coisas muito diferentes podem encaixar na perfeição, como tu e eu.' },
      { tipo: 'formula', titulo: 'A nossa fórmula', tex: '\\sin^{2}x + \\cos^{2}x = 1', fotos: ['anel-sen', 'anel-cos'], texto: '@2-computador/06-formula-anel' },
      { tipo: 'formula', titulo: 'A curva do coração', tex: 'x = 16\\sin^3 t,\\qquad y = 13\\cos t - 5\\cos 2t - 2\\cos 3t - \\cos 4t', texto: 'Quando t vai de 0 a 2π, este par de equações desenha um coração inteiro, sem levantar o lápis. Não sei pintar, mas sei pôr a matemática a pintar por mim.' },
      { tipo: 'neon', texto: 'more human than human', kana: 'カタリナ', imagem: 'https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg', legenda: 'Blade Runner 2049 · 2017' },
      { tipo: 'mensagem', n: 2 },
      {
        tipo: 'poemacodigo', titulo: 'Ciclo infinito',
        codigo: `def amar(catarina):
    dias = 0
    while True:                       # não há condição de paragem
        acordar_ao_lado(catarina)
        if catarina.triste():
            abraçar(catarina, ate=catarina.sorrir)
        elif catarina.a_dancar():
            parar_tudo()
            olhar(catarina)           # sem pestanejar
        dias += 1
        assert gosto_mais(hoje=True, que=ontem)
    # esta linha nunca é executada
    return "fim"`,
        poema: `Todos os dias acordo ao teu lado
e não há regra que me mande parar.
Se estás triste, abraço-te até sorrires;
se danças, o mundo pára para eu olhar.

Conto os dias só para ver crescer o número,
e cada um é maior do que o anterior.
Há uma linha, lá no fim, que diz «acabou».
Nunca lá chego. É essa a graça do amor.`,
      },
      { tipo: 'formula', titulo: 'Teorema de Bayes', conta: [
        'A = «gosto dela»      B = «o coração dispara quando ela chega»',
        '',
        'P(A)     = 0,50     começo com uma suspeita: meio a meio',
        'P(B|A)   = 0,99     se gosto dela, dispara quase sempre',
        'P(B|¬A)  = 0,05     se não gostasse, só às vezes (café a mais)',
        '',
        'P(B) = 0,99 · 0,50 + 0,05 · 0,50 = 0,520',
        'P(A|B) = (0,99 · 0,50) / 0,520 = 0,952',
        '',
        'dia 1     →  95,2 %',
        'dia 2     →  99,7 %',
        'dia 3     →  99,99 %',
        'dia 1461  →  100 %  (o Python arredonda e desiste de contar)',
      ], tex: 'P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}', texto: 'Bayes ensina a mudar de ideias com cada nova evidência. Comecei com uma suspeita, há quatro anos, e cada dia contigo foi uma evidência nova. Hoje a probabilidade de seres a pessoa da minha vida é tão perto de 1 que já não sei escrevê-la de outra forma.' },
      {
        tipo: 'previsao', titulo: 'A máquina tenta acabar o verso',
        verso: 'Amor é fogo que arde sem se',
        opcoes: [{ w: 'apagar', p: 0.41 }, { w: 'queimar', p: 0.22 }, { w: 'notar', p: 0.12 }, { w: 'mexer', p: 0.08 }],
        certa: { w: 'ver', p: 0.0003 },
        nota: 'Para a máquina, a palavra do Camões era quase impossível. Tu também eras. E foste a palavra certa.',
      },
      { tipo: 'mensagem', n: 3 },
      {
        tipo: 'jogos', titulo: 'Jogos que jogámos (sempre em modo cooperativo)',
        itens: [
          { nome: 'It Takes Two', imagem: 'https://cdn.akamai.steamstatic.com/steam/apps/1426210/header.jpg', texto: 'Um jogo que não se pode jogar sozinho, sobre duas pessoas diferentes que só avançam quando se ajudam (e com um livro do amor a falar, ainda por cima). Foi feito para nós e ninguém nos avisou.', detalhe: 'Jogadores necessários: 2. Jogadores substituíveis: 0. Vezes que um salvou o outro de cair: incontáveis.' },
          { nome: 'Overcooked', imagem: 'https://cdn.akamai.steamstatic.com/steam/apps/1243830/header.jpg', texto: 'A cozinha mais caótica do mundo, e a prova de que conseguimos pôr um prato na mesa mesmo com a casa a arder. Um corta, o outro cozinha, e no fim rimo-nos dos dois.', detalhe: 'Pratos queimados: muitos. Estrelas no fim: três, quando nos ouvimos um ao outro.' },
          { nome: 'Sackboy: A Big Adventure', imagem: 'https://cdn.akamai.steamstatic.com/steam/apps/1599660/header.jpg', texto: 'Dois bonequinhos de tricô a saltar por mundos de lã e cartão, de mãos dadas quando a plataforma é estreita. Pequenos, macios e corajosos: um bocadinho como nós.', detalhe: 'Bolhas de sonho apanhadas juntos: todas as que conseguimos. Vezes que um levou o outro às costas: as necessárias.' },
        ],
      },
      { tipo: 'mensagem', n: 4 },
      { tipo: 'retrato', rotulo: 'nos-dois.jpg', pessoas: [{ foto: 'chichiboo', legenda: 'chichiboo' }, { foto: 'tchitchiboa', legenda: 'tchitchiboa' }], legenda: 'A máquina só vê caracteres. Passa o dedo: eu vejo-vos a vós.' },
      { tipo: 'formula', titulo: 'A razão de ouro', tex: '\\varphi = \\frac{1 + \\sqrt{5}}{2} = 1 + \\frac{1}{\\varphi}', texto: 'A proporção das conchas, dos girassóis e das pétalas, que a natureza escolhe quando quer ser bonita. É o número que se contém a si próprio, como tu me contens a mim.' },
      { tipo: 'mensagem', n: 5 },
      {
        tipo: 'terminal', titulo: 'baseline.exe',
        linhas: `>>> diz "interligados"
interligados.
>>> o que sentes quando ela se ri?
interligados.
>>> já alguma vez ficaste a ver alguém a dormir?
interligados.
>>> uma célula dentro de uma célula, dentro de um coração.
interligados.
resultado: desvio da linha de base enorme. diagnóstico: apaixonado. ação recomendada: nenhuma, está tudo bem.`,
      },
      { tipo: 'mensagem', n: 6 },
      {
        tipo: 'poemacodigo', titulo: 'Exceção não tratada',
        codigo: `import tempo

try:
    viver_sem(catarina)
except Saudade as s:
    print(f"erro: {s.intensidade} > limite")
    voltar_para(catarina)
except Exception:
    voltar_para(catarina)          # qualquer erro, a mesma solução
else:
    raise ImpossivelError("isto nunca aconteceu")
finally:
    casa = catarina                # aconteça o que acontecer`,
        poema: `Tentei, uma vez, viver sem ti um dia.
O programa nem chegou ao fim:
a saudade disparou logo à primeira linha,
maior do que o limite que havia em mim.

Para todos os erros, uma só saída:
voltar para ti, depressa, devagar.
E aconteça o que acontecer na vida,
no fim de tudo, tu és o meu lugar.`,
      },
      { tipo: 'mensagem', n: 7 },
      {
        tipo: 'perda', titulo: 'perda(amor) ao longo de 1461 épocas', epocas: 1461,
        marcos: [{ epoca: 1, txt: 'época 1: o primeiro dia' }, { epoca: 1356, txt: 'época 1356: Sevilha' }, { epoca: 1461, txt: 'hoje' }],
        legenda: 'A perda nunca chega a zero. É assim que eu sei que ainda estou a aprender-te.',
      },
      {
        tipo: 'tars', titulo: 'Definições do TARS',
        texto: 'O robô do Interstellar tinha a honestidade nos 90 %. Eu fui ver as minhas.',
        itens: [{ nome: 'honestidade', v: 90 }, { nome: 'humor', v: 75 }, { nome: 'paciência à espera que escolhas o filme', v: 60 }, { nome: 'amor por ti', v: 100, overflow: true }],
      },
      { tipo: 'formula', titulo: 'Um limite que dá e', tex: '\\lim_{n \\to \\infty}\\left(1 + \\frac{1}{n}\\right)^{n} = e', texto: 'Um bocadinho a mais, todos os dias, repetido para sempre, não explode: chega a um número belíssimo. É assim que cresce o que sinto por ti.' },
      { tipo: 'mensagem', n: 8 },
      { tipo: 'neon', texto: 'os dois', kana: '二人' },
      { tipo: 'mapa', titulo: 'O mundo é nosso', texto: 'A tua lista de sítios, por esta ordem ou por outra qualquer. Marca os que já fizemos.' },
      { tipo: 'mensagem', n: 9 },
      { tipo: 'mensagem', n: 10 },
      { tipo: 'contador', antes: 'A máquina contou. Juntos há', depois: 'dias seguidos a escolher-te' },
      { tipo: 'mensagem', n: 11 },
      { tipo: 'mensagem', n: 12 },
      {
        tipo: 'gifs', titulo: 'O teu Homem-Aranha oficial',
        filme: { nome: 'Spider-Man: Brand New Day', ano: 2026, imagem: 'assets/img/brand-new-day.jpg', legenda: 'o novo filme: temos de o ver juntos' },
        itens: [
          { src: 'https://media.giphy.com/media/cgLnOHV8mhaGk/giphy.gif', legenda: 'eu, quando me dizes que já chegaste a casa' },
          { src: 'https://media.giphy.com/media/10OEOKDwxKwHFC/giphy.gif', legenda: 'beijo de aranha: de cabeça para baixo, de propósito' },
          { src: 'https://media.giphy.com/media/VOd5RQ7q8FNI3IjS5g/giphy.gif', legenda: 'tu e eu, a apontar um para o outro: «foste tu!»' },
        ],
        texto: 'Com um grande amor vem uma grande responsabilidade. Aceito-a todos os dias.',
      },
      { tipo: 'mensagem', n: 13 },
      { tipo: 'mensagem', titulo: 'Conclusão do computador', texto: '@2-computador/05-conclusao' },
    ],
  },

  // o monitor do fim: lírios em ASCII, a caixa, o ursinho
  ecra: { frase: '@3-fim/01-frase-do-ecra', assinatura: 'chichiboo' },

  /* ##################################################################
     O FIM — a natureza volta; a mensagem é poesia e código
     ################################################################## */
  fim: {
    mensagem: '@3-fim/02-mensagem-final',
    titulo: '@3-fim/03-titulo',
    assinatura: 'Do teu Homem-Aranha favorito.',
    aranha: 'Com um grande amor vem uma grande responsabilidade. Aceito-a todos os dias.',
  },

  // o desafio final (aparece depois de ela ver o livro e o computador, ao rodar a chave dourada).
  // Os desenhos: guarda-os como assets/desafio/ele.jpg e assets/desafio/ela.jpg (sem mudar o código). Enquanto não existirem, aparece «aqui vai o desenho».
  desafio: {
    titulo: 'O nosso desafio',
    texto: '@3-fim/04-desafio',
    quadros: [
      { legenda: 'O Diogo, pintado pela Catarina', imagem: 'assets/desafio/ele.jpg' },
      { legenda: 'A Catarina, pintada pelo Diogo', imagem: 'assets/desafio/ela.jpg' },
    ],
  },

  /* ----------------------------------------------------------------- xadrez */
  xadrez: {
    brancas: { nome: 'Catarina', pecas: { k: '🌸', q: '🩰', r: '📚', b: '🥐', n: '🏋️‍♀️', p: '🌱' } },
    pretas: { nome: 'Diogo', pecas: { k: '🕷️', q: '🚀', r: '🏛️', b: '🍕', n: '🎮', p: '🕸️' } },
    legenda: { k: 'Rei', q: 'Rainha', r: 'Torre', b: 'Bispo', n: 'Cavalo', p: 'Peão' },
    frases: {
      vez: 'Vez de {nome}', xeque: 'Xeque!', mate: 'Xeque-mate. Ganhou {nome}!',
      empate: 'Empate. Ganhámos os dois.', novo: 'Novo jogo', desfazer: 'Desfazer jogada',
    },
  },

  /* ------------------------------------------------------------------- mapa */
  mapa: {
    casa: { nome: 'Casa', lat: 39.5, lon: -8.0 },
    destinos: [
      { nome: 'Itália', lat: 41.9, lon: 12.5, nota: 'Pizza a sério, gelado a mais e Roma de mão dada.' },
      { nome: 'França', lat: 48.85, lon: 2.35, nota: 'Paris, croissants de chocolate e tu a dançar na rua.' },
      { nome: 'Países Baixos', lat: 52.37, lon: 4.9, nota: 'Tulipas, canais e nós os dois de bicicleta.' },
      { nome: 'Inglaterra', lat: 51.5, lon: -0.12, nota: 'Londres à chuva, de mão dada.' },
      { nome: 'Suíça', lat: 46.8, lon: 8.23, nota: 'Montanhas, lagos e chocolate sem culpa.' },
      { nome: 'Dinamarca', lat: 55.68, lon: 12.57, nota: 'Casas às cores e bolos de canela.', grupo: 'Os nórdicos' },
      { nome: 'Noruega', lat: 59.91, lon: 10.75, nota: 'Fiordes, silêncio e tu de gorro.', grupo: 'Os nórdicos' },
      { nome: 'Suécia', lat: 59.33, lon: 18.07, nota: 'Florestas, lagos e um café quente a meio da tarde.', grupo: 'Os nórdicos' },
      { nome: 'Finlândia', lat: 60.17, lon: 24.94, nota: 'Auroras boreais vistas de dentro de um iglu de vidro.', grupo: 'Os nórdicos' },
      { nome: 'Islândia', lat: 64.15, lon: -21.94, nota: 'Cascatas, gelo e um céu a dançar só para ti.', grupo: 'Os nórdicos' },
      { nome: 'Japão', lat: 35.68, lon: 139.69, nota: 'Sushi, cerejeiras e o museu do Studio Ghibli.' },
      { nome: 'Tailândia', lat: 13.75, lon: 100.5, nota: 'Praias, templos e fruta que nunca provámos.' },
      { nome: 'Canadá', lat: 45.42, lon: -75.7, nota: 'Lagos e florestas sem fim, no outono.' },
    ],
  },
};
