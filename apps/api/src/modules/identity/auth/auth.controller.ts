import { Throttle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaLoginVerifyDto } from './dto/mfa-login-verify.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaPendingGuard } from './guards/mfa-pending.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleUser } from './decorators/google-user.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { GoogleProfile } from './strategies/google.strategy';
import type { AuthenticatedUser } from './guards/jwt-auth.guard';
import { COOKIE_NAMES } from './auth.constants';
import {
  AUTH_ATTEMPT_THROTTLE,
  PASSWORD_RESET_THROTTLE,
} from '../../security/throttle.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    // Lets the frontend decide whether to render the Google sign-in button
    // at all — showing it when unconfigured would be a dead control
    // leading to a 503, which the engineering instruction's "no fake
    // functionality" rule forbids.
    return {
      googleEnabled: Boolean(
        this.config.get('GOOGLE_OAUTH_CLIENT_ID') &&
        this.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      ),
    };
  }

  @Post('login')
  @Throttle(AUTH_ATTEMPT_THROTTLE)
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto.email, dto.password, res, req.ip);
  }

  @Post('mfa/login-verify')
  @Throttle(AUTH_ATTEMPT_THROTTLE)
  @HttpCode(200)
  @UseGuards(MfaPendingGuard)
  async mfaLoginVerify(
    @Body() dto: MfaLoginVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.completeMfaLogin(
      req.mfaPendingUserId!,
      dto.code,
      res,
      req.ip,
    );
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: unknown = req.cookies?.[COOKIE_NAMES.REFRESH];
    if (typeof token !== 'string' || !token) {
      res.status(401);
      return { message: 'Not authenticated' };
    }
    await this.auth.refresh(token, res);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined;
    await this.auth.logout(token, res, req.ip);
    return { success: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query() query: VerifyEmailDto) {
    await this.auth.verifyEmail(query.token);
    return { success: true };
  }

  @Post('request-password-reset')
  @Throttle(PASSWORD_RESET_THROTTLE)
  @HttpCode(200)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.auth.requestPasswordReset(dto.email);
    // Always the same response, whether or not the email matched an
    // account — see AuthService.requestPasswordReset for why.
    return { success: true };
  }

  @Post('reset-password')
  @Throttle(AUTH_ATTEMPT_THROTTLE)
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      res,
      req.ip,
    );
    return { success: true };
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin() {
    // GoogleOAuthGuard performs the redirect to Google's consent screen;
    // this handler body only runs if that guard lets the request through
    // without redirecting, which the OAuth flow never does at this step.
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthCallbackGuard)
  async googleCallback(
    @GoogleUser() profile: GoogleProfile,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appBaseUrl =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    try {
      const { mfaRequired } = await this.auth.loginWithGoogle(
        profile,
        res,
        req.ip,
      );
      res.redirect(
        `${appBaseUrl}/admin/${mfaRequired ? 'mfa-verify' : 'dashboard'}`,
      );
    } catch {
      res.redirect(
        `${appBaseUrl}/admin/login?error=google_account_not_provisioned`,
      );
    }
  }
}
