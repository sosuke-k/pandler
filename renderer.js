const ipc = require('electron').ipcRenderer
const btn = document.getElementById('save-command')

btn.addEventListener('click', function (event) {
  let cmd = document.getElementById('input-command').value
  ipc.send('save-command', cmd)
  new Notification("Set command as " + cmd);
})

ipc.on('set-setting', (event, arg) => {
  console.log(arg)
  document.getElementById('input-command').value = arg
})

ipc.send('get-setting', 'command')
