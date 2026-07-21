import { Body, Controller, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  createJob(@Body() dto: CreateJobDto): { jobId: string } {
    return this.jobsService.createJob(dto);
  }
}
