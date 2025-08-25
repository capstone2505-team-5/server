import { z } from 'zod';
import { MAX_SPANS_PER_BATCH } from '../constants/index';

export const getBatchesByProjectSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: 'Project ID is required in the URL path.',
      }).min(1, { message: 'Project ID cannot be empty.' }),
    }),
  });

  export const createBatchSchema = z.object({
    body: z.object({
      name: z.string().min(1),
      projectId: z.string().min(1),
      rootSpanIds: z.array(z.string().min(1)).min(1).max(MAX_SPANS_PER_BATCH),
    })
  })

  // Type for the entire validated request object from Zod
  export type CreateBatchRequestInput = z.infer<typeof createBatchSchema>;

  // Type for just the body of the request - this is the contract for our service
  export type CreateBatchBodyInput = z.infer<typeof createBatchSchema.shape.body>;

export const getBatchSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Batch ID is required' }),
  }),
  query: z.object({
    spanName: z.string().optional(),
    pageNumber: z.string().optional(),
    numPerPage: z.string().optional(),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Batch ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Batch name is required' }),
    rootSpanIds: z
      .array(z.string().min(1))
      .min(1, { message: 'At least one rootSpanId is required' })
      .max(MAX_SPANS_PER_BATCH),
  }),
});

export type UpdateBatchBodyInput = z.infer<typeof updateBatchSchema.shape.body>;

export const deleteBatchSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Batch ID is required' }),
  }),
});

export const removeSpanFromBatchSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, { message: 'Batch ID is required' }),
    spanId: z.string().min(1, { message: 'Span ID is required' }),
  }),
});

export const formatBatchByLLMSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, { message: 'Batch ID is required' }),
  }),
});

export const getBatchStatusSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, { message: 'Batch ID is required' }),
  }),
});