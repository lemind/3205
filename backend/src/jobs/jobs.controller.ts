import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import type { JobDetailResponse, JobSummaryResponse } from './models/job';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  createJob(@Body() dto: CreateJobDto): { jobId: string } {
    return this.jobsService.createJob(dto);
  }

  @Get()
  listJobs(): JobSummaryResponse[] {
    return this.jobsService.listJobs();
  }

  @Get(':id')
  getJob(@Param('id') id: string): JobDetailResponse {
    return this.jobsService.getJob(id);
  }

  @Delete(':id')
  @HttpCode(204) // Nest's @Delete() defaults to 200; the contract promises 204 No Content
  cancelJob(@Param('id') id: string): void {
    this.jobsService.cancelJob(id);
  }
}
