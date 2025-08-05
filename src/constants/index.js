"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMAT_BATCH_CHUNK_SIZE = exports.FORMAT_BATCH_TIMEOUT_LIMIT = exports.MAX_SPANS_PER_BATCH = exports.MAX_SPANS_PER_PAGE = exports.DEFAULT_PAGE_QUANTITY = exports.FIRST_PAGE = void 0;
exports.FIRST_PAGE = 1;
exports.DEFAULT_PAGE_QUANTITY = 20;
exports.MAX_SPANS_PER_PAGE = 2500;
exports.MAX_SPANS_PER_BATCH = 150;
// Limit is in milliseconds
// Time limit for each LLM call
exports.FORMAT_BATCH_TIMEOUT_LIMIT = 120000;
// Number of spans per LLM call
exports.FORMAT_BATCH_CHUNK_SIZE = 10;
