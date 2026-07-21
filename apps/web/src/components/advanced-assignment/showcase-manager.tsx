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
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useCourseShowcases,
  useCreateCourseShowcase,
  useDeleteCourseShowcase,
  useUpdateCourseShowcase,
} from "../../lib/api-hooks";
import type { ProjectShowcase } from "../../lib/lms-types";

export interface ShowcaseManagerProps {
  courseId: string;
}

export function ShowcaseManager({ courseId }: ShowcaseManagerProps) {
  const query = useCourseShowcases(courseId);
  const create = useCreateCourseShowcase();
  const update = useUpdateCourseShowcase();
  const remove = useDeleteCourseShowcase();

  const [submissionId, setSubmissionId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  const submit = useApiMutation(async () => {
    if (!submissionId || !title) return;
    await create(courseId, {
      submissionId,
      title,
      summary: summary || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      externalUrl: externalUrl || undefined,
      publish: publishNow,
    });
    setSubmissionId("");
    setTitle("");
    setSummary("");
    setThumbnailUrl("");
    setExternalUrl("");
    setPublishNow(false);
    await query.refresh();
  });

  const items: ProjectShowcase[] = (query.data ?? []) as ProjectShowcase[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project showcase</CardTitle>
        <CardDescription>
          Promote standout learner submissions to a public course showcase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={submissionId}
            onChange={(event) => setSubmissionId(event.target.value)}
            placeholder="Submission ID"
          />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Showcase title"
          />
          <Textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Short summary"
            rows={3}
          />
          <div className="space-y-2">
            <Input
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
              placeholder="Thumbnail URL (optional)"
            />
            <Input
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
              placeholder="External URL (optional)"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(event) => setPublishNow(event.target.checked)}
              />
              Publish immediately
            </label>
          </div>
        </div>
        <Button
          onClick={submit.mutate}
          disabled={submit.loading || !submissionId || !title}
        >
          {submit.loading ? "Creating…" : "Create showcase"}
        </Button>
        {query.loading ? (
          <p className="text-sm text-muted-foreground">Loading showcases…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No showcases yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {item.publishedAt ? "Published" : "Draft"} • Views: {item.viewCount}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await update(item.id, { published: !item.publishedAt });
                      await query.refresh();
                    }}
                  >
                    {item.publishedAt ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await remove(item.id);
                      await query.refresh();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
