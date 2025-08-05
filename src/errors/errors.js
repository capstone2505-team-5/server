"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchNotFoundError = exports.GPTParseError = exports.OpenAIError = void 0;
class OpenAIError extends Error {
    constructor(message = 'OpenAI request failed') {
        super(message);
        this.name = 'OpenAIError'; // makes stack traces/readouts clear
    }
}
exports.OpenAIError = OpenAIError;
class GPTParseError extends Error {
    constructor(message = 'Model returned invalid JSON') {
        super(message);
        this.name = 'GPTParseError';
    }
}
exports.GPTParseError = GPTParseError;
class BatchNotFoundError extends Error {
    constructor(id) {
        super(`Batch with id ${id} not found`);
        this.name = 'BatchNotFoundError';
    }
}
exports.BatchNotFoundError = BatchNotFoundError;
