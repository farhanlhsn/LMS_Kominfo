"use client";

import { useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { ConversationList } from "../../components/messaging/conversation-list";
import { MessageThread } from "../../components/messaging/message-thread";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useConversations } from "../../lib/api-hooks";
import type { Conversation } from "../../lib/lms-types";

export default function MessagesPage() {
  const query = useConversations();
  const [active, setActive] = useState<Conversation | null>(null);

  const conversations = query.data ?? [];
  const resolved = active ?? conversations[0] ?? null;

  return (
    <AuthGate>
      <AppShell currentPath="/messages">
        <PageHeader
          eyebrow="Messages"
          title="Direct messages"
          description="Real-time conversations with members of your organization."
        />
        {query.loading ? (
          <LoadingState title="Loading conversations" />
        ) : query.error ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load conversations"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
            <ConversationList
              conversations={conversations}
              activeId={resolved?.id ?? null}
              onSelect={setActive}
              onChanged={() => query.refresh()}
            />
            {resolved ? (
              <MessageThread
                conversation={resolved}
                onChanged={() => query.refresh()}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">
                Select a conversation to start chatting.
              </div>
            )}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
