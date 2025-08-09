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

export type RawRootSpanRow = {
  root_span_id: string;
  trace_id: string;
  batch_id: string | null;
  input: string;
  output: string;
  project_id: string;
  span_name: string;
  start_time: string;
  end_time: string;
  created_at: string;
  formatted_input?: string;
  formatted_output?: string;
  formatted_at: string | null;
  annotation_id: string | null;
  note: string | null;
  rating: Rating | null;
  categories: string[];
};

export type RootSpanQueryParams = {
  batchId: string | undefined;
  projectId: string | undefined;
  spanName: string | undefined;
  pageNumber: string | undefined;
  numberPerPage: string | undefined;
  searchText?: string | undefined;
  dateFilter?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export interface AnnotatedRootSpan {
  id: string;
  traceId: string;
  batchId: string | null;  
  input: string;
  output: string;
  projectId: string;
  spanName: string;
  startTime: string;
  endTime: string;        
  createdAt: string;
  formattedAt?: string | null;
  annotation: Omit<Annotation, 'rootSpanId'> | null;
}

export type FormattedRootSpan = AnnotatedRootSpan & {
  formattedInput: string | undefined;
  formattedOutput: string | undefined;
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
  validRootSpanCount: number;
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
  validRootSpanCount: number;
  percentAnnotated: number | null;
  percentGood: number | null;
  categories: Record<string, number>;
  formattedAt: string | null;
}

export interface BatchDetail {
  id: string;
  projectId: string;
  name: string;
  rootSpanIds: string[];
}

export interface AllRootSpansResult {
  rootSpans: AnnotatedRootSpan[];
  totalCount: number;
}

export interface FormattedRootSpansResult {
  rootSpans: FormattedRootSpan[];
  totalCount: number;
}

export interface SpanSet {
  input: string;
  output: string;
  spanId: string;
}

export interface FormattedSpanSet {
  formattedInput: string;
  formattedOutput: string;
  spanId: string;
}