import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsService.js';
import getGrokResponse from './openAiService.js'

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

  
  async handleIncomingMessage(message, senderInfo) {
     this.clearStaleStates();
     if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();
      

          if(this.isGreeting(incomingMessage)){
           await this.sendWelcomeMessage(message.from, message.id, senderInfo)
           await this.sendWelcomeMenu(message.from)
          }else if (['audio', 'video', 'image', 'document'].includes(incomingMessage)){
               await this.sendMedia (message.from, incomingMessage)
          } else if (this.appointmentState[message.from]) {
             await this.handleAppointmentFlow(message.from, incomingMessage);
          }  else if (this.assistantState[message.from]) {
             await this.handleAssitantFlow(message.from, incomingMessage);
          }          
            else           
            {
             const response = 'Lo siento no entendi tu mensaje'
             await whatsappService.sendMessage(message.from, response,  message.id)
            }     
  
      await whatsappService.markAsRead(message.id);
    }else if(message?.type=='interactive'){
        const option = message?.interactive?.button_reply?.id.toLowerCase().trim()
        await this.handleMenuOption(message.from, option )
        await whatsappService.markAsRead(message.id)
    }
  } 
  
  
  isGreeting(message) {
    const greetings = ["hola", "hello", "hi", "buenas tardes"];
    return greetings.includes(message);
  }
    

  getSenderName(senderInfo) {
    return senderInfo.profile?.name || senderInfo.wa_id;
  }
  


async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const onlyName = name.split(' ')[0]
    const welcomeMessage = `Bienvenido ${onlyName}, Soy Marbot ¿En qué puedo ayudarte hoy?`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }

async sendWelcomeMenu(to){
    const menuMessage = 'Elige una opcion'
    const buttons = [ 
                                  {
                                     type: "reply",
                                     reply: {
                                     id: "option_1",
                                     title: "Agendar"
                                      }
                                  },
                                 {
                                     type: "reply",
                                     reply: {
                                     id: "option_2",
                                     title: "Consultar"
                                       }
                                 },
                                 {
                                     type: "reply",
                                     reply: {
                                     id: "option_3",
                                     title: "Ubicacion"
                                       }                   
                                
                                 }


    ]
    await whatsappService.sendInteractiveButtons(to,menuMessage, buttons)

    } 
  
async handleMenuOption(to, option){
    let response
    switch(option){
        case 'option_1':
            this.appointmentState[to] = {step:'name', timestamp: Date.now()}
            response= 'Por Favor, ingresa tu nombre:'
            break
        case 'option_2':  
            this.assistantState[to]= {step:'question', timestamp: Date.now()}
            response = 'Hola, soy Marbot, en que te puedo ayudar?'
            break
        case 'option_3':            
            response = 'Te esperamos en nuestra sucursal!'
            await this.sendLocation(to)
            break
        case 'option_4':           
            response = '¡que bien, me alegro mucho! , hay algo mas en que te pueda ayudar?'
            break
        case 'option_5':
             this.assistantState[to]= {step:'question', timestamp: Date.now()}
            response = '¡Por supuesto! dime que mas quieres consultar?'
            break
        case 'option_6':
            response = 'Te invitamos a hablar con un asesor de la sucursal'

            await this.sendContact(to)
            break

        default:
        response = 'Lo siento no entendi tu seleccion, por favor, elige una de las selecciones.'
          }    
          await whatsappService.sendMessage(to, response)}
  
