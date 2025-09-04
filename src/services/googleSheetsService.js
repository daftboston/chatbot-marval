//importar credenciales
import path from 'path'
import { google } from 'googleapis'

import config from '../config/env.js';


const sheets = google.sheets('v4')

async function addRowToSheet (auth, spreadsheetId, values) {
    const request = {
        spreadsheetId,
        range: 'reservas',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource:{
              values: [values],              
        },
        auth,
    }

    try {
        const response = (await sheets.spreadsheets.values.append(request).data)
        return response
    } catch (error) {
         console.error(error)
    }
}

const appendToSheet = async (data) => {
    try {
        const auth = new google.auth.GoogleAuth({
           // keyFile: path.join(process.cwd(), 'credentials', 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        })

        const authClient = await auth.getClient()
        console.log('Successfully authenticated with Google Cloud!');
        const spreadsheetId = '1t_RKyNdgHmiYtHYnbG7c1yDm94Bjy4CKd50HIt-HR-Y'
         
        await addRowToSheet(authClient, spreadsheetId, data)
        return 'datos correctamente agregados'
    } catch (error) {
        console.error(error)
    }
}

export default appendToSheet
