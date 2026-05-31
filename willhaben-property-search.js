import config from './toml-config-loader.js';
import https from 'node:https';
import logger from './logger.js';
import { RateLimitError, BlockedError, InvalidResponseError, MissingDataError } from './lib/errors.js';
import { sleep } from './utils.js';

const categories = Object.freeze({
  'apartment rent': 'mietwohnungen',
  'apartment buy': 'eigentumswohnung',
  'house rent': 'haus-mieten',
  'house buy': 'haus-kaufen',
});

const states = Object.freeze({
  burgenland: {
    name: 'burgenland',
    districts: {
      eisenstadt: 'eisenstadt',
      'eisenstadt-umgebung': 'eisenstadt-umgebung',
      güssing: 'güssing',
      jennersdorf: 'jennersdorf',
      mattersburg: 'mattersburg',
      'neusiedl-am-see': 'neusiedl-am-see',
      oberpullendorf: 'oberpullendorf',
      oberwart: 'oberwart',
      'rust-stadt': 'rust-stadt-',
    },
  },
  carinthia: {
    name: 'kaernten',
    districts: {
      feldkirchen: 'feldkirchen',
      hermagor: 'hermagor',
      'klagenfurt-land': 'klagenfurt-land',
      klagenfurt: 'klagenfurt',
      'st-veit-an-der-glan': 'st-veit-an-der-glan',
      'spittal-an-der-drau': 'spittal-an-der-drau',
      'villach-land': 'villach-land',
      villach: 'villach',
      voelkermarkt: 'voelkermarkt',
      wolfsberg: 'wolfsberg',
    },
  },
  'lower austria': {
    name: 'niederoesterreich',
    districts: {
      amstetten: 'amstetten',
      baden: 'baden',
      'bruck-an-der-leitha': 'bruck-an-der-leitha',
      gaenserndorf: 'gaenserndorf',
      gmuend: 'gmuend',
      hollabrunn: 'hollabrunn',
      horn: 'horn',
      korneuburg: 'korneuburg',
      'krems-land': 'krems-land',
      'krems-stadt': 'krems-stadt',
      lilienfeld: 'lilienfeld',
      melk: 'melk',
      mistelbach: 'mistelbach',
      moedling: 'moedling',
      neunkirchen: 'neunkirchen',
      scheibbs: 'scheibbs',
      'st-poelten-land': 'st-poelten-land',
      'st-poelten-stadt': 'st-poelten-stadt',
      tulln: 'tulln',
      'waidhofen-an-der-thaya': 'waidhofen-an-der-thaya',
      'waidhofen-an-der-ybbs': 'waidhofen-an-der-ybbs',
      weinviertel: 'weinviertel',
      'wiener-neustadt-land': 'wiener-neustadt-land',
      'wiener-neustadt-stadt': 'wiener-neustadt-stadt',
      zwettl: 'zwettl',
    },
  },
  'upper austria': {
    name: 'oberoesterreich',
    districts: {
      braunau: 'braunau',
      eferding: 'eferding',
      freistadt: 'freistadt',
      grieskirchen: 'grieskirchen',
      kirchdorf: 'kirchdorf',
      linz: 'linz',
      'linz-land': 'linz-land',
      perg: 'perg',
      ried: 'ried',
      rohrbach: 'rohrbach',
      schärding: 'schärding',
      steyr: 'steyr',
      'steyr-land': 'steyr-land',
      urfahr: 'urfahr',
      'urfahr-umgebung': 'urfahr-umgebung',
      vöcklabruck: 'vöcklabruck',
      wels: 'wels',
      'wels-land': 'wels-land',
    },
  },
  salzburg: {
    name: 'salzburg',
    districts: {
      hallein: 'hallein',
      salzburg: 'salzburg',
      'salzburg-umgebung': 'salzburg-umgebung',
      'st-johann': 'st-johann',
      tamsweg: 'tamsweg',
      'zell-am-see': 'zell-am-see',
    },
  },
  styria: {
    name: 'steiermark',
    districts: {
      'bruck-an-der-mur': 'bruck-an-der-mur',
      deutschlandsberg: 'deutschlandsberg',
      feldbach: 'feldbach',
      furstenfeld: 'furstenfeld',
      graz: 'graz',
      'graz-umgebung': 'graz-umgebung',
      'hartberg-fuerstenfeld': 'hartberg-fuerstenfeld',
      leibnitz: 'leibnitz',
      leoben: 'leoben',
      liezen: 'liezen',
      murau: 'murau',
      murtal: 'murtal',
      südoststeiermark: 'südoststeiermark',
      voitsberg: 'voitsberg',
      weiz: 'weiz',
    },
  },
  tyrol: {
    name: 'tirol',
    districts: {
      imst: 'imst',
      innsbruck: 'innsbruck',
      'innsbruck-land': 'innsbruck-land',
      kitzbühel: 'kitzbühel',
      kufstein: 'kufstein',
      landeck: 'landeck',
      lienz: 'lienz',
      reutte: 'reutte',
      schwaz: 'schwaz',
    },
  },
  vorarlberg: {
    name: 'vorarlberg',
    districts: {
      bludenz: 'bludenz',
      bregenz: 'bregenz',
      dornbirn: 'dornbirn',
      feldkirch: 'feldkirch',
    },
  },
  vienna: {
    name: 'wien',
    districts: [
      { number: '01', name: 'innerestadt' },
      { number: '02', name: 'leopoldstadt' },
      { number: '03', name: 'landstrasse' },
      { number: '04', name: 'wieden' },
      { number: '05', name: 'margareten' },
      { number: '06', name: 'mariahilf' },
      { number: '07', name: 'neubau' },
      { number: '08', name: 'josefstadt' },
      { number: '09', name: 'alsergrund' },
      { number: '10', name: 'favoriten' },
      { number: '11', name: 'simmering' },
      { number: '12', name: 'meidling' },
      { number: '13', name: 'hietzing' },
      { number: '14', name: 'penzing' },
      { number: '15', name: 'rudolfsheim-fuenfhaus' },
      { number: '16', name: 'ottakring' },
      { number: '17', name: 'hernals' },
      { number: '18', name: 'waehring' },
      { number: '19', name: 'dobling' },
      { number: '20', name: 'brigittenau' },
      { number: '21', name: 'floridsdorf' },
      { number: '22', name: 'donaustadt' },
      { number: '23', name: 'liesing' }
    ],
  },
});

