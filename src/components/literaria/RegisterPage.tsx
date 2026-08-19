'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore, type User } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, UserPlus, Loader2, AlertCircle, Eye, EyeOff, BookOpenCheck, PenLine } from 'lucide-react';

function getPasswordStrength(senha: string): { label: string; color: string; width: string } {
  if (!senha) return { label: '', color: 'bg-muted', width: 'w-0' };
  if (senha.length < 6) return { label: 'Muito fraca', color: 'bg-red-500', width: 'w-1/4' };
  let score = 0;
  if (senha.length >= 8) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;
  if (score <= 1) return { label: 'Fraca', color: 'bg-red-500', width: 'w-1/4' };
  if (score === 2) return { label: 'Razoável', color: 'bg-amber-500', width: 'w-2/4' };
  if (score === 3) return { label: 'Boa', color: 'bg-emerald-400', width: 'w-3/4' };
  return { label: 'Forte', color: 'bg-emerald-600', width: 'w-full' };
}

export default function RegisterPage() {
  const { navigate, setAuth } = useAppStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'LEITOR' | 'ESCRITOR'>('LEITOR');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrength(senha);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha, role }),
      });
      setAuth(data.user, data.token);
      navigate(role === 'ESCRITOR' ? 'author-dashboard' : 'home');
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
          <CardTitle className="text-xl">Criar Conta</CardTitle>
          <CardDescription>Junte-se à comunidade literária moçambicana.</CardDescription>
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
              <Label>Registrar como</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setRole('LEITOR')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    role === 'LEITOR'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <BookOpenCheck className={`h-6 w-6 ${role === 'LEITOR' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${role === 'LEITOR' ? 'text-amber-900 dark:text-amber-100' : 'text-muted-foreground'}`}>Leitor</span>
                  <span className="text-[11px] text-muted-foreground">Descubra e leia obras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ESCRITOR')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    role === 'ESCRITOR'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <PenLine className={`h-6 w-6 ${role === 'ESCRITOR' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${role === 'ESCRITOR' ? 'text-amber-900 dark:text-amber-100' : 'text-muted-foreground'}`}>Autor</span>
                  <span className="text-[11px] text-muted-foreground">Publique e monetize</span>
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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
              {senha && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">Força: {strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="confirmar-senha">Confirmação da Senha</Label>
              <div className="relative">
                <Input
                  id="confirmar-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                  className={`pr-10 ${confirmarSenha && confirmarSenha !== senha ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {confirmarSenha && confirmarSenha !== senha && (
                  <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <button type="button" onClick={() => navigate('login')} className="text-amber-700 dark:text-amber-400 hover:underline font-medium focus-visible:underline focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2">
                Entrar
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
