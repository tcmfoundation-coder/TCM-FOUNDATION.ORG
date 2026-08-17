import type { TeamMember } from "@/lib/api/team";

export function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="aspect-square bg-stone-100" />
      <p className="font-medium text-stone-900">{member.name}</p>
      <p className="text-sm text-stone-500">{member.title}</p>
      {member.bio && <p className="text-sm text-stone-600">{member.bio}</p>}
    </div>
  );
}
