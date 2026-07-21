import { describe, it, expect } from 'vitest';
import { translations } from './translations';

describe('checkErrorMessage', () => {
  it('en: passes through the fixed known messages unchanged', () => {
    const { checkErrorMessage } = translations.en;
    expect(checkErrorMessage('Network error')).toBe('Network error');
    expect(checkErrorMessage('Unknown error')).toBe('Unknown error');
    expect(checkErrorMessage('Request timed out after 5000ms')).toBe(
      'Request timed out after 5000ms',
    );
  });

  it('ru: translates the fixed known messages', () => {
    const { checkErrorMessage } = translations.ru;
    expect(checkErrorMessage('Network error')).toBe('Сетевая ошибка');
    expect(checkErrorMessage('Unknown error')).toBe('Неизвестная ошибка');
    expect(checkErrorMessage('Request timed out after 5000ms')).toBe(
      'Превышено время ожидания (5000 мс)',
    );
  });

  it('ru: leaves an unrecognized message unchanged (e.g. an HTTP-status-derived one)', () => {
    expect(translations.ru.checkErrorMessage('HTTP 404')).toBe('HTTP 404');
  });
});
