import OpenAI from 'openai';
import 'dotenv/config';     // loads .env automatically
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Fetches OpenAI API key from AWS Secrets Manager
 */
const getOpenAIApiKeyFromSecrets = async () => {
  try {
    const secretName = process.env.OPENAI_API_KEY_SECRET_NAME;
    if (!secretName) {
      throw new Error('OPENAI_API_KEY_SECRET_NAME environment variable is required in production');
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('No secret string found in the secret');
    }

    const secret = JSON.parse(response.SecretString);
    return secret["openaiApiKey"];
  } catch (error) {
    console.error('Error fetching OpenAI API key from Secrets Manager:', error);
    throw error;
  }
};

/**
 * Gets the OpenAI API key based on environment
 */
const getOpenAIApiKey = async () => {
  if (process.env.AWS_SAM_LOCAL !== 'true') {
    // Use AWS Secrets Manager in production
    return await getOpenAIApiKeyFromSecrets();
  } else {
    // Use environment variable for local development
    return process.env.OPENAI_API_KEY;
  }
};

// Initialize OpenAI client with async configuration
let openaiClient: OpenAI | null = null;

/**
 * Returns a singleton instance of the OpenAI client
 * Use this function to get the OpenAI client in both development and production
 */
export const getOpenAIClient = async (): Promise<OpenAI> => {
  if (!openaiClient) {
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
};