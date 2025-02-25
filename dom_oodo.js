const saleteam=["Lưu Phan Hoàng Phúc","Nguyễn Thị Linh Đan","Lê Đinh Ý Nhi","Mai Thị Nữ","Nguyễn Thị Hà Miên"],saleAvatar={"Lưu Phan Hoàng Phúc":"./DOM-img/phuc.jpg","Nguyễn Thị Linh Đan":"./DOM-img/dan.jpg","Lê Đinh Ý Nhi":"./DOM-img/ynhi.jpg","Mai Thị Nữ":"./DOM-img/nu.jpg","Nguyễn Thị Hà Miên":"./DOM-img/hamien.png"},tagName={126:"Status - New",127:"Bad-timing",128:"Junk",129:"Qualified",154:"Unqualified",170:"Needed"},tagWon={96:"DBA",143:"EMBA UMEF",155:"SBS",156:"ASC",201:"MBA UMEF",203:"BBA",206:"MSc AI"},sale_switch=document.querySelectorAll(".sale_switch"),PROXY="https://ideas.edu.vn/wp-admin/network/NewFolder/proxy.php";let loginPromise=loginOdoo();async function ensureLogin(){await loginPromise}async function loginOdoo(){const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/session/authenticate",data:{jsonrpc:"2.0",params:{db:"IBM_Prod",login:"numt@ideas.edu.vn",password:"1"}}})}),e=await t.json();if(e.result&&e.result.uid)return e.result;throw new Error("Login failed!")}function getDateFilterArgs(){let t,e;if(startDateGlobal&&endDateGlobal)t=startDateGlobal,e=endDateGlobal;else{const a=new Date;t=new Date(a.getFullYear(),a.getMonth(),1).toISOString().split("T")[0],e=new Date(a.getFullYear(),a.getMonth()+1,0).toISOString().split("T")[0]}return[[["create_date",">=",t],["create_date","<=",e]]]}let viewStartOodo=null,viewEndOodo=null;function getDateWonArg(){let t,e;if(startDateGlobal&&endDateGlobal)t=startDateGlobal,e=endDateGlobal,viewStartOodo=startDateGlobal,viewEndOodo=endDateGlobal;else{const a=new Date;t=new Date(a.getFullYear(),a.getMonth(),1).toISOString().split("T")[0],e=new Date(a.getFullYear(),a.getMonth()+1,0).toISOString().split("T")[0]}return[[["date_last_stage_update",">=",t],["date_last_stage_update","<=",e],["stage_id","in",[4,6]]]]}function checkDateTime(){let t=[];if(date_preset){t=formatDateRange(getFormattedDateRange(date_preset))}else startDateGlobal&&endDateGlobal&&(t=getDateFilterArgs());return t}function checkDateTimeWon(){let t=[];if(date_preset){t=formatDateRangeWon(getFormattedDateRange(date_preset))}else startDateGlobal&&endDateGlobal&&(t=getDateWonArg());return t}async function fetchWonLeadsThisYear(){try{const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"crm.lead",method:"search_read",args:checkDateTimeWon(),kwargs:{fields:["name","create_date","contact_name","partner_id","email_from","phone","tag_ids","user_id","medium_id","source_id","campaign_id","date_last_stage_update","stage_id","expected_revenue","probability"],limit:0}}}})}),e=await t.json();if(!e.result||!Array.isArray(e.result))throw new Error("Không có dữ liệu hoặc lỗi API.");const a=new Uint8Array(12),n=[],o=new Set;for(const t of e.result){if(4===t.stage_id?.[0]){n.push(t);a[new Date(t.date_last_stage_update).getMonth()]++}t.partner_id[0]&&o.add(t.partner_id[0])}const r=fetchInvoicesByLeadIds([...o],e.result);return drawWonLeadsChart(a),drawWonLeadsByProgramChart(n),await r}catch(t){return[]}}async function fetchInvoicesByLeadIds(t,e){if(!t.length)return e;try{const a=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"account.move",method:"search_read",args:[[["partner_id","in",t],["move_type","=","out_invoice"]]],kwargs:{fields:["partner_id","amount_total_signed","invoice_date","payment_state"],order:"invoice_date asc"}}}})}),n=(await a.json()).result||[],o=new Map,r=new Map,d=new Map,s=new Map,l=new Date(viewStartOodo),i=new Date(viewEndOodo);for(const{partner_id:t,amount_total_signed:e,invoice_date:a,payment_state:c}of n){const n=t[0];if(s.has(n)||s.set(n,[]),s.get(n).push(a),r.set(n,(r.get(n)??0)+e),"paid"===c){o.set(n,(o.get(n)??0)+e);const t=new Date(a);t>=l&&t<=i&&d.set(n,(d.get(n)??0)+e)}}const c=[],u=[];for(const t of e){const e=t.partner_id?.[0];if(4===t.stage_id?.[0]||6===t.stage_id?.[0]){t.amount_total_signed=o.get(e)??0,t.amount_total_pre=r.get(e)??0,t.amount_total_month=d.get(e)??0;const a=s.get(e)||[];t.first_invoice=a[0]??null,t.conversion_days=t.first_invoice&&t.create_date?Math.floor((new Date(t.first_invoice)-new Date(t.create_date))/864e5):null,c.push(t)}else 13===t.stage_id?.[0]&&(t.amount_total_signed=t.amount_total_pre=t.amount_total_month=0,t.conversion_days=t.date_last_stage_update&&t.create_date?Math.floor((new Date(t.date_last_stage_update)-new Date(t.create_date))/864e5):null,u.push(t))}return loading.classList.remove("active"),{wonLeads:c,specialLeads:u}}catch(t){return loading.classList.remove("active"),{wonLeads:[],specialLeads:[]}}}let wonChartInstance=null;function drawWonLeadsChart(t){const e=document.getElementById("wonChart").getContext("2d");window.wonChartInstance&&window.wonChartInstance.destroy(),window.wonChartInstance=new Chart(e,{type:"bar",data:{labels:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],datasets:[{label:"Leads Won",data:t,backgroundColor:"rgba(255, 171, 0,0.9)",borderColor:"rgba(255, 171, 0,1)",borderWidth:1}]},options:{responsive:!0,plugins:{legend:{display:!1},title:{display:!1}},scales:{y:{beginAtZero:!0}}}})}async function fetchLeads(){document.querySelector(".loading").classList.add("active");const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"crm.lead",method:"search_read",args:checkDateTime(),kwargs:{fields:["tag_ids","user_id"],limit:0}}}})});return(await t.json()).result}function makeColor(t){let e="rgba(255, 99, 132, 1)";return"Needed"==t||("Status - New"==t?e="rgb(255, 68, 0)":"Bad-Timing"==t?e="rgb(108, 0, 86)":"Unqualified"==t?e="rgb(229, 217, 0)":"Junk"==t&&(e="rgb(0, 0, 0)")),e}function makeColorWon(t){let e="rgb(182, 0, 0)";return"MSc AI"==t?e="rgb(0, 80, 133)":"EMBA UMEF"==t?e="rgb(0, 136, 146)":"ASC"==t?e="rgb(184, 141, 0)":"SBS"==t?e="rgb(255, 81, 0)":"MBA UMEF"==t?e="rgb(255, 0, 0)":"DBA"==t?e="rgb(196, 0, 153)":"BBA"==t&&(e="rgb(5, 160, 0)"),e}function renderUloodo(t,e){let a=t[e];const n=document.querySelector(".dom_toplist.oodo");if(a){let a=Object.entries(t[e]).sort(((t,e)=>e[1]-t[1])),o=a.map((([t,e])=>t)),r=a.map((([t,e])=>e));n.innerHTML="",o.forEach(((t,e)=>{if(0==e)return;const a=document.createElement("li");a.innerHTML=`<p><span>${t}</span> <span>${r[e]}</span></p> <p> <span style="width: ${100*r[e]/r[0]}%; background: ${makeColor(t)}"></span> </p>`,n.appendChild(a)}))}else n.innerHTML=""}function renderWon(t){const e=document.querySelector(".table.oodo tbody");e.innerHTML="",t.sort(((t,e)=>new Date(e.date_last_stage_update)-new Date(t.date_last_stage_update))),t.forEach((t=>{const a=t.user_id?t.user_id[1]:"Khác",n=document.createElement("tr");n.innerHTML=`\n      <td>${formatDate(t.date_last_stage_update)||""}</td>\n      <td>${formatDate(t.create_date)||""}</td>\n      <td>${""+(t.conversion_days?`${formatNumber(t.conversion_days)} days`:"No Invoice")||""}</td>\n      <td> <span style="background: ${makeColorWon(getTagDisplayWon(t.tag_ids))}"></span>${getTagDisplayWon(t.tag_ids)||""}</td>\n      <td>${t.contact_name||""}</td>\n      <td>${t.email_from||""}</td>\n      <td>${t.phone||""}</td>\n      <td>${t.stage_id[1]||""}</td>\n      <td>${formatCurrency(t.amount_total_month)||""}</td>\n      <td>${formatCurrency(t.amount_total_signed)||""}</td>\n      <td>${formatCurrency(t.amount_total_pre)||""}</td>\n      <td> <img src="${saleAvatar[a]}"/> <span>${a}</span></td>\n      <td>${t.source_id[1]||""}</td>\n      <td>${t.campaign_id[1]||""}</td>\n      <td>${t.medium_id[1]||""}</td>\n    `,e.appendChild(n)})),updateTableFooter(t)}function renderExpected(t){const e=document.querySelector("#expected_table tbody");e.innerHTML="",t.sort(((t,e)=>new Date(e.date_last_stage_update)-new Date(t.date_last_stage_update))),t.forEach((t=>{const a=t.user_id?t.user_id[1]:"Khác",n=document.createElement("tr");n.innerHTML=`\n      <td>${formatDate(t.date_last_stage_update)||""}</td>\n      <td>${formatDate(t.create_date)||""}</td>\n      <td>${""+(t.conversion_days?`${formatNumber(t.conversion_days)} days`:"No Invoice")||""}</td>\n      <td> <span style="background: ${makeColorWon(getTagDisplayWon(t.tag_ids))}"></span>${getTagDisplayWon(t.tag_ids)||""}</td>\n      <td>${t.contact_name||""}</td>\n      <td>${t.email_from||""}</td>\n      <td>${t.phone||""}</td>\n      <td>${t.stage_id[1]||""}</td>\n      <td>${formatCurrency(t.expected_revenue)||""}</td>\n      <td>${t.probability}%</td>\n      <td>${formatCurrency(t.amount_total_pre)||""}</td>\n      <td> <img src="${saleAvatar[a]}"/> <span>${a}</span></td>\n      <td>${t.source_id[1]||""}</td>\n      <td>${t.campaign_id[1]||""}</td>\n      <td>${t.medium_id[1]||""}</td>\n    `,e.appendChild(n)})),updateExpectTableFooter(t)}function updateTableFooter(t){const e=document.querySelector("#won_table.table.oodo");let a=document.querySelector("#won_table.table.oodo tfoot");a&&a.remove();let n=0;n=t.length;const{totalAmount:o,totalPreAmount:r,totalMonth:d}=t.reduce(((t,e)=>(t.totalAmount+=e.amount_total_signed||0,t.totalPreAmount+=e.amount_total_pre||0,t.totalMonth+=e.amount_total_month||0,t)),{totalAmount:0,totalPreAmount:0,totalMonth:0}),s=document.createElement("tfoot");s.innerHTML=`\n      <tr>\n        <td style="text-align:center" colspan="3"><strong>TOTAL ${n} ROW</strong></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td><strong>${formatCurrency(d)}</strong></td>\n        <td><strong>${formatCurrency(o)}</strong></td>\n        <td><strong>${formatCurrency(r)}</strong></td>\n        <td ></td>\n        <td colspan="3"></td>\n      </tr>\n    `,e.appendChild(s)}function updateExpectTableFooter(t){const e=document.querySelector("#expected_table.table.oodo");let a=document.querySelector("#expected_table.table.oodo tfoot");a&&a.remove();let n=0;n=t.length;const{totalMonth:o}=t.reduce(((t,e)=>(t.totalMonth+=e.expected_revenue||0,t)),{totalMonth:0}),r=document.createElement("tfoot");r.innerHTML=`\n      <tr>\n        <td style="text-align:center" colspan="3"><strong>TOTAL ${n} ROW</strong></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td><strong>${formatCurrency(o)}</strong></td>\n       <td ></td>\n      <td ></td>\n       <td ></td>\n        <td ></td>\n        <td ></td>\n        <td colspan="3"></td>\n      </tr>\n    `,e.appendChild(r)}function processAndRenderLeads(t){const e={};t.forEach((({user_id:t,tag_ids:a})=>{const n=t?t[1]:"Khác";if(!saleteam.includes(n))return;let o=e[n]??={total:0,Needed:0,"Status - New":0,"Bad-Timing":0,Unqualified:0,Junk:0};if(o.total++,Array.isArray(a)){let t=new Set(a);t.has(129)||t.has(170)?o.Needed++:t.has(126)?o["Status - New"]++:t.has(127)?o["Bad-Timing"]++:t.has(154)?o.Unqualified++:t.has(128)&&o.Junk++}})),salesDataGlobal=e,renderChart(e),renderUloodo(e,saleteam[0]),calculateTotalSalesData(e)}function renderProgressBar(t){const e=document.querySelector("#progressBar"),a=document.querySelector(".progess_label"),n=document.querySelector(".oodo_total");e.replaceChildren(),a.replaceChildren();let o=Object.values(t).reduce(((t,e)=>t+e),0);if(n.innerText=o,0===o)return;let r=document.createDocumentFragment(),d=document.createDocumentFragment();Object.entries(t).forEach((([t,e])=>{if(0===e)return;const a=(e/o*100).toFixed(1),n=makeColor(t);let s=document.createElement("p");s.classList.add("segment"),s.style=`width:${a}%; background:${n}`,r.appendChild(s);let l=document.createElement("p");l.innerHTML=`<span style="background: ${n}"></span>${t}: <b>${e} (${a}%)</b>`,d.appendChild(l)})),e.appendChild(r),a.appendChild(d)}function calculateTotalSalesData(t){const e={Needed:0,"Status - New":0,"Bad-Timing":0,Unqualified:0,Junk:0};Object.values(t).forEach((t=>{e.Needed+=t.Needed||0,e["Status - New"]+=t["Status - New"]||0,e["Bad-Timing"]+=t["Bad-Timing"]||0,e.Unqualified+=t.Unqualified||0,e.Junk+=t.Junk||0})),renderProgressBar(e)}sale_switch.forEach(((t,e)=>{t.addEventListener("click",(()=>{renderUloodo(salesDataGlobal,saleteam[e]),setActiveOnly(t,".sale_switch.active")}))}));let reachChartInstanceOodo=null;function renderChart(t){null!==reachChartInstanceOodo&&reachChartInstanceOodo.destroy();const e=Object.keys(t),a=e.map((t=>{const e=t.split(" ");return e[e.length-1]})),n=e.map((e=>t[e].total)),o=e.map((e=>t[e].Needed)),r=document.getElementById("leadChart").getContext("2d");reachChartInstanceOodo=new Chart(r,{type:"bar",data:{labels:a,datasets:[{label:"Total Lead",data:n,backgroundColor:"rgba(255, 171, 0,1)",borderWidth:1},{label:"Needed",data:o,backgroundColor:"rgba(255, 99, 132, 1)",borderWidth:1}]},options:{plugins:{legend:{display:!0},tooltip:{enabled:!0},datalabels:{anchor:"end",align:"top",color:"#7c7c7c",font:{size:11,weight:"bold"},formatter:t=>t}},responsive:!0,scales:{y:{beginAtZero:!0,ticks:{font:{size:9}},afterDataLimits:t=>{t.max*=1.15}}}},plugins:[ChartDataLabels]})}const expected_table_block=document.querySelector(".expected_table");async function main(){try{await ensureLogin();const[t,e]=await Promise.all([fetchLeads(),fetchWonLeadsThisYear()]);processAndRenderLeads(t),renderWon(e.wonLeads),e.specialLeads.length?(expected_table_block.style.display="block",renderExpected(e.specialLeads)):expected_table_block.style.display="none"}catch(t){}}function getRound(t,e,a){return"Form"===t&&"Facebook IDEAS"===e&&"FB Ads"===a?"Vòng Form":"Mess/Web/Hotline"}function formatTagName(t){return t?t.toLowerCase().replace(/\s*-\s*/g,"_").replace(/\s+/g,"_"):""}function getTagDisplay(t){if(!t||0===t.length)return"";if(t.includes(129)||t.includes(170))return"Needed";for(let e of t)if(tagName[e])return tagName[e];return""}function getTagDisplayWon(t){if(!t||0===t.length)return"No tag";for(let e of t)if(tagWon[e])return tagWon[e];return"Unknow Tag"}function getTagDisplayNeeded(t){return t.includes(129)||t.includes(170)?"Needed":null}function filterTable(t){const e=document.querySelectorAll("table.table.oodo tbody tr");let a=[];e.forEach((e=>{const n=e.children[6].textContent.trim().toLowerCase(),o=e.children[7].textContent.trim().toLowerCase(),r=normalizeVietnamese(e.children[11].textContent.trim().toLowerCase()),d=e.children[2].textContent.trim().toLowerCase(),s=normalizeVietnamese(e.children[4].textContent.trim().toLowerCase());n.includes(t)||r.includes(t)||d.includes(t)||s.includes(t)||o.includes(t)?(e.style.display="",a.push({amount_total_month:formatCurrencyToNumber(e.children[8].textContent)||0,amount_total_signed:formatCurrencyToNumber(e.children[9].textContent)||0,amount_total_pre:formatCurrencyToNumber(e.children[10].textContent)||0})):e.style.display="none"})),updateTableFooter(a)}function formatDateRange(t){if(!t)return[];const e=t.split(" - ").map((t=>{const[e,a,n]=t.split("/");return`${n}-${a}-${e}`})),a=e[0];return[[["create_date",">=",a],["create_date","<=",e[1]||a]]]}function formatDateRangeWon(t){if(!t)return[];const e=t.split(" - ").map((t=>{const[e,a,n]=t.split("/");return`${n}-${a}-${e}`})),a=e[0],n=e[1]||a;return viewStartOodo=a,viewEndOodo=n,[[["date_last_stage_update",">=",a],["date_last_stage_update","<=",n],["stage_id","in",[4,6,13]]]]}document.querySelector(".dom_search.oodo").addEventListener("input",(function(){filterTable(normalizeVietnamese(this.value.trim().toLowerCase()))})),document.querySelector(".dom_export_main.oodo").addEventListener("click",(function(){const t=document.getElementById("dom_table_oodo");if(!t)return;const e=XLSX.utils.book_new(),a=XLSX.utils.table_to_sheet(t);XLSX.utils.book_append_sheet(e,a,"Sheet1"),XLSX.writeFile(e,"export.xlsx")}));let wonProgramChartInstance=null;function drawWonLeadsByProgramChart(t){const e=document.getElementById("wonProgramChart").getContext("2d");window.wonProgramChartInstance&&window.wonProgramChartInstance.destroy();const a={};t.forEach((t=>{const e=getTagDisplayWon(t.tag_ids);e&&(a[e]=(a[e]||0)+1)}));const n=Object.keys(a),o=Object.values(a);0!==o.length&&(window.wonProgramChartInstance=new Chart(e,{type:"bar",data:{labels:n,datasets:[{label:"Leads by Program",data:o,backgroundColor:"rgba(255, 171, 0,0.9)",borderColor:"rgba(255, 171, 0,1)",borderWidth:1}]},options:{barPercentage:.4,responsive:!0,plugins:{legend:{display:!1},title:{display:!1}},scales:{y:{beginAtZero:!0}}}}))}function normalizeVietnamese(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D")}function formatCurrencyToNumber(t){return parseFloat(t.replace(/\./g,"").replace("đ","").trim())}
