import sendToWhatsApp from '../services/httpRequest/sendToWhatsApp.js'
import { addErrorMessage } from "openai/_vendor/zod-to-json-schema/errorMessages.mjs";







class WhatsappService {
    async sendMessage (to, body, messageId){
       const  data =  {
                    messaging_product: "whatsapp",
                    to,
                    text: { body },
                  }
       await sendToWhatsApp(data)
    }

    async markAsRead (messageId){
      const data = {
               messaging_product: "whatsapp",
               status: "read",
               message_id: messageId,
                  }

      await sendToWhatsApp(data)

    }

    async sendInteractiveButtons(to, bodyText, buttons){

      const data = {
                    messaging_product: "whatsapp",
                    to,
                    type: 'interactive',
                    interactive: {
                         type: "button",
                         body: { text: bodyText},
                         action: { buttons: buttons}
                         }
                        }
      await sendToWhatsApp(data)
    }
  
    //caption es opcional segun el tipo de archivo que estemos enviando
    async sendMediaMessage(to, type, mediaUrl, caption){
        
          const mediaObject = {}
          switch (type) {
            case 'image':
              mediaObject.image={link: mediaUrl, caption: caption}
              break
            case 'audio':
              mediaObject.audio={link:mediaUrl}
              break
            case 'video':
              mediaObject.video= {link: mediaUrl, caption: caption}
              break
            case 'document':
              mediaObject.document = {link:mediaUrl, caption: caption, filename:'medpet.pdf'}
              break
            
            default :
                throw new Error('Not soported Media type')               
            

          

         const data= {
                    messaging_product: "whatsapp",
                    to,
                    type: type,
                    ...mediaObject                
                        }

   
    
        await sendToWhatsApp(data)
  }
}


    //Enviar contacto en caso de emergencia
    async sendContactMessage (to, contact) {
      const data = {
                    messaging_product: "whatsapp",
                    to,
                    type: 'contacts',
                    contacts: [contact]
                  }


    await sendToWhatsApp(data)


    }

  async sendLocationMessage (to, latitude, longitude, name, address) {
       const   data = {
                    messaging_product: "whatsapp",
                    to,
                    type: 'location',
                    location: {
                      latitude: latitude, 
                      longitude: longitude, 
                      name: name,
                      address: address
                    }      
    }
    await sendToWhatsApp(data)
}
}

export default new WhatsappService