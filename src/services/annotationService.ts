import { mockAnnotations } from '../db/mockData';
import type { Annotation } from '../types/types';

export const getAllAnnotations = (): Annotation[] => {
  return mockAnnotations;
};