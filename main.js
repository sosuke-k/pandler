const path = require('path')
const url = require('url')
const fs = require('fs');
const notifier = require('node-notifier')

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
let initDict = false

app.setAsDefaultProtocolClient(PROTOCOL)

const store = new Store({
  configName: 'settings',
  defaults: {
    'shell': '/bin/sh',
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
  commands.forEach(function(cmd) {
    hosts.push(cmd['host'])
    cmdDict[cmd['host']] = cmd
  });
}

function runCommand (urlObj, command) {
  try {
    let cmdStr = command['command']
      .replace('${host}', urlObj['host'])
      .replace('${pathname}', urlObj['pathname'])

    let args = cmdStr.split(' ')
    let cmd = args.shift()
    let options = {
      'shell': store.get('shell')
    }
    let child = require('child_process').spawn(cmd, args, options);
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
      } else {
        console.log("exit", code)
      }
    });
  } catch(error) {
    console.log(error)
    dialog.showErrorBox('error', error)
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
  let template = [{
    label: "Application",
    submenu: [
        { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
    ]}, {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

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
  initDict = true

  notifier.notify({
    icon: 'file://' + __dirname + '/assets/app-icon/png/128.png',
    title: 'atom',
    message: '/Users/katososuke/.ghq/github.com/sosuke-k/pandler',
    sound: true
  });
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
  if (!initDict) {
    updateCommands(store.get('commands'))
  }

  // parse url
  let urlObj = url.parse(urlStr, true);

  // get command corresponding host of url
  command = cmdDict[urlObj['host']]

  if (command) {
    // if command exists, run it
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

ipc.on('save-settings', function (event, arg) {
  shell = arg['shell']
  commands = arg['commands']
  let success1 = store.set('shell', shell)
  let success2 = store.set('commands', commands)
  updateCommands(commands)
  event.sender.send('return-save-settings', (success1 & success2))
})

ipc.on('get-settings', function (event) {
  settings = {
    'shell': store.get('shell'),
    'commands': store.get('commands')
  }
  event.sender.send('return-get-settings', settings)
})
