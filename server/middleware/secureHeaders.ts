import { secureHeaders } from 'hono/secure-headers';

export const secureHeadersMiddleware = secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
  },
});
