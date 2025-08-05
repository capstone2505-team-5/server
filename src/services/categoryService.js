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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCategories = void 0;
const postgres_1 = require("../db/postgres");
const uuid_1 = require("uuid");
const addCategories = (categories) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const values = [];
        const placeholders = [];
        categories.forEach((cat, i) => {
            const index = i * 2;
            const id = (0, uuid_1.v4)();
            placeholders.push(`($${index + 1}, $${index + 2})`);
            values.push(id, cat);
        });
        const query = `
        INSERT INTO categories (id, text)
        VALUES ${placeholders.join(', ')}
        RETURNING id, text
    `;
        const result = yield postgres_1.pool.query(query, values);
        return result.rows;
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
exports.addCategories = addCategories;
