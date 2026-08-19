'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Eye, Pencil, Trash2, Coins, FileText, User, ImageIcon, Save, Upload, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIAS_SUGESTOES, type SectionKey, SECTION_LABELS, formatarMoedas } from '@/lib/constants';

interface DashboardData {
  totalGanhos: number;
  totalLivros: number;
  totalCapitulos: number;
  biografia: string;
  avatar_url: string;
  livros: Array<{
    id: string;
    titulo: string;
    categorias: string[];
    capa_url: string;
    status: string;
    preco_total: number;
    faixa_etaria: string;
    volume_info: { numero: number; total: number } | null;
    ficha_tecnica: string;
    dedicatoria: string;
    epigrafe: string;
    epilogo: string;
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
  categorias: string[];
  faixa_etaria: string;
  volume_info: { numero: number; total: number } | null;
  ficha_tecnica: string;
  dedicatoria: string;
  epigrafe: string;
  epilogo: string;
  chapters: Array<{ id: string; titulo: string; ordem: number; preco_capitulo: number; is_free: boolean }>;
}

export default function AuthorDashboard() {
  const { user, navigate, token } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookChapters, setBookChapters] = useState<BookWithChapters | null>(null);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [chapterError, setChapterError] = useState('');
  const [newChapter, setNewChapter] = useState({ titulo: '', conteudo: '', preco_capitulo: '0', is_free: false });

  // Edit chapter
  const [editingChapter, setEditingChapter] = useState<{ id: string; titulo: string; conteudo: string; preco_capitulo: string; is_free: boolean } | null>(null);
  const [savingChapter, setSavingChapter] = useState(false);

  // Edit book dialog
  const [editingBook, setEditingBook] = useState<BookWithChapters | null>(null);
  const [editForm, setEditForm] = useState({
    titulo: '', sinopse: '', capa_url: '', preco_total: '',
    categorias: [] as string[], categoriaInput: '',
    faixa_etaria: 'Livre',
    isVolume: false, volumeNumero: '1', volumeTotal: '',
    ficha_tecnica: '', dedicatoria: '', epigrafe: '', epilogo: '',
  });
  const [editShowCatSugg, setEditShowCatSugg] = useState(false);
  const [editActiveSections, setEditActiveSections] = useState<SectionKey[]>([]);
  const [editUploading, setEditUploading] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Error state for dashboard
  const [loadError, setLoadError] = useState(false);

  // Profile dialog
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({ biografia: '', avatar_url: '' });
  const [profileUploading, setProfileUploading] = useState(false);
  const profileFileRef = useRef<HTMLInputElement>(null);

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
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookChapters(bookId: string) {
    try {
      const b = await apiFetch<BookWithChapters>(`/api/books/${bookId}`);
      setBookChapters(b);
      setShowChapterDialog(true);
    } catch (err) {
      setChapterError((err as Error).message);
    }
  }

  async function publishBook(bookId: string) {
    try {
      await apiFetch(`/api/books/${bookId}`, { method: 'PATCH', body: JSON.stringify({ status: 'PUBLICADO' }) });
      loadDashboard();
      toast.success('Obra publicada com sucesso!');
    } catch (err) { toast.error((err as Error).message); }
  }

  async function unpublishBook(bookId: string) {
    try {
      await apiFetch(`/api/books/${bookId}`, { method: 'PATCH', body: JSON.stringify({ status: 'RASCUNHO' }) });
      loadDashboard();
      toast.success('Obra movida para rascunho.');
    } catch (err) { toast.error((err as Error).message); }
  }

  const [deleteBuyersCount, setDeleteBuyersCount] = useState(0);

  async function confirmDelete(bookId: string) {
    try {
      // Check how many buyers this book has
      const items = await apiFetch<{ items: Array<{ tipo: string }> }>('/api/library');
      // We can't filter server-side, but the API will block if buyers exist
      setDeleteBuyersCount(0); // Will be updated from error if blocked
      setDeleteTarget(bookId);
    } catch (err: any) {
      // If the API returns 409 with buyersCount, show it
      const msg = err?.message || '';
      if (msg.includes('Não pode excluir')) {
        toast.error(msg);
      } else {
        setDeleteTarget(bookId);
      }
    }
  }

