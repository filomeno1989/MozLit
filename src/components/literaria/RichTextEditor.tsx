'use client';

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { isHtmlConteudo } from '@/lib/constants';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, RemoveFormatting, Type,
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
  }
}

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

/** Verifica se o HTML do editor está vazio (sem texto visível) */
export function htmlVazio(html: string): boolean {
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

function Toolbar({ editor }: { editor: Editor | null }) {
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

  return (
    <div className="rounded-lg overflow-hidden border border-border/60 focus-within:ring-2 focus-within:ring-amber-500/40 transition-shadow">
      <Toolbar editor={editor} />
      <div style={{ minHeight }} className="bg-background overflow-y-auto">
        <EditorContent editor={editor} className="mozlit-editor text-[0.95rem] leading-relaxed" />
      </div>
    </div>
  );
}
