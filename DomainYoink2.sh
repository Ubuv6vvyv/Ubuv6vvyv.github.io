#!/bin/bash

# Termux Domain Information Gatherer

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}########################################${NC}"
echo -e "${BLUE}#     Termux Domain Info Gatherer      #${NC}"
echo -e "${BLUE}#        (No Root Required)            #${NC}"
echo -e "${BLUE}########################################${NC}"
echo

# Prompt for domain name
read -p "Enter the domain name (e.g., example.com): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}Error: No domain entered. Exiting.${NC}"
    exit 1
fi

# Temp file for discovered domains from crt.sh
TEMP_DOMAIN_FILE=$(mktemp)

echo -e "\n${YELLOW}Gathering information for: ${DOMAIN}${NC}\n"

# Function to extract DNS records using dig
get_dns_record() {
    RECORD_TYPE=$1
    echo -e "${GREEN}--- ${RECORD_TYPE} Records ---${NC}"
    OUTPUT=$(dig +short "$DOMAIN" "$RECORD_TYPE" 2>/dev/null) # Redirect stderr to /dev/null
    if [[ -n "$OUTPUT" ]]; then
        echo "$OUTPUT"
    else
        echo -e "${YELLOW}No ${RECORD_TYPE} records found.${NC}"
    fi
    echo
}

# Function to extract SOA record using dig
get_soa_record() {
    echo -e "${GREEN}--- SOA Record (Start of Authority) ---${NC}"
    OUTPUT=$(dig "$DOMAIN" SOA 2>/dev/null | grep -E "SOA" | grep -v ";" | sed 's/^[ \t]*//')
    if [[ -n "$OUTPUT" ]]; then
        echo "$OUTPUT"
    else
        echo -e "${YELLOW}No SOA record found.${NC}"
    fi
    echo
}

# Function to get DNS server version (using bind.version)
get_dns_server_version() {
    echo -e "${GREEN}--- DNS Server Version (via version.bind) ---${NC}"
    # Try querying a common public DNS server for version.bind
    OUTPUT=$(dig @8.8.8.8 version.bind CHS TXT 2>/dev/null | grep -E "version.bind" | grep -v ";" | sed 's/^[ \t]*//')
    if [[ -n "$OUTPUT" ]]; then
        echo "$OUTPUT"
    else
        echo -e "${YELLOW}Could not retrieve DNS server version (often not exposed).${NC}"
    fi
    echo -e "${YELLOW}(Note: This often reveals the server's version to which 8.8.8.8 forwards the request, not necessarily the authoritative DNS server for the domain itself. It's more of a general DNS server fingerprinting technique.)${NC}"
    echo
}

# Function to get HTTP/S banner and status code
get_http_info() {
    echo -e "${GREEN}--- HTTP/S Information ---${NC}"

    # --- HTTP (port 80) ---
    echo -e "${BLUE}Checking HTTP (port 80):${NC}"
    HTTP_HEADERS=$(curl -s -L -D - -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null)
    HTTP_STATUS=$(echo "$HTTP_HEADERS" | tail -n 1) # Last line is the http_code
    HTTP_SERVER=$(echo "$HTTP_HEADERS" | head -n -1 | grep -i "^Server:" | head -n 1) # All but last line are headers

    if [[ -n "$HTTP_STATUS" ]]; then
        echo "Status Code: $HTTP_STATUS"
        if [[ "$HTTP_STATUS" =~ ^3[0-9]{2}$ ]]; then
            echo -e "${YELLOW}  Redirect detected! Status $HTTP_STATUS. (curl follows redirects by default).${NC}"
        fi
        if [[ -n "$HTTP_SERVER" ]]; then
            echo "Server: ${HTTP_SERVER#Server: }" # Remove "Server: " prefix
        else
            echo -e "${YELLOW}  Server header not found for HTTP.${NC}"
        fi
    else
        echo -e "${RED}Could not retrieve HTTP info or domain not accessible on port 80.${NC}"
    fi

    echo

    # --- HTTPS (port 443) ---
    echo -e "${BLUE}Checking HTTPS (port 443):${NC}"
    HTTPS_HEADERS=$(curl -s -L -D - -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null)
    HTTPS_STATUS=$(echo "$HTTPS_HEADERS" | tail -n 1)
    HTTPS_SERVER=$(echo "$HTTPS_HEADERS" | head -n -1 | grep -i "^Server:" | head -n 1)

    if [[ -n "$HTTPS_STATUS" ]]; then
        echo "Status Code: $HTTPS_STATUS"
        if [[ "$HTTPS_STATUS" =~ ^3[0-9]{2}$ ]]; then
            echo -e "${YELLOW}  Redirect detected! Status $HTTPS_STATUS. (curl follows redirects by default).${NC}"
        fi
        if [[ -n "$HTTPS_SERVER" ]]; then
            echo "Server: ${HTTPS_SERVER#Server: }"
        else
            echo -e "${YELLOW}  Server header not found for HTTPS.${NC}"
        fi
    else
        echo -e "${RED}Could not retrieve HTTPS info or domain not accessible on port 443.${NC}"
    fi
    echo
}

