import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';

export class CreateJobDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  urls!: string[];
}
