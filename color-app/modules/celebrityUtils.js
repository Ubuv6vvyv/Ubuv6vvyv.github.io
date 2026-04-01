// Celebrity Utilities Module
// --- Constants ---
const DEBUG = false;
const CSV_FILE_NAME = 'celebrity_data.csv';
const DATA_FOLDER = 'data';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;
const VALID_SEASONS = Object.freeze([
    'Bright Spring', 'Light Spring', 'True Spring',
    'Soft Autumn', 'Dark Autumn', 'True Autumn',
    'Soft Summer', 'Light Summer', 'True Summer',
    'Bright Winter', 'Dark Winter', 'True Winter'
]);

// Security utility functions
const SecurityUtils = {
    validateURL(url) {
        try {
            const parsedUrl = new URL(url);
            // Only allow specific protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return null;
            }
            // Sanitize URL by reconstructing it
            return parsedUrl.toString();
        } catch (e) {
            return null;
        }
    },

    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        // Remove any HTML/script tags and limit length
        return str.replace(/<[^>]*>/g, '')
                 .slice(0, 1000); // Reasonable length limit
    },

    validateSeason(season) {
        return VALID_SEASONS.includes(season) ? season : null;
    },

    validateCelebrityObject(obj) {
        if (!obj || typeof obj !== 'object') return null;

        return {
            Season: this.validateSeason(obj.Season),
            Celebrities: this.sanitizeString(obj.Celebrities),
            Profession: this.sanitizeString(obj.Profession),
            Gender: this.sanitizeString(obj.Gender),
            "Instagram URL": this.sanitizeString(obj["Instagram URL"]),
            Image: obj.Image ? this.sanitizeString(obj.Image) : null
        };
    }
};

/**
 * Fetches and parses the celebrity CSV file from the data folder with security measures.
 * @returns {Promise<Array<Object>>} Array of validated celebrity objects
 */
export async function fetchCelebrityData() {
    try {
        const urls = await constructPossibleUrls();
        const response = await tryFetchWithMultipleUrls(urls);
        
        if (!response || !response.ok) {
            console.warn('Failed to fetch celebrity data, using fallback');
            return getFallbackCelebrityData();
        }

        // Add security headers check
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/csv')) {
            console.warn('Invalid content type for celebrity data');
            return getFallbackCelebrityData();
        }

        const csvText = await response.text();
        return parseCelebrityCSV(csvText);
    } catch (error) {
        console.error('Error in fetchCelebrityData:', error);
        return getFallbackCelebrityData();
    }
}

/**
 * Constructs an array of possible URLs to try for the celebrity CSV file with security validation.
 * @returns {Promise<Array<string>>} Array of validated URLs
 */
async function constructPossibleUrls() {
    const pluginUrl = window.skin_color_analyzer_url;
    const baseElement = document.querySelector('base');
    const docBase = baseElement ? baseElement.href : window.location.origin + '/';
    const scriptSrc = await findScriptSrc();

    const possibleUrls = [
        pluginUrl ? new URL(`${DATA_FOLDER}/${CSV_FILE_NAME}`, pluginUrl).href : null,
        `./${DATA_FOLDER}/${CSV_FILE_NAME}`,
        `${window.location.origin}/wp-content/plugins/skin-color-analyzer/${DATA_FOLDER}/${CSV_FILE_NAME}`,
        scriptSrc ? new URL(`${DATA_FOLDER}/${CSV_FILE_NAME}`, new URL(scriptSrc.substring(0, scriptSrc.lastIndexOf('/js/')), docBase).href).href : null
    ];

    // Validate and sanitize URLs
    return possibleUrls
        .filter(Boolean)
        .map(url => SecurityUtils.validateURL(url))
        .filter(Boolean);
}

/**
 * Finds the script source URL with security validation.
 * @returns {Promise<string|null>} Validated script source URL
 */
async function findScriptSrc() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        if (script.src && script.src.includes('skin-analyzer.js')) {
            const validatedUrl = SecurityUtils.validateURL(script.src);
            if (validatedUrl) return validatedUrl;
        }
    }
    return null;
}

