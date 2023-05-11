const getConnection = require('./libs/postgres.js');
const {config } = require('./config/config.js')
const TelegramBot = require('node-telegram-bot-api');
const token = '6165556824:AAH9lnWlFkBeOslB8YKp4h-EgaEOl6jYaeU';
const bot = new TelegramBot(token, {polling: true});
const request = require('request');

bot.on('message', async (msg) => {
     
    
   try {

      var Registrar = "registrar";
      if (msg.text.toString().toLowerCase().indexOf(Registrar) === 0) {    
      
           bot.sendMessage(msg.chat.id, `Para completar el registro de usuario debe enviar este Id al departamento de Sistemas:${msg.from.id} numero del mensaje:${msg.message_id}`);
      
            // console.log(msg.chat.username);
            //console.log(msg.from.id);
            //console.log(msg.chat.id);
            //console.log(msg.text)
          // console.log(msg.message_id);
       
     }

     

        var Si = "si";
        if (msg.text.toString().toLowerCase().indexOf(Si) === 0 ){
          let status='';
          
          //console.log('Ticket Aprobado'); 
            let wamId = msg.from.id;
                      
            status = 'approved';
            
            let [SiWam,User,Org,Activity,Client,Table,Doc,Wam,Filas] = await SelectWam(wamId);
            
                  if (SiWam != 0) {
                    
                    const updatedby = 102;
                    await UpdateBotw(SiWam, Activity,updatedby);

            
                        let record_id = await SelectApprovedOrRejected(SiWam, Activity);
                    
                        if(record_id === 0)
                        await InsertBotW(status,SiWam,Wam,User,Activity,Table,Org,Client,Doc); // aqui incluye en la tabla botwsapp cuando es el 4to status y aprobado
            
          
                        }
                     
                        if (Filas === undefined || Filas === 0) {
                          bot.sendMessage(msg.from.id, "No existen documentos por procesar.");
                        } else if (Filas === 1) {
                          bot.sendMessage(msg.from.id, "Documento Aprobado: " + Doc );
                        } else if (Filas > 1) {
                          bot.sendMessage(msg.from.id, "Documento Aprobado: " + Doc + ". Tiene documentos pendientes por repuesta. Escriba (Si/No).Para procesar sus documentos pendientes");
                       }  
                        
                                   
        }

        var No = "no";
        if (msg.text.toString().toLowerCase().indexOf(No) === 0){
          let status='';
          let wamId = msg.from.id;
          
          
          status = 'rejected';
          let [SiWam,User,Org,Activity,Client,Table,Doc,Wam] = await SelectWam(wamId);

                if (SiWam != 0) {
                  const updatedby = 102;
                  await UpdateBotw(SiWam, Activity,updatedby);

            
                      let record_id = await SelectApprovedOrRejected(SiWam, Activity);
                      if(record_id === 0)
                      await InsertBotW(status,SiWam,Wam,User,Activity,Table,Org,Client,Doc); // aqui incluye en la tabla botwsapp cuando es el 4to status y aprobado
            
          
                        }

                        if (Filas === undefined || Filas === 0) {
                          bot.sendMessage(msg.from.id, "No existen documentos por procesar.");
                        } else if (Filas === 1) {
                          bot.sendMessage(msg.from.id, "Documento Rechazado: " + Doc );
                        } else if (Filas > 1) {
                          bot.sendMessage(msg.from.id, "Documento Rechazado: " + Doc + ". Tiene documentos pendientes por repuesta. Escriba (Si/No).Para procesar sus documentos pendientes");
                       }           

        }
    
   } catch (error) {
       
      console.error(error);
   }
     

});

