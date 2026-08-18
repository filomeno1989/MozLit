import requests, json, sys

BASE = 'http://localhost:3099'

def login():
    r = requests.post(f'{BASE}/api/auth/login', json={'email': 'filomeno1989@gmail.com', 'senha': 'Filas1989'})
    assert r.status_code == 200, f'Login failed: {r.text}'
    data = r.json()
    token = data['token']
    user_id = data['user']['id']
    print(f'[OK] Login: {data["user"]["nome"]} (role={data["user"]["role"]})')
    return token, user_id

def test_create_book_multi_cat(token):
    """Test 1: Create book with multiple categories + all sections"""
    book = {
        'titulo': 'Teste de Categorias Múltiplas',
        'sinopse': 'Um livro para testar categorias múltiplas e secções opcionais.',
        'categorias': ['Ficção', 'Drama', 'Suspense'],
        'preco_total': 150,
        'ficha_tecnica': 'ISBN: 978-1234567890\nEditora: MozLit Editora\nAno: 2025\n1ª Edição',
        'dedicatoria': 'À minha mãe, que sempre acreditou nos meus sonhos.\nAo povo moçambicano.',
        'epigrafe': '"A literatura é a mais bela forma de resistência."\n— Mia Couto',
        'epilogo': 'Este livro foi escrito ao longo de dois anos.\nAgradeço a todos que me apoiaram nesta jornada.',
    }
    r = requests.post(f'{BASE}/api/books',
        headers={'Authorization': f'Bearer {token}'},
        json=book)
    assert r.status_code == 201, f'Create book failed: {r.text}'
    data = r.json()
    assert 'categorias' in data, 'Missing categorias in response'
    assert data['categorias'] == ['Ficção', 'Drama', 'Suspense'], f'Wrong categorias: {data["categorias"]}'
    assert data['ficha_tecnica'] == book['ficha_tecnica'], 'ficha_tecnica mismatch'
    assert data['dedicatoria'] == book['dedicatoria'], 'dedicatoria mismatch'
    assert data['epigrafe'] == book['epigrafe'], 'epigrafe mismatch'
    assert data['epilogo'] == book['epilogo'], 'epilogo mismatch'
    print(f'[OK] Create book: categorias={data["categorias"]}, has all sections')
    return data['id']

def test_get_book(book_id):
    """Test 2: GET book returns parsed categorias + sections"""
    r = requests.get(f'{BASE}/api/books/{book_id}')
    assert r.status_code == 200, f'Get book failed: {r.text}'
    data = r.json()
    assert isinstance(data['categorias'], list), f'categorias should be list: {type(data["categorias"])}'
    assert 'Ficção' in data['categorias'], 'Missing Ficção in categorias'
    assert 'Drama' in data['categorias'], 'Missing Drama in categorias'
    assert data['ficha_tecnica'].startswith('ISBN'), 'ficha_tecnica missing'
    assert 'Mia Couto' in data['epigrafe'], 'epigrafe missing'
    print(f'[OK] GET book: categorias={data["categorias"]}')

def test_filter_by_category(token):
    """Test 3: Filter books by category (any match in JSON array)"""
    # First publish the book
    # We need a published book to test filtering
    # Create another book with Ficção category and publish it
    r = requests.post(f'{BASE}/api/books',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'titulo': 'Livro Ficção Puro',
            'sinopse': 'Teste de filtro',
            'categorias': ['Ficção'],
        })
    assert r.status_code == 201
    book2_id = r.json()['id']
    # Publish it
    requests.patch(f'{BASE}/api/books/{book2_id}',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'PUBLICADO'})

    # Filter by Ficção
    r = requests.get(f'{BASE}/api/books?categoria=Ficção')
    assert r.status_code == 200, f'Filter failed: {r.text}'
    data = r.json()
    # At least one book should be returned
    assert len(data) >= 1, f'Expected >= 1 book, got {len(data)}'
    print(f'[OK] Filter by Ficção: {len(data)} book(s) found')
    return book2_id

