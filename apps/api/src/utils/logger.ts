/**
 * Structured Logger for Production Operations & Observability.
 * Provides request/correlation ID tracking, log levels, and automatic secret masking.
 */

const SENSITIVE_KEYS = [
  "api_key",
  "apikey",
  "secret",
  "password",
  "token",
  "authorization",
  "access_token",
  "refresh_token",
  "signature",
  "bearer",
];

function sanitize(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k));
    if (isSensitive && typeof value === "string") {
      sanitized[key] = value.length > 8 ? `${value.slice(0, 4)}••••${value.slice(-4)}` : "••••••••";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: "INFO" | "WARN" | "ERROR", message: string, meta?: any, correlationId?: string): string {
    const timestamp = new Date().toISOString();
    const corrStr = correlationId ? ` [req_${correlationId.slice(0, 8)}]` : "";
    const metaStr = meta ? ` | ${JSON.stringify(sanitize(meta))}` : "";
    return `[${timestamp}] [${level}] [${this.context}]${corrStr} ${message}${metaStr}`;
  }

  info(message: string, meta?: any, correlationId?: string) {
    console.log(this.formatMessage("INFO", message, meta, correlationId));
  }

  warn(message: string, meta?: any, correlationId?: string) {
    console.warn(this.formatMessage("WARN", message, meta, correlationId));
  }

  error(message: string, meta?: any, correlationId?: string) {
    console.error(this.formatMessage("ERROR", message, meta, correlationId));
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
