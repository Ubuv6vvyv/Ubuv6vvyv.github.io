javascript:(function() {
    // Configuration for Speed and Efficiency
    const CONFIG = {
        maxDepth: 5, // Recursion depth for domain crawling
        timeout: 8000, // Timeout duration for faster scanning
        concurrentScans: 10, // Number of concurrent scans
        sensitivityLevel: 'high',
        debugMode: true,
        excludeSecretsFromCrawl: true,
        excludedDomains: [
            'google.com', 'facebook.com', 'twitter.com', 
            'amazonaws.com', 'cloudfront.net', 'jsdelivr.net'
        ],
        excludedExtensions: [
            '.pdf', '.zip', '.exe', '.dll', '.bin', 
            '.jpg', '.png', '.gif', '.jpeg', '.svg', 
            '.woff', '.woff2', '.ttf', '.eot'
        ],
        detectionRules: {
            secrets: {
                patterns: [
                    /\b[A-Fa-f0-9]{32,64}\b/g, // Common hex/base64 secrets
                    /\b(?:sk_|pk_|oauth_)[A-Za-z0-9_\-./]+\b/gi, // API keys, tokens
                    /\b(?:secret|key|token|password)[\s:='"]+([A-Za-z0-9+/=]{20,})\b/gi, // Secrets with context
                    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
                    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
                    /\b\d{13,16}\b/, // Credit card pattern
                    /\b\$[\d,]+(?:\.\d{2})?\b/ // Price detection
					/["']?zopim[_-]?account[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?zhuliang[_-]?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?zensonatypepassword["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?zendesk[_-]?travis[_-]?github["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?server[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?partner[_-]?refresh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?partner[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?account[_-]?refresh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yt[_-]?account[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yangshun[_-]?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?yangshun[_-]?gh[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?www[_-]?googleapis[_-]?com["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?ssh[_-]?private[_-]?key[_-]?base64["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?ssh[_-]?connect["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?report[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?prepare[_-]?dir["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?db[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpt[_-]?db[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wporg[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wpjm[_-]?phpunit[_-]?google[_-]?geocode[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wordpress[_-]?db[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wordpress[_-]?db[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wincert[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?test[_-]?server["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?fb[_-]?password[_-]?3["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?fb[_-]?password[_-]?2["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?fb[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?basic[_-]?password[_-]?5["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?basic[_-]?password[_-]?4["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?basic[_-]?password[_-]?3["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?basic[_-]?password[_-]?2["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?widget[_-]?basic[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?watson[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?watson[_-]?device[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?watson[_-]?conversation[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?wakatime[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?vscetoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?visual[_-]?recognition[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?virustotal[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?vip[_-]?github[_-]?deploy[_-]?key[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?vip[_-]?github[_-]?deploy[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?vip[_-]?github[_-]?build[_-]?repo[_-]?deploy[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?v[_-]?sfdc[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?v[_-]?sfdc[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?usertravis["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?user[_-]?assets[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?user[_-]?assets[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?use[_-]?ssh["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?us[_-]?east[_-]?1[_-]?elb[_-]?amazonaws[_-]?com["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?urban[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?urban[_-]?master[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?urban[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?unity[_-]?serial["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?unity[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twitteroauthaccesstoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twitteroauthaccesssecret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twitter[_-]?consumer[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twitter[_-]?consumer[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twine[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?configuration[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?chat[_-]?account[_-]?api[_-]?service["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?api[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?twilio[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?trex[_-]?okta[_-]?client[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?trex[_-]?client[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?secure[_-]?env[_-]?vars["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?pull[_-]?request["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?e2e[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?com[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?branch["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?travis[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?token[_-]?core[_-]?java["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?thera[_-]?oss[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?tester[_-]?keys[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?test[_-]?test["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?test[_-]?github[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?tesco[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?svn[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?surge[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?surge[_-]?login["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?stripe[_-]?public["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?stripe[_-]?private["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?strip[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?strip[_-]?publishable[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?stormpath[_-]?api[_-]?key[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?stormpath[_-]?api[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?starship[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?starship[_-]?account[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?star[_-]?test[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?star[_-]?test[_-]?location["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?star[_-]?test[_-]?bucket["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?star[_-]?test[_-]?aws[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?staging[_-]?base[_-]?url[_-]?runscope["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ssmtp[_-]?config["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sshpass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?srcclr[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?square[_-]?reader[_-]?sdk[_-]?repository[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sqssecretkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sqsaccesskey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?spring[_-]?mail[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?spotify[_-]?api[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?spotify[_-]?api[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?spaces[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?spaces[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?soundcloud[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?soundcloud[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatypepassword["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?token[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?token[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?nexus[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?gpg[_-]?passphrase["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonatype[_-]?gpg[_-]?key[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonar[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonar[_-]?project[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sonar[_-]?organization[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?socrata[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?socrata[_-]?app[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?snyk[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?snyk[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?snoowrap[_-]?refresh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?snoowrap[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?snoowrap[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?slate[_-]?user[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?slash[_-]?developer[_-]?space[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?slash[_-]?developer[_-]?space["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?signing[_-]?key[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?signing[_-]?key[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?signing[_-]?key[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?signing[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?setsecretkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?setdstsecretkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?setdstaccesskey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ses[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ses[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?service[_-]?account[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sentry[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sentry[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sentry[_-]?endpoint["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sentry[_-]?default[_-]?org["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sentry[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendwithus[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sendgrid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?selion[_-]?selenium[_-]?host["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?selion[_-]?log[_-]?level[_-]?dev["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?segment[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secretid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secretkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secretaccesskey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?key[_-]?base["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?9["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?8["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?7["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?6["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?5["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?4["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?3["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?2["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?11["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?10["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?1["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?secret[_-]?0["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sdr[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?scrutinizer[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sauce[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sandbox[_-]?aws[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sandbox[_-]?aws[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sandbox[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?salesforce[_-]?bulk[_-]?test[_-]?security[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?salesforce[_-]?bulk[_-]?test[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sacloud[_-]?api["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sacloud[_-]?access[_-]?token[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?sacloud[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?user[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?secret[_-]?assets["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?secret[_-]?app[_-]?logs["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?key[_-]?assets["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?key[_-]?app[_-]?logs["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?external[_-]?3[_-]?amazonaws[_-]?com["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?bucket[_-]?name[_-]?assets["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?bucket[_-]?name[_-]?app[_-]?logs["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?s3[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rubygems[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rtd[_-]?store[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rtd[_-]?key[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?route53[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ropsten[_-]?private[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rinkeby[_-]?private[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rest[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?repotoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?reporting[_-]?webdav[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?reporting[_-]?webdav[_-]?pwd["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?release[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?release[_-]?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?registry[_-]?secure["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?registry[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?refresh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rediscloud[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?redis[_-]?stunnel[_-]?urls["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?randrmusicapiaccesstoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?rabbitmq[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?quip[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?qiita[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pypi[_-]?passowrd["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pushover[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?publish[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?publish[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?publish[_-]?access["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?project[_-]?config["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?prod[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?prod[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?prod[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?private[_-]?signing[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pring[_-]?mail[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?preferred[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?prebuild[_-]?auth["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?postgresql[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?postgresql[_-]?db["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?postgres[_-]?env[_-]?postgres[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?postgres[_-]?env[_-]?postgres[_-]?db["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?plugin[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?plotly[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?places[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?places[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pg[_-]?host["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pg[_-]?database["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?personal[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?personal[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?percy[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?percy[_-]?project["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?paypal[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?passwordtravis["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?parse[_-]?js[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?pagerduty[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?packagecloud[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ossrh[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ossrh[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ossrh[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ossrh[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ossrh[_-]?jira[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?os[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?os[_-]?auth[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?org[_-]?project[_-]?gradle[_-]?sonatype[_-]?nexus[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?org[_-]?gradle[_-]?project[_-]?sonatype[_-]?nexus[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?openwhisk[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?open[_-]?whisk[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?onesignal[_-]?user[_-]?auth[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?onesignal[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?omise[_-]?skey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?omise[_-]?pubkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?omise[_-]?pkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?omise[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?okta[_-]?oauth2[_-]?clientsecret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?okta[_-]?oauth2[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?okta[_-]?client[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ofta[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ofta[_-]?region["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ofta[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?octest[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?octest[_-]?app[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?octest[_-]?app[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?oc[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?object[_-]?store[_-]?creds["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?object[_-]?store[_-]?bucket["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?object[_-]?storage[_-]?region[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?object[_-]?storage[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?oauth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?numbers[_-]?service[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nuget[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nuget[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nuget[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?npm[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?now[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?non[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?node[_-]?pre[_-]?gyp[_-]?secretaccesskey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?node[_-]?pre[_-]?gyp[_-]?github[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?node[_-]?pre[_-]?gyp[_-]?accesskeyid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?node[_-]?env["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ngrok[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ngrok[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nexuspassword["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nexus[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?new[_-]?relic[_-]?beta[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?netlify[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?nativeevents["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysqlsecret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysqlmasteruser["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?root[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?hostname["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mysql[_-]?database["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?my[_-]?secret[_-]?env["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?multi[_-]?workspace[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?multi[_-]?workflow[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?multi[_-]?disconnect[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?multi[_-]?connect[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?multi[_-]?bob[_-]?sid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?minio[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?minio[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mile[_-]?zero[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mh[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mh[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mg[_-]?public[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mg[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mapboxaccesstoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mapbox[_-]?aws[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mapbox[_-]?aws[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mapbox[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mapbox[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?manifest[_-]?app[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?manifest[_-]?app[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mandrill[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?managementapiaccesstoken["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?management[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?manage[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?manage[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?secret[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?pub[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?pub[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?priv[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?apikey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailgun[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailer[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailchimp[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mailchimp[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?mail[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?magento[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?magento[_-]?auth[_-]?username ["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?magento[_-]?auth[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lottie[_-]?upload[_-]?cert[_-]?key[_-]?store[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lottie[_-]?upload[_-]?cert[_-]?key[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lottie[_-]?s3[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lottie[_-]?happo[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lottie[_-]?happo[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?looker[_-]?test[_-]?runner[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ll[_-]?shared[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ll[_-]?publish[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?linux[_-]?signing[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?linkedin[_-]?client[_-]?secretor lottie[_-]?s3[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lighthouse[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lektor[_-]?deploy[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?lektor[_-]?deploy[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?leanplum[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kxoltsn3vogdop92m["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kubeconfig["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kubecfg[_-]?s3[_-]?path["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kovan[_-]?private[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?keystore[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kafka[_-]?rest[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kafka[_-]?instance[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?kafka[_-]?admin[_-]?url["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?jwt[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?jdbc:mysql["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?jdbc[_-]?host["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?jdbc[_-]?databaseurl["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?itest[_-]?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ios[_-]?docs[_-]?deploy[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?internal[_-]?secrets["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?integration[_-]?test[_-]?appid["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?integration[_-]?test[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?index[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ij[_-]?repo[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ij[_-]?repo[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hub[_-]?dxia2[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?homebrew[_-]?github[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hockeyapp[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?heroku[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?heroku[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?heroku[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hb[_-]?codesign[_-]?key[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hb[_-]?codesign[_-]?gpg[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hab[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?hab[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?grgit[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gren[_-]?github[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gradle[_-]?signing[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gradle[_-]?signing[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gradle[_-]?publish[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gradle[_-]?publish[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?secret[_-]?keys["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?private[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?passphrase["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?ownertrust["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?keyname["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gpg[_-]?key[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?private[_-]?key[_-]?(id)?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?maps[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?client[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?client[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?google[_-]?account[_-]?type["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gogs[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gitlab[_-]?user[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?tokens["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?repo["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?release[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?pwd["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?oauth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?oauth["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?hunter[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?hunter[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?deployment[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?deploy[_-]?hb[_-]?doc[_-]?pass["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?auth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?auth["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?github[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?committer[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?committer[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?author[_-]?name["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?git[_-]?author[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ghost[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ghb[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?unstable[_-]?oauth[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?repo[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?oauth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?oauth[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?next[_-]?unstable[_-]?oauth[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?next[_-]?unstable[_-]?oauth[_-]?client[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?next[_-]?oauth[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?email["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gh[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gcs[_-]?bucket["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gcr[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gcloud[_-]?service[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gcloud[_-]?project["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?gcloud[_-]?bucket["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?username["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?user["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?pw["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?password["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?login["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?ftp[_-]?host["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?fossa[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?flickr[_-]?api[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?flickr[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?flask[_-]?secret[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
					/["']?firefox[_-]?secret["'
                ]
            },
            urls: {
                patterns: [
                    /https?:\/\/[^\s'"]+/gi,
                    /['"]([^'"]*\.(php|html?|asp[x]?|jsp|json|xml)[^'"]*)/gi,
                    /\/[\w\-\/]+\.[\w\-]+/g,
                    /data-[^\s]+=['"]([^'"]+)['"]/gi // Data attribute URLs
                ]
            }
        }
    };

    // Logger Class for Output and Downloading Logs
    class AdvancedLogger {
        constructor() {
            this.logContainer = this.createLogContainer();
            this.logs = {
                urls: [],
                secrets: [],
                externalDomains: [],
                errors: [],
                dynamicUrls: [],
                sitemaps: [],
                jsFiles: [],
                cssFiles: []
            };
        }

        createLogContainer() {
            // Create and style the log container
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed; 
                bottom: 0; 
                left: 0; 
                width: 100%; 
                max-height: 50%; 
                overflow: auto; 
                background: rgba(0,0,0,0.9); 
                color: #00ff00; 
                z-index: 10000; 
                padding: 10px; 
                font-family: monospace;
                font-size: 12px;
            `;
            document.body.appendChild(container);

            // Create a button to download logs
            const downloadButton = document.createElement('button');
            downloadButton.innerText = "Download Logs";
            downloadButton.style.cssText = `
                margin: 10px;
                padding: 5px 10px;
                font-size: 14px;
                cursor: pointer;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
            `;
            downloadButton.onclick = () => this.exportLogs();
            container.appendChild(downloadButton);

            return container;
        }

        log(message, type = 'info', context = '') {
            // Log messages and append them to the container
            const colorMap = {
                info: '#00ff00',
                secret: '#ff0000',
                external: '#ffff00',
                error: '#ff6600',
                dynamic: '#00ffff',
                sensitiveData: '#ff00ff',
                sitemap: '#ff99ff',
                js: '#66ff66',
                css: '#99ccff'
            };

            const logEntry = document.createElement('div');
            logEntry.style.color = colorMap[type] || '#ffffff';
            logEntry.innerHTML = `
                <span>[${type.toUpperCase()}]</span> 
                ${message} 
                ${context ? `<small style="color: #888;">${context}</small>` : ''}
            `;
            
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;

            // Store log entries in arrays for downloading
            if (type === 'url' || type === 'dynamic') {
                this.logs.urls.push({ url: message, context });
            }
            if (this.logs[type + 's']) {
                this.logs[type + 's'].push({ message, context });
            }

            // Debug logging
            if (CONFIG.debugMode) {
                console.log(type, message, context);
            }
        }

        exportLogs() {
            // Export logs as a text file
            const exportData = {
                timestamp: new Date().toISOString(),
                url: location.href,
                logs: this.logs
            };

            // Convert to readable text format for download
            let logText = `Timestamp: ${exportData.timestamp}\nURL: ${exportData.url}\n\n`;

            // Adding URLs and resources
            logText += 'URLs Found:\n';
            exportData.logs.urls.forEach(entry => {
                logText += `${entry.url} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            // Adding other logs
            logText += '\nSecrets Found:\n';
            exportData.logs.secrets.forEach(entry => {
                logText += `${entry.message} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            logText += '\nErrors:\n';
            exportData.logs.errors.forEach(entry => {
                logText += `${entry.message} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `web_spider_logs_${new Date().toISOString().replace(/:/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // Optimized Web Crawler Class
    class WebSpider {
        constructor(logger) {
            this.logger = logger;
            this.scannedUrls = new Set();  // Track visited URLs
            this.queuedUrls = new Set();  // Queue URLs for scanning
        }

        // Check if URL is valid (not already visited and within domain)
        isValidUrl(url) {
            try {
                const parsedUrl = new URL(url);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;

                // Exclude known domains or irrelevant file extensions
                if (CONFIG.excludedDomains.some(domain => parsedUrl.hostname.includes(domain))) return false;
                if (CONFIG.excludedExtensions.some(ext => url.toLowerCase().endsWith(ext))) return false;

                return true;
            } catch {
                return false;
            }
        }

        // Extract URLs and resources from page content
        extractContentResources(document) {
            const resources = new Set();
            const selectors = [
                'a[href]', 'img[src]', 'script[src]', 
                'link[href]', 'iframe[src]', 'source[src]'
            ];

            // Extract href/src URLs from elements
            document.querySelectorAll(selectors.join(',')).forEach(el => {
                const href = el.getAttribute('href');
                const src = el.getAttribute('src');
                [href, src].forEach(url => {
                    if (url && this.isValidUrl(url)) {
                        resources.add(new URL(url, location.href).href);
                    }
                });
            });

            // Inline JS and CSS URL extraction
            document.querySelectorAll('script, style').forEach(el => {
                const content = el.textContent;
                const extractedUrls = this.extractUrlsFromText(content);
                extractedUrls.forEach(url => resources.add(url));
            });

            return resources;
        }

        // Extract URLs from text (for inline scripts/styles)
        extractUrlsFromText(text) {
            const urlSet = new Set();
            CONFIG.detectionRules.urls.patterns.forEach(pattern => {
                const matches = text.match(pattern) || [];
                matches.forEach(match => {
                    try {
                        const url = new URL(match, location.href).href;
                        if (this.isValidUrl(url)) {
                            urlSet.add(url);
                        }
                    } catch {}
                });
            });
            return [...urlSet];
        }

        // Detect secrets in content
        detectSecrets(content) {
            const detections = { secrets: [], sensitiveData: [] };

            CONFIG.detectionRules.secrets.patterns.forEach(pattern => {
                const matches = content.match(pattern) || [];
                matches.forEach(match => {
                    detections.secrets.push(match);
                });
            });

            return detections;
        }

        // Perform the web crawling task
        async crawl(url, depth = 0) {
            if (depth >= CONFIG.maxDepth || this.scannedUrls.has(url)) return;

            this.scannedUrls.add(url);
            this.queuedUrls.add(url);

            this.logger.log(`Scanning: ${url} | Depth: ${depth}`, 'info');

            try {
                const response = await fetch(url, { timeout: CONFIG.timeout });
                const text = await response.text();

                // Extract URLs and resources
                const resources = this.extractContentResources(new DOMParser().parseFromString(text, 'text/html'));
                resources.forEach(resource => this.logger.log(resource, 'url', url));

                // Check for secrets in the page content
                const secrets = this.detectSecrets(text);
                secrets.secrets.forEach(secret => {
                    this.logger.log(secret, 'secret', url);
                });

                // Add discovered resources to the queue for further scanning
                for (let resource of resources) {
                    if (!this.scannedUrls.has(resource)) {
                        await this.crawl(resource, depth + 1);
                    }
                }

            } catch (error) {
                this.logger.log(`Error fetching ${url}: ${error.message}`, 'error');
            }
        }

        // Scan multiple URLs in parallel
        async parallelScan(urls, depth) {
            const tasks = urls.slice(0, CONFIG.concurrentScans).map(url => this.crawl(url, depth));
            await Promise.all(tasks);
        }
    }

    // Initialize and start the crawling process
    const logger = new AdvancedLogger();
    const spider = new WebSpider(logger);
    spider.crawl(location.href);
})();
