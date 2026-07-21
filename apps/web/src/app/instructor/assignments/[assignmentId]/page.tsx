"use client";

import { use } from "react";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { GroupManager } from "../../../../components/advanced-assignment/group-manager";
import { PeerReviewManager } from "../../../../components/advanced-assignment/peer-review-manager";
import { ShowcaseManager } from "../../../../components/advanced-assignment/showcase-manager";
import { useAssignment } from "../../../../lib/api-hooks";

export default function AssignmentAdvancedPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = use(params);
  const assignment = useAssignment(assignmentId);

  if (assignment.loading) {
    return (
      <AuthGate>
        <AppShell currentPath="/instructor/courses">
          <LoadingState title="Loading assignment" />
        </AppShell>
      </AuthGate>
    );
  }

  if (assignment.error || !assignment.data) {
    return (
      <AuthGate>
        <AppShell currentPath="/instructor/courses">
          <ApiErrorState
            error={assignment.error}
            fallbackTitle="Could not load assignment"
          />
        </AppShell>
      </AuthGate>
    );
  }

  const data = assignment.data;

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Advanced assignment"
          title={data.title}
          description="Manage collaboration, peer review, project showcase, and plagiarism workflows."
        />
        <div className="space-y-6">
          <GroupManager
            assignmentId={data.id}
            courseId={data.courseId}
            initialMode={data.collaborationMode ?? "INDIVIDUAL"}
            initialMinMembers={data.groupMinMembers ?? 1}
            initialMaxMembers={data.groupMaxMembers ?? 1}
            initialMaxResubmissions={data.maxResubmissions}
          />
          <PeerReviewManager assignmentId={data.id} />
          <ShowcaseManager courseId={data.courseId} />
        </div>
      </AppShell>
    </AuthGate>
  );
}
