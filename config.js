'use strict';

console.log('Config file is loading...');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'local';
}
const env = process.env.NODE_ENV;

const dotenv = require('dotenv');
const path = require('path');

console.log('NODE_ENV =', env);

if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  const result = dotenv.config({
    path: path.resolve(__dirname, `.env.${env.toLocaleLowerCase()}`)
  });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Loaded .env file:', path.resolve(__dirname, `.env.${env.toLocaleLowerCase()}`));
    console.log('Environment variables:', {
      MONGODB_CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING ? '[SET]' : '[NOT SET]',
      NODE_ENV: process.env.NODE_ENV
    });
  }
}
