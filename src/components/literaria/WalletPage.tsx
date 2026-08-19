'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet as WalletIcon, Plus, Loader2, ArrowDownLeft, ArrowUpRight, Coins, Banknote, Zap, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { MOEDAS_CONFIG, mznParaMoedas } from '@/lib/constants';

export default function WalletPage() {
  const { user, updateBalance, updateMoedas } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'MPESA' | 'NIB'>('MPESA');
  const [depositing, setDepositing] = useState(false);
  const [comprandoMoedas, setComprandoMoedas] = useState(false);
  const [customMoedas, setCustomMoedas] = useState('');
  const [transactions, setTransactions] = useState<Array<{
    id: string; tipo: string; valor: number; status: string;
    descricao: string | null; createdAt: string;
  }>>([]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const saldoData = await apiFetch<{ saldo: number; moedas: number }>('/api/wallet');
      updateBalance(saldoData.saldo);
      updateMoedas(saldoData.moedas);
      try {
        const authorData = await apiFetch<{ transacoes: typeof transactions }>('/api/author');
        setTransactions(authorData.transacoes || []);
      } catch {
        setTransactions([]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [updateBalance, updateMoedas]);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user, loadTransactions]);

  async function handleDeposit() {
    const valor = parseFloat(depositAmount);
    if (!valor || valor <= 0) {
      toast.error('Insira um valor válido.');
      return;
    }
    if (valor > 100000) {
      toast.error('Depósito máximo: 100.000 MZN.');
      return;
    }
    setDepositing(true);
    try {
      const data = await apiFetch<{ saldo: number; moedas: number }>('/api/wallet', {
        method: 'POST',
        body: JSON.stringify({ tipo: depositType, valor }),
      });
      updateBalance(data.saldo);
      updateMoedas(data.moedas);
      setDepositAmount('');
      toast.success('Carregamento realizado!', { description: `${valor.toFixed(2)} MZN via ${depositType}` });
      loadTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDepositing(false);
    }
  }

  async function handleComprarMoedas(qtdMoedas: number) {
    if (qtdMoedas <= 0) {
      toast.error('Quantidade inválida.');
      return;
    }
    setComprandoMoedas(true);
    try {
      const data = await apiFetch<{ saldo: number; moedas: number }>('/api/wallet', {
        method: 'POST',
        body: JSON.stringify({ acao: 'comprar-moedas', moedas: qtdMoedas }),
      });
      updateBalance(data.saldo);
      updateMoedas(data.moedas);
      setCustomMoedas('');
      toast.success(`${qtdMoedas.toLocaleString('pt-MZ')} MC adquiridas!`);
      loadTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setComprandoMoedas(false);
    }
  }

  const saldo = user?.saldo_carteira ?? 0;
  const moedas = user?.moedas ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Carteira</h1>

      {/* Moedas Balance Card */}
      <Card className="mb-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-amber-300/50 dark:border-amber-700/40">
        <CardContent className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Coins className="h-6 w-6 text-amber-600" />
            <p className="text-sm text-muted-foreground">Moedas</p>
          </div>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {moedas.toLocaleString('pt-MZ')} <span className="text-lg font-medium">MC</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Equivalente a {(moedas / MOEDAS_CONFIG.TAXA_CONVERSAO).toFixed(2)} MZN
          </p>
        </CardContent>
      </Card>

      {/* MZN Balance Card */}
      <Card className="mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo MZN</p>
              <p className="text-lg font-semibold">{saldo.toFixed(2)} MZN</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => document.getElementById('deposit-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <Plus className="h-3 w-3 mr-1" /> Carregar
          </Button>
        </CardContent>
      </Card>

      {/* Buy Moedas Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600" /> Comprar Moedas
          </CardTitle>
          <CardDescription>Use seu saldo MZN para comprar moedas. 1 MZN = {MOEDAS_CONFIG.TAXA_CONVERSAO} MC</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pacotes */}
          <div className="grid grid-cols-2 gap-3">
            {MOEDAS_CONFIG.PACOTES.map((pacote) => {
              const totalMoedas = pacote.moedas + pacote.bonus;
              const podePagar = saldo >= pacote.mzn;
              return (
                <button
                  key={pacote.mzn}
                  disabled={!podePagar || comprandoMoedas}
                  onClick={() => handleComprarMoedas(totalMoedas)}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                    podePagar
                      ? 'border-amber-300 dark:border-amber-700 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md'
                      : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                >
                  {pacote.bonus > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Gift className="h-2.5 w-2.5" /> +{pacote.bonus}
                    </span>
                  )}
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                    {totalMoedas.toLocaleString('pt-MZ')} MC
                  </p>
                  <p className="text-xs text-muted-foreground">por {pacote.mzn} MZN</p>
                </button>
              );
            })}
          </div>

          {/* Quantidade personalizada */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Quantidade de MC (ex: 2000)"
              value={customMoedas}
              onChange={(e) => setCustomMoedas(e.target.value)}
            />
            <Button
              onClick={() => handleComprarMoedas(parseInt(customMoedas) || 0)}
              disabled={comprandoMoedas || !customMoedas}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {comprandoMoedas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            </Button>
          </div>
          {customMoedas && parseInt(customMoedas) > 0 && (
            <p className="text-xs text-muted-foreground">
              {parseInt(customMoedas).toLocaleString('pt-MZ')} MC = {(parseInt(customMoedas) / MOEDAS_CONFIG.TAXA_CONVERSAO).toFixed(2)} MZN
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deposit MZN */}
      <Card className="mb-6" id="deposit-section">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Carregar Saldo (MZN)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setDepositType('MPESA')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                depositType === 'MPESA'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-background border-border hover:bg-accent'
              }`}
            >
              M-Pesa
            </button>
            <button
              onClick={() => setDepositType('NIB')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                depositType === 'NIB'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-background border-border hover:bg-accent'
              }`}
            >
              NIB / Transferência
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100000"
              placeholder="Valor (MZN)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <Button
              onClick={handleDeposit}
              disabled={depositing}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {depositing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Carregar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
              ? 'Modo demonstração: o saldo será adicionado instantaneamente.'
              : 'O carregamento será processado pela integração de pagamento.'}
          </p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transacções Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma transacção registada.
            </p>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      t.tipo === 'COMPRA' || t.tipo === 'COMPRA_MOEDAS'
                        ? t.tipo === 'COMPRA_MOEDAS'
                          ? 'bg-amber-100 dark:bg-amber-900/20'
                          : 'bg-red-100 dark:bg-red-900/20'
                        : 'bg-emerald-100 dark:bg-emerald-900/20'
                    }`}
                    >
                      {t.tipo === 'COMPRA'
                        ? <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        : t.tipo === 'COMPRA_MOEDAS'
                        ? <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        : <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{t.descricao || t.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString('pt-MZ')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    t.tipo === 'COMPRA'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  >
                    {t.tipo === 'COMPRA' || t.tipo === 'COMPRA_MOEDAS' ? '-' : '+'}{t.valor.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
