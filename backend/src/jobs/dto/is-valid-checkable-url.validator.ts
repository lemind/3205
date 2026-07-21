import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import isURL from 'validator/lib/isURL';
import { normalizeUrl } from '../util/normalize-url';

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

function isValidUrlEntry(value: unknown): boolean {
  return typeof value === 'string' && isURL(normalizeUrl(value), URL_OPTIONS);
}

// Validates the whole array (not per-element via `each: true`) so the error message
// can name exactly which line(s) are wrong, matching the 1-per-line textarea the
// frontend actually shows the user — "urls must each be a valid URL" tells a user
// nothing about which of their 10 lines has the typo.
export function AllUrlsValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'allUrlsValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return Array.isArray(value) && value.every(isValidUrlEntry);
        },
        defaultMessage(args: ValidationArguments): string {
          const values = Array.isArray(args.value) ? args.value : [];
          const invalid = values
            .map((v: unknown, i: number) => ({ v, line: i + 1 }))
            .filter(({ v }) => !isValidUrlEntry(v));
          const list = invalid
            .map(({ v, line }) => `line ${line} ("${String(v)}")`)
            .join(', ');
          return `Not a valid URL: ${list}`;
        },
      },
    });
  };
}
