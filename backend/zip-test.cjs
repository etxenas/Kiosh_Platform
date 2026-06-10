const archiver = require('archiver');
console.log('archiver type:', typeof archiver);
const a = archiver('zip');
console.log('a is:', typeof a);
console.log('keys:', Object.keys(a).slice(0,5));
