# API Documentation

**Last Updated:** August 3rd, 2025

## Table of Contents

- [Type Definitions](#type-definitions)
- [Root Spans](#root-spans)
- [Annotations](#annotations)
- [Batches](#batches)
- [Projects](#projects)
- [Categories](#categories)

---

## Type Definitions

```typescript
type Rating = 'good' | 'bad';

```

---

## Root Spans

### `GET /api/rootSpans`

Retrieves paginated root spans with optional filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes* | Filter by project ID |
| `batchId` | string | Yes* | Filter by batch ID |
| `spanName` | string | No | Filter by span name |
| `pageNumber` | number | No | Page number (default: 1) |
| `numPerPage` | number | No | Items per page (default: 20) |

*Either `projectId` or `batchId` is required. If `batchId` is not provided, only shows spans not in any batch.

**Example Request:**
```
GET /api/rootSpans?projectId=proj_abc123&spanName=generateResponse&pageNumber=1&numPerPage=10
```

**Response:**
```typescript
{
  rootSpans: [
    {
      id: "span_xyz789",
      traceId: "trace_def456",
      batchId: "batch_ghi012",
      input: "What is the weather like today?",
      output: "The weather is sunny and 75°F.",
      projectId: "proj_abc123",
      spanName: "generateResponse",
      startTime: "2025-01-08T10:30:00.000Z",
      endTime: "2025-01-08T10:30:02.500Z",
      createdAt: "2025-01-08T10:30:00.000Z",
      annotation: {
        id: "ann_jkl345",
        note: "Good response with accurate information",
        rating: "good",
        categories: ["helpful", "accurate"]
      }
    }
  ],
  totalCount: 156
}
```

### `GET /api/rootSpans/:id`

Retrieves a single root span by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Root span ID |

**Example Request:**
```
GET /api/rootSpans/span_xyz789
```

**Response:**
```typescript
{
  id: "span_xyz789",
  traceId: "trace_def456",
  batchId: "batch_ghi012",
  input: "What is the weather like today?",
  output: "The weather is sunny and 75°F.",
  projectId: "proj_abc123",
  spanName: "generateResponse",
  startTime: "2025-01-08T10:30:00.000Z",
  endTime: "2025-01-08T10:30:02.500Z",
  createdAt: "2025-01-08T10:30:00.000Z",
  annotation: {
    id: "ann_jkl345",
    note: "Good response with accurate information",
    rating: "good",
    categories: ["helpful", "accurate"]
  }
}
```

---

## Annotations

### `GET /api/annotations`

Retrieves all annotations.

**Response:**
```typescript
[
  {
    id: "ann_jkl345",
    rootSpanId: "span_xyz789",
    note: "Good response with accurate information",
    rating: "good",
    categories: ["helpful", "accurate"]
  },
  {
    id: "ann_mno678",
    rootSpanId: "span_pqr901",
    note: "Response was confusing and unhelpful",
    rating: "bad",
    categories: ["confusing", "unhelpful"]
  }
]
```

### `GET /api/annotations/:id`

Retrieves a single annotation by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Annotation ID |

**Example Request:**
```
GET /api/annotations/ann_jkl345
```

**Response:**
```typescript
{
  id: "ann_jkl345",
  rootSpanId: "span_xyz789",
  note: "Good response with accurate information",
  rating: "good",
  categories: ["helpful", "accurate"]
}
```

### `POST /api/annotations`

Creates a new annotation for a root span.

> **Note:** A rating is required when creating an annotation.

**Request Body:**
```typescript
{
  rootSpanId: "span_xyz789",
  note: "This response was very helpful and accurate",
  rating: "good"
}
```

**Response:**
```typescript
{
  id: "ann_stu234",
  rootSpanId: "span_xyz789",
  note: "This response was very helpful and accurate",
  rating: "good",
  categories: []
}
```

### `PATCH /api/annotations/:id`

Updates an existing annotation.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Annotation ID |

**Request Body:**
```typescript
{
  note?: "Updated note with more details",
  rating?: "bad"
}
```

**Response:**
```typescript
{
  id: "ann_jkl345",
  rootSpanId: "span_xyz789",
  note: "Updated note with more details",
  rating: "bad",
  categories: ["unhelpful"]
}
```

### `DELETE /api/annotations/:id`

Deletes an annotation by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Annotation ID |

**Example Request:**
```
DELETE /api/annotations/ann_jkl345
```

**Response:**
```typescript
{
  message: "Annotation deleted successfully",
  deletedAnnotation: {
    id: "ann_jkl345",
    rootSpanId: "span_xyz789",
    note: "Updated note with more details",
    rating: "bad",
    categories: ["unhelpful"]
  }
}
```

---

## Batches

### `GET /api/batches/:batchId`

Retrieves batch metadata and paginated root spans within the batch.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchId` | string | Yes | Batch ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageNumber` | number | No | Page number (default: 1) |
| `numPerPage` | number | No | Items per page (default: 20) |

**Example Request:**
```
GET /api/batches/batch_ghi012?projectId=proj_abc123&pageNumber=1&numPerPage=10
```

**Response:**
```typescript
{
  batchSummary: {
    id: "batch_ghi012",
    name: "Customer Support Responses",
    span_count: 45,
    percent_annotated: 78.5,
    percent_good: 82.3,
    categories: ["helpful", "accurate", "polite"]
  },
  rootSpans: [
    {
      id: "span_xyz789",
      traceId: "trace_def456",
      startTime: "2025-01-08T10:30:00.000Z",
      endTime: "2025-01-08T10:30:02.500Z",
      input: "{What is the weather like today?}",
      output: "{{The weather is sunny and 75°F.}}",
      formattedInput: "What is the weather like today?",
      formattedOutput: "The weather is sunny and 75°F.",
      projectName: "Weather Assistant",
      spanName: "generateResponse",
      annotation: {
        id: "ann_jkl345",
        note: "Good response with accurate information",
        rating: "good",
        categories: ["helpful", "accurate"]
      }
    }
  ],
  totalCount: 45
}
```

### `GET /api/batches/edit`

Retrieves root spans for batch editing - includes both unassigned spans and spans from the specified batch.

**Query Parameters:**
| Parameter | Type | Required | Description |
| `batchId` | string | Yes | Batch ID to edit |
| `spanName` | string | No | Filter by span name |
| `pageNumber` | number | No | Page number |
| `numPerPage` | number | No | Items per page |

**Example Request:**
```
GET /api/batches/edit?batchId=batch_ghi012&pageNumber=1&numPerPage=20
```

**Response:**
```typescript
{
  editBatchRootSpans: [
    {
      id: "span_xyz789",
      traceId: "trace_def456",
      batchId: "batch_ghi012",
      input: "What is the weather like today?",
      output: "The weather is sunny and 75°F.",
      projectId: "proj_abc123",
      spanName: "generateResponse",
      startTime: "2025-01-08T10:30:00.000Z",
      endTime: "2025-01-08T10:30:02.500Z",
      createdAt: "2025-01-08T10:30:00.000Z",
      annotation: {
        id: "ann_jkl345",
        note: "Good response with accurate information",
        rating: "good",
        categories: ["helpful", "accurate"]
      }
    }
  ],
  totalCount: 67
}
```

### `POST /api/batches`

Creates a new batch with specified root spans.

**Request Body:**
```typescript
{
  name: "Customer Support Analysis",
  projectId: "proj_abc123",
  rootSpanIds: ["span_xyz789", "span_pqr901", "span_stu234"]
}
```

**Response:**
```typescript
{
  id: "batch_vwx567",
  projectId: "proj_abc123",
  name: "Customer Support Analysis",
  rootSpanIds: ["span_xyz789", "span_pqr901", "span_stu234"]
}
```

### `PATCH /api/batches/:batchId`

Updates an existing batch's name and root spans.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchId` | string | Yes | Batch ID |

**Request Body:**
```typescript
{
  name: "Updated Customer Support Analysis",
  rootSpanIds: ["span_xyz789", "span_pqr901", "span_new123"]
}
```

**Response:**
```typescript
{
  id: "batch_vwx567",
  projectId: "proj_abc123",
  name: "Updated Customer Support Analysis",
  rootSpanIds: ["span_xyz789", "span_pqr901", "span_new123"]
}
```

### `DELETE /api/batches/:id`

Deletes a batch and removes all annotations and categories from spans in the batch.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Batch ID |

**Example Request:**
```
DELETE /api/batches/batch_vwx567
```

**Response:**
```typescript
{
  id: "batch_vwx567",
  projectId: "proj_abc123",
  name: "Updated Customer Support Analysis",
  rootSpanIds: ["span_xyz789", "span_pqr901", "span_new123"]
}
```

### `POST /api/batches/:batchId/format`

Formats and processes a batch for analysis.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchId` | string | Yes | Batch ID |

**Request Body:** `null`

**Example Request:**
```
POST /api/batches/batch_ghi012/format
```

**Response:**
```typescript
{
  message: "Batch formatted successfully",
  batchId: "batch_ghi012",
  processedSpanCount: 45,
  timestamp: "2025-01-08T10:30:00.000Z"
}
```

---

## Projects

### `GET /api/projects`

Retrieves all project summaries.

**Response:**
```typescript
[
  {
    id: "proj_abc123",
    name: "Weather Assistant",
    updatedAt: "2025-01-08T10:30:00.000Z",
    validRootSpanCount: 1247,
    numBatches: 12
  },
  {
    id: "proj_def456",
    name: "Customer Support Bot",
    updatedAt: "2025-01-07T15:45:00.000Z",
    validRootSpanCount: 892,
    numBatches: 8
  }
]
```

### `GET /api/projects/:projectId`

Retrieves batch summaries for a specific project.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Project ID |

**Example Request:**
```
GET /api/projects/proj_abc123
```

**Response:**
```typescript
[
  {
    id: "batch_ghi012",
    name: "Customer Support Responses",
    createdAt: "2025-01-05T09:15:00.000Z",
    validRootSpanCount: 45,
    percentAnnotated: 78.5,
    percentGood: 82.3,
    categories: ["helpful", "accurate", "polite"]
  },
  {
    id: "batch_jkl345",
    name: "Weather Queries",
    createdAt: "2025-01-03T14:20:00.000Z",
    validRootSpanCount: 67,
    percentAnnotated: 65.2,
    percentGood: 91.7,
    categories: ["accurate", "informative"]
  }
]
```

---

## Categories

### `POST /api/categorize`

Generates categories from annotations within a batch using AI analysis.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchId` | string | Yes | Batch ID to analyze |

**Request Body:** `null`

**Example Request:**
```
POST /api/categorize?batchId=batch_ghi012
```

**Response:**
```typescript
{
  "helpful": 23,
  "accurate": 19,
  "polite": 15,
  "confusing": 3,
  "incomplete": 2
}
```

The response contains category names as keys and their occurrence counts as values.
