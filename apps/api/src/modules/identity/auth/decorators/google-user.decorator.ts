import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { GoogleProfile } from '../strategies/google.strategy';

// Passport sets request.user to whatever GoogleStrategy#validate() returns
// during the OAuth callback — a GoogleProfile, not our own AuthenticatedUser
// shape (that only exists once JwtAuthGuard has run). Isolating the cast
// here keeps it out of the controller.
export const GoogleUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GoogleProfile => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as unknown as GoogleProfile;
  },
);
