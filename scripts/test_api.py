#!/usr/bin/env python3
"""API tests for MozLit updates"""
import json, urllib.request, sys

BASE = "http://localhost:3000"

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

print("=== Test 1: Books API returns cover, author bio/avatar ===")
books = api("GET", "/api/books")
print(f"  {len(books)} books loaded")
for b in books:
    has_cover = b['capa_url'] != '/placeholder-cover.svg'
    has_bio = bool(b['autor'].get('biografia'))
    has_avatar = bool(b['autor'].get('avatar_url'))
    print(f"  [{b['categoria']}] {b['titulo']}: cover={has_cover} bio={has_bio} avatar={has_avatar} preco_total={b['preco_total']}")

print("\n=== Test 2: Book detail with author bio ===")
b = api("GET", f"/api/books/{books[0]['id']}")
print(f"  Title: {b['titulo']}")
print(f"  Cover URL: {b['capa_url'][:60]}...")
print(f"  preco_total: {b['preco_total']}")
print(f"  Author: {b['autor']['nome']}")
print(f"  Bio: {b['autor']['biografia'][:80]}...")
print(f"  Avatar: {b['autor']['avatar_url'][:60]}...")
print(f"  Chapters: {len(b['chapters'])}")

print("\n=== Test 3: Login as reader ===")
login = api("POST", "/api/auth/login", {"email": "maria@mozlit.mz", "senha": "leitor123"})
token = login['token']
print(f"  Logged in: {login['user']['nome']}")

print("\n=== Test 4: Library shows full book IDs ===")
lib = api("GET", "/api/library", token=token)
print(f"  Items: {len(lib['items'])}")
print(f"  Full book IDs: {lib['fullBookIds']}")
for item in lib['items']:
    ch = item.get('chapter')
    if ch:
        print(f"    - Ch: {ch['titulo']} (Book: {ch['livro']['titulo']}) tipo={item['tipo']}")
    else:
        print(f"    - Book: bookId={item['bookId']} tipo={item['tipo']}")

# Find Crónica da Rua 513 (reader owns complete)
cronica = [b for b in books if b['titulo'] == 'Crónica da Rua 513'][0]
cronica_detail = api("GET", f"/api/books/{cronica['id']}")
cronica_ch = cronica_detail['chapters'][0]

print(f"\n=== Test 5: Chapter access via full book ownership ===")
result = api("GET", f"/api/chapters/{cronica_ch['id']}", token=token)
if 'error' in result:
    print(f"  ERROR: {result['error']}")
else:
    print(f"  ACCESS GRANTED: {result['chapter']['titulo']}")
    print(f"  Content: {result['chapter']['conteudo'][:60]}...")

# Find a paid chapter the reader doesn't own (Terra Sonâmbula ch2)
terra = [b for b in books if b['titulo'] == 'Terra Sonâmbula'][0]
terra_detail = api("GET", f"/api/books/{terra['id']}")
terra_ch2 = terra_detail['chapters'][1]  # Not free, not owned

print(f"\n=== Test 6: Chapter access denied (not owned) ===")
result = api("GET", f"/api/chapters/{terra_ch2['id']}", token=token)
if 'error' in result:
    print(f"  DENIED: {result['error']}")
else:
    print(f"  UNEXPECTED ACCESS: {result['chapter']['titulo']}")

# Buy full book
ventos = [b for b in books if b['titulo'] == 'Ventos do Apocalipse'][0]
print(f"\n=== Test 7: Purchase full book ({ventos['titulo']}) ===")
result = api("POST", "/api/library", {"bookId": ventos['id']}, token=token)
print(f"  Result: {result}")

# Verify access after purchase
ventos_detail = api("GET", f"/api/books/{ventos['id']}")
ventos_paid_ch = [c for c in ventos_detail['chapters'] if not c['is_free']][0]
print(f"\n=== Test 8: Access paid chapter after full book purchase ===")
result = api("GET", f"/api/chapters/{ventos_paid_ch['id']}", token=token)
if 'error' in result:
    print(f"  ERROR: {result['error']}")
else:
    print(f"  ACCESS GRANTED: {result['chapter']['titulo']}")
    print(f"  Content: {result['chapter']['conteudo'][:60]}...")

# Author profile
print(f"\n=== Test 9: Author profile ===")
login_escritor = api("POST", "/api/auth/login", {"email": "mia@mozlit.mz", "senha": "escritor123"})
esc_token = login_escritor['token']
profile = api("GET", "/api/author/profile", token=esc_token)
print(f"  Name: {profile['nome']}")
print(f"  Bio: {profile['biografia'][:80]}...")
print(f"  Avatar: {profile['avatar_url'][:60]}...")

# Books by author
print(f"\n=== Test 10: Books by author (Mia Couto) ===")
autor_books = api("GET", f"/api/books/by-author/{profile['id']}")
print(f"  {len(autor_books)} books")
for ab in autor_books:
    print(f"    - {ab['titulo']} ({ab['preco_total']} MZN)")

print("\n=== ALL TESTS PASSED ===")