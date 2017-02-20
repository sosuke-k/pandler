'use strict';
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
const Store = require('./lib/store.js');
const Command = require('./lib/command.js');
const PROTOCOL = 'pandler';

let mainWindow = null;
let appIcon = null;
let hosts = [];
let cmdDict = {};
let initDict = false;

app.setAsDefaultProtocolClient(PROTOCOL);

const cmd = new Command();
console.log('cmd', cmd);
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


function createWindow () {
  mainWindow = new BrowserWindow({width: 720, height: 585});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'dist', 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.on('closed', function () {
    mainWindow = null
  });
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
  const appIcon = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Set command',
    click: function () {
      createWindow()
    }
  },{
    role: 'quit'
  }]);
  appIcon.setToolTip('Pandler');
  appIcon.setContextMenu(contextMenu);

  if (!cmd.init) {
    let commands = store.get('commands');
    cmd.update(commands);
  }

}


// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', onReady);

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('open-url', function (event, urlStr) {
  if (!cmd.init) {
    cmd.update(store.get('commands'));
  }

  let host = url.parse(urlStr, true)['host'];
  let command = cmd.dict[host];

  if (command) {
    // if command exists, run it
    let cmdStr = cmd.convert(urlStr, command['command']);
    // dialog.showErrorBox('command', command);

    // let urlObj = url.parse(urlStr, true);
    // let _cmdStr = cmdStr
    //   .replace('${host}', urlObj['host'])
    //   .replace('${pathname}', urlObj['pathname']);
    //
    // let command = _cmdStr;

    notifier.notify({
      icon: 'file://' + __dirname + '/assets/app-icon/png/128.png',
      title: host,
      message: cmdStr,
      sound: true
    });

    cmd.run(store.get('shell'), cmdStr, function(c, e) {
      dialog.showErrorBox(c, e);
    });
  } else {
    dialog.showErrorBox('No command match', urlStr)
  }
})

ipc.on('get-shell', function (event) {
  event.sender.send('return-get-shell', store.get('shell'));
})

ipc.on('save-shell', function (event, arg) {
  console.log(arg);
  store.set('shell', arg);
  notifier.notify({
    icon: 'file://' + __dirname + '/assets/app-icon/png/128.png',
    title: 'Saved shell',
    message: arg,
    sound: true
  });
})

ipc.on('get-commands', function (event) {
  event.sender.send('return-get-commands', store.get('commands'));
})

ipc.on('save-commands', function (event, arg) {
  console.log(arg);
  store.set('commands', arg);
  notifier.notify({
    icon: 'file://' + __dirname + '/assets/app-icon/png/128.png',
    title: 'Saved commands',
    message: arg.length.toString() + ' commands',
    sound: true
  });
})
