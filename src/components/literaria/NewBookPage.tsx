'use client';

import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, ImageIcon, X, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIAS_SUGESTOES, FAIXAS_ETARIAS, type SectionKey, SECTION_LABELS } from '@/lib/constants';


export default function NewBookPage() {
  const { navigate, token } = useAppStore();
  const [titulo, setTitulo] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaInput, setCategoriaInput] = useState('');
  const [showCategoriaSuggestions, setShowCategoriaSuggestions] = useState(false);
  const [capaUrl, setCapaUrl] = useState('');
  const [precoTotal, setPrecoTotal] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('Livre');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optional sections
  const [activeSections, setActiveSections] = useState<SectionKey[]>([]);
  const [sectionContent, setSectionContent] = useState<Record<SectionKey, string>>({
    ficha_tecnica: '',
    dedicatoria: '',
    epigrafe: '',
    epilogo: '',
  });

  const filteredSuggestions = CATEGORIAS_SUGESTOES.filter(
    (s) =>
      s.toLowerCase().includes(categoriaInput.toLowerCase()) &&
      !categorias.some((c) => c.toLowerCase() === s.toLowerCase())
  );

  function addCategoria(cat: string) {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if (categorias.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    setCategorias([...categorias, trimmed]);
    setCategoriaInput('');
    setShowCategoriaSuggestions(false);
  }

  function removeCategoria(cat: string) {
    setCategorias(categorias.filter((c) => c !== cat));
  }

  function handleCategoriaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (categoriaInput.trim()) addCategoria(categoriaInput);
    }
    if (e.key === 'Backspace' && !categoriaInput && categorias.length > 0) {
      removeCategoria(categorias[categorias.length - 1]);
    }
  }

  function toggleSection(key: SectionKey) {
    setActiveSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Client-side validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError(`Tipo de ficheiro não suportado (${file.type}). Use JPG, PNG, WEBP ou GIF.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 5MB.`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        let msg = 'Erro no upload';
        try { const d = await res.json(); msg = d.error || msg; } catch {}
        if (res.status === 429) msg = 'Muitas requisições. Aguarde alguns segundos e tente novamente.';
        else if (res.status === 502) msg = 'Servidor indisponível. A página vai recarregar...';
        throw new Error(msg);
      }
      const data = await res.json();
      setCapaUrl(data.url);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      // Auto-reload on 502
      if (msg.includes('indisponível')) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !sinopse) {
      setError('Título e sinopse são obrigatórios.');
      return;
    }
    if (categorias.length === 0) {
      setError('Adicione pelo menos uma categoria.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify({
          titulo,
          sinopse,
          categorias,
          capa_url: capaUrl || undefined,
          preco_total: parseFloat(precoTotal) || 0,
          faixa_etaria: faixaEtaria,
          ficha_tecnica: sectionContent.ficha_tecnica || undefined,
          dedicatoria: sectionContent.dedicatoria || undefined,
          epigrafe: sectionContent.epigrafe || undefined,
          epilogo: sectionContent.epilogo || undefined,
        }),
      });
      navigate('author-dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('author-dashboard')} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nova Obra</CardTitle>
          <CardDescription>Crie uma nova obra literária.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da obra"
                required
              />
            </div>

            <div>
              <Label htmlFor="sinopse">Sinopse</Label>
              <Textarea
                id="sinopse"
                value={sinopse}
                onChange={(e) => setSinopse(e.target.value)}
                placeholder="Descreva brevemente a obra..."
                rows={4}
                required
              />
            </div>

            {/* Categorias - Multi-select com tags */}
            <div>
              <Label>Categorias</Label>
              <div className="relative mt-1.5">
                <Input
                  value={categoriaInput}
                  onChange={(e) => {
                    setCategoriaInput(e.target.value);
                    setShowCategoriaSuggestions(true);
                  }}
                  onFocus={() => setShowCategoriaSuggestions(true)}
                  onKeyDown={handleCategoriaKeyDown}
                  onBlur={() => setTimeout(() => setShowCategoriaSuggestions(false), 200)}
                  placeholder="Digite ou seleccione categorias..."
                />
                {showCategoriaSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={() => addCategoria(cat)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {/* Tags de categorias seleccionadas */}
                {categorias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {categorias.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-600 text-white"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => removeCategoria(cat)}
                          className="hover:text-amber-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  Adicione uma ou mais categorias. Prima Enter para confirmar.
                </p>
              </div>
            </div>

            {/* Capa: Upload + URL */}
            <div>
              <Label>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Capa do Livro
                </span>
              </Label>
              <div className="mt-1.5 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Enviar imagem do dispositivo'}
                </Button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Input
                  type="url"
                  value={capaUrl}
                  onChange={(e) => setCapaUrl(e.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                />
                {capaUrl && (
                  <div className="relative inline-block">
                    <img
                      src={capaUrl}
                      alt="Pré-visualização da capa"
                      className="w-28 aspect-[3/4] rounded-lg object-cover border border-border/50 shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setCapaUrl('')}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Secções opcionais - toggles */}
            <div>
              <Label className="text-sm font-medium">Secções Opcionais</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Clique para activar e preencher as secções que deseja incluir na obra.
              </p>
              <div className="space-y-2">
                {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => {
                  const info = SECTION_LABELS[key];
                  const isActive = activeSections.includes(key);
                  return (
                    <div key={key} className="border border-border/50 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection(key)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{info.icon}</span>
                          <div>
                            <span className="text-sm font-medium">{info.label}</span>
                            <p className="text-xs text-muted-foreground">{info.hint}</p>
                          </div>
                        </div>
                        {isActive ? (
                          <ChevronUp className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {isActive && (
                        <div className="px-3 pb-3">
                          <Textarea
                            value={sectionContent[key]}
                            onChange={(e) =>
                              setSectionContent((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={`Escreva a ${info.label.toLowerCase()} aqui...`}
                            rows={4}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="faixa-etaria">Classificação Etária</Label>
              <select
                id="faixa-etaria"
                value={faixaEtaria}
                onChange={(e) => setFaixaEtaria(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {FAIXAS_ETARIAS.map((f) => (
                  <option key={f} value={f}>{f === 'Livre' ? 'Livre (Todos os públicos)' : f + ' anos'}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Indique a faixa etária recomendada para a obra.
              </p>
            </div>

            <div>
              <Label htmlFor="preco_total">Preço do Livro Completo (MZN)</Label>
              <Input
                id="preco_total"
                type="number"
                step="0.01"
                min="0"
                value={precoTotal}
                onChange={(e) => setPrecoTotal(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe 0 ou vazio se quiser vender apenas capítulos avulsos.
              </p>
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              <Plus className="h-4 w-4 mr-1" /> {loading ? 'Criando...' : 'Criar Obra'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
