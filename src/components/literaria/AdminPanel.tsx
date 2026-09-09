'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Users, BookOpen, FileText, Coins, Receipt, TrendingUp,
  CheckCircle2, XCircle, Clock, Search, Zap, Loader2, RefreshCw, Phone, Mail, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface Estatisticas {
  totalUsuarios: number;
  totalLivros: number;
  totalCapitulos: number;
  recargasPendentes: number;
  moedasEmCirculacao: number;
  recargasAprovadas: number;
  receitaMzn: number;
}

interface RecargaAdmin {
  id: string;
  moedas: number;
  valorMzn: number;
  metodo: string;
  estado: string;
  numeroEnvio: string | null;
  referencia: string | null;
  nota: string | null;
  notaAdmin: string | null;
  createdAt: string;
  processadaEm: string | null;
  user: { id: string; nome: string; email: string | null; telefone: string | null; moedas: number };
}

interface UtilizadorAdmin {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  role: string;
  moedas: number;
  saldo_carteira: number;
  createdAt: string;
  _count: { books: number };
}

function contactInfo(u: { email: string | null; telefone: string | null }) {
  if (u.telefone) return { icon: Phone, text: u.telefone };
  if (u.email) return { icon: Mail, text: u.email };
  return { icon: Mail, text: 'sem contacto' };
}

