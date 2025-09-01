import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, service, requestId, userId, ...meta }) => {
    const logObject: any = {
      timestamp,
      level: level.toUpperCase(),
      service: service || 'unknown',
      message,
    };
    if (requestId) logObject.requestId = requestId;
    if (userId) logObject.userId = userId;
    if (Object.keys(meta).length > 0) logObject.meta = meta;
    if (stack) logObject.stack = stack;
    return JSON.stringify(logObject);
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'aetherconnect' },
  transports: [
    new winston.transports.Console({
      format: nodeEnv === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : logFormat
    }),
  ],
});

export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};