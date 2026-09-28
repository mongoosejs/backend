'use strict';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

/**
 * Transport plumbing for the MCP OAuth endpoints. The actions hold all of the
 * behavior; this just adapts them to the two ways the mothership is served.
 *
 * `extrovert` cannot be used for these endpoints: OAuth clients send
 * `application/x-www-form-urlencoded` bodies and read `{ error }` response
 * bodies, and Studio deployments need to tell "this token is invalid" (401)
 * apart from "the authorization server is down" (5xx), while `extrovert`
 * assumes JSON and reports every failure as a 500.
 */
exports.toActionHandler = function toActionHandler(action, { methods = ['POST'] } = {}) {
  return async function actionHandler(request) {
    if (!methods.includes(request.method)) {
      return {
        statusCode: 405,
        headers: { ...HEADERS, Allow: `${methods.join(', ')}, OPTIONS` },
        body: JSON.stringify({
          error: 'invalid_request',
          error_description: `This endpoint only accepts ${methods.join(', ')}`
        })
      };
    }

    try {
      const params = {
        ...request.params,
        authorization: request.headers.authorization || request.headers.Authorization
      };
      return {
        statusCode: action.statusCode || 200,
        headers: HEADERS,
        body: JSON.stringify(await action(params))
      };
    } catch (err) {
      return {
        statusCode: err.status || 500,
        headers: HEADERS,
        body: JSON.stringify({
          error: err.oauthCode || 'server_error',
          error_description: err.message,
          message: err.message
        })
      };
    }
  };
};

/**
 * Normalize an incoming request into `{ method, headers, params }`. OAuth
 * clients POST form encoded bodies, the consent page and Studio POST JSON, and
 * the metadata endpoint is a plain GET.
 */
exports.toRequest = function toRequest({ method, headers, rawBody, query }) {
  const contentType = `${headers?.['content-type'] || headers?.['Content-Type'] || ''}`;
  let bodyParams = {};
  if (typeof rawBody === 'string' && rawBody.length > 0) {
    if (contentType.includes('application/json')) {
      try {
        bodyParams = JSON.parse(rawBody);
      } catch (err) {
        bodyParams = {};
      }
    } else {
      bodyParams = Object.fromEntries(new URLSearchParams(rawBody));
    }
  } else if (rawBody != null && typeof rawBody === 'object') {
    bodyParams = rawBody;
  }

  return {
    method: `${method || 'GET'}`.toUpperCase(),
    headers: headers || {},
    params: { ...(query || {}), ...bodyParams }
  };
};

/** Serve a handler as a Netlify function, which is how production runs. */
exports.toNetlifyFunction = function toNetlifyFunction(handler) {
  return {
    handler: async function(event) {
      if (event.httpMethod === 'OPTIONS') {
        return exports.preflight();
      }
      const rawBody = event.isBase64Encoded && event.body ?
        Buffer.from(event.body, 'base64').toString('utf8') :
        event.body;
      return handler(exports.toRequest({
        method: event.httpMethod,
        headers: event.headers,
        rawBody,
        query: event.queryStringParameters
      }));
    }
  };
};

/**
 * Serve a handler as an Express route, which is how the mothership runs
 * locally. Mount it behind a body parser that keeps the raw body, so form
 * encoded requests survive.
 */
exports.toExpressRoute = function toExpressRoute(handler) {
  return function mcpOAuthRoute(req, res, next) {
    if (req.method === 'OPTIONS') {
      const { statusCode, headers } = exports.preflight();
      res.set(headers);
      return res.status(statusCode).end();
    }
    handler(exports.toRequest({
      method: req.method,
      headers: req.headers,
      rawBody: req.body,
      query: req.query
    })).then(({ statusCode, headers, body }) => {
      res.set(headers);
      res.status(statusCode).send(body);
    }).catch(next);
  };
};

exports.preflight = function preflight() {
  return { statusCode: 204, headers: HEADERS, body: '' };
};
