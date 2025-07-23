export class OpenAIError extends Error {
  constructor(message = 'OpenAI request failed') {
    super(message);
    this.name = 'OpenAIError';           // makes stack traces/readouts clear
  }
}

export class GPTParseError extends Error {
  constructor(message = 'Model returned invalid JSON') {
    super(message);
    this.name = 'GPTParseError';
  }
}

export class QueueNotFoundError extends Error {
  constructor(id: string) {
    super(`Queue with id ${id} not found`);
    this.name = 'QueueNotFoundError';
  }
}
