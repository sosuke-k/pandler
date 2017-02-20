const electron = require('electron');
const path = require('path');
const url = require('url')
const fs = require('fs');

class Command {
  constructor() {
    console.log('Command', 'constructor');
    this.init = false;
    this.hosts = [];
    this.dict = {};
  }

  update(commands) {
    console.log('update', commands);
    console.log(this.hosts);
    try {
      let _this = this;
      commands.forEach(function(cmd) {
        _this.hosts.push(cmd['host'])
        _this.dict[cmd['host']] = cmd
      });
      this.init = true;
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  convert(urlStr, cmdStr) {
    try {
      let urlObj = url.parse(urlStr, true);
      let _cmdStr = cmdStr
        .replace('${host}', urlObj['host'])
        .replace('${pathname}', urlObj['pathname'])

      return _cmdStr;
    } catch(error) {
      console.log(error)
      return false;
    }
  }

  run(shell, cmdStr, callback) {
    try {
      let args = cmdStr.split(' ');
      let cmd = args.shift();
      let options = {
        'shell': shell
      };
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
          callback(cmdStr, errStr)
        } else {
          console.log("exit", code)
        }
      });
    } catch(error) {
      console.log(error)
      callback('error', error)
    }
  }

}

module.exports = Command;
