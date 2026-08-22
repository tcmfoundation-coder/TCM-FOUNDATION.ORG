import Image from "next/image";
import { User } from "lucide-react";
import type { TeamMember } from "@/lib/api/team";

export function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-stone-100">
        {member.photo ? (
          <Image
            src={member.photo.secureUrl}
            alt={member.photo.altText}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User aria-hidden="true" className="size-10 text-stone-300" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-stone-900">{member.name}</p>
        <p className="text-sm text-stone-500">{member.title}</p>
        {member.bio && <p className="line-clamp-3 text-sm leading-relaxed text-stone-600">{member.bio}</p>}
      </div>
    </div>
  );
}
