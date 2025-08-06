8-5-25 6:12 PM
This is the last commit before converting to Lambda!

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