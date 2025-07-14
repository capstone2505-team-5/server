// Types for the REST API

export interface Span {
  id: string;
  trace_id: string;
  project_name: string;
  input: string;
  output: string;
  start_time: string; // TIMESTAMPTZ
  end_time: string; // TIMESTAMPTZ
  context: Record<string, any>; // parsed JSONB object
  extracted_at: string; // timestamp - when extracted into spans_extracted table from phoenix spans
}

// Subject to change
export type Rating = 'good' | 'bad' | 'none';

export interface Annotation {
  id: string;
  spanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

export type NewAnnotation = Omit<Annotation, 'id' | 'categories'>

// Using utility types to derive from the main Annotation interface
export type CreateAnnotationRequest = Pick<Annotation, 'note' | 'spanId'> & {
  rating?: Rating;
};

export interface CategorizedSpan {
  spanId: string;
  categories: string[];
}

export interface CategoryWithId {
  id: string;
  text: string;
}

export interface CategorizedAnnotation {
  id: string;
  annotation_id: string;
  category_id: string;
}