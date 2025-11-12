import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsService.js';
import getGrokResponse from './openAiService.js';

class MessageHandler {
  constructor() {
    this.appointmentState = {};
    this.assistantState = {};
    this.stateTimeout = 10 * 60 * 1000;
  }

  clearStaleStates() {
    const now = Date.now();
    Object.keys(this.appointmentState).forEach((key) => {
      if (this.appointmentState[key].timestamp < now - this.stateTimeout) {
        delete this.appointmentState[key];
      }
    });
    Object.keys(this.assistantState).forEach((key) => {
      if (this.assistantState[key].timestamp < now - this.stateTimeout) {
        delete this.assistantState[key];
      }
    });
  }

  // NEW: Helper method to detect appointment scheduling intent
  isAppointmentIntent(message) {
    const appointmentKeywords = [
      'agendar cita',
      'quiero una cita',
      'reservar',
      'cita',
      'programar',
      'appointment',
      'schedule',
      'book',
    ];
    return appointmentKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  async handleIncomingMessage(message, senderInfo) {
    this.clearStaleStates();
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if (this.isGreeting(incomingMessage)) {
      //  await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.handleAssistantFlow(message.from, incomingMessage);       
       //  await this.sendWelcomeMenu(message.from);
      } else if (['audio', 'video', 'image', 'document'].includes(message.type)) {
        await this.sendMedia(message.from, message.type);
      } else if (this.appointmentState[message.from]) {
        await this.handleAppointmentFlow(message.from, incomingMessage);
      } else {
        // Route to assistant flow with intent detection
        await this.handleAssistantFlow(message.from, incomingMessage);
      }

      await whatsappService.markAsRead(message.id);
    } else if (message?.type === 'interactive') {
      const option = message?.interactive?.button_reply?.id.toLowerCase().trim();
      await this.handleMenuOption(message.from, option);
      await whatsappService.markAsRead(message.id);
    }
  }

  isGreeting(message) {
    const greetings = ['hola', 'hello', 'hi', 'buenas tardes'];
    return greetings.includes(message);
  }

  getSenderName(senderInfo) {
    return senderInfo.profile?.name || senderInfo.wa_id;
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const onlyName = name.split(' ')[0];
    const welcomeMessage = ` ${onlyName} es un gusto atenderte desde Constructora Marval, Marbot sera tu asistente,;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }

  
 

 

completeAppointment(to) {
    const appointment = this.appointmentState[to];
    delete this.appointmentState[to];

    const userData = [
      to,
      appointment.name,
      appointment.city,
      appointment.project,
      appointment.email,
      new Date().toISOString(),
    ];

    try {
      // Ensure appendToSheet is awaited (assuming it's async)
      console.log('Attempting to write to Google Sheets:', userData); // Debug log
      appendToSheet(userData).then(() => {
        console.log('Successfully wrote to Google Sheets for:', to);
      }).catch((error) => {
        console.error('Failed to write to Google Sheets:', error);
      });

      return `Gracias por agendar tu cita. 
      Resumen de tu cita:
      Nombre: ${appointment.name}
      Ciudad: ${appointment.city}
      Proyecto: ${appointment.project}
      Correo electrónico: ${appointment.email}
      
      Nos pondremos en contacto contigo pronto.`;
    } catch (error) {
      console.error('Error saving appointment to Google Sheets:', {
        message: error.message,
        stack: error.stack,
        userData, // Log the data for debugging
      });
      return 'Lo siento, hubo un error al guardar tu cita. Por favor, intenta de nuevo.';
    }
  }


  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;

    switch (state.step) {
      case 'name':
        state.name = message;
        state.step = 'city';
        response = 'Gracias. Ahora, ¿cuál es tu ciudad?';
        break;
      case 'city':
        state.city = message;
        state.step = 'project';
        response = '¿Qué proyecto te interesa?';
        break;
      case 'project':
        state.project = message;
        state.step = 'email';
        response = 'Por favor, ingresa tu correo';
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(message)) {
          state.email = message;
          response = this.completeAppointment(to);
        } else {
          response = 'Por favor, ingresa un correo electrónico válido (ejemplo: usuario@dominio.com).';
        }
        break;
    }
    await whatsappService.sendMessage(to, response);
  }

  async handleAssistantFlow(to, message) {
    const state = this.assistantState[to];
    if (!state) {
      this.assistantState[to] = { step: 'question', timestamp: Date.now() };
    }

    let response = 'Lo siento, no pude procesar tu consulta en este momento.';

    if (state.step === 'question') {
      try {
        // NEW: Check for appointment intent locally first
        if (this.isAppointmentIntent(message)) {
          this.appointmentState[to] = { step: 'name', timestamp: Date.now() };
          delete this.assistantState[to]; // Exit assistant mode
          response = '¡Perfecto! Parece que quieres agendar una cita. Por favor, ingresa tu nombre para comenzar:';
        } else {
          // Fallback to Grok for intent detection
          const grokResponse = await getGrokResponse(message);

          if (typeof grokResponse === 'object' && grokResponse.isToolCall && grokResponse.toolName === 'schedule_appointment') {
            this.appointmentState[to] = { step: 'name', timestamp: Date.now() };
            delete this.assistantState[to]; // Exit assistant mode
            response = '¡Entendido! Vamos a agendar tu cita. Por favor, ingresa tu nombre:';
          } else {
            response = grokResponse;
            await whatsappService.sendMessage(to, response);

            const menuMessage = '¿La respuesta fue de tu ayuda?';
            const buttons = [
              { type: 'reply', reply: { id: 'option_4', title: 'Sí, Gracias' } },
              { type: 'reply', reply: { id: 'option_5', title: 'Hacer otra pregunta' } },
             
            ];
           // await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
            return;
          }
        }
      } catch (error) {
        console.error('Error in getGrokResponse:', error);
        response = 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.';
      }
    }

    await whatsappService.sendMessage(to, response);
    state.timestamp = Date.now();
  }

 


}

export default new MessageHandler();
