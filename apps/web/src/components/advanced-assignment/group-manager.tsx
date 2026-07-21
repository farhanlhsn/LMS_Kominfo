"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useAssignmentGroups,
  useCreateAssignmentGroup,
  useDeleteAssignmentGroup,
  useAddAssignmentGroupMember,
  useRemoveAssignmentGroupMember,
  useUpdateAssignmentCollaboration,
} from "../../lib/api-hooks";
import type { AssignmentGroup } from "../../lib/lms-types";

export interface GroupManagerProps {
  assignmentId: string;
  courseId: string;
  initialMode: "INDIVIDUAL" | "GROUP";
  initialMinMembers: number;
  initialMaxMembers: number;
  initialMaxResubmissions?: number;
}

export function GroupManager(props: GroupManagerProps) {
  const groupsQuery = useAssignmentGroups(props.assignmentId);
  const createGroup = useCreateAssignmentGroup();
  const deleteGroup = useDeleteAssignmentGroup();
  const addMember = useAddAssignmentGroupMember();
  const removeMember = useRemoveAssignmentGroupMember();
  const updateCollaboration = useUpdateAssignmentCollaboration();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(props.initialMaxMembers);
  const [collaborationMode, setCollaborationMode] = useState<"INDIVIDUAL" | "GROUP">(
    props.initialMode,
  );
  const [groupMinMembers, setGroupMinMembers] = useState(props.initialMinMembers);
  const [groupMaxMembers, setGroupMaxMembers] = useState(props.initialMaxMembers);
  const [maxResubmissions, setMaxResubmissions] = useState(
    props.initialMaxResubmissions ?? 0,
  );

  const saveSettings = useApiMutation(async () => {
    await updateCollaboration(props.assignmentId, {
      collaborationMode,
      groupMinMembers,
      groupMaxMembers,
      maxResubmissions: maxResubmissions || undefined,
    });
    if (collaborationMode === "GROUP") {
      await groupsQuery.refresh();
    }
  });

  const create = useApiMutation(async () => {
    if (!name.trim()) return;
    await createGroup(props.assignmentId, {
      name: name.trim(),
      maxMembers: maxMembers || undefined,
    });
    setName("");
    await groupsQuery.refresh();
  });

  const groups: AssignmentGroup[] = (groupsQuery.data ?? []) as AssignmentGroup[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assignment collaboration</CardTitle>
          <CardDescription>
            Switch the assignment between individual and group submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode</label>
            <Select
              value={collaborationMode}
              onValueChange={(value) =>
                setCollaborationMode(value as "INDIVIDUAL" | "GROUP")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Min members per group</label>
            <Input
              type="number"
              min={1}
              value={groupMinMembers}
              onChange={(event) => setGroupMinMembers(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max members per group</label>
            <Input
              type="number"
              min={groupMinMembers}
              value={groupMaxMembers}
              onChange={(event) => setGroupMaxMembers(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max resubmissions</label>
            <Input
              type="number"
              min={0}
              value={maxResubmissions}
              onChange={(event) => setMaxResubmissions(Number(event.target.value))}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              onClick={saveSettings.mutate}
              disabled={saveSettings.loading}
            >
              {saveSettings.loading ? "Saving…" : "Save collaboration settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {collaborationMode === "GROUP" ? (
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>
              Create groups and add learners by user ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr,160px,auto]">
              <Input
                placeholder="Group name (e.g. Cohort A)"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                type="number"
                min={1}
                value={maxMembers}
                onChange={(event) => setMaxMembers(Number(event.target.value))}
                placeholder="Max members"
              />
              <Button onClick={create.mutate} disabled={create.loading || !name.trim()}>
                {create.loading ? "Creating…" : "Create group"}
              </Button>
            </div>
            {groupsQuery.loading ? (
              <p className="text-sm text-muted-foreground">Loading groups…</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <GroupRow
                    key={group.id}
                    group={group}
                    onAddMember={async (userId) => {
                      await addMember(props.assignmentId, group.id, userId);
                      await groupsQuery.refresh();
                    }}
                    onRemoveMember={async (userId) => {
                      await removeMember(props.assignmentId, group.id, userId);
                      await groupsQuery.refresh();
                    }}
                    onDelete={async () => {
                      await deleteGroup(props.assignmentId, group.id);
                      await groupsQuery.refresh();
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function GroupRow({
  group,
  onAddMember,
  onRemoveMember,
  onDelete,
}: {
  group: AssignmentGroup;
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [userId, setUserId] = useState("");
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {group.members?.length ?? 0}/{group.maxMembers} members
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(group.members ?? []).map((member) => (
          <span
            key={member.id}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
          >
            {member.user?.name ?? member.userId}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onRemoveMember(member.userId)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto]">
        <Input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="Learner user ID"
        />
        <Button
          disabled={!userId.trim()}
          onClick={async () => {
            if (!userId.trim()) return;
            await onAddMember(userId.trim());
            setUserId("");
          }}
        >
          Add member
        </Button>
      </div>
    </div>
  );
}
