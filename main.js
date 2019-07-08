const TelegramBot   = require("node-telegram-bot-api")
const {Tasks} = require('./app/Tasks.js')


const bot =  new TelegramBot(process.env.BOT_TOKEN, {polling:true})

// global var
const lookUp = {}
const currentState={}
/**
 * accept any message
 * response has additional : done (boolean), 
 * if true then remove currentState
 */
bot.on("message", async context=>{
    const {from,chat,text}=context
    if(currentState[from.id]){
        console.log(from.id, 'Type Listen')
        const currentApp = lookUp[`${currentState[from.id]}@${from.id}`]
        const response = await currentApp.listen('onTypeListen',context)
        handleRespond(response, from.id, context.message_id)
        console.log(from.id, `currentState ${currentState[from.id]} deleted`)
        delete currentState[from.id]
    }

})

bot.onText(/\/menu/, (context, match)=>{
    console.log("menu")
    const {from} = context
    bot.sendMessage(from.id, `Halo *${from.first_name}*!`, {
        'parse_mode': 'Markdown',
    })
})

bot.onText(/\/addTasks/, (context, match)=>{
    const {from} = context
    try{
        lookUp[`addTasks@${from.id}`] = new Tasks(from.id, 'addTasks')
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



bot.on('callback_query', async query => {
    try {
        const {from, message_id, data:command} = query
        const [lookUpKey, action, address] = command.split('-')
        const currentApp = lookUp[lookUpKey]
        const response = await currentApp.listen(action,address)
        handleRespond(response, from.id, message_id)
    } catch (error) {
        console.error("Error on callback_query", error)
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
    if(type=="Edit"){
        bot.editMessageText(response.message,{
            message_id:message_id,
            chat_id:to,
            ...response.options
        })
    }else{
        bot.sendMessage(to, response.message, response.options)
    }
    if(response.listenType===true){
        currentState[response.userID]=response.prefix
        console.log(response.userID, `lock user in state '${response.prefix}'`)
    }
}