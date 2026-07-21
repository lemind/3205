import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';
import { AllUrlsValid } from './is-valid-checkable-url.validator';

export class CreateJobDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @AllUrlsValid()
  urls!: string[];
}
