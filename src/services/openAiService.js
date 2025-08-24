import OpenAI  from "openai"
import config from '../config/env.js'

const grok = new OpenAI({
  apiKey: config.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',  // This points to xAI's endpoint instead of OpenAI
});


// In-memory conversation history (can be replaced with a database for persistence)
let conversationHistory = [
  {
    role: 'system',
    content: 'Eres Marbot, un asistente de inteligencia artificial creado por Marval, una constructora colombiana. Tu propósito es responder preguntas sobre proyectos arquitectónicos con un tono cordial y profesional.',
  },
];

async function getGrokResponse(message) {
  try {
    
    conversationHistory.push({
      role:'user',
      content: 'message'
    })


    const completion = await grok.chat.completions.create({
      model: 'grok-4',  // Or other models like 'grok-1.5' if available
      messages: conversationHistory,
      temperature: 0.5,  // Controls creativity (0-1; lower for more factual responses)
      max_tokens: 300,   // Limit response length to save credits
    });


    // Extract the assistant's response
    const assistantResponse = completion.choices[0].message.content


// Add the assistant's response to the conversation history
    conversationHistory.push({
      role: 'assistant',
      content: assistantResponse,
    });
     
// Optional: Limit conversation history to prevent excessive token usage
    if (conversationHistory.length > 5) { // Adjust the limit as needed
      conversationHistory = [
        conversationHistory[0], // Keep the system prompt
        ...conversationHistory.slice(-5), // Keep the last 9 messages
      ];
    }

    return assistantResponse;

   
  } catch (error) {
    console.error('Error calling Grok API:', error);
    return 'Sorry, there was an error. Please try again.';  // Fallback message
  }
}

export default getGrokResponse