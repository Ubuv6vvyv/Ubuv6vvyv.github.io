javascript:(function() {
    const PATTERNS = {
        SQL_INJECTION: {
            errors: [/SQL syntax.*MySQL/i, /Warning.*mysql_/i, /Microsoft OLE DB Provider for SQL Server/i, /ORA-[0-9]{4,5}/i, 
                    /PostgreSQL.*ERROR/i, /Driver.*SQL[-_ ]*Server/i, /SQLite\/JDBCDriver/i, /System\.Data\.SQLite\.SQLiteException/i,
                    /Unclosed quotation mark after the character string/i, /You have an error in your SQL syntax/i, /SQLSTATE\[[0-9]+/i,
                    /org\.postgresql\.util\.PSQLException/i, /MariaDB server version/i, /PDOException/i, /Access Database Engine/i,
                    /Incorrect syntax near/i, /Syntax error in string in query expression/i, /could not execute statement/i,
                    /error near/i, /syntax error in/i, /MySQL Error/i, /SQL Server Error/i],
            blind: ["' AND '1'='1", "' AND '1'='2", "1 AND SLEEP(5)", "'; WAITFOR DELAY '0:0:5'--", "' OR SLEEP(5)='",
                   "1) AND (SELECT * FROM (SELECT(SLEEP(5)))a)--", "' AND IF(1=1,SLEEP(5),0)--", "' OR 'x'='x",
                   "1' OR '1'='1", "' UNION SELECT NULL, NULL --"],
            timeBasedPatterns: [/benchmark\s*\(/i, /sleep\s*\(/i, /wait\s*for\s*delay/i, /pg_sleep/i,
                               /if\s*\(\s*1=1\s*\)\s*sleep\s*\(.*?\)/i]
        },
        XSS: {
            patterns: [/<script[^>]*>[\s\S]*?<\/script>/i, /on\w+\s*=\s*["']?[^"'>\s]+/i, /javascript:/i,
                      /<img[^>]+src=["']?javascript:/i, /<iframe[^>]+src=["']?javascript:/i, /eval\s*\(/i,
                      /document\.write\s*\(/i, /\.innerHTML\s*=\s*/i, /\.outerHTML\s*=\s*/i,
                      /\.insertAdjacentHTML\s*\(/i, /\.execScript\s*\(/i, /\.fromCharCode\s*\(/i,
                      /String\.fromCharCode\s*\(/i, /window\.location\s*=/i, /document\.cookie\s*=/i,
                      /\.setRequestHeader\s*\(/i, /<svg[^>]*>/i, /<style[^>]*>/i, /data:text\/html/i,
                      /base64.*,/i, /alert\s*\(/i, /prompt\s*\(/i, /confirm\s*\(/i],
            domBasedPatterns: [/location\s*\.\s*hash/i, /location\s*\.\s*href/i, /location\s*\.\s*search/i,
                              /location\s*\.\s*pathname/i, /document\s*\.\s*URL/i, /document\s*\.\s*documentURI/i,
                              /document\s*\.\s*URLUnencoded/i, /document\s*\.\s*baseURI/i,
                              /document\s*\.\s*referrer/i, /window\.open\s*\(/i,
                              /window\.location\.replace\s*\(/i]
        },
        DIRECTORY_TRAVERSAL: {
            patterns: [/root:.*:\/root:/i, /etc\/passwd/i, /proc\/self\/environ/i,
                      /WINDOWS\/system32\/drivers\/etc/i, /C:\/Windows\/System32/i,
                      /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//i, /%2e%2e%2f/i,
                      /%252e%252e%252f/i, /\.\.%2f/i, /\.\.%252f/i, /\/\.\.\/+/i,
                      /\/[^\/]+\/\.\.\/+/i, /\.\.\\+/i],
            filePatterns: [/\.php$/i, /\.asp$/i, /\.jsp$/i, /\.config$/i, /\.ini$/i,
                          /\.log$/i, /\.bak$/i, /\.old$/i, /\.backup$/i, /\.tmp$/i,
                          /\.env$/i, /\.gitignore$/i, /\.git\/config$/i, /\.svn\/entries$/i]
        },
        SSRF: {
            patterns: [/(https?:)?\/\/([0-9]{1,3}\.){3}[0-9]{1,3}/i, /localhost/i,
                      /127\.0\.0\.1/i, /::1/i, /169\.254\./i, /internal\./i,
                      /intranet\./i, /192\.168\./i, /10\./i,
                      /172\.(1[6-9]|2[0-9]|3[0-1])\./i, /file:\/\//i, /dict:\/\//i,
                      /gopher:\/\//i, /ldap:\/\//i, /tftp:\/\//i, /0\.0\.0\.0/i,
                      /0x7f\.0\.0\.1/i],
            cloudMetadata: [/169\.254\.169\.254/i, /metadata\.google\.internal/i,
                          /metadata\.cloud\.internal/i, /169\.254\.170\.2/i]
        },
        INFO_DISCLOSURE: {
            patterns: [/phpinfo\(\)/i, /Exception (at|in)/i, /stack trace:/i,
                      /([a-zA-Z]:\\)[^\s]+(\.php|\.asp|\.aspx|\.jsp)/i,
                      /php warning/i, /runtime error/i, /<!--[\s\S]*?-->/i,
                      /Database Error/i, /API[_-]KEY/i, /aws_access_key/i,
                      /aws_secret_key/i, /smtp_password/i, /private_key/i,
                      /secret_key/i, /password/i, /connection string/i, /debug/i,
                      /sql error/i, /error on line/i, /debug trace/i, /dump/i,
                      /trace.*?dump/i, /[A-Za-z0-9+/]{64,}={0,2}/],
            sensitiveFiles: [/\.git\//i, /\.svn\//i, /\.env/i, /\.htaccess/i,
                           /\.DS_Store/i, /web\.config/i, /config\.php/i,
                           /settings\.php/i, /wp-config\.php/i, /secrets\.yml/i,
                           /database\.yml/i]
        },
        SECURITY_HEADERS: {
            required: ['Content-Security-Policy', 'X-Frame-Options',
                      'X-Content-Type-Options', 'Strict-Transport-Security',
                      'X-XSS-Protection', 'Referrer-Policy',
                      'Permissions-Policy', 'Cross-Origin-Opener-Policy',
                      'Cross-Origin-Embedder-Policy',
                      'Cross-Origin-Resource-Policy'],
            recommended: ['Feature-Policy', 'Expect-CT']
        },
        JWT: {
            patterns: [/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g],
            weakAlgorithms: ['none', 'HS256']
        },
        CORS: {
            patterns: [/Access-Control-Allow-Origin:\s*\*/i,
                      /Access-Control-Allow-Credentials:\s*true/i]
        }
    };

    class SecurityUtils {
        static async sha256(str) {
            const msgBuffer = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        static calculateEntropy(str) {
            const freq = {};
            for (let i = 0; i < str.length; i++) {
                freq[str[i]] = (freq[str[i]] || 0) + 1;
            }
            return Object.values(freq).reduce((entropy, count) => {
                const p = count / str.length;
                return entropy - p * Math.log2(p);
            }, 0);
        }
    }

    class VulnerabilityDetectors {
        static async checkVulnerability(response, type) {
            try {
                const body = await response.clone().text();
                const url = response.url;
                const headers = response.headers;
                const patterns = PATTERNS[type];
                const results = [];

                if (!patterns) return null;

                switch(type) {
                    case 'SECURITY_HEADERS':
                        this.checkSecurityHeaders(headers, results);
                        break;
                    case 'JWT':
                        this.checkJWTVulnerabilities(body, results);
                        break;
                    case 'CORS':
                        this.checkCORSConfiguration(headers, results);
                        break;
                    default:
                        this.checkPatterns(body, patterns, type, results);
                }

                return results;
            } catch (error) {
                console.error(`${type} check failed:`, error);
                return null;
            }
        }

        static checkSecurityHeaders(headers, results) {
            const headersList = Array.from(headers.entries());
            PATTERNS.SECURITY_HEADERS.required.forEach(header => {
                const found = headersList.find(([key]) => 
                    key.toLowerCase() === header.toLowerCase()
                );
                if (!found) {
                    results.push({
                        type: 'SECURITY_HEADERS',
                        subtype: 'missing_header',
                        evidence: `Missing ${header}`,
                        confidence: 'high',
                        impact: 'medium',
                        recommendation: `Implement ${header} header with appropriate values`
                    });
                } else {
                    this.validateHeaderValue(header, found[1], results);
                }
            });
        }

        static validateHeaderValue(header, value, results) {
            switch(header) {
                case 'Content-Security-Policy':
                    if (value.includes('unsafe-inline') || value.includes('unsafe-eval')) {
                        results.push({
                            type: 'SECURITY_HEADERS',
                            subtype: 'weak_csp',
                            evidence: value,
                            confidence: 'high',
                            impact: 'medium',
                            recommendation: 'Avoid using unsafe-inline and unsafe-eval in CSP'
                        });
                    }
                    break;
                case 'X-Frame-Options':
                    if (!['DENY', 'SAMEORIGIN'].includes(value.toUpperCase())) {
                        results.push({
                            type: 'SECURITY_HEADERS',
                            subtype: 'weak_xfo',
                            evidence: value,
                            confidence: 'high',
                            impact: 'medium',
                            recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN'
                        });
                    }
                    break;
            }
        }

        static async checkJWTVulnerabilities(body, results) {
            const jwtMatches = body.match(PATTERNS.JWT.patterns[0]) || [];
            for (const jwt of jwtMatches) {
                try {
                    const [header] = jwt.split('.');
                    const decodedHeader = JSON.parse(atob(header));
                    if (PATTERNS.JWT.weakAlgorithms.includes(decodedHeader.alg)) {
                        results.push({
                            type: 'JWT',
                            subtype: 'weak_algorithm',
                            evidence: jwt,
                            confidence: 'high',
                            impact: 'high',
                            recommendation: 'Use strong JWT algorithms like RS256 or ES256'
                        });
                    }
                } catch (e) {
                    console.error('Error analyzing JWT:', e);
                }
            }
        }

        static checkCORSConfiguration(headers, results) {
            const acao = headers.get('Access-Control-Allow-Origin');
            const acac = headers.get('Access-Control-Allow-Credentials');

            if (acao === '*' && acac === 'true') {
                results.push({
                    type: 'CORS',
                    subtype: 'misconfiguration',
                    evidence: 'Wildcard CORS with credentials',
                    confidence: 'high',
                    impact: 'high',
                    recommendation: 'Specify explicit origins instead of wildcard when allowing credentials'
                });
            }
        }

        static checkPatterns(body, patterns, type, results) {
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
        }

        static calculateConfidence(type, subtype, evidence) {
            let score = 0;
            const evidenceHash = evidence.toLowerCase();
            
            // Type-specific confidence scoring
            switch(type) {
                case 'SQL_INJECTION':
                    if (/error in your SQL syntax/i.test(evidenceHash)) score += 3;
                    if (/SELECT|INSERT|UPDATE|DELETE/i.test(evidenceHash)) score += 2;
                    break;
                case 'XSS':
                    if (/<script/i.test(evidenceHash)) score += 3;
                    if (/onerror|onload|onclick/i.test(evidenceHash)) score += 2;
                    break;
                case 'INFO_DISCLOSURE':
                    if (/password|secret|key/i.test(evidenceHash)) score += 3;
                    if (SecurityUtils.calculateEntropy(evidence) > 4) score += 2;
                    break;
            }

            if (evidence.length > 50) score += 1;
            return score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
        }

        static assessImpact(type, subtype) {
            const impacts = {
                'SQL_INJECTION': 'critical',
                'XSS': 'high',
                'DIRECTORY_TRAVERSAL': 'high',
                'SSRF': 'critical',
                'INFO_DISCLOSURE': 'high',
                'SECURITY_HEADERS': 'medium',
                'JWT': 'high',
                'CORS': 'high'
            };
            return impacts[type] || 'unknown';
        }

        static findLocation(body, pattern) {
            const lines = body.split('\n');
            let lineNumber = 0;
            let columnNumber = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(pattern);
                if (match) {
                    lineNumber = i + 1;
                    columnNumber = match.index + 1;
                    break;
                }
            }
            
            return `Line: ${lineNumber}, Column: ${columnNumber}`;
        }

        static getRecommendation(type, subtype) {
            const recommendations = {
                'SQL_INJECTION': {
                    'errors': 'Use prepared statements, parameterized queries, and input validation. Consider using an ORM.',
                    'blind': 'Implement proper input validation and use prepared statements. Monitor for time-based attacks.',
                    'timeBasedPatterns': 'Implement request timeout limits and use prepared statements.'
                },
                'XSS': {
                    'patterns': 'Implement Content Security Policy (CSP), sanitize user input, use DOMPurify for HTML sanitization.',
                    'domBasedPatterns': 'Sanitize user input, validate URLs, and implement strict CSP rules.'
                },
                'DIRECTORY_TRAVERSAL': {
                    'patterns': 'Validate and sanitize file paths, implement proper access controls, use whitelisting.',
                    'filePatterns': 'Restrict access to sensitive files, implement proper file permissions.'
                },
                'SSRF': {
                    'patterns': 'Implement URL validation, whitelist allowed domains, restrict internal network access.',
                    'cloudMetadata': 'Block access to cloud metadata endpoints, implement proper network segmentation.'
                },
                'INFO_DISCLOSURE': {
                    'patterns': 'Remove debug information, implement proper error handling, sanitize error messages.',
                    'sensitiveFiles': 'Restrict access to sensitive files, implement proper access controls.'
                },
                'JWT': {
                    'weak_algorithm': 'Use strong algorithms (RS256, ES256), implement proper key management.',
                    'exposure': 'Store JWTs securely, implement proper token validation.'
                },
                'CORS': {
                    'misconfiguration': 'Specify explicit origins, avoid wildcards with credentials, implement proper CORS policy.'
                }
            };
            
            return recommendations[type]?.[subtype] || recommendations[type] || 'Implement security best practices and proper input validation.';
        }
    }

    class ReportGenerator {
        static generateHTML(results) {
            const timestamp = new Date().toISOString();
            const pageUrl = window.location.href;
            
            let html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Security Audit Report - ${new URL(pageUrl).hostname}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 2rem; }
                        .report-header { margin-bottom: 2rem; }
                        .vulnerability { 
                            border: 1px solid #ddd; 
                            margin: 1rem 0; 
                            padding: 1rem;
                            border-radius: 4px;
                        }
                        .critical { border-left: 5px solid #ff0000; }
                        .high { border-left: 5px solid #ff9900; }
                        .medium { border-left: 5px solid #ffcc00; }
                        .low { border-left: 5px solid #99cc00; }
                        .evidence { 
                            background: #f5f5f5;
                            padding: 1rem;
                            margin: 0.5rem 0;
                            overflow-x: auto;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 1rem 0;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 0.5rem;
                            text-align: left;
                        }
                        th { background: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h1>Security Audit Report</h1>
                        <p><strong>URL:</strong> ${pageUrl}</p>
                        <p><strong>Scan Date:</strong> ${timestamp}</p>
                        <p><strong>Total Issues Found:</strong> ${results.length}</p>
                    </div>
                    <div class="vulnerabilities">
            `;

            // Group results by type
            const groupedResults = results.reduce((acc, result) => {
                acc[result.type] = acc[result.type] || [];
                acc[result.type].push(result);
                return acc;
            }, {});

            // Generate sections for each vulnerability type
            Object.entries(groupedResults).forEach(([type, typeResults]) => {
                html += `
                    <h2>${type}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Subtype</th>
                                <th>Evidence</th>
                                <th>Location</th>
                                <th>Confidence</th>
                                <th>Impact</th>
                                <th>Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                typeResults.forEach(result => {
                    html += `
                        <tr class="${result.impact.toLowerCase()}">
                            <td>${result.subtype}</td>
                            <td><div class="evidence">${this.escapeHtml(result.evidence)}</div></td>
                            <td>${result.location}</td>
                            <td>${result.confidence}</td>
                            <td>${result.impact}</td>
                            <td>${result.recommendation}</td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;
            });

            html += `
                    </div>
                </body>
                </html>
            `;

            return html;
        }

        static escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        static downloadReport(results) {
            const html = this.generateHTML(results);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-audit-report-${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    async function scanPage() {
        const results = [];
        try {
            const response = await fetch(window.location.href);
            const vulnerabilityChecks = Object.keys(PATTERNS).map(type => 
                VulnerabilityDetectors.checkVulnerability(response, type)
            );
            
            const resultsArray = await Promise.all(vulnerabilityChecks);
            resultsArray.forEach(result => {
                if (result) results.push(...result);
            });

            // Sort results by impact severity
            results.sort((a, b) => {
                const impactOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
                return impactOrder[a.impact] - impactOrder[b.impact];
            });

            if (results.length > 0) {
                console.table(results);
                const download = confirm(`Found ${results.length} potential security issues. Would you like to download the detailed report?`);
                if (download) {
                    ReportGenerator.downloadReport(results);
                }
            } else {
                alert('No security issues detected in the initial scan.');
            }
        } catch (error) {
            console.error('Scan failed:', error);
            alert('Security scan failed. Please check the console for details.');
        }
    }

    // Start the scan
    scanPage();
})();
