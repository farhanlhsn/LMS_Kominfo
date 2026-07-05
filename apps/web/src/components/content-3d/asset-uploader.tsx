"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { useCreateThreeDAsset } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import type { ThreeDFormat } from "../../lib/lms-types";

const FORMATS: ThreeDFormat[] = ["GLB", "GLTF", "FBX", "OBJ"];

export interface ThreeDAssetUploaderProps {
  onUploaded?: (assetId: string) => void;
}

export function ThreeDAssetUploader({ onUploaded }: ThreeDAssetUploaderProps) {
  const create = useCreateThreeDAsset();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<ThreeDFormat>("GLB");
  const [url, setUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [sizeBytes, setSizeBytes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name || !url) {
      setError("Name and asset URL are required");
      return;
    }
    setBusy(true);
    try {
      const result = await create({
        name,
        format,
        url,
        thumbnailUrl: thumbnailUrl || undefined,
        sizeBytes: sizeBytes || undefined,
      });
      onUploaded?.(result.id);
      setName("");
      setUrl("");
      setThumbnailUrl("");
      setSizeBytes(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload asset");
    } finally {
      setBusy(false);
    }
  }, [name, format, url, thumbnailUrl, sizeBytes, create, onUploaded]);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Asset name
          <input
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Format
          <select
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={format}
            onChange={(e) => setFormat(e.target.value as ThreeDFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Asset URL
          <input
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://cdn.example.com/asset.glb"
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Thumbnail URL (optional)
          <input
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Size (bytes)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={sizeBytes}
            onChange={(e) => setSizeBytes(Number(e.target.value))}
          />
        </label>
      </div>
      <Button onClick={handleSubmit} disabled={busy}>
        <Upload className="mr-2 h-4 w-4" />
        {busy ? "Saving…" : "Save asset"}
      </Button>
    </div>
  );
}
