import app from './app';

// In a serverless environment, we don't start a server with app.listen().
// Instead, we export the configured Express app object.
// The Lambda handler will use this app object to process incoming requests.
export { app };
