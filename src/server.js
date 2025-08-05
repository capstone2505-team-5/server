"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config/config"));
const postgres_1 = require("./db/postgres");
const postgres_2 = require("./db/postgres");
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, postgres_1.initializePostgres)();
        if (process.env.NODE_ENV === "development") {
            try {
                const response = yield fetch('http://localhost:8080/fetchAllProjects');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                }
                console.log("Successfully fetched root spans");
            }
            catch (err) {
                console.error(err);
                console.log('Error fetching root spans');
            }
        }
        app_1.default.listen(config_1.default.port, () => {
            console.log(`Server running on port ${config_1.default.port}`);
        });
    });
}
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGINT received. Closing DB pool...');
    yield postgres_2.pool.end();
    console.log('DB pool closed. Exiting process.');
    process.exit(0);
}));
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGTERM received. Closing DB pool...');
    yield postgres_2.pool.end();
    console.log('DB pool closed. Exiting process.');
    process.exit(0);
}));
