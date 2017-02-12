const ipc = require('electron').ipcRenderer
const btn = document.getElementById('save-command')

ipc.on('return-save-settings', (event, arg) => {
  if (arg) {
    new Notification("Save settings");
  } else {
    new Notification("Failed to save settings");
  }
})

btn.addEventListener('click', function (event) {
  let settings = {
    'shell': document.getElementById('input-shell').value,
    'commands': [
      {
        'host': document.getElementById('input-host').value,
        'command': command = document.getElementById('input-command').value,
        // 'error': document.getElementById('input-error').value
      }
    ]
  }
  ipc.send('save-settings', settings)
})

ipc.on('return-get-settings', (event, settings) => {
  shell = settings['shell']
  command = settings['commands'][0] // not support more than one commands yet...
  document.getElementById('input-shell').value = shell
  document.getElementById('input-command').value = command['command']
  document.getElementById('input-host').value = command['host']
})

ipc.send('get-settings')