/**
 * Tries to fetch from multiple URLs with security measures.
 * @param {Array<string>} urls - Validated URLs to try
 * @returns {Promise<Response|null>} Fetch response or null if all failed
 */
async function tryFetchWithMultipleUrls(urls) {
    for (const url of urls) {
        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'text/csv',
                    },
                    credentials: 'same-origin' // Prevent CORS issues
                });

                clearTimeout(timeoutId);

                if (response.ok) return response;
            } catch (e) {
                if (DEBUG) console.warn(`Fetch failed for URL: ${url}`, e);
                retries++;
            }
        }
    }
    return null;
}

/**
 * Parses CSV text into an array of objects with security validation.
 * @param {string} csvText - CSV text content
 * @returns {Array<Object>} Array of validated celebrity data
 */
export function parseCelebrityCSV(csvText) {
    try {
        if (typeof csvText !== 'string') {
            throw new Error('Invalid CSV data type');
        }

        const lines = csvText.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return [];

        const headers = parseCSVLine(lines[0]);
        if (!headers.length) return [];

        return lines.slice(1)
            .map(line => {
                const values = parseCSVLine(line);
                if (values.length !== headers.length) return null;

                const obj = {};
                headers.forEach((header, index) => {
                    obj[SecurityUtils.sanitizeString(header)] = SecurityUtils.sanitizeString(values[index]);
                });

                return SecurityUtils.validateCelebrityObject(obj);
            })
            .filter(Boolean); // Remove any invalid entries
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}

/**
 * Parses a single CSV line with security measures.
 * @param {string} line - Single line from CSV
 * @returns {Array<string>} Array of sanitized field values
 */
function parseCSVLine(line) {
    if (typeof line !== 'string') return [];

    const values = [];
    let currentValue = '';
    let inQuotes = false;
    let previousChar = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        // Protect against CSV injection
        if (char === '"') {
            if (inQuotes && previousChar !== '\\') {
                inQuotes = false;
            } else if (!inQuotes) {
                inQuotes = true;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(SecurityUtils.sanitizeString(currentValue.trim()));
            currentValue = '';
        } else {
            currentValue += char;
        }

        previousChar = char;
    }

    values.push(SecurityUtils.sanitizeString(currentValue.trim()));
    return values;
}

/**
 * Provides fallback celebrity data if the CSV can't be loaded.
 * @returns {Array<Object>} Fallback celebrity data
 */
function getFallbackCelebrityData() {
  return [
    { Season: "Bright Spring", Celebrities: "Anushka Sharma", Profession: "Actress", Gender: "Female", "Instagram URL": "anushkasharma" },
    { Season: "Bright Spring", Celebrities: "Chris Hemsworth", Profession: "Actor", Gender: "Male", "Instagram URL": "chrishemsworth" },
    { Season: "Dark Winter", Celebrities: "Megan Fox", Profession: "Actress", Gender: "Female", "Instagram URL": "meganfox" },
    { Season: "Dark Winter", Celebrities: "Idris Elba", Profession: "Actor", Gender: "Male", "Instagram URL": "idriselba" },
    { Season: "True Autumn", Celebrities: "Zendaya", Profession: "Actress", Gender: "Female", "Instagram URL": "zendaya" },
    { Season: "True Autumn", Celebrities: "Ryan Reynolds", Profession: "Actor", Gender: "Male", "Instagram URL": "vancityreynolds" },
    { Season: "Light Summer", Celebrities: "Emma Stone", Profession: "Actress", Gender: "Female", "Instagram URL": "emmastone" },
    { Season: "Light Summer", Celebrities: "Tom Hiddleston", Profession: "Actor", Gender: "Male", "Instagram URL": "twhiddleston" }
  ];
}

/**
 * Returns a featured set of celebrity data for display.
 * @returns {Array<Object>} Array of featured celebrity objects
 */
export function getFeaturedCelebrityData() {
    // Use the constant data but validate each entry
    return FEATURED_CELEBRITY_DATA.map(celebrity => 
        SecurityUtils.validateCelebrityObject(celebrity)
    ).filter(Boolean);
}

// Define featured celebrity data as a frozen constant
const FEATURED_CELEBRITY_DATA = Object.freeze([
    // BRIGHT SPRING
    { Season: "Bright Spring", Celebrities: "Henry Cavill", Profession: "Actor", "Instagram URL": "henrycavill", Image: "henrycavill.jpg" },
    { Season: "Bright Spring", Celebrities: "Jenna Dewan", Profession: "Actress", "Instagram URL": "jennadewan", Image: "jennadewan.jpg" },
    { Season: "Bright Spring", Celebrities: "Chris Hemsworth", Profession: "Actor", "Instagram URL": "chrishemsworth", Image: "chrishemsworth.jpg" },
    { Season: "Bright Spring", Celebrities: "Fei Fei Sun", Profession: "Fashion Model", "Instagram URL": "feifeisun", Image: "feifeisun.jpg" },
    { Season: "Bright Spring", Celebrities: "Julia Louis-Dreyfus", Profession: "Actress", "Instagram URL": "officialjld", Image: "officialjld.jpg" },
    { Season: "Bright Spring", Celebrities: "Dan Stevens", Profession: "Actor", "Instagram URL": "thatdanstevens", Image: "thatdanstevens.jpg" },
    { Season: "Bright Spring", Celebrities: "Anushka Sharma", Profession: "Actress", "Instagram URL": "anushkasharma", Image: "anushkasharma.jpg" },
    { Season: "Bright Spring", Celebrities: "Richard Madden", Profession: "Actor", "Instagram URL": "maddenrichard", Image: "maddenrichard.jpg" },
    { Season: "Bright Spring", Celebrities: "Nicholas Hoult", Profession: "Actor", "Instagram URL": "nicholashoult", Image: "nicholashoult.jpg" },
    { Season: "Bright Spring", Celebrities: "Demi Lovato", Profession: "Singer", "Instagram URL": "ddlovato", Image: "ddlovato.jpg" },
    { Season: "Bright Spring", Celebrities: "Miranda Cosgrove", Profession: "Actress", "Instagram URL": "mirandacosgrove", Image: "mirandacosgrove.jpg" },
    { Season: "Bright Spring", Celebrities: "Heather Graham", Profession: "Actress", "Instagram URL": "imheathergraham", Image: "imheathergraham.jpg" },
    { Season: "Bright Spring", Celebrities: "Asa Butterfield", Profession: "Actor", "Instagram URL": "asabopp", Image: "asabopp.jpg" },

    // LIGHT SPRING
    { Season: "Light Spring", Celebrities: "Amanda Seyfried", Profession: "Actress", "Instagram URL": "mingey", Image: "mingey.jpg" },
    { Season: "Light Spring", Celebrities: "Elle Fanning", Profession: "Actress", "Instagram URL": "ellefanning", Image: "ellefanning.jpg" },
    { Season: "Light Spring", Celebrities: "Gigi Hadid", Profession: "Fashion Model", "Instagram URL": "gigihadid", Image: "gigihadid.jpg" },
    { Season: "Light Spring", Celebrities: "Matthew McConaughey", Profession: "Actor", "Instagram URL": "officiallymcconaughey", Image: "officiallymcconaughey.jpg" },
    { Season: "Light Spring", Celebrities: "Prince Harry", Profession: "Duke", "Instagram URL": "sussexroyal", Image: "sussexroyal.jpg" },
    { Season: "Light Spring", Celebrities: "Sophie Turner", Profession: "Actress", "Instagram URL": "sophiet", Image: "sophiet.jpg" },
    { Season: "Light Spring", Celebrities: "Woody Harrelson", Profession: "Actor", "Instagram URL": "woodyharrelson", Image: "woodyharrelson.jpg" },
    { Season: "Light Spring", Celebrities: "Rosamund Pike", Profession: "Actress", "Instagram URL": "mspike", Image: "mspike.jpg" },
    { Season: "Light Spring", Celebrities: "Taylor Swift", Profession: "Singer", "Instagram URL": "taylorswift", Image: "taylorswift.jpg" },
    { Season: "Light Spring", Celebrities: "Elizabeth Banks", Profession: "Actress", "Instagram URL": "elizabethbanks", Image: "elizabethbanks.jpg" },
    { Season: "Light Spring", Celebrities: "Jessica Chastain", Profession: "Actress", "Instagram URL": "jessicachastain", Image: "jessicachastain.jpg" },
    { Season: "Light Spring", Celebrities: "Kate Hudson", Profession: "Actress", "Instagram URL": "katehudson", Image: "katehudson.jpg" },

    // TRUE SPRING
    { Season: "True Spring", Celebrities: "Blake Lively", Profession: "Actress", "Instagram URL": "blakelively", Image: "blakelively.jpg" },
    { Season: "True Spring", Celebrities: "Sam Heughan", Profession: "Actor", "Instagram URL": "samheughan", Image: "samheughan.jpg" },
    { Season: "True Spring", Celebrities: "Cameron Diaz", Profession: "Actress", "Instagram URL": "camerondiaz", Image: "camerondiaz.jpg" },
    { Season: "True Spring", Celebrities: "Nicole Kidman", Profession: "Actress", "Instagram URL": "nicolekidman", Image: "nicolekidman.jpg" },
    { Season: "True Spring", Celebrities: "Charlize Theron", Profession: "Actress", "Instagram URL": "charlizeafrica", Image: "charlizeafrica.jpg" },
    { Season: "True Spring", Celebrities: "Katheryn Winnick", Profession: "Actress", "Instagram URL": "katherynwinnick", Image: "katherynwinnick.jpg" }, 
    { Season: "True Spring", Celebrities: "kristen bell", Profession: "Actress", "Instagram URL": "kristenanniebell", Image: "kristenanniebell.jpg" },
    { Season: "True Spring", Celebrities: "Diane Kruger", Profession: "Actress", "Instagram URL": "dianekruger", Image: "dianekruger.jpg" },
    { Season: "True Spring", Celebrities: "Chloë Grace Moretz", Profession: "Actress", "Instagram URL": "chloegmoretz", Image: "chloegmoretz.jpg" },
    { Season: "True Spring", Celebrities: "Gillian Anderson", Profession: "Actress", "Instagram URL": "gilliana", Image: "gilliana.jpg" },

    // SOFT AUTUMN
    { Season: "Soft Autumn", Celebrities: "Victoria Pedretti", Profession: "Actress", "Instagram URL": "then0t0ri0usvip", Image: "then0t0ri0usvip.jpg" },
    { Season: "Soft Autumn", Celebrities: "Audreyana Michelle", Profession: "Fashion Model", "Instagram URL": "audreyanamichelle", Image: "audreyanamichelle.jpg" },
    { Season: "Soft Autumn", Celebrities: "Nathalie Emmanuel", Profession: "Actress", "Instagram URL": "nathalieemmanuel", Image: "nathalieemmanuel.jpg" },
    { Season: "Soft Autumn", Celebrities: "Aidana Sahari", Profession: "Actress", "Instagram URL": "aidanasahari", Image: "aidanasahari.jpg" },
    { Season: "Soft Autumn", Celebrities: "Kate Upton", Profession: "Fashion Model", "Instagram URL": "kateupton", Image: "kateupton.jpg" },
    { Season: "Soft Autumn", Celebrities: "Gisele Bündchen", Profession: "Fashion Model", "Instagram URL": "gisele", Image: "gisele.jpg" },
    { Season: "Soft Autumn", Celebrities: "Jodie Comer", Profession: "Actress", "Instagram URL": "jodiemcomer", Image: "jodiemcomer.jpg" },
    { Season: "Soft Autumn", Celebrities: "Kate Moss", Profession: "Fashion Model", "Instagram URL": "katemossagency", Image: "katemossagency.jpg" },
    { Season: "Soft Autumn", Celebrities: "Justin Timberlake", Profession: "Singer", "Instagram URL": "justintimberlake", Image: "justintimberlake.jpg" },
    { Season: "Soft Autumn", Celebrities: "Chris Pratt", Profession: "Actor", "Instagram URL": "prattprattpratt", Image: "prattprattpratt.jpg" },
    { Season: "Soft Autumn", Celebrities: "Emily Browning", Profession: "Actress", "Instagram URL": "emilyjanebrowning", Image: "emilyjanebrowning.jpg" },
    { Season: "Soft Autumn", Celebrities: "Tom Hardy", Profession: "Actor", "Instagram URL": "tomhardy", Image: "tomhardy.jpg" },
    { Season: "Soft Autumn", Celebrities: "Florence Pugh", Profession: "Actress", "Instagram URL": "florencepugh", Image: "florencepugh.jpg" },
    { Season: "Soft Autumn", Celebrities: "Karlie Kloss", Profession: "Fashion Model", "Instagram URL": "karliekloss", Image: "karliekloss.jpg" },

    // DARK AUTUMN
    { Season: "Dark Autumn", Celebrities: "Naomi Scott", Profession: "Actress", "Instagram URL": "naomigscott", Image: "naomigscott.jpg" },
    { Season: "Dark Autumn", Celebrities: "Natalie Portman", Profession: "Actress", "Instagram URL": "natalieportman", Image: "natalieportman.jpg" },
    { Season: "Dark Autumn", Celebrities: "Hailee Steinfeld", Profession: "Actress", "Instagram URL": "haileesteinfeld", Image: "haileesteinfeld.jpg" },
    { Season: "Dark Autumn", Celebrities: "Jessica Alba", Profession: "Actress", "Instagram URL": "jessicaalba", Image: "jessicaalba.jpg" },
    { Season: "Dark Autumn", Celebrities: "Olivia Cooke", Profession: "Actress", "Instagram URL": "livkatecooke", Image: "livkatecooke.jpg" },  
    { Season: "Dark Autumn", Celebrities: "Millie Bobby Brown", Profession: "Actress", "Instagram URL": "milliebobbybrown", Image: "milliebobbybrown.jpg" },        
    { Season: "Dark Autumn", Celebrities: "Jennie Kim", Profession: "Singer", "Instagram URL": "jennierubyjane", Image: "jennierubyjane.jpg" },
    { Season: "Dark Autumn", Celebrities: "Pedro Pascal", Profession: "Actor", "Instagram URL": "pascalispunk", Image: "pascalispunk.jpg" },
    { Season: "Dark Autumn", Celebrities: "Ryan Reynolds", Profession: "Actor", "Instagram URL": "vancityreynolds", Image: "vancityreynolds.jpg" },
    { Season: "Dark Autumn", Celebrities: "Hugh Jackman", Profession: "Actor", "Instagram URL": "thehughjackman", Image: "thehughjackman.jpg" },

    // TRUE AUTUMN
    { Season: "True Autumn", Celebrities: "Darren Barnet", Profession: "Actor", "Instagram URL": "darrenbarnet", Image: "darrenbarnet.jpg" },
    { Season: "True Autumn", Celebrities: "Olga Kurylenko", Profession: "Actress", "Instagram URL": "olgakurylenkoofficial", Image: "olgakurylenkoofficial.jpg" },
    { Season: "True Autumn", Celebrities: "Kelsey Merritt", Profession: "Fashion Model", "Instagram URL": "kelseymerritt", Image: "kelseymerritt.jpg" },
    { Season: "True Autumn", Celebrities: "Alia Bhatt", Profession: "Actress", "Instagram URL": "aliaabhatt", Image: "aliaabhatt.jpg" },
    { Season: "True Autumn", Celebrities: "Ylona Garcia", Profession: "Singer", "Instagram URL": "ylonagarcia", Image: "ylonagarcia.jpg" },
    { Season: "True Autumn", Celebrities: "Will Poulter", Profession: "Actor", "Instagram URL": "willpoulter", Image: "willpoulter.jpg" },
    { Season: "True Autumn", Celebrities: "Ana Beatriz Barros", Profession: "Fashion Model", "Instagram URL": "anabeatrizbarrosofficial", Image: "anabeatrizbarrosofficial.jpg" },
    { Season: "True Autumn", Celebrities: "Ylona Garcia", Profession: "Actress", "Instagram URL": "lizasoberano", Image: "lizasoberano.jpg" },
    { Season: "True Autumn", Celebrities: "Ana de Armas", Profession: "Actress", "Instagram URL": "ana_d_armas", Image: "ana_d_armas.jpg" },
    { Season: "True Autumn", Celebrities: "Tsutsumi Hoang", Profession: "Content Creator", "Instagram URL": "xoxotsumi", Image: "xoxotsumi.jpg" },
    { Season: "True Autumn", Celebrities: "Jennifer Lopez", Profession: "Singer", "Instagram URL": "jlo", Image: "jlo.jpg" },
    { Season: "True Autumn", Celebrities: "Julianne Moore", Profession: "Actress", "Instagram URL": "juliannemoore", Image: "juliannemoore.jpg" },

    // SOFT SUMMER
    { Season: "Soft Summer", Celebrities: "Bella Hadid", Profession: "Fashion Model", "Instagram URL": "bellahadid", Image: "bellahadid.jpg" },
    { Season: "Soft Summer", Celebrities: "Patrick Dempsey", Profession: "Actor", "Instagram URL": "patrickdempsey", Image: "patrickdempsey.jpg" },
    { Season: "Soft Summer", Celebrities: "Dakota Johnson", Profession: "Actress", "Instagram URL": "dakotajohnson", Image: "dakotajohnson.jpg" },
    { Season: "Soft Summer", Celebrities: "Eva Green", Profession: "Actress", "Instagram URL": "evagreenweb", Image: "evagreenweb.jpg" },
    { Season: "Soft Summer", Celebrities: "Rob Lowe", Profession: "Actor", "Instagram URL": "roblowe", Image: "roblowe.jpg" },
    { Season: "Soft Summer", Celebrities: "Johannes Huebl", Profession: "Fashion Model", "Instagram URL": "johanneshuebl", Image: "johanneshuebl.jpg" },
    { Season: "Soft Summer", Celebrities: "Maisie Williams", Profession: "Actress", "Instagram URL": "maisie_williams", Image: "maisie_williams.jpg" },
    { Season: "Soft Summer", Celebrities: "Jennifer Aniston", Profession: "Actress", "Instagram URL": "jenniferaniston", Image: "jenniferaniston.jpg" },
    { Season: "Soft Summer", Celebrities: "Miranda Kerr", Profession: "Fashion Model", "Instagram URL": "mirandakerr", Image: "mirandakerr.jpg" },
    { Season: "Soft Summer", Celebrities: "Pierce Brosnan", Profession: "Actor", "Instagram URL": "piercebrosnanofficial", Image: "piercebrosnanofficial.jpg" },
    { Season: "Soft Summer", Celebrities: "Miley Cyrus", Profession: "Singer", "Instagram URL": "mileycyrus", Image: "mileycyrus.jpg" },
    { Season: "Soft Summer", Celebrities: "Liev Schreiber", Profession: "Actor", "Instagram URL": "lievschreiber", Image: "lievschreiber.jpg" },
    { Season: "Soft Summer", Celebrities: "Irina Shayk", Profession: "Fashion Model", "Instagram URL": "irinashayk", Image: "irinashayk.jpg" },
    { Season: "Soft Summer", Celebrities: "Kevin Costner", Profession: "Actor", "Instagram URL": "kevincostner", Image: "kevincostner.jpg" },
    { Season: "Soft Summer", Celebrities: "Emilia Clarke", Profession: "Actress", "Instagram URL": "emilia_clarke", Image: "emilia_clarke.jpg" },

    // LIGHT SUMMER
    { Season: "Light Summer", Celebrities: "Jude Law", Profession: "Actor", "Instagram URL": "d.judelaw", Image: "judelaw.jpg" },
    { Season: "Light Summer", Celebrities: "Gwyneth Paltrow", Profession: "Actor", "Instagram URL": "gwynethpaltrow", Image: "gwynethpaltrow.jpg" },
    { Season: "Light Summer", Celebrities: "Michelle Pfeiffer", Profession: "Actress", "Instagram URL": "michellepfeifferofficial", Image: "michellepfeifferofficial.jpg" },
    { Season: "Light Summer", Celebrities: "Reese Witherspoon", Profession: "Actress", "Instagram URL": "reesewitherspoon", Image: "reesewitherspoon.jpg" },
    { Season: "Light Summer", Celebrities: "Cary Elwes", Profession: "Actor", "Instagram URL": "caryelwes", Image: "caryelwes.jpg" },
    { Season: "Light Summer", Celebrities: "Naomi Watts", Profession: "Actress", "Instagram URL": "naomiwatts", Image: "naomiwatts.jpg" },
    { Season: "Light Summer", Celebrities: "Kirsten Dunst", Profession: "Actress", "Instagram URL": "kirstendunst", Image: "kirstendunst.jpg" },
    { Season: "Light Summer", Celebrities: "Yvonne Strahovski", Profession: "Actress", "Instagram URL": "yvonnestrahovski", Image: "yvonnestrahovski.jpg" },
    { Season: "Light Summer", Celebrities: "Malin Akerman", Profession: "Actress", "Instagram URL": "malinakerman", Image: "malinakerman.jpg" },
    { Season: "Light Summer", Celebrities: "Toni Garrn", Profession: "Fashion Model", "Instagram URL": "tonigarrn", Image: "tonigarrn.jpg" },
    { Season: "Light Summer", Celebrities: "Doutzen Kroes", Profession: "Fashion Model", "Instagram URL": "doutzen", Image: "doutzen.jpg" },
    { Season: "Light Summer", Celebrities: "Constance Jablonski", Profession: "Fashion Model", "Instagram URL": "constancejablonski", Image: "constancejablonski.jpg" },

    // TRUE SUMMER
    { Season: "True Summer", Celebrities: "Alison Brie", Profession: "Actress", "Instagram URL": "alisonbrie", Image: "alisonbrie.jpg" },
    { Season: "True Summer", Celebrities: "Olivia Wilde", Profession: "Actress", "Instagram URL": "oliviawilde", Image: "oliviawilde.jpg" },
    { Season: "True Summer", Celebrities: "Anna Kendrick", Profession: "Actress", "Instagram URL": "annakendrick47", Image: "annakendrick47.jpg" },
    { Season: "True Summer", Celebrities: "Matt Bomer", Profession: "Actor", "Instagram URL": "mattbomer", Image: "mattbomer.jpg" },
    { Season: "True Summer", Celebrities: "Yael Shelbia", Profession: "Fashion Model", "Instagram URL": "yaelshelbia", Image: "yaelshelbia.jpg" },

    // BRIGHT WINTER
    { Season: "Bright Winter", Celebrities: "Nicole Scherzinger", Profession: "Actress", "Instagram URL": "nicolescherzinger", Image: "nicolescherzinger.jpg" },
    { Season: "Bright Winter", Celebrities: "Dua Lipa", Profession: "Singer", "Instagram URL": "dualipa", Image: "dualipa.jpg" },
    { Season: "Bright Winter", Celebrities: "Krysten Ritter", Profession: "Actress", "Instagram URL": "krystenritter", Image: "krystenritter.jpg" },
    { Season: "Bright Winter", Celebrities: "Ben Stiller", Profession: "Actor", "Instagram URL": "benstiller", Image: "benstiller.jpg" },
    { Season: "Bright Winter", Celebrities: "Will Smith", Profession: "Actor", "Instagram URL": "willsmith", Image: "willsmith.jpg" },
    { Season: "Bright Winter", Celebrities: "Awkwafina", Profession: "Actress", "Instagram URL": "awkwafina", Image: "awkwafina.jpg" },
    { Season: "Bright Winter", Celebrities: "Carice van Houten", Profession: "Actress", "Instagram URL": "leavecaricealone", Image: "leavecaricealone.jpg" },
    { Season: "Bright Winter", Celebrities: "Idris Elba", Profession: "Actor", "Instagram URL": "idriselba", Image: "idriselba.jpg" },
    { Season: "Bright Winter", Celebrities: "Tom Cruise", Profession: "Actor", "Instagram URL": "tomcruise", Image: "tomcruise.jpg" },
    { Season: "Bright Winter", Celebrities: "Tamannaah Bhatia", Profession: "Actress", "Instagram URL": "tamannaahspeaks", Image: "tamannaahspeaks.jpg" },
    { Season: "Bright Winter", Celebrities: "Adrien Brody", Profession: "Actor", "Instagram URL": "adrienbrody", Image: "adrienbrody.jpg" },

    // DARK WINTER
    { Season: "Dark Winter", Celebrities: "Robert Downey Jr", Profession: "Actor", "Instagram URL": "robertdowneyjr", Image: "robertdowneyjr.jpg" },
    { Season: "Dark Winter", Celebrities: "Gal Gadot", Profession: "Actress", "Instagram URL": "gal_gadot", Image: "gal_gadot.jpg" },
    { Season: "Dark Winter", Celebrities: "Demi Moore", Profession: "Actress", "Instagram URL": "demimoore", Image: "demimoore.jpg" },
    { Season: "Dark Winter", Celebrities: "Penélope Cruz", Profession: "Actress", "Instagram URL": "penelopecruzoficial", Image: "penelopecruzoficial.jpg" },
    { Season: "Dark Winter", Celebrities: "Orlando Bloom", Profession: "Actor", "Instagram URL": "orlandobloom", Image: "orlandobloom.jpg" },
    { Season: "Dark Winter", Celebrities: "Zayn Malik", Profession: "Singer", "Instagram URL": "zayn", Image: "zayn.jpg" },
    { Season: "Dark Winter", Celebrities: "Simu Liu", Profession: "Actor", "Instagram URL": "simuliu", Image: "simuliu.jpg" },
    { Season: "Dark Winter", Celebrities: "Johnny Depp", Profession: "Actor", "Instagram URL": "johnnydepp", Image: "johnnydepp.jpg" },
    { Season: "Dark Winter", Celebrities: "Kim Kardashian", Profession: "Socialite", "Instagram URL": "kimkardashian", Image: "kimkardashian.jpg" },
    { Season: "Dark Winter", Celebrities: "Ariana Grande", Profession: "Singer", "Instagram URL": "arianagrande", Image: "arianagrande.jpg" },
    { Season: "Dark Winter", Celebrities: "Monica Bellucci", Profession: "Actress", "Instagram URL": "monicabellucciofficiel", Image: "monicabellucciofficiel.jpg" },
    { Season: "Dark Winter", Celebrities: "Catherine Zeta-Jones", Profession: "Actress", "Instagram URL": "catherinezetajones", Image: "catherinezetajones.jpg" },

    // TRUE WINTER
    { Season: "True Winter", Celebrities: "Iwan Rheon", Profession: "Actor", "Instagram URL": "_iwanrheon", Image: "_iwanrheon.jpg" },
    { Season: "True Winter", Celebrities: "Peter Gallagher", Profession: "Actor", "Instagram URL": "petergallagher", Image: "petergallagher.jpg" },
    { Season: "True Winter", Celebrities: "Aisling Bea", Profession: "Actress", "Instagram URL": "weemissbea", Image: "weemissbea.jpg" },
    { Season: "True Winter", Celebrities: "Ian Somerhalder", Profession: "Actor", "Instagram URL": "iansomerhalder", Image: "iansomerhalder.jpg" },
    { Season: "True Winter", Celebrities: "Anne Hathaway", Profession: "Actress", "Instagram URL": "annehathaway", Image: "annehathaway.jpg" },
    { Season: "True Winter", Celebrities: "Alexandra Daddario", Profession: "Actress", "Instagram URL": "alexandradaddario", Image: "alexandradaddario.jpg" },
    { Season: "True Winter", Celebrities: "Selena Gomez", Profession: "Singer", "Instagram URL": "selenagomez", Image: "selenagomez.jpg" },
    { Season: "True Winter", Celebrities: "Kendall Jenner", Profession: "Fashion Model", "Instagram URL": "kendalljenner", Image: "kendalljenner.jpg" },
    { Season: "True Winter", Celebrities: "Riz Ahmed", Profession: "Actor", "Instagram URL": "rizahmed", Image: "rizahmed.jpg" }
]);

// Expose a secure version globally only if needed (legacy support)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'getFeaturedCelebrityData', {
        value: getFeaturedCelebrityData,
        writable: false,
        configurable: false
    });
}