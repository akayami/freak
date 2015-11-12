var config = require('plain-config')();
var winston = require('winston');
var cluster = require('cluster');
var logger = new(winston.Logger)(config.winston);
var numCPUs = require('os').cpus().length;

var workers = {};

if (cluster.isMaster) {
	// Fork workers.
	for (var i = 0; i < numCPUs; i++) {
		var worker = workers[i] = cluster.fork();
	}
	worker.on('message', function(msg) {
		switch(msg[type]) {
			case 'add':
				logger.info('Adding');
				break;
			default:
				logger.warn('Unknown message' + msg[type]);
				break;
		}
	});

	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
	});
} else {
	require('./index.js');
}
