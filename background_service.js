var Service = require('node-windows').Service;
// Create a new service object
var svc = new Service({
     name:'Taxbears Bot',
     description: 'A Discord bot for the Taxbears server.',
     script: 'bot.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.

svc.on('install',function(){
           svc.start();
});

svc.install();