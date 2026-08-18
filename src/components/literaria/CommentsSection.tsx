'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Reply, Send, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CommentUser {
  id: string;
  nome: string;
  role: string;
}

interface ReplyComment {
  id: string;
  conteudo: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  parentId: string;
  user: CommentUser;
}

interface Comment {
  id: string;
  conteudo: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  parentId: string | null;
  user: CommentUser;
  replies: ReplyComment[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  return date.toLocaleDateString('pt-MZ');
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600 dark:text-amber-400">Admin</Badge>;
  if (role === 'ESCRITOR') return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-400 text-emerald-600 dark:text-emerald-400">Autor</Badge>;
  return null;
}

function SingleComment({
  comment,
  currentUserId,
  userRole,
  chapterAuthorId,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment | ReplyComment;
  currentUserId: string | undefined;
  userRole: string | undefined;
  chapterAuthorId?: string;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}) {
  const canDelete =
    currentUserId === comment.userId ||
    currentUserId === chapterAuthorId ||
    userRole === 'ADMIN';

  return (
    <div className={cn('group', !isReply && 'py-4 border-b border-border/40 last:border-b-0')}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
            comment.user.role === 'ADMIN'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : comment.user.role === 'ESCRITOR'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {comment.user.nome.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.user.nome}</span>
            <RoleBadge role={comment.user.role} />
            {currentUserId === comment.userId && (
              <span className="text-[10px] text-muted-foreground">(você)</span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-foreground/90 mt-1 leading-relaxed whitespace-pre-wrap break-words">
            {comment.conteudo}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => onReply(comment.id, comment.user.nome)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
            >
              <Reply className="h-3 w-3" /> Responder
            </button>
            {canDelete && (
              <button
                onClick={() => setDeleteTarget(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentsSection({
  chapterId,
  bookAuthorId,
}: {
  chapterId: string;
  bookAuthorId?: string;
}) {
  const { user, navigate } = useAppStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const data = await apiFetch<Comment[]>(`/api/comments?chapterId=${chapterId}`);
      setComments(data);
      // Auto-expand all replies
      const ids = new Set<string>();
      data.forEach((c) => { if (c.replies.length > 0) ids.add(c.id); });
      setExpandedReplies(ids);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmitComment() {
    if (!user) {
      navigate('login');
      return;
    }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiFetch<Comment & { replies?: ReplyComment[] }>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ conteudo: newComment, chapterId }),
      });
      setComments((prev) => [{ ...created, replies: [] }, ...prev]);
      setNewComment('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(commentId: string) {
    if (!user) {
      navigate('login');
      return;
    }
    if (!replyContent.trim()) return;
    setReplyingTo(commentId);
    try {
      const created = await apiFetch<ReplyComment>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ conteudo: replyContent, chapterId, parentId: commentId }),
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: [...c.replies, created] } : c
        )
      );
      setReplyTo(null);
      setReplyContent('');
      setExpandedReplies((prev) => new Set([...prev, commentId]));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReplyingTo(null);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await apiFetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
      setComments((prev) =>
        prev
          .map((c) =>
            c.id === commentId
              ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
              : { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
          )
          .filter((c) => c.id !== commentId)
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  const totalReplies = comments.reduce((sum, c) => sum + c.replies.length, 0);

  return (
    <section className="max-w-2xl mx-auto px-6 sm:px-8 pb-10">
      {/* Divider */}
      <div className="border-t border-border/50 pt-8 mt-4">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            Comentários
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-1.5">
                ({comments.length}{totalReplies > 0 ? ` · ${totalReplies} respostas` : ''})
              </span>
            )}
          </h2>
        </div>

        {/* New comment form */}
        {user ? (
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs font-semibold text-amber-800 dark:text-amber-300">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Partilhe a sua opinião sobre este capítulo..."
                  rows={3}
                  className="resize-none text-sm"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    {newComment.length}/1000
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-8"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1" />
                    )}
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border/30 text-center">
            <p className="text-sm text-muted-foreground">
              <button
                onClick={() => navigate('login')}
                className="text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                Entre na sua conta
              </button>{' '}
              para deixar um comentário.
            </p>
          </div>
        )}

        {/* Reply form (inline) */}
        {replyTo && user && (
          <div className="mb-4 ml-11 p-3 rounded-lg bg-muted/40 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Reply className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                A responder a <span className="font-medium text-foreground">{replyTo.name}</span>
              </span>
              <button
                onClick={() => { setReplyTo(null); setReplyContent(''); }}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva a sua resposta..."
              rows={2}
              className="resize-none text-sm"
              maxLength={1000}
              autoFocus
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={() => handleReply(replyTo.id)}
                disabled={replyingTo === replyTo.id || !replyContent.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
              >
                {replyingTo === replyTo.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Responder
              </Button>
            </div>
          </div>
        )}

        {/* Comments list */}
        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Ainda sem comentários.</p>
            <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a partilhar a sua opinião.</p>
          </div>
        ) : (
          <div className="divide-y-0">
            {comments.map((comment) => (
              <div key={comment.id}>
                <SingleComment
                  comment={comment}
                  currentUserId={user?.id}
                  userRole={user?.role}
                  chapterAuthorId={bookAuthorId}
                  onReply={(id, name) => {
                    setReplyTo({ id, name });
                    setReplyContent('');
                  }}
                  onDelete={handleDelete}
                />

                {/* Replies toggle */}
                {comment.replies.length > 0 && (
                  <div className="ml-11">
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1"
                    >
                      {expandedReplies.has(comment.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {comment.replies.length} {comment.replies.length === 1 ? 'resposta' : 'respostas'}
                    </button>

                    {/* Replies list */}
                    {expandedReplies.has(comment.id) && (
                      <div className="border-l-2 border-border/30 pl-4 mt-1 space-y-0">
                        {comment.replies.map((reply) => (
                          <SingleComment
                            key={reply.id}
                            comment={reply}
                            currentUserId={user?.id}
                            userRole={user?.role}
                            chapterAuthorId={bookAuthorId}
                            onReply={(id, name) => {
                              setReplyTo({ id, name });
                              setReplyContent('');
                            }}
                            onDelete={handleDelete}
                            isReply
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comentário</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja eliminar este comentário? Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { onDelete(deleteTarget); setDeleteTarget(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}