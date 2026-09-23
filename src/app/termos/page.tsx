import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowLeft, ShieldCheck, Coins, Scale, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Utilização - MozLit",
  description:
    "Termos de Utilização da plataforma MozLit: contas, obras e direitos de autor, moedas literárias (MC), protecção de conteúdo e regras de conduta.",
};

function Secao({
  numero,
  titulo,
  icone: Icone,
  children,
}: {
  numero: string;
  titulo: string;
  icone?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20" id={`secao-${numero}`}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground mt-10 mb-3 first:mt-0">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0">
          {numero}
        </span>
        {Icone ? <Icone className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> : null}
        {titulo}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho próprio (páginas legais ficam fora da SPA) */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-5 w-5 text-amber-600" />
            MozLit
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao MozLit
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Documento legal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Termos de Utilização</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última actualização: Setembro de 2026. Estes Termos regulam o uso da plataforma MozLit
          (mozlit.vercel.app e a aplicação MozLit para Android). Ao criar conta, entrar ou usar a
          plataforma, o utilizador declara ter lido, compreendido e aceitado estes Termos na
          íntegra.
        </p>

        {/* 1 */}
        <Secao numero="1" titulo="O que é o MozLit">
          <p>
            O MozLit é uma plataforma literária moçambicana de leitura, publicação e monetização.
            Autores publicam obras por capítulos; leitores descobrem, compram e leem essas obras
            dentro da própria plataforma, usando moedas literárias (MC) adquiridas com dinheiro
            real, em Meticais (MZN). A missão do MozLit é dar aos escritores moçambicanos um espaço
            seguro para publicar e ganhar com o seu talento, e aos leitores um catálogo nacional
            acessível a partir de qualquer lugar.
          </p>
        </Secao>

        {/* 2 */}
        <Secao numero="2" titulo="Contas de utilizador">
          <p>
            O registo exige nome completo, um contacto (telefone ou email), data de nascimento e
            uma senha. É obrigatório ter pelo menos 13 anos de idade para criar conta; recomenda-se
            que utilizadores entre os 13 e os 17 anos o façam com o conhecimento dos pais ou
            encarregados de educação. O utilizador é responsável pela veracidade dos dados
            fornecidos, pela guarda da sua senha e por toda a actividade que ocorra na sua conta.
            Cada pessoa pode manter uma única conta; a criação de contas duplicadas para abusar de
            promoções, recargas ou do sistema de monetização é considerada violação grave destes
            Termos.
          </p>
        </Secao>

        {/* 3 */}
        <Secao numero="3" titulo="Papéis: leitores e escritores" icone={FileText}>
          <p>
            <strong className="text-foreground">Leitor:</strong> descobre obras, adquire capítulos
            ou livros completos com MC e lê dentro do leitor protegido do MozLit.
          </p>
          <p>
            <strong className="text-foreground">Escritor (autor):</strong> publica obras próprias,
            define os preços dos capítulos dentro dos limites da plataforma e recebe a receita das
            vendas no saldo da sua carteira. Ao publicar, o autor declara que a obra é da sua
            autoria e que possui legitimidade para a disponibilizar.
          </p>
        </Secao>

        {/* 4 */}
        <Secao numero="4" titulo="Obras e direitos de autor" icone={Scale}>
          <p>
            <strong className="text-foreground">O autor mantém sempre a titularidade</strong> de
            todos os direitos de autor sobre as suas obras. O MozLit não compra, não fica dono e
            não reclama qualquer propriedade sobre o conteúdo publicado. Ao publicar, o autor
            concede ao MozLit uma licença não-exclusiva, mundial e gratuita de alojamento,
            exibição e distribuição da obra dentro da plataforma, pelo tempo necessário ao seu
            funcionamento.
          </p>
          <p>
            <strong className="text-foreground">Plágio é proibido.</strong> Publicar, no todo ou em
            parte, obra que não seja da própria autoria, incluindo textos de terceiros copiados de
            livros, sites, redes sociais ou de outros autores da própria MozLit, constitui a
            violação mais grave destes Termos, com consequências imediatas (secção 9). Denúncias de
            plágio são investigadas pela administração.
          </p>
        </Secao>

        {/* 5 */}
        <Secao numero="5" titulo="Protecção do conteúdo e usos proibidos" icone={ShieldCheck}>
          <p>
            As obras da MozLit são protegidas por medidas técnicas de segurança, incluindo marca
            d&apos;água forense, controlos que impedem a selecção e cópia de texto, e bloqueios de
            captura e impressão. É expressamente proibido ao utilizador:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Copiar, fotografar, capturar, gravar ou transmitir a terceiros o conteúdo das obras;</li>
            <li>Redistribuir, revender ou publicar conteúdo do MozLit em outros sites, grupos ou aplicações;</li>
            <li>Tentar contornar, desactivar ou reverter as medidas técnicas de protecção;</li>
            <li>Partilhar a sua conta com outras pessoas para permitir leituras não autorizadas.</li>
          </ul>
          <p>
            A marca d&apos;água exibida durante a leitura identifica de forma discreta a conta que
            está a ler. O seu objectivo é exclusivamente dissuasor: quem capturar ou redistribuir
            conteúdo pode ser identificado, respondendo pela violação perante a plataforma e
            perante o autor lesado, nos termos da legislação moçambicana sobre direitos de autor.
          </p>
        </Secao>

        {/* 6 */}
        <Secao numero="6" titulo="Moedas literárias (MC), carteira e pagamentos" icone={Coins}>
          <p>
            A moeda interna da plataforma é a Moeda Literária (MC). O utilizador solicita recargas
            em Meticais (MZN) através da Carteira, enviando comprovativo de pagamento; a
            administração valida o comprovativo e credita as MC. O saldo em MZN e as MC servem
            exclusivamente para transacções dentro do MozLit, não constituem depósito bancário, não
            rendem juros e não são convertíveis em dinheiro.
          </p>
          <p>
            A compra de um capítulo ou livro concede uma licença de leitura pessoal, intransmissível
            e não reembolsável, salvo erro comprovado de cobrança (ex.: duplo débito), caso em que a
            administração corrige a carteira. Preços abusivos ou manipulação do sistema de
            monetização podem levar à rejeição da obra e à suspensão da conta. A receita dos
            autores acumula-se no saldo da sua carteira e é entregue conforme os acordos de
            monetização vigentes na plataforma.
          </p>
        </Secao>

        {/* 7 */}
        <Secao numero="7" titulo="Condutas proibidas">
          <p>Além dos usos proibidos na secção 5, é proibido ao utilizador:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Publicar conteúdo ilegal, ofensivo, de ódio, pornográfico ou que viole direitos de terceiros;</li>
            <li>Apresentar comprovativos de pagamento falsos ou manipulados;</li>
            <li>Usar a plataforma para burla, fraude ou engano de outros utilizadores;</li>
            <li>Interferir com o funcionamento técnico da plataforma (bots, ataques, engenharia reversa);</li>
            <li>Usar comentários para distribuir links maliciosos, spam ou conteúdo pirata.</li>
          </ul>
        </Secao>

        {/* 8 */}
        <Secao numero="8" titulo="Disponibilidade do serviço">
          <p>
            O MozLit é prestado &quot;tal como está&quot;, com esforço contínuo de disponibilidade
            e segurança. Podem ocorrer interrupções para manutenção, actualizações ou por factores
            externos (operadoras de rede, fornecedores de infraestrutura). Novas funcionalidades
            podem ser adicionadas e existentes modificadas ou descontinuadas, avisando-se os
            utilizadores quando o impacto for significativo.
          </p>
        </Secao>

        {/* 9 */}
        <Secao numero="9" titulo="Suspensão e terminação">
          <p>
            A administração pode suspender ou encerrar contas que violem estes Termos, após
            análise, com aviso sempre que possível. Em casos de plágio comprovado, burla de
            pagamentos ou tentativa de quebrar a protecção de obras, a conta pode ser encerrada
            sem aviso prévio e sem direito a reembolso de MC, ficando a administração
            autorizada a remover as obras em causa. O utilizador pode encerrar a sua conta em
            qualquer momento através do suporte da plataforma.
          </p>
        </Secao>

        {/* 10 */}
        <Secao numero="10" titulo="Limitação de responsabilidade">
          <p>
            Na máxima medida permitida pela lei, o MozLit não responde por danos indirectos, lucros
            cessantes ou perda de dados resultantes do uso da plataforma. O MozLit não é editor das
            obras publicadas pelos autores: é um serviço de intermediação técnica, pelo que a
            responsabilidade sobre o conteúdo de cada obra pertence ao respectivo autor. Nada
            nestes Termos exclui responsabilidade que a lei não permita excluir.
          </p>
        </Secao>

        {/* 11 */}
        <Secao numero="11" titulo="Alterações aos Termos">
          <p>
            Estes Termos podem ser actualizados para acompanhar a evolução da plataforma. A versão
            vigente fica sempre publicada nesta página com a data de actualização. Continuar a usar
            o MozLit após uma alteração significa aceitar a versão actualizada. Alterações
            significativas serão comunicadas dentro da plataforma.
          </p>
        </Secao>

        {/* 12 */}
        <Secao numero="12" titulo="Lei aplicável e contacto">
          <p>
            Estes Termos são regidos pelas leis da República de Moçambique, incluindo o regime de
            direitos de autor vigente. Questões legais, denúncias de plágio, pedidos de eliminação
            de conta ou esclarecimentos sobre pagamentos devem ser dirigidos ao suporte da
            plataforma através dos canais oficiais do MozLit (dentro da aplicação). Quando exista
            email ou telefone oficial de suporte, o mesmo será publicado nesta página e dentro da
            plataforma.
          </p>
        </Secao>

        <div className="mt-12 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-sm">
          Consulte também a nossa{" "}
          <Link href="/privacidade" className="font-medium text-amber-700 dark:text-amber-400 hover:underline">
            Política de Privacidade
          </Link>{" "}
          para saber como tratamos os seus dados pessoais.
        </div>
      </main>

      <footer className="border-t py-6">
        <div className='max-w-3xl mx-auto px-4 text-center text-xs text-muted-foreground'>
          MozLit - Plataforma Literária Moçambicana. Leitura, Publicação e Monetização.
        </div>
      </footer>
    </div>
  );
}
