"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Subtitles } from "lucide-react";
import { useCaptionTracks, useTranscript } from "../../../lib/api-hooks";
import type { Activity, TranscriptSegment } from "../../../lib/lms-types";
import { ApiErrorState, EmptyState, LoadingState } from "../../ui/states";
import {
  PanelFrame,
  formatTimestamp,
  seekVideo,
} from "./panel-shared";

export function TranscriptPanel({
  activity,
  videoTime,
}: {
  activity: Activity;
  videoTime: number;
}) {
  const captions = useCaptionTracks(activity.id);
  const [language, setLanguage] = useState<string>("");
  const transcript = useTranscript(activity.id, language || null);
  const [search, setSearch] = useState("");
  const languages = useMemo(
    () =>
      Array.from(
        new Set(
          (captions.data ?? [])
            .map((track) => track.language)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [captions.data],
  );

  useEffect(() => {
    if (!languages.length) {
      setLanguage("");
      return;
    }
    if (!language || !languages.includes(language)) {
      const defaultLanguage =
        (captions.data ?? []).find((track) => track.isDefault)?.language ??
        languages[0] ??
        "";
      setLanguage(defaultLanguage);
    }
  }, [captions.data, language, languages]);

  const filtered = (transcript.data ?? []).filter((segment) =>
    segment.text.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <PanelFrame
      icon={<Subtitles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Transcript"
    >
      <TranscriptSearch
        value={search}
        onChange={setSearch}
        language={language}
        languages={languages}
        onLanguageChange={setLanguage}
      />
      <VideoTranscriptSync
        currentTime={videoTime}
        segments={transcript.data ?? []}
      />
      {transcript.loading ? (
        <LoadingState title="Loading transcript" />
      ) : transcript.error ? (
        <ApiErrorState
          error={transcript.error}
          fallbackTitle="Could not load transcript"
        />
      ) : filtered.length ? (
        <TranscriptSegmentList segments={filtered} />
      ) : (
        <EmptyState
          title="No transcript"
          description="Transcript segments will appear here when available."
        />
      )}
    </PanelFrame>
  );
}

export function TranscriptSearch({
  value,
  onChange,
  language,
  languages,
  onLanguageChange,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  languages: string[];
  onLanguageChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 grid gap-2">
      <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
        <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search transcript"
        />
      </label>
      {languages.length > 1 ? (
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Caption language
          <select
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            onChange={(event) => onLanguageChange(event.target.value)}
            value={language}
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function VideoTranscriptSync({
  currentTime,
  segments,
}: {
  currentTime: number;
  segments: TranscriptSegment[];
}) {
  const active = segments.find(
    (segment) =>
      currentTime >= segment.startSeconds && currentTime <= segment.endSeconds,
  );
  if (!active) return null;
  return (
    <div className="mb-3 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
      <p className="font-semibold">{formatTimestamp(active.startSeconds)}</p>
      <p className="mt-1 text-muted-foreground">{active.text}</p>
    </div>
  );
}

export function TranscriptSegmentList({
  segments,
}: {
  segments: TranscriptSegment[];
}) {
  return (
    <div className="space-y-2">
      {segments.map((segment) => (
        <button
          key={segment.id}
          className="w-full rounded-md border border-border p-3 text-left hover:bg-muted"
          onClick={() => seekVideo(segment.startSeconds)}
          type="button"
        >
          <span className="text-xs font-semibold text-primary">
            {formatTimestamp(segment.startSeconds)}
          </span>
          <p className="mt-1 text-sm leading-6">{segment.text}</p>
        </button>
      ))}
    </div>
  );
}
