To run:
1. npm install
2. npm run dev

API Endpoints:

GET /api/traces
Response:
[
  {
    id: number;
    input: string;
    output: string;
  }
]

GET /api/traces/:id
Response:
{
  id: number;
  input: string;
  output: string;
}

GET /api/annotations
Response:
[
  {
    id: number;
    traceId: number;
    note: string;
    rating: Rating;
    categories: string[];
  }
]

GET /api/annotations/:id
Response:
{
  id: number;
  traceId: number;
  note: string;
  rating: Rating;
  categories: string[];
}

POST /api/annotations
Request Body:
{
  traceId: number;
  note: string;
  rating?: Rating;
}
Response:
{
  id: number;
  traceId: number;
  note: string;
  rating: Rating;
  categories: string[];
}

type Rating = 'good' | 'bad' | 'none';