"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useApproveAiItem,
  useListInstructorAiItems,
  usePublishAiItem,
  useRejectAiItem,
  useUpdateAiItem,
} from "../../lib/api-hooks";
import type { AiGeneratedItem } from "../../lib/lms-types";

export interface AiApprovalQueueProps {
  activityId: string;
}

export function AiApprovalQueue({ activityId }: AiApprovalQueueProps) {
  const allItems = useListInstructorAiItems({ activityId });
  const approve = useApproveAiItem();
  const reject = useRejectAiItem();
  const publish = usePublishAiItem();
  const update = useUpdateAiItem();
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const items: AiGeneratedItem[] = ((allItems.data as unknown as AiGeneratedItem[]) ?? []);
  const pending = items.filter(
    (item) => item.status === "DRAFT" || item.status === "REJECTED",
  );
  const approved = items.filter((item) => item.status === "APPROVED");
  const published = items.filter((item) => item.status === "PUBLISHED");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending drafts</CardTitle>
          <CardDescription>Review, edit, and approve generated items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allItems.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts need review.</p>
          ) : (
            pending.map((item) => (
              <DraftItem
                key={item.id}
                item={item}
                editing={editing === item.id}
                editPrompt={editPrompt}
                onEditPromptChange={setEditPrompt}
                onStartEdit={() => {
                  setEditing(item.id);
                  setEditPrompt(String((item as { prompt?: string }).prompt ?? ""));
                }}
                onCancelEdit={() => setEditing(null)}
                onApprove={async () => {
                  await approve(item.id);
                  await allItems.refresh();
                }}
                onReject={async () => {
                  await reject(item.id, "Reviewed by instructor");
                  await allItems.refresh();
                }}
                onSaveEdit={async () => {
                  await update(item.id, { prompt: editPrompt });
                  setEditing(null);
                  await allItems.refresh();
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved & published</CardTitle>
          <CardDescription>Publish approved items to learners.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {approved.length === 0 && published.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing approved yet.</p>
          ) : null}
          {approved.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </div>
              <Button
                onClick={async () => {
                  await publish(item.id);
                  await allItems.refresh();
                }}
              >
                Publish
              </Button>
            </div>
          ))}
          {published.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </div>
              <span className="text-xs text-muted-foreground">Published</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftItem({
  item,
  editing,
  editPrompt,
  onEditPromptChange,
  onStartEdit,
  onCancelEdit,
  onApprove,
  onReject,
  onSaveEdit,
}: {
  item: AiGeneratedItem;
  editing: boolean;
  editPrompt: string;
  onEditPromptChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onSaveEdit: () => Promise<void>;
}) {
  const save = useApiMutation(onSaveEdit);
  const approve = useApiMutation(onApprove);
  const reject = useApiMutation(onReject);
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">{item.title ?? item.type}</p>
          <p className="text-xs text-muted-foreground">Status: {item.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button variant="secondary" size="sm" onClick={onStartEdit}>
              Edit prompt
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={async () => {
              await approve.mutate();
            }}
            disabled={approve.loading}
          >
            {approve.loading ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await reject.mutate();
            }}
            disabled={reject.loading}
          >
            {reject.loading ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={editPrompt}
            onChange={(event) => onEditPromptChange(event.target.value)}
            placeholder="Edit the generation prompt for re-use"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await save.mutate();
              }}
              disabled={save.loading}
            >
              {save.loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