const sanitizeForUrl = (text) => {
  // Convert to lowercase and replace umlauts
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Replace special characters and spaces with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
};

// Consolidated district parsing patterns
const DISTRICT_PATTERNS = {
  full: /([^,]+),\s*(\d+)\.\s*Bezirk,\s*(.+)/i,
  short: /Wien,\s*(\d+)\./
};

/**
 * Parse district information from location string
 * @param {string} location - Location string to parse
 * @returns {Object|null} Object with city, number, and name or null if no match
 */
function parseDistrict(location) {
  if (!location) return null;

  const fullMatch = location.match(DISTRICT_PATTERNS.full);
  if (fullMatch) {
    return {
      city: fullMatch[1],
      number: fullMatch[2].padStart(2, '0'),
      name: fullMatch[3]
    };
  }

  const shortMatch = location.match(DISTRICT_PATTERNS.short);
  if (shortMatch) {
    return {
      city: 'Wien',
      number: shortMatch[1].padStart(2, '0'),
      name: null
    };
  }

  return null;
}

// Retry function with exponential backoff
async function retry(fn, retries = 3, initialDelay = 30000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;

      // Exponential backoff with rate limit detection
      const baseDelay = error instanceof RateLimitError
        ? initialDelay * 2  // Double delay for rate limits
        : initialDelay;

      const waitTime = baseDelay * Math.pow(2, i) * (0.75 + Math.random() * 0.5);
      logger.debug(`Attempt ${i + 1} failed, retrying in ${Math.round(waitTime/1000)}s...`);
      await sleep(waitTime);
    }
  }
}

// Attribute name aliases map (class-level constant for performance)
const ATTRIBUTE_MAP = {
  'ROOMS_TOTAL': ['ROOMS_TOTAL', 'ROOM_COUNT', 'NUMBER_OF_ROOMS'],
  'ESTATE_SIZE': ['ESTATE_SIZE', 'LIVING_AREA'],
  'PRICE': ['PRICE'],
  'LOCATION': ['LOCATION'],
  'HEADING': ['HEADING']
};

