'use client';

/**
 * PUSH FCM - lado da app (v1.1.0)
 *
 * Notificações push reais no telemóvel, via Firebase Cloud Messaging
 * (plugin @capacitor-firebase/messaging + TÓPICOS, sem guardar tokens):
 *
 *  - «novas-obras»  : todas as apps subscrevem ao activar o push → obra nova
 *                     publicada chega a toda a comunidade.
 *  - «autor-<id>»   : subscreve-se ao seguir um autor (e ao activar/entrar,
 *                     para cobrir quem já seguia) → capítulos novos.
 *
 * Estados possíveis:
 *  - 'inactivo'      : utilizador desligou nas definições
 *  - 'a_activar'     : a pedir permissão / inscrever tópicos
 *  - 'activo'        : inscrito no FCM e nos tópicos
 *  - 'negado'        : utilizador recusou a permissão do Android
 *  - 'indisponivel'  : Firebase não configurado nesta versão do APK
 *                      (google-services.json ausente) - fica para a próxima
 *
 * No site (navegador) tudo isto é ignorado.
 */

import { Capacitor } from '@capacitor/core';
import { useAppStore } from '@/store/app';
import { apiFetch } from '@/lib/api';

export type EstadoPush =
  | 'inactivo'
  | 'a_activar'
  | 'activo'
  | 'negado'
  | 'indisponivel';

const CHAVE_PREF = 'mozlit_push_pref'; // 'on' | 'off'

let estadoActual: EstadoPush = 'inactivo';
let arrancado = false;
let ouvintesRegistados = false;
const ouvintes = new Set<(e: EstadoPush) => void>();
/** Tópicos «autor-<id>» subscritos neste telemóvel (para desinscrever). */
const topicosAutor = new Set<string>();

function definirEstado(e: EstadoPush): void {
  if (estadoActual === e) return;
  estadoActual = e;
  ouvintes.forEach((o) => o(e));
}

export function estadoPushAgora(): EstadoPush {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return 'inactivo';
  return estadoActual;
}

export function subscreverEstadoPush(fn: (e: EstadoPush) => void): () => void {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

function prefGuardada(): string | null {
  try {
    return localStorage.getItem(CHAVE_PREF);
  } catch {
    return null;
  }
}

function guardarPref(v: 'on' | 'off'): void {
  try {
    localStorage.setItem(CHAVE_PREF, v);
  } catch {
    // sem localStorage não há preferência que valha - segue-se o padrão 'on'
  }
}

/** Dados da notificação → navegação dentro da app (espelha o sino interno). */
function navegarPorDados(dados: Record<string, string>): void {
  const st = useAppStore.getState();
  const livroId = dados.livroId || undefined;
  const capituloId = dados.capituloId || undefined;
  const autorId = dados.autorId || undefined;
  if (dados.tipo === 'CAPITULO_NOVO' && capituloId) {
    st.navigate('reader', { chapterId: capituloId, bookId: livroId });
  } else if (livroId) {
    st.navigate('book-detail', { bookId: livroId });
  } else if (autorId) {
    st.navigate('autor', { autorId });
  } else {
    st.navigate('home');
  }
}

/** Registra os listeners FCM (uma única vez por sessão da app). */
async function registarListeners(): Promise<void> {
  if (ouvintesRegistados) return;
  ouvintesRegistados = true;

  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  const { toast } = await import('sonner');

  // App aberta: o Android não mostra a notificação em primeiro plano -
  // mostramos nós, como toast discreto, com atalho para o conteúdo.
  await FirebaseMessaging.addListener('notificationReceived', (evento) => {
    const n = evento.notification;
    const dados = (n.data && typeof n.data === 'object' ? n.data : {}) as Record<string, string>;
    if (!n.title && !n.body) return;
    toast(n.title || 'MozLit', {
      description: n.body || undefined,
      action: Object.keys(dados).length > 0
        ? { label: 'Abrir', onClick: () => navegarPorDados(dados) }
        : undefined,
    });
  });

  // Toque na notificação na bandeja do sistema (app fechada ou ao fundo)
  await FirebaseMessaging.addListener('notificationActionPerformed', (evento) => {
    const n = evento.notification;
    const dados = (n.data && typeof n.data === 'object' ? n.data : {}) as Record<string, string>;
    if (Object.keys(dados).length > 0) navegarPorDados(dados);
    else useAppStore.getState().navigate('home');
  });
}

/**
 * Inscreve o telemóvel nos tópicos «autor-<id>» dos autores que o utilizador
 * segue (e desinscreve os que deixaram de ser seguidos neste dispositivo).
 */
export async function sincronizarTopicosSeguidos(): Promise<void> {
  if (estadoActual !== 'activo') return;
  try {
    const r = await apiFetch<{ autores: string[] }>('/api/autor/seguidos');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const desejados = new Set(r.autores || []);
    for (const id of desejados) {
      if (!topicosAutor.has(id)) {
        await FirebaseMessaging.subscribeToTopic({ topic: `autor-${id}` });
        topicosAutor.add(id);
      }
    }
    for (const id of [...topicosAutor]) {
      if (!desejados.has(id)) {
        await FirebaseMessaging.unsubscribeFromTopic({ topic: `autor-${id}` });
        topicosAutor.delete(id);
      }
    }
  } catch {
    // sem sessão ou rede fraca: fica para a próxima sincronização
  }
}

/** Follow/unfollow → sincroniza o tópico do autor neste telemóvel. */
export async function seguirAutorTopicos(autorId: string, seguindo: boolean): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  if (estadoActual !== 'activo' || !autorId) return;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    if (seguindo) {
      await FirebaseMessaging.subscribeToTopic({ topic: `autor-${autorId}` });
      topicosAutor.add(autorId);
    } else {
      await FirebaseMessaging.unsubscribeFromTopic({ topic: `autor-${autorId}` });
      topicosAutor.delete(autorId);
    }
  } catch {
    // falha de tópico não pode rebentar o seguir/desseguir
  }
}

