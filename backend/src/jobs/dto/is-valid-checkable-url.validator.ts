import { registerDecorator, ValidationOptions } from 'class-validator';
import isURL from 'validator/lib/isURL';
import { normalizeUrl } from '../util/normalize-url';

// Runs on the raw (pre-normalization) input — normalizes internally just for the
// check, without mutating the DTO — so bare domains ("google.com") still pass
// while typos that no fetch() would ever reach ("dfgdfg;") are rejected up front,
// instead of wasting a check slot only to fail as a DNS/parse error later.
export function IsValidCheckableUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCheckableUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' &&
            isURL(normalizeUrl(value), {
              protocols: ['http', 'https'],
              require_protocol: true,
            })
          );
        },
        defaultMessage(): string {
          return `each value in $property must be a valid URL`;
        },
      },
    });
  };
}