// Helper function to extract listing attributes
function extractListingAttributes(listing) {
  // Create attribute lookup map once per listing for O(1) lookups
  const attrLookup = new Map(
    listing.attributes?.attribute?.map(a => [a.name, a.values?.[0]]) || []
  );

  const findAttributeValue = (attrName) => {
    const aliases = ATTRIBUTE_MAP[attrName] || [attrName];
    for (const name of aliases) {
      const value = attrLookup.get(name);
      if (value) return value;
    }
    return null;
  };

  return {
    id: listing.id,
    price: findAttributeValue('PRICE') ? parseFloat(findAttributeValue('PRICE')) : null,
    number_of_rooms: findAttributeValue('ROOMS_TOTAL'),
    estate_size: findAttributeValue('ESTATE_SIZE'),
    location: findAttributeValue('LOCATION'),
    heading: findAttributeValue('HEADING')
  };
}

// Helper function to compare listings
function isNewerListing(currentListing, lastSeenListing) {
  if (!lastSeenListing) return true;
  
  const currentId = parseInt(currentListing.id);
  const lastSeenId = parseInt(lastSeenListing.id);
  
  // If the difference is too large, it might indicate an ID reset
  const ID_RESET_THRESHOLD = 1000000;
  if (Math.abs(currentId - lastSeenId) > ID_RESET_THRESHOLD) {
    // In case of potential ID reset, use timestamp comparison
    const currentTimestamp = new Date(currentListing._lastUpdated).getTime();
    const lastSeenTimestamp = new Date(lastSeenListing._lastUpdated).getTime();
    return currentTimestamp > lastSeenTimestamp;
  }
  
  return currentId > lastSeenId;
}

