import { IsBoolean, IsIn, IsInt, IsOptional, IsUrl } from 'class-validator';

// Mirrors apps/web/src/components/ui/social-icon.tsx's PLATFORM_ICONS keys —
// that component silently renders nothing for an unknown platform, so the
// admin must never be able to create a row it can't display. Not an
// invented restriction: it's the actual set of icons the site ships with.
export const SOCIAL_LINK_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'x',
  'twitter',
  'tiktok',
] as const;

export class CreateSocialLinkDto {
  @IsIn(SOCIAL_LINK_PLATFORMS)
  platform!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