bot.onText(/\/start/, (msg) => {
  

  bot.sendMessage(msg.from.id, "Hello estimado usuario " + msg.from.first_name + " este bot le enviara los documentos pendientes que requieren su aprobacion");
   
  
  });

  async function UpdateBotw (id_order, ad_wf_activity_id,updatedby){
    const Processed ='Y';
    const client = await getConnection();
    
    const rta= await client.query(`Update bot_wsapp set updated= '${FormatFecha()}', updatedby=${updatedby}, processed='${Processed}' where record_id=${id_order} and bot_wsapp_status not in ('approved','rejected') and processed='N' and ad_wf_activity_id=${ad_wf_activity_id}`);
   // console.log(`Update:c_order Numero de filas afectadas: ${rta.rowCount}`);
    client.end();
    
  }
  
  async function InsertBotW (stat,id_order,wamiden,user1_id,ad_wf_acti,ad_table, ad_org,ad_client,docno){
    const client = await getConnection();  
    
    
    const rta= await client.query(`insert into bot_wsapp (bot_wsapp_id,created,updated,createdby,updatedby
      ,isactive,processed,ad_client_id, ad_org_id, UUID, AD_WF_Activity_ID, User1_ID, 
      bot_wsapp_status,record_id,bot_wsapp_wamid,ad_table_id,documentno)
     values(nextval('bot_wsapp_seq') ,'${FormatFecha()}','${FormatFecha()}',100,100, 
    'Y','N',${ad_client},${ad_org},  getuuid(), ${ad_wf_acti}, ${user1_id},
    '${stat}', ${id_order},'${wamiden}','${ad_table}','${docno}')`);
    //console.log(`insert Numero de filas afectadas: ${rta.rowCount}`); 
  
    client.end();
  }

  function TratarLength(cadena){
  
    let length=cadena.length;
    if (length <=1) {
        length=`0${cadena}`;      
        return length
    }
   length=`${cadena}`;
   return length;
  }

  function FormatFecha(){
    const fecha= new Date(); 
    let fecha_format='';
    let[year,month,day,hour,minutes,second] = [fecha.getFullYear(), fecha.getMonth(),fecha.getDate(),fecha.getHours(),fecha.getUTCMinutes(),fecha.getSeconds()];
    year=TratarLength(year.toString());
    month=TratarLength((month+1).toString());
    day= TratarLength(day.toString());
    hour=TratarLength(hour.toString());
    minutes=TratarLength(minutes.toString());
    second= TratarLength(second.toString());
    fecha_format=(`${year}-${month}-${day} ${hour}:${minutes}:${second}`);

    return fecha_format
}

  async function SelectBd(IdOrder,ad_wf_activity_id){  // revisa si ya se mando un mensaje al usuario aprobador (no lo puede volver a enviar)
    let NumR = 0;
    const client = await getConnection();   
    const rta= await client.query(`SELECT * FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and ad_wf_activity_id=${ad_wf_activity_id}`); 
   
    if (rta.rowCount > 0) { 
                  
        
        NumR = 1;
     }
     client.end();
     return NumR;
   }

   async function SelectResent(IdOrder, ad_wf_activity_id){  // revisa si el status es resent (para volverlo a enviar)
    let resent_id = 0;
    const client = await getConnection();   
    const rta= await client.query(`SELECT bot_wsapp_id FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and bot_wsapp_status='resent' and processed='N' and ad_wf_activity_id=${ad_wf_activity_id}`); 
  
    if (rta.rowCount > 0) {
       resent_id = rta.rows[0].bot_wsapp_id;
     }
     client.end();
     return resent_id;
   }

   async function SelectWam(IdWam){  // revisa por el codigo Id mssg de whatsapp, si existe, manda los atributos
    let NumR = 0;
    let NumUs = 0;
    let NumOrg = 0;
    let NumAct = 0;
    let NumClient = 0;
    let NumTable = 0;
    let NumFil = 0;
    let Document = '';
    let WamId = '';
    let i = 0;

  
  
     const client = await getConnection();     
     const rta= await client.query(`SELECT * FROM bot_wsapp where bot_wsapp_wamid like '${IdWam}%' and processed ='N' and bot_wsapp_status ='sent'`);
     
     if (rta.rowCount > 0) {
      
        NumR = rta.rows[i].record_id;
        NumUs = rta.rows[i].user1_id;
        NumOrg = rta.rows[i].ad_org_id;
        NumAct = rta.rows[i].ad_wf_activity_id;
        NumClient = rta.rows[i].ad_client_id;
        NumTable = rta.rows[i].ad_table_id;
        Document = rta.rows[i].documentno;
        WamId = rta.rows[i].bot_wsapp_wamid;
        NumFil = rta.rowCount
     }
     client.end();
    
     return [NumR,NumUs,NumOrg,NumAct,NumClient,NumTable,Document,WamId,NumFil];  
     
   }

   async function SelectApprovedOrRejected(IdOrder, ad_wf_activity_id){  // revisa si ya se mando un mensaje al usuario aprobador (no lo puede volver a enviar)
    let bot_wsapp_id = 0;
     const client = await getConnection();   
    const rta= await client.query(`SELECT bot_wsapp_id FROM bot_wsapp where record_id = ${IdOrder} and isactive='Y' and bot_wsapp_status IN ('approved','rejected') and ad_wf_activity_id=${ad_wf_activity_id}`); 
  
    if (rta.rowCount > 0) {
      bot_wsapp_id = rta.rows[0].bot_wsapp_id;
     }
     client.end();
     return bot_wsapp_id;
   }
  


  async function Listening(){
    let record_id = 0;
    let ad_table_id = 0;
    let ad_org_id = 0;
    let user1_id = 0;
    let ad_wf_activity_id = 0;
    let ad_client_id = 0;
    let documentno =' ';
    let user =' '; 
    let c_costo =' ';
    let description =' ';
    let monto_base=' ';
    let moneda =' ';
  
    

    try {
      const WfState = "OS";
      const processed = "N";
      const Table = 259;
      const Table2 = 702;
      const SendNoti = "Y";
      const adclient = 1000000;
  
      const ResId = 101;
      let SendOn = 0;
      let Cadena = '';
  
      //console.log("estoy escuchando la BD");
  
      const client = await getConnection();
  
      const rta =
        await client.query(`SELECT oc.c_order_id As DocT,oc.documentno,oc.created, oc.user1_id, awfp.ad_wf_process_id, awfa.ad_wf_activity_id, awfa.ad_table_id, awfp.record_id, awfp.processed, awfa.ad_wf_responsible_id, au.name AS user, au.email, au.phone,au.title,oc.ad_client_id,oc.ad_org_id,oc.createdby, oc.isapproved as Aprobada, oc.docstatus AS Status,oc.totallines AS monto,oc.description, cc.name AS ccosto, ccu.iso_code as moneda
  
    FROM ad_wf_process  AS awfp 
    JOIN ad_wf_activity AS awfa ON awfa.ad_wf_process_id = awfp.ad_wf_process_id
    join ad_wf_node as awfn on awfa.ad_wf_node_id = awfn.ad_wf_node_id 
    JOIN ad_user        AS au   ON au.ad_user_id = awfa.ad_user_id
    JOIN c_order        AS oc   ON awfp.record_id = oc.c_order_id
    join c_elementvalue as cc on oc.user1_id=cc.c_elementvalue_id
    JOIN c_currency as ccu on oc.c_currency_id = ccu.c_currency_id
    WHERE awfp.wfstate= '${WfState}'
    and awfa.wfstate= '${WfState}'
    and awfa.processed = '${processed}'
    AND awfa.ad_table_id = ${Table} -- order table 
    AND awfn.sendwsnotification = '${SendNoti}'
    AND awfp.ad_client_id = ${adclient}
  
    UNION
  
    SELECT req.m_requisition_id As DocT,req.documentno,req.created, req.user1_id, awfp.ad_wf_process_id, awfa.ad_wf_activity_id, awfa.ad_table_id, awfp.record_id, awfp.processed, awfa.ad_wf_responsible_id, au.name AS user, au.email, au.phone,au.title,req.ad_client_id,req.ad_org_id,req.createdby, req.isapproved as Aprobada, req.docstatus AS Status,req.totallines AS monto,req.description, cc.name AS ccosto, ccu.iso_code as moneda
  
    FROM ad_wf_process  AS awfp 
    JOIN ad_wf_activity AS awfa ON awfa.ad_wf_process_id = awfp.ad_wf_process_id
    join ad_wf_node as awfn on awfa.ad_wf_node_id = awfn.ad_wf_node_id 
    JOIN ad_user        AS au   ON au.ad_user_id = awfa.ad_user_id
    JOIN m_requisition        AS req   ON awfp.record_id = req.m_requisition_id
    join c_elementvalue as cc on req.user1_id=cc.c_elementvalue_id
    JOIN c_currency as ccu on req.c_currency_id = ccu.c_currency_id
    WHERE awfp.wfstate= '${WfState}'
    and awfa.wfstate= '${WfState}'
    and awfa.processed = '${processed}'
    AND awfa.ad_table_id = ${Table2} -- order table 
    AND awfn.sendwsnotification = '${SendNoti}'
    AND awfp.ad_client_id = ${adclient}
    
    ORDER BY 1`);
  
     console.log('Documentos en procesos: '+rta.rowCount);
      if (rta.rowCount > 0) {
        let i = 0;
  
        while (i < rta.rowCount) {
          
          if (rta.rows[i].title != null) {
            
            record_id = rta.rows[i].record_id;
            user1_id = rta.rows[i].user1_id;
            ad_wf_activity_id = rta.rows[i].ad_wf_activity_id;
            ad_table_id = rta.rows[i].ad_table_id;
            ad_org_id = rta.rows[i].ad_org_id;
            ad_client_id = rta.rows[i].ad_client_id;
            documentno = rta.rows[i].documentno;
            user = rta.rows[i].user;
            c_costo = rta.rows[i].ccosto;
            monto_base = (rta.rows[i].monto).toString() || '0';
            description = rta.rows[i].description || ' ' ;          
            description = description.split("\n").join("");          
            description = description.substring(0,80);          
            moneda = rta.rows[i].moneda; 
            //console.log(documentno);
            SendOn = await SelectBd(record_id, ad_wf_activity_id);
            //console.log(SendOn);
  
            let resent_id = await SelectResent(record_id, ad_wf_activity_id);
  
            if (SendOn === 0 || resent_id > 0) {
             
              monto_base = (new Intl.NumberFormat().format(monto_base));
             
  
              EnviarMssgText(
                rta.rows[i].title,
                record_id,
                user1_id,
                ad_wf_activity_id,
                ad_table_id,
                ad_org_id,
                ad_client_id,
                documentno,
                user,
                c_costo,
                monto_base,
                description,
                moneda
              );
            } else {
              //console.log("Consiguio pero no envio");
            }
          }
  
          i = i + 1;
        }
      } else {
        console.log("No se han conseguido registro en la tabla");
      }
  
      client.end();
    } catch (error) {
      console.error(error);
      console.log("Ocurrio un error se esta reiniciando la app ...");
    } 
  }
  
  
    
   

      // function EnviarMssg() {
      //   console.log("Entrando");
      //   const options = {
      //     method: 'POST',
      //     url: 'https://api.telegram.org/bot6165556824%3AAAH9lnWlFkBeOslB8YKp4h-EgaEOl6jYaeU/sendDocument',
      //          'https://api.telegram.org/bot6165556824%3AAAH9lnWlFkBeOslB8YKp4h-EgaEOl6jYaeU/sendMessage'
      //     headers: {
      //       accept: 'application/json',
      //       'User-Agent': 'Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)',
      //       'content-type': 'application/json'
      //     },
      //     body: {
      //       document: "http://www.unimet.edu.ve/wp-content/uploads/sites/3/2015/05/Facturas-segun-el-SENIAT.pdf",
      //       caption: 'Seleccione (Si/No) para continuar con el proceso. Gracias',
      //       disable_notification: false,
      //       reply_to_message_id: null,
      //       chat_id: '1974958370',
      //       reply_markup: {
      //       keyboard: [["Si", "No"]],
      //       resize_keyboard: true,
      //       one_time_keyboard: true
      //       }
      //     },
      //     json: true
      //   };
        
      //   request(options, function (error, response, body) {
      //     if (error) throw new Error(error);        
      //     console.log(body);
      //   });


      // }

  

  async function EnviarMssgText(NroPhone,NroReq,NroUser,NroAct,NroTab,NroOrg,NroClient,DocNo,NamU,Ccosto,Amount,Descr,Moneda){
   
    let id = parseInt(NroPhone);
     
     // bot.sendMessage(msg.from.id, "Hello estimado usuario " + msg.from.first_name + " este bot le enviara los documentos pendientes que requieren su aprobacion");
       bot.sendMessage(id,`Saludos estimado ${NamU}. Se le notifica del documento:${DocNo} correspondiente al centro de costo ${Ccosto}.Detalles del proceso: \nDescripcion: ${Descr} \nMonto: ${Amount} ${Moneda}.\nSeleccione! Por favor indique (Si/No) para completar el proceso.`,{
        "reply_markup": {
            "keyboard": [["Si", "No"]],
            "resize_keyboard" : true,
            "one_time_keyboard" : true
  
            }
            
        });
           const updatedby = 104;  
           const state = 'sent';
           const WamId = id + DocNo
           
             await UpdateBotw(NroReq, NroAct,updatedby);
             await InsertBotW(state,NroReq,WamId,NroUser,NroAct,NroTab,NroOrg,NroClient,DocNo);

        
     }

     function main(){
      try {
        
        setInterval (Listening, 30000);
    
        console.log('Nuestro bot Telegram esta funcionando');

        
      } catch (error) {
        
        console.error(error);
        console.log('Ocurrio un error se esta reiniciando la app ...');     
      }
      
     }
  

main();

