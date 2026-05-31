import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger.js';

class Storage {
  constructor(filePath = '/tmp/last_seen_listing.json') {
    this.filePath = filePath;
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    try {
      const directory = path.dirname(this.filePath);
      await fs.mkdir(directory, { recursive: true });
      logger.debug(`Storage directory ensured: ${directory}`);
    } catch (err) {
      logger.error('Error ensuring storage directory exists:', err);
      throw err;
    }
  }

  async getLastSeenListing() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const listing = JSON.parse(data);
      logger.debug('Retrieved last seen listing:', {
        id: listing?.id,
        filePath: this.filePath,
        timestamp: new Date().toISOString()
      });
      return listing;
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.debug('No previous listing found - first run or file deleted');
        return null;
      }

      // Handle permission errors gracefully
      if (err.code === 'EACCES') {
        logger.error('Permission denied reading storage file:', this.filePath);
        return null; // Continue with fresh state
      }

      // Handle corrupted JSON files
      if (err instanceof SyntaxError) {
        logger.error('Corrupted storage file, resetting:', err.message);
        return null; // Reset on corruption
      }

      // Unknown error - this is critical
      logger.error('Critical storage error:', {
        error: err.message,
        code: err.code,
        filePath: this.filePath
      });
      throw err;
    }
  }

  async updateLastSeenListing(listing) {
    try {
      if (!listing || Object.keys(listing).length === 0) {
        throw new Error('Invalid listing data');
      }

      // Add timestamp to the stored data
      const dataToStore = {
        ...listing,
        _lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.filePath, JSON.stringify(dataToStore, null, 2), 'utf-8');
      
      // Verify the file was written correctly
      const stats = await fs.stat(this.filePath);
      
      logger.debug('Updated last seen listing:', {
        id: listing.id,
        filePath: this.filePath,
        fileSize: stats.size,
        timestamp: dataToStore._lastUpdated
      });

    } catch (err) {
      logger.error('Error updating last seen listing:', {
        error: err.message,
        listing: listing?.id,
        filePath: this.filePath
      });
      throw err;
    }
  }

  async reset() {
    try {
      await fs.unlink(this.filePath);
      logger.debug('Storage reset - deleted file:', this.filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error('Error resetting storage:', err);
        throw err;
      }
    }
  }
}

export default Storage;