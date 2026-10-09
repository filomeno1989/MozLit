import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken, verificarAdminActivo } from '@/lib/auth';
import { estadoConfigPush, enviarPushTopico } from '@/lib/push-firebase';

/**
 * GET /api/push/estado - diagnóstico do push FCM (só ADMIN).
 *
 * Sem parâmetros: diz se a chave da conta de serviço está configurada no
 * servidor (FIREBASE_SERVICE_ACCOUNT_JSON) e a que projecto pertence.
 *   {"configurado":true,"projectId":"mozlit"}
 *
 * Com ?testar=TOPICO: envia uma notificação de teste para o tópico indicado
 * (ex.: ?testar=novas-obras) - os telemóveis com a app subscrita recebem
 * "Notificação de teste do MozLit". Nome do tópico limitado a letras,
 * números, hífen e underscore.
 */
export async function GET(request: NextRequest) {
  try {
    // SEGURANÇA (auditoria 2026-10 M2): token só no header Authorization —
    // aceitar «?token=» no URL expunha o JWT a logs de acesso, histórico do
    // navegador e headers Referer. O papel revalida-se na BASE DE DADOS
    // (verificarAdminActivo): um admin despromovido perde o acesso de imediato,
    // não à expiração do token de 7 dias.
    const url = new URL(request.url);
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const estado = estadoConfigPush();
    const testar = url.searchParams.get('testar');

    if (!testar) {
      return NextResponse.json(estado);
    }

    if (!/^[A-Za-z0-9_-]+$/.test(testar)) {
      return NextResponse.json({ error: 'Nome de tópico inválido' }, { status: 400 });
    }

    const enviado = await enviarPushTopico(
      testar,
      'Notificação de teste do MozLit',
      'Se leste isto no telemóvel, o push está a funcionar.',
      { tipo: 'TESTE' }
    );

    return NextResponse.json({ ...estado, topico: testar, enviado });
  } catch (error) {
    console.error('Erro no diagnóstico de push:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
