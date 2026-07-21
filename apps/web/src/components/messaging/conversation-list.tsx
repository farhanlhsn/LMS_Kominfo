"use client";

import { useState } from "react";
import { useApiMutation } from "../hooks/use-api-mutation";
import { api } from "../../lib/api-client";
import { EmptyState } from "../ui/states";
import { cn } from "../../lib/utils";
import type { Conversation, CreateConversationInput } from "../../lib/lms-types";

export interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string | null;
  onSelect?: (conversation: Conversation) => void;
  onChanged?: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onChanged,
}: ConversationListProps) {
  const { mutate: create } = useApiMutation(
    async (input: CreateConversationInput) => {
      const result = await api.createConversation(input);
      onChanged?.();
      return result.data;
    },
  );
  const [creating, setCreating] = useState(false);
  const [memberIds, setMemberIds] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const ids = memberIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setError("Add at least one user id");
      return;
    }
    try {
      await create({ type, name: name || undefined, memberIds: ids });
      setMemberIds("");
      setName("");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <aside
      className="flex h-full flex-col rounded-lg border border-border bg-card shadow-subtle"
      data-testid="conversation-list"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">Conversations</h2>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? "Cancel" : "New"}
        </button>
      </header>
      {creating ? (
        <form className="space-y-2 border-b border-border px-4 py-3" onSubmit={submit}>
          <label className="block text-xs text-muted-foreground">
            Type
            <select
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
              onChange={(event) => setType(event.target.value as "DIRECT" | "GROUP")}
              value={type}
            >
              <option value="DIRECT">Direct</option>
              <option value="GROUP">Group</option>
            </select>
          </label>
          {type === "GROUP" ? (
            <label className="block text-xs text-muted-foreground">
              Name
              <input
                className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
          ) : null}
          <label className="block text-xs text-muted-foreground">
            User IDs (comma or space separated)
            <input
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
              onChange={(event) => setMemberIds(event.target.value)}
              value={memberIds}
            />
          </label>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            type="submit"
          >
            Create
          </button>
        </form>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No conversations"
              description="Start a direct or group conversation to begin messaging."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-4 py-3 text-left hover:bg-muted",
                    activeId === conv.id && "bg-muted",
                  )}
                  onClick={() => onSelect?.(conv)}
                  type="button"
                >
                  <span className="text-sm font-medium">
                    {conv.name ??
                      conv.members
                        .map((m) => m.user?.name ?? m.user?.email ?? m.userId)
                        .slice(0, 2)
                        .join(", ")}
                  </span>
                  {conv.messages?.[0] ? (
                    <span className="text-xs text-muted-foreground">
                      {conv.messages[0].content.slice(0, 80)}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-muted-foreground">
                    {conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleString()
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
