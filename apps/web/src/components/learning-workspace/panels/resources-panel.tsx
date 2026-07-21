"use client";

import { ExternalLink, FileText } from "lucide-react";
import { EmptyState } from "../../ui/states";
import type { Activity } from "../../../lib/lms-types";
import { PanelFrame } from "./panel-shared";

export function ResourcesPanel({ activity }: { activity: Activity }) {
  const resources = Array.isArray(activity.activityContent?.resources)
    ? activity.activityContent?.resources
    : [];
  return (
    <PanelFrame
      icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Resources"
    >
      {resources.length ? (
        <div className="space-y-2">
          {resources.map((resource, index) => {
            const item =
              resource && typeof resource === "object" && !Array.isArray(resource)
                ? (resource as Record<string, unknown>)
                : {};
            const url = typeof item.url === "string" ? item.url : null;
            const label =
              typeof item.label === "string"
                ? item.label
                : typeof item.title === "string"
                  ? item.title
                  : `Resource ${index + 1}`;
            return url ? (
              <a
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-primary/40 hover:bg-muted"
                href={url}
                key={`${url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <span className="truncate">{label}</span>
                <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ) : (
              <div
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                key={index}
              >
                {label}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No extra resources"
          description="Files and links attached to the activity appear in the main content."
        />
      )}
    </PanelFrame>
  );
}
