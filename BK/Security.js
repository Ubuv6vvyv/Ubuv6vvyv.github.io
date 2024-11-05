javascript:(function() {
    const PATTERNS = {
        SQL_INJECTION: { errors: [/SQL syntax.*MySQL/i, /Warning.*mysql_/i, /Microsoft OLE DB Provider for SQL Server/i, /ORA-[0-9]{4,5}/i, /PostgreSQL.*ERROR/i, /Driver.*SQL[-_ ]*Server/i, /SQLite\/JDBCDriver/i, /System\.Data\.SQLite\.SQLiteException/i, /Unclosed quotation mark after the character string/i, /You have an error in your SQL syntax/i, /SQLSTATE\[[0-9]+/i, /org\.postgresql\.util\.PSQLException/i, /MariaDB server version/i, /PDOException/i, /Access Database Engine/i, /Incorrect syntax near/i, /Syntax error in string in query expression/i, /could not execute statement/i, /error near/i, /syntax error in/i], blind: ["' AND '1'='1", "' AND '1'='2", "1 AND SLEEP(5)", "'; WAITFOR DELAY '0:0:5'--", "' OR SLEEP(5)='", "1) AND (SELECT * FROM (SELECT(SLEEP(5)))a)--", "' AND IF(1=1,SLEEP(5),0)--", "' OR 'x'='x", "1' OR '1'='1", "' UNION SELECT NULL, NULL --"], timeBasedPatterns: [/benchmark\s*\(/i, /sleep\s*\(/i, /wait\s*for\s*delay/i, /pg_sleep/i, /if\s*\(\s*1=1\s*\)\s*sleep\s*\(.*?\)/i] },
        XSS: { patterns: [/<script[^>]*>[\s\S]*?<\/script>/i, /on\w+\s*=\s*["']?[^"'>\s]+/i, /javascript:/i, /<img[^>]+src=["']?javascript:/i, /<iframe[^>]+src=["']?javascript:/i, /eval\s*\(/i, /document\.write\s*\(/i, /\.innerHTML\s*=\s*/i, /\.outerHTML\s*=\s*/i, /\.insertAdjacentHTML\s*\(/i, /\.execScript\s*\(/i, /\.fromCharCode\s*\(/i, /String\.fromCharCode\s*\(/i, /window\.location\s*=/i, /document\.cookie\s*=/i, /\.setRequestHeader\s*\(/i, /<svg[^>]*>/i, /<style[^>]*>/i], domBasedPatterns: [/location\s*\.\s*hash/i, /location\s*\.\s*href/i, /location\s*\.\s*search/i, /location\s*\.\s*pathname/i, /document\s*\.\s*URL/i, /document\s*\.\s*documentURI/i, /document\s*\.\s*URLUnencoded/i, /document\s*\.\s*baseURI/i, /document\s*\.\s*referrer/i, /window\.open\s*\(/i, /window\.location\.replace\s*\(/i] },
        DIRECTORY_TRAVERSAL: { patterns: [/root:.*:\/root:/i, /etc\/passwd/i, /proc\/self\/environ/i, /WINDOWS\/system32\/drivers\/etc/i, /C:\/Windows\/System32/i, /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//i, /%2e%2e%2f/i, /%252e%252e%252f/i, /\.\.%2f/i, /\.\.%252f/i, /\/\.\.\/+/i, /\/[^\/]+\/\.\.\/+/i], filePatterns: [/\.php$/i, /\.asp$/i, /\.jsp$/i, /\.config$/i, /\.ini$/i, /\.log$/i, /\.bak$/i, /\.old$/i, /\.backup$/i, /\.tmp$/i, /\.env$/i, /\.gitignore$/i] },
        SSRF: { patterns: [/(https?:)?\/\/([0-9]{1,3}\.){3}[0-9]{1,3}/i, /localhost/i, /127\.0\.0\.1/i, /::1/i, /169\.254\./i, /internal\./i, /intranet\./i, /192\.168\./i, /10\./i, /172\.(1[6-9]|2[0-9]|3[0-1])\./i, /file:\/\//i, /dict:\/\//i, /gopher:\/\//i, /ldap:\/\//i, /tftp:\/\//i, /0\.0\.0\.0/i, /0x7f\.0\.0\.1/i], cloudMetadata: [/169\.254\.169\.254/i, /metadata\.google\.internal/i, /metadata\.cloud\.internal/i, /169\.254\.170\.2/i, /169\.254\.169\.254/i] },
        INFO_DISCLOSURE: { patterns: [/phpinfo\(\)/i, /Exception (at|in)/i, /stack trace:/i, /([a-zA-Z]:\\)[^\s]+(\.php|\.asp|\.aspx|\.jsp)/i, /php warning/i, /runtime error/i, /<!--[\s\S]*?-->/i, /Database Error/i, /API[_-]KEY/i, /aws_access_key/i, /aws_secret_key/i, /smtp_password/i, /private_key/i, /secret_key/i, /password/i, /connection string/i, /debug/i, /sql error/i, /error on line/i, /debug trace/i, /dump/i, /trace.*?dump/i], sensitiveFiles: [/\.git\//i, /\.svn\//i, /\.env/i, /\.htaccess/i, /\.DS_Store/i, /web\.config/i, /config\.php/i, /settings\.php/i, /wp-config\.php/i, /secrets\.yml/i, /database\.yml/i] },
        SECURITY_HEADERS: { required: ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security', 'X-XSS-Protection', 'Referrer-Policy', 'Permissions-Policy'] }
    };

    class VulnerabilityDetectors {
        static async checkVulnerability(response, type) {
            try {
                const body = await response.clone().text();
                const headers = response.headers;
                const patterns = PATTERNS[type];
                const results = [];
                if (!patterns) return null;

                if (type === 'SECURITY_HEADERS') {
                    patterns.required.forEach(header => {
                        if (!headers.get(header)) {
                            results.push({ type: 'SECURITY_HEADERS', subtype: 'missing_header', evidence: `Missing ${header}`, confidence: 'medium', impact: 'medium', recommendation: `Implement ${header} header` });
                        }
                    });
                }

                Object.entries(patterns).forEach(([subtype, patternList]) => {
                    if (Array.isArray(patternList)) {
                        patternList.forEach(pattern => {
                            if (pattern instanceof RegExp && pattern.test(body)) {
                                const match = body.match(pattern)[0];
                                results.push({
                                    type,
                                    subtype,
                                    evidence: match,
                                    confidence: this.calculateConfidence(type, subtype, match),
                                    impact: this.assessImpact(type, subtype),
                                    location: this.findLocation(body, pattern),
                                    recommendation: this.getRecommendation(type, subtype)
                                });
                            }
                        });
                    }
                });
                return results;
            } catch (error) {
                console.error(`${type} check failed:`, error);
                return null;
            }
        }

        static calculateConfidence(type, subtype, evidence) {
            let score = 0;
            if (type === 'SQL_INJECTION' && /error in your SQL syntax/i.test(evidence)) score += 3;
            if (type === 'XSS' && /<script/i.test(evidence)) score += 3;
            if (evidence.length > 50) score += 2;
            return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
        }

        static assessImpact(type, subtype) {
            const impacts = {
                'SQL_INJECTION': 'high',
                'XSS': 'high',
                'DIRECTORY_TRAVERSAL': 'high',
                'SSRF': 'high',
                'INFO_DISCLOSURE': 'high',
                'SECURITY_HEADERS': 'medium'
            };
            return impacts[type] || 'unknown';
        }

        static findLocation(body, pattern) {
            const index = body.indexOf(pattern.source);
            const lineNumber = (body.substr(0, index).match(/\n/g) || []).length + 1;
            return `Line: ${lineNumber}`;
        }

        static getRecommendation(type, subtype) {
            const recommendations = {
                'SQL_INJECTION': 'Use prepared statements and parameterized queries.',
                'XSS': 'Sanitize user input and use Content Security Policy.',
                'DIRECTORY_TRAVERSAL': 'Validate file paths and user inputs.',
                'SSRF': 'Restrict outgoing requests to trusted domains.',
                'INFO_DISCLOSURE': 'Avoid exposing sensitive information.',
                'SECURITY_HEADERS': 'Implement necessary security headers.'
            };
            return recommendations[type] || 'No recommendation available.';
        }
    }

    async function scanPage() {
        const results = [];
        const response = await fetch(window.location.href);
        const vulnerabilityChecks = Object.keys(PATTERNS).map(type => {
            return VulnerabilityDetectors.checkVulnerability(response, type);
        });
        
        const resultsArray = await Promise.all(vulnerabilityChecks);
        resultsArray.forEach(result => {
            if (result) results.push(...result);
        });

        if (results.length > 0) {
            console.table(results);
            alert('Vulnerabilities found! Check the console for details.');
        } else {
            console.log('No vulnerabilities found.');
        }
    }

    scanPage();
})();
