import { z } from 'zod';

export const GetBatchesByProjectSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: 'Project ID is required in the URL path.',
      }).min(1, { message: 'Project ID cannot be empty.' }),
    }),
  });