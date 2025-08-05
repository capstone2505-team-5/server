"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
const openai_1 = __importDefault(require("openai"));
require("dotenv/config"); // loads .env automatically
// One singleton client for the whole server
exports.openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY, // you can omit this; env var is default
});
