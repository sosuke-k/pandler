const ipc = require('electron').ipcRenderer
const btn = document.getElementById('save-command')

ipc.on('return-save-command', (event, arg) => {
  if (arg) {
    new Notification("Save commands");
  } else {
    new Notification("Failed to save commands");
  }
})

btn.addEventListener('click', function (event) {
  let settings = {
    'commands': [
      {
        'host': document.getElementById('input-host').value,
        'command': command = document.getElementById('input-command').value,
        // 'error': document.getElementById('input-error').value
      }
    ]
  }
  ipc.send('save-command', settings)
})

ipc.on('return-get-setting', (event, arg) => {
  command = arg[0] // not support more than one commands yet...
  document.getElementById('input-command').value = command['command']
  document.getElementById('input-host').value = command['host']
})

ipc.send('get-setting', 'commands')
