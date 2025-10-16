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
  companyData = { companyName: 'Marval Constructora', projects: [], faqs: [], contact: {} };
}

// NEW: Define tools for function calling (Grok will call these based on intent)
const tools = [
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description: "Trigger the appointment scheduling flow when the user expresses intent to book or schedule an appointment, meeting, or consultation. Use this if the message contains words like 'visita', 'programar', 'atender', 'cita', 'agendar'. Do not use for general queries.",
      parameters: {
        type: "object",
        properties: {}, // No params needed—just the call triggers the flow
        required: [],
      },
    },
  },
];

// Initialize conversation history with system prompt including company data and tools awareness
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
      
      Si detectas que el usuario quiere agendar una cita o appointment, llama a la función 'schedule_appointment' en lugar de responder directamente. 
      De lo contrario, responde de forma natural y útil.
    `,
  },
];

async function getGrokResponse(message) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    const completion = await grok.chat.completions.create({
      model: 'grok-3', // Or other models like 'grok-1.5' if available
      messages: conversationHistory,
      temperature: 0.5, // Controls creativity
      max_tokens: 300, // Limit response length
      tools, // NEW: Pass tools to enable function calling
    });

    const responseMessage = completion.choices[0].message;

    // NEW: Check for tool calls (intent detection)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      if (toolCall.function.name === 'schedule_appointment') {
        // Add assistant's "response" (the tool call) to history for context
        conversationHistory.push(responseMessage);
        // Return special indicator instead of text
        return { isToolCall: true, toolName: 'schedule_appointment' };
      }
    }

    // Normal case: Extract the assistant's response
    const assistantResponse = responseMessage.content || 'Lo siento, no pude generar una respuesta adecuada.';

    // Add assistant's response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse,
    });

    // Limit conversation history to prevent excessive token usage
    if (conversationHistory.length > 5) { // Adjusted to account for tools
      conversationHistory.splice(
        1, // Keep the system prompt
        conversationHistory.length - 5 // Keep last 5 messages
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