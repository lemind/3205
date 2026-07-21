import { Injectable } from '@nestjs/common';
import { Job } from './models/job';

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, Job>();
}
