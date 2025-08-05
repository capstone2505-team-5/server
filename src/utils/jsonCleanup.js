"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonCleanup = void 0;
const jsonCleanup = (rawOutput) => {
    return rawOutput
        .replace(/```json\s*([\s\S]*?)```/i, '$1')
        .replace(/```([\s\S]*?)```/i, '$1')
        .trim();
};
exports.jsonCleanup = jsonCleanup;
