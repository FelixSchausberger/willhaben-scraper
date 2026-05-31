/**
 * Custom error classes for the scraper application.
 * These provide type-safe error handling and better error context.
 */

/**
 * Base class for all scraper-related errors
 */
export class ScraperError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends ScraperError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when request is blocked
 */
export class BlockedError extends ScraperError {
  constructor(message = 'Request blocked') {
    super(message, 403);
  }
}

/**
 * Error thrown when response contains invalid JSON structure
 */
export class InvalidResponseError extends ScraperError {
  constructor(message = 'Invalid JSON structure') {
    super(message);
  }
}

/**
 * Error thrown when response doesn't contain expected data
 */
export class MissingDataError extends ScraperError {
  constructor(message = 'Response does not contain expected data') {
    super(message);
  }
}
