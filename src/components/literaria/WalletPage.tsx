'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet as WalletIcon, Plus, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletPage() {
  const { user, updateBalance } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'MPESA' | 'NIB'>('MPESA');
  const [depositing, setDepositing] = useState(false);
  const [transactions, setTransactions] = useState<Array<{
    id: string; tipo: string; valor: number; status: string;
    descricao: string | null; createdAt: string;
  }>>([]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const saldoData = await apiFetch<{ saldo: number }>('/api/wallet');
      updateBalance(saldoData.saldo);
      // Load actual transactions from author endpoint
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
  }, [updateBalance]);

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
      const data = await apiFetch<{ saldo: number }>('/api/wallet', {
        method: 'POST',
        body: JSON.stringify({ tipo: depositType, valor }),
      });
      updateBalance(data.saldo);
      setDepositAmount('');
      toast.success('Carregamento realizado!', { description: `${valor.toFixed(2)} MZN via ${depositType}` });
      loadTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDepositing(false);
    }
  }

  const saldo = user?.saldo_carteira ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Carteira</h1>

      {/* Balance Card */}
      <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="p-6 text-center">
          <WalletIcon className="h-8 w-8 mx-auto text-amber-700 dark:text-amber-400 mb-2" />
          <p className="text-sm text-muted-foreground">Saldo Disponível</p>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
            {saldo.toFixed(2)} <span className="text-lg">MZN</span>
          </p>
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Carregar Saldo
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
                      t.tipo === 'COMPRA' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-emerald-100 dark:bg-emerald-900/20'
                    }`}
                    >
                      {t.tipo === 'COMPRA'
                        ? <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
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
                    t.tipo === 'COMPRA' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  >
                    {t.tipo === 'COMPRA' ? '-' : '+'}{t.valor.toFixed(2)}
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
