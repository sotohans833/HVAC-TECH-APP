export type ServiceTitanErrorCode =
  'off' | 'not-found' | 'auth' | 'forbidden' | 'invalid' | 'upstream';

export class ServiceTitanError extends Error {
  constructor(
    readonly code: ServiceTitanErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'ServiceTitanError';
  }
}

const STATUS: Record<ServiceTitanErrorCode, number> = {
  off: 503,
  'not-found': 404,
  auth: 502,
  forbidden: 502,
  invalid: 422,
  upstream: 502,
};

/** The JSON error a route returns; the screens map the code to a message. */
export function serviceTitanErrorResponse(error: ServiceTitanError): Response {
  return Response.json({ error: error.code }, { status: STATUS[error.code] });
}
