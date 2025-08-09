import { z } from 'zod';

const ratingEnum = z.enum(['good', 'bad']);

export const getAnnotationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Annotation ID is required'),
  }),
});

export const createAnnotationSchema = z.object({
  body: z.object({
    rootSpanId: z.string().min(1, 'rootSpanId is required'),
    note: z.string().optional(), // Note is optional on 'good' ratings
    rating: ratingEnum,
  }),
});

export const updateAnnotationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Annotation ID is required'),
  }),
  body: z.object({
    note: z.string().optional(),
    rating: ratingEnum.optional(),
  }),
});

export const deleteAnnotationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Annotation ID is required'),
  }),
});

export const categorizeAnnotationsSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
  }),
});

// Inferred types for service layer
export type CreateAnnotationBodyInput = z.infer<
  typeof createAnnotationSchema
>['body'];
export type UpdateAnnotationBodyInput = z.infer<
  typeof updateAnnotationSchema
>['body'];
