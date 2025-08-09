.env file

DB_HOST=localhost
DB_PORT=5432
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_NAME=error_analysis
OPENAI_API_KEY=your-open-ai-key-here
PHOENIX_API_URL=https://team5-phoenix.xyz
NODE_ENV=development


Run the App
0) npm install
---- no idea if this is needed but can't hurt
1) npm run build
---- only when changes made
2) sam build
---- only when changes made
3) sam local start-lambda
----- in terminal 1
4) sam local start-api
----- in terminal 2
