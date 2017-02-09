const electron = require('electron')
// Module to control application life.
const app = electron.app
const dialog = electron.dialog
const Tray = electron.Tray
const Menu = electron.Menu
const ipc = electron.ipcMain
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const fs = require('fs');
const Store = require('./store.js');

const store = new Store({
  configName: 'settings',
  defaults: {
    'command': 'pwd'
  }
});

console.log('store', store)

const PROTOCOL = 'pandler'

app.setAsDefaultProtocolClient(PROTOCOL)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null
let appIcon = null

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function onReady () {
  const iconName = process.platform === 'win32' ? 'windows-icon.png' : 'iconTemplate.png'
  const iconPath = path.join(__dirname, iconName)
  appIcon = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Set command',
    click: function () {
      createWindow()
    }
  },{
    role: 'quit'
  }])
  appIcon.setToolTip('Pandler')
  appIcon.setContextMenu(contextMenu)

  // let settings = null
  //
  // const settingPath = path.join(app.getPath('userData'), 'settings.json');
  // try {
  //   tmp = fs.readFileSync(settingPath)
  //   settings = JSON.parse(tmp);
  // } catch(error) {
  //   console.log('Failed to load ' + settingPath)
  //   settings = {'command': ''};
  //   fs.writeFileSync(settingPath, JSON.stringify(settings));
  // }
  // console.log(settings)

  let cmd = store.get('command')
  console.log(cmd)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', onReady)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }

  // if (appIcon) appIcon.destroy()

})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('open-url', function (event, urlStr) {
  try {

    console.log('open-url')
    urlObj = url.parse(urlStr, true);
    console.log(urlObj)

    cmdStr = store.get('command')
      .replace('${host}', urlObj['host'])
      .replace('${pathname}', urlObj['pathname'])
    console.log(cmdStr)

    args = cmdStr.split(' ')
    cmd = args.shift()
    require('child_process').spawn(cmd, args);

  } catch(error) {
    dialog.showErrorBox('Error', `You arrived from: ${urlStr}`)
  }

})

ipc.on('save-command', function (event, arg) {
  console.log('command', arg)
  store.set('command', arg)
})

ipc.on('get-setting', (event, arg) => {
  console.log(arg)
  console.log(store.get(arg))
  event.sender.send('set-setting', store.get(arg))
})
