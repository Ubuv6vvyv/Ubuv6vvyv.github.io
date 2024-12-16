! function() {
    window.onbeforeunload = () =>
        "You have unsaved changes. Are you sure you want to leave?";
    const e = (e, t) => {
        console.group(e), t.length ? console.table(t) : console
            .log(
                "No results found."), console.groupEnd()
    };
    e("Links", Array.from(document.querySelectorAll("a[href]"))
            .map((e => e.href))), e("Forms", Array.from(document
                .querySelectorAll("form"))
            .map((e => ({
                action: e.action,
                method: e.method,
                inputs: Array.from(e
                        .elements
                    )
                    .map((e => ({
                        name: e.name,
                        type: e.type
                    })))
            })))), e("Images", Array.from(document.querySelectorAll(
                "img"))
            .map((e => e.src))), e("Scripts", Array.from(document
                .querySelectorAll("script[src], script"))
            .map((e => e.src || e.innerHTML))), e("External Links",
            Array.from(
                document.querySelectorAll("a"))
            .map((e => e.href))
            .filter((e => !e.includes(location.host)))), e(
            "Secrets", document
            .body.innerHTML.match(
                /api|token|key|access|secret['"]?[:= ]?([A-Za-z0-9_\-]{32,})/gi
            ) || []), e("XSS", Array.from(document
                .querySelectorAll("input, textarea"))
            .map((e => "<script>alert(1)<\/script>"))
            .filter((e => e.includes("alert(1)")))), e(
            "WebSocket Usage", Array
            .from(document.querySelectorAll(
                "script"))
            .map((e => e.innerText))
            .filter((e => e.includes("WebSocket")))), e(
            "CSRF Tokens", Array
            .from(document.querySelectorAll("form"))
            .map((e => e.querySelector(
                'input[name="_csrf"], meta[name="csrf-token"]'
            )))
            .filter((e => e))), e("Cookies", document.cookie.split(
                ";")
            .map((e => e.trim()))), e("Meta Tags", Array.from(
                document
                .querySelectorAll("meta"))
            .map((e => ({
                name: e.name,
                content: e.content
            })))), (async () => {
            e("Subdomain Takeover Risk",
                ["api", "dev", "test",
                    "staging"
                ].map((e =>
                    `http://${e}.${location.hostname}`
                ))
                .filter((async e => 404 !==
                    (await fetch(
                        e))
                    .status)))
        })(), e("Open Redirects", Array.from(document
                .querySelectorAll(
                    "a[href]"))
            .map((e => e.href))
            .filter((e => /:\/\/[^/]+/.test(e)))), e(
            "SQL Injection", Array
            .from(new URLSearchParams(location.search))
            .map((e => e[0]))
            .filter((e => /['"=;]/.test(e)))), e("File Upload",
            Array.from(
                document.querySelectorAll(
                    'input[type="file"]'))
            .map((e => e.name))
            .filter((e => /upload/i.test(e)))), e("JWT Usage", Array
            .from(
                document.querySelectorAll("script"))
            .map((e => e.innerText))
            .filter((e => e.includes("jwt")))), e("API Endpoints",
            Array.from(
                document.querySelectorAll("a[href]"))
            .map((e => e.href))
            .filter((e => e.includes("/api/")))), e(
            "Server Headers", document
            .head.querySelector(
                'meta[name="server"]') ? document.head
            .querySelector(
                'meta[name="server"]')
            .content : "No server header"), e(
            "Hardcoded Credentials", document
            .body.innerHTML.match(
                /['"]?apikey['"]?\s*=\s*['"](.*)['"]/gi) || []),
        e(
            "Weak SSL/TLS", Array.from(document.querySelectorAll(
                "a[href]"))
            .map((e => e.href))
            .filter((e => e.includes("https://")))), (async () => {
            e("Broken Links", (await Promise.all(
                    Array
                    .from(document
                        .querySelectorAll(
                            "a[href]"
                        )
                    )
                    .map(
                        (e => fetch(e
                                .href)
                            .then(
                                (t => t.ok ?
                                    null :
                                    e
                                    .href
                                )
                            )
                        )
                    )
                ))
                .filter(Boolean))
        })(), e("Open Ports", ["8080", "443", "22", "21"].map((e =>
                `http://${location.hostname}:${e}`))
            .filter(
                (e => fetch(e)
                    .then((t => t.ok ? null : e))))),
        e("DNS Leak Risk", [
                location.hostname
            ].map((e => `https://dns.google/resolve?name=${e}`))
            .filter((e => fetch(e)
                .then((e => e.ok))))), (async () => {
            e("Directory Listing",
                (await fetch(location
                        .href)
                    .then((e => e
                        .text())))
                .includes(
                    "<title>Index of"
                ))
        })(), e("API Key Exposure", document.body.innerHTML.match(
            /apikey|api_key|secret|access_token/gi) || []), e(
            "CORS Misconfigurations", Array.from(document
                .querySelectorAll(
                    "script"))
            .map((e => e.src))
            .filter((e => e.includes("cors")))), e("JWT Algorithm",
            Array.from(
                document.querySelectorAll("script"))
            .map((e => e.innerText))
            .filter((e => /HS256|RS256|PS256/.test(e)))), e(
            "Leaked Credentials", document.body.innerHTML.match(
                /password|user|login/gi) || []), e(
            "COOP Policy", Array.from(
                document.querySelectorAll("meta"))
            .map((e => e.content))
            .filter((e => /same-origin/.test(e)))), e(
            "Security Headers", [
                "Strict-Transport-Security",
                "Content-Security-Policy", "X-Frame-Options"
            ].map((e => document.head.querySelector(
                `meta[http-equiv="${e}"]`)))
            .filter((e => e))), e("Unauthorized Access", Array.from(
                document
                .querySelectorAll(
                    'input[type="password"], button[type="submit"]'
                ))
            .map((e => e.name))
            .filter((e => e.includes("login")))), e(
            "Sensitive URLs", Array
            .from(document.querySelectorAll("a[href]"))
            .map((e => e.href))
            .filter((e => /admin|login|config/.test(e)))), e(
            "Outdated Libraries", ["jquery", "bootstrap", "angular"]
            .map((e => document.querySelectorAll(
                `script[src*="${e}"]`)))
            .map((e => e.length ? e : null))), e("Content Spoofing",
            Array.from(
                document.querySelectorAll(
                    'input[type="text"], textarea'))
            .map((e => e.placeholder))
            .filter((e => e.includes("fake")))), e("Reflected XSS",
            Array.from(
                new URLSearchParams(location.search))
            .map((e => e[0]))
            .filter((e => /<script>/.test(e)))), e("CSP Violations",
            Array.from(
                document.querySelectorAll(
                    'meta[http-equiv="Content-Security-Policy"]'
                ))
            .map((e => e.content))
            .filter((e => /default-src/.test(e)))), e(
            "Insecure Deserialization", Array.from(document
                .querySelectorAll(
                    "script"))
            .map((e => e.innerText))
            .filter((e => /deserialize/.test(e)))), e(
            "Exposed Admin Pages",
            Array.from(document.querySelectorAll(
                "a[href]"))
            .map((e => e.href))
            .filter((e => /admin/.test(e)))), e("Session Fixation",
            Array.from(
                document.cookie.split(";"))
            .map((e => e.trim()))
            .filter((e => /PHPSESSID/.test(e)))), e(
            "Server Misconfigurations",
            [".git", ".svn"].map((e => `${location.href}${e}`))
            .filter((e => fetch(e)
                .then((e => e.ok))))),
        e("Email Leak Risk", document.body.innerHTML.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g
        ) || []),
        e("Malicious JavaScript", Array.from(document
                .querySelectorAll(
                    "script"))
            .map((e => e.src))
            .filter((e => /malicious/.test(e)))), e(
            "Remote Code Execution",
            Array.from(document.querySelectorAll(
                "script"))
            .map((e => e.src))
            .filter((e => /eval/.test(e)))), e("TLS Weakness",
            ["http://", "https://"].map(
                (e => `${e}${location.hostname}`))
            .filter((e => fetch(e)
                .then((e => 200 !== e.status))))), e(
            "Password Policies", Array
            .from(document.querySelectorAll(
                'input[type="password"]'))
            .map((e => e.name))
            .filter((e => e.includes("password")))), e(
            "Cookie Flags", document
            .cookie.split(";")
            .map((e => e.trim()))
            .filter((e => /Secure|HttpOnly|SameSite/.test(e)))), e(
            "API Access Control", Array.from(document
                .querySelectorAll("meta"))
            .map((e => e.content))
            .filter((e => /access-control/.test(e)))), e(
            "Missing Security Headers",
            ["X-XSS-Protection", "X-Content-Type-Options",
                "Feature-Policy"
            ]
            .map((e => document.head.querySelector(
                `meta[http-equiv="${e}"]`)))
            .filter((e => !e))), e("Dynamic Script Injection", Array
            .from(
                document.querySelectorAll("script"))
            .map((e => e.src))
            .filter(
                (e => /document\.write/.test(e)))), e(
            "Subdomain Enumeration", [
                "www", "test", "staging", "dev"
            ].map((
                e => `http://${e}.${location.hostname}`
            ))
            .filter((e => fetch(e)
                .then((e => 404 === e.status))))), e(
            "Password Storage", Array
            .from(document.querySelectorAll(
                'input[type="password"]'))
            .map((e => e.value))
            .filter((e => e.length > 0))), e("SSLv3 Use", [
                "https://"
            ].map((e =>
                `${e}${location.hostname}`))
            .filter((e => fetch(e)
                .then((e => 503 === e.status))))), e(
            "Reverse DNS Lookup", [
                location.hostname
            ].map((e => `https://dns.google/resolve?name=${e}`))
            .filter((e => fetch(e)
                .then((e => e.ok)))))
}();
