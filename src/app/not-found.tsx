import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-neutral-950 dark:to-neutral-900 px-4 text-center">
      <p className="text-7xl font-bold text-amber-600 dark:text-amber-500">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Esta página não existe
      </h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
        O link pode estar antigo ou mal escrito. Volte à estante para continuar a descobrir literatura moçambicana.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
      >
        Voltar ao MozLit
      </Link>
    </div>
  );
}
