'use strict';

class IntegrationError extends Error {
  constructor(message, integration, statusCode, extra) {
    super(message);
    this.name = 'IntegrationError';
    this.integration = integration;
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

module.exports = { IntegrationError };
