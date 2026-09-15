import pinoHttp from "pino-http";

export const requestLogger = pinoHttp({
  redact: ["req.headers.authorization", "req.headers['x-api-key']"],
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        id: req.id,
      };
    },
  },
});
