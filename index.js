import logger from './logger.js';
import PropertyScraper from './scraper.js';
import { loadSecrets } from './lib/secretsLoader.js';
import { SECRETS_PATH, SOPS_AGE_KEY } from './lib/constants.js';

// Load and decrypt the secrets
const secrets = await loadSecrets(SECRETS_PATH, SOPS_AGE_KEY);

// Create scraper with secrets
const scraper = new PropertyScraper(secrets);

scraper.run().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
