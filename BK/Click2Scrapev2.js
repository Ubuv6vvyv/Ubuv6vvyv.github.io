javascript:(function(){let e=[],t=!1,n=null,l,o=1,a=1,r="";function i(){const e=document.createElement("div");e.style.cssText="position:fixed;top:20px;right:20px;background-color:#333;border:1px solid #555;padding:10px;z-index:10000;font-family:'Arial',sans-serif;box-shadow:0 0 10px rgba(0,0,0,0.5);color:#ddd;max-width:400px;width:100%;";const t=s("Toggle Selection"),n=s("Start Crawl"),o=s("Cancel"),a=s("Download JSON"),r=s("Download CSV"),i=s("Clear Selections"),d=s("Preview Table"),u=document.createElement("div");u.innerHTML='<label for="maxPages">Max Pages:</label><input type="number" id="maxPages" value="1" min="1" style="width: 50px; margin-right: 10px;"><label for="nextPageSelector">Next Page Selector:</label><input type="text" id="nextPageSelector" placeholder="e.g., .next-button" style="width: 150px;">',u.style.marginTop="10px";const m=document.createElement("div");return m.style.cssText="width:100%;height:200px;overflow-y:auto;border:1px solid #555;padding:5px;margin-top:10px;font-size:12px;background-color:#222;",e.append(t,n,o,i,a,r,d,u,m),document.body.appendChild(e),l=e,{toggleButton:t,startCrawlButton:n,cancelButton:o,clearSelectionsButton:i,downloadJSONButton:a,downloadCSVButton:r,previewButton:d,output:m}}function s(e){const t=document.createElement("button");return t.textContent=e,t.style.cssText="padding:5px 10px;margin-right:5px;margin-bottom:5px;cursor:pointer;background-color:#444;color:#ddd;border:1px solid #555;font-family:'Arial',sans-serif;font-size:12px;",t}function c(e){return e.id?"#"+e.id:e.className?(Array.from(e.classList).map(e=>"."+e).join("")?e.tagName.toLowerCase()+Array.from(e.classList).map(e=>"."+e).join(""):void 0):e.tagName.toLowerCase()}function d(e){let t=c(e),n=Array.from(document.querySelectorAll(t));if(1===n.length){let t=e.parentElement;n=Array.from(t.children).filter(t=>t.tagName===e.tagName)}return n}function u(e){return e.map(e=>({text:e.innerText.trim(),href:e.href||e.querySelector("a")?.href||"",src:m(e),attributes:Object.fromEntries(Array.from(e.attributes).map(e=>[e.name,e.value]))}))}function m(e){const t=e.src||e.querySelector("img")?.src;if(t)return t;const n=window.getComputedStyle(e).backgroundImage;if(n&&"none"!==n)return n.slice(4,-1).replace(/["']/g,"");const l=e.getAttribute("data-src");return l||""}function p(n,o){t&&(l.contains(n.target)||(n.preventDefault(),n.stopPropagation(),c(n.target),e.some(e=>c(e)===c(n.target))?o.innerHTML+="<br>Element already selected: "+c(n.target):(e.push(n.target),o.innerHTML+="<br>Element selected: "+c(n.target))))}function g(e,n){t=!t,t?(document.body.style.cursor="crosshair",e.textContent="Finish Selection",n.textContent="Click on elements to select them for scraping."):(document.body.style.cursor="default",e.textContent="Toggle Selection",n.innerHTML+="<br>Selection finished.")}async function f(t){if(0===e.length)return void(t.textContent="Please select at least one element first.");for(a=parseInt(document.getElementById("maxPages").value)||1,r=document.getElementById("nextPageSelector").value.trim(),n=[],o=1;o<=a;){t.innerHTML+=`<br>Scraping page ${o}...`;let l=e.map(e=>{let t=d(e);return u(t)}),i=l[0].map((e,t)=>{let n={};return l.forEach((e,l)=>{let o="selection"+(l+1);n[o]=e[t]||null}),n});if(n=n.concat(i),o<a&&r){const e=document.querySelector(r);if(!e){t.innerHTML+="<br>Next page button not found. Stopping pagination.";break}e.click(),await new Promise(e=>setTimeout(e,2e3))}o++}t.innerHTML+=`<br><strong>Scraped ${n.length} total items across ${o-1} pages</strong><br>`,t.innerHTML+=`<pre>${JSON.stringify(n.slice(0,3),null,2)}...</pre>`}function h(o,a){t=!1,e=[],n=null,document.body.style.cursor="default",o.textContent="Toggle Selection",a.textContent="Operation cancelled. Start over by toggling selection."}function y(t){e=[],t.textContent="All selections cleared. You can start selecting new elements."}function b(){if(!n)return void alert("No data to download. Please perform a crawl first.");const e=JSON.stringify(n,null,2),t="data:application/json;charset=utf-8,"+encodeURIComponent(e),l="scraped_data.json",o=document.createElement("a");o.setAttribute("href",t),o.setAttribute("download",l),o.click()}function v(){if(!n)return void alert("No data to download. Please perform a crawl first.");const e=Object.keys(n[0]).flatMap(e=>[`${e} Text`,`${e} Href`,`${e} Src`]);let t=e.join(",")+"\n";n.forEach(e=>{const n=Object.values(e).flatMap(e=>[`"${e.text.replace(/"/g,'""')}"`,`"${e.href}"`,`"${e.src}"`]);t+=n.join(",")+"\n"});const l="data:text/csv;charset=utf-8,"+encodeURIComponent(t),o="scraped_data.csv",a=document.createElement("a");a.setAttribute("href",l),a.setAttribute("download",o),a.click()}function x(){if(!n)return void alert("No data to preview. Please perform a crawl first.");const e=window.open("","Preview","width=800,height=600"),t=Object.keys(n[0]).flatMap(e=>[`${e} Text`,`${e} Href`,`${e} Src`]);let l=`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scraped Data Preview</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        background-color: #fff;
                        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    tr:hover {
                        background-color: #f5f5f5;
                    }
                    img {
                        max-width: 100px;
                        max-height: 100px;
                        object-fit: cover;
                    }
                </style>
            </head>
            <body>
                <table>
                    <tr>${t.map(e=>`<th>${e}</th>`).join("")}</tr>
                    ${n.map(e=>`
                        <tr>
                            ${Object.values(e).flatMap(e=>[`<td>${e.text}</td>`,`<td>${e.href?`<a href="${e.href}" target="_blank">${e.href}</a>`:""}</td>`,`<td>${e.src?`<img src="${e.src}" alt="Image" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23cccccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial, sans-serif%22 font-size=%2214%22 fill=%22%23333333%22%3ENo Image%3C/text%3E%3C/svg%3E';">`:""}</td>`]).join("")}
                        </tr>
                    `).join("")}
                </table>
            </body>
            </html>
        `;e.document.write(l),e.document.close()}const{toggleButton:w,startCrawlButton:k,cancelButton:$,clearSelectionsButton:S,downloadJSONButton:C,downloadCSVButton:E,previewButton:j,output:B}=i();w.addEventListener("click",()=>g(w,B)),k.addEventListener("click",()=>f(B)),$.addEventListener("click",()=>h(w,B)),S.addEventListener("click",()=>y(B)),C.addEventListener("click",b),E.addEventListener("click",v),j.addEventListener("click",x),document.addEventListener("click",e=>p(e,B),!0),console.log("Enhanced Multi-Select Scraper UI with pagination support added. Use the buttons to control the scraping process.")})();
