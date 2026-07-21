"use client";

import { useState } from "react";
import { AppShell } from "../../../components/layout/shells";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { useApiMutation } from "../../../components/hooks/use-api-mutation";
import {
  useAddPortfolioEntry,
  useMyPortfolio,
  useRemovePortfolioEntry,
  useUpdateMyPortfolio,
  useUpdatePortfolioEntry,
} from "../../../lib/api-hooks";
import type { Portfolio } from "../../../lib/lms-types";

export default function PortfolioPage() {
  const portfolioQuery = useMyPortfolio();
  const updatePortfolio = useUpdateMyPortfolio();
  const addEntry = useAddPortfolioEntry();
  const updateEntry = useUpdatePortfolioEntry();
  const removeEntry = useRemovePortfolioEntry();
  const [title, setTitle] = useState("My portfolio");
  const [description, setDescription] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [showcaseId, setShowcaseId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const portfolio: Portfolio | null = (portfolioQuery.data as Portfolio | null) ?? null;

  const save = useApiMutation(async () => {
    if (!portfolio) return;
    await updatePortfolio({
      title: title || portfolio.title,
      description: description || undefined,
    });
    await portfolioQuery.refresh();
  });

  const togglePublic = useApiMutation(async () => {
    if (!portfolio) return;
    await updatePortfolio({ isPublic: !portfolio.isPublic });
    await portfolioQuery.refresh();
  });

  const submitEntry = useApiMutation(async () => {
    if (!entryTitle.trim()) return;
    await addEntry({
      title: entryTitle.trim(),
      description: entryDescription || undefined,
      submissionId: submissionId || undefined,
      showcaseId: showcaseId || undefined,
    });
    setEntryTitle("");
    setEntryDescription("");
    setSubmissionId("");
    setShowcaseId("");
    await portfolioQuery.refresh();
  });

  return (
    <AppShell>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My portfolio</CardTitle>
          <CardDescription>
            Curate standout submissions and showcase entries to share your learning journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioQuery.loading ? (
            <p className="text-sm text-muted-foreground">Loading portfolio…</p>
          ) : portfolio ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={portfolio.title}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={save.mutate} disabled={save.loading}>
                  {save.loading ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={togglePublic.mutate}
                  disabled={togglePublic.loading}
                >
                  {portfolio.isPublic ? "Make private" : "Make public"}
                </Button>
              </div>
              {portfolio.isPublic && portfolio.shareToken ? (
                <p className="text-xs text-muted-foreground">
                  Public share link: {`/p/${portfolio.shareToken}`}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No portfolio yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add an entry</CardTitle>
          <CardDescription>
            Highlight a submission or a project showcase to feature it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Input
            value={entryTitle}
            onChange={(event) => setEntryTitle(event.target.value)}
            placeholder="Entry title"
          />
          <Input
            value={submissionId}
            onChange={(event) => setSubmissionId(event.target.value)}
            placeholder="Submission ID (optional)"
          />
          <Input
            value={showcaseId}
            onChange={(event) => setShowcaseId(event.target.value)}
            placeholder="Showcase ID (optional)"
          />
          <Textarea
            value={entryDescription}
            onChange={(event) => setEntryDescription(event.target.value)}
            rows={2}
            placeholder="Description"
          />
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={submitEntry.mutate} disabled={submitEntry.loading || !entryTitle.trim()}>
              {submitEntry.loading ? "Adding…" : "Add entry"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio?.entries?.length ? (
            portfolio.entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border border-border p-3"
              >
                {editingId === entry.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                    />
                    <Textarea
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await updateEntry(entry.id, {
                            title: editTitle,
                            description: editDescription,
                          });
                          setEditingId(null);
                          await portfolioQuery.refresh();
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      {entry.description ? (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditTitle(entry.title);
                          setEditDescription(entry.description ?? "");
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await removeEntry(entry.id);
                          await portfolioQuery.refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
