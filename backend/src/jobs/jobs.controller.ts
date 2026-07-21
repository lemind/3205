import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import type { JobDetailResponse } from './models/job';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  createJob(@Body() dto: CreateJobDto): { jobId: string } {
    return this.jobsService.createJob(dto);
  }

  @Get(':id')
  getJob(@Param('id') id: string): JobDetailResponse {
    return this.jobsService.getJob(id);
  }
}