async sendMedia(to, incomingMessage) {
    try {
      let mediaUrl, caption, type;

      switch (incomingMessage) {
        case 'audio':
          mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-audio.aac';
          caption = 'Bienvenida';
          type = 'audio';
          break;
        case 'video':
          mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-video.mp4';
          caption = '¡Esto es un video!'; // Fixed typo
          type = 'video';
          break;
        case 'image':
          mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-image.jpg'; // Replace with actual URL
          caption = '¡Esto es una imagen!';
          type = 'image';
          break;
        case 'document':
          mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-document.pdf'; // Replace with actual URL
          caption = '¡Esto es un documento!';
          type = 'document';
          break;
        default:
          throw new Error(`Not supported media type: ${incomingMessage}`);
      }

      await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
    } catch (error) {
      console.error('Error sending media:', {
        message: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

completeAppointment(to){
   const appointment =this.appointmentState[to]
   delete this.appointmentState[to]

   const userData = [
    to,
    appointment.name,
    appointment.city,
    appointment.project,
    appointment.email,
    new Date().toISOString()
   ]
   
   //console.log(userData);

  try {
    appendToSheet(userData);
    return `Gracias por agendar tu cita. 
    Resumen de tu cita:
    Nombre: ${appointment.name}
    Ciudad: ${appointment.city}
    Proyecto: ${appointment.project}
    Correo electrónico: ${appointment.email}
    
    Nos pondremos en contacto contigo pronto.`;
  } catch (error) {
    console.error('Error saving appointment:', error);
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
        response = "Gracias. Ahora, ¿Cuál es tu ciudad?"
        break;
      case 'city':
        state.city = message;
        state.step = 'project';
        response = '¿Que proyecto estas interesado?'
        break;
      case 'project':
        state.project = message;
        state.step = 'email';
        response = 'Por favor,  ingresa tu correo'; 
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (emailRegex.test(message)) {
        state.email = message;
        response = this.completeAppointment(to);
      } else {
        response = 'Por favor, ingresa un correo electrónico válido (ejemplo: usuario@dominio.com).';
      }
    }
    await whatsappService.sendMessage(to, response);
  }

async handleAssitantFlow(to, message) {
  const state = this.assistantState[to]
  let response


/* const menuMessage = 'La respuesta fue de tu ayuda?'
 const buttons = [
  {type: 'reply', reply: {id: 'option_4', title: 'Si, Gracias'}},
  {type: 'reply', reply: {id: 'option_5', title: 'Hacer otra pregunta'}},
  {type: 'reply', reply: {id: 'option_6', title: 'Asesor Sucursal'}},

 ]*/


if (state.step === 'question') {
    try {
      response = await getGrokResponse(message);
    } catch (error) {
      console.error('Error in getGrokResponse:', error);
      response = 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.';
    }
  }

  
  // delete this.assistantState[to]
  await whatsappService.sendMessage(to, response)

  //si la interaccion detona una alarma para comunicarse con un asesor real

  await whatsappService.sendInteractiveButtons(to, menuMessage, buttons)

}

async sendContact (to){
    const contact = {
      addresses: [
        {
          street: "123 Calle de las Mascotas",
          city: "Ciudad",
          state: "Estado",
          zip: "12345",
          country: "País",
          country_code: "PA",
          type: "WORK"
        }
      ],
      emails: [
        {
          email: "contacto@medpet.com",
          type: "WORK"
        }
      ],
      name: {
        formatted_name: "Asesor Marval",
        first_name: "MedPet",
        last_name: "Contacto",
        middle_name: "",
        suffix: "",
        prefix: ""
      },
      org: {
        company: "Marval",
        department: "Atención al Cliente",
        title: "Representante"
      },
      phones: [
        {
          phone: "+1234567890",
          wa_id: "1234567890",
          type: "WORK"
        }
      ],
      urls: [
        {
          url: "https://www.marval.com",
          type: "WORK"
        }
      ]
    }
    await whatsappService.sendContactMessage(to, contact)
}

async sendLocation(to){
  const latitude = 4.65898
  const longitude = -74.10811
  const name = 'Marval Bogota'
  const address = 'Cra. 69b Calle 26'

  await whatsappService.sendLocationMessage(to, latitude, longitude, name, address)
}

}
  //  const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-audio.aac'
   // const caption = 'Bienvenida'
   // const type ='audio'

  
      // const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-imagen.png';
    // const caption = '¡Esto es una Imagen!';
    // const type = 'image';

     //const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-video.mp4';
     //const caption = '¡Esto es una video!';
     //const type = 'video';

    //const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf';
    //const caption = '¡Esto es un PDF!';
    //const type = 'document';
    
     
    





export default new MessageHandler();
