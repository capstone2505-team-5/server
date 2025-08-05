"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToBatchEvents = void 0;
const sseService_1 = require("../services/sseService");
const connectToBatchEvents = (req, res) => {
    const batchId = req.params.id;
    if (!batchId) {
        res.status(400).json({ error: 'Batch ID required' });
        return;
    }
    try {
        // Add the SSE connection
        (0, sseService_1.addSSEConnection)(batchId, res);
        // Handle client disconnect
        req.on('close', () => {
            console.log(`Client disconnected from batch ${batchId} SSE`);
            (0, sseService_1.removeSSEConnection)(batchId);
        });
        req.on('error', (error) => {
            console.error(`SSE error for batch ${batchId}:`, error);
            (0, sseService_1.removeSSEConnection)(batchId);
        });
    }
    catch (error) {
        console.error(`Failed to establish SSE connection for batch ${batchId}:`, error);
        res.status(500).json({ error: 'Failed to establish connection' });
    }
};
exports.connectToBatchEvents = connectToBatchEvents;
