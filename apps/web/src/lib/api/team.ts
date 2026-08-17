import { apiClient } from "../api-client";

export type TeamMemberKind = "TEAM" | "BOARD" | "ADVISORY";

export interface TeamMember {
  id: string;
  kind: TeamMemberKind;
  name: string;
  title: string;
  bio: string | null;
}

export function listTeam(kind?: TeamMemberKind): Promise<TeamMember[]> {
  return apiClient.get<TeamMember[]>(`/team${kind ? `?kind=${kind}` : ""}`);
}
