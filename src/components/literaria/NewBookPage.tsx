'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, ImageIcon } from 'lucide-react';

const CATEGORIAS = ['Ficção', 'Poesia', 'Drama', 'Contos', 'Romance', 'História', 'Ensaio'];

export default function NewBookPage() {
  const { navigate } = useAppStore();
  const [titulo, setTitulo] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [categoria, setCategoria] = useState('Ficção');
  const [capa_url, setCapaUrl] = useState('');
  const [preco_total, setPrecoTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !sinopse) {
      setError('Título e sinopse são obrigatórios.');
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
          capa_url: capa_url || undefined,
          preco_total: parseFloat(preco_total) || 0,
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                      cat === categoria
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="capa_url">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  URL da Capa
                </span>
              </Label>
              <Input
                id="capa_url"
                type="url"
                value={capa_url}
                onChange={(e) => setCapaUrl(e.target.value)}
                placeholder="https://exemplo.com/capa.jpg"
              />
              {capa_url && (
                <div className="mt-2 w-24 aspect-[3/4] rounded-lg overflow-hidden border border-border/50">
                  <img
                    src={capa_url}
                    alt="Pré-visualização da capa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="preco_total">Preço do Livro Completo (MZN)</Label>
              <Input
                id="preco_total"
                type="number"
                step="0.01"
                min="0"
                value={preco_total}
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