const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: '127.0.0.1', port: 3099, path, method, family: 4,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { _raw: raw }; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const post = (path, body, token) => request('POST', path, body, token);
const get = (path, token) => request('GET', path, null, token);
const patch = (path, body, token) => request('PATCH', path, body, token);

async function main() {
  const login = await post('/api/auth/login', { email: 'filomeno1989@gmail.com', senha: 'Filas1989' });
  console.log('1. Login:', login.status, login.data.user?.nome || login.data.error);
  if (!login.data.token) { console.error('No token'); return; }
  const token = login.data.token;

  const book = await post('/api/books', {
    titulo: 'Obra Teste',
    sinopse: 'Sinopse teste',
    categorias: ['Ficcao', 'Drama', 'Suspense'],
    ficha_tecnica: 'ISBN: 978-123',
    dedicatoria: 'A minha mae',
    epigrafe: 'Citacao de abertura',
    epilogo: 'Notas finais',
    preco_total: 200,
  }, token);
  console.log('2. Create:', book.status, book.data.error || 'OK');
  console.log('   categorias:', book.data.categorias);
  console.log('   ficha:', book.data.ficha_tecnica ? 'OK' : 'MISSING');
  console.log('   dedi:', book.data.dedicatoria ? 'OK' : 'MISSING');
  console.log('   epig:', book.data.epigrafe ? 'OK' : 'MISSING');
  console.log('   epil:', book.data.epilogo ? 'OK' : 'MISSING');
  if (book.data.error) return;
  const bookId = book.data.id;

  const fetched = await get(`/api/books/${bookId}`);
  console.log('3. GET:', fetched.status, 'isArray:', Array.isArray(fetched.data.categorias), 'cats:', fetched.data.categorias);

  const patched = await patch(`/api/books/${bookId}`, {
    categorias: ['Romance', 'Cronica', 'Terror'],
    dedicatoria: 'Nova dedi',
    epilogo: '',
  }, token);
  console.log('4. PATCH:', patched.status, 'cats:', patched.data.categorias);
  console.log('   dedi updated:', patched.data.dedicatoria === 'Nova dedi');
  console.log('   epilogo cleared:', patched.data.epilogo === '');

  const dash = await get('/api/author', token);
  console.log('5. Dashboard:', dash.status, dash.data.livros?.length, 'books');

  const all = await get('/api/books');
  console.log('6. All books:', all.status, all.data?.length);

  console.log('\n=== TESTS DONE ===');
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
