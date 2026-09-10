/**
 * SEGURANÇA: preencha TESTE_ADMIN_EMAIL e TESTE_ADMIN_SENA no .env.local antes de correr.

 * Teste E2E das APIs do MozLit (corre contra o servidor dev local, porta 3000).
 * Cenários:
 *  1. Login do admin por EMAIL + senha (fluxo que falhou em produção)
 *  2. GET /api/conta (perfil)
 *  3. PATCH /api/conta (mudar senha) + login com a nova senha
 *  4. Registo de utilizador por TELEFONE +258
 *  5. Admin muda papel do utilizador (LEITOR → ESCRITOR)
 *  6. Admin redefine senha do utilizador + login com a senha nova
 *  7. Guardas: usuário normal não acede a /api/admin/*; admin não muda o próprio papel
 */
const BASE = 'http://localhost:3000';
let falhas = 0;

function ok(nome, cond, extra = '') {
  if (cond) console.log(`  PASS: ${nome}`);
  else { falhas++; console.log(`  FAIL: ${nome} ${extra}`); }
}

async function api(caminho, { metodo = 'GET', body, token } = {}) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, data };
}

async function main() {
  console.log('== 1. Login admin por email ==');
  const login = await api('/api/auth/login', {
    metodo: 'POST',
    body: { identificador: process.env.TESTE_ADMIN_EMAIL, senha: process.env.TESTE_ADMIN_SENA },
  });
  ok('login 200', login.status === 200, JSON.stringify(login.data));
  ok('role ADMIN', login.data?.user?.role === 'ADMIN');
  const tokenAdmin = login.data?.token;

  console.log('== 2. GET /api/conta ==');
  const conta = await api('/api/conta', { token: tokenAdmin });
  ok('conta 200', conta.status === 200, JSON.stringify(conta.data));
  ok('email correcto', conta.data?.user?.email === 'filomeno1989@gmail.com');
  ok('tem createdAt', typeof conta.data?.user?.createdAt === 'string');

  console.log('== 3. Mudar senha própria (PATCH /api/conta) ==');
  const mudar = await api('/api/conta', {
    metodo: 'PATCH',
    token: tokenAdmin,
    body: { senhaAtual: process.env.TESTE_ADMIN_SENA, novaSenha: 'NovaSenha123' },
  });
  ok('patch 200', mudar.status === 200, JSON.stringify(mudar.data));
  const loginNovo = await api('/api/auth/login', {
    metodo: 'POST',
    body: { identificador: process.env.TESTE_ADMIN_EMAIL, senha: 'NovaSenha123' },
  });
  ok('login com nova senha', loginNovo.status === 200, JSON.stringify(loginNovo.data));
  // Repor a senha original para o estado inicial
  const repor = await api('/api/conta', {
    metodo: 'PATCH',
    token: loginNovo.data?.token,
    body: { senhaAtual: 'NovaSenha123', novaSenha: process.env.TESTE_ADMIN_SENA },
  });
  ok('reposição da senha', repor.status === 200, JSON.stringify(repor.data));

  console.log('== 4. Registo por telefone (+258) ==');
  const numTeste = '84' + Math.floor(1000000 + Math.random() * 8999999);
  const registo = await api('/api/auth/register', {
    metodo: 'POST',
    body: { nome: 'Leitor Teste', telefone: numTeste, dial: '+258', senha: 'senha123', role: 'LEITOR' },
  });
  ok('registo 201', registo.status === 201, JSON.stringify(registo.data));
  const tokenUser = registo.data?.token;
  const idUser = registo.data?.user?.id;

  console.log('== 5. Admin muda papel para ESCRITOR ==');
  const papel = await api('/api/admin/utilizadores', {
    metodo: 'PATCH',
    token: tokenAdmin,
    body: { id: idUser, acao: 'PAPEL', papel: 'ESCRITOR' },
  });
  ok('papel 200', papel.status === 200, JSON.stringify(papel.data));
  ok('role ESCRITOR', papel.data?.user?.role === 'ESCRITOR');

  console.log('== 6. Admin redefine senha do utilizador ==');
  const reset = await api('/api/admin/utilizadores', {
    metodo: 'PATCH',
    token: tokenAdmin,
    body: { id: idUser, acao: 'SENHA', novaSenha: 'temp123' },
  });
  ok('reset 200', reset.status === 200, JSON.stringify(reset.data));
  const loginTemp = await api('/api/auth/login', {
    metodo: 'POST',
    body: { identificador: `+258${numTeste}`, senha: 'temp123' },
  });
  ok('login do utilizador com senha temporária', loginTemp.status === 200, JSON.stringify(loginTemp.data));

  console.log('== 7. Guardas de segurança ==');
  const bloqueado = await api('/api/admin/estatisticas', { token: tokenUser });
  ok('utilizador comum bloqueado no admin (403)', bloqueado.status === 403, `status=${bloqueado.status}`);
  const propio = await api('/api/admin/utilizadores', {
    metodo: 'PATCH',
    token: tokenAdmin,
    body: { id: login.data?.user?.id, acao: 'PAPEL', papel: 'LEITOR' },
  });
  ok('admin não muda o próprio papel (400)', propio.status === 400, `status=${propio.status}`);
  const semSenha = await api('/api/conta', {
    metodo: 'PATCH',
    token: tokenAdmin,
    body: { novaSenha: 'abc123' },
  });
  ok('mudar senha sem senha actual falha (400)', semSenha.status === 400, `status=${semSenha.status}`);

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
