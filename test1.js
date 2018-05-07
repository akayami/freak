const sprintf = require('sprintf-js').sprintf;


console.log(sprintf(' test %(item)s', {item: 'hello'}));