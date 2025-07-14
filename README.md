To run:
1. npm install
2. npm run dev
3. create .env file
---- OPENAI_API_KEY=sk-…your key…

To setup PSQL DB:
- Make a database named error_analysis
- Make .env file:
    PGUSER=dev_user
    PGPASSWORD=dev_password
    PGDATABASE=error_analysis
    PGHOST=localhost
    PGPORT=5432
- Run the server and it will create the tables for you.

API Endpoints:

GET /api/spans
Response:
[
  {
    span_id: string;
    trace_id: string;
    project_name: string;
    input: string;
    output: string;
    start_time: string; // TIMESTAMPTZ
    end_time: string; // TIMESTAMPTZ
    context: Record<string, any>; // parsed JSONB object
    extracted_at: string; // timestamp - when extracted into spans_extracted table from phoenix spans
  }
]

GET /api/spans/:id
Response:
{
  span_id: string;
  trace_id: string;
  project_name: string;
  input: string;
  output: string;
  start_time: string; // TIMESTAMPTZ
  end_time: string; // TIMESTAMPTZ
  context: Record<string, any>; // parsed JSONB object
  extracted_at: string; // timestamp - when extracted into spans_extracted table from phoenix spans
}

DELETE /api/spans/:id
Response:
{
  message: "Span deleted successfully",
  deletedAnnotation: {
    id: string;
    input: string;
    output: string;
  }
}

GET /api/annotations
Response:
[
  {
    id: string;
    spanId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
]

GET /api/annotations/:id
Response:
{
  id: string;
  spanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

POST /api/annotations
Request Body:
{
  spanId: string;
  note: string;
  rating?: Rating;
}
Response:
{
  id: string;
  spanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

PATCH /api/annotations/:id
Request Body:
{
  note?: string;
  rating?: Rating;
}
Response:
{
  id: string;
  traceId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

DELETE /api/annotations/:id
Response:
{
  message: "Annotation deleted successfully",
  deletedAnnotation: {
    id: string;
    traceId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
}


type Rating = 'good' | 'bad' | 'none';

POST /api/categorize
Request Body: null
Response:
{
  categories: [{traceId, categories}, {traceId, categories}...]
}

* categories is an array of categories

