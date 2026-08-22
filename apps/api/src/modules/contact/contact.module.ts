import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { AuthModule } from '../identity/auth/auth.module';
import { TurnstileModule } from '../security/turnstile/turnstile.module';

@Module({
  imports: [AuthModule, TurnstileModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
