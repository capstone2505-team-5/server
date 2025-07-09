// Types for the REST API

export interface Trace {
  id: string;
  input: string;
  output: string;
}

// Subject to change
export type Rating = 'good' | 'bad' | 'none';

export interface Annotation {
  id: string;
  traceId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

// Using utility types to derive from the main Annotation interface
export type CreateAnnotationRequest = Pick<Annotation, 'note' | 'traceId'> & {
  rating?: Rating;
};