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
  startTime: string | null; 
  batchId: string | null;     // or Date
  endTime: string | null;        // or Date
  input: string;
  output: string;
  projectId: string;
  spanName: string | null;
}

export interface AnnotatedRootSpan {
  id: string;
  traceId: string;
  batchId: string | null;  
  input: string;
  output: string;
  projectId: string;
  spanName: string;
  startTime: string;
  endTime: string;        // or Date
  createdAt: string;
  annotation: Omit<Annotation, 'rootSpanId'> | null;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rootSpanCount: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rootSpanCount: number;
  numBatches: number;
}

export interface GraphQLResponse {
  data?: {
    projects?: {
      edges?: Array<{
        node?: {
          name?: string;
          spans?: {
            edges?: Array<{
              node?: {
                context?: { spanId: string; traceId: string };
                input?: { value: string };
                output?: { value: string };
                startTime?: string;
                endTime?: string;
                name?: string;
                spanKind?: string;
              };
            }>;
          };
        };
      }>;
    };
  };
}

export interface ProjectEdge {
  node?: {
    name?: string;
    spans?: {
      edges?: SpanEdge[];
    };
  };
}

export interface SpanEdge {
  node?: {
    context?: {
      spanId: string;
      traceId: string;
    };
    input?: {
      value: string;
    };
    output?: {
      value: string;
    };
    startTime?: string;
    endTime?: string;
    name?: string;
    spanKind?: string;
  };
}

export interface BatchSummary {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  spanCount: number;
  percentAnnotated: number;
  percentGood: number;
  categories: string[];
}

export interface BatchDetail {
  id: string;
  projectId: string;
  name: string;
  rootSpanIds: string[];
}

export interface NewBatch {
  name: string;
  projectId: string;
  rootSpanIds: string[];
}

export interface UpdateBatch {
  name: string;
  rootSpanIds: string[];
}