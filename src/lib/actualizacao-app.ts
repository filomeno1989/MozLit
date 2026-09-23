'use client';

/**
 * ACTUALIZAÇÃO DA APP POR DENTRO (v1.0.2)
 *
 * Como funciona:
 *  1. O ficheiro estático /app-versao.json (no site) diz qual é a versão
 *     mais recente do APK: versionCode, versionName, notas e o link de
 *     download do release no GitHub.
 *  2. Dentro da app (APK), comparamos com a versão instalada
 *     (App.getInfo: build = versionCode do build.gradle).
 *  3. Se houver mais nova: o menu (☰) > Aplicação mostra o cartão de
 *     actualização e o botão abre o download no navegador do telefone
 *     (Chrome), que depois entrega o APK ao Android para instalar.
 *
 * O WebView não pode instalar APKs por segurança — o navegador do sistema
 * é o caminho oficial e simples. Só corre na app nativa; no site é ignorado.
 */

import { Capacitor } from '@capacitor/core';

export interface InfoActualizacao {
  nova: boolean;
  versaoRemota?: string;
  versaoLocal?: string;
  notas?: string;
  urlApk?: string;
}

export async function verificarActualizacao(): Promise<InfoActualizacao | null> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();

    const res = await fetch('/app-versao.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const remota = (await res.json()) as {
      versionCode: number;
      versionName: string;
      notas?: string;
      urlApk: string;
    };

    return {
      nova: Number(remota.versionCode) > Number(info.build),
      versaoRemota: remota.versionName,
      versaoLocal: info.version,
      notas: remota.notas,
      urlApk: remota.urlApk,
    };
  } catch {
    return null;
  }
}

/** Abre o download do APK no navegador do telefone (fora da app). */
export async function abrirDownloadApk(url: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}
