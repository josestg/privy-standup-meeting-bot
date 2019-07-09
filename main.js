const TelegramBot   = require("node-telegram-bot-api")
const db            = require('./app/DataTransaction')
const helper        = require('./app/helper/helper')
const { Report }    = require('./app/Report')
const { TakeOfferTask } = require('./app/TakeOfferTask')
const {CrudProject}            = require('./app/CrudProject')
const lookUp        = {} 
const bot           =  new TelegramBot(process.env.BOT_TOKEN, {polling:true})
const {Tasks} = require('./app/Tasks.js')
const {Menu} = require('./app/menu')
const cron = require('node-cron')


// global var
const currentState={}
/**
 * accept any message
 * response has additional : done (boolean), 
 * if true then remove currentState
 */
bot.on("message", async context=>{
    const {from,chat,text}=context
    if(currentState[from.id]){
        console.log(text)
        console.log(from.id, 'Type Listen')
        const currentApp = lookUp[`${currentState[from.id]}@${from.id}`]
        const response = await currentApp.listen('onTypeListen',context)
        console.log(from.id, `currentState ${currentState[from.id]} deleted`)
        if(response && response.destroy==true){
            delete lookUp[`${currentState[from.id]}@${from.id}`]
        }
        delete currentState[from.id]
        handleRespond(response, from.id, context.message_id)
    }

})

bot.on('polling_error',msg=>{
    console.log(msg)
})

bot.onText(/\/menu/, (context, match)=>{
    const {from,chat} = context
    
    const menu = new Menu(bot,from.id)

    lookUp[`Menu@${from.id}`] = menu
    menu.onMain(context)
})

bot.onText(/\/addTasks/, (context, match)=>{
    const {from} = context
    try{
        lookUp[`addTasks@${from.id}`] = new Tasks(from.id, 'addTasks', from.first_name)
        currentState[from.id]='addTasks'
        console.log(from.id, `created 'addTasks@${from.id}' lookup`)
        console.log(from.id, `lock user in state 'addTasks'`)
        const response={
            message:`Silahkan ketik nama task(s) mu`,
            options:{
                reply_markup:{
                    resize_keyboard:true,
                    keyboard:[['CANCEL']]
                }   
            }
        }
        handleRespond(response, from.id)
    }catch(e){
        console.log(e)
    }
})

bot.onText(/\/assignTasks/, (context, match)=>{
    const {from} = context
    try{
        lookUp[`assignTasks@${from.id}`] = new Tasks(from.id, 'assignTasks')
        currentState[from.id]='assignTasks'
        console.log(from.id, `created 'assignTasks@${from.id}' lookup`)
        console.log(from.id, `lock user in state 'assignTasks'`)
        const response={
            message:`Silahkan ketik nama task(s) mu yang akan di assign`,
            options:{
                reply_markup:{
                    resize_keyboard:true,
                    keyboard:[['CANCEL']]
                }   
            }
        }
        handleRespond(response, from.id)
    }catch(e){
        console.log(e)
    }
})
bot.onText(/\/showTasks/, async (context, match)=>{
    const {from}=context
    try{
        let response = await currentApp.showTasks(from)
        handleRespond(response, from.id)
    }catch(e){
        console.log(e)
    }
})

function initTasks(prefix, userID, name){
    try{
        lookUp[`${prefix}@${userID}`] = new Tasks(userID, prefix, name)
        currentState[userID]=prefix
        console.log(userID, `created '${prefix}@${userID}' lookup`)
        console.log(userID, `lock user in state '${prefix}'`)
        const response={
            message:`Silahkan ketik nama task(s) mu yang akan di assign`,
            options:{
                reply_markup:{
                    resize_keyboard:true,
                    keyboard:[['CANCEL']]
                }   
            }
        }
        handleRespond(response, userID)
    }catch(e){
        console.log(e)
    }
}

bot.on('callback_query', async query => {
    try {
        const {from, message, data:command} = query
        const [lookUpKey, action, address] = command.split('-')
        const currentApp = lookUp[lookUpKey]
        const response = await currentApp.listen(action,address)
        handleRespond(response, from.id, message.message_id)
        if(response && response.destroy==true){
            delete lookUp[currentApp.prefix]
        }
    } catch (error) {
        console.error("Error on bo.on('callback_query') (main.js)", error.message)
    }
    
})

