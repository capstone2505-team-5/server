"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSSEConnection = exports.closeSSEConnection = exports.sendSSEUpdate = exports.addSSEConnection = void 0;
// Store active SSE connections
const sseConnections = new Map();
const addSSEConnection = (batchId, res) => {
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        status: 'connected',
        message: 'Connected to batch formatting updates'
    })}\n\n`);
    // Store this connection
    sseConnections.set(batchId, res);
    console.log(`SSE connection opened for batch ${batchId}`);
    return res;
};
exports.addSSEConnection = addSSEConnection;
const sendSSEUpdate = (batchId, data) => {
    const connection = sseConnections.get(batchId);
    if (connection) {
        try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            connection.write(message);
            console.log(`SSE update sent to batch ${batchId}:`, data);
        }
        catch (error) {
            console.error(`Failed to send SSE update to batch ${batchId}:`, error);
            sseConnections.delete(batchId);
        }
    }
};
exports.sendSSEUpdate = sendSSEUpdate;
const closeSSEConnection = (batchId) => {
    const connection = sseConnections.get(batchId);
    if (connection) {
        connection.end();
        sseConnections.delete(batchId);
        console.log(`SSE connection closed for batch ${batchId}`);
    }
};
exports.closeSSEConnection = closeSSEConnection;
const removeSSEConnection = (batchId) => {
    sseConnections.delete(batchId);
    console.log(`SSE connection removed for batch ${batchId}`);
};
exports.removeSSEConnection = removeSSEConnection;
