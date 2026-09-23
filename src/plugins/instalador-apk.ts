import { registerPlugin } from '@capacitor/core';

/**
 * Ponte para o plugin nativo InstaladorApkPlugin (Android, nesta app).
 * Abre o instalador do Android para o APK descarregado por dentro da app.
 */
export interface InstaladorApkPlugin {
  /** True quando o Android permite instalar APKs vindos desta app. */
  podeInstalar(): Promise<{ pode: boolean }>;

  /** Abre as definições "Instalar apps desconhecidas" desta app. */
  pedirPermissao(): Promise<void>;

  /** Abre um endereço no navegador principal do telefone (Chrome completo). */
  abrirNoNavegador(opcoes: { url: string }): Promise<void>;

  /**
   * Abre o instalador do Android para o APK indicado (caminho absoluto
   * dentro da app, ex.: /data/user/0/mz.mozlit.app/cache/MozLit.apk).
   * Devolve 'permissao_necessaria' quando abriu as definições em vez do
   * instalador; nesse caso repetir após o utilizador autorizar.
   */
  instalar(opcoes: { caminho: string }): Promise<{
    estado: 'instalador_aberto' | 'permissao_necessaria';
  }>;
}

export const InstaladorApk = registerPlugin<InstaladorApkPlugin>('InstaladorApk');
