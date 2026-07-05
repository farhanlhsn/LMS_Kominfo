"use client";

import { useCallback, useState } from "react";
import { useSubmitReport } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent } from "../ui/card";
import type { ModerationTargetType } from "../../lib/lms-types";

export interface ReportButtonProps {
  targetType: ModerationTargetType;
  targetId: string;
  targetLabel?: string;
  className?: string;
}

const DEFAULT_REASONS: Record<ModerationTargetType, string[]> = {
  CONTENT: ["Spam", "Harassment", "Plagiarism", "Inappropriate"],
  USER: ["Impersonation", "Harassment", "Spam"],
  COMMENT: ["Spam", "Harassment", "Off-topic"],
  COURSE: ["Misleading", "Quality issue", "Plagiarism"],
  DISCUSSION: ["Spam", "Off-topic", "Harassment"],
};

export function ReportButton({ targetType, targetId, targetLabel, className }: ReportButtonProps) {
  const submit = useSubmitReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(DEFAULT_REASONS[targetType][0] ?? "Other");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setStatus("sending");
    setError(null);
    try {
      await submit({
        targetType,
        targetId,
        reason,
        description: description || undefined,
      });
      setStatus("success");
      setOpen(false);
      setDescription("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send report");
    }
  }, [submit, targetType, targetId, reason, description]);

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((value) => !value);
          setStatus("idle");
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {open ? "Cancel report" : "Report"}
      </Button>
      {open ? (
        <Card className="mt-2 border border-border">
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Report {targetLabel ? targetLabel : targetType.toLowerCase()}
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-xs font-medium">
              Reason
              <select
                className="mt-1 w-full rounded border border-border px-2 py-1 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                {DEFAULT_REASONS[targetType].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium">
              Details (optional)
              <textarea
                className="mt-1 w-full rounded border border-border px-2 py-1 text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmit} disabled={status === "sending"} size="sm">
                {status === "sending" ? "Submitting…" : "Submit report"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {status === "success" ? (
        <p className="mt-1 text-xs text-emerald-600" role="status">
          Report submitted. Moderators will review it shortly.
        </p>
      ) : null}
    </div>
  );
}
