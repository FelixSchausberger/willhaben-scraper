/**
 * Centralized configuration constants for the application.
 * Values can be overridden via environment variables.
 */

export const CONFIG_PATH = process.env.CONFIG_PATH || './config/config.toml';
export const SECRETS_PATH = process.env.SECRETS_PATH || './secrets/secrets.yaml';
export const STORAGE_PATH = process.env.STORAGE_PATH || './data/last_seen_listing.json';
export const SOPS_AGE_KEY = process.env.SOPS_AGE_KEY;
