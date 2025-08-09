// src/lambda-handler.ts

import serverlessExpress from '@codegenie/serverless-express';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import app from './app'; // Standard default import

const server = serverlessExpress({ app });

export const handler = (event: APIGatewayProxyEvent, context: Context, callback: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return server(event, context, callback);
};
