'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { navigate, setAuth } = useAppStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha }),
      });
      setAuth(data.user, data.token);
      navigate('home');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 w-fit">
            <BookOpen className="h-6 w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">Criar Conta</CardTitle>
          <CardDescription>Junte-se à comunidade literária moçambicana.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              <UserPlus className="h-4 w-4 mr-1" /> {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <button type="button" onClick={() => navigate('login')} className="text-amber-700 dark:text-amber-400 hover:underline font-medium">
                Entrar
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}