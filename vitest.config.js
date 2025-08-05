"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup/testDb.ts'],
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        testTimeout: 10000,
        hookTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
            '@tests': path_1.default.resolve(__dirname, './tests'),
        }
    }
});
