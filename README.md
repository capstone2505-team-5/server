To run:
1. npm install
2. npm run dev
3. create .env file
---- OPENAI_API_KEY=sk-…your key…
---- PHOENIX_API_KEY=your_phoenix_api_key
---- PHOENIX_API_URL=your_phoenix_hostname

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

GET /api/traces
Response:
[
  {
    id: string;
    input: string;
    output: string;
  }
]

GET /api/traces/:id
Response:
{
  id: string;
  input: string;
  output: string;
}

DELETE /api/traces/:id
Response:
{
  message: "Trace deleted successfully",
  deletedAnnotation: {
    id: string;
    input: string;
    output: string;
  }
}

GET /api/rootSpans
Response:
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
  }
]

GET /api/rootSpans/:id
Response:
{
  id: string;
  traceId: string;
  startTime: string;
  endTime: string;
  input: string;
  output: string;
  projectName: string;
  spanName: string;
}



GET /api/annotations
Response:
[
  {
    id: string;
    rootSpanId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
]

GET /api/annotations/:id
Response:
{
  id: string;
  rootSpanId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

POST /api/annotations
Request Body:
{
  rootSpanId: string;
  note: string;
  rating?: Rating;
}
Response:
{
  id: string;
  rootSpanId: string;
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
  rootSpanId: string;
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
    rootSpanId: string;
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
  categories: [{rootSpanId, categories}, {rootSpanId, categories}...]
}

* categories is an array of categories

