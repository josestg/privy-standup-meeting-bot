const fs      = require('fs')
const fname   = './settings.json'
class Config {
    constructor(){
        const payload = fs.readFileSync(fname)
        this.data = JSON.parse(payload)
        this.admins = []
    }

    static  getInstance() {
        if (Config.self == undefined) {
            console.log("Singleton Config was created!")
            Config.self = new Config();
            Config.change = false
        }
        return Config.self;
    }
    
    reload(){
        this.admins = [...this.data.admin]
        const payload = fs.readFileSync(fname)
        this.data = JSON.parse(payload)
        console.log(`${fname} was updated!`)
    }
}

fs.watchFile(fname,() => Config.change = true)
function parseSheetID(){
    const url = Config.getInstance().data.spreadsheetURL.split('/')
    let sheetID = ''

    url.forEach(element => {
        if(element.length==44){
            sheetID = element
        }
    })
    return sheetID
}

module.exports={
    getSettings: () => {
        if(Config.change==true) Config.getInstance().reload()
        Config.change==false
        return Config.getInstance().data
    },
    getAdmins: ()=>{
        if(Config.change==true) Config.getInstance().reload()
        Config.change==false
        return Config.getInstance().admins
    },
    parseSheetID,
}