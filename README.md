To run:
1. npm install
2. npm run dev

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

GET /api/annotations
Response:
[
  {
    id: string;
    traceId: string;
    note: string;
    rating: Rating;
    categories: string[];
  }
]

GET /api/annotations/:id
Response:
{
  id: string;
  traceId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

POST /api/annotations
Request Body:
{
  traceId: string;
  note: string;
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

type Rating = 'good' | 'bad' | 'none';

POST /api/categorize
Request Body: null
Response:
{
  categories: [{traceid, categories}, {traceid, categories}...]
}

