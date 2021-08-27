const config = require('plain-config')();
const http = require('http');

const freq = (Math.floor((Math.random() * 10) + 1) * 1000000) + 10000000;
//var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: []});
// freq = 5000;
// var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: [{'type': 'email', 'data': {'email': 'patrick.salomon@jomediainc.com'}}]});
const body = JSON.stringify({
	frequency: freq,
	threshold: Math.floor(Math.random() * 10),
	alert: [{
		'type': 'email',
		'data': {'email': 'dude@localhost'}
	}, {'type': 'hipchat'}, {'type': 'toto'}]
});
http.request({
	host: 'localhost', port: config.port, method: 'POST',
	path: '/report/test-' + Math.floor(Math.random() * 10),
	headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}
}).end(body);