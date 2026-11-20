# Quatro anos de nós

Uma prenda de aniversário em forma de página web, para a Catarina.

Faz quatro anos que estamos juntos, e em vez de um cartão fiz uma pequena história que se abre no browser: uma mesa de madeira no meio da natureza, com um livro, um computador antigo e algumas coisas que são só nossas.

Não tem contas, nem servidor, nem rastreio. É uma página estática, feita à mão com HTML, CSS e JavaScript, em português de Portugal.

## Estrutura do repositório

```text
.
├── index.html              a página: carrega os estilos e os scripts por ordem (os ?v=N forçam cópias novas)
├── README.md
├── LICENSE
├── .nojekyll               diz ao GitHub Pages para servir os ficheiros tal como estão
├── .gitignore
│
├── css/                    um ficheiro de estilos por parte da página
│   ├── style.css           base: tipos de letra, cores, regras gerais
│   ├── mesa.css            a mesa e os objetos
│   ├── livro.css           o livro aberto e as suas páginas
│   ├── pc.css              o ecrã do computador antigo
│   ├── blog.css            o blog em ASCII dentro do computador
│   ├── xadrez.css          o tabuleiro de xadrez
│   ├── viagem.css          o mapa da viagem
│   └── final.css           a chave dourada e o desafio
│
├── js/                     um módulo por parte da página (cada um expõe um único objeto global)
│   ├── main.js             liga tudo: fases (mesa, livro, computador), textos, chave do final
│   ├── content.js          a estrutura do livro: ordem das páginas, fotos, poemas, filmes, jogos
│   ├── mesa.js             a mesa, o livro fechado, o computador e os objetos (SVG gerado em JS)
│   ├── ceu.js              a paisagem pintada que fica atrás da mesa (canvas)
│   ├── livro.js            o livro: páginas que viram e todos os tipos de página
│   ├── pc.js               o computador: ligar, animações e transição para o blog
│   ├── ascii.js            o leitor de animações em ASCII
│   ├── blog.js             o blog em ASCII: mensagens, jogos, fotos, fórmulas, mapa
│   ├── xadrez.js           o jogo de xadrez aberto a partir do livro
│   ├── viagem.js           o mapa de Portugal com a viagem
│   ├── final.js            a chave dourada e o desafio
│   ├── portugal.js         o contorno de Portugal (gerado a partir de dados geográficos)
│   ├── photos.js           registo das fotos: tamanho e miniatura (gerado)
│   └── textos.js           cópia dos textos para a página funcionar sem servidor (gerado)
│
├── textos/                 todo o texto da página, um .txt por texto (linha vazia = parágrafo novo)
│   ├── 1-livro/            cartas, momentos, poemas, filmes, xadrez (numerados pela ordem em que aparecem)
│   ├── 2-computador/       o que o computador diz: olá, arranque, mensagens, piadas, conclusão
│   └── 3-fim/              o final: frase do ecrã, mensagem, título e o texto do desafio
│
├── assets/
│   ├── photos/             33 fotografias já otimizadas, sem EXIF nem localização
│   ├── ascii/              animações e imagens em ASCII já calculadas
│   │   ├── flores.js       os lírios que crescem no ecrã
│   │   ├── prenda.js       a prenda e o urso
│   │   └── blog-*.js       imagens do blog (fotos, jogos, mundo), carregadas só quando são precisas
│   ├── xadrez/pecas/       as 12 peças de xadrez (SVG)
│   ├── img/                posters usados no livro e no blog
│   └── desafio/            os dois desenhos do final: ele.jpg e ela.jpg (por criar, ver abaixo)
│
└── vendor/                 bibliotecas de terceiros, sem alterações
    ├── page-flip.browser.js    St.PageFlip: as páginas que viram
    └── chess.min.js            chess.js: as regras do xadrez
```

Os ficheiros marcados como «gerados» (`js/photos.js`, `js/textos.js`, `js/portugal.js`, `assets/ascii/*`) não se editam à mão.

### Como as peças se ligam

`index.html` carrega os módulos como scripts normais, sem `import`, e o `js/main.js` junta-os. A página tem três fases: a **mesa**, o **livro** e o **computador**, e só uma se vê de cada vez. O `content.js` diz o que vai em cada página do livro e vai buscar os textos a `textos/` pelo nome. Quando a página é aberta sem servidor, usa a cópia que está em `textos.js`.

## Ver

A página está publicada com o GitHub Pages: Settings → Pages → «Deploy from a branch» → `main` / `(root)`.

Para a ver no teu computador, abre o `index.html` com duplo clique, ou serve a pasta com qualquer servidor estático, por exemplo:

```bash
python -m http.server 8000
```

e abre <http://localhost:8000>. A música do YouTube só toca com a página online.

## Mudar textos e fotos

- **Textos:** estão em `textos/`, um `.txt` por texto. Uma linha vazia é um parágrafo novo. Um texto que começa por ✏️ é um espaço reservado e aparece a tracejado. A ordem das páginas e as fotos de cada uma estão em `js/content.js`.
- **Fotos:** as fotos usadas ficam em `assets/photos/` e registam-se em `js/photos.js`. Os originais pesados (com localização) nunca vão para o repositório.

Depois de editar qualquer ficheiro, aumenta o número `?v=` desse ficheiro no `index.html`, para os browsers não mostrarem a cópia antiga.

## Os desenhos do final

No fim há dois quadros para os retratos que fazemos um ao outro. Depois de os fazermos, basta guardar as imagens nesta pasta, com **exatamente** estes nomes:

| Quadro                         | Ficheiro                 |
| ------------------------------ | ------------------------ |
| O Diogo, pintado pela Catarina | `assets/desafio/ele.jpg` |
| A Catarina, pintada pelo Diogo | `assets/desafio/ela.jpg` |

Não é preciso mexer em código. Até lá, os quadros mostram «aqui vai o desenho».

- Os nomes têm de estar em minúsculas e acabar em `.jpg`: o GitHub Pages distingue maiúsculas de minúsculas.
- O quadro é quase quadrado (cerca de 1 : 1,05) e a imagem é cortada para o preencher, por isso convém deixar margem.
- Cerca de 1000 px de lado e menos de 500 KB chegam.
- Se a imagem for tirada com o telemóvel, tirar-lhe os metadados (localização) antes de a publicar.

## Como está feito

- Sem frameworks nem passo de build: HTML, CSS e JS puros.
- A mesa, os objetos e a paisagem são desenhados em SVG e canvas gerados em JS, com um filtro de aguarela.
- O livro usa [St.PageFlip](https://github.com/Nodlik/StPageFlip) e o xadrez usa [chess.js](https://github.com/jhlywa/chess.js), ambos em `vendor/`.
- As peças de xadrez em `assets/xadrez/` são CC BY-NC-SA.

## Licença

O código é MIT (ver `LICENSE`). Os textos e as fotografias são pessoais e não podem ser reutilizados.
