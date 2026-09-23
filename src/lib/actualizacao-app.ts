'use client';

/**
 * ACTUALIZAÇÃO DA APP POR DENTRO (v1.2.0)
 *
 * 1. O ficheiro estático /app-versao.json (no site) diz qual é a versão
 *    mais recente: versionCode, versionName, notas e o link do APK.
 * 2. Dentro da app (APK), comparamos com a versão instalada
 *    (App.getInfo: build = versionCode do build.gradle).
 * 3. Se houver mais nova: a app DESCARREGA O APK POR DENTRO (fetch em
 *    streaming com progresso e até 3 tentativas) e abre o instalador do
 *    Android através do plugin nativo InstaladorApk (FileProvider).
 *    Nada de navegador: era aí que a descarga morria, porque o Chrome
 *    Custom Tabs mata a descarga quando a app volta ao primeiro plano,
 *    deixando o ficheiro preso nos 100% sem nunca concluir.
 * 4. Em Android 8+, se faltar a permissão "Instalar apps desconhecidas",
 *    o plugin abre as definições; ao voltar à app a instalação repete-se
 *    automaticamente com o ficheiro já descarregado.
 *
 * Depois de actualizar, o diálogo "O que há de novo" mostra as notas da
 * versão instalada uma única vez (marcadas em localStorage).
 */

import { Capacitor } from '@capacitor/core';

export interface InfoActualizacao {
  nova: boolean;
  versaoRemota?: string;
  versaoLocal?: string;
  notas?: string;
  urlApk?: string;
  codigoRemoto?: number;
  codigoLocal?: number;
  /** Notas da versão instalada ainda não mostradas (acabou de actualizar). */
  novidades?: string;
}

const CHAVE_NOTAS_VISTAS = 'mozlit_notas_vistas_code';

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
      urlApkAlternativa?: string;
    };

    const codigoLocal = Number(info.build);
    const codigoRemoto = Number(remota.versionCode);

    const r: InfoActualizacao = {
      nova: codigoRemoto > codigoLocal,
      versaoRemota: remota.versionName,
      versaoLocal: info.version,
      notas: remota.notas,
      urlApk: remota.urlApk,
      codigoRemoto,
      codigoLocal,
    };

    // Acabou de actualizar? Mostrar as novidades uma única vez por versão.
    if (!r.nova && codigoRemoto === codigoLocal && remota.notas) {
      let vistas = 0;
      try {
        vistas = Number(localStorage.getItem(CHAVE_NOTAS_VISTAS) || '0');
      } catch {
        vistas = 0;
      }
      if (codigoLocal > vistas) r.novidades = remota.notas;
    }

    return r;
  } catch {
    return null;
  }
}

/** Guarda que as novidades da versão instalada já foram mostradas. */
export function marcarNovidadesVistas(codigo: number): void {
  try {
    localStorage.setItem(CHAVE_NOTAS_VISTAS, String(codigo));
  } catch {
    /* sem localStorage: ignora */
  }
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Falha ao preparar a descarga'));
    leitor.onload = () => {
      const s = String(leitor.result || '');
      const virgula = s.indexOf(',');
      resolve(virgula >= 0 ? s.slice(virgula + 1) : s);
    };
    leitor.readAsDataURL(blob);
  });
}

/**
 * Descarrega o APK por dentro da app (fetch em streaming, com progresso
 * e até 3 tentativas) e devolve o caminho absoluto do ficheiro guardado
 * na cache da própria app.
 */
async function descarregarApk(
  url: string,
  aoProgresso?: (recebido: number, total: number) => void,
): Promise<string> {
  let ultimoErro: unknown = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok || !res.body) throw new Error(`O servidor respondeu ${res.status}`);

      const total = Number(res.headers.get('content-length') || '0');
      const leitor = res.body.getReader();
      const partes: Uint8Array[] = [];
      let recebido = 0;
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        partes.push(value);
        recebido += value.length;
        aoProgresso?.(recebido, total);
      }
      if (total > 0 && recebido !== total) {
        throw new Error(`Descarga incompleta (${recebido} de ${total} bytes)`);
      }

      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const blob = new Blob(partes as BlobPart[]);
      const dados = await blobParaBase64(blob);
      await Filesystem.writeFile({
        path: 'MozLit.apk',
        data: dados,
        directory: Directory.Cache,
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({ path: 'MozLit.apk', directory: Directory.Cache });
      return uri.replace('file://', '');
    } catch (e) {
      ultimoErro = e;
      if (tentativa < 3) await new Promise((r) => setTimeout(r, 1500 * tentativa));
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error('Falha na descarga');
}

export type ResultadoActualizacao = {
  estado: 'instalador_aberto' | 'permissao_necessaria';
  caminho: string;
};

/**
 * Descarrega e abre o instalador do Android, tudo por dentro da app.
 * Se faltar a permissão de instalação, o plugin abre as definições e é
 * devolvido 'permissao_necessaria': ao voltar à app, chamar de novo
 * instalarApkDescarregado(caminho) para concluir.
 */
export async function descarregarEInstalar(
  urlApk: string,
  aoProgresso?: (recebido: number, total: number) => void,
): Promise<ResultadoActualizacao> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    throw new Error('A actualização por dentro só funciona na app');
  }
  const caminho = await descarregarApk(urlApk, aoProgresso);
  const { InstaladorApk } = await import('@/plugins/instalador-apk');
  const r = await InstaladorApk.instalar({ caminho });
  return {
    estado: r.estado === 'permissao_necessaria' ? 'permissao_necessaria' : 'instalador_aberto',
    caminho,
  };
}

/** Instala um APK já descarregado (usado ao voltar de dar a permissão). */
export async function instalarApkDescarregado(
  caminho: string,
): Promise<'instalador_aberto' | 'permissao_necessaria'> {
  const { InstaladorApk } = await import('@/plugins/instalador-apk');
  const r = await InstaladorApk.instalar({ caminho });
  return r.estado === 'permissao_necessaria' ? 'permissao_necessaria' : 'instalador_aberto';
}

/** O Android já permite instalar APKs vindos desta app? */
export async function podeInstalarApk(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const { InstaladorApk } = await import('@/plugins/instalador-apk');
  const r = await InstaladorApk.podeInstalar();
  return !!r.pode;
}

/**
 * Fallback: abre a descarga no navegador PRINCIPAL do telefone (Chrome
 * completo, via ACTION_VIEW nativo). Ao contrário do Chrome Custom Tabs,
 * as descargas aí sobrevivem à volta à app e podem ser retomadas.
 */
export async function abrirDownloadApk(url: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }
  const { InstaladorApk } = await import('@/plugins/instalador-apk');
  await InstaladorApk.abrirNoNavegador({ url });
}
