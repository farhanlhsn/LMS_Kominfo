"use client";

import { useState } from "react";
import { useApiMutation } from "../hooks/use-api-mutation";
import { api } from "../../lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../lib/utils";
import type { BulkEntityType, BulkJobType } from "../../lib/lms-types";

const BULK_TYPES: BulkJobType[] = [
  "ARCHIVE",
  "UNARCHIVE",
  "ENROLL",
  "UNENROLL",
  "TAG",
  "UNTAG",
  "IMPORT",
  "EXPORT",
];

const ENTITY_TYPES: BulkEntityType[] = ["course", "user", "enrollment", "content", "tag"];

export interface BulkJobFormProps {
  onSubmitted?: (jobId: string) => void;
}

export function BulkJobForm({ onSubmitted }: BulkJobFormProps) {
  const [type, setType] = useState<BulkJobType>("ARCHIVE");
  const [entityType, setEntityType] = useState<BulkEntityType>("course");
  const [entityIdsText, setEntityIdsText] = useState("");
  const { loading, error, mutate } = useApiMutation(
    async (input: { type: BulkJobType; items: Array<{ entityType: BulkEntityType; entityId: string }> }) => {
      const result = await api.createBulkJob(input);
      onSubmitted?.(result.job.id);
      return result;
    },
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entityIds = entityIdsText
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (entityIds.length === 0) return;
    await mutate({
      type,
      items: entityIds.map((entityId) => ({ entityType, entityId })),
    });
  };

  return (
    <form
      className="rounded-lg border border-border bg-card p-5 shadow-subtle"
      onSubmit={submit}
    >
      <h2 className="text-base font-semibold">Create bulk job</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select operation and entity type, then paste real database IDs separated
        by commas or spaces. Jobs run asynchronously and can be monitored below.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-muted-foreground">Job type</span>
          <Select value={type} onValueChange={(value) => setType(value as BulkJobType)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULK_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-sm">
          <span className="block text-muted-foreground">Entity type</span>
          <Select value={entityType} onValueChange={(value) => setEntityType(value as BulkEntityType)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="block text-muted-foreground">
            Entity IDs (comma or space separated)
          </span>
          <input
            className={cn(
              "mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground",
            )}
            onChange={(event) => setEntityIdsText(event.target.value)}
            placeholder="course_id_1, course_id_2"
            type="text"
            value={entityIdsText}
          />
        </label>
        <div className="sm:col-span-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Running…" : "Run bulk job"}
          </button>
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
