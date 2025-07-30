Updated 07-29-25 3:35pm

# API Endpoints

---
DONE
### GET `/api/rootSpans?projectId=123&batchId=123&spanName=myFunction&pageNumber=1&numPerPage=20`

Returns: array of root spans with annotations

**Response:**
```ts
{
  rootSpans: [
    {
      id: string;
      traceId: string;
      batchId: string;
      input: string;
      output: string;
      projectId: string;
      spanName: string;
      startTime: string;
      endTime: string;
      createdAt: string;
      annotation: {
        id: string;
        note: string;
        rating: Rating;
        categories: string[];
      };
    }
  ];
  totalCount: number;
}

```

---
DONE
### GET `/api/rootSpans/:id`

Returns: a single root span

**Response:**
```ts
{
  id: string;
  traceId: string;
  batchId: string;
  input: string;
  output: string;
  projectId: string;
  spanName: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  annotation: {
    id: string;
    note: string;
    rating: Rating;
    categories: string[];
  };
}
```

---

### GET `/api/annotations`

**Response:**
```ts
[
  {
    id: string;
    rootSpanId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
]
```

---

### GET `/api/annotations/:id`

**Response:**
```ts
{
  id: string;
  rootSpanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}
```

---

### POST `/api/annotations`

**Request Body:**
```ts
{
  rootSpanId: string;
  note: string;
  rating?: Rating;
}
```

**Response:**
```ts
{
  id: string;
  rootSpanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}
```

---

### PATCH `/api/annotations/:id`

**Request Body:**
```ts
{
  note?: string;
  rating?: Rating;
}
```

**Response:**
```ts
{
  id: string;
  rootSpanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}
```

---

### DELETE `/api/annotations/:id`

**Response:**
```ts
{
  message: "Annotation deleted successfully",
  deletedAnnotation: {
    id: string;
    rootSpanId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
}
```

---

### Type Definition

```ts
type Rating = 'good' | 'bad' | 'none';
```

---

### GET `/api/batches/:batchId?pageNumber=1&numPerPage=20`

Returns: metadata for a batch and paginated root spans.

**Response:**
```ts
{
  batchSummary:    {
                      id: string;
                      name: string;
                      span_count: number;
                      percent_annotated: number;
                      percent_good: number;
                      categories: string[];
                    }
  rootSpans: [
                {
                  id: string;
                  traceId: string;
                  startTime: string;
                  endTime: string;
                  input: string;
                  output: string;
                  projectName: string;
                  spanName: string;
                  annotation: {
                    id: string;
                    note: string;
                    rating: Rating;
                    categories: string[];
                  };
                }
              ]
}

```

---

### GET `/api/batches/:batchId/edit`

Returns: root spans from this batch and any root spans not associated with any batch.

**Response:**
```ts
[
  {
    id: string;
    traceId: string;
    startTime: string;
    endTime: string;
    input: string;
    output: string;
    projectName: string;
    spanName: string;
    annotation: {
      id: string;
      note: string;
      rating: Rating;
      categories: string[];
    };
  }
]
```

---

### POST `/api/batches`

Creates a new batch

**Request Body:**
```ts
{
  name: string;
  rootSpanIds: string[];
}
```

**Response:**
```ts
{
  id: string;
  name: string;
  rootSpanIds: string[];
}
```

---

### PATCH `/api/batches/:id`

Updates a single batch by ID

**Request Body:**
```ts
{
  name?: string;
  rootSpanIds?: string[];
}
```

**Response:**
```ts
{
  id: string;
  name: string;
  rootSpanIds: string[];
}
```

---

### DELETE `/api/batches/:id`

Deletes a batch by ID

**Response:**
```ts
{
  id: string;
  name: string;
  rootSpanIds: string[];
}
```

---

DONE
### GET `/api/projects/`

Returns: array of project summaries

**Response:**
```ts
[
  {
    id: string;
    name: string;
    updatedAt: date;
    rootSpanCount: number;
    numBatches: number;
  }
]
```

---

### GET `/api/projects/:projectId`

Returns: array of batch summaries

**Response:**
```ts
[
  {
    id: string;
    name: string;
    createdAt: string;
    spanCount: number;
    percentAnnotated: number;
    percentGood: number;
    categories: string[];
  }
]
```

---

### POST `/api/categorize?batchId=abc123`

Generates categories from annotations in a batch

**Request Body:** `null`

**Response:**
```ts
[
  [category: string, count: number]
]
```

---
