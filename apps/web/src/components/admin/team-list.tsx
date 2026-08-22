"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { TeamForm } from "./team-form";
import {
  listTeamAdmin,
  deleteTeamMember,
  createTeamMember,
  updateTeamMember,
  type TeamMemberAdmin,
  type TeamMemberWriteInput,
} from "@/lib/api/team";

export function TeamList() {
  const [members, setMembers] = useState<TeamMemberAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMemberAdmin | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setLoading(true);
      setError(null);
      const response = await listTeamAdmin({ take: 100 });
      setMembers(response.items);
    } catch (err) {
      setError("Failed to load team members");
      console.error("Team members load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: TeamMemberWriteInput) {
    await createTeamMember(data);
    await loadMembers();
  }

  async function handleUpdate(data: TeamMemberWriteInput) {
    if (!editingMember) return;
    await updateTeamMember(editingMember.id, data);
    setEditingMember(null);
    await loadMembers();
  }

  async function handleDelete(member: TeamMemberAdmin) {
    await deleteTeamMember(member.id);
  }

  function handleEdit(member: TeamMemberAdmin) {
    setEditingMember(member);
  }

  function handleView(member: TeamMemberAdmin) {
    // Team members don't have public pages yet
  }

  async function handlePublish(member: TeamMemberAdmin, publish: boolean) {
    // Team members don't have publish state
  }

  return (
    <ContentList
      title="Team Members"
      description="Manage team, board, and advisory members"
      items={members}
      loading={loading}
      error={error}
      onLoad={loadMembers}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <TeamForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingMember ? (
          <TeamForm
            member={editingMember}
            onSubmit={handleUpdate}
            onCancel={() => setEditingMember(null)}
            submitLabel="Update Member"
          />
        ) : null
      }
      emptyTitle="No team members found"
      emptyDescription="Add your first team member to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "name",
          label: "Name",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.name}</p>
              <p className="text-xs text-stone-500">{row.kind}</p>
            </div>
          ),
        },
        {
          key: "title",
          label: "Title",
          render: (value) => <p className="text-sm text-stone-600">{String(value ?? "")}</p>,
        },
        {
          key: "bio",
          label: "Bio",
          render: (value) => (
            <p className="max-w-xs truncate text-sm text-stone-600">{String(value ?? "")}</p>
          ),
        },
        {
          key: "createdAt",
          label: "Created",
          render: (value) => (
            <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
          ),
        },
      ]}
    />
  );
}