def test_patch_book(book_id, token):
    """Test 4: PATCH book to update categorias and sections"""
    r = requests.patch(f'{BASE}/api/books/{book_id}',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'categorias': ['Ficção', 'Terror', 'Romance', 'Crónica'],
            'dedicatoria': 'Nova dedicatória actualizada.',
            'epilogo': '',  # Clear epilogo
        })
    assert r.status_code == 200, f'Patch failed: {r.text}'
    data = r.json()
    assert data['categorias'] == ['Ficção', 'Terror', 'Romance', 'Crónica'], f'Wrong categorias after patch: {data["categorias"]}'
    assert data['dedicatoria'] == 'Nova dedicatória actualizada.', 'dedicatoria not updated'
    assert data['epilogo'] == '', 'epilogo should be cleared'
    print(f'[OK] PATCH book: categorias={data["categorias"]}')

def test_author_dashboard(token):
    """Test 5: Author dashboard returns categorias as array"""
    r = requests.get(f'{BASE}/api/author',
        headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200, f'Author dashboard failed: {r.text}'
    data = r.json()
    assert 'livros' in data
    for livro in data['livros']:
        assert 'categorias' in livro, 'Missing categorias in dashboard livro'
        assert isinstance(livro['categorias'], list), f'categorias should be list: {type(livro["categorias"])}'
    print(f'[OK] Author dashboard: {len(data["livros"])} books, all have categorias as arrays')

def test_chapter_with_sections(book_id, token):
    """Test 6: Chapter API returns book sections + isFirstChapter/isLastChapter"""
    # Create a chapter
    r = requests.post(f'{BASE}/api/chapters',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'titulo': 'Capítulo Único',
            'conteudo': 'Este é o conteúdo do capítulo de teste.\n\nTem vários parágrafos.',
            'livroId': book_id,
            'is_free': True,
        })
    assert r.status_code in [200, 201], f'Create chapter failed: {r.text}'
    chapter_id = r.json()['id']

    # Get the chapter
    r = requests.get(f'{BASE}/api/chapters/{chapter_id}')
    assert r.status_code == 200, f'Get chapter failed: {r.text}'
    data = r.json()
    ch = data['chapter']

    # Check book sections are returned
    assert 'ficha_tecnica' in ch['livro'], 'Missing ficha_tecnica in chapter response'
    assert 'dedicatoria' in ch['livro'], 'Missing dedicatoria in chapter response'
    assert 'epigrafe' in ch['livro'], 'Missing epigrafe in chapter response'
    assert 'epilogo' in ch['livro'], 'Missing epilogo in chapter response'
    assert 'isFirstChapter' in ch, 'Missing isFirstChapter'
    assert 'isLastChapter' in ch, 'Missing isLastChapter'

    # Single chapter = both first and last
    assert ch['isFirstChapter'] == True, 'Should be first chapter'
    assert ch['isLastChapter'] == True, 'Should be last chapter'

    # Check categorias parsed
    assert isinstance(ch['livro']['categorias'], list), 'categorias should be list'

    print(f'[OK] Chapter API: sections returned, isFirst={ch["isFirstChapter"]}, isLast={ch["isLastChapter"]}')
    return chapter_id

def test_by_author_endpoint(token, user_id):
    """Test 7: /api/books/by-author/[autorId] returns categorias"""
    # First publish a book
    r = requests.get(f'{BASE}/api/books/by-author/{user_id}')
    assert r.status_code == 200, f'by-author failed: {r.text}'
    data = r.json()
    for book in data:
        assert 'categorias' in book, 'Missing categorias in by-author response'
        assert isinstance(book['categorias'], list), f'categorias should be list: {type(book["categorias"])}'
    print(f'[OK] by-author: {len(data)} books, all have categorias')

# Run tests
if __name__ == '__main__':
    token, user_id = login()
    book_id = test_create_book_multi_cat(token)
    test_get_book(book_id)
    book2_id = test_filter_by_category(token)
    test_patch_book(book_id, token)
    test_author_dashboard(token)
    chapter_id = test_chapter_with_sections(book_id, token)
    test_by_author_endpoint(token, user_id)
    print('\n=== ALL 7 TESTS PASSED ===')