'use strict';

var Service = require('node-windows').Service;
// Create a new service object
var svc = new Service({
     name:'TaxBot',
     description: 'A Discord bot for the Taxbears server.',
     script: 'bot.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.

svc.on('install',function(){
           svc.start();
           console.log(svc);
});

svc.install();

console.log(svc.script);