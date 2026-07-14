import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  await prisma.libraryItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await bcrypt.hash('admin123', 12);
  const escritorPass = await bcrypt.hash('escritor123', 12);
  const leitorPass = await bcrypt.hash('leitor123', 12);

  const admin = await prisma.user.create({
    data: { nome: 'Admin MozLit', email: 'admin@mozlit.mz', senha_hash: adminPass, role: 'ADMIN', saldo_carteira: 0 },
  });

  const escritor1 = await prisma.user.create({
    data: { nome: 'Mia Couto', email: 'mia@mozlit.mz', senha_hash: escritorPass, role: 'ESCRITOR', saldo_carteira: 250 },
  });

  const escritor2 = await prisma.user.create({
    data: { nome: 'Paulina Chiziane', email: 'paulina@mozlit.mz', senha_hash: escritorPass, role: 'ESCRITOR', saldo_carteira: 180 },
  });

  const escritor3 = await prisma.user.create({
    data: { nome: 'João Paulo Borges Coelho', email: 'joao@mozlit.mz', senha_hash: escritorPass, role: 'ESCRITOR', saldo_carteira: 90 },
  });

  const leitor = await prisma.user.create({
    data: { nome: 'Maria Moçambicana', email: 'maria@mozlit.mz', senha_hash: leitorPass, role: 'LEITOR', saldo_carteira: 500 },
  });

  const book1 = await prisma.book.create({
    data: {
      titulo: 'Terra Sonâmbula', categoria: 'Ficção', status: 'PUBLICADO', preco_total: 75, autorId: escritor1.id,
      sinopse: 'Numa terra devastada pela guerra, um menino e um velho caminham juntos. Muidinga, o menino, carrega consigo um caderno com histórias que poderão revelar o seu passado e o seu nome. Uma viagem poética através da memória e da resistência moçambicana.',
    },
  });

  const ch1 = await prisma.chapter.create({
    data: {
      titulo: 'O Caminho', livroId: book1.id, preco_capitulo: 15, is_free: true, ordem: 0,
      conteudo: 'O velho e o menino caminhavam pela estrada de terra. O sol era um disco vermelho que se punha sobre as palmeiras. A cada passo, a poeira subia como se a própria terra estivesse a respirar.\n\n— Tu sabes ler? — perguntou o velho.\n\nO menino negou com a cabeça. Mas os seus olhos diziam outra coisa. Havia neles uma fome que só os livros poderiam saciar.\n\n— Eu vou-te ensinar — disse o velho. — Mas primeiro, precisamos de encontrar um lugar para dormir.\n\nA noite caía depressa naquelas terras. As estrelas surgiam uma a uma, como lanternas que alguém acendia no tecto do mundo. O menino olhava para cima, maravilhado. Para ele, cada estrela era uma letra, cada constelação uma palavra, e o céu inteiro uma história esperando para ser lida.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'O Caderno', livroId: book1.id, preco_capitulo: 15, is_free: false, ordem: 1,
      conteudo: 'Dentro da mochila do velho havia um caderno amarelo, com as páginas já a ficar castanhas pelo tempo. O menino não sabia ler, mas sentia que aquele objecto era importante. O velho guardava-o como se guardasse um tesouro.\n\n— Este caderno — disse o velho, sentando-se junto ao fogo — conta a história de muitos que vieram antes de nós. É como se a própria terra tivesse escrito as suas memórias nestas páginas.\n\nO menino aproximou-se, os olhos reflectindo as chamas. Queria tocar naquele caderno. Queria sentir o peso das palavras nas suas mãos.\n\n— Quando é que me vais ensinar a ler? — perguntou, a voz carregada de urgência.\n\n— Amanhã — respondeu o velho, abrindo o caderno na primeira página. — Mas esta noite, eu leio para ti.\n\nE começou a ler. A sua voz era grave e quente, como a terra húmida depois da chuva. As palavras do caderno ganhavam vida ao som da sua voz, e o menino sentia que, pela primeira vez, o mundo fazia sentido.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'As Árvores Falam', livroId: book1.id, preco_capitulo: 15, is_free: false, ordem: 2,
      conteudo: 'Na aldeia abandonada, as casas eram esqueletos de barro. Mas as árvores continuavam de pé, altivas e verdes, como se a guerra nunca tivesse passado por ali. O velho disse que as árvores eram os verdadeiros habitantes daquela terra.\n\n— As pessoas vêm e vão — disse ele, encostando-se a um mangozeiro. — Mas as árvores ficam. Elas são as guardiãs das histórias.\n\nO menino tocou no tronco rugoso da árvore. Sentiu a casca sob os seus dedos, áspera e viva. E por um momento, quase que lhe pareceu ouvir uma voz, um sussurro antigo que contava histórias de tempos em que a paz era a única língua que se falava.\n\n— Eu quero ser como as árvores — disse o menino.\n\n— Então tens de criar raízes profundas — respondeu o velho, sorrindo. — E braços que abracem o céu.',
    },
  });

  const book2 = await prisma.book.create({
    data: {
      titulo: 'Ventos do Apocalipse', categoria: 'Romance', status: 'PUBLICADO', preco_total: 60, autorId: escritor2.id,
      sinopse: 'Na cidade de Maputo, vidas entrelaçam-se num mosaico de amor, perda e esperança. Paulina Chiziane tece uma narrativa poderosa sobre as mulheres moçambicanas e as suas lutas silenciosas num mundo em transformação.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'A Manhã de Rosa', livroId: book2.id, preco_capitulo: 0, is_free: true, ordem: 0,
      conteudo: 'Rosa acordou antes do sol. A luz cinzenta da madrugada entrava pela janela, desenhando sombras no chão de cimento. O som do mar chegava-lhe aos ouvidos, uma melodia antiga que a acompanhava desde a infância.\n\nLevantou-se devagar, para não acordar as filhas. Precisava de chegar cedo ao mercado. Os tomates não se vendiam a si mesmos, e havia bocas para alimentar.\n\nNa cozinha, enquanto preparava o café, pensou no marido que partira há dois anos. Não para outra mulher — para o Sul da África, em busca de trabalho. As cartas chegavam de vez em quando, curtas e cheias de promessas.\n\n— Um dia volto — tinha dito. E Rosa acreditava. Tinha de acreditar. Era a única coisa que a mantinha de pé.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'O Mercado', livroId: book2.id, preco_capitulo: 15, is_free: false, ordem: 1,
      conteudo: 'O mercado de Xipamanine era um universo em miniatura. Milhares de vozes, cheiros e cores competiam pela atenção dos sentidos. Rosa caminhava entre as bancadas com a sua cesta de tomates, o rosto erguido com a dignidade de quem sabe que está a vender mais do que fruta — está a vender a sua força.\n\n— Tomate fresco, mana! Tomate do meu quintal!\n\nA sua vizinha, Dona Flora, vendia peixe seco ao lado. Entre as duas, partilhavam não apenas o espaço, mas também as preocupações.\n\n— O meu filho quer ir para a cidade — disse Flora, baixando a voz. — Mas lá não há nada para ele.\n\n— Há sempre algo — respondeu Rosa. — A questão é ter coragem de o procurar.\n\nEra o que ela dizia aos outros. Para si mesma, guardava as dúvidas como se fossem pedras no bolso — pesadas, mas impossíveis de largar.',
    },
  });

  const book3 = await prisma.book.create({
    data: {
      titulo: 'Crónica da Rua 513', categoria: 'Contos', status: 'PUBLICADO', preco_total: 50, autorId: escritor3.id,
      sinopse: 'Um retrato íntimo da vida urbana em Maputo durante os anos de transição. Borges Coelho narra as histórias de uma rua onde cabem todas as Mozambiques — a que sonha, a que sofre, a que resiste.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'Os Moradores', livroId: book3.id, preco_capitulo: 0, is_free: true, ordem: 0,
      conteudo: 'A Rua 513 era como uma pessoa — tinha humor, costumes e segredos. De manhã, acordava com o som das panelas e das buzinas. De noite, adormecia sob o zumbido dos insectos e o murmúrio das conversas.\n\nNo número 12 morava o Senhor Joaquim, um reformado que passava os dias na varanda a ler o jornal. No 15, Dona Beatriz vendia bolinhos de arroz que eram famados na vizinhança. E no 21, um grupo de estudantes dividia um quarto minúsculo, sonhando com diplomas que pareciam cada vez mais distantes.\n\nCada porta da rua escondia uma história. Cada janela era um ecrã onde se projectava o drama de uma família. E o narrador, um jovem escritor que acabara de chegar à cidade, observava tudo com olhos de quem sabe que as melhores histórias estão nas coisas mais simples.\n\n— Esta rua vai-me dar um livro — dizia ele a si mesmo, todas as manhãs.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'A Tempestade', livroId: book3.id, preco_capitulo: 10, is_free: false, ordem: 1,
      conteudo: 'Quando a chuva caía na Rua 513, era como se o mundo se dissolvesse. As ruas inundavam-se em minutos, transformando-se em rios de lama que arrastavam tudo à sua frente.\n\nNaquela tarde de Janeiro, a tempestade apanhou todos de surpresa. O Senhor Joaquim correu para dentro de casa com o jornal sobre a cabeça. Dona Beatriz gritou para os filhos que trouxessem os bolinhos para dentro. Os estudantes do número 21 tentaram salvar os livros, mas a água entrou pelo chão como um exército invasor.\n\nE no meio do caos, algo inesperado aconteceu. Os vizinhos começaram a ajudar-se uns aos outros. O Senhor Joaquim abriu a sua porta para a família do número 8. Dona Beatriz distribuiu os bolinhos — mesmo molhados, eram melhor do que fome. Os estudantes formaram uma corrente humana para passar os pertences de uma casa para outra.\n\nFoi naquela noite de tempestade que a Rua 513 se tornou verdadeiramente uma família. E o jovem escritor, encharcado mas feliz, escreveu no seu caderno: "A tormenta não destrói. Aquilo que a tormenta destrói já estava fraco. O que é forte, a tempestade apenas lava."',
    },
  });

  const book4 = await prisma.book.create({
    data: {
      titulo: 'Poemas do Índico', categoria: 'Poesia', status: 'PUBLICADO', preco_total: 40, autorId: escritor1.id,
      sinopse: 'Uma colectânea de poemas inspirados no Oceano Índico, nas tradições orais e na paisagem costeira de Moçambique. Versos que capturam a essência do povo moçambicano e a sua ligação profunda com o mar.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'Mar de Memórias', livroId: book4.id, preco_capitulo: 0, is_free: true, ordem: 0,
      conteudo: 'O mar lembra-se de tudo.\n\nDas caravelas que trouxeram o vento\nDos navios que levaram o choro\nDas canoas que navegaram sonhos\nDas ondas que beijaram a praia\n\nO mar lembra-se de tudo.\n\nDas vozes que se perderam no vento\nDas canções que a maré trouxe de volta\nDas promessas feitas nas dunas\nDos abraços dados ao pé d\'água\n\nO mar lembra-se de tudo.\nE quando a noite cai sobre Maputo\ne as luzes da cidade se reflectem na água\né como se milhares de velas acendessem\nem memória dos que partiram\ne dos que ficaram.\n\nMoçambique, tu és o mar.\nE o mar é a tua memória.',
    },
  });

  await prisma.chapter.create({
    data: {
      titulo: 'Terra de Macaneta', livroId: book4.id, preco_capitulo: 10, is_free: false, ordem: 1,
      conteudo: 'Na ponta de Macaneta, onde o rio encontra o mar,\nhá uma árvore que conta histórias.\n\nAs suas raízes beberam séculos de palavra oral,\nas suas folhas sussurram lendas esquecidas,\ne as suas flores cheiram a infância.\n\nLá, os pescadores ainda sabem ler as estrelas,\ne as mulheres ainda cantam ao luar.\nLá, o tempo não existe —\nsó existe a maré,\nsó existe o vento,\nsó existe a espera.\n\nE é nessa espera que habita a poesia.\nNão a que se escreve em livros,\nmas a que se vive entre as ondas\ne se respira no sal do ar.',
    },
  });

  // Reader has chapter 1 of book 1
  await prisma.libraryItem.create({
    data: { userId: leitor.id, chapterId: ch1.id, bookId: book1.id },
  });

  console.log('Seed completed!');
  console.log('--- Contas de Teste ---');
  console.log('Admin: admin@mozlit.mz / admin123');
  console.log('Escritor: mia@mozlit.mz / escritor123');
  console.log('Escritor: paulina@mozlit.mz / escritor123');
  console.log('Leitor: maria@mozlit.mz / leitor123');

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});