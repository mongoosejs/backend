'use strict';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'local';
}
const env = process.env.NODE_ENV;

const dotenv = require('dotenv');
const path = require('path');

console.log('NODE_ENV =', env);

if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  dotenv.config({
    path: path.resolve(__dirname, `.env.${env.toLocaleLowerCase()}`)
  });
}