function handleRespond(response, to, message_id) {
    /**
     * response = {
     *     type : type case (ex."Edit") (required!)
     *     from : prefix,
     *     message: message
     *     options: inlineKeyboardOption
     *     deleteLast : boolean
     *     agrs : any
     * }
     */

    if(!response) return

    const {type} = response
    console.log(`message_id :${message_id}`)
    if(type=="Edit"){
        if(response.message=='Back'){
            bot.deleteMessage(to,message_id)
        }else{
            bot.editMessageText(response.message,{
                message_id:message_id,
                chat_id:to,
                ...response.options
            })
        }
    }else if(type=="Delete"){
        bot.deleteMessage(response.id, message_id)
    }else if(type=="Confirm"){
        const {sender, receiver} = response
        handleRespond(sender, sender.id, message_id)
        handleRespond(receiver, receiver.id,message_id)

    }else if(type=="Auto"){
        handleAuto(response.message)
        bot.sendMessage(to, response.message).then(async context=> await handleAuto(context) )
    }
    else{
        if(response.multiple===true){
            bot.sendMessage(response.to.userID, response.messageTo, response.options)   
        }
        // bot action
        bot.sendMessage(to, response.message, response.options)
    }
    if(response.listenType===true){
        currentState[response.userID]=response.prefix
        console.log(response.userID, `lock user in state '${response.prefix}'`)
    }
}

//  UserReport trigger
bot.onText(/\/req/, async context => {
    const {from, message_id} = context
    const {id, first_name:name}  = from
    const response = await initUserReport(id, name, message_id)
    if(!response.active) await bot.sendMessage(id, response.message,response.options)
    bot.deleteMessage(id, message_id)

})

bot.onText(/\/offer/, async context => {
    const {from, message_id} = context
    const {id, first_name:name}  = from
    const response = await initOfferTask(id, name, message_id)
    if(!response.active) await bot.sendMessage(id, response.message,response.options)
    bot.deleteMessage(id, message_id)
})


// handling tringer from 'bot'
async function handleAuto(context){
    const {text, chat, message_id} = context
    let response;
    switch (text){
        case '/offer':
            response = await initOfferTask(chat.id, chat.first_name, message_id)
            if(!response.active) await bot.sendMessage(chat.id, response.message,response.options)
            bot.deleteMessage(chat.id, message_id)
            break
        case '/report':
            response = await initUserReport(chat.id, chat.first_name, message_id)
            if(!response.active) await bot.sendMessage(chat.id, response.message,response.options)
            bot.deleteMessage(chat.id, message_id)
            break
        case '/addTasks':
            bot.deleteMessage(chat.id, message_id)
            await initTasks('addTasks', chat.id, chat.first_name)
            break
        case '/assignTasks':
            bot.deleteMessage(chat.id, message_id)
            await initTasks('assignTasks', chat.id, chat.first_name)
            break
        case '/showTasks':
            bot.deleteMessage(chat.id, message_id)
            lookUp[`showTasks@${chat.id}`] = new Tasks(chat.id, 'showTasks', chat.name)
            const currentApp=lookUp[`showTasks@${chat.id}`]
            let response = await currentApp.showTasks(chat)
            handleRespond(response, chat.id)
            break
        default:
            console.log("waiting...")
            break

    }
}

// Register Current User to lookUp as Report@userId
async function initOfferTask(id, name){
    const prefix = `TakeOfferTask@${id}`
    // user report was regitered
    const  response = {
        message:`Halo *${name}* semua task Anda sudah *Done*.`,
        options:{
            parse_mode: 'Markdown',
            reply_markup:{}
        }
    }
    await db.getUserTasks(id).then( results => {
        if(results.length!=0){ 
            const projects = helper.parseToReportFormat(results)
            const {inlineKeyboard, addrs} = helper.generateTasksKeyboard( projects[id], prefix, "Process","Cancel")
            // regiter current user to lookUp as Report@userId
            lookUp[prefix] = new TakeOfferTask(projects[id], id, name, inlineKeyboard).addCache(prefix, addrs)
            response.options.reply_markup = { inline_keyboard:inlineKeyboard }
            response.message = `Halo *${name}* Berikut adalah task Anda yang masih *In Progress*. Pilih task yang yang akan di *Tawarkan*.`
        }
    })
    return response
}



