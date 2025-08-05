import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import {
  addSSEConnection,
  sendSSEUpdate,
  closeSSEConnection,
  removeSSEConnection
} from '../../src/services/sseService';

// Mock console methods to avoid cluttering test output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('SSEService', () => {
  let mockResponse: Partial<express.Response>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a fresh mock response for each test
    mockResponse = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      destroyed: false,
      writable: true
    };
  });

  describe('addSSEConnection', () => {
    it('should set proper SSE headers and send initial connection message', () => {
      const batchId = 'test-batch-1';
      
      const result = addSSEConnection(batchId, mockResponse as express.Response);
      
      // Verify headers are set correctly
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      
      // Verify initial message is sent
      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ 
          status: 'connected', 
          message: 'Connected to batch formatting updates' 
        })}\n\n`
      );
      
      // Verify console log
      expect(mockConsoleLog).toHaveBeenCalledWith(`SSE connection opened for batch ${batchId}`);
      
      // Verify the response is returned
      expect(result).toBe(mockResponse);
    });

    it('should store the connection for the batch ID', () => {
      const batchId = 'test-batch-2';
      
      addSSEConnection(batchId, mockResponse as express.Response);
      
      // Test that the connection is stored by trying to send an update
      const testData = { test: 'data' };
      sendSSEUpdate(batchId, testData);
      
      // Should be able to write to the stored connection
      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(testData)}\n\n`
      );
    });
  });

  describe('sendSSEUpdate', () => {
    it('should send formatted SSE message to existing connection', () => {
      const batchId = 'test-batch-3';
      const testData = { status: 'processing', progress: 50 };
      
      // First add a connection
      addSSEConnection(batchId, mockResponse as express.Response);
      vi.clearAllMocks(); // Clear the mocks from addSSEConnection
      
      // Send an update
      sendSSEUpdate(batchId, testData);
      
      // Verify the message is formatted correctly and sent
      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(testData)}\n\n`
      );
      
      // Verify console log
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `SSE update sent to batch ${batchId}:`, 
        testData
      );
    });

    it('should do nothing when connection does not exist', () => {
      const batchId = 'nonexistent-batch';
      const testData = { test: 'data' };
      
      // Try to send update to non-existent connection
      sendSSEUpdate(batchId, testData);
      
      // Should not attempt to write anything
      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should handle write errors and remove connection', () => {
      const batchId = 'test-batch-4';
      const testData = { test: 'data' };
      
      // Add connection first
      addSSEConnection(batchId, mockResponse as express.Response);
      
      // Now set up write to throw an error for subsequent calls
      mockResponse.write = vi.fn().mockImplementation(() => {
        throw new Error('Connection broken');
      });
      
      vi.clearAllMocks();
      
      // Send update (should handle error)
      sendSSEUpdate(batchId, testData);
      
      // Verify error was logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        `Failed to send SSE update to batch ${batchId}:`,
        expect.any(Error)
      );
      
      // Verify connection was removed by trying to send another update
      sendSSEUpdate(batchId, { another: 'test' });
      expect(mockResponse.write).toHaveBeenCalledTimes(1); // Only the failed call
    });
  });

  describe('closeSSEConnection', () => {
    it('should close writable connection and remove from storage', () => {
      const batchId = 'test-batch-5';
      
      // Add connection
      addSSEConnection(batchId, mockResponse as express.Response);
      vi.clearAllMocks();
      
      // Close connection
      closeSSEConnection(batchId);
      
      // Verify connection.end() was called
      expect(mockResponse.end).toHaveBeenCalled();
      
      // Verify console log
      expect(mockConsoleLog).toHaveBeenCalledWith(`SSE connection closed for batch ${batchId}`);
      
      // Verify connection was removed by trying to send an update
      sendSSEUpdate(batchId, { test: 'data' });
      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it('should handle already destroyed connection', () => {
      const batchId = 'test-batch-6';
      
      // Create a new mock response with destroyed properties
      const destroyedMockResponse: Partial<express.Response> = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        destroyed: true,
        writable: false
      };
      
      // Add connection
      addSSEConnection(batchId, destroyedMockResponse as express.Response);
      vi.clearAllMocks();
      
      // Close connection
      closeSSEConnection(batchId);
      
      // Should not call end() on destroyed connection
      expect(destroyedMockResponse.end).not.toHaveBeenCalled();
      
      // Should log appropriate message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `SSE connection already closed by client for batch ${batchId}`
      );
    });

    it('should handle connection end errors gracefully', () => {
      const batchId = 'test-batch-7';
      
      // Set up end() to throw an error
      mockResponse.end = vi.fn().mockImplementation(() => {
        throw new Error('Connection already closed');
      });
      
      // Add connection
      addSSEConnection(batchId, mockResponse as express.Response);
      vi.clearAllMocks();
      
      // Close connection (should handle error gracefully)
      closeSSEConnection(batchId);
      
      // Should log cleanup message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `SSE connection cleanup for batch ${batchId} (client already disconnected)`
      );
      
      // Connection should still be removed
      sendSSEUpdate(batchId, { test: 'data' });
      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it('should do nothing when connection does not exist', () => {
      const batchId = 'nonexistent-batch';
      
      // Try to close non-existent connection
      closeSSEConnection(batchId);
      
      // Should not attempt any operations
      expect(mockResponse.end).not.toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('removeSSEConnection', () => {
    it('should remove connection from storage without closing it', () => {
      const batchId = 'test-batch-8';
      
      // Add connection
      addSSEConnection(batchId, mockResponse as express.Response);
      vi.clearAllMocks();
      
      // Remove connection
      removeSSEConnection(batchId);
      
      // Should not call end() - just remove from storage
      expect(mockResponse.end).not.toHaveBeenCalled();
      
      // Verify console log
      expect(mockConsoleLog).toHaveBeenCalledWith(`SSE connection removed for batch ${batchId}`);
      
      // Verify connection was removed
      sendSSEUpdate(batchId, { test: 'data' });
      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it('should handle removing non-existent connection', () => {
      const batchId = 'nonexistent-batch';
      
      // Remove non-existent connection
      removeSSEConnection(batchId);
      
      // Should still log the removal attempt
      expect(mockConsoleLog).toHaveBeenCalledWith(`SSE connection removed for batch ${batchId}`);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple connections for different batches', () => {
      const batchId1 = 'batch-1';
      const batchId2 = 'batch-2';
      const mockResponse2: Partial<express.Response> = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        destroyed: false,
        writable: true
      };
      
      // Add two connections
      addSSEConnection(batchId1, mockResponse as express.Response);
      addSSEConnection(batchId2, mockResponse2 as express.Response);
      vi.clearAllMocks();
      
      // Send updates to both
      sendSSEUpdate(batchId1, { batch: 1 });
      sendSSEUpdate(batchId2, { batch: 2 });
      
      // Verify each connection received its update
      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ batch: 1 })}\n\n`
      );
      expect(mockResponse2.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ batch: 2 })}\n\n`
      );
      
      // Close one connection
      closeSSEConnection(batchId1);
      
      // Other connection should still work
      sendSSEUpdate(batchId2, { still: 'working' });
      expect(mockResponse2.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ still: 'working' })}\n\n`
      );
    });
  });
});
