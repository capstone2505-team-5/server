"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePostgres = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const initializePostgres = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NULL,
        root_span_count INTEGER NOT NULL,
        last_cursor TEXT NULL
      );
      
      CREATE TABLE IF NOT EXISTS batches (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        formatted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS root_spans (
        id VARCHAR(50) PRIMARY KEY,
        trace_id VARCHAR(50) NOT NULL,
        batch_id VARCHAR(50) REFERENCES batches(id) ON DELETE SET NULL,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        project_id VARCHAR(50) REFERENCES projects(id) NOT NULL,
        span_name VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        formatted_input TEXT,
        formatted_output TEXT,
        formatting_status VARCHAR(20) DEFAULT 'pending',
        formatted_at TIMESTAMP
      );  

      CREATE TABLE IF NOT EXISTS annotations (
        id VARCHAR(50) PRIMARY KEY,
        root_span_id VARCHAR(50) REFERENCES root_spans(id) ON DELETE CASCADE,
        note TEXT,
        rating TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        text TEXT
      );

      CREATE TABLE IF NOT EXISTS annotation_categories (
        id VARCHAR(50) PRIMARY KEY,
        annotation_id VARCHAR(50) NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE
      );

    `);
    }
    catch (error) {
        console.error('PostgreSQL initialization error:', error);
        throw error;
    }
});
exports.initializePostgres = initializePostgres;
