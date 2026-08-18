'use client';

import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, ImageIcon, X, Upload } from 'lucide-react';

const CATEGORIAS_SUGESTOES = ['Ficção', 'Poesia', 'Drama', 'Contos', 'Romance', 'História', 'Ensaio', 'Autobiografia', 'Infanto-Juvenil', 'Ficção Científica', 'Terror', 'Suspense', 'Religioso', 'Filosofia', 'Crónica', 'Teatro'];

export default function NewBookPage() {
  const { navigate, token } = useAppStore();
  const [titulo, setTitulo] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaInput, setCategoriaInput] = useState('');
  const [showCategoriaSuggestions, setShowCategoriaSuggestions] = useState(false);
  const [capaUrl, setCapaUrl] = useState('');
  const [precoTotal, setPrecoTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = CATEGORIAS_SUGESTOES.filter(
    (s) => s.toLowerCase().includes(categoriaInput.toLowerCase()) && s.toLowerCase() !== categoria.toLowerCase()
  );

  function handleCategoriaSelect(cat: string) {
    setCategoria(cat);
    setCategoriaInput(cat);
    setShowCategoriaSuggestions(false);
  }

  function handleCategoriaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (categoriaInput.trim()) {
        setCategoria(categoriaInput.trim());
        setShowCategoriaSuggestions(false);
      }
    }
    if (e.key === 'Backspace' && !categoriaInput && categoria) {
      setCategoria('');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro no upload');
      }
      const data = await res.json();
      setCapaUrl(data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !sinopse) {
      setError('Título e sinopse são obrigatórios.');
      return;
    }
    if (!categoria) {
      setError('Seleccione ou digite uma categoria.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify({
          titulo,
          sinopse,
          categoria,
          capa_url: capaUrl || undefined,
          preco_total: parseFloat(precoTotal) || 0,
        }),
      });
      navigate('author-dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('author-dashboard')} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nova Obra</CardTitle>
          <CardDescription>Crie uma nova obra literária.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da obra"
                required
              />
            </div>

            <div>
              <Label htmlFor="sinopse">Sinopse</Label>
              <Textarea
                id="sinopse"
                value={sinopse}
                onChange={(e) => setSinopse(e.target.value)}
                placeholder="Descreva brevemente a obra..."
                rows={4}
                required
              />
            </div>

            {/* Categoria com busca + sugestões + livre */}
            <div>
              <Label>Categoria</Label>
              <div className="relative mt-1.5">
                <Input
                  value={categoriaInput}
                  onChange={(e) => {
                    setCategoriaInput(e.target.value);
                    setCategoria('');
                    setShowCategoriaSuggestions(true);
                  }}
                  onFocus={() => setShowCategoriaSuggestions(true)}
                  onKeyDown={handleCategoriaKeyDown}
                  onBlur={() => setTimeout(() => setShowCategoriaSuggestions(false), 200)}
                  placeholder="Digite ou seleccione uma categoria..."
                />
                {showCategoriaSuggestions && filteredSuggestions.length > 0 && !categoria && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={() => handleCategoriaSelect(cat)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {categoria && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-600 text-white">
                      {categoria}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCategoria(''); setCategoriaInput(''); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  Comece a digitar para pesquisar, ou escreva a sua própria categoria e prima Enter.
                </p>
              </div>
            </div>

            {/* Capa: Upload + URL */}
            <div>
              <Label>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Capa do Livro
                </span>
              </Label>
              <div className="mt-1.5 space-y-3">
                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Enviar imagem do dispositivo'}
                </Button>

                {/* URL input */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Input
                  type="url"
                  value={capaUrl}
                  onChange={(e) => setCapaUrl(e.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                />

                {/* Preview */}
                {capaUrl && (
                  <div className="relative inline-block">
                    <img
                      src={capaUrl}
                      alt="Pré-visualização da capa"
                      className="w-28 aspect-[3/4] rounded-lg object-cover border border-border/50 shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setCapaUrl('')}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="preco_total">Preço do Livro Completo (MZN)</Label>
              <Input
                id="preco_total"
                type="number"
                step="0.01"
                min="0"
                value={precoTotal}
                onChange={(e) => setPrecoTotal(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe 0 ou vazio se quiser vender apenas capítulos avulsos.
              </p>
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              <Plus className="h-4 w-4 mr-1" /> {loading ? 'Criando...' : 'Criar Obra'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
