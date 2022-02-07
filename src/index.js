const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { windowManager } = require("node-window-manager");
const request = require('request');

const Store = require('electron-store');
const store = new Store({
  default: {
    settings: {
      theme: "dark",
      rounded: false,
      font: "Kristen ITC"
    }
  }
});

/*
  Load food from cngmat
*/
let food = null;
let url = "https://melo.se/cngmat/getadjusted";

let options = {json: true};

function loadFood(foodWindow) 
{
  request(url, options, (error, res, body) => 
  {

      if (error) 
      {
          return  console.log(error)
      };

      if (!error && res.statusCode == 200) 
      {
        console.log(body);
        food = JSON.parse(JSON.stringify(body));
      };

  });
}
loadFood();


function createFoodWindow () 
{
  console.log("Create window")

  window = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(__dirname,  'icon.png'),
      width: 700,
      height: 400,
      x: screen.getPrimaryDisplay().bounds.width-700,
      y: 0,
      alwaysOnTop: true,
      skipTaskbar: true,
      title: "CNGMAT",
      frame: false,
      autoHideMenuBar: true,
      hasShadow: false,
      titleBarStyle: 'hidden',
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    })

  window.loadURL(`file://${__dirname}/foodViewer.html`)
  window.openDevTools()

  window.on('close', function() {
    console.log("Closing foodviewer")
    window = null;
  })

  return window;
}

function createSettingsWindow()
{
  window = new BrowserWindow({
    //width: 1000,
    //heigth: 1000*(16/9),
    title: "CNG MAT INSTÄLLNINGAR",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  window.loadURL(`file://${__dirname}/settingsWindow.html`)
}

app.on('ready', () => 
{
  createSettingsWindow();

  let foodWindow = createFoodWindow();
  foodWindow.hide();

  let oldStatus = false;

  setInterval(() => 
  {
    if(foodWindow.isDestroyed() && food) {
      foodWindow = createFoodWindow();
      foodWindow.hide();
    };

    const window = windowManager.getActiveWindow();

    // Is startmenu open
    let windowMatch = new RegExp(/searchapp.exe|StartMenuExperienceHost.exe/gi)
    let status = windowMatch.test(window.path.toLowerCase())

    if(status != oldStatus) 
    {

      if(status) 
      {
        if(!food || foodWindow.isDestroyed()) return loadFood(); // Try to get the food if no food is loaded

        foodWindow.show();

      } else if(foodWindow) 
      {

        foodWindow.hide();

      }
    }

    oldStatus = status;

  }, 100)

  setInterval(() =>  { // Update food every 2 hours
    loadFood()
  }, 1000*60*60*2)


  


  // Communication
  ipcMain.on('ready', (event) =>
  {

    console.log("Client ready")

    event.reply('data', food, store.get("settings"))

  })


  ipcMain.on('getSettings', async (event) => {

    event.reply('getSettings', JSON.stringify( await store.get("settings")));

  })
  ipcMain.on('setSetting', (event, key, val) => {

    store.set("settings." + key, val)
    
  })

});

// Keep app running even if all windows are closed
app.on('window-all-closed', e => e.preventDefault() )
