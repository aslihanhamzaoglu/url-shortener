class ServiceError extends Error {
  constructor(message, statusCode = 400, code = 'SERVICE_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export default ServiceError;