export default function AdminPanel() {
  const { user } = useAppStore();
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [recargas, setRecargas] = useState<RecargaAdmin[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('PENDENTE');
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [rejeitarTarget, setRejeitarTarget] = useState<RecargaAdmin | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Crédito directo
  const [busca, setBusca] = useState('');
  const [utilizadores, setUtilizadores] = useState<UtilizadorAdmin[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [creditoUser, setCreditoUser] = useState<UtilizadorAdmin | null>(null);
  const [creditoQtd, setCreditoQtd] = useState('');
  const [creditoNota, setCreditoNota] = useState('');
  const [creditando, setCreditando] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const s = await apiFetch<Estatisticas>('/api/admin/estatisticas');
      setStats(s);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const loadRecargas = useCallback(async (estado: string) => {
    setLoading(true);
    try {
      const query = estado === 'TODAS' ? '' : `?estado=${estado}`;
      const d = await apiFetch<{ recargas: RecargaAdmin[] }>(`/api/admin/recargas${query}`);
      setRecargas(d.recargas || []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadRecargas(filtroEstado);
  }, [loadStats, loadRecargas, filtroEstado]);

  async function buscarUtilizadores(q: string) {
    setBuscando(true);
    try {
      const d = await apiFetch<{ utilizadores: UtilizadorAdmin[] }>(`/api/admin/utilizadores?q=${encodeURIComponent(q)}`);
      setUtilizadores(d.utilizadores || []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  async function processarRecarga(id: string, acao: 'APROVADA' | 'REJEITADA', notaAdmin?: string) {
    setProcessando(id);
    try {
      const resp = await apiFetch<{ moedasCreditadas: number; recarga: RecargaAdmin }>('/api/admin/recargas', {
        method: 'PATCH',
        body: JSON.stringify({ id, acao, notaAdmin }),
      });
      if (acao === 'APROVADA') {
        toast.success(`Recarga aprovada: ${resp.moedasCreditadas.toLocaleString('pt-MZ')} MC creditadas em ${resp.recarga.user.nome}.`);
      } else {
        toast.success('Recarga rejeitada.');
      }
      setRejeitarTarget(null);
      setMotivoRejeicao('');
      loadRecargas(filtroEstado);
      loadStats();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setProcessando(null);
    }
  }

  async function creditarDirecto() {
    if (!creditoUser) return;
    const qtd = parseInt(creditoQtd) || 0;
    if (qtd === 0) {
      toast.error('Indique uma quantidade diferente de zero (negativo para débito).');
      return;
    }
    setCreditando(true);
    try {
      const resp = await apiFetch<{ user: UtilizadorAdmin }>('/api/admin/creditar', {
        method: 'POST',
        body: JSON.stringify({ userId: creditoUser.id, moedas: qtd, nota: creditoNota || undefined }),
      });
      toast.success(`${qtd > 0 ? 'Creditadas' : 'Debitadas'} ${Math.abs(qtd).toLocaleString('pt-MZ')} MC em ${resp.user.nome}. Novo saldo: ${resp.user.moedas.toLocaleString('pt-MZ')} MC.`);
      setCreditoUser(null);
      setCreditoQtd('');
      setCreditoNota('');
      buscarUtilizadores(busca);
      loadStats();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreditando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600" /> Painel Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão de recargas, moedas e utilizadores</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadStats(); loadRecargas(filtroEstado); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <Card className="border-amber-300/60 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-1">
                <Clock className="h-4 w-4" />
                <p className="text-xs font-medium">Recargas Pendentes</p>
              </div>
              <p className="text-2xl font-bold">{stats.recargasPendentes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                <p className="text-xs font-medium">MC em Circulação</p>
              </div>
              <p className="text-2xl font-bold">{stats.moedasEmCirculacao.toLocaleString('pt-MZ')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <p className="text-xs font-medium">Receita (MZN)</p>
              </div>
              <p className="text-2xl font-bold">{stats.receitaMzn.toLocaleString('pt-MZ')}</p>
              <p className="text-[10px] text-muted-foreground">{stats.recargasAprovadas.toLocaleString('pt-MZ')} MC recarregadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <p className="text-xs font-medium">Utilizadores</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalUsuarios}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <p className="text-xs font-medium">Obras</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalLivros}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <p className="text-xs font-medium">Capítulos</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalCapitulos}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      <Tabs defaultValue="recargas">
        <TabsList className="mb-4">
          <TabsTrigger value="recargas" className="relative">
            Recargas
            {stats && stats.recargasPendentes > 0 && (
              <Badge className="ml-1.5 bg-amber-600 text-white hover:bg-amber-600 text-[10px] px-1.5 h-4">
                {stats.recargasPendentes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="utilizadores">Utilizadores</TabsTrigger>
        </TabsList>

        {/* ===== TAB RECARGAS ===== */}
        <TabsContent value="recargas">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Solicitações de Recarga
                </CardTitle>
                <div className="flex gap-1.5">
                  {['PENDENTE', 'APROVADA', 'REJEITADA', 'TODAS'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltroEstado(f)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        filtroEstado === f
                          ? 'bg-amber-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : recargas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma solicitação {filtroEstado !== 'TODAS' ? filtroEstado.toLowerCase() : ''}.
                </p>
              ) : (
                <div className="space-y-3">
                  {recargas.map((r) => {
                    const contato = contactInfo(r.user);
                    return (
                      <div key={r.id} className="rounded-lg border border-border/60 p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">
                              {r.moedas.toLocaleString('pt-MZ')} MC
                              <span className="text-muted-foreground font-normal"> · {r.valorMzn.toFixed(0)} MZN · {r.metodo}</span>
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.user.nome} · <contato.icon className="h-3 w-3 inline" /> {contato.text} · saldo: {r.user.moedas.toLocaleString('pt-MZ')} MC
                            </p>
                          </div>
                          {r.estado === 'PENDENTE' ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>
                          ) : r.estado === 'APROVADA' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada</Badge>
                          ) : (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitada</Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-1">
                          <p>Enviado de: <strong className="text-foreground">{r.numeroEnvio || '—'}</strong></p>
                          <p>Referência: <strong className="text-foreground">{r.referencia || '—'}</strong></p>
                          <p>{new Date(r.createdAt).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {r.nota && (
                          <p className="text-xs bg-muted rounded px-2 py-1.5">Nota do usuário: {r.nota}</p>
                        )}
                        {r.estado === 'REJEITADA' && r.notaAdmin && (
                          <p className="text-xs text-destructive">Motivo da rejeição: {r.notaAdmin}</p>
                        )}

                        {r.estado === 'PENDENTE' && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={processando === r.id}
                              onClick={() => processarRecarga(r.id, 'APROVADA')}
                            >
                              {processando === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                              Aprovar e Creditar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={processando === r.id}
                              onClick={() => setRejeitarTarget(r)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB UTILIZADORES ===== */}
        <TabsContent value="utilizadores">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" /> Utilizadores
              </CardTitle>
              <CardDescription>Busque por nome, email ou telefone para creditar MC directamente (testes e suporte).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => { e.preventDefault(); buscarUtilizadores(busca); }}
                className="flex gap-2"
              >
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, email ou telefone..."
                />
                <Button type="submit" variant="outline" className="shrink-0" disabled={buscando}>
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>

              {utilizadores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {busca ? 'Nenhum utilizador encontrado.' : 'Pesquise para listar utilizadores.'}
                </p>
              ) : (
                <div className="divide-y">
                  {utilizadores.map((u) => {
                    const contato = contactInfo(u);
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {u.nome}
                            {u.role === 'ADMIN' && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100">Admin</Badge>}
                            {u.role === 'ESCRITOR' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Autor</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            <contato.icon className="h-3 w-3 inline" /> {contato.text} · {u._count.books} obra(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                            {u.moedas.toLocaleString('pt-MZ')} MC
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setCreditoUser(u)}>
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de rejeição */}
      <Dialog open={!!rejeitarTarget} onOpenChange={(open) => !open && setRejeitarTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar Recarga</DialogTitle>
            <DialogDescription>
              Solicitação de {rejeitarTarget?.moedas.toLocaleString('pt-MZ')} MC de {rejeitarTarget?.user.nome}. Indique o motivo — o usuário verá esta mensagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="ex: Pagamento não encontrado no M-Pesa. Verifique a referência."
              rows={3}
              maxLength={300}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejeitarTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={!motivoRejeicao.trim() || processando === rejeitarTarget?.id}
                onClick={() => rejeitarTarget && processarRecarga(rejeitarTarget.id, 'REJEITADA', motivoRejeicao.trim())}
              >
                {processando === rejeitarTarget?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Rejeitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de crédito directo */}
      <Dialog open={!!creditoUser} onOpenChange={(open) => !open && setCreditoUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crédito Directo de MC</DialogTitle>
            <DialogDescription>
              {creditoUser?.nome} — saldo actual: {creditoUser?.moedas.toLocaleString('pt-MZ')} MC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="credito-qtd">Quantidade de MC (negativo = débito)</Label>
              <Input
                id="credito-qtd"
                type="number"
                step="1"
                value={creditoQtd}
                onChange={(e) => setCreditoQtd(e.target.value)}
                placeholder="ex: 500 ou -200"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="credito-nota">Nota (opcional)</Label>
              <Input
                id="credito-nota"
                value={creditoNota}
                onChange={(e) => setCreditoNota(e.target.value)}
                placeholder="ex: bónus beta tester"
                className="mt-1"
                maxLength={200}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreditoUser(null)}>Cancelar</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={creditando || !creditoQtd}
                onClick={creditarDirecto}
              >
                {creditando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
