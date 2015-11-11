var http = require('http');

var body = JSON.stringify({
	frequency: 10000,
	alert: [{
		type: 'email',
		data: {
			email: 'tomasz.rakowski@jomediainc.com'
		}
	}]
})


http.request({
	host: 'localhost',
	port: 8081,
	method: 'POST',
	path: '/add/test',
	headers: {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(body)
	}
}).end(body);
