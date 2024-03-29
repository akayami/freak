crontol-freak
=============

A mini service to monitor crons. It requires no configuration to add new crons. Crons can confiure it themselves.

API
=============
POST

/report/:namespace

Pings specific namespace, and set-ups monitoring.

Sample client:nodejs

```javascript
var http = require('http');

var body = JSON.stringify({
	frequency: 10000,
	threshold: 5,	// Number of failures required before alerts are sent out
	alert: [{
		type: 'email',
		data: {
			email: 'address@domain.com'
		}
	}, {
		type: 'hipchat',
		data: {
			room: 'roomname',
			key: 'key',
			from: 'user',
			color: 'yellow'
		}
	}]
})


http.request({
	host: 'localhost',
	port: 8081,
	method: 'POST',
	path: '/report/my-test-node',
	headers: {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(body)
	}
}).end(body);
```

Sample client:php

```php
<?php
$target = "http://localhost:8081/report/my-test-php";

$conf =
	['frequency' => 10000,
	'threshold' => 5,
	'alert' => [
		[
			'type' => 'email',
			'data' => [
				'email'=> 'email@localhost'
			]
		],
		[
			'type'=> 'hipchat',
			'data'=> [
				'room'=> 'room',
				'key'=> 'key',
				'from'=> 'cron',
				'color'=> 'yellow'
			]
		]
	]];

$encoded = json_encode($conf);

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL,$target);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $encoded);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$server_output = curl_exec ($ch);

curl_close ($ch);

if ($server_output == "OK") {
	echo "OK";
} else {
	echo "Failed";
}
```
GET

/remove/:namespace

Allows to remove monitoring of specific namespace

/silence/:namespace/:miliseconds

Allows to silence alerts for specific namespace for specific amount of time


Body Placeholders
=============
```javascript
let data = {
	name: 'your-namespace',
	frequency: 1000,
	threshold: 5,
	previousFailCount: 0,
	failCount: 0,
	reported: true,
	interval: null,
	miliseconds: 0,
	silence: null,
	silenceStart: null,
	stamp: 123422342342, // time in miliseconds
	statusURL: 'http://freak.yourdomain.com/status/namespace'
}
```

UI
=============
/status/:namespace

A way to view the state of a specific namespace

/list

List of all registered namespaces

Server
=============
Launch with `--dev` parameter to autofill some fake data
