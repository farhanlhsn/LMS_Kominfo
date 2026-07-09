"use client";

import { Box } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import type { ThreeDAssetRecord } from "../../lib/lms-types";

export interface ThreeDViewerProps {
  asset: ThreeDAssetRecord | null;
  loading?: boolean;
  error?: unknown;
}

export function ThreeDViewer({ asset, loading, error }: ThreeDViewerProps) {
  if (loading) {
    return <LoadingState title="Loading 3D asset" />;
  }
  if (error) {
    return <ApiErrorState error={error} fallbackTitle="Could not load 3D asset" />;
  }
  if (!asset) {
    return (
      <EmptyState
        title="No 3D asset selected"
        description="Choose an uploaded 3D asset to preview it."
        icon={Box}
      />
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Box aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">{asset.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {asset.format} / {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Asset URL</p>
          <a
            className="break-all text-primary hover:underline"
            href={asset.url}
            rel="noreferrer"
            target="_blank"
          >
            {asset.url}
          </a>
        </div>
        {asset.thumbnailUrl ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Thumbnail</p>
            <img
              alt={`${asset.name} thumbnail`}
              className="mt-1 max-h-40 rounded border border-border"
              src={asset.thumbnailUrl}
            />
          </div>
        ) : null}
        {asset.scenes?.length ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              {asset.scenes.length} scene{asset.scenes.length === 1 ? "" : "s"} available
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
