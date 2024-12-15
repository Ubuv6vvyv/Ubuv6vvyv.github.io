(()=>{const cleanStrings=(arr=[])=>arr.filter(str=>str&&typeof str==="string"&&str.trim()&&str.trim().length>3),calculateSimilarity=(str1,str2)=>{const set1=new Set(str1.toLowerCase().split(/\s+/)),set2=new Set(str2.toLowerCase().split(/\s+/)),intersection=new Set([...set1].filter(word=>set2.has(word))),union=new Set([...set1,...set2]);return intersection.size/union.size},smartSplit=data=>{const splitStrategies=[{strategy:/\s*[,|;:]\s*/,name:"Delimiter"},{strategy:/\s*-\s*/,name:"Dash"},{strategy:/\s+/,name:"Space"}],splitResults=splitStrategies.map(strategy=>{const rows=data.map(item=>item.split(strategy.strategy)),maxColumns=Math.max(...rows.map(row=>row.length)),isConsistent=rows.every(row=>row.length>=maxColumns/2);return{headers:rows[0].map(header=>header.replace(/([A-Z])/g," $1").replace(/^./,char=>char.toUpperCase()).trim()),rows:rows,consistency:isConsistent?1:.5}}); return splitResults.reduce((best,current)=>current.consistency>best.consistency?current:best)},extractData=()=>{const extractedData=[],strategies=["table","list","grid","repeating-structure","semantic-html"];return strategies.forEach(strategy=>{try{const result=extractByStrategy(strategy);result&&result.length>0&&extractedData.push(...result)}catch(error){console.warn(`Strategy ${strategy} failed:`,error)}}),extractedData},extractByStrategy=type=>{switch(type){case"table":return Array.from(document.querySelectorAll("table")).map(table=>({source:getElementSelector(table),data:extractTableData(table),type:"table"}));case"list":return Array.from(document.querySelectorAll("ul, ol")).map(list=>({source:getElementSelector(list),data:Array.from(list.children).map(item=>item.textContent.trim()),type:"list"}));case"grid":return Array.from(document.querySelectorAll('div[class*="grid"], div[class*="row"]')).map(grid=>({source:getElementSelector(grid),data:Array.from(grid.children).map(child=>child.textContent.trim()).filter(text=>text!==""),type:"grid"}));case"repeating-structure":return identifyRepeatingStructures().map(structure=>({source:getElementSelector(structure.element),data:structure.data,type:"repeating-structure"}));case"semantic-html":return["article","section","aside","header","footer","nav"].flatMap(tag=>Array.from(document.querySelectorAll(tag)).map(element=>({source:getElementSelector(element),data:extractSemanticData(element),type:"semantic-html"})));default:return[]}},extractTableData=table=>{const rows=Array.from(table.querySelectorAll("tr")),headers=rows[0]?extractHeaderRow(rows[0]):[],dataRows=rows.slice(1);return dataRows.map(row=>extractRowData(row,headers.length))},extractHeaderRow=headerRow=>{const headerRow$=headerRow.querySelectorAll("th, td").length>0?headerRow:null;return headerRow$?Array.from(headerRow$.querySelectorAll("th, td")).map(cell=>cell.textContent.trim()):[]},extractRowData=(row,headerLength)=>Array.from(row.querySelectorAll("td")).map(cell=>cell.textContent.trim()).slice(0,headerLength),identifyRepeatingStructures=()=>Array.from(document.body.querySelectorAll("*")).filter(isRepeatingStructure).map(element=>({element:element,data:getRepeatingData(element),score:getStructureScore(element)})).filter(structure=>structure.data.length>1).sort((a,b)=>b.score-a.score),isRepeatingStructure=element=>{const scoringFactors={textLength:Math.min(element.textContent.length/100,1)*.3,nodeDepth:(1-calculateNodeDepth(element)/10)*.2,siblingCount:element.parentElement&&element.parentElement.children.length>1?.15:0,uniqueChildCount:calculateUniqueChildCount(element)*.15,classNameScore:calculateClassNameScore(element),idScore:calculateIdScore(element)};return Object.values(scoringFactors).reduce((total,score)=>total+score,0)>.5},calculateNodeDepth=(element,depth=0)=>{let currentDepth=0;while(element.parentElement){currentDepth++;element=element.parentElement}return currentDepth},calculateUniqueChildCount=(element,maxChildren=5)=>{const uniqueChildren=new Set(Array.from(element.children).map(child=>child.tagName));return uniqueChildren.size/maxChildren},calculateClassNameScore=(element,weight=.1)=>{const classes=element.className.split(" "),dataRelatedClasses=classes.filter(cls=>["data","content","item","row","column"].some(keyword=>cls.toLowerCase().includes(keyword)));return dataRelatedClasses.length/classes.length*weight},calculateIdScore=(element,weight=.1)=>{const id=element.id||"";return["data","content","list","table","grid"].some(keyword=>id.toLowerCase().includes(keyword))?weight:0},extractSemanticData=element=>{const data=[];return data.push(...Array.from(element.querySelectorAll(["p","span","div","h1","h2","h3","h4","h5","h6"].join(", "))).map(el=>el.textContent.trim()).filter(text=>text!=="")),data.push(...Array.from(element.querySelectorAll("img")).map(img=>({src:img.src,alt:img.alt||"No description",type:"image"}))),data.push(...Array.from(element.querySelectorAll("a")).map(anchor=>({href:anchor.href,text:anchor.textContent.trim(),type:"anchor"}))),data},getElementSelector=element=>{if(!element)return"Unknown";if(element.id)return`#${element.id}`;if(element.className)return`.${element.className.split(" ").join(".")}`;return element.tagName.toLowerCase()},normalizeData=data=>{const processedData=data.map(item=>Array.isArray(item)?item:[item]);return{headers:processedData[0].map((header,index)=>typeof header==="object"&&header.type?formatHeaderName(header.type):`Column ${index+1}`),rows:processedData}},formatHeaderName=(type="")=>type.charAt(0).toUpperCase()+type.slice(1).replace(/-/g," "),displayExtractedData=data=>{const container=document.createElement("div");container.style.cssText="position:fixed;top:10%;left:10%;width:80%;height:80%;background:white;border:3px solid #2c3e50;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;padding:20px;overflow:auto;font-family:Arial,sans-serif;display:flex;flex-direction:column;";const header=document.createElement("h2");header.textContent=`Extracted Data Sources (${data.length})`,header.style.cssText="background-color:#3498db;color:white;padding:10px;margin:-20px -20px 20px;text-align:center;",container.appendChild(header);const dataSourcesContainer=document.createElement("div");dataSourcesContainer.style.cssText="display:flex;flex-wrap:wrap;gap:15px;overflow-y:auto;max-height:70vh;",data.forEach((source,index)=>{const sourceCard=createSourceCard(source,index);dataSourcesContainer.appendChild(sourceCard)}),container.appendChild(dataSourcesContainer);const closeButton=document.createElement("button");closeButton.textContent="Close",closeButton.style.cssText="position:absolute;top:10px;right:10px;background-color:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;",closeButton.onclick=()=>document.body.removeChild(container),container.appendChild(closeButton),document.body.appendChild(container)},createSourceCard=(source,index)=>{const card=document.createElement("div");card.style.cssText="border:2px solid #ecf0f1;border-radius:8px;padding:10px;width:calc(33.33% - 15px);box-sizing:border-box;cursor:pointer;transition:all 0.3s ease;position:relative;overflow:hidden;";const previewSection=createPreviewSection(source);card.appendChild(previewSection);const metadataSection=document.createElement("div");metadataSection.innerHTML=`<strong>Source:</strong> ${source.source||"Unknown"}<br><strong>Type:</strong> ${source.type||"Generic"}<br><strong>Entries:</strong> ${source.data.length}`,metadataSection.style.marginTop="10px",card.appendChild(metadataSection);const actionContainer=document.createElement("div");actionContainer.style.cssText="display:flex;justify-content:space-between;margin-top:10px;";const exportButton=document.createElement("button");exportButton.textContent="Export",exportButton.style.cssText="background-color:#2ecc71;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;",exportButton.onclick=()=>exportSourceData(source),actionContainer.appendChild(exportButton);const previewButton=document.createElement("button");previewButton.textContent="Preview",previewButton.style.cssText="background-color:#3498db;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;",previewButton.onclick=()=>previewSourceData(source),actionContainer.appendChild(previewButton),card.appendChild(actionContainer);return card},createPreviewSection=source=>{const previewContainer=document.createElement("div");previewContainer.style.cssText="width:100%;min-height:150px;background-color:#f1f2f6;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;border-radius:8px;overflow:hidden;padding:10px;gap:5px;";const previewContent=document.createElement("div");previewContent.style.cssText="font-size:12px;color:#2f3542;text-align:center;max-height:100px;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:5px;";const previewItems=source.data.slice(0,3).map(item=>{if(typeof item==="string")return item;if(item.type==="image")return`🖼️ Image: ${item.alt||"Unnamed"}`;if(item.type==="anchor")return`🔗 Link: ${item.text||item.href}`;return JSON.stringify(item)}).join("\n");previewContent.textContent=previewItems;const imageItem=source.data.find(item=>item.type==="image");if(imageItem){const previewImage=document.createElement("img");previewImage.src=imageItem.src,previewImage.style.cssText="max-width:100px;max-height:100px;object-fit:cover;border-radius:4px;",previewContainer.appendChild(previewImage)}previewContainer.appendChild(previewContent);return previewContainer},exportSourceData=source=>{const normalizedData=normalizeData(source.data),htmlContent=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Extracted Data: ${source.source}</title>
    <style>
        body{font-family:Arial,sans-serif;line-height:1.6;
             max-width:1200px;margin:0 auto;padding:20px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th,td{border:1px solid #ddd;padding:10px;text-align:left}
        th{background-color:#f8f9fa}
    </style>
</head>
<body>
    <table>
        <thead>
            <tr>
                ${normalizedData.headers.map(header=>`<th>${header}</th>`).join("")}
            </tr>
        </thead>
        <tbody>
            ${normalizedData.rows.map(row=>`
                <tr>
                    ${row.map(cell=>{
                        if(typeof cell==="object"){
                            if(cell.type==="anchor")return `<td><a href="${cell.href}">${cell.text||cell.href}</a></td>`;
                            if(cell.type==="image")return `<td><img src="${cell.src}" alt="${cell.alt}"></td>`;
                            return"<td></td>"
                        }
                        return`<td>${cell||""}</td>`
                    }).join("")}
                </tr>
            `).join("")}
        </tbody>
    </table>
</body>
</html>`;const blob=new Blob([htmlContent],{type:"text/html"}),downloadLink=document.createElement("a");downloadLink.href=URL.createObjectURL(blob),downloadLink.download=`${source.source.replace(/[^a-z0-9]/gi,"_")}_${Date.now()}.html`,downloadLink.click()},previewSourceData=source=>{const normalizedData=smartSplit(source.data),previewWindow=window.open("","_blank");previewWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Data Preview: ${source.source}</title>
                <style>
                    body{font-family:Arial,sans-serif;line-height:1.6;
                         max-width:1200px;margin:0 auto;padding:20px}
                    table{width:100%;border-collapse:collapse;margin-bottom:20px}
                    th,td{border:1px solid #ddd;padding:10px;text-align:left}
                    th{background-color:#f8f9fa}
                </style>
            </head>
            <body>
                <div>
                    <strong>Source:</strong> ${source.source}<br>
                    <strong>Type:</strong> ${source.type}<br>
                    <strong>Total Entries:</strong> ${source.data.length}
                </div>
                <table>
                    <thead>
                        <tr>
                            ${normalizedData.headers.map(header=>`<th>${header}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${normalizedData.rows.map(row=>`
                            <tr>
                                ${row.map(cell=>`<td>${cell||""}</td>`).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </body>
            </html>
        `),previewWindow.document.close()};const extractedSources=extractData(),sortedSources=extractedSources.sort((a,b)=>b.data.length-a.data.length);displayExtractedData(sortedSources)})();
