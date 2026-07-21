export type Lang = 'en' | 'ru';

export type StatusKey =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'success'
  | 'error';

interface Dictionary {
  appTitle: string;
  jobsHeading: string;
  urlsLabel: string;
  runCheck: string;
  running: string;
  createJobError: string;
  cancelJob: string;
  cancelling: string;
  cancelJobError: string;
  loadJobsError: string;
  noJobsYet: string;
  loadJobError: string;
  colCreated: string;
  colStatus: string;
  colUrls: string;
  colUrl: string;
  colHttp: string;
  colError: string;
  status: Record<StatusKey, string>;
  progressText: (processed: number, total: number) => string;
  countsText: (
    urlCount: number,
    successCount: number,
    errorCount: number,
    cancelledCount: number,
  ) => string;
  // Translates the small, fixed vocabulary of per-URL check errors the backend
  // emits (url-checker.service.ts deliberately emits one of a few fixed messages,
  // not raw system/network error text — see its comment). Anything that doesn't
  // match a known shape (e.g. "HTTP 404") is returned unchanged.
  checkErrorMessage: (raw: string) => string;
}

export type TranslationKey = keyof Omit<
  Dictionary,
  'status' | 'progressText' | 'countsText' | 'checkErrorMessage'
>;

const TIMEOUT_PATTERN = /^Request timed out after (\d+)ms$/;

export const translations: Record<Lang, Dictionary> = {
  en: {
    appTitle: 'Async URL Status Checker',
    jobsHeading: '// jobs',
    urlsLabel: 'URLs to check (one per line)',
    runCheck: 'Run Check',
    running: 'Running…',
    createJobError: 'Failed to create job.',
    cancelJob: 'Cancel Job',
    cancelling: 'Cancelling…',
    cancelJobError: 'Failed to cancel job.',
    loadJobsError: 'Failed to load jobs.',
    noJobsYet: '// no jobs yet',
    loadJobError: 'Failed to load job.',
    colCreated: 'Created',
    colStatus: 'Status',
    colUrls: 'URLs',
    colUrl: 'URL',
    colHttp: 'HTTP',
    colError: 'Error',
    status: {
      pending: 'pending',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
      failed: 'failed',
      success: 'success',
      error: 'error',
    },
    progressText: (processed, total) => `${processed} of ${total} processed`,
    countsText: (urlCount, successCount, errorCount, cancelledCount) =>
      `${urlCount} total · ${successCount} ok · ${errorCount} err` +
      (cancelledCount > 0 ? ` · ${cancelledCount} cancelled` : ''),
    checkErrorMessage: (raw) => {
      if (raw === 'Network error') return 'Network error';
      if (raw === 'Unknown error') return 'Unknown error';
      return raw;
    },
  },
  ru: {
    appTitle: 'Асинхронная проверка URL',
    jobsHeading: '// задачи',
    urlsLabel: 'URL для проверки (по одному на строку)',
    runCheck: 'Запустить проверку',
    running: 'Выполняется…',
    createJobError: 'Не удалось создать задачу.',
    cancelJob: 'Отменить задачу',
    cancelling: 'Отмена…',
    cancelJobError: 'Не удалось отменить задачу.',
    loadJobsError: 'Не удалось загрузить список задач.',
    noJobsYet: '// пока нет задач',
    loadJobError: 'Не удалось загрузить задачу.',
    colCreated: 'Создано',
    colStatus: 'Статус',
    colUrls: 'URL',
    colUrl: 'URL',
    colHttp: 'HTTP',
    colError: 'Ошибка',
    status: {
      pending: 'ожидание',
      in_progress: 'выполняется',
      completed: 'завершено',
      cancelled: 'отменено',
      failed: 'ошибка',
      success: 'успех',
      error: 'ошибка',
    },
    progressText: (processed, total) => `обработано ${processed} из ${total}`,
    countsText: (urlCount, successCount, errorCount, cancelledCount) =>
      `всего ${urlCount} · успешно ${successCount} · ошибок ${errorCount}` +
      (cancelledCount > 0 ? ` · отменено ${cancelledCount}` : ''),
    checkErrorMessage: (raw) => {
      const timeoutMatch = TIMEOUT_PATTERN.exec(raw);
      if (timeoutMatch) return `Превышено время ожидания (${timeoutMatch[1]} мс)`;
      if (raw === 'Network error') return 'Сетевая ошибка';
      if (raw === 'Unknown error') return 'Неизвестная ошибка';
      return raw;
    },
  },
};
