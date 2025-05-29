#!/bin/sh

TARGET_DOMAIN="cheapsmokes.com.au"
DNS_SERVER="@1.1.1.1"
USER_AGENT="Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/117.0 Firefox/117.0"

# Logging function
log_error() {
    echo "[ERROR] $1" >&2
}

log_info() {
    echo "[INFO] $1"
}

log_success() {
    echo "[SUCCESS] $1"
}

# Simple web connectivity check function
check_web_simple() {
    local domain_or_sub="$1"
    local proto="$2"
    local url="$proto://$domain_or_sub"
    
    echo "  >> Testing $url"
    
    # Use curl with multiple fallback methods
    local response_code=""
    local title=""
    local server=""
    local temp_file="/tmp/curl_simple_$"
    
    # Method 1: Try with full headers and follow redirects
    response_code=$(curl -s -L -o "$temp_file" -w "%{http_code}" "$url" \
        --max-time 10 \
        --connect-timeout 5 \
        --insecure \
        --user-agent "$USER_AGENT" \
        --compressed 2>/dev/null)
    
    if [ "$response_code" -ge 200 ] && [ "$response_code" -lt 600 ]; then
        echo "     Response Code: $response_code"
        
        # Get server header with a separate quick request
        server=$(curl -s -I "$url" --max-time 5 --insecure -A "$USER_AGENT" 2>/dev/null | grep -i "^server:" | cut -d: -f2- | sed 's/^ *//' | tr -d '\r\n')
        if [ -n "$server" ]; then
            echo "     Server: $server"
        fi
        
        # Extract title if we have content
        if [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
            # Try multiple methods to get title
            title=$(grep -i '<title' "$temp_file" | head -n 1 | sed 's/.*<title[^>]*>//i' | sed 's/<\/title>.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | head -c 100)
            
            if [ -z "$title" ]; then
                # Fallback method
                title=$(awk 'BEGIN{IGNORECASE=1} /<title/{gsub(/.*<title[^>]*>|<\/title>.*/,""); if(length($0)>0) print substr($0,1,100); exit}' "$temp_file")
            fi
            
            if [ -n "$title" ]; then
                echo "     Title: $title"
            fi
            
            # Show content type if available in file (from previous header request)
            local content_type=$(curl -s -I "$url" --max-time 3 --insecure -A "$USER_AGENT" 2>/dev/null | grep -i "^content-type:" | cut -d: -f2- | sed 's/^ *//' | tr -d '\r\n')
            if [ -n "$content_type" ]; then
                echo "     Content-Type: $content_type"
            fi
            
            local file_size=$(wc -c < "$temp_file" 2>/dev/null || echo "0")
            echo "     Content Size: $file_size bytes"
        fi
        
    else
        # Try basic connectivity test
        if curl -s --max-time 5 --connect-timeout 3 -I "$url" >/dev/null 2>&1; then
            echo "     Connection: Reachable but got response code: $response_code"
        else
            echo "     Connection: Failed to connect"
        fi
    fi
    
    rm -f "$temp_file" 2>/dev/null
    echo ""
}

# Check if required tools are available
check_dependencies() {
    local missing_tools=""
    
    for tool in curl dig whois nmap; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools="$missing_tools $tool"
        fi
    done
    
    if [ -n "$missing_tools" ]; then
        log_error "Missing required tools:$missing_tools"
        echo "Install with: pkg install$missing_tools"
        return 1
    fi
    
    return 0
}

# Main execution starts here
echo "=================================================="
echo "  ENHANCED DOMAIN INTELLIGENCE GATHERING"
echo "  Target: $TARGET_DOMAIN"
echo "  Runtime: $(date)"
echo "=================================================="
echo ""

# Check dependencies
if ! check_dependencies; then
    exit 1
fi

# Test DNS connectivity
log_info "Testing DNS connectivity..."
if ! dig @1.1.1.1 google.com A +short >/dev/null 2>&1; then
    log_error "DNS connectivity issue. Trying alternative DNS server."
    DNS_SERVER="@8.8.8.8"
    if ! dig @8.8.8.8 google.com A +short >/dev/null 2>&1; then
        log_error "DNS completely unavailable. Some checks may fail."
    fi
fi

# --- Initial DNS Information ---
echo "=================================================="
echo "  DNS RECORDS"
echo "=================================================="
for record_type in A AAAA MX TXT NS; do
    echo ""
    echo "[$record_type Records]"
    if ! dig "$record_type" "$TARGET_DOMAIN" +short "$DNS_SERVER" 2>/dev/null; then
        log_error "Failed to retrieve $record_type records"
    fi
done
echo ""

# --- Enhanced Whois with error handling ---
echo "=================================================="
echo "  WHOIS INFORMATION"
echo "=================================================="
if ! whois "$TARGET_DOMAIN" 2>/dev/null; then
    log_error "Whois lookup failed - may be rate limited or blocked"
fi
echo ""

# --- Subdomain Discovery ---
echo "=================================================="
echo "  SUBDOMAIN DISCOVERY"
echo "=================================================="
log_info "Querying Certificate Transparency logs..."

SUBDOMAINS=$(curl -s --max-time 30 "https://crt.sh/?q=%25.$TARGET_DOMAIN&output=json" | \
  grep -o '"name_value":"[^"]*"' | \
  cut -d ':' -f 2- | \
  tr -d '"' | \
  sed 's/\\n/\n/g' | \
  grep -E "\.$TARGET_DOMAIN$" | \
  sort -u | \
  grep -v '^\*' | \
  head -n 200) # Show all results

if [ -z "$SUBDOMAINS" ]; then
    log_error "No subdomains found via crt.sh"
else
    log_success "Found $(echo "$SUBDOMAINS" | wc -l) subdomains"
    echo "$SUBDOMAINS" # Show all subdomains
fi
echo ""

# --- IP Information ---
echo "=================================================="
echo "  IP ANALYSIS"
echo "=================================================="
PRIMARY_IP=$(dig +short "$TARGET_DOMAIN" "$DNS_SERVER" | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' | head -n 1)

if [ -n "$PRIMARY_IP" ]; then
    log_success "Primary IP: $PRIMARY_IP"
    echo ""
    echo "[IP Geolocation]"
    if ! curl -s --max-time 10 "https://ipinfo.io/$PRIMARY_IP/json" | grep -q "ip"; then
        log_error "IP geolocation failed"
    else
        curl -s --max-time 10 "https://ipinfo.io/$PRIMARY_IP/json" | \
        sed 's/[{}"]//g' | sed 's/,/\n/g' | sed 's/^[[:space:]]*/  /'
    fi
    echo ""
    
    echo "[Reverse DNS]"
    if ! dig -x "$PRIMARY_IP" +short "$DNS_SERVER"; then
        log_error "Reverse DNS lookup failed"
    fi
    echo ""
else
    log_error "Could not determine primary IP address"
fi

# --- Enhanced Web Server Analysis ---
echo "=================================================="
echo "  WEB SERVER ANALYSIS"
echo "=================================================="

# Check main domain
echo ""
echo "[Main Domain: $TARGET_DOMAIN]"
for proto in https http; do
    check_web_simple "$TARGET_DOMAIN" "$proto"
done

# Check common subdomains
echo ""
echo "[Common Subdomains]"
for sub in www mail ftp admin portal api m mobile app; do
    SUBDOMAIN="$sub.$TARGET_DOMAIN"
    echo ""
    echo ">> Checking: $SUBDOMAIN"
    
    # Quick check if subdomain resolves
    if dig +short "$SUBDOMAIN" "$DNS_SERVER" | grep -q .; then
        for proto in https http; do
            check_web_simple "$SUBDOMAIN" "$proto"
        done
    else
        echo "   DNS resolution failed for $SUBDOMAIN"
    fi
done

# Check discovered subdomains (sample)
if [ -n "$SUBDOMAINS" ]; then
    echo ""
    echo "[Discovered Subdomains - All Results]"
    echo "$SUBDOMAINS" | while read -r DISCOVERED_SUBDOMAIN; do
        if [ -n "$DISCOVERED_SUBDOMAIN" ]; then
            echo ""
            echo ">> Checking discovered: $DISCOVERED_SUBDOMAIN"
            for proto in https http; do
                check_web_simple "$DISCOVERED_SUBDOMAIN" "$proto"
            done
        fi
    done
fi

# --- Common Web Paths ---
echo ""
echo "=================================================="
echo "  COMMON WEB PATHS"
echo "=================================================="
for path in robots.txt sitemap.xml .well-known/security.txt favicon.ico; do
    echo ""
    echo "[Checking /$path]"
    for proto in https http; do
        url="$proto://$TARGET_DOMAIN/$path"
        temp_file="/tmp/path_check_$"
        
        if curl -s -o "$temp_file" -w "%{http_code}" "$url" \
            --max-time 10 \
            -A "$USER_AGENT" | grep -q "200"; then
            log_success "Found $path"
            head -n 10 "$temp_file" | sed 's/^/  /'
            echo ""
            break
        fi
        rm -f "$temp_file" 2>/dev/null
    done
done

# --- Email Security Records ---
echo ""
echo "=================================================="
echo "  EMAIL SECURITY RECORDS"
echo "=================================================="
echo ""
echo "[DMARC Record]"
dig TXT "_dmarc.$TARGET_DOMAIN" +short "$DNS_SERVER" | grep "v=DMARC1" || echo "  No DMARC record found"
echo ""

echo "[SPF Record]"
dig TXT "$TARGET_DOMAIN" +short "$DNS_SERVER" | grep "v=spf1" || echo "  No SPF record found"
echo ""

# --- Port Scanning (Android-friendly) ---
echo "=================================================="
echo "  PORT SCANNING"
echo "=================================================="
if [ -n "$PRIMARY_IP" ]; then
    log_info "Scanning common ports on $PRIMARY_IP"
    # Use timeout to prevent hanging on Android
    if command -v timeout >/dev/null 2>&1; then
        timeout 60 nmap -Pn -T4 -p 21,22,25,53,80,110,143,443,465,587,993,995,3306,3389,8080,8443 "$PRIMARY_IP" 2>/dev/null || log_error "Port scan failed or timed out"
    else
        nmap -Pn -T4 -p 21,22,25,53,80,110,143,443,465,587,993,995,3306,3389,8080,8443 "$PRIMARY_IP" 2>/dev/null || log_error "Port scan failed"
    fi
else
    log_error "No IP address for port scanning"
fi
echo ""

# --- SSL Certificate Information ---
echo ""
echo "=================================================="
echo "  SSL CERTIFICATE ANALYSIS"
echo "=================================================="
if command -v openssl >/dev/null 2>&1; then
    log_info "Retrieving SSL certificate for $TARGET_DOMAIN"
    
    # Use timeout to prevent hanging
    if echo "Q" | timeout 15 openssl s_client -connect "$TARGET_DOMAIN:443" -servername "$TARGET_DOMAIN" -showcerts 2>/dev/null | openssl x509 -noout -text 2>/dev/null; then
        log_success "SSL certificate retrieved"
    else
        log_error "SSL certificate retrieval failed"
    fi
else
    log_error "OpenSSL not available. Install with: pkg install openssl"
fi
echo ""

# --- Summary ---
echo ""
echo "=================================================="
echo "  INTELLIGENCE SUMMARY"
echo "=================================================="
echo ""
echo "Target Domain: $TARGET_DOMAIN"
echo "Primary IP: ${PRIMARY_IP:-"Not found"}"
echo "Subdomains Found: $(echo "$SUBDOMAINS" | wc -l 2>/dev/null || echo "0")"
echo "Scan Completed: $(date)"
echo ""

# --- OSINT Suggestions ---
echo "=================================================="
echo "  FURTHER OSINT SUGGESTIONS"
echo "=================================================="
cat << EOF
Manual checks to consider:
  • Google Dorking: site:$TARGET_DOMAIN OR inurl:$TARGET_DOMAIN
  • Social Media: Search LinkedIn, Twitter for company info
  • GitHub/GitLab: Search for $TARGET_DOMAIN or employee emails
  • Archive.org: Historical website versions
  • Shodan.io: Search for $PRIMARY_IP or $TARGET_DOMAIN
  • ViewDNS.info: Historical DNS records
  • Builtwith.com: Technology stack analysis
  • Censys.io: Internet-wide scanning data
EOF
echo ""
log_success "Domain intelligence gathering completed!"