/** É um erro de Firebase ausente (google-services.json não integrado)? */
function erroDeFirebase(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return msg.includes('firebase') || msg.includes('api key') || msg.includes('api_key');
}

/** Pede permissão, inscreve os tópicos e liga os listeners. */
export async function activarPush(): Promise<EstadoPush> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return 'inactivo';
  if (estadoActual === 'activo' || estadoActual === 'a_activar') return estadoActual;

  guardarPref('on');
  definirEstado('a_activar');
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    await registarListeners();

    const perm = await FirebaseMessaging.checkPermissions();
    let grant = perm.receive;
    if (grant !== 'granted') {
      const pedido = await FirebaseMessaging.requestPermissions();
      grant = pedido.receive;
    }
    if (grant !== 'granted') {
      definirEstado('negado');
      return 'negado';
    }

    await FirebaseMessaging.subscribeToTopic({ topic: 'novas-obras' });
    await sincronizarTopicosSeguidos();
    definirEstado('activo');
    return 'activo';
  } catch (err) {
    definirEstado(erroDeFirebase(err) ? 'indisponivel' : 'negado');
    return estadoActual;
  }
}

/** Desliga o push: desinscreve os tópicos deste telemóvel. */
export async function desactivarPush(): Promise<EstadoPush> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return 'inactivo';
  guardarPref('off');
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    await FirebaseMessaging.unsubscribeFromTopic({ topic: 'novas-obras' }).catch(() => undefined);
    for (const id of [...topicosAutor]) {
      await FirebaseMessaging.unsubscribeFromTopic({ topic: `autor-${id}` }).catch(() => undefined);
    }
    topicosAutor.clear();
  } catch {
    // desinscrever num dispositivo sem Firebase: ignorar
  }
  definirEstado('inactivo');
  return 'inactivo';
}

/**
 * Arranque automático (chamado de iniciarAppNativo, uma vez por sessão):
 * se o utilizador nunca desligou o push, pede permissão e activa.
 * O atraso de 4 s deixa a interface assentar antes do diálogo do Android 13+.
 */
export function arrancarPush(): void {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  if (arrancado) return;
  arrancado = true;

  setTimeout(() => {
    if (estadoActual === 'activo') return;
    const pref = prefGuardada();
    if (pref === 'off') {
      definirEstado('inactivo');
      return;
    }
    activarPush();
  }, 4000);
}
