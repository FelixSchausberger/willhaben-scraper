/**
 * Mask sensitive information in log messages
 * @param {*} message - The message to mask
 * @returns {*} Masked message
 */
function maskSecrets(message) {
  if (typeof message !== 'string') return message;

  // Mask Telegram bot tokens (format: 1234567890:ABC...)
  let masked = message.replace(/\d{8,10}:[A-Za-z0-9_-]{35}/g, '[BOT_TOKEN]');

  // Mask chat IDs
  masked = masked.replace(/chatId['":\s]+\d+/gi, 'chatId: [REDACTED]');

  // Mask apiToken in objects
  masked = masked.replace(/apiToken['":\s]+[^,}\s]+/gi, 'apiToken: "[BOT_TOKEN]"');

  return masked;
}

class Logger {
  constructor(isDebug = false) {
    this.isDebug = isDebug;
  }

  getTimestamp() {
    return new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  log(message, ...args) {
    const masked = maskSecrets(message);
    console.log(`[${this.getTimestamp()}] ${masked}`, ...args);
  }

  debug(message, ...args) {
    if (this.isDebug) {
      const masked = maskSecrets(message);
      this.log(`DEBUG: ${masked}`, ...args);
    }
  }

  error(message, ...args) {
    const masked = maskSecrets(message);
    console.error(`[${this.getTimestamp()}] ERROR: ${masked}`, ...args);
  }
}

// Create a singleton instance
const logger = new Logger(process.argv.includes('--debug'));

export default logger;