'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, LogIn, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { navigate, setAuth } = useAppStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ user: typeof import('@/store/app').User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
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
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4 py-12">
      <Card className="border-border/50 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 w-fit">
            <BookOpen className="h-6 w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">Entrar no MozLit</CardTitle>
          <CardDescription>Acesse sua conta para ler e publicar obras.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
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
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="......"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <button type="button" onClick={() => navigate('register')} className="text-amber-700 dark:text-amber-400 hover:underline font-medium focus-visible:underline focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2">
                Criar conta
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
