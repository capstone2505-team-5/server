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
exports.getProjectSummaries = void 0;
const postgres_1 = require("../db/postgres");
const getProjectSummaries = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Query 1: Get basic project data
        const projectQuery = `
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `;
        // Query 2: Get counts for all projects in one query
        const countsQuery = `
      SELECT 
        p.id,
        COALESCE(rs_counts.span_count, 0) AS valid_root_span_count,
        COALESCE(b_counts.batch_count, 0) AS num_batches
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) as span_count
        FROM root_spans
        GROUP BY project_id
      ) rs_counts ON rs_counts.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as batch_count  
        FROM batches
        GROUP BY project_id
      ) b_counts ON b_counts.project_id = p.id
    `;
        // Execute both queries in parallel
        const [projectResult, countsResult] = yield Promise.all([
            postgres_1.pool.query(projectQuery),
            postgres_1.pool.query(countsQuery)
        ]);
        // Create a map for quick lookup of counts
        const countsMap = new Map(countsResult.rows.map(row => [
            row.id,
            {
                validRootSpanCount: parseInt(row.valid_root_span_count, 10),
                numBatches: parseInt(row.num_batches, 10)
            }
        ]));
        // Combine the results
        return projectResult.rows.map(row => {
            var _a, _b;
            return ({
                id: row.id,
                name: row.name,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                validRootSpanCount: ((_a = countsMap.get(row.id)) === null || _a === void 0 ? void 0 : _a.validRootSpanCount) || 0,
                numBatches: ((_b = countsMap.get(row.id)) === null || _b === void 0 ? void 0 : _b.numBatches) || 0,
            });
        });
    }
    catch (e) {
        if (e instanceof Error) {
            console.error('getProjectSummaries error:', e.message);
        }
        else {
            console.error('Unknown error in getProjectSummaries:', e);
        }
        throw new Error('Failed to load project summaries from the database.');
    }
});
exports.getProjectSummaries = getProjectSummaries;