# Function to check for robots.txt and sitemap.xml
check_sensitive_paths() {
    echo -e "${GREEN}--- Robots.txt and Sitemap.xml Check ---${NC}"

    # Check for robots.txt
    echo -e "${BLUE}Checking for robots.txt:${NC}"
    ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/robots.txt" 2>/dev/null)
    if [[ "$ROBOTS_STATUS" == "200" ]]; then
        echo -e "${GREEN}robots.txt found! Content:${NC}"
        curl -s "http://$DOMAIN/robots.txt"
    else
        echo -e "${YELLOW}robots.txt not found or inaccessible (HTTP Status: $ROBOTS_STATUS)${NC}"
    fi
    echo

    # Check for sitemap.xml
    echo -e "${BLUE}Checking for sitemap.xml:${NC}"
    SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/sitemap.xml" 2>/dev/null)
    if [[ "$SITEMAP_STATUS" == "200" ]]; then
        echo -e "${GREEN}sitemap.xml found! Content (first 20 lines):${NC}"
        curl -s "http://$DOMAIN/sitemap.xml" | head -n 20
        echo -e "${YELLOW}(Showing first 20 lines for brevity)${NC}"
    else
        echo -e "${YELLOW}sitemap.xml not found or inaccessible (HTTP Status: $SITEMAP_STATUS)${NC}"
    fi
    echo
}

# Function to get WHOIS information
get_whois_info() {
    echo -e "${GREEN}--- WHOIS Information ---${NC}"
    if command -v whois &> /dev/null; then
        WHOIS_OUTPUT=$(whois "$DOMAIN" 2>/dev/null) # Capture full output and suppress stderr
        if [[ -z "$WHOIS_OUTPUT" || "$WHOIS_OUTPUT" =~ "No match for" || "$WHOIS_OUTPUT" =~ "NOT FOUND" || "$WHOIS_OUTPUT" =~ "No Data Found" ]]; then
            echo -e "${YELLOW}No significant WHOIS information found or domain not registered.${NC}"
        else
            echo "$WHOIS_OUTPUT" | grep -E "Registrar:|Creation Date:|Expiration Date:|Updated Date:|Name Server:|Domain Status:|Registrant Name:|Registrant Organization:|Registrant Email:|Registrant Phone:"
            echo -e "${YELLOW}(Note: WHOIS output can vary greatly between registrars and TLDs. Not all fields may be present or accurate.)${NC}"
        fi
    else
        echo -e "${RED}WHOIS utility not found. Please install it: pkg install whois${NC}"
    fi
    echo
}

# Function to query CRT.sh for certificates and related domains
get_crt_sh_certs() {
    echo -e "${GREEN}--- CRT.sh Certificate Information ---${NC}"
    echo -e "${BLUE}Querying CRT.sh for certificates related to *.${DOMAIN}${NC}"
    CRT_SH_URL="https://crt.sh/?q=%25.$DOMAIN&output=json"

    # Fetch JSON output from crt.sh
    CRT_DATA=$(curl -s "$CRT_SH_URL" 2>/dev/null)

    if [[ -z "$CRT_DATA" || "$CRT_DATA" == "[]" ]]; then
        echo -e "${YELLOW}No certificate information found on CRT.sh for *.${DOMAIN}.${NC}"
    else
        # Extract common names and subject alternative names, filter out wildcards, and store unique domains
        # Capture stdout into a temporary file
        (
        echo "$CRT_DATA" | grep -oP '(?<="common_name":")[^"]*' | grep -v '^\*\.'
        echo "$CRT_DATA" | grep -oP '(?<="name_value":")[^"]*' | tr ',' '\n' | grep -v '^\*\.' | grep -oP '\b[a-zA-Z0-9.-]+\.'${DOMAIN}'\b'
        ) | sort -u > "$TEMP_DOMAIN_FILE"

        if [[ -s "$TEMP_DOMAIN_FILE" ]]; then
            echo -e "${BLUE}Discovered unique, non-wildcard domains from Certificates:${NC}"
            cat "$TEMP_DOMAIN_FILE"
        else
            echo -e "${YELLOW}No unique, non-wildcard domains found in CRT.sh output after filtering.${NC}"
        fi
        echo -e "${YELLOW}(Note: This extracts common names and subject alternative names from public certificates.)${NC}"
    fi
    echo
}

