'use client';

/**
 * Integração com a app nativa Android (Capacitor).
 *
 * No navegador tudo isto é ignorado (Capacitor.isNativePlatform() é falso).
 * Dentro da app APK:
 *  1. Botão back do Android navega dentro do histórico interno da SPA
 *     e só sai da app quando o utilizador está na raiz (home) - antes,
 *     o toque em back fechava a aplicação de imediato.
 *  2. O splash com o logótipo ML é escondido assim que a interface está
 *     pronta (o plugin tem auto-hide de segurança aos 4 s).
 *  3. versaoApp() devolve a versão do APK (versionName do build.gradle)
 *     para mostrar no rodapé.
 */

import { Capacitor } from '@capacitor/core';
import { useAppStore } from '@/store/app';
import { arrancarPush } from '@/lib/push-app';

let iniciado = false;

export function iniciarAppNativo(): void {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  if (!Capacitor.isNativePlatform()) return;

  (async () => {
    const { App } = await import('@capacitor/app');
    const { SplashScreen } = await import('@capacitor/splash-screen');

    // Splash: esconder assim que a React está montada (a app carrega o site
    // remoto; sem isto o ecrã ficaria branco enquanto a rede responde).
    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {
      // auto-hide do plugin cobre este caso
    }

    // Botão back do Android: controlo total do comportamento.
    // Com listener registado, o Capacitor deixa de decidir sozinho
    // (antes: saía da app quando o histórico do WebView esgotava).
    App.addListener('backButton', () => {
      const st = useAppStore.getState();
      if (st._history.length > 1) {
        st.goBack();
      } else {
        // Na raiz: comportamento padrão Android de verdade, sai.
        App.exitApp();
      }
    });

    // Push FCM (v1.1.0): permissão + registro + tópicos, 4 s depois de abrir
    // (a interface assenta primeiro; o diálogo do Android 13+ chega calmo).
    arrancarPush();
  })().catch(() => {
    // Falha de integração não pode quebrar a app web
  });
}

/** Versão do APK (versionName) ou null fora da app nativa. */
export async function versaoApp(): Promise<string | null> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info.version;
  } catch {
    return null;
  }
}
