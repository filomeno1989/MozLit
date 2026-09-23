/**
 * STUB do SDK web do Firebase («firebase/messaging»)
 *
 * O plugin @capacitor-firebase/messaging usa esta importação APENAS na sua
 * implementação web (web.js), que é carregada de forma preguiçosa e nunca
 * executa nos nossos dois ambientes:
 *  - APK Android: usa a ponte nativa do plugin (FirebaseMessaging nativo);
 *  - Site: push-app.ts sai antes de qualquer import (isNativePlatform()).
 *
 * O stub existe só para o bundler não exigir o SDK JS do Firebase. Exporta os
 * nomes que o web.js importa, como funções no-op seguras.
 */

export function deleteToken(): Promise<boolean> {
  return Promise.resolve(false);
}

export function getMessaging(): unknown {
  return null;
}

export function getToken(): Promise<string> {
  return Promise.resolve('');
}

export function isSupported(): Promise<boolean> {
  return Promise.resolve(false);
}

export function onMessage(): void {
  // no-op - nunca deve ser chamado
}
