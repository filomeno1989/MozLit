'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Eye, Pencil, Trash2, TrendingUp, DollarSign, FileText } from 'lucide-react';

interface DashboardData {
  totalGanhos: number;
  totalLivros: number;
  totalCapitulos: number;
  livros: Array<{
    id: string;
    titulo: string;
    categoria: string;
    status: string;
    totalCapitulos: number;
    capitulosPagos: number;
    receitaEstimada: number;
    createdAt: string;
  }>;
  transacoes: Array<{ valor: number; createdAt: string; descricao: string }>;
}

interface BookWithChapters {
  id: string;
  titulo: string;
  status: string;
  chapters: Array<{ id: string; titulo: string; ordem: number; preco_capitulo: number; is_free: boolean }>;
}

export default function AuthorDashboard() {
  const { user, navigate, token } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookChapters, setBookChapters] = useState<BookWithChapters | null>(null);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [newChapter, setNewChapter] = useState({ titulo: '', conteudo: '', preco_capitulo: '0', is_free: false });

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const d = await apiFetch<DashboardData>('/api/author');
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookChapters(bookId: string) {
    try {
      const b = await apiFetch<BookWithChapters>(`/api/books/${bookId}`);
      setBookChapters(b);
      setShowChapterDialog(true);
    } catch {
      alert('Erro ao carregar capítulos');
    }
  }

  async function publishBook(bookId: string) {
    try {
      await apiFetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLICADO' }),
      });
      loadDashboard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function deleteBook(bookId: string) {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return;
    try {
      await apiFetch(`/api/books/${bookId}`, { method: 'DELETE' });
      loadDashboard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function addChapter() {
    if (!bookChapters || !newChapter.titulo || !newChapter.conteudo) {
      alert('Título e conteúdo são obrigatórios.');
      return;
    }
    try {
      await apiFetch('/api/chapters', {
        method: 'POST',
        body: JSON.stringify({
          titulo: newChapter.titulo,
          conteudo: newChapter.conteudo,
          livroId: bookChapters.id,
          preco_capitulo: parseFloat(newChapter.preco_capitulo) || 0,
          is_free: newChapter.is_free,
        }),
      });
      setNewChapter({ titulo: '', conteudo: '', preco_capitulo: '0', is_free: false });
      loadBookChapters(bookChapters.id);
      loadDashboard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Painel do Autor</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas obras e acompanhe seus ganhos</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => navigate('new-book')}
        >
          <Plus className="h-4 w-4 mr-1" /> Nova Obra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <DollarSign className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Total</p>
              <p className="text-xl font-bold">{(data?.totalGanhos ?? 0).toFixed(2)} MZN</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Obras</p>
              <p className="text-xl font-bold">{data?.totalLivros ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capítulos</p>
              <p className="text-xl font-bold">{data?.totalCapitulos ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Livros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Minhas Obras</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.livros.length ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma obra criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.livros.map((livro) => (
                <div key={livro.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{livro.titulo}</h3>
                      <Badge variant={livro.status === 'PUBLICADO' ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {livro.status === 'PUBLICADO' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {livro.categoria} — {livro.totalCapitulos} cap. ({livro.capitulosPagos} pagos) — Receita: {livro.receitaEstimada.toFixed(2)} MZN
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => loadBookChapters(livro.id)}>
                      <FileText className="h-3.5 w-3.5 mr-1" /> Capítulos
                    </Button>
                    {livro.status !== 'PUBLICADO' && (
                      <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => publishBook(livro.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Publicar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBook(livro.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapter Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capítulos — {bookChapters?.titulo}</DialogTitle>
          </DialogHeader>
          {bookChapters && (
            <div className="space-y-4">
              {/* Existing chapters */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {bookChapters.chapters.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="truncate">
                      <span className="text-muted-foreground font-mono text-xs mr-2">
                        {String(ch.ordem + 1).padStart(2, '0')}
                      </span>
                      {ch.titulo}
                      {ch.is_free && <Badge variant="secondary" className="ml-2 text-xs">Grátis</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {ch.is_free ? 'Grátis' : `${ch.preco_capitulo.toFixed(2)} MZN`}
                    </span>
                  </div>
                ))}
                {bookChapters.chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">Nenhum capítulo.</p>
                )}
              </div>

              {/* Add chapter form */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Adicionar Capítulo</p>
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={newChapter.titulo}
                    onChange={(e) => setNewChapter({ ...newChapter, titulo: e.target.value })}
                    placeholder="Título do capítulo"
                  />
                </div>
                <div>
                  <Label className="text-xs">Conteúdo</Label>
                  <Textarea
                    value={newChapter.conteudo}
                    onChange={(e) => setNewChapter({ ...newChapter, conteudo: e.target.value })}
                    placeholder="Escreva o conteúdo do capítulo..."
                    rows={6}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Preço (MZN)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newChapter.preco_capitulo}
                      onChange={(e) => setNewChapter({ ...newChapter, preco_capitulo: e.target.value })}
                      disabled={newChapter.is_free}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="free-check"
                      checked={newChapter.is_free}
                      onChange={(e) => setNewChapter({ ...newChapter, is_free: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="free-check" className="text-xs">Grátis</Label>
                  </div>
                </div>
                <Button
                  onClick={addChapter}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Capítulo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}