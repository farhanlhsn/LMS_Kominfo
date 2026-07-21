"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiMutation } from "../hooks/use-api-mutation";
import { useRealtimeChannel } from "../hooks/use-realtime-channel";
import { RealtimeStatusPill } from "../realtime/realtime-status";
import { EmptyState } from "../ui/states";
import { api } from "../../lib/api-client";
import { useMarkConversationRead } from "../../lib/api-hooks";
import type { ChatMessage, Conversation } from "../../lib/lms-types";

export interface MessageThreadProps {
  conversation: Conversation;
  currentUserId?: string;
  onChanged?: () => void;
}

export function MessageThread({
  conversation,
  currentUserId,
  onChanged,
}: MessageThreadProps) {
  const messages = useMessagesForConversation(conversation.id);
  const realtime = useRealtimeChannel(
    `org:${conversation.organizationId}:conversation:${conversation.id}`,
    {
      onEvent: (event) => {
        if (event.type === "message.created") {
          void messages.refresh();
        }
      },
    },
  );
  const markRead = useMarkConversationRead();
  const { send, loading: sending } = useComposer(conversation.id, onChanged);

  useEffect(() => {
    if (!conversation.id) return;
    void markRead(conversation.id);
  }, [conversation.id, markRead, messages.data?.length]);

  return (
    <section
      className="flex h-full flex-col rounded-lg border border-border bg-card shadow-subtle"
      data-testid="message-thread"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">
            {conversation.name ?? "Direct conversation"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {conversation.members.length} member
            {conversation.members.length === 1 ? "" : "s"}
          </p>
        </div>
        <RealtimeStatusPill
          status={realtime.status}
          lastEventAt={realtime.lastEventAt}
        />
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.hasMore ? (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => void messages.loadOlder()}
            >
              Load older messages
            </button>
          </div>
        ) : null}
        {messages.loading ? (
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.error ? (
          <p className="text-sm text-destructive">{messages.error.message}</p>
        ) : (messages.data ?? []).length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Be the first to say something in this conversation."
          />
        ) : (
          <ol className="space-y-3">
            {(messages.data ?? []).map((message) => (
              <li
                key={message.id}
                className={`flex ${
                  message.senderId === currentUserId ? "justify-end" : "justify-start"
                }`}
              >
                <article
                  className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm ${
                    message.senderId === currentUserId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-foreground"
                  }`}
                >
                  {message.deletedAt ? (
                    <p className="italic opacity-70">Message deleted</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(message.createdAt).toLocaleTimeString()}
                    {message.editedAt ? " · edited" : ""}
                  </p>
                  {message.reactions?.length ? (
                    <p className="mt-1 text-xs">
                      {message.reactions
                        .map(
                          (r) =>
                            `${r.emoji} (${r.userId === currentUserId ? "you" : "1"})`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
      <Composer onSend={send} disabled={sending} />
    </section>
  );
}

interface UseMessagesResult {
  data: ChatMessage[] | null;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadOlder: () => Promise<void>;
  refresh: () => Promise<void>;
}

function useMessagesForConversation(conversationId: string): UseMessagesResult {
  const [state, setState] = useState<{
    data: ChatMessage[] | null;
    loading: boolean;
    error: Error | null;
    nextCursor: string | null;
    hasMore: boolean;
  }>({ data: null, loading: true, error: null, nextCursor: null, hasMore: false });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await api.listMessages(conversationId, { limit: 50 });
      // API returns newest-first; reverse for chronological UI
      const items = [...(result.data ?? [])].reverse();
      setState({
        data: items,
        loading: false,
        error: null,
        nextCursor: result.meta?.nextCursor ?? null,
        hasMore: Boolean(result.meta?.hasMore),
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
        nextCursor: null,
        hasMore: false,
      });
    }
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    if (!state.nextCursor || !state.hasMore) return;
    try {
      const result = await api.listMessages(conversationId, {
        cursor: state.nextCursor,
        limit: 50,
      });
      const older = [...(result.data ?? [])].reverse();
      setState((prev) => ({
        ...prev,
        data: [...older, ...(prev.data ?? [])],
        nextCursor: result.meta?.nextCursor ?? null,
        hasMore: Boolean(result.meta?.hasMore),
      }));
    } catch {
      // keep existing messages on failure
    }
  }, [conversationId, state.hasMore, state.nextCursor]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    loadOlder,
    refresh: load,
  };
}

function useComposer(conversationId: string, onChanged?: () => void) {
  const { loading, mutate } = useApiMutation(async (content: string) => {
    await api.sendMessage(conversationId, { content });
    onChanged?.();
  });
  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await mutate(content);
    },
    [mutate],
  );
  return { loading, send };
}

function Composer({
  onSend,
  disabled,
}: {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      await onSend(value);
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex gap-2 border-t border-border p-3" onSubmit={submit}>
      <input
        aria-label="Message"
        className="min-h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message"
        value={value}
      />
      <button
        className="inline-flex min-h-10 items-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={busy || disabled || !value.trim()}
        type="submit"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
