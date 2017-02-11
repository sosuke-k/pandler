const path = require('path')
const url = require('url')
const fs = require('fs');

const electron = require('electron')
const app = electron.app
const dialog = electron.dialog
const Tray = electron.Tray
const Menu = electron.Menu
const ipc = electron.ipcMain
const BrowserWindow = electron.BrowserWindow

const Store = require('./store.js');
const PROTOCOL = 'pandler'
let mainWindow = null
let appIcon = null
let hosts = []
let cmdDict = {}

app.setAsDefaultProtocolClient(PROTOCOL)

const store = new Store({
  configName: 'settings',
  defaults: {
    'commands': [
      {
        'host': '*',
        'command': 'open ~/',
        'error': true
      }
    ]
  }
});

function updateCommands (commands) {
  console.log(commands)
  commands.forEach(function(cmd) {
    hosts.push(cmd['host'])
    cmdDict[cmd['host']] = cmd
  });
  console.log(hosts)
  console.log(cmdDict)
}

function runCommand (urlObj, command) {
  console.log(command)
  try {
    let cmdStr = command['command']
      .replace('${host}', urlObj['host'])
      .replace('${pathname}', urlObj['pathname'])
    console.log(cmdStr)

    let args = cmdStr.split(' ')
    let cmd = args.shift()
    let child = require('child_process').spawn(cmd, args);
    let errStr = ""
    child.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    child.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
      errStr += data
    });

    child.on('exit', function (code) {
      console.log('child process exited with code ' + code);
      if (errStr != '') {
        dialog.showErrorBox(cmdStr, errStr)
      }
    });
  } catch(error) {
    console.log(error)
  }
}

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.on('closed', function () {
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

  let commands = store.get('commands')
  updateCommands(commands)
}

app.on('ready', onReady)

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('open-url', function (event, urlStr) {
  console.log('open-url')

  let urlObj = url.parse(urlStr, true);
  console.log(urlObj)

  command = cmdDict[urlObj['host']]
  if (command) {
    runCommand(urlObj, command)
  } else {
    command = cmdDict['*']
    if (command) {
      runCommand(urlObj, command)
    } else {
      dialog.showErrorBox('No command match', urlStr)
    }
  }
})

ipc.on('save-command', function (event, arg) {
  console.log('command', arg)
  commands = arg['commands']
  let success = store.set('commands', commands)
  updateCommands(commands)
  event.sender.send('return-save-command', success)
})

ipc.on('get-setting', (event, arg) => {
  console.log(arg)
  console.log(store.get(arg))
  event.sender.send('return-get-setting', store.get(arg))
})