  async function deleteBook() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/books/${deleteTarget}`, { method: 'DELETE' });
      setDeleteTarget(null);
      loadDashboard();
      toast.success('Obra excluída com sucesso.');
    } catch (err) { toast.error((err as Error).message); }
    finally { setDeleting(false); }
  }

  async function addChapter() {
    if (!bookChapters || !newChapter.titulo || !newChapter.conteudo) {
      setChapterError('Título e conteúdo são obrigatórios.'); return;
    }
    try {
      await apiFetch('/api/chapters', {
        method: 'POST',
        body: JSON.stringify({
          titulo: newChapter.titulo, conteudo: newChapter.conteudo,
          livroId: bookChapters.id, preco_capitulo: parseInt(newChapter.preco_capitulo) || 0,
          is_free: newChapter.is_free,
        }),
      });
      setNewChapter({ titulo: '', conteudo: '', preco_capitulo: '0', is_free: false });
      setChapterError('');
      loadBookChapters(bookChapters.id);
      loadDashboard();
    } catch (err) { setChapterError((err as Error).message); }
  }

  function openEditChapter(ch: { id: string; titulo: string; ordem: number; preco_capitulo: number; is_free: boolean }) {
    // Load full chapter content for editing
    apiFetch<{ titulo: string; conteudo: string; preco_capitulo: number; is_free: boolean }>(`/api/chapters/${ch.id}`).then((full) => {
      setEditingChapter({
        id: ch.id,
        titulo: full.titulo,
        conteudo: full.conteudo,
        preco_capitulo: String(Math.round(full.preco_capitulo)),
        is_free: full.is_free,
      });
    }).catch(() => toast.error('Erro ao carregar capítulo'));
  }

  async function saveEditChapter() {
    if (!editingChapter) return;
    setSavingChapter(true);
    try {
      await apiFetch(`/api/chapters/${editingChapter.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: editingChapter.titulo,
          conteudo: editingChapter.conteudo,
          preco_capitulo: parseInt(editingChapter.preco_capitulo) || 0,
          is_free: editingChapter.is_free,
        }),
      });
      setEditingChapter(null);
      if (bookChapters) loadBookChapters(bookChapters.id);
      loadDashboard();
      toast.success('Capítulo actualizado com sucesso.');
    } catch (err) { toast.error((err as Error).message); }
    finally { setSavingChapter(false); }
  }

  async function deleteChapter(chapterId: string) {
    if (!bookChapters) return;
    try {
      await apiFetch(`/api/chapters/${chapterId}`, { method: 'DELETE' });
      if (editingChapter?.id === chapterId) setEditingChapter(null);
      loadBookChapters(bookChapters.id);
      loadDashboard();
      toast.success('Capítulo excluído.');
    } catch (err) { toast.error((err as Error).message); }
  }

  // --- Upload helper ---
  async function uploadFile(file: File, tipo: 'capa' | 'avatar' = 'capa'): Promise<string> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) throw new Error(`Tipo não suportado (${file.type}). Use JPG, PNG, WEBP ou GIF.`);
    if (file.size > 5 * 1024 * 1024) throw new Error(`Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 5MB.`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    const res = await fetch('/api/upload', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
    });
    if (res.status === 429) throw new Error('Muitas requisições. Aguarde e tente novamente.');
    if (res.status === 502) throw new Error('Servidor indisponível. Recarregue a página.');
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro no upload'); }
    const d = await res.json();
    return d.url;
  }

  // --- Edit Book ---
  function openEditBook(livro: DashboardData['livros'][0]) {
    apiFetch<BookWithChapters>(`/api/books/${livro.id}`).then((b) => {
      setEditingBook(b);
      // Determine which sections are active (have content)
      const active: SectionKey[] = [];
      if (b.ficha_tecnica) active.push('ficha_tecnica');
      if (b.dedicatoria) active.push('dedicatoria');
      if (b.epigrafe) active.push('epigrafe');
      if (b.epilogo) active.push('epilogo');
      setEditActiveSections(active);
      setEditForm({
        titulo: b.titulo, sinopse: b.sinopse,
        capa_url: b.capa_url || '', preco_total: b.preco_total?.toString() ?? '0',
        categorias: Array.isArray(b.categorias) ? b.categorias : [],
        categoriaInput: '',
        ficha_tecnica: b.ficha_tecnica || '',
        dedicatoria: b.dedicatoria || '',
        epigrafe: b.epigrafe || '',
        epilogo: b.epilogo || '',
        faixa_etaria: b.faixa_etaria || 'Livre',
        isVolume: !!(b as any).volume_info,
        volumeNumero: (b as any).volume_info?.numero?.toString() ?? '1',
        volumeTotal: (b as any).volume_info?.total?.toString() ?? '',
      });
    }).catch(() => toast.error('Erro ao carregar dados do livro'));
  }

  // Multi-categoria helpers for edit
  const editCatFiltered = CATEGORIAS_SUGESTOES.filter(
    (s) =>
      s.toLowerCase().includes(editForm.categoriaInput.toLowerCase()) &&
      !editForm.categorias.some((c) => c.toLowerCase() === s.toLowerCase())
  );

  function editAddCategoria(cat: string) {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if (editForm.categorias.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    setEditForm({ ...editForm, categorias: [...editForm.categorias, trimmed], categoriaInput: '' });
    setEditShowCatSugg(false);
  }

  function editRemoveCategoria(cat: string) {
    setEditForm({ ...editForm, categorias: editForm.categorias.filter((c) => c !== cat) });
  }

  function editToggleSection(key: SectionKey) {
    setEditActiveSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  async function handleEditCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    try {
      const url = await uploadFile(file, 'capa');
      setEditForm((f) => ({ ...f, capa_url: url }));
    } catch (err) { toast.error((err as Error).message); }
    finally { setEditUploading(false); if (editFileRef.current) editFileRef.current.value = ''; }
  }

  async function handleProfileAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileUploading(true);
    try {
      const url = await uploadFile(file, 'avatar');
      setProfileForm((f) => ({ ...f, avatar_url: url }));
    } catch (err) { toast.error((err as Error).message); }
    finally { setProfileUploading(false); if (profileFileRef.current) profileFileRef.current.value = ''; }
  }

  async function saveEditBook() {
    if (!editingBook) return;
    try {
      const payload: Record<string, unknown> = {
        titulo: editForm.titulo,
        sinopse: editForm.sinopse,
        capa_url: editForm.capa_url || undefined,
        preco_total: parseInt(editForm.preco_total) || 0,
        categorias: editForm.categorias,
      };
      // Always send section fields (empty string to clear)
      payload.ficha_tecnica = editForm.ficha_tecnica;
      payload.dedicatoria = editForm.dedicatoria;
      payload.epigrafe = editForm.epigrafe;
      payload.epilogo = editForm.epilogo;
      payload.faixa_etaria = editForm.faixa_etaria;
      if (editForm.isVolume && editForm.volumeNumero && editForm.volumeTotal) {
        payload.volume_info = { numero: parseInt(editForm.volumeNumero), total: parseInt(editForm.volumeTotal) };
      } else {
        payload.volume_info = null;
      }

      await apiFetch(`/api/books/${editingBook.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditingBook(null);
      loadDashboard();
      toast.success('Obra actualizada com sucesso.');
    } catch (err) { toast.error((err as Error).message); }
  }

  async function saveProfile() {
    try {
      await apiFetch('/api/author/profile', { method: 'PATCH', body: JSON.stringify(profileForm) });
      setShowProfileDialog(false);
      loadDashboard();
      toast.success('Perfil actualizado com sucesso.');
    } catch (err) { toast.error((err as Error).message); }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {loadError ? (
        <div className="text-center py-16">
          <p className="text-destructive font-medium mb-2">Erro ao carregar o painel</p>
          <p className="text-sm text-muted-foreground mb-4">Verifique sua conexão e tente novamente.</p>
          <Button variant="outline" onClick={loadDashboard}>Tentar novamente</Button>
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Painel do Autor</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas obras e acompanhe seus ganhos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProfileDialog(true)}>
            <User className="h-4 w-4 mr-1" /> Meu Perfil
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate('new-book')}>
            <Plus className="h-4 w-4 mr-1" /> Nova Obra
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="transition-shadow hover:shadow-md"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Coins className="h-5 w-5 text-amber-700 dark:text-amber-400" /></div>
          <div><p className="text-xs text-muted-foreground">Ganhos (MC)</p><p className="text-xl font-bold">{formatarMoedas(Math.round(data?.totalGanhos ?? 0))}</p></div>
        </CardContent></Card>
        <Card className="transition-shadow hover:shadow-md"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" /></div>
          <div><p className="text-xs text-muted-foreground">Obras</p><p className="text-xl font-bold">{data?.totalLivros ?? 0}</p></div>
        </CardContent></Card>
        <Card className="transition-shadow hover:shadow-md"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><FileText className="h-5 w-5 text-blue-700 dark:text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">Capítulos</p><p className="text-xl font-bold">{data?.totalCapitulos ?? 0}</p></div>
        </CardContent></Card>
      </div>

      {/* Livros */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Minhas Obras</CardTitle></CardHeader>
        <CardContent>
          {!data?.livros.length ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma obra criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.livros.map((livro) => (
                <div key={livro.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {livro.capa_url && livro.capa_url !== '/placeholder-cover.svg' ? (
                      <img src={livro.capa_url} alt={livro.titulo} className="w-10 h-14 rounded object-cover shrink-0 border border-border/30" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex items-center justify-center shrink-0"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {livro.titulo}
                          {livro.volume_info && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (Vol. {livro.volume_info.numero}/{livro.volume_info.total})
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={livro.status === 'PUBLICADO' ? 'default' : 'secondary'} className="text-xs">
                            {livro.status === 'PUBLICADO' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                          {livro.faixa_etaria && livro.faixa_etaria !== 'Livre' && (
                            <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                              {livro.faixa_etaria}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {livro.categorias.join(', ')} - {livro.totalCapitulos} cap. ({livro.capitulosPagos} pagos)
                        {livro.preco_total > 0 && ` - Completo: ${Math.round(livro.preco_total)} MC`}
                        {' - '}Receita: {Math.round(livro.receitaEstimada)} MC
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 sm:ml-2">
                    <Button size="sm" variant="ghost" onClick={() => loadBookChapters(livro.id)}><FileText className="h-3.5 w-3.5 mr-1" /> Capítulos</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditBook(livro)} aria-label="Editar livro"><Pencil className="h-3.5 w-3.5" /></Button>
                    {livro.status !== 'PUBLICADO' && (
                      <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => publishBook(livro.id)}><Eye className="h-3.5 w-3.5 mr-1" /> Publicar</Button>
                    )}
                    {livro.status === 'PUBLICADO' && (
                      <Button size="sm" variant="outline" className="text-amber-600" onClick={() => unpublishBook(livro.id)}>Despublicar</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirmDelete(livro.id)} aria-label="Excluir livro"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.transacoes && data.transacoes.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Histórico de Transacções</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {data.transacoes.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{tx.descricao}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`text-sm font-medium shrink-0 ml-3 ${tx.valor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {tx.valor > 0 ? '+' : ''}{Math.round(tx.valor)} MC
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapter Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Capítulos - {bookChapters?.titulo}</DialogTitle><DialogDescription>Gerencie os capítulos desta obra.</DialogDescription></DialogHeader>
          {bookChapters && (
            <div className="space-y-4">
              {chapterError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">{chapterError}</div>
              )}
              <div className="divide-y divide-border/40">
                {bookChapters.chapters.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between text-sm p-2.5 first:pt-0 last:pb-0">
                    <span className="truncate">
                      <span className="text-muted-foreground font-mono text-xs mr-2">{String(ch.ordem + 1).padStart(2, '0')}</span>
                      {ch.titulo}
                      {ch.is_free && <Badge variant="secondary" className="ml-2 text-xs">Grátis</Badge>}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground mr-1">{ch.is_free ? 'Grátis' : `${Math.round(ch.preco_capitulo)} MC`}</span>
                      <button onClick={() => openEditChapter(ch)} className="p-1 rounded hover:bg-accent transition-colors" title="Editar capítulo"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteChapter(ch.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Excluir capítulo"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
                {bookChapters.chapters.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum capítulo.</p>}
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Adicionar Capítulo</p>
                <div><Label className="text-xs">Título</Label><Input value={newChapter.titulo} onChange={(e) => setNewChapter({ ...newChapter, titulo: e.target.value })} placeholder="Título do capítulo" /></div>
                <div><Label className="text-xs">Conteúdo</Label><Textarea value={newChapter.conteudo} onChange={(e) => setNewChapter({ ...newChapter, conteudo: e.target.value })} placeholder="Escreva o conteúdo do capítulo..." rows={6} /></div>
                <div className="flex items-center gap-4">
                  <div className="flex-1"><Label className="text-xs">Preço (MC)</Label><Input type="number" step="1" min="0" value={newChapter.preco_capitulo} onChange={(e) => setNewChapter({ ...newChapter, preco_capitulo: e.target.value })} disabled={newChapter.is_free} /></div>
                  <div className="flex items-center gap-2 pt-5">
                    <Checkbox id="free-check" checked={newChapter.is_free} onCheckedChange={(checked) => setNewChapter({ ...newChapter, is_free: !!checked })} />
                    <Label htmlFor="free-check" className="text-xs cursor-pointer">Grátis</Label>
                  </div>
                </div>
                <Button onClick={addChapter} className="w-full bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-1" /> Adicionar Capítulo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Obra</DialogTitle><DialogDescription>Altere os detalhes da sua obra literária.</DialogDescription></DialogHeader>
          {editingBook && (
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} /></div>
              <div><Label>Sinopse</Label><Textarea value={editForm.sinopse} onChange={(e) => setEditForm({ ...editForm, sinopse: e.target.value })} rows={3} /></div>

              {/* Multi-categoria */}
              <div>
                <Label>Categorias</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={editForm.categoriaInput}
                    onChange={(e) => { setEditForm({ ...editForm, categoriaInput: e.target.value }); setEditShowCatSugg(true); }}
                    onFocus={() => setEditShowCatSugg(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); editAddCategoria(editForm.categoriaInput); }
                      if (e.key === 'Backspace' && !editForm.categoriaInput && editForm.categorias.length > 0) editRemoveCategoria(editForm.categorias[editForm.categorias.length - 1]);
                    }}
                    onBlur={() => setTimeout(() => setEditShowCatSugg(false), 200)}
                    placeholder="Adicionar categoria..."
                  />
                  {editShowCatSugg && editCatFiltered.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md max-h-40 overflow-y-auto">
                      {editCatFiltered.map((cat) => (
                        <button key={cat} type="button" onMouseDown={() => editAddCategoria(cat)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg">{cat}</button>
                      ))}
                    </div>
                  )}
                  {editForm.categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editForm.categorias.map((cat) => (
                        <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-600 text-white">
                          {cat}
                          <button type="button" onClick={() => editRemoveCategoria(cat)} className="hover:text-amber-200"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Capa: Upload + URL */}
              <div>
                <Label><span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Capa do Livro</span></Label>
                <div className="mt-1.5 space-y-2">
                  <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleEditCoverUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" disabled={editUploading} onClick={() => editFileRef.current?.click()}>
                    {editUploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />} {editUploading ? 'Enviando...' : 'Enviar imagem'}
                  </Button>
                  <Input type="url" value={editForm.capa_url} onChange={(e) => setEditForm({ ...editForm, capa_url: e.target.value })} placeholder="ou cole uma URL" />
                  {editForm.capa_url && (
                    <div className="relative inline-block">
                      <img src={editForm.capa_url} alt="Pré-visualização" className="w-20 aspect-[3/4] rounded-lg object-cover border border-border/50" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none'; }} />
                      <button type="button" onClick={() => setEditForm({ ...editForm, capa_url: '' })} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>

              {/* Secções opcionais */}
              <div>
                <Label className="text-sm font-medium">Secções Opcionais</Label>
                <div className="space-y-2 mt-2">
                  {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => {
                    const info = SECTION_LABELS[key];
                    const isActive = editActiveSections.includes(key);
                    return (
                      <div key={key} className="border border-border/50 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => editToggleSection(key)}
                          className="w-full flex items-center justify-between p-2.5 text-left hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{info.icon}</span>
                            <span className="text-sm font-medium">{info.label}</span>
                          </div>
                          {isActive ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isActive && (
                          <div className="px-2.5 pb-2.5">
                            <Textarea
                              value={editForm[key]}
                              onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                              placeholder={`Escreva a ${info.label.toLowerCase()} aqui...`}
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Classificação Etária</Label>
                <select
                  value={editForm.faixa_etaria}
                  onChange={(e) => setEditForm({ ...editForm, faixa_etaria: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Livre">Livre (Todos os públicos)</option>
                  <option value="10+">10+ anos</option>
                  <option value="12+">12+ anos</option>
                  <option value="14+">14+ anos</option>
                  <option value="16+">16+ anos</option>
                  <option value="18+">18+ anos</option>
                </select>
              </div>

              {/* Volumes */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <BookOpen className="h-3.5 w-3.5" />
                    Obra em Volumes
                  </Label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isVolume: !editForm.isVolume })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isVolume ? 'bg-amber-600' : 'bg-border'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.isVolume ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {editForm.isVolume && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Volume N.º</Label>
                      <Input type="number" min="1" value={editForm.volumeNumero} onChange={(e) => setEditForm({ ...editForm, volumeNumero: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Total de Volumes</Label>
                      <Input type="number" min="2" value={editForm.volumeTotal} onChange={(e) => setEditForm({ ...editForm, volumeTotal: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Preço do Livro Completo (MC)</Label>
                <Input type="number" step="1" min="0" value={editForm.preco_total} onChange={(e) => setEditForm({ ...editForm, preco_total: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">0 = apenas venda por capítulo avulso</p>
              </div>
              <Button onClick={saveEditBook} className="w-full bg-amber-600 hover:bg-amber-700 text-white"><Save className="h-4 w-4 mr-1" /> Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Meu Perfil de Autor</DialogTitle><DialogDescription>Actualize a sua biografia e foto de perfil.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Biografia</Label>
              <Textarea value={profileForm.biografia} onChange={(e) => setProfileForm({ ...profileForm, biografia: e.target.value })} placeholder="Escreva algo sobre você e sua obra literária..." rows={4} maxLength={500} />
              <p className={`text-xs mt-1 ${profileForm.biografia.length > 450 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>{profileForm.biografia.length}/500 caracteres</p>
            </div>
            <div>
              <Label><span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Avatar</span></Label>
              <div className="mt-1.5 space-y-2">
                <input ref={profileFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleProfileAvatarUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" disabled={profileUploading} onClick={() => profileFileRef.current?.click()}>
                  {profileUploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />} {profileUploading ? 'Enviando...' : 'Enviar foto'}
                </Button>
                <Input type="url" value={profileForm.avatar_url} onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })} placeholder="ou cole uma URL" />
                {profileForm.avatar_url && (
                  <div className="relative inline-block">
                    <img src={profileForm.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-amber-200 dark:border-amber-800" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none'; }} />
                    <button type="button" onClick={() => setProfileForm({ ...profileForm, avatar_url: '' })} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"><X className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={saveProfile} className="w-full bg-amber-600 hover:bg-amber-700 text-white"><Save className="h-4 w-4 mr-1" /> Salvar Perfil</Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
      )}

      {/* Edit Chapter Dialog */}
      <Dialog open={!!editingChapter} onOpenChange={(open) => { if (!open) setEditingChapter(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Capítulo</DialogTitle><DialogDescription>Altere o título, conteúdo e preço do capítulo.</DialogDescription></DialogHeader>
          {editingChapter && (
            <div className="space-y-4">
              <div><Label className="text-xs">Título</Label><Input value={editingChapter.titulo} onChange={(e) => setEditingChapter({ ...editingChapter, titulo: e.target.value })} /></div>
              <div><Label className="text-xs">Conteúdo</Label><Textarea value={editingChapter.conteudo} onChange={(e) => setEditingChapter({ ...editingChapter, conteudo: e.target.value })} rows={10} /></div>
              <div className="flex items-center gap-4">
                <div className="flex-1"><Label className="text-xs">Preço (MC)</Label><Input type="number" step="1" min="0" value={editingChapter.preco_capitulo} onChange={(e) => setEditingChapter({ ...editingChapter, preco_capitulo: e.target.value })} disabled={editingChapter.is_free} /></div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox id="edit-free-check" checked={editingChapter.is_free} onCheckedChange={(checked) => setEditingChapter({ ...editingChapter, is_free: !!checked })} />
                  <Label htmlFor="edit-free-check" className="text-xs cursor-pointer">Grátis</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingChapter(null)}>Cancelar</Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={saveEditChapter} disabled={savingChapter}>
                  {savingChapter ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta obra? Se a obra estiver publicada e tiver compradores, a exclusão será bloqueada. Despublique primeiro se necessário. Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBook} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
