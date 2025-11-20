(async function apiScanner(){
const endpoints=new Set(),tokens=new Set(),config=new Set(),headers=new Set(),params=new Set();
const staticExt=/\.(mp3|ogg|wav|mp4|webm|avi|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|otf|css)$/i;
const cdnDomains=['cloudflare','cloudfront','gstatic','googleapis','fastly','akamai','jsdelivr','unpkg','cdnjs','staticflickr','bootstrapcdn'];
const thirdParty=['youtube.com','youtu.be','vimeo.com','facebook.com','twitter.com','instagram.com','linkedin.com','google.com','doubleclick.net','analytics','googletagmanager','ads','tracking','facebook.net'];

const patterns=[
{rx:/fetch\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/fetch\s*\(\s*`([^`]+)`/g,grp:1,cat:'endpoint'},
{rx:/fetch\s*\(\s*([a-zA-Z_$][\w$]*)\s*\+\s*(['"`])([^'"`]+)\2/g,grp:3,cat:'endpoint'},
{rx:/\.fetch\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/\.open\s*\(\s*(['"`])(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\1\s*,\s*(['"`])([^'"`]+)\3/gi,grp:4,cat:'endpoint',method:2},
{rx:/\.send\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,grp:1,cat:'endpoint'},
{rx:/axios\.(get|post|put|delete|patch|head|options)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/axios\s*\(\s*\{[^}]{0,300}url:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/axios\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/axios\.create\s*\(\s*\{[^}]{0,300}baseURL:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'config'},
{rx:/axios\.defaults\.baseURL\s*=\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'config'},
{rx:/\$\.ajax\s*\(\s*\{[^}]{0,300}url:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/\$\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/\$\.getJSON\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/\$\.load\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/\$http\.(get|post|put|delete|patch|head)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/this\.http\.(get|post|put|delete|patch|head)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/HttpClient\.(get|post|put|delete|patch|head)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/superagent\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/request\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/got\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/needle\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/ky\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/gi,grp:3,cat:'endpoint',method:1},
{rx:/wretch\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/new\s+WebSocket\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'websocket'},
{rx:/new\s+EventSource\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'sse'},
{rx:/io\s*\(\s*(['"`])(wss?:\/\/[^'"`]{5,200})\1/g,grp:2,cat:'websocket'},
{rx:/io\.connect\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'websocket'},
{rx:/mqtt\.connect\s*\(\s*(['"`])(mqtts?:\/\/[^'"`]{5,200})\1/g,grp:2,cat:'mqtt'},
{rx:/socket\.(?:connect|emit|send|on)\s*\(\s*(['"`])([^'"`]{3,150})\1/g,grp:2,cat:'endpoint'},
{rx:/graphql\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'graphql'},
{rx:/gql\s*`([^`]+)`/g,grp:1,cat:'graphql'},
{rx:/query\s*:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'graphql'},
{rx:/mutation\s*:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'graphql'},
{rx:/subscription\s*:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'graphql'},
{rx:/useQuery\s*\(\s*(?:\[?\s*)?(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/useMutation\s*\(\s*(?:\[?\s*)?(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/useLazyQuery\s*\(\s*(?:\[?\s*)?(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/useSubscription\s*\(\s*(?:\[?\s*)?(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/apolloClient\.query\s*\(\s*\{[^}]{0,200}query:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'graphql'},
{rx:/useFetch\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/useSWR\s*\(\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/useInfiniteQuery\s*\(\s*\[?['"`]([^'"`]+)['"`]/g,grp:1,cat:'endpoint'},
{rx:/(?:baseURL|baseUrl|apiUrl|apiBase|apiRoot|apiEndpoint|serverUrl|apiServer|apiHost|restUrl|graphqlUrl|socketUrl|gatewayUrl|endpoint|endpoints|host|hostname|domain|gateway|proxy|target|serverAddress|serviceUrl|dataUrl|resourceUrl|backendUrl):\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'config'},
{rx:/createApi\s*\(\s*\{[^}]{0,300}baseUrl:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'config'},
{rx:/urlRoot:\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'config'},
{rx:/API_(?:URL|BASE|ENDPOINT|HOST|ROOT|SERVER|GATEWAY|PATH):\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'config'},
{rx:/(?:const|let|var)\s+(?:API|BASE|ENDPOINT|URL|HOST)[\w_]*\s*=\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'config'},
{rx:/(process\.env|import\.meta\.env|window\.env|env|__ENV__|Deno\.env)\.(REACT_APP_|VITE_|NEXT_PUBLIC_|GATSBY_|VUE_APP_|NUXT_|EXPO_PUBLIC_|PUBLIC_|APP_|SVELTE_)?(API|URL|ENDPOINT|BASE|HOST|KEY|TOKEN|SECRET|AUTH|DOMAIN|GATEWAY|GRAPHQL|REST|WS|SOCKET|SERVER)[\w_]*/g,grp:0,cat:'envvar'},
{rx:/(['"`])(https?:\/\/[^'"`]*\/(?:api|rest|graphql|gql|v[1-9]\d*|endpoint|service|data|auth|oauth|oauth2|login|logout|signin|signout|signup|register|token|refresh|verify|webhook|callback|proxy|gateway|rpc|jsonrpc|xml-rpc|soap|feed|ajax|admin|dashboard|backend|server|internal|secure|protected)\/[^'"`]*)\1/gi,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.(?:json|xml|api|graphql|proto|protobuf|wsdl|rss|atom|yml|yaml)(?:[?#][^'"`]*)?)\1/gi,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*execute-api\.[^'"`]+amazonaws\.com[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.cloudfunctions\.net[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.azurewebsites\.net[^'"`]*api[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*cloudfront\.net[^'"`]*\/api[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.herokuapp\.com[^'"`]*api[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.vercel\.app[^'"`]*api[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*\.netlify\.app[^'"`]*\.netlify\/functions[^'"`]*)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(https?:\/\/[^'"`]*[?&](?:q|query|search|id|uid|key|apiKey|api_key|token|auth|user|username|email|callback|action|method|cmd|command|func|function)=[^'"`]*)\1/gi,grp:2,cat:'endpoint'},
{rx:/(['"`])(\/(?:api|rest|graphql|v[1-9]\d*|endpoint|service|data|auth|oauth|admin|backend|server|internal|secure)\/[^'"`]+)\1/gi,grp:2,cat:'path'},
{rx:/(['"`])(\/((?:api|rest|graphql|v[1-9]\d*)\/)?(?:[a-zA-Z0-9_\-]+\/?){1,8}(?:\?[^'"`]*)?)\1/g,grp:2,cat:'path'},
{rx:/(['"`])([\.\/]{1,2}(?:[a-zA-Z0-9_\-]+\/)+[a-zA-Z0-9_\-\.]+\.(?:json|xml|api|yml|yaml)(?:\?[^'"`]*)?)\1/gi,grp:2,cat:'path'},
{rx:/(['"`])(@\/(?:api|services|endpoints|http|requests|utils|lib|core)[^'"`]*)\1/g,grp:2,cat:'path'},
{rx:/(['"`])(~\/(?:api|services|endpoints)[^'"`]*)\1/g,grp:2,cat:'path'},
{rx:/Bearer\s+([A-Za-z0-9\-\._~+\/]{25,}={0,2})(?=[^A-Za-z0-9\-\._~+\/=]|$)/g,grp:1,cat:'bearer'},
{rx:/Basic\s+([A-Za-z0-9+\/]{20,}={0,2})(?=[^A-Za-z0-9+\/=]|$)/g,grp:1,cat:'basic'},
{rx:/Digest\s+([A-Za-z0-9+\/=]{20,})/g,grp:1,cat:'digest'},
{rx:/(['"`])Authorization\1\s*:\s*(['"`])Bearer\s+([^'"`]+)\2/gi,grp:3,cat:'bearer'},
{rx:/Authorization['"`]?\s*:\s*(['"`])Bearer\s+([^'"`]+)\1/gi,grp:2,cat:'bearer'},
{rx:/Authorization['"`]?\s*:\s*(['"`])Basic\s+([^'"`]+)\1/gi,grp:2,cat:'basic'},
{rx:/Authorization['"`]?\s*:\s*(['"`])Digest\s+([^'"`]+)\1/gi,grp:2,cat:'digest'},
{rx:/(?:apikey|api_key|apiKey|API_KEY|ApiKey|key)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'apikey'},
{rx:/(?:accessToken|access_token|ACCESS_TOKEN|token|TOKEN|authToken|auth_token|idToken|id_token)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'token'},
{rx:/(?:refreshToken|refresh_token|REFRESH_TOKEN)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'token'},
{rx:/(?:clientSecret|client_secret|CLIENT_SECRET|secret|SECRET|appSecret|app_secret)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'secret'},
{rx:/(?:appKey|app_key|appId|app_id|clientId|client_id|applicationId|application_id)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'secret'},
{rx:/(?:sessionToken|session_token|csrf|CSRF|xsrf|XSRF)['"`]?\s*[:=]\s*(['"`])([^'"`]{20,})\1/gi,grp:2,cat:'token'},
{rx:/jwt['"`]?\s*[:=]\s*(['"`])([^'"`]{40,})\1/gi,grp:2,cat:'bearer'},
{rx:/(['"`])(X-API-Key|X-Api-Key|X-AUTH-TOKEN|X-Auth-Token|X-CSRF-Token|X-XSRF-TOKEN|X-Request-ID|X-Session-ID|X-Client-ID|X-Application-ID|X-Device-ID|X-Tenant-ID|X-User-ID|X-Token|X-Access-Token|X-Refresh-Token|API-Key|Auth-Token|Access-Token|Api-Token)\1\s*:\s*(['"`])([^'"`]+)\3/gi,grp:4,cat:'header',hname:2},
{rx:/setRequestHeader\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])([^'"`]+)\3\s*\)/g,grp:2,cat:'headername',hval:4},
{rx:/headers\s*:\s*\{[^}]*['"`]([A-Z][\w\-]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g,grp:1,cat:'headername'},
{rx:/cors(?:Anywhere)?(?:Proxy)?\s*[:=]\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'config'},
{rx:/proxyUrl\s*[:=]\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'config'},
{rx:/<form[^>]*action\s*=\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'form'},
{rx:/<a[^>]*href\s*=\s*(['"`])([^'"`]*\/(?:download|export|api)[^'"`]*)\1/gi,grp:2,cat:'endpoint'},
{rx:/<link[^>]*href\s*=\s*(['"`])([^'"`]*\.(?:json|xml|rss|atom)[^'"`]*)\1/gi,grp:2,cat:'endpoint'},
{rx:/window\.location\.(?:href|pathname|assign|replace)\s*(?:\+|=)\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'path'},
{rx:/location\.(?:href|pathname)\s*=\s*(['"`])([^'"`]+)\1/g,grp:2,cat:'path'},
{rx:/\$\{[^}]*(?:API|URL|ENDPOINT|BASE|HOST|SERVER)[^}]*\}/gi,grp:0,cat:'envvar'},
{rx:/`[^`]*\$\{[^}]+\}[^`]*(?:api|endpoint|service)[^`]*`/gi,grp:0,cat:'endpoint'},
{rx:/\/\*\*?\s*(?:@api|@endpoint|@url|@route|API:|URL:|ENDPOINT:|ROUTE:)\s*([^\s*]+)/g,grp:1,cat:'endpoint'},
{rx:/\/\/\s*(?:API|URL|ENDPOINT|ROUTE):\s*(.+)$/gm,grp:1,cat:'endpoint'},
{rx:/(['"`])(\/\.netlify\/functions\/[^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/(['"`])(\/api\/[^'"`]+)\1/g,grp:2,cat:'path'},
{rx:/(['"`])(\/_functions\/[^'"`]+)\1/g,grp:2,cat:'endpoint'},
{rx:/data-(?:api|url|endpoint|href|src|action)\s*=\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'endpoint'},
{rx:/\.(?:get|post|put|delete|patch|all|use)\s*\(\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'path'},
{rx:/router\.(?:get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'path'},
{rx:/app\.(?:get|post|put|delete|patch|route)\s*\(\s*(['"`])([^'"`]+)\1/gi,grp:2,cat:'path'},
{rx:/import\s+.+\s+from\s+(['"`])([^'"`]*(?:api|service|endpoint)[^'"`]*)\1/gi,grp:2,cat:'path'},
{rx:/require\s*\(\s*(['"`])([^'"`]*(?:api|service|endpoint)[^'"`]*)\1/gi,grp:2,cat:'path'}
];

function extractParams(url){
try{
const u=new URL(url.startsWith('http')?url:`http://dummy${url}`);
u.searchParams.forEach((v,k)=>params.add(JSON.stringify({name:k,value:v,url})));
}catch(e){}
}

function scan(txt,src){
patterns.forEach(({rx,grp,cat,method,hname,hval})=>{
let m;rx.lastIndex=0;
while((m=rx.exec(txt))!==null){
const val=m[grp]?.trim();
if(!val||val.length<3)continue;

if(cat==='bearer'||cat==='basic'||cat==='apikey'||cat==='token'||cat==='secret'){
if(val.length>=20&&!val.match(/^(true|false|null|undefined|function|return|class|const|let|var|if|else|for|while)$/i)){
tokens.add(JSON.stringify({value:val,type:cat,source:src}));
}
}else if(cat==='header'){
const hn=m[hname]?.trim();
headers.add(JSON.stringify({name:hn,value:val,type:cat,source:src}));
}else if(cat==='headername'){
const hv=m[hval]?.trim();
headers.add(JSON.stringify({name:val,value:hv,type:cat,source:src}));
}else if(cat==='config'||cat==='envvar'){
config.add(JSON.stringify({value:val,type:cat,source:src}));
}else{
const methd=method?m[method]?.toUpperCase():'GET';
endpoints.add(JSON.stringify({value:val,type:cat,method:methd,source:src}));
extractParams(val);
}
}
});
}

console.log('%c[API Scanner v4] Starting...','color:#0f0;font-weight:bold');

try{scan(document.documentElement.outerHTML,'HTML')}catch(e){}

const scripts=document.querySelectorAll('script');
let scanned=0,fetched=0;
for(const sc of scripts){
if(sc.src){
try{
const u=new URL(sc.src,location.origin);
if(cdnDomains.some(d=>u.hostname.includes(d)))continue;
if(thirdParty.some(d=>u.hostname.includes(d)))continue;
if(staticExt.test(u.pathname))continue;

u.searchParams.append('_sc',Date.now());
const r=await fetch(u.toString(),{method:'GET',credentials:'omit',cache:'no-cache'});
if(r.ok){scan(await r.text(),`SCRIPT:${u.hostname}`);fetched++;}
}catch(e){}
}else if(sc.textContent){
scan(sc.textContent,'INLINE');
}
scanned++;
}

const allEndpoints=[...endpoints].map(e=>JSON.parse(e));
const allTokens=[...tokens].map(t=>JSON.parse(t));
const allConfig=[...config].map(c=>JSON.parse(c));
const allHeaders=[...headers].map(h=>JSON.parse(h));
const allParams=[...params].map(p=>JSON.parse(p));

console.log(`%c[Scan] ${scanned} scripts | ${fetched} fetched | ${allEndpoints.length} endpoints | ${allTokens.length} tokens`,'color:#0cf');

function isAPI(ep){
const v=ep.value;
if(v.length<3||v.length>800)return false;
if(v.match(/^(true|false|null|undefined|\d+|NaN|Infinity)$/i))return false;
if(v.includes('function(')||v.includes('=>'))return false;
if(thirdParty.some(d=>v.includes(d)))return false;
return v.match(/\/(?:api|rest|graphql|v\d|auth|oauth|admin|backend|endpoint|service|data)\//i)||v.match(/\.(?:json|xml|api)(?:[?#]|$)/i)||v.includes('execute-api.')||ep.type==='websocket'||ep.type==='sse'||ep.type==='mqtt'||ep.type==='graphql'||ep.type==='form';
}

const validEndpoints=allEndpoints.filter(isAPI);

const authHeaders={'accept':'application/json,*/*','user-agent':navigator.userAgent};
const authSets=[];

allTokens.forEach(t=>{
const h={...authHeaders};
if(t.type==='bearer')h.Authorization=`Bearer ${t.value}`;
else if(t.type==='basic')h.Authorization=`Basic ${t.value}`;
else if(t.type==='apikey')h['X-API-Key']=t.value;
else h.Authorization=t.value;
authSets.push({headers:h,token:t});
});

allHeaders.forEach(h=>{
if(h.name&&h.name.length>2&&h.name.length<60){
authHeaders[h.name]=h.value||'detected';
}
});

if(authSets.length===0)authSets.push({headers:authHeaders,token:null});

const toProbe=[];
validEndpoints.forEach(ep=>{
let url=ep.value;
if(ep.type==='websocket'||ep.type==='sse'||ep.type==='mqtt'){
toProbe.push({url,type:ep.type,method:ep.method,probe:false,source:ep.source});
return;
}

try{
if(url.startsWith('http')){
toProbe.push({url,type:ep.type,method:ep.method,probe:true,source:ep.source});
}else if(url.startsWith('//')){
toProbe.push({url:location.protocol+url,type:ep.type,method:ep.method,probe:true,source:ep.source});
}else if(url.startsWith('/')){
toProbe.push({url:location.origin+url,type:ep.type,method:ep.method,probe:true,source:ep.source});
}else if(url.startsWith('./')||url.startsWith('../')){
toProbe.push({url:new URL(url,location.href).href,type:ep.type,method:ep.method,probe:true,source:ep.source});
}else if(url.startsWith('@/')){
toProbe.push({url:location.origin+url.slice(1),type:ep.type,method:ep.method,probe:true,source:ep.source});
}
}catch(e){}
});

const uniqueUrls=new Map();
toProbe.filter(p=>p.probe).forEach(p=>{
if(!uniqueUrls.has(p.url))uniqueUrls.set(p.url,p);
});
const toProbeUnique=[...uniqueUrls.values()];

console.log(`%c[Probe] Testing ${toProbeUnique.length} endpoints...`,'color:#0cf');

const probes=[];

for(const item of toProbeUnique){
const result={url:item.url,type:item.type,method:item.method,source:item.source,tests:[]};

for(const authSet of authSets){
const authLabel=authSet.token?authSet.token.type:'noauth';
const test={auth:authLabel,token:authSet.token?.value,methods:{}};

const methods=[item.method||'GET'];
if(!methods.includes('POST')&&item.type==='form')methods.push('POST');

for(const meth of methods){
try{
const opts={method:meth,headers:authSet.headers,mode:'cors'};
if(meth==='POST'||meth==='PUT'||meth==='PATCH'){
opts.body=JSON.stringify({});
opts.headers['content-type']='application/json';
}

const res=await fetch(item.url,opts);
const ct=res.headers.get('content-type')||'';
const txt=await res.text();

const methodResult={status:res.status,contentType:ct,size:txt.length};

if(ct.includes('json')&&txt.length>0&&txt.length<100000){
try{methodResult.data=JSON.parse(txt)}catch(e){methodResult.text=txt}
}else if(txt.length>0){
methodResult.text=txt;
}

test.methods[meth]=methodResult;
}catch(e){
test.methods[meth]={error:e.message};
}
}

result.tests.push(test);
await new Promise(r=>setTimeout(r,300));
}

probes.push(result);
await new Promise(r=>setTimeout(r,500));
}

const output={
meta:{
timestamp:new Date().toISOString(),
page:location.href,
scanned:scanned,
fetched:fetched
},
discovery:{
endpoints:allEndpoints,
validEndpoints:validEndpoints,
tokens:allTokens,
headers:allHeaders,
config:allConfig,
params:allParams
},
probes:probes
};

console.log('%c\n=== SCAN COMPLETE ===','color:#0f0;font-weight:bold;font-size:1.3em');
console.log(`Found: ${allEndpoints.length} endpoints | ${allTokens.length} tokens | ${allConfig.length} configs`);
console.log(`Tested: ${probes.length} endpoints\n`);
console.log('%cFull Results (expand below):','color:#0cf;font-weight:bold');
console.log(output);
console.log('\n%cAccess via: window.apiScanResult','color:#09f');

window.apiScanResult=output;
return output;
})();
