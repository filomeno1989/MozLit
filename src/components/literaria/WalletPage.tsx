'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet as WalletIcon, Plus, CreditCard, History } from 'lucide-react';

export default function WalletPage() {
  const { user, updateBalance } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'MPESA' | 'NIB'>('MPESA');
  const [depositing, setDepositing] = useState(false);
  const [transactions, setTransactions] = useState<Array<{ id: string; tipo: string; valor: number; status: string; descricao: string | null; createdAt: string }>>([]);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  async function loadTransactions() {
    setLoading(true);
    try {
      // We'll use the author endpoint which returns recent transactions, or library
      // For simplicity, just get wallet balance and show deposit history
      const saldoData = await apiFetch<{ saldo: number }>('/api/wallet');
      updateBalance(saldoData.saldo);
      // Load user transactions from a combined query
      const { db } = await import('@/lib/db');
      if (user) {
        const txs = await fetch('/api/author');
        // Fallback - show empty
      }
      setTransactions([]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleDeposit() {
    const valor = parseFloat(depositAmount);
    if (!valor || valor <= 0) {
      alert('Insira um valor válido.');
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
      alert(`Carregamento de ${valor.toFixed(2)} MZN via ${depositType} realizado com sucesso!`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Carteira</h1>

      {/* Balance Card */}
      <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="p-6 text-center">
          <WalletIcon className="h-8 w-8 mx-auto text-amber-700 dark:text-amber-400 mb-2" />
          <p className="text-sm text-muted-foreground">Saldo Disponível</p>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
            {user?.saldo_carteira.toFixed(2) ?? '0.00'} <span className="text-lg">MZN</span>
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
              placeholder="Valor (MZN)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <Button
              onClick={handleDeposit}
              disabled={depositing}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {depositing ? '...' : 'Carregar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Simulação: o saldo será adicionado instantaneamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}