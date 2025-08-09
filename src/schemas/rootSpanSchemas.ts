import { z } from 'zod';

// GET /rootSpans (query-only)
export const getRootSpansSchema = z.object({
  query: z.object({
    projectId: z.string().optional(),
    batchId: z.string().optional(),
    spanName: z.string().optional(),
    pageNumber: z.string().optional(),
    numPerPage: z.string().optional(),
    searchText: z.string().optional(),
    dateFilter: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// GET /rootSpans/:id
export const getRootSpanSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'rootSpan id is required' }),
  }),
});

// GET /batches/edit (query-only)
export const getEditBatchSpansSchema = z.object({
  query: z.object({
    batchId: z.string().min(1, { message: 'batchId is required' }),
    spanName: z.string().optional(),
    pageNumber: z.string().optional(),
    numPerPage: z.string().optional(),
    searchText: z.string().optional(),
    dateFilter: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// GET /projects/:projectId/spanNames
export const getUniqueSpanNamesSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, { message: 'projectId is required' }),
  }),
});

// GET /projects/:projectId/randomSpans
export const getRandomSpansSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, { message: 'projectId is required' }),
  }),
});
