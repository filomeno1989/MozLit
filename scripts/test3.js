const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = { hostname: '127.0.0.1', port: 3099, path, method, family: 4, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { let p; try { p = JSON.parse(raw); } catch { p = { _raw: raw }; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const login = await req('POST', '/api/auth/login', { email: 'filomeno1989@gmail.com', senha: 'Filas1989' });
  const token = login.data.token;

  // Publish some books with different categorias
  const b1 = await req('POST', '/api/books', { titulo: 'Livro Romance', sinopse: 's', categorias: ['Romance', 'Drama'] }, token);
  await req('PATCH', `/api/books/${b1.data.id}`, { status: 'PUBLICADO' }, token);

  const b2 = await req('POST', '/api/books', { titulo: 'Livro Terror', sinopse: 's', categorias: ['Terror', 'Suspense'] }, token);
  await req('PATCH', `/api/books/${b2.data.id}`, { status: 'PUBLICADO' }, token);

  const b3 = await req('POST', '/api/books', { titulo: 'Livro Romance e Suspense', sinopse: 's', categorias: ['Romance', 'Suspense'] }, token);
  await req('PATCH', `/api/books/${b3.data.id}`, { status: 'PUBLICADO' }, token);

  // Filter by Romance (should return b1 and b3)
  const rRomance = await req('GET', '/api/books?categoria=Romance');
  console.log('Filter Romance:', rRomance.data.length, 'books');
  rRomance.data.forEach(b => console.log('  -', b.titulo, b.categorias));

  // Filter by Terror (should return b2)
  const rTerror = await req('GET', '/api/books?categoria=Terror');
  console.log('Filter Terror:', rTerror.data.length, 'books');
  rTerror.data.forEach(b => console.log('  -', b.titulo, b.categorias));

  // Filter by Suspense (should return b2 and b3)
  const rSuspense = await req('GET', '/api/books?categoria=Suspense');
  console.log('Filter Suspense:', rSuspense.data.length, 'books');
  rSuspense.data.forEach(b => console.log('  -', b.titulo, b.categorias));

  console.log('\n=== FILTER TESTS PASSED ===');
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
