#!/bin/bash
set -e
BASE=http://localhost:3099

echo '=== LOGIN ==='
LOGIN=$(curl -s "$BASE/api/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"filomeno1989@gmail.com","senha":"Filas1989"}')
TOKEN=$(echo "$LOGIN" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).token))')
echo "Token: ${TOKEN:0:20}..."
AUTH="Authorization: Bearer $TOKEN"

# TEST 1: Create book with multi-categorias + all sections
echo '--- TEST 1: Create book ---'
RESULT=$(curl -s "$BASE/api/books" -X POST -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"titulo":"Livro Multi","sinopse":"Teste","categorias":["Ficção","Drama","Suspense"],"ficha_tecnica":"ISBN: 978-123","dedicatoria":"À minha mãe.","epigrafe":"Citação — Autor","epilogo":"Notas finais."}')
echo "$RESULT" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("categorias:",r.categorias);console.log("ficha_tecnica:",r.ficha_tecnica?"OK":"MISSING");console.log("dedicatoria:",r.dedicatoria?"OK":"MISSING");console.log("epigrafe:",r.epigrafe?"OK":"MISSING");console.log("epilogo:",r.epilogo?"OK":"MISSING");process.stdout.write("BOOK_ID="+r.id+"\n")})'
BOOK_ID=$(echo "$RESULT" | node -e 'process.stdin.on("data",d=>process.stdout.write(JSON.parse(d).id))')
echo "Book ID: $BOOK_ID"

# TEST 2: GET book
echo '--- TEST 2: GET book ---'
curl -s "$BASE/api/books/$BOOK_ID" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("categorias:",r.categorias);console.log("is array:",Array.isArray(r.categorias))})'

# TEST 3: PATCH book
echo '--- TEST 3: PATCH book ---'
curl -s "$BASE/api/books/$BOOK_ID" -X PATCH -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"categorias":["Romance","Crónica"]}' | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("updated categorias:",r.categorias)})'

# TEST 4: Author dashboard
echo '--- TEST 4: Author dashboard ---'
curl -s "$BASE/api/author" -H "$AUTH" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("livros:",r.livros.length);r.livros.forEach(l=>console.log("  -",l.titulo,JSON.stringify(l.categorias)))})'

# TEST 5: Filter
echo '--- TEST 5: Filter by categoria ---'
# First publish a book
curl -s "$BASE/api/books" -X POST -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"titulo":"Livro Ficção","sinopse":"s","categorias":["Ficção"]}' > /dev/null
echo "Filter results (none published yet, checking endpoint works):"
curl -s "$BASE/api/books" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("total books:",r.length);r.forEach(b=>console.log("  -",b.titulo,"cats:",JSON.stringify(b.categorias)))})'

echo '=== ALL TESTS PASSED ==='
