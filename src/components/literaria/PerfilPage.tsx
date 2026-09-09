'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  UserRound, Loader2, Save, AlertCircle, Eye, EyeOff, CheckCircle2,
  Phone, Mail, ShieldCheck, CalendarDays,
} from 'lucide-react';
import CountryCodePicker from '@/components/literaria/CountryCodePicker';
import { PAISES, PAIS_PADRAO, type Pais } from '@/lib/paises';

interface ContaCompleta {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  role: string;
  saldo_carteira: number;
  moedas: number;
  biografia: string;
  createdAt: string;
}

type ModoContacto = 'TELEFONE' | 'EMAIL';

/** Índice dial → País para restaurar o código do país guardado no perfil. */
const PAIS_DIALS: Record<string, Pais> = Object.fromEntries(
  PAISES.map((p) => [p.dial, p])
);

export default function PerfilPage() {
  const { setAuth, navigate } = useAppStore();

  const [conta, setConta] = useState<ContaCompleta | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  // Formulário de dados
  const [nome, setNome] = useState('');
  const [biografia, setBiografia] = useState('');
  const [modoContacto, setModoContacto] = useState<ModoContacto>('TELEFONE');
  const [pais, setPais] = useState<Pais>(PAIS_PADRAO);
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [aGuardarDados, setAGuardarDados] = useState(false);
  const [erroDados, setErroDados] = useState('');
  const [okDados, setOkDados] = useState(false);

  // Formulário de senha
  const [senhaActual, setSenhaActual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aGuardarSenha, setAGuardarSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [okSenha, setOkSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiFetch<{ user: ContaCompleta }>('/api/conta')
      .then(({ user }) => {
        if (cancelado) return;
        setConta(user);
        setNome(user.nome);
        setBiografia(user.biografia || '');
        setEmail(user.email || '');
        if (user.telefone) {
          setModoContacto('TELEFONE');
          // Separa o código do país (dial) do número guardado (+258841234567)
          const match = user.telefone.match(/^(\+\d{1,4})(\d+)$/);
          if (match) {
            const dialEncontrado = PAIS_DIALS[match[1]];
            if (dialEncontrado) {
              setPais(dialEncontrado);
              setTelefone(match[2]);
            } else {
              setTelefone(user.telefone);
            }
          } else {
            setTelefone(user.telefone);
          }
        } else if (user.email) {
          setModoContacto('EMAIL');
        }
      })
      .catch((err) => {
        if (!cancelado) setErroDados((err as Error).message);
      })
      .finally(() => {
        if (!cancelado) setACarregar(false);
      });
    return () => { cancelado = true; };
  }, []);

  async function guardarDados(e: React.FormEvent) {
    e.preventDefault();
    setErroDados('');
    setOkDados(false);
    setAGuardarDados(true);
    try {
      const body: Record<string, string> = { nome, biografia };
      if (modoContacto === 'TELEFONE') {
        body.telefone = telefone.trim();
        body.dial = pais.dial;
        body.email = ''; // remove email se escolher só telefone
      } else {
        body.email = email.trim();
        body.telefone = ''; // remove telefone se escolher só email
      }

      const data = await apiFetch<{ user: ContaCompleta; token: string }>('/api/conta', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      // Actualiza sessão com dados e token novos
      const tokenActual = useAppStore.getState().token;
      if (tokenActual) {
        setAuth(
          {
            ...data.user,
            saldo_carteira: data.user.saldo_carteira,
            moedas: data.user.moedas,
          },
          data.token || tokenActual
        );
      }
      setConta(data.user);
      setOkDados(true);
      setTimeout(() => setOkDados(false), 4000);
    } catch (err) {
      setErroDados((err as Error).message);
    } finally {
      setAGuardarDados(false);
    }
  }

  async function guardarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha('');
    setOkSenha(false);
    if (novaSenha !== confirmarSenha) {
      setErroSenha('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setAGuardarSenha(true);
    try {
      await apiFetch('/api/conta', {
        method: 'PATCH',
        body: JSON.stringify({ senhaAtual: senhaActual, novaSenha }),
      });
      setSenhaActual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setOkSenha(true);
      setTimeout(() => setOkSenha(false), 4000);
    } catch (err) {
      setErroSenha((err as Error).message);
    } finally {
      setAGuardarSenha(false);
    }
  }

  if (aCarregar) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const labelRole =
    conta?.role === 'ADMIN' ? 'Administrador' : conta?.role === 'ESCRITOR' ? 'Autor' : 'Leitor';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserRound className="h-6 w-6 text-amber-600" /> Meu Perfil
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os seus dados de conta e senha.
        </p>
      </div>

      {/* Resumo da conta */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <UserRound className="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{conta?.nome}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                {conta?.telefone
                  ? <><Phone className="h-3.5 w-3.5" /> {conta.telefone}</>
                  : conta?.email
                    ? <><Mail className="h-3.5 w-3.5" /> {conta.email}</>
                    : 'Sem contacto definido'}
              </p>
            </div>
            <Badge
              variant={conta?.role === 'ADMIN' ? 'default' : 'outline'}
              className={conta?.role === 'ADMIN' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
            >
              {labelRole}
            </Badge>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Saldo: {(conta?.moedas ?? 0).toLocaleString('pt-MZ')} MC
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Membro desde:{' '}
              {conta ? new Date(conta.createdAt).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Editar dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da conta</CardTitle>
          <CardDescription>Actualize o seu nome, contacto e biografia.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarDados} className="space-y-4">
            {erroDados && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erroDados}</span>
              </div>
            )}
            {okDados && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Dados actualizados com sucesso.</span>
              </div>
            )}

            <div>
              <Label htmlFor="perfil-nome">Nome</Label>
              <Input
                id="perfil-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={100}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label>Contacto principal</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setModoContacto('TELEFONE')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    modoContacto === 'TELEFONE'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'
                      : 'border-border/50 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Phone className="h-4 w-4" /> Telefone
                </button>
                <button
                  type="button"
                  onClick={() => setModoContacto('EMAIL')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    modoContacto === 'EMAIL'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'
                      : 'border-border/50 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
              </div>
            </div>

            {modoContacto === 'TELEFONE' ? (
              <div>
                <Label htmlFor="perfil-telefone">Número de telefone</Label>
                <div className="flex gap-2 mt-1.5">
                  <CountryCodePicker value={pais} onChange={setPais} />
                  <Input
                    id="perfil-telefone"
                    type="tel"
                    inputMode="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder={pais.dial === '+258' ? '84 123 4567' : 'número'}
                    className="flex-1"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="perfil-email">Email</Label>
                <Input
                  id="perfil-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1.5"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="perfil-bio">Biografia (opcional)</Label>
              <textarea
                id="perfil-bio"
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Escreva algo sobre si..."
                className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={aGuardarDados}
            >
              {aGuardarDados
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Save className="h-4 w-4 mr-1.5" />}
              Guardar dados
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mudar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mudar senha</CardTitle>
          <CardDescription>Use pelo menos 6 caracteres. Escolha uma senha que não use noutros sites.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarSenha} className="space-y-4">
            {erroSenha && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erroSenha}</span>
              </div>
            )}
            {okSenha && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Senha alterada com sucesso.</span>
              </div>
            )}

            <div>
              <Label htmlFor="senha-actual">Senha actual</Label>
              <div className="relative mt-1.5">
                <Input
                  id="senha-actual"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senhaActual}
                  onChange={(e) => setSenhaActual(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senha-nova">Nova senha</Label>
                <Input
                  id="senha-nova"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  minLength={6}
                  maxLength={128}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="senha-confirmar">Confirmar nova senha</Label>
                <Input
                  id="senha-confirmar"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  minLength={6}
                  maxLength={128}
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={aGuardarSenha || !senhaActual || !novaSenha}
            >
              {aGuardarSenha && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Mudar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
