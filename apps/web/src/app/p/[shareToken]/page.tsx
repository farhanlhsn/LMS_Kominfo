"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { usePublicPortfolio } from "../../../lib/api-hooks";
import type { Portfolio } from "../../../lib/lms-types";

export default function PublicPortfolioPage() {
  const params = useParams<{ shareToken: string }>();
  const query = usePublicPortfolio(params?.shareToken ?? null);

  if (query.loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading public portfolio…</p>
    );
  }

  if (query.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio unavailable</CardTitle>
          <CardDescription>
            The shared portfolio is not available or has been unpublished.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const portfolio: Portfolio | null = (query.data as Portfolio | null) ?? null;
  if (!portfolio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio not found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{portfolio.title}</CardTitle>
          <CardDescription>
            {portfolio.user?.name ?? "Anonymous learner"}
          </CardDescription>
        </CardHeader>
        {portfolio.description ? (
          <CardContent>
            <p className="text-sm">{portfolio.description}</p>
          </CardContent>
        ) : null}
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {portfolio.entries?.length ? (
          portfolio.entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle>{entry.title}</CardTitle>
              </CardHeader>
              {entry.description ? (
                <CardContent>
                  <p className="text-sm">{entry.description}</p>
                </CardContent>
              ) : null}
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No entries shared.</p>
        )}
      </div>
    </div>
  );
}
