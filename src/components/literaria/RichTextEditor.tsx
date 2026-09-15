'use client';

import { useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { isHtmlConteudo } from '@/lib/constants';
import { useAppStore } from '@/store/app';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, RemoveFormatting, Type, ImagePlus, Loader2,
} from 'lucide-react';

/**
 * Alinhamento de texto (esquerda, centro, direita, justificado).
 * Implementação local via atributo global style="text-align" nos blocos,
 * equivalente à extensão oficial sem depedência extra.
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      /** Define o alinhamento dos blocos selecionados */
      setTextAlign: (alinhamento: 'left' | 'center' | 'right' | 'justify') => ReturnType;
      /** Volta ao alinhamento padrão (esquerda) */
      unsetTextAlign: () => ReturnType;
    };
    imagemCapitulo: {
      /** Insere uma imagem no ponto de escrita actual (item 17) */
      setImagemCapitulo: (opcoes: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

/**
 * Imagem nos capítulos (item 17). Nó local — sem dependência extra, para não
 * mexer no lockfile do deploy. Só aceita URLs servidas pela própria plataforma
 * (upload via /api/upload tipo "capitulo"); o sanitizador do servidor filtra
 * qualquer outra origem antes de gravar.
 */
const ImagemCapitulo = Node.create({
  name: 'imagemCapitulo',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null as string | null },
      alt: { default: null as string | null },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // classe visual aplicada via CSS (.mozlit-editor img) — aqui só atributos
    return ['img', mergeAttributes(HTMLAttributes, { loading: 'lazy' })];
  },

  addCommands() {
    return {
      setImagemCapitulo:
        (opcoes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: opcoes,
          }),
    };
  },
});

const TextAlign = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph', 'blockquote'],
        attributes: {
          textAlign: {
            default: null as string | null,
            parseHTML: (element) => element.style.textAlign || null,
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextAlign:
        (alinhamento) =>
        ({ commands }) => {
          const tipos = ['paragraph', 'heading', 'blockquote'] as const;
          return tipos.every((tipo) => commands.updateAttributes(tipo, { textAlign: alinhamento }));
        },
      unsetTextAlign:
        () =>
        ({ commands }) => {
          const tipos = ['paragraph', 'heading', 'blockquote'] as const;
          return tipos.every((tipo) => commands.resetAttributes(tipo, 'textAlign'));
        },
    };
  },
});

/** Fontes literárias oferecidas no editor e no leitor (vars de next/font com fallback de sistema) */
export const FONTES_LITERARIAS = [
  { id: 'lora', label: 'Lora (Literária)', css: "var(--font-lora), Georgia, serif" },
  { id: 'georgia', label: 'Georgia (Serif)', css: "Georgia, 'Times New Roman', serif" },
  { id: 'merriweather', label: 'Merriweather (Prosa)', css: "var(--font-merriweather), Georgia, serif" },
  { id: 'inter', label: 'Inter (Sans)', css: "var(--font-inter), system-ui, sans-serif" },
  { id: 'jetbrains', label: 'JetBrains Mono', css: "var(--font-jetbrains-mono), 'Courier New', monospace" },
] as const;

export const FONTE_PADRAO = FONTES_LITERARIAS[0].css;

