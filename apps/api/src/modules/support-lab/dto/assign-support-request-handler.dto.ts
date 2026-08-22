import { Matches, ValidateIf } from 'class-validator';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class AssignSupportRequestHandlerDto {
  // null is a real, meaningful value here (unassign) — not "omitted" — so
  // this validates the CUID shape only when a real id is supplied and lets
  // null pass through untouched.
  @ValidateIf((dto: AssignSupportRequestHandlerDto) => dto.handledById !== null)
  @Matches(CUID_PATTERN)
  handledById!: string | null;
}
