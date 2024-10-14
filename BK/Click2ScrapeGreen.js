javascript: (function () {
    let e = [],
        t = !1,
        n = !1,
        o = null,
        l,
        a = 1,
        r = 1,
        i = "",
        c = !0;
    function d(e) {
        let t = document.createElement("button");
        return (t.textContent = e), (t.style.cssText = "padding:5px 10px;margin-right:5px;margin-bottom:5px;cursor:pointer;background-color:#444;color:#ddd;border:1px solid #555;font-family:'Arial',sans-serif;font-size:12px;"), t;
    }
    function s(e) {
        return e.id
            ? "#" + e.id
            : e.className
            ? Array.from(e.classList)
                  .map((e) => "." + e)
                  .join("")
            : e.tagName.toLowerCase();
    }
    function u(e) {
        let t = s(e),
            n = Array.from(document.querySelectorAll(t));
        return 1 === n.length && (n = Array.from(e.parentElement.children).filter((t) => t.tagName === e.tagName)), n;
    }
    function m(e) {
        return { text: e.innerText.trim(), href: e.href || e.querySelector("a")?.href || "", src: p(e), outerHTML: e.outerHTML, attributes: Object.fromEntries(Array.from(e.attributes).map((e) => [e.name, e.value])) };
    }
    function p(e) {
        let t = e.src || e.querySelector("img")?.src;
        if (t) return t;
        let n = window.getComputedStyle(e).backgroundImage;
        return n && "none" !== n ? n.slice(4, -1).replace(/["']/g, "") : e.getAttribute("data-src") || "";
    }
    async function f(t) {
        if (0 === e.length) return void h(t, "Please select at least one element first.");
        (r = parseInt(document.getElementById("maxPages").value) || 1), (i = document.getElementById("nextPageSelector").value.trim()), (o = []), (a = 1);
        while (a <= r) {
            h(t, `Scraping page ${a}...`);
            let n = e.map((e) => {
                    let t = u(e);
                    return t.map(m);
                }),
                l = n[0].map((e, t) => {
                    let o = {};
                    return (
                        n.forEach((e, n) => {
                            o[`selection${n + 1}`] = e[t] || null;
                        }),
                        o
                    );
                });
            if (((o = o.concat(l)), a < r && i)) {
                let e = document.querySelector(i);
                if (!e) {
                    h(t, "Next page button not found. Stopping pagination.");
                    break;
                }
                e.click(), await new Promise((e) => setTimeout(e, 2e3));
            }
            a++;
        }
        h(t, `Scraped ${o.length} total items across ${a - 1} pages`), h(t, JSON.stringify(o.slice(0, 3), null, 2) + "...");
    }
    function g() {
        let e = Array.from(document.getElementsByTagName("a")).map((e) => e.href);
        return [...new Set(e)];
    }
    function y() {
        let e = document.createElement("div");
        e.style.cssText =
            "position:fixed;top:20px;right:20px;background-color:#333;border:1px solid #555;padding:10px;z-index:10000;font-family:'Arial',sans-serif;box-shadow:0 0 10px rgba(0,0,0,0.5);color:#ddd;max-width:400px;width:100%;opacity:0.95;";
        let t = d("Start Selection"),
            n = d("Pause Selection"),
            o = d("Start Crawl"),
            l = d("Cancel"),
            a = d("Download JSON"),
            r = d("Download CSV"),
            i = d("Clear Selections"),
            c = d("Download HTML"),
            s = d("Collect Page Links"),
            u = document.createElement("div");
        (u.style.marginTop = "10px"),
            (u.innerHTML =
                '\n            <label for="maxPages">Max Pages:</label>\n            <input type="number" id="maxPages" value="1" min="1" style="width: 50px; margin-right: 10px;">\n            <label for="nextPageSelector">Next Page Selector:</label>\n            <input type="text" id="nextPageSelector" placeholder="e.g., .next-button" style="width: 150px;">\n        ');
        let m = document.createElement("div");
        return (
            (m.style.cssText = "width:100%;height:200px;overflow-y:auto;border:1px solid #555;padding:5px;margin-top:10px;font-size:12px;background-color:#222;"),
            e.append(t, n, o, l, i, a, r, c, s, u, m),
            document.body.appendChild(e),
            { panel: e, toggleButton: t, pauseResumeButton: n, startCrawlButton: o, cancelButton: l, clearSelectionsButton: i, downloadJSONButton: a, downloadCSVButton: r, downloadHTMLButton: c, collectLinksButton: s, output: m }
        );
    }
    function h(e, t) {
        if (c)
            try {
                e.innerHTML += "<p>" + t + "</p>";
            } catch (n) {
                console.log("CSP detected, falling back to DOM methods"), (c = !1);
                let o = document.createElement("p");
                (o.textContent = t), e.appendChild(o);
            }
        else {
            let l = document.createElement("p");
            (l.textContent = t), e.appendChild(l);
        }
    }
    let { panel: b, toggleButton: v, pauseResumeButton: w, startCrawlButton: x, cancelButton: k, clearSelectionsButton: E, downloadJSONButton: S, downloadCSVButton: $, downloadHTMLButton: C, collectLinksButton: H, output: T } = y();
    function L(e) {
        l.contains(e.target) || (e.preventDefault(), e.stopPropagation());
    }
    (l = b),
        v.addEventListener("click", () => {
            (t = !t),
                (n = !1),
                (document.body.style.cursor = t ? "crosshair" : "default"),
                (v.textContent = t ? "Stop Selection" : "Start Selection"),
                (w.textContent = "Pause Selection"),
                h(T, t ? "Selection started. Click on elements to select them for scraping." : "Selection stopped."),
                t ? document.body.addEventListener("click", L, !0) : document.body.removeEventListener("click", L, !0);
        }),
        w.addEventListener("click", () => {
            t
                ? ((n = !n),
                  (document.body.style.cursor = n ? "default" : "crosshair"),
                  (w.textContent = n ? "Resume Selection" : "Pause Selection"),
                  h(T, n ? "Selection paused. You can interact with the page normally." : "Selection resumed. Click on elements to select them for scraping."),
                  n ? document.body.removeEventListener("click", L, !0) : document.body.addEventListener("click", L, !0))
                : h(T, "Please start selection first.");
        }),
        x.addEventListener("click", () => f(T)),
        k.addEventListener("click", () => {
            (t = !1),
                (n = !1),
                (e = []),
                (o = null),
                (document.body.style.cursor = "default"),
                (v.textContent = "Start Selection"),
                (w.textContent = "Pause Selection"),
                h(T, "Operation cancelled. Start over by clicking 'Start Selection'."),
                document.body.removeEventListener("click", L, !0);
        }),
        E.addEventListener("click", () => {
            (e = []), h(T, "All selections cleared. You can start selecting new elements.");
        }),
        S.addEventListener("click", function () {
            if (!o) return void alert("No data to download. Please perform a crawl first.");
            let e = JSON.stringify(o, null, 2),
                t = "data:application/json;charset=utf-8," + encodeURIComponent(e),
                n = document.createElement("a");
            n.setAttribute("href", t), n.setAttribute("download", "scraped_data.json"), n.click();
        }),
        $.addEventListener("click", function () {
            if (!o) return void alert("No data to download. Please perform a crawl first.");
            let e = Object.keys(o[0]).flatMap((e) => [`${e} Text`, `${e} Href`, `${e} Src`]),
                t = e.join(",") + "\n";
            o.forEach((e) => {
                let n = Object.values(e).flatMap((e) => [`"${e.text.replace(/"/g, '""')}"`, `"${e.href}"`, `"${e.src}"`]);
                t += n.join(",") + "\n";
            });
            let n = "data:text/csv;charset=utf-8," + encodeURIComponent(t),
                l = document.createElement("a");
            l.setAttribute("href", n), l.setAttribute("download", "scraped_data.csv"), l.click();
        }),
C.addEventListener("click", function() {
    if (!o) return void alert("No data to download. Please perform a crawl first.");
    let e = Object.keys(o[0]).flatMap(e => [`${e} Text`, `${e} Href`, `${e} Src`]),
        t = `
        <table>
            <tr>${e.map(e => `<th>${e}</th>`).join("")}</tr>
            ${o.map(e => `
                <tr>${Object.values(e).flatMap(e => [`<td>${e.text}</td>`, `<td>${e.href ? `<a href="${e.href}" target="_blank">${e.href}</a>` : ""}</td>`, `<td>${e.src ? `<a href="${e.src}" target="_blank"><img src="${e.src}" alt="Thumbnail"></a>` : ""}</td>`]).join("")}</tr>
            `).join("")}
        </table>
    `;
    let n = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scraped Data</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    line-height: 1.6;
                    padding: 20px;
                    background-color: #1a1a1a;
                    color: #00ff00;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    background-color: #222;
                    box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #00ff00;
                    font-size: 12px;
                }
                th {
                    background-color: #333;
                    color: #00ff00;
                    font-weight: bold;
                }
                tr:hover {
                    background-color: #2a2a2a;
                }
                img {
                    max-width: 50px;
                    max-height: 50px;
                    object-fit: cover;
                }
                a {
                    color: #00ccff;
                    text-decoration: none;
                    word-break: break-all;
                }
                a:hover {
                    text-decoration: underline;
                }
                @media (max-width: 600px) {
                    table {
                        font-size: 10px;
                    }
                    th, td {
                        padding: 8px;
                    }
                }
            </style>
        </head>
        <body>
            ${t}
        </body>
        </html>
    `;
    let newWindow = window.open();
    newWindow.document.write(n);
    newWindow.document.close();
});

        H.addEventListener("click", function () {
            let e = g();
            h(T, `Collected ${e.length} unique links:`), e.forEach((e) => h(T, e)), (o = e.map((e) => ({ link: e })));
        }),
        document.addEventListener(
            "click",
            (n) => {
                if (t && !l.contains(n.target)) {
                    n.preventDefault(), n.stopPropagation();
                    let o = s(n.target);
                    e.some((e) => s(e) === o) ? h(T, "Element already selected: " + o) : (e.push(n.target), h(T, "Element selected: " + o));
                }
            },
            !0
        ),
        console.log("Improved Multi-Select Scraper UI with selection control, CSP fallback, pagination support, and link collection added. Use the buttons to control the scraping process.");
})();
