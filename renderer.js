const ipc = require('electron').ipcRenderer
const btn = document.getElementById('save-command')

ipc.on('return-save-command', (event, arg) => {
  console.log(arg)
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
        'error': document.getElementById('input-error').value
      }
    ]
  }
  ipc.send('save-command', settings)
})

ipc.on('return-get-setting', (event, arg) => {
  console.log(arg)
  document.getElementById('input-command').value = arg
})

ipc.send('get-setting', 'command')
