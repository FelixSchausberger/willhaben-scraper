import { decryptSops } from 'sops-age';
import { parse } from 'yaml';

let cachedSecrets = null;

/**
 * Load and decrypt secrets from a SOPS-encrypted YAML file.
 * Secrets are cached after first load for performance.
 *
 * @param {string} filePath - Path to the encrypted secrets file
 * @param {string} secretKey - SOPS age key for decryption
 * @returns {Promise<Object>} Decrypted secrets object
 */
export async function loadSecrets(filePath, secretKey) {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    const decryptedFile = await decryptSops({
      path: filePath,
      secretKey: secretKey,
    });

    cachedSecrets = parse(JSON.stringify(decryptedFile, null, 2));
    return cachedSecrets;
  } catch (error) {
    console.error('Failed to decrypt secrets:', error.message);
    process.exit(1);
  }
}

/**
 * Get Telegram credentials from loaded secrets.
 * Throws an error if secrets haven't been loaded yet.
 *
 * @returns {Object} Object containing apiToken and chatId
 * @throws {Error} If secrets not loaded
 */
export function getTelegramCredentials() {
  if (!cachedSecrets?.telegram) {
    throw new Error('Secrets not loaded. Call loadSecrets() first.');
  }

  return {
    apiToken: cachedSecrets.telegram.apiToken,
    chatId: cachedSecrets.telegram.chatId
  };
}

/**
 * Clear cached secrets (useful for testing or secret rotation)
 */
export function clearSecretsCache() {
  cachedSecrets = null;
}
