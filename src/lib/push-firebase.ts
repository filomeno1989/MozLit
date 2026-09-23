/**
 * PUSH FCM - lado do servidor (v1.1.0)
 *
 * Envia notificações push reais para o telemóvel (Android) via Firebase Cloud
 * Messaging HTTP v1, por TÓPICOS - não precisamos de guardar tokens:
 *
 *  - «novas-obras»        → todos os telemóveis com a app (subscrição automática)
 *  - «autor-<uuid>»       → seguidores de cada autor (subscrição ao seguir,
 *                           e ao abrir a app para cobrir quem já seguia)
 *
 * Configuração (Vercel > Settings > Environment Variables):
 *   FIREBASE_SERVICE_ACCOUNT_JSON = conteúdo integral do ficheiro
 *   mozlit-firebase-adminsdk-*.json (tal como está, entre chavetas).
 *
 * Sem a variável definida, este módulo é um no-op com log - as operações
 * principais (publicar obra/capítulo) nunca falham por causa do push
 * (mesma regra de ouro de notificar.ts: uma falha de notificação NUNCA
 * rebenta a operação principal).
 */

import jwt from 'jsonwebtoken';

interface ContaServico {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface TokenCache {
  token: string;
  expiraEm: number; // epoch ms
}

let conta: ContaServico | null = null;
let contaLida = false;
let cacheToken: TokenCache | null = null;

/**
 * Lê a chave da conta de serviço da variável de ambiente. Aceita JSON puro
 * ou base64 (algumas consolas descaracterizam aspas/newlines).
 */
function obterContaServico(): ContaServico | null {
  if (contaLida) return conta;
  contaLida = true;

  const bruto = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!bruto) {
    console.warn('[MozLit] FIREBASE_SERVICE_ACCOUNT_JSON não definida - push FCM desactivado (só sino interno).');
    return null;
  }

  try {
    let texto = bruto;
    if (!bruto.startsWith('{')) {
      texto = Buffer.from(bruto, 'base64').toString('utf-8');
    }
    const parsed = JSON.parse(texto) as ContaServico;
    // Variáveis de ambiente achatam frequentemente os \n da private_key
    if (parsed.private_key && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.error('[MozLit] FIREBASE_SERVICE_ACCOUNT_JSON incompleta (falta project_id/client_email/private_key).');
      return null;
    }
    conta = parsed;
    return conta;
  } catch (err) {
    console.error('[MozLit] FIREBASE_SERVICE_ACCOUNT_JSON inválida:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Token OAuth2 para a API FCM HTTP v1 (scope firebase.messaging).
 * JWT assinado RS256 trocado por access token - em cache até expirar menos 2 min.
 */
async function obterTokenAcesso(): Promise<string | null> {
  const cs = obterContaServico();
  if (!cs) return null;

  if (cacheToken && Date.now() < cacheToken.expiraEm) return cacheToken.token;

  const agora = Math.floor(Date.now() / 1000);
  const assinatura = jwt.sign(
    {
      iss: cs.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    },
    cs.private_key,
    { algorithm: 'RS256' }
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assinatura,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '');
    console.error('[MozLit] OAuth FCM falhou:', res.status, detalhe.slice(0, 300));
    return null;
  }

  const dados = (await res.json()) as { access_token: string; expires_in: number };
  cacheToken = {
    token: dados.access_token,
    expiraEm: Date.now() + (dados.expires_in - 120) * 1000,
  };
  return cacheToken.token;
}

export interface DadosPush {
  /** Tipo espelha a Notificação interna: OBRA_NOVA | CAPITULO_NOVO */
  tipo?: string;
  livroId?: string;
  capituloId?: string;
  autorId?: string;
}

/**
 * Estado da configuração, para diagnóstico (endpoint admin /api/push/estado).
 * Nunca expõe a chave - só diz se existe e a que projecto pertence.
 */
export function estadoConfigPush(): { configurado: boolean; projectId: string | null } {
  const cs = obterContaServico();
  return { configurado: cs != null, projectId: cs?.project_id ?? null };
}

/**
 * Envia uma notificação push para um tópico FCM. Nunca lança.
 * Título ≤ 120 e corpo ≤ 240 - bandeja do Android trunca com reticências.
 */
export async function enviarPushTopico(
  topico: string,
  titulo: string,
  corpo: string,
  dados: DadosPush = {}
): Promise<boolean> {
  try {
    const token = await obterTokenAcesso();
    if (!token) return false; // sem chave configurada ou OAuth falhou

    const cs = conta as ContaServico;
    const dadosStr: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(dados)) {
      if (valor != null && valor !== '') dadosStr[chave] = String(valor);
    }

    const mensagem = {
      message: {
        topic: topico,
        notification: {
          title: titulo.slice(0, 120),
          body: corpo.slice(0, 240),
        },
        data: dadosStr,
        android: {
          priority: 'HIGH' as const,
          ttl: '86400s', // 24 h - depois disso a notícia já não é "nova"
        },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${cs.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mensagem),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      const detalhe = await res.text().catch(() => '');
      console.error(`[MozLit] Push para "${topico}" falhou:`, res.status, detalhe.slice(0, 300));
      return false;
    }
    console.log(`[MozLit] Push enviado para tópico "${topico}": ${titulo.slice(0, 60)}`);
    return true;
  } catch (err) {
    console.error('[MozLit] Push falhou (não bloqueia):', err instanceof Error ? err.message : err);
    return false;
  }
}
