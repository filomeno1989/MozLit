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
import { Plus, BookOpen, Eye, Pencil, Trash2, DollarSign, FileText, User, ImageIcon, Save } from 'lucide-react';

interface DashboardData {
  totalGanhos: number;
  totalLivros: number;
  totalCapitulos: number;
  biografia: string;
  avatar_url: string;
  livros: Array<{
    id: string;
    titulo: string;
    categoria: string;
    capa_url: string;
    status: string;
    preco_total: number;
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
  capa_url: string;
  preco_total: number;
  status: string;
  sinopse: string;
  categoria: string;
  chapters: Array<{ id: string; titulo: string; ordem: number; preco_capitulo: number; is_free: boolean }>;
}

export default function AuthorDashboard() {
  const { user, navigate, token } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookChapters, setBookChapters] = useState<BookWithChapters | null>(null);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [newChapter, setNewChapter] = useState({ titulo: '', conteudo: '', preco_capitulo: '0', is_free: false });

  // Edit book dialog
  const [editingBook, setEditingBook] = useState<BookWithChapters | null>(null);
  const [editForm, setEditForm] = useState({ titulo: '', sinopse: '', capa_url: '', preco_total: '' });

  // Profile dialog
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({ biografia: '', avatar_url: '' });

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const d = await apiFetch<DashboardData>('/api/author');
      setData(d);
      setProfileForm({ biografia: d.biografia ?? '', avatar_url: d.avatar_url ?? '' });
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

  function openEditBook(livro: DashboardData['livros'][0]) {
    setEditForm({
      titulo: livro.titulo,
      sinopse: '', // Will load from full book detail
      capa_url: livro.capa_url || '',
      preco_total: livro.preco_total?.toString() ?? '0',
    });
    // Load full book data for editing
    apiFetch<BookWithChapters>(`/api/books/${livro.id}`).then((b) => {
      setEditingBook(b);
      setEditForm({
        titulo: b.titulo,
        sinopse: b.sinopse,
        capa_url: b.capa_url || '',
        preco_total: b.preco_total?.toString() ?? '0',
      });
    }).catch(() => alert('Erro ao carregar dados do livro'));
  }

  async function saveEditBook() {
    if (!editingBook) return;
    try {
      await apiFetch(`/api/books/${editingBook.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: editForm.titulo,
          sinopse: editForm.sinopse,
          capa_url: editForm.capa_url || undefined,
          preco_total: parseFloat(editForm.preco_total) || 0,
          categoria: editingBook.categoria,
        }),
      });
      setEditingBook(null);
      loadDashboard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function saveProfile() {
    try {
      await apiFetch('/api/author/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      });
      setShowProfileDialog(false);
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProfileDialog(true)}>
            <User className="h-4 w-4 mr-1" /> Meu Perfil
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate('new-book')}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Obra
          </Button>
        </div>
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
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Book cover thumbnail */}
                    {livro.capa_url && livro.capa_url !== '/placeholder-cover.svg' ? (
                      <img
                        src={livro.capa_url}
                        alt={livro.titulo}
                        className="w-10 h-14 rounded object-cover shrink-0 border border-border/30"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{livro.titulo}</h3>
                        <Badge variant={livro.status === 'PUBLICADO' ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {livro.status === 'PUBLICADO' ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {livro.categoria} — {livro.totalCapitulos} cap. ({livro.capitulosPagos} pagos)
                        {livro.preco_total > 0 && ` — Completo: ${livro.preco_total.toFixed(2)} MZN`}
                        {' — '}Receita: {livro.receitaEstimada.toFixed(2)} MZN
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 sm:ml-2">
                    <Button size="sm" variant="ghost" onClick={() => loadBookChapters(livro.id)}>
                      <FileText className="h-3.5 w-3.5 mr-1" /> Capítulos
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditBook(livro)}>
                      <Pencil className="h-3.5 w-3.5" />
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

      {/* Edit Book Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Obra</DialogTitle>
          </DialogHeader>
          {editingBook && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label>Sinopse</Label>
                <Textarea
                  value={editForm.sinopse}
                  onChange={(e) => setEditForm({ ...editForm, sinopse: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    URL da Capa
                  </span>
                </Label>
                <Input
                  type="url"
                  value={editForm.capa_url}
                  onChange={(e) => setEditForm({ ...editForm, capa_url: e.target.value })}
                  placeholder="https://exemplo.com/capa.jpg"
                />
                {editForm.capa_url && (
                  <div className="mt-2 w-20 aspect-[3/4] rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={editForm.capa_url}
                      alt="Pré-visualização"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Preço do Livro Completo (MZN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.preco_total}
                  onChange={(e) => setEditForm({ ...editForm, preco_total: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0 = apenas venda por capítulo avulso
                </p>
              </div>
              <Button onClick={saveEditBook} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <Save className="h-4 w-4 mr-1" /> Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Meu Perfil de Autor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Biografia</Label>
              <Textarea
                value={profileForm.biografia}
                onChange={(e) => setProfileForm({ ...profileForm, biografia: e.target.value })}
                placeholder="Escreva algo sobre você e sua obra literária..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {profileForm.biografia.length}/500 caracteres
              </p>
            </div>
            <div>
              <Label>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  URL do Avatar
                </span>
              </Label>
              <Input
                type="url"
                value={profileForm.avatar_url}
                onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                placeholder="https://exemplo.com/avatar.jpg"
              />
              {profileForm.avatar_url && (
                <div className="mt-2">
                  <img
                    src={profileForm.avatar_url}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-200 dark:border-amber-800"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
            <Button onClick={saveProfile} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              <Save className="h-4 w-4 mr-1" /> Salvar Perfil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}