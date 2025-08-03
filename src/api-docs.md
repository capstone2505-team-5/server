Updated: 8-1-25

# API Endpoints

---
### GET `/api/rootSpans?projectId=123&batchId=123&spanName=myFunction&pageNumber=1&numPerPage=20`

Returns: 
- array of root spans with annotations
- paginated and filterable with query params
- total count is the total amount of spans that matches params
- if batchId is not present, will only show spans not in a batch
- pageNumber and numPerPage required
- projectId is required

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
- Annotate a span
- Cannot annotate without a rating


**Request Body:**
```ts
{
  rootSpanId: string;
  note: string;
  rating: Rating;
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
type Rating = 'good' | 'bad';
```

---
### GET `/api/batches/:batchId?projectId=1234&pageNumber=1&numPerPage=20`

Returns: metadata for a batch and paginated root spans.
- projectId required

**Response:**
```ts
{
  batchSummary: {
                  id: string;
                  name: string;
                  span_count: number;
                  percent_annotated: number;
                  percent_good: number;
                  categories: string[];
                }, 
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
              ],
  totalCount: number;
}

```

---

### GET `/api/batches/edit?projectId=123&batchId=123&spanName=myFunction&pageNumber=1&numPerPage=20`

Returns: root spans not associated with any batch and root spans from the batch
- batchId, projectId, pageNumber, and numPerPage required

**Response:**
```ts
{
  editBatchRootSpans: [
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

### POST `/api/batches`

Creates a new batch

**Request Body:**
```ts
{
  name: string;
  projectId: string;
  rootSpanIds: string[];
}
```

**Response:**
```ts
{
  id: string;
  projectId: string;
  name: string;
  rootSpanIds: string[];
}
```

---

### PATCH `/api/batches/:batchId`

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
  projectId: string;
  name: string;
  rootSpanIds: string[];
}
```

---

### DELETE `/api/batches/:id`

Deletes a batch by ID
- Removes annotations / categories from all spans in the batch

**Response:**
```ts
{
  id: string;
  projectId: string;
  name: string;
  rootSpanIds: string[];
}
```

---

### POST `/api//batches/:batchId/format
- format a batch
- request body empty
- response: (fill this in)

---


### GET `/api/projects/`

Returns: array of project summaries

**Response:**
```ts
[
  {
    id: string;
    name: string;
    updatedAt: date;
    validRootSpanCount: number;
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
    validRootSpanCount: number;
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

// The keys will be the category names and the number will be the quantity
**Response:**
```ts
{
  [key: string]: number;
}
```

---
