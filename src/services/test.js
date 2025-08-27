//importar credenciales
import path from 'path'
import { google } from 'googleapis'

async function testAppendToSheet() {
  try {
    // Sample data matching the format from MessageHandler.js
    const data = [
      '1234567890', // Phone number (to)
      'Test User', // Name
      'Bogotá', // City
      'Proyecto A', // Project
      'test@example.com', // Email
      new Date().toISOString(), // Timestamp
    ];

    console.log('Attempting to append data:', data);
    const result = await appendToSheet(data);
    console.log('Success:', result);
  } catch (error) {
    console.error('Test failed:', {
      message: error.message,
      code: error.code,
      details: error.errors,
      stack: error.stack,
    });
  }
}

testAppendToSheet();