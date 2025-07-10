import OpenAI from 'openai';
import 'dotenv/config';     // loads .env automatically

// One singleton client for the whole server
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // you can omit this; env var is default
});