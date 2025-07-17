// Types for the REST API

export interface Trace {
  id: string;
  input: string;
  output: string;
}

// Subject to change
export type Rating = 'good' | 'bad';

export interface Annotation {
  id: string;
  rootSpanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

export type NewAnnotation = Omit<Annotation, 'id' | 'categories'>

// Using utility types to derive from the main Annotation interface
export type CreateAnnotationRequest = Pick<Annotation, 'note' | 'rootSpanId'> & {
  rating?: Rating;
};

export interface CategorizedRootSpan{
  rootSpanId: string;
  categories: string[];
}

export interface Category {
  id: string;
  text: string;
}

export interface CategorizedAnnotation {
  id: string;
  annotation_id: string;
  category_id: string;
}

export interface RootSpan {
  id: string;
  traceId: string;
  startTime: string;      // or Date
  endTime: string;        // or Date
  input: string;
  output: string;
  projectName: string;
  spanName: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}