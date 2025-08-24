//este archivo se encarga de hacer todas las solicitudes, para no repetir codigo en el whatsappservice

import axios from "axios";
import config from '../../config/env.js'

const sendToWhatsApp = async(data) => {
    const baseUrl = `https://${config.BASE_URL}/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`
    const headers ={
        Authorization:`Bearer ${config.API_TOKEN}`
    }

    try {
        const response = await axios({
            method: 'POST',
            url: baseUrl,
            headers: headers,
            data, 
        } )   
         return response.data     
    } catch (error) {
        console.error(error)
    }
}

export default sendToWhatsApp
