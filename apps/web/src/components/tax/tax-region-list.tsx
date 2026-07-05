"use client";

import { Globe } from "lucide-react";
import { useTaxRegions } from "../../lib/api-hooks";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";

export function TaxRegionList() {
  const regionsQuery = useTaxRegions();

  if (regionsQuery.isLoading) {
    return <LoadingState title="Loading tax regions" />;
  }

  if (regionsQuery.error) {
    return <ApiErrorState error={regionsQuery.error} />;
  }

  if (!regionsQuery.data?.length) {
    return (
      <EmptyState
        title="No tax regions configured"
        description="Default regions will appear once the system initializes them."
        icon={Globe}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Supported tax regions</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Default regional tax presets the platform recognizes.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {regionsQuery.data.map((region) => (
            <li
              key={region.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{region.name}</p>
                <p className="text-xs text-muted-foreground">
                  {region.code} • {region.currency}
                </p>
              </div>
              <span className="rounded border border-border bg-muted px-2 py-1 text-xs font-semibold">
                {region.taxPercent}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
