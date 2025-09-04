
import config from '../config/env.js';
import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';

const grok = new OpenAI({
  apiKey: config.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1', // Points to xAI's endpoint
});

// Load company data once at startup
let companyData;
try {
  companyData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'projects', 'projects.json'), 'utf8')
  );
} catch (error) {
  console.error('Error loading projects.json:', error);
  companyData = { companyName: 'Marval Construction', projects: [], faqs: [], contact: {} };
}

// Initialize conversation history with system prompt including company data
const conversationHistory = [
  {
    role: 'system',
    content: `
      Eres Marbot, un asistente de inteligencia artificial creado por Marval, una constructora colombiana. 
      Tu propósito es responder preguntas sobre proyectos arquitectónicos con un tono cordial y profesional.
      Usa la siguiente información de la empresa para responder:
         Nombre: ${companyData.companyName}
      Proyectos: ${JSON.stringify(companyData.projects, null, 2)}
      Preguntas frecuentes: ${JSON.stringify(companyData.faqs, null, 2)}
      Contacto: ${JSON.stringify(companyData.contact, null, 2)}
    
    `,
   
  },
];

async function getGrokResponse(message) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: 'user',
      content: message, // Fixed: Use the message parameter
    });

    const completion = await grok.chat.completions.create({
      model: 'grok-4', // Or other models like 'grok-1.5' if available
      messages: conversationHistory,
      temperature: 0.5, // Controls creativity
      max_tokens: 300, // Limit response length
    });

    // Extract the assistant's response
    const assistantResponse = completion.choices[0].message.content;

    // Add assistant's response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse,
    });

    // Limit conversation history to prevent excessive token usage
    if (conversationHistory.length > 5) {
      conversationHistory.splice(
        1, // Keep the system prompt
        conversationHistory.length - 5 // Keep last 4 messages
      );
    }

    return assistantResponse;
  } catch (error) {
    console.error('Error calling Grok API:', {
      message: error.message,
      code: error.response?.status,
      details: error.response?.data,
    });
    return 'Lo siento, hubo un error. Por favor, intenta de nuevo.'; // Fallback message
  }
}

export default getGrokResponse;
