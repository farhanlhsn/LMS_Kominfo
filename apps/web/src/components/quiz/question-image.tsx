"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api-client";
import { questionImageFileId } from "../../lib/lms-types";

export function QuestionStemImage({
  metadata,
  className,
}: {
  metadata?: Record<string, unknown> | null;
  className?: string;
}) {
  const fileId = questionImageFileId({ metadata });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) {
      setUrl(null);
      return;
    }
    let active = true;
    void api
      .signedFileUrl(fileId, 600)
      .then((res) => {
        if (active) setUrl(res.url);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [fileId]);

  if (!fileId || !url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Question illustration"
      className={
        className ??
        "mt-3 max-h-64 w-full rounded-md border border-border object-contain bg-muted"
      }
      src={url}
    />
  );
}