// Register Current User to lookUp as Report@userId
async function initUserReport(id, name){
    const prefix = `Report@${id}`
    // user report was regitered
    if(prefix in lookUp) return {active:true}
    const  response = {
        message:`Halo *${name}* semua task Anda sudah *Done*.`,
        options:{
            parse_mode: 'Markdown',
            reply_markup:{}
        }
    }
    await db.getUserTasks(id).then( results => {
        if(results.length!=0){ 
            const projects = helper.parseToReportFormat(results)
            const {inlineKeyboard, addrs} = helper.generateTasksKeyboard( projects[id], prefix)
            // regiter current user to lookUp as Report@userId
            lookUp[prefix] = new Report(projects[id], id, name, inlineKeyboard).addCache(prefix, addrs)
            response.options.reply_markup = { inline_keyboard:inlineKeyboard }
            response.message = `Halo *${name}* Berikut adalah task Anda yang masih *In Progress*. Pilih task yang sudah *Done*.`
        }
    })
    return response
}

/**
 * function for projects
 */

bot.onText(/\/createProjects/, async context => {
    const {chat} = context
    initProjects('createProjects', chat.id, chat.first_name)
})

function initProjects(prefix, userID, name){
    try{
        lookUp[`${prefix}@${userID}`] = new CrudProject(userID, name, prefix)
        currentState[userID]=`${prefix}`
        console.log(userID, `created '${prefix}@${userID}' lookup`)
        console.log(userID, `lock user in state '${prefix}'`)
        const response={
            message:`Silahkan ketik nama project yang akan di input`,
            options:{
                reply_markup:{
                    resize_keyboard:true,
                    keyboard:[['CANCEL']]
                }   
            }
        }
        handleRespond(response, userID)
    }catch(e){
        console.log(e)
    }
}



// /**
//  * Cron function for reminder every 9 A.M
//  * The function get data from database and check if user is active or not
//  */
// cron.schedule('* * * * *',()=>{
//     getUsersData('all').then(results=>{
//         results.forEach(user=>{
//             let currentDate = new Date()
//             if(user.status==='active'){
//                 bot.sendMessage(user.userID, 
//                 `Selamat Pagi <a href='tg://user?id=${user.userID}'>${user.name}</a>, 
//                 Laporkan progress mu saat ini`,{
//                     parse_mode:'HTML',
//                     reply_markup: {
//                         inline_keyboard:[
//                             [ 
//                                 {
//                                     text: `${em.add} Add Task(s)`, 
//                                     callback_data: 'addTask-OnInsertTask-'+user.userID
//                                 } 
//                             ],
//                             [ 
//                                 {
//                                     text: `${em.laptop} Show Tasks`, 
//                                     callback_data: 'addTask-OnShowTask-'+user.userID
//                                 }
//                             ]
//                         ]
//                     }
//                 }).then(()=>{
//                     console.log('Send message to '+user.name+' at '+currentDate)
//                 }).catch(e=>{
//                     console.log('Failed send message to '+user.name+' in '+currentDate)
//                     console.log('Caused by : '+e.message)
//                 })        
//             }else{
//                 console.log(user.name+' is inactive, not sending message')
//             }
//         })
//         console.log('\n')
//     })  
// })

// /**
//  * Function to send message every 1 P.M
//  * To remind users and check their progress
//  * Messages send to all users
//  */
// cron.schedule('* * 13 * * *',()=>{
//     //Implements function to send messages here
// })


// /**
//  * Set a user active or not based on day-off databases
//  * 
//  */
// cron.schedule('* * * * *',()=>{
//     checkDayOff().then(results=>{
//         getUsersData('all').then(result=>{
//             result.forEach(user=>{
//                 if(results.includes(user.userID)){
//                     updateUser(user.userID,{status:'inactive'})
//                 }else{
//                     updateUser(user.userID,{status:'active'})
//                 }
//             })
//         })
//     })
// })


