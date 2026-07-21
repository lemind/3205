import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { UrlCheckerService } from './url-checker.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, UrlCheckerService],
})
export class JobsModule {}
