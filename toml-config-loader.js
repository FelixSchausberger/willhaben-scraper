import fs from 'fs';
import toml from 'toml';
import Ajv from 'ajv';
import { CONFIG_PATH } from './lib/constants.js';

const configSchema = {
  type: 'object',
  required: ['search', 'scraper'],
  properties: {
    search: {
      type: 'object',
      required: ['category', 'states', 'filters'],
      properties: {
        category: {
          type: 'string',
          enum: ['mietwohnungen', 'eigentumswohnung', 'haus-mieten', 'haus-kaufen']
        },
        states: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' }
        },
        filters: {
          type: 'object',
          required: ['min_price', 'max_price', 'min_rooms', 'max_rooms'],
          properties: {
            min_price: { type: 'number', minimum: 0 },
            max_price: { type: 'number', minimum: 0 },
            min_rooms: { type: 'number', minimum: 0 },
            max_rooms: { type: 'number', minimum: 0 },
            locations: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        locations: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    scraper: {
      type: 'object',
      required: ['interval', 'max_retries', 'retry_delay', 'user_agent'],
      properties: {
        interval: { type: 'number', minimum: 1000 },
        max_retries: { type: 'integer', minimum: 1 },
        retry_delay: { type: 'number', minimum: 1000 },
        user_agent: { type: 'string', minLength: 1 }
      }
    }
  }
};

function validateConfig(config) {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(configSchema);

  if (!validate(config)) {
    const errors = validate.errors.map(err =>
      `  - ${err.instancePath || 'root'}: ${err.message}`
    ).join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  // Additional validation: max_price must be >= min_price
  if (config.search?.filters?.max_price < config.search?.filters?.min_price) {
    throw new Error('Invalid configuration: max_price must be greater than or equal to min_price');
  }

  // Additional validation: max_rooms must be >= min_rooms
  if (config.search?.filters?.max_rooms < config.search?.filters?.min_rooms) {
    throw new Error('Invalid configuration: max_rooms must be greater than or equal to min_rooms');
  }
}

function getDefaultConfig() {
  return {
    search: {
      category: 'mietwohnungen',
      states: ['vienna'],
      filters: {
        minPrice: 500,
        maxPrice: 1200,
        minRooms: 2,
        maxRooms: 5
      },
      locations: []
    },
    scraper: {
      interval: 180000,
      maxRetries: 3,
      retryDelay: 30000,
      userAgent: 'Default User Agent'
    }
  };
}

function loadConfig(configPath = CONFIG_PATH) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const rawConfig = toml.parse(configContent);

    // Validate the raw config against the schema
    validateConfig(rawConfig);

    // Transform to internal format with camelCase
    const config = {
      search: {
        category: rawConfig.search.category,
        states: rawConfig.search.states,
        filters: {
          minPrice: rawConfig.search.filters.min_price,
          maxPrice: rawConfig.search.filters.max_price,
          minRooms: rawConfig.search.filters.min_rooms,
          maxRooms: rawConfig.search.filters.max_rooms
        },
        // Handle locations from either search.locations or search.filters.locations
        locations: rawConfig.search.locations || rawConfig.search.filters?.locations || []
      },
      scraper: {
        interval: rawConfig.scraper.interval,
        maxRetries: rawConfig.scraper.max_retries,
        retryDelay: rawConfig.scraper.retry_delay,
        userAgent: rawConfig.scraper.user_agent
      }
    };

    return config;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error.message);
    throw error;
  }
}

export default loadConfig();