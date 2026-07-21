import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobDto } from './create-job.dto';

async function validateUrls(urls: unknown) {
  const dto = plainToInstance(CreateJobDto, { urls });
  return validate(dto);
}

describe('CreateJobDto', () => {
  it('accepts well-formed URLs with a protocol', async () => {
    const errors = await validateUrls([
      'https://example.com',
      'http://example.org',
    ]);
    expect(errors).toHaveLength(0);
  });

  it('accepts bare domains (normalized before the check, per normalizeUrl)', async () => {
    const errors = await validateUrls(['google.com', '//example.com']);
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed URL (typo with no valid TLD/host)', async () => {
    const errors = await validateUrls(['https://dfgdfg;']);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isValidCheckableUrl');
  });

  it('rejects the whole request if any single entry is malformed', async () => {
    const errors = await validateUrls(['https://example.com', 'not a url']);
    expect(errors).toHaveLength(1);
  });
});
