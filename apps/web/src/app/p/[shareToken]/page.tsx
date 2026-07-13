"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { PublicLayout } from "../../../components/layout/shells";
import { usePublicPortfolio } from "../../../lib/api-hooks";
import type { Portfolio } from "../../../lib/lms-types";

export default function PublicPortfolioPage() {
  const params = useParams<{ shareToken: string }>();
  const query = usePublicPortfolio(params?.shareToken ?? null);

  if (query.loading) {
    return (
      <PublicLayout>
        <p className="p-8 text-sm text-muted-foreground">Loading public portfolio…</p>
      </PublicLayout>
    );
  }

  if (query.error) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio unavailable</CardTitle>
              <CardDescription>
                The shared portfolio is not available or has been unpublished.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const portfolio: Portfolio | null = (query.data as Portfolio | null) ?? null;
  if (!portfolio) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio not found</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
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
    </PublicLayout>
  );
}
