import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { AuthModule } from '../../identity/auth/auth.module';
import { MediaModule } from '../../media/media.module';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [DownloadsController],
  providers: [DownloadsService],
})
export class DownloadsModule {}