class WillhabenPropertySearch {
  constructor(telegramNotifier = null, options = {}) {
    this.telegramNotifier = telegramNotifier;
    this.config = options.config || config;
    this.logger = options.logger || logger;
    this.searchCount = 1000;
    this.searchCategory = '';
    this.searchState = null;
    this.searchDistrict = '';
    this.filters = {
      minPrice: null,
      maxPrice: null,
      minRooms: null,
      maxRooms: null,
      district: null,
    };

    // Create a custom HTTPS agent with keep-alive
    this.agent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 1,
      timeout: 10000
    });

    this.headers = {
      'User-Agent': this.config.scraper.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
    };
  }

  async getListings(storage) {
    const url = this.getURL();
    const fetchWithRetry = () => retry(async () => {
      await sleep(10000);
      this.logger.debug(`Fetching URL: ${url}`);
  
      const response = await fetch(url, {
        headers: this.headers,
        agent: this.agent,
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError('Rate limit exceeded', response.headers.get('retry-after'));
        }
        if (response.status === 403) {
          throw new BlockedError('Access forbidden');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const string = await response.text();
      this.logger.debug(`Response length: ${string.length}`);

      if (!string.includes('__NEXT_DATA__')) {
        this.logger.error('Response preview:', string.substring(0, 500));
        throw new MissingDataError('Response does not contain expected data');
      }

      return string;
    }, 3, 30000);
  
    try {
      const string = await fetchWithRetry();
      const scriptTagStart = '<script id="__NEXT_DATA__" type="application/json">';
      const startIndex = string.indexOf(scriptTagStart);
  
      this.logger.debug(`Content preview: ${string.substring(0, 200)}...`);
      this.logger.debug(`Found __NEXT_DATA__ at index: ${startIndex}`);
  
      if (startIndex === -1) {
        this.logger.error('Page content preview:', string.substring(0, 500));
        throw new MissingDataError('Could not find NEXT_DATA script tag');
      }

      const jsonStart = startIndex + scriptTagStart.length;
      const jsonEnd = string.indexOf('</script>', jsonStart);

      if (jsonEnd === -1) {
        throw new MissingDataError('Could not find closing script tag');
      }

      const jsonData = string.substring(jsonStart, jsonEnd).trim();

      if (!jsonData) {
        throw new MissingDataError('Empty JSON data');
      }

      const result = JSON.parse(jsonData);

      if (!result.props?.pageProps?.searchResult?.advertSummaryList?.advertSummary) {
        this.logger.error('Invalid JSON structure:', JSON.stringify(result, null, 2).substring(0, 1000));
        throw new InvalidResponseError('Invalid JSON structure');
      }
  
      const listings = result.props.pageProps.searchResult.advertSummaryList.advertSummary;
      
      // Sort listings by ID in descending order to ensure we process newest first
      listings.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  
      // Get last seen listing from storage
      const lastSeenListing = await storage.getLastSeenListing();
      let highestValidListing = null;
      const processedListings = [];
  
      for (const listing of listings) {
        // Extract listing attributes using the helper function
        const attributes = extractListingAttributes(listing);

        // Add URL construction logic using parseDistrict for robustness
        const district = parseDistrict(attributes.location);
        const districtPart = district
          ? `${district.city.toLowerCase()}-${district.number}90-${sanitizeForUrl(district.name || '')}`
          : 'location-unknown';
        const titlePart = sanitizeForUrl(attributes.heading || '');

        attributes.url = `https://www.willhaben.at/iad/immobilien/d/mietwohnungen/wien/${districtPart}/${titlePart}-${attributes.id}/`;
        attributes._lastUpdated = new Date().toISOString();
  
        // Debug logging
        this.logger.debug('Processing listing:', {
          id: attributes.id,
          lastSeenId: lastSeenListing?.id,
          price: attributes.price,
          priceRange: `${this.filters.minPrice}-${this.filters.maxPrice}`,
          isNewer: isNewerListing(attributes, lastSeenListing)
        });
  
        // Check if listing matches price filters
        if (attributes.price >= this.filters.minPrice && 
            attributes.price <= this.filters.maxPrice) {
          
          // Update highest valid listing if needed
          if (!highestValidListing || isNewerListing(attributes, highestValidListing)) {
            highestValidListing = attributes;
          }
          
          // Check if this is a new listing
          if (!lastSeenListing || isNewerListing(attributes, lastSeenListing)) {
            processedListings.push(attributes);
          }
        }
      }
  
      // Update storage with highest valid listing
      if (highestValidListing) {
        this.logger.debug('Updating last seen listing:', {
          id: highestValidListing.id,
          price: highestValidListing.price,
          timestamp: highestValidListing._lastUpdated
        });
        await storage.updateLastSeenListing(highestValidListing);
      }
  
      return processedListings;
  
    } catch (error) {
      this.logger.error('Error in getListings:', error.message);
      throw error;
    }
  }

  async search(storage) {
    try {
      const pageListings = await this.getListings(storage);
  
      if (pageListings.length === 0) {
        this.logger.debug('No new listings found');
        return [];
      }

      const filteredListings = this.applyFilters(pageListings);
      this.logger.debug(`Found ${filteredListings.length} new listings that match filters`);
      return filteredListings;
  
    } catch (error) {
      this.logger.error('Search error:', error.message);

      // Only send notification for critical errors, not temporary ones
      if (
        error instanceof RateLimitError ||
        error instanceof BlockedError ||
        error instanceof InvalidResponseError ||
        error instanceof MissingDataError
      ) {
        if (this.telegramNotifier) {
          await this.telegramNotifier.sendErrorNotification(error);
        }
      }
      throw error;
    }
  }

  category(category) {
    if (!Object.values(categories).includes(category)) {
      throw new Error('Invalid category! Use one of `WillhabenPropertySearch.categories`.');
    }
    this.searchCategory = category;
    return this;
  }

  count(count) {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('Count has to be a positive integer!');
    }
    this.searchCount = count;
    return this;
  }

  state(state) {
    if (!Object.values(states).includes(state)) {
      throw new Error('Invalid state! Use one of `WillhabenPropertySearch.states`.');
    }
    this.searchState = state;
    return this;
  }

  filter(filters) {
    this.filters = { ...this.filters, ...filters };
    return this;
  }

  getURL() {
    const timestamp = Date.now();
    let url = 'https://www.willhaben.at/iad/immobilien/';
    
    // Support multiple states from config
    const selectedStates = this.config.search.states.map(stateName =>
      states[stateName.toLowerCase()] || states.vienna
    );
  
    if (this.searchCategory) {
      url += `${this.searchCategory}/`;
      
      // Use the first state if multiple are configured
      if (selectedStates.length > 0) {
        url += `${selectedStates[0].name}/`;
      }
    }
    
    // Construct query parameters
    const params = new URLSearchParams({
      nocache: timestamp,
      page: '1',
      rows: this.searchCount.toString()
    });
    
    url += `?${params.toString()}`;
    this.logger.debug(`Generated URL: ${url}`);
    return url;
  }
  
  // Individual filter predicate methods
  hasRequiredFields(listing) {
    if (!listing.price || !listing.number_of_rooms) {
      this.logger.debug(`Skipping listing ${listing.id || 'unknown'}: Missing price (${listing.price}) or rooms (${listing.number_of_rooms})`);
      return false;
    }
    return true;
  }

  meetsMinPrice(listing) {
    if (this.filters.minPrice && listing.price < this.filters.minPrice) {
      this.logger.debug(`Filtered out listing ${listing.id}: price ${listing.price} < ${this.filters.minPrice}`);
      return false;
    }
    return true;
  }

  meetsMaxPrice(listing) {
    if (this.filters.maxPrice && listing.price > this.filters.maxPrice) {
      this.logger.debug(`Filtered out listing ${listing.id}: price ${listing.price} > ${this.filters.maxPrice}`);
      return false;
    }
    return true;
  }

  meetsMinRooms(listing) {
    if (this.filters.minRooms && listing.number_of_rooms < this.filters.minRooms) {
      this.logger.debug(`Filtered out listing ${listing.id}: rooms ${listing.number_of_rooms} < ${this.filters.minRooms}`);
      return false;
    }
    return true;
  }

  meetsMaxRooms(listing) {
    if (this.filters.maxRooms && listing.number_of_rooms > this.filters.maxRooms) {
      this.logger.debug(`Filtered out listing ${listing.id}: rooms ${listing.number_of_rooms} > ${this.filters.maxRooms}`);
      return false;
    }
    return true;
  }

  meetsLocationFilter(listing, activeStates, allowedDistricts) {
    const district = parseDistrict(listing.location);
    if (!district) return true;

    const listingLocation = {
      state: district.city.toLowerCase() === 'wien' ? 'wien' : district.city.toLowerCase(),
      number: district.number,
      name: district.name ? district.name.toLowerCase() : null
    };

    this.logger.debug('Listing location parsed:', JSON.stringify(listingLocation));

    const isAllowedState = activeStates.includes(listingLocation.state);
    const isAllowedDistrict = allowedDistricts.some(
      district => district.state === listingLocation.state &&
                  district.number === listingLocation.number &&
                  district.name === listingLocation.name
    );

    this.logger.debug(`Listing ${listing.id}:`, { isAllowedState, isAllowedDistrict });

    if (!isAllowedState || !isAllowedDistrict) {
      this.logger.debug(`Filtered out listing ${listing.id}: state ${listingLocation.state}, district ${listingLocation.number} ${listingLocation.name} not allowed`);
      return false;
    }

    return true;
  }

  applyFilters(listings) {
    this.logger.debug('=== First Stage Filtering ===');
    this.logger.debug('Applied filters:', JSON.stringify(this.filters, null, 2));
    this.logger.debug('Total listings before filtering:', listings.length);

    // Normalize state names (vienna = wien)
    const activeStates = this.config.search.states.map(stateName =>
      stateName.toLowerCase() === 'vienna' ? 'wien' : stateName.toLowerCase()
    );
    this.logger.debug('Active states:', JSON.stringify(activeStates, null, 2));

    // Parse allowed districts from config
    const allowedDistricts = this.config.search.locations.map(location => {
      const district = parseDistrict(location);
      return district ? {
        state: district.city.toLowerCase() === 'wien' ? 'wien' : district.city.toLowerCase(),
        number: district.number,
        name: district.name ? district.name.toLowerCase() : null
      } : null;
    }).filter(Boolean);

    this.logger.debug('Allowed districts:', JSON.stringify(allowedDistricts, null, 2));

    // Apply all filter predicates
    const filteredListings = listings.filter(listing => {
      return this.hasRequiredFields(listing) &&
             this.meetsMinPrice(listing) &&
             this.meetsMaxPrice(listing) &&
             this.meetsMinRooms(listing) &&
             this.meetsMaxRooms(listing) &&
             this.meetsLocationFilter(listing, activeStates, allowedDistricts);
    });

    this.logger.debug('Listings after first stage filtering:', filteredListings.length);
    return filteredListings;
  }
}

WillhabenPropertySearch.categories = categories;
WillhabenPropertySearch.states = states;

export default WillhabenPropertySearch;