# Function to check a single URL for accessibility, banner, and title
check_single_url() {
    local target_domain=$1
    local url="https://$target_domain" # Prioritize HTTPS as requested
    local status_code=""
    local server_header="N/A"
    local page_title="N/A"

    echo -e "\n${BLUE}--- Checking URL: $url ---${NC}"

    # Get status code and server header
    # -L: follow redirects
    # -k: insecure, allow self-signed certs (useful for some dev sites, remove if strict cert validation needed)
    # -D -: dump headers to stdout/stderr, then process with sed/grep
    # -o /dev/null: discard body
    # -w "%{http_code}": write HTTP status code to stdout after everything else
    HTTP_INFO=$(curl -s -L -k -D - -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    # Extract status code (last line of HTTP_INFO due to -w "%{http_code}")
    status_code=$(echo "$HTTP_INFO" | tail -n 1)

    # Extract server header from the rest of the HTTP_INFO (headers)
    server_header_line=$(echo "$HTTP_INFO" | head -n -1 | grep -i "^Server:" | head -n 1)
    if [[ -n "$server_header_line" ]]; then
        server_header="${server_header_line#Server: }" # Remove "Server: " prefix
    fi

    echo -e "  Status: ${YELLOW}$status_code${NC}"
    echo -e "  Server: ${YELLOW}$server_header${NC}"

    if [[ "$status_code" =~ ^2[0-9]{2}$ || "$status_code" =~ ^3[0-9]{2}$ ]]; then
        # Only try to get title if connection was successful or redirected
        # Fetch up to 50KB of content to find the title, as pages can be large
        page_content_head=$(curl -s -L -k "$url" | head -c 50000 2>/dev/null)
        page_title=$(echo "$page_content_head" | grep -iPo '(?<=<title>)(.*?)(?=</title>)' | head -n 1)
        if [[ -n "$page_title" ]]; then
            echo -e "  Title: ${YELLOW}$page_title${NC}"
        else
            echo -e "  ${YELLOW}Title: N/A (Title tag not found or could not retrieve page content sufficiently)${NC}"
        fi
    else
        echo -e "  ${RED}Title: N/A (URL not accessible or returned an error status)${NC}"
    fi
}


# --- Execute the extractions ---

# DNS Records
get_dns_record "A"
get_dns_record "AAAA"
get_dns_record "NS"
get_dns_record "MX"
get_dns_record "TXT"
get_dns_record "CNAME"
get_dns_record "SRV" # SRV records often require specific service names (e.g., _sip._tcp.domain.com). This will query for the general SRV record for the domain.
get_dns_record "DNSKEY"
get_dns_record "DS"
get_dns_record "NSEC"
get_dns_record "RRSIG"
get_soa_record
get_dns_server_version # This is more for general DNS server fingerprinting

# HTTP/S Information
get_http_info

# Hidden/Sensitive Path Checks
check_sensitive_paths

# WHOIS Information (requires 'whois' package)
get_whois_info

# CRT.sh Information and subsequent URL checking
get_crt_sh_certs

# Check discovered domains if any were found
if [[ -s "$TEMP_DOMAIN_FILE" ]]; then # -s checks if file exists and is not empty
    echo -e "\n${GREEN}--- Checking Discovered Subdomains for Accessibility ---${NC}"
    while IFS= read -r sub_domain; do
        check_single_url "$sub_domain"
    done < "$TEMP_DOMAIN_FILE"
else
    echo -e "${YELLOW}No discovered subdomains to check from CRT.sh.${NC}"
fi

# Clean up temporary file
rm -f "$TEMP_DOMAIN_FILE"

echo -e "${BLUE}########################################${NC}"
echo -e "${BLUE}#        Information Gathering Done!   #${NC}"
echo -e "${BLUE}########################################${NC}"
