"use client";

import { useState } from "react";
import { useApiMutation } from "../hooks/use-api-mutation";
import { api } from "../../lib/api-client";
import type { ChatMessage } from "../../lib/lms-types";

export interface MessageComposerProps {
  conversationId: string;
  parentMessageId?: string;
  onSent?: (message: ChatMessage) => void;
}

export function MessageComposer({
  conversationId,
  parentMessageId,
  onSent,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const { loading, error, mutate } = useApiMutation(async () => {
    const result = await api.sendMessage(conversationId, {
      content: value,
      parentMessageId,
    });
    setValue("");
    onSent?.(result.data);
    return result;
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    await mutate();
  };

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <input
        aria-label="New message"
        className="min-h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write a reply…"
        value={value}
      />
      <button
        className="inline-flex min-h-10 items-center rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={loading || !value.trim()}
        type="submit"
      >
        {loading ? "Sending…" : "Send"}
      </button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}
    </form>
  );
}
