"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, RotateCw } from "lucide-react";
import { PanelFrame } from "./panel-shared";
import { useActivityFlashcards } from "../../../lib/api-hooks";
import type { Activity } from "../../../lib/lms-types";

interface Flashcard {
  front: string;
  back: string;
  hint?: string;
}

interface FlashcardSet {
  id: string;
  title: string | null;
  cards: Flashcard[];
}

export function FlashcardsPanel({
  activity,
}: {
  course: unknown;
  lesson: unknown;
  activity: Activity;
  videoTime: number;
}) {
  const query = useActivityFlashcards(activity.id);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const sets = (query.data ?? []) as FlashcardSet[];
  const set = sets[currentSetIndex];
  const card = set?.cards[currentCard];

  const prev = useCallback(() => {
    if (currentCard > 0) {
      setCurrentCard((c) => c - 1);
      setFlipped(false);
    }
  }, [currentCard]);

  const next = useCallback(() => {
    if (set && currentCard < set.cards.length - 1) {
      setCurrentCard((c) => c + 1);
      setFlipped(false);
    }
  }, [currentCard, set]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  const icon = <Layers aria-hidden="true" className="h-5 w-5 text-primary" />;

  if (query.loading) {
    return (
      <PanelFrame icon={icon} title="Flashcards">
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      </PanelFrame>
    );
  }

  if (query.error) {
    return (
      <PanelFrame icon={icon} title="Flashcards">
        <p className="p-4 text-sm text-destructive">Could not load flashcards.</p>
      </PanelFrame>
    );
  }

  if (!sets.length) {
    return (
      <PanelFrame icon={icon} title="Flashcards">
        <p className="p-4 text-sm text-muted-foreground">No flashcards available for this activity.</p>
      </PanelFrame>
    );
  }

  if (!set || !card) return null;

  return (
    <PanelFrame
      icon={icon}
      title="Flashcards"
      action={
        sets.length > 1 ? (
          <select
            className="rounded border border-input bg-background px-2 py-0.5 text-xs"
            value={currentSetIndex}
            onChange={(e) => {
              setCurrentSetIndex(Number(e.target.value));
              setCurrentCard(0);
              setFlipped(false);
            }}
          >
            {sets.map((s, i) => (
              <option key={s.id} value={i}>{s.title ?? `Set ${i + 1}`}</option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center gap-4 p-4">
        <button
          className="h-48 w-full max-w-sm cursor-pointer rounded-xl border-2 border-border bg-card p-6 shadow-subtle transition-transform duration-300 hover:shadow-md"
          onClick={() => setFlipped((f) => !f)}
          type="button"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {flipped ? "Back" : "Front"}
            </p>
            <p className="mt-2 text-base font-medium">
              {flipped ? card.back : card.front}
            </p>
            {!flipped && card.hint ? (
              <p className="mt-3 text-xs text-muted-foreground italic">
                Hint: {card.hint}
              </p>
            ) : null}
          </div>
        </button>

        <p className="text-xs text-muted-foreground">
          {currentCard + 1} of {set.cards.length}
        </p>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30"
            disabled={currentCard === 0}
            onClick={prev}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
            onClick={() => setFlipped((f) => !f)}
            type="button"
          >
            <RotateCw className="h-3 w-3" />
            Flip
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30"
            disabled={currentCard >= set.cards.length - 1}
            onClick={next}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </PanelFrame>
  );
}
