const { Client } = require('pg');
const {config } = require('../config/config.js')


async function getConnection() {
 
  if (config.env ==='test') {
   
    
    const client = new Client({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName    
    });
    await client.connect();
    return client;
    
    

   } else {
    console.log(config.env);
   
    const client = new Client({
      host: 'losroques',
      port: 5434,
      user: 'adempiere',
      password: '*ad3mp13r3sf1d4.*',
      database: 'adempiere'    
    });  
    await client.connect();
    return client;
    
      
      
    } 
    

  

  
 
}



module.exports = getConnection;