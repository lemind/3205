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
}

export type TranslationKey = keyof Omit<Dictionary, 'status' | 'progressText' | 'countsText'>;

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
  },
};
