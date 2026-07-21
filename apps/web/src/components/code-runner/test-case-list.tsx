"use client";

import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import type { CodeExecutionTestCaseRecord } from "../../lib/lms-types";

export interface TestCaseListProps {
  testCases: CodeExecutionTestCaseRecord[];
  emptyMessage?: string;
}

export function TestCaseList({ testCases, emptyMessage = "No test cases." }: TestCaseListProps) {
  if (!testCases.length) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Test cases</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Test cases</h3>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {testCases.map((tc) => (
            <li
              key={tc.id}
              className="rounded-md border border-border p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{tc.name}</span>
                <StatusBadge
                  tone={tc.passed ? "success" : "danger"}
                  value={tc.passed ? "Passed" : "Failed"}
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Input</p>
                  <pre className="rounded bg-muted/40 p-2 text-xs">{tc.input || "(none)"}</pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <pre className="rounded bg-muted/40 p-2 text-xs">{tc.expectedOutput}</pre>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <pre className="rounded bg-muted/40 p-2 text-xs">
                    {tc.actualOutput ?? <span className="text-muted-foreground">(no output)</span>}
                  </pre>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {tc.passed ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <X className="h-3 w-3 text-destructive" />
                )}
                {tc.passed ? "Test case passed" : "Test case failed"}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
