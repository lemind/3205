import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';
import { IsValidCheckableUrl } from './is-valid-checkable-url.validator';

export class CreateJobDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @IsValidCheckableUrl({ each: true })
  urls!: string[];
}
