import dotenv from 'dotenv';

dotenv.config();

export default {
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  API_TOKEN: process.env.API_TOKEN,
  BUSINESS_PHONE: process.env.BUSINESS_PHONE,
  API_VERSION: process.env.API_VERSION,
  PORT: process.env.PORT || 3005,
  BASE_URL: process.env.BASE_URL,
  XAI_API_KEY: process.env.XAI_API_KEY,
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
  
  
};