import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowLeft, Database, ShieldCheck, Eye, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade - MozLit",
  description:
    "Como o MozLit recolhe, usa e protege os seus dados pessoais: registo, leitura, carteira, marca d'água forense, terceiros (Vercel, Supabase) e os seus direitos.",
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

export default function PrivacidadePage() {
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última actualização: Setembro de 2026. Esta Política explica que dados o MozLit recolhe,
          porquê, com quem são partilhados e quais são os seus direitos. Aplica-se ao site
          mozlit.vercel.app e à aplicação MozLit para Android.
        </p>

        {/* 1 */}
        <Secao numero="1" titulo="Responsável pelo tratamento">
          <p>
            O responsável pelo tratamento dos dados é a operação do MozLit, plataforma literária
            moçambicana de leitura, publicação e monetização, gerida pela sua administração.
            Questões de privacidade podem ser enviadas através dos canais de suporte oficiais
            dentro da plataforma.
          </p>
        </Secao>

        {/* 2 */}
        <Secao numero="2" titulo="Dados que recolhemos" icone={Database}>
          <p><strong className="text-foreground">No registo da conta:</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Nome completo;</li>
            <li>Contacto: número de telefone (com indicativo do país) e/ou email;</li>
            <li>Data de nascimento (para verificar a idade mínima de 13 anos);</li>
            <li>Senha, guardada exclusivamente em forma cifrada (nunca a vemos em texto claro);</li>
            <li>Tipo de conta: Leitor ou Escritor.</li>
          </ul>
          <p><strong className="text-foreground">Durante o uso da plataforma:</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Actividade de leitura: progresso, capítulos adquiridos, tempo e preferências de leitura;</li>
            <li>Interações sociais: seguimentos, comentários e respostas;</li>
            <li>Carteira: recargas solicitadas, comprovativos enviados, transacções de MC e saldo;</li>
            <li>Como autor: obras publicadas, preços definidos e receita gerada.</li>
          </ul>
          <p><strong className="text-foreground">Dados técnicos:</strong> registos de acesso necessários à segurança e ao funcionamento do serviço (sem fins de publicidade).</p>
        </Secao>

        {/* 3 */}
        <Secao numero="3" titulo="Marca d'água forense na leitura" icone={ShieldCheck}>
          <p>
            Para proteger os direitos dos autores, o leitor do MozLit exibe, sobre as páginas da
            obra, uma marca d&apos;água discreta com o nome da conta que está a ler, o contacto
            parcialmente mascarado (ex.: <span className="font-mono">84••••567</span>) e a data e
            hora. Este mecanismo é parte essencial da nossa missão de proteger autores contra
            cópia e redistribuição de obras: em caso de fuga de conteúdo, a marca identifica a
            origem. Usamos os mesmos dados apenas para este fim de protecção e dissuasão, nunca
            para publicidade ou partilha com terceiros.
          </p>
        </Secao>

        {/* 4 */}
        <Secao numero="4" titulo="Como usamos os seus dados" icone={Eye}>
          <p>Os dados são usados exclusivamente para:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Criar e gerir a sua conta e manter a sessão activa;</li>
            <li>Permitir a leitura, compra e publicação de obras;</li>
            <li>Processar recargas, compras e a carteira de MC;</li>
            <li>Enviar notificações internas (novos capítulos de autores que segue, respostas a comentários, estado de recargas);</li>
            <li>Proteger autores e leitores: prevenção de plágio, burla e abuso;</li>
            <li>Melhorar o funcionamento e o desempenho da plataforma.</li>
          </ul>
          <p>
            Não vendemos, alugamos nem trocamos dados pessoais. Não usamos os seus dados para
            publicidade dirigida.
          </p>
        </Secao>

        {/* 5 */}
        <Secao numero="5" titulo="Partilha com terceiros">
          <p>
            Os dados ficam alojados em infraestrutura contratada pelo MozLit, estritamente
            necessária ao serviço: <strong className="text-foreground">Vercel</strong> (hospedagem
            da aplicação, com servidores que podem estar fora de Moçambique) e{" "}
            <strong className="text-foreground">Supabase</strong> (base de dados). Estes
            fornecedores processam dados apenas como infraestrutura técnica. Podemos ainda
            divulgar dados quando exigido por lei ou por ordem de autoridade competente.
          </p>
        </Secao>

        {/* 6 */}
        <Secao numero="6" titulo="Cookies e armazenamento local">
          <p>
            O MozLit usa armazenamento local do navegador/aplicação para guardar o token da sua
            sessão, o tema claro/escuro, o progresso de leitura e preferências do leitor (tamanho e
            fonte, modo claro/sépia/escuro). Não usamos cookies de publicidade nem rastreadores de
            terceiros. Pode limpar estes dados a qualquer momento nas definições do seu navegador;
            nesse caso, terá de entrar novamente na conta.
          </p>
        </Secao>

        {/* 7 */}
        <Secao numero="7" titulo="Segurança">
          <p>
            Aplicamos medidas técnicas e organizacionais adequadas: senhas cifradas, ligação
            segura (HTTPS) em todo o serviço, controlo de acesso restrito aos dados, e protecção
            específica do conteúdo das obras (marca d&apos;água, bloqueio de cópia e captura). Nenhum
            sistema é 100% infalível, mas o compromisso é corrigir qualquer incidente com
            rapidez e transparência.
          </p>
        </Secao>

        {/* 8 */}
        <Secao numero="8" titulo="Retenção e eliminação" icone={Clock}>
          <p>
            Os dados da conta mantêm-se enquanto a conta existir. Transacções da carteira
            (recargas, compras) podem ser retidas por mais tempo por razões de prestação de
            contas e prevenção de fraude. Pode pedir a eliminação da sua conta através do suporte;
            trataremos o pedido com a devida confirmação. Obras publicadas e comentários removidos
            por violação dos Termos podem ser retidos como registo da infracção.
          </p>
        </Secao>

        {/* 9 */}
        <Secao numero="9" titulo="Menores">
          <p>
            A idade mínima para criar conta é 13 anos. Recomendamos que utilizadores entre os 13 e
            os 17 anos usem a plataforma com o conhecimento dos pais ou encarregados de educação,
            especialmente no que toca a recargas em dinheiro. Se tomar conhecimento de uma conta de
            menor de 13 anos, contacte o suporte para a eliminarmos.
          </p>
        </Secao>

        {/* 10 */}
        <Secao numero="10" titulo="Os seus direitos">
          <p>Pode, a qualquer momento, através do suporte:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Consultar os dados da sua conta;</li>
            <li>Corrigir dados incorrectos (nome, contacto);</li>
            <li>Alterar a senha;</li>
            <li> Pedir a eliminação da conta e dos dados associados, nos limites da secção 8.</li>
          </ul>
        </Secao>

        {/* 11 */}
        <Secao numero="11" titulo="Alterações a esta Política">
          <p>
            Esta Política pode ser actualizada; a versão vigente fica sempre nesta página com a
            data de actualização. Alterações significativas serão comunicadas dentro da plataforma
            antes ou no momento em que entrem em vigor.
          </p>
        </Secao>

        {/* 12 */}
        <Secao numero="12" titulo="Contacto">
          <p>
            Para questões de privacidade ou dados pessoais, utilize os canais de suporte oficiais
            do MozLit dentro da aplicação. Quando exista email ou telefone oficial de suporte, será
            publicado nesta página.
          </p>
        </Secao>

        <div className="mt-12 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-sm">
          Consulte também os nossos{" "}
          <Link href="/termos" className="font-medium text-amber-700 dark:text-amber-400 hover:underline">
            Termos de Utilização
          </Link>{" "}
          com as regras de uso da plataforma, obras e moedas (MC).
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