/** Verifica se o HTML do editor está vazio (sem texto visível nem imagem) */
export function htmlVazio(html: string): boolean {
  // Uma imagem inserida é conteúdo — um capítulo só com foto não está vazio
  if (/<img\b/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

/** Converte texto simples (capítulos antigos) em HTML de parágrafos para o editor */
export function textoLegadoParaHtml(texto: string): string {
  if (isHtmlConteudo(texto)) return texto;
  return texto
    .split(/\n{2,}/)
    .map((par) => `<p>${par.replace(/\n/g, '<br>').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded-md transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onInserirImagem, aEnviarImagem }: { editor: Editor | null; onInserirImagem: () => void; aEnviarImagem: boolean }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      strike: e?.isActive('strike') ?? false,
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      h3: e?.isActive('heading', { level: 3 }) ?? false,
      bulletList: e?.isActive('bulletList') ?? false,
      orderedList: e?.isActive('orderedList') ?? false,
      blockquote: e?.isActive('blockquote') ?? false,
      alignLeft: e?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: e?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: e?.isActive({ textAlign: 'right' }) ?? false,
      alignJustify: e?.isActive({ textAlign: 'justify' }) ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
      fonteAtual:
        (e?.getAttributes('textStyle')?.fontFamily as string | undefined) || FONTE_PADRAO,
    }),
  });

  if (!editor || !state) return null;

  function fonteAtualLabel(css: string): string {
    return FONTES_LITERARIAS.find((f) => f.css === css)?.label ?? 'Fonte';
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border border-border/60 rounded-t-lg bg-muted/40 px-1.5 py-1">
      <ToolbarButton title="Negrito (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Itálico (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Sublinhado (Ctrl+U)" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Riscado" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      <ToolbarButton title="Título de secção" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Subtítulo" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      <ToolbarButton title="Lista com marcadores" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Citação" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      {/* Imagem do capítulo (item 17) — upload imediato para o armazém da plataforma */}
      <ToolbarButton title="Inserir imagem (JPG, PNG ou WebP até 4MB)" onClick={onInserirImagem} disabled={aEnviarImagem}>
        {aEnviarImagem ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </ToolbarButton>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      <ToolbarButton title="Alinhar à esquerda" active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Centrar" active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Alinhar à direita" active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Justificado" active={state.alignJustify} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      {/* Seletor de fonte */}
      <div className="relative inline-flex items-center">
        <Type className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <select
          value={state.fonteAtual}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          aria-label="Fonte do texto"
          title="Fonte do texto"
          className="pl-7 pr-1.5 py-1.5 text-xs rounded-md border border-border/60 bg-background hover:bg-accent transition-colors cursor-pointer max-w-[9.5rem]"
        >
          {FONTES_LITERARIAS.map((f) => (
            <option key={f.id} value={f.css}>
              {f.label}
            </option>
          ))}
          {!FONTES_LITERARIAS.some((f) => f.css === state.fonteAtual) && (
            <option value={state.fonteAtual}>{fonteAtualLabel(state.fonteAtual)}</option>
          )}
        </select>
      </div>

      <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

      <ToolbarButton title="Desfazer (Ctrl+Z)" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Refazer (Ctrl+Y)" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Limpar formatação" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Editor de texto rico para capítulos (Tiptap).
 * Conteúdo sai em HTML sanitizado no servidor antes de gravar.
 */
export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escreva o conteúdo do capítulo...',
  minHeight = '14rem',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      TextAlign,
      ImagemCapitulo,
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'mozlit-editor-content prose prose-neutral dark:prose-invert max-w-none focus:outline-none px-3 py-2.5',
        'aria-label': 'Editor de conteúdo do capítulo',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // --- Imagens do capítulo (item 17): upload imediato + inserção no ponto de escrita ---
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const [aEnviarImagem, setAEnviarImagem] = useState(false);

  function escolherImagem() {
    inputImagemRef.current?.click();
  }

  async function inserirImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const aceites = ['image/jpeg', 'image/png', 'image/webp'];
    if (!aceites.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(`Imagem demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 4MB.`);
      e.target.value = '';
      return;
    }
    setAEnviarImagem(true);
    try {
      const { token } = useAppStore.getState();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tipo', 'capitulo');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || 'Erro ao enviar imagem.');
      }
      const { url } = (await res.json()) as { url: string };
      editor.chain().focus().setImagemCapitulo({ src: url, alt: file.name.replace(/\.[^.]+$/, '').slice(0, 120) }).run();
      toast.success('Imagem inserida.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAEnviarImagem(false);
      e.target.value = '';
    }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border/60 focus-within:ring-2 focus-within:ring-amber-500/40 transition-shadow">
      <Toolbar editor={editor} onInserirImagem={escolherImagem} aEnviarImagem={aEnviarImagem} />
      <div style={{ minHeight }} className="bg-background overflow-y-auto">
        <EditorContent editor={editor} className="mozlit-editor text-[0.95rem] leading-relaxed" />
      </div>
      <input
        ref={inputImagemRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={inserirImagem}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
