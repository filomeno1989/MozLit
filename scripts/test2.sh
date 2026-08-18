#!/bin/bash
TOKEN=$(curl -s 'http://127.0.0.1:3099/api/auth/login' -X POST -H 'Content-Type: application/json' -d '{"email":"filomeno1989@gmail.com","senha":"Filas1989"}' | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).token))')

echo '=== Create book ==='
RESULT=$(curl -s 'http://127.0.0.1:3099/api/books' -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"titulo":"Obra Completa","sinopse":"Teste","categorias":["Ficcao","Drama"],"ficha_tecnica":"ISBN 123","dedicatoria":"A minha mae","epigrafe":"Citacao","epilogo":"Fim","preco_total":200}')
echo "$RESULT" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("cats:",r.categorias);console.log("ficha:",r.ficha_tecnica);console.log("dedi:",r.dedicatoria);console.log("epig:",r.epigrafe);console.log("epil:",r.epilogo);process.stdout.write("ID="+r.id+"\n")}')
BOOK_ID=$(echo "$RESULT" | node -e 'process.stdin.on("data",d=>process.stdout.write(JSON.parse(d).id))')

echo '=== GET book ==='
curl -s "http://127.0.0.1:3099/api/books/$BOOK_ID" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("cats:",r.categorias,"isArray:",Array.isArray(r.categorias))})'

echo '=== PATCH categorias ==='
curl -s "http://127.0.0.1:3099/api/books/$BOOK_ID" -X PATCH -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"categorias":["Romance","Cronica"]}' | node -e 'process.stdin.on("data",d=>console.log("new cats:",JSON.parse(d).categorias))'

echo '=== Author dashboard ==='
curl -s 'http://127.0.0.1:3099/api/author' -H "Authorization: Bearer $TOKEN" | node -e 'process.stdin.on("data",d=>{const r=JSON.parse(d);console.log("books:",r.livros.length);r.livros.forEach(l=>console.log(" -",l.titulo,l.categorias.join(",")))})'

echo '=== DONE ==='
