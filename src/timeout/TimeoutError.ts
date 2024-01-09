export class TimeoutError implements Error {
  message: string;
  name: string;

  constructor(timeLimitInMs: number) {
    this.message = `Timeout of ${timeLimitInMs} ms exceeded`;
    this.name = 'TikoApiError';
  }
}
