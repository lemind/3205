import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildHost(): {
  host: ArgumentsHost;
  response: { status: jest.Mock; json: jest.Mock };
} {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  it('passes an HttpException through unchanged (status + body)', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = buildHost();

    filter.catch(new NotFoundException('Job abc not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Job abc not found' }),
    );
  });

  it('converts an unexpected error into a generic 500, without leaking internals', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = buildHost();

    filter.catch(new Error('some internal secret detail'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
