const saleteam=["Lưu Phan Hoàng Phúc","Nguyễn Thị Linh Đan","Lê Đinh Ý Nhi","Mai Thị Nữ","Nguyễn Thị Hà Miên"],saleAvatar={"Lưu Phan Hoàng Phúc":"./DOM-img/phuc.jpg","Nguyễn Thị Linh Đan":"./DOM-img/dan.jpg","Lê Đinh Ý Nhi":"./DOM-img/ynhi.jpg","Mai Thị Nữ":"./DOM-img/nu.jpg","Nguyễn Thị Hà Miên":"./DOM-img/hamien.png"},tagName={126:"Status - New",127:"Bad-timing",128:"Junk",129:"Qualified",154:"Unqualified",170:"Needed"},tagWon={96:"DBA",143:"EMBA UMEF",155:"SBS",156:"ASC",201:"MBA UMEF",203:"BBA",206:"MSc AI"};let viewStartOodo=null,viewEndOodo=null,wonLeadsGlobal=[],targetGlobal=[];const sale_switch=document.querySelectorAll(".sale_switch"),PROXY="https://ideas.edu.vn/wp-admin/network/NewFolder/proxy.php";let startInvoiceDate,endInvoiceDate,loginPromise=loginOdoo(),fisrtFetch=!1;async function ensureLogin(){loading.classList.add("active"),await loginPromise,loading.classList.remove("active")}async function loginOdoo(){const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/session/authenticate",data:{jsonrpc:"2.0",params:{db:"IBM_Prod",login:"numt@ideas.edu.vn",password:"1"}}})}),e=await t.json();if(e.result&&e.result.uid)return e.result;throw new Error("Login failed!")}function getDateFilter(t){let e,a;if(startDateGlobal&&endDateGlobal)e=startDateGlobal,a=endDateGlobal;else{const t=new Date;e=new Date(t.getFullYear(),t.getMonth(),1).toISOString().split("T")[0],a=new Date(t.getFullYear(),t.getMonth()+1,0).toISOString().split("T")[0]}if("next"===t&&e&&a){const t=new Date(e),n=new Date(a);Math.ceil((n-t)/864e5)<26&&(a=new Date(t.getFullYear(),t.getMonth()+1,0).toISOString().split("T")[0]),startInvoiceDate=e,endInvoiceDate=a}const n={default:[["create_date",">=",e],["create_date","<=",a]],next:[["invoice_date",">=",e],["invoice_date","<=",a],["state","=","posted"],["payment_state","=","not_paid"]],won:[["date_last_stage_update",">=",e],["date_last_stage_update","<=",a],["stage_id","in",[4,6]]]};return[n[t]||n.default]}function checkDateTime(t){if(date_preset){const e=getFormattedDateRange(date_preset);return"next"===t?formatNextRange(e):"won"===t?formatDateRangeWon(e):formatDateRange(e)}return startDateGlobal&&endDateGlobal?getDateFilter(t):[]}async function fetchWonLeadsThisYear(){try{const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"crm.lead",method:"search_read",args:checkDateTime("won"),kwargs:{fields:["name","create_date","contact_name","partner_id","tag_ids","user_id","medium_id","source_id","campaign_id","date_last_stage_update","stage_id","expected_revenue","probability"],limit:0}}}})}),e=await t.json();if(!e.result||!Array.isArray(e.result))throw new Error("Không có dữ liệu hoặc lỗi API.");const a=new Uint8Array(12),n=[],o=new Set;for(const t of e.result){if(4===t.stage_id?.[0]){n.push(t);a[new Date(t.date_last_stage_update).getMonth()]++}t.partner_id[0]&&o.add(t.partner_id[0])}const r=fetchInvoicesByLeadIds([...o],e.result);return drawWonLeadsChart(a),await r}catch(t){return[]}}const today=new Date,startOfMonth=new Date(today.getFullYear(),today.getMonth(),1).toISOString().split("T")[0],endOfMonth=new Date(today.getFullYear(),today.getMonth()+1,0).toISOString().split("T")[0];async function fetchUnpaidInvoicesThisMonth(){try{const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"account.move",method:"search_read",args:checkDateTime("next"),kwargs:{fields:["partner_id"],order:"invoice_date asc"}}}})}),e=(await t.json()).result||[],a=[...new Set(e.map((t=>t.partner_id?.[0])).filter(Boolean))],{leads:n,newPartnerIds:o}=await fetchStudentsFromCRM(a);return await fetchInvoicesByLeadIds(o,n)}catch(t){return[]}}async function fetchStudentsFromCRM(t){if(!t.length)return{leads:[],newPartnerIds:[]};try{const e=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"crm.lead",method:"search_read",args:[[["partner_id","in",t]]],kwargs:{fields:["name","create_date","contact_name","partner_id","tag_ids","user_id","medium_id","source_id","campaign_id","date_last_stage_update","stage_id","expected_revenue","probability"],limit:0}}}})}),a=(await e.json()).result||[],n=[...new Set(a.map((t=>t.partner_id?.[0])).filter(Boolean))];return{leads:a,newPartnerIds:n}}catch(t){return{leads:[],newPartnerIds:[]}}}async function processUnpaidInvoices(){const{wonLeads:t}=await fetchUnpaidInvoicesThisMonth();renderNextPaid(t)}async function fetchInvoicesByLeadIds(t,e){if(!t.length)return e;try{const a=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"account.move",method:"search_read",args:[[["partner_id","in",t],["move_type","in",["out_invoice","out_refund"]],["state","=","posted"]]],kwargs:{fields:["partner_id","invoice_date","amount_total_signed","payment_state"],order:"invoice_date asc"}}}})}),n=(await a.json()).result||[],o=new Map,r=new Map,d=new Map,s=new Map,i=new Map,c=new Map;debtInvoiceMap=new Map;const l=new Date(viewStartOodo),u=new Date(viewEndOodo);for(const t of n){const e=t.partner_id?.[0];if(e)if(i.has(e)||i.set(e,[]),i.get(e).push(t),r.set(e,(r.get(e)??0)+t.amount_total_signed),"paid"===t.payment_state||"in_payment"===t.payment_state||"reversed"===t.payment_state){o.set(e,(o.get(e)??0)+t.amount_total_signed);const a=new Date(t.invoice_date);a>=l&&a<=u&&d.set(e,(d.get(e)??0)+t.amount_total_signed)}else if("not_paid"===t.payment_state){const a=new Date(t.invoice_date);debtInvoiceMap.set(e,(debtInvoiceMap.get(e)??0)+t.amount_total_signed),a>=new Date(startInvoiceDate)&&a<=new Date(endInvoiceDate)&&(s.set(e,(s.get(e)??0)+t.amount_total_signed),c.has(e)||c.set(e,[]),c.get(e).push(t))}}const g=[],m=[];for(const t of e){const e=t.partner_id?.[0],a=i.get(e)||[],n=c.get(e)||[];t.first_invoice=a.length?a[0].invoice_date:null,t.next_invoice=n.length?n[0].invoice_date:null,4===t.stage_id?.[0]||6===t.stage_id?.[0]?(t.amount_total_signed=o.get(e)??0,t.amount_total_pre=r.get(e)??0,t.amount_total_month=d.get(e)??0,t.amount_next=s.get(e)??0,t.amount_debt=debtInvoiceMap.get(e)??0,t.conversion_days=t.first_invoice&&t.create_date?Math.floor((new Date(t.first_invoice)-new Date(t.create_date))/864e5):null,g.push(t)):13===t.stage_id?.[0]&&(t.amount_total_signed=0,t.amount_total_pre=0,t.amount_total_month=0,t.conversion_days=t.date_last_stage_update&&t.create_date?Math.floor((new Date(t.date_last_stage_update)-new Date(t.create_date))/864e5):null,m.push(t))}return{wonLeads:g,specialLeads:m}}catch(t){return{wonLeads:[],specialLeads:[]}}}let wonChartInstance=null;function drawWonLeadsChart(t){const e=document.getElementById("wonChart").getContext("2d");window.wonChartInstance&&window.wonChartInstance.destroy(),window.wonChartInstance=new Chart(e,{type:"bar",data:{labels:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],datasets:[{label:"Leads Won",data:t,backgroundColor:"rgba(255, 171, 0,0.9)",borderColor:"rgba(255, 171, 0,1)",borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,borderRadius:5,plugins:{legend:{display:!1},tooltip:{enabled:!0},datalabels:{anchor:"end",align:"top",color:"#7c7c7c",font:{size:11,weight:"bold"},formatter:t=>formatCurrencyText(t)}},scales:{x:{ticks:{font:{size:10}}},y:{beginAtZero:!0,ticks:{font:{size:11},callback:t=>formatCurrencyText(t)},afterDataLimits:t=>{t.max*=1.1}}}},plugins:[ChartDataLabels]})}async function fetchLeads(){document.querySelector(".loading").classList.add("active");const t=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:"/web/dataset/call_kw",data:{jsonrpc:"2.0",method:"call",params:{model:"crm.lead",method:"search_read",args:checkDateTime("normal"),kwargs:{fields:["tag_ids","user_id"],limit:0}}}})});return(await t.json()).result}function makeColor(t){let e="rgba(255, 99, 132, 1)";return"Needed"==t||("Status - New"==t?e="rgb(255, 68, 0)":"Bad-Timing"==t?e="rgb(108, 0, 86)":"Unqualified"==t?e="rgb(229, 217, 0)":"Junk"==t&&(e="rgb(0, 0, 0)")),e}function makeColorWon(t){let e="rgb(182, 0, 0)";return"MSc AI"==t?e="rgb(0, 80, 133)":"EMBA UMEF"==t?e="rgb(0, 136, 146)":"ASC"==t?e="rgb(184, 141, 0)":"SBS"==t?e="rgb(255, 81, 0)":"MBA UMEF"==t?e="rgb(255, 0, 0)":"DBA"==t?e="rgb(196, 0, 153)":"BBA"==t&&(e="rgb(5, 160, 0)"),e}function renderUloodo(t,e){let a=t[e];const n=document.querySelector(".dom_toplist.oodo");if(a){let a=Object.entries(t[e]).sort(((t,e)=>e[1]-t[1])),o=a.map((([t,e])=>t)),r=a.map((([t,e])=>e));n.innerHTML="",o.forEach(((t,e)=>{if(0==e)return;const a=document.createElement("li");a.innerHTML=`<p><span>${t}</span> <span>${r[e]}</span></p> <p> <span style="width: ${100*r[e]/r[0]}%; background: ${makeColor(t)}"></span> </p>`,n.appendChild(a)}))}else n.innerHTML=""}function renderWon(t){const e=document.querySelector(".table.oodo tbody");e.innerHTML="",t.sort(((t,e)=>new Date(e.date_last_stage_update)-new Date(t.date_last_stage_update))),t.forEach((t=>{const a=t.user_id?t.user_id[1]:"Khác",n=document.createElement("tr");n.innerHTML=`\n      <td>${formatDate(t.date_last_stage_update)||""}</td>\n      <td>${formatDate(t.create_date)||""}</td>\n      <td>${""+(t.conversion_days?`${formatNumber(t.conversion_days)} days`:"Unpaid")||""}</td>\n      <td> <span style="background: ${makeColorWon(getTagDisplayWon(t.tag_ids))}"></span>${getTagDisplayWon(t.tag_ids)||""}</td>\n      <td>${t.contact_name||""}</td>\n      <td>${t.stage_id[1]||""}</td>\n      <td>${formatCurrency(t.amount_total_month)||""}</td>\n      <td>${formatCurrency(t.amount_total_signed)||""}</td>\n      <td>${formatCurrency(t.amount_total_pre)||""}</td>\n      <td> <img src="${saleAvatar[a]}"/> <span>${a}</span></td>\n      <td>${t.source_id[1]||""}</td>\n      <td>${t.campaign_id[1]||""}</td>\n      <td>${t.medium_id[1]||""}</td>\n    `,e.appendChild(n)})),document.querySelector(".loading").classList.remove("active"),updateTableFooter(t)}function renderNextPaid(t){const e=document.querySelector("#invoice_table tbody");e.innerHTML="",t&&t.sort(((t,e)=>new Date(t.next_invoice)-new Date(e.next_invoice))),t.forEach((t=>{const a=t.user_id?t.user_id[1]:"Khác",n=document.createElement("tr");n.innerHTML=`\n    <td>${t.contact_name||""}</td>\n      <td> <span style="background: ${makeColorWon(getTagDisplayWon(t.tag_ids))}"></span>${getTagDisplayWon(t.tag_ids)||""}</td>\n      <td>${formatDate(t.next_invoice)||""}</td>\n      <td>${formatCurrency(t.amount_next)||""}</td>\n      <td>${formatCurrency(t.amount_debt)||""}</td>\n      <td>${formatCurrency(t.amount_total_signed)||""}</td>\n      <td>${formatCurrency(t.amount_total_pre)||""}</td>\n      <td> <img src="${saleAvatar[a]}"/> <span>${a}</span></td>\n      <td>${t.source_id[1]||""}</td>\n      <td>${t.campaign_id[1]||""}</td>\n      <td>${t.medium_id[1]||""}</td>\n    `,e.appendChild(n)})),updateNextInvoiceTableFooter(t)}function renderExpected(t){const e=document.querySelector("#expected_table tbody");e.innerHTML="",t.sort(((t,e)=>new Date(e.date_last_stage_update)-new Date(t.date_last_stage_update))),t.forEach((t=>{const a=t.user_id?t.user_id[1]:"Khác",n=document.createElement("tr");n.innerHTML=`\n      <td>${formatDate(t.date_last_stage_update)||""}</td>\n      <td>${formatDate(t.create_date)||""}</td>\n      <td>${""+(t.conversion_days?`${formatNumber(t.conversion_days)} days`:"No Invoice")||""}</td>\n      <td> <span style="background: ${makeColorWon(getTagDisplayWon(t.tag_ids))}"></span>${getTagDisplayWon(t.tag_ids)||""}</td>\n      <td>${t.contact_name||""}</td>\n      <td>${t.email_from||""}</td>\n      <td>${t.phone||""}</td>\n      <td>${t.stage_id[1]||""}</td>\n      <td>${formatCurrency(t.expected_revenue)||""}</td>\n      <td>${t.probability}%</td>\n      <td>${formatCurrency(t.amount_total_pre)||""}</td>\n      <td> <img src="${saleAvatar[a]}"/> <span>${a}</span></td>\n      <td>${t.source_id[1]||""}</td>\n      <td>${t.campaign_id[1]||""}</td>\n      <td>${t.medium_id[1]||""}</td>\n    `,e.appendChild(n)})),updateExpectTableFooter(t)}function updateTableFooter(t){const e=document.querySelector("#won_table.table.oodo");let a=document.querySelector("#won_table.table.oodo tfoot");a&&a.remove();let n=0;n=t.length;const{totalAmount:o,totalPreAmount:r,totalMonth:d}=t.reduce(((t,e)=>(t.totalAmount+=1*e.amount_total_signed||0,t.totalPreAmount+=1*e.amount_total_pre||0,t.totalMonth+=1*e.amount_total_month||0,t)),{totalAmount:0,totalPreAmount:0,totalMonth:0}),s=document.createElement("tfoot");s.innerHTML=`\n      <tr>\n        <td style="text-align:center" colspan="3"><strong>TOTAL ${n} ROW</strong></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td><strong>${formatCurrency(d)}</strong></td>\n        <td><strong>${formatCurrency(o)}</strong></td>\n        <td><strong>${formatCurrency(r)}</strong></td>\n        <td ></td>\n        <td colspan="3"></td>\n      </tr>\n    `,e.appendChild(s)}function updateNextInvoiceTableFooter(t){const e=document.querySelector("#invoice_table");let a=document.querySelector("#invoice_table tfoot");a&&a.remove(),totalLeads=t.length;const{totalNext:n,totalPreAmount:o,totalPaid:r,totalDebt:d,programData:s}=t.reduce(((t,e)=>{t.totalNext+=1*e.amount_next||0,t.totalDebt+=1*e.amount_debt||0,t.totalPreAmount+=1*e.amount_total_pre||0,t.totalPaid+=1*e.amount_total_signed||0;const a=getTagDisplayWon(e.tag_ids)||"Unknown";return t.programData[a]=(t.programData[a]||0)+(1*e.amount_next||0),t}),{totalNext:0,totalPreAmount:0,totalDebt:0,totalPaid:0,programData:{}}),i=document.createElement("tfoot");i.innerHTML=`\n      <tr>\n        <td style="text-align:center" colspan="3"><strong>TOTAL ${totalLeads} ROW</strong></td>\n        <td><strong>${formatCurrency(n)}</strong></td>\n        <td><strong>${formatCurrency(d)}</strong></td>\n        <td><strong>${formatCurrency(r)}</strong></td>\n        <td><strong>${formatCurrency(o)}</strong></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td colspan="3"></td>\n      </tr>\n    `,e.appendChild(i),drawNextPayChart(s)}sale_switch.forEach(((t,e)=>{t.addEventListener("click",(()=>{renderUloodo(salesDataGlobal,saleteam[e]),setActiveOnly(t,".sale_switch.active")}))})),selecItemLead.addEventListener("click",(t=>{selecItemLead.classList.toggle("active");const e=t.target.closest("li");if(e&&!e.classList.contains("active")){setActiveOnly(e,".dom_select_show.leadchart li.active");const t=e.dataset.view;selecItemLeadText.textContent=t;const a=e.dataset.view||"Paid in time";updateByProChart(wonLeadsGlobal,a)}}));let nextChartInstance=null,byProChartInstance=null;function drawNextPayChart(t){const e=document.getElementById("nextChart").getContext("2d");window.nextChartInstance&&window.nextChartInstance.destroy(),window.nextChartInstance=new Chart(e,{type:"bar",data:{labels:Object.keys(t),datasets:[{label:"Next Pay (VND)",data:Object.values(t),backgroundColor:"#ffab00",borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,borderRadius:5,plugins:{legend:{display:!1},tooltip:{enabled:!0},datalabels:{anchor:"end",align:"top",color:"#7c7c7c",font:{size:13,weight:"bold"},formatter:t=>formatCurrencyText(t)}},scales:{x:{ticks:{font:{size:13}}},y:{beginAtZero:!0,ticks:{font:{size:13},callback:function(t){return formatCurrencyText(t)}},afterDataLimits:t=>{t.max*=1.1}}},barPercentage:.3},plugins:[ChartDataLabels]})}async function fetchLeadsAndUpdateChart(){try{const t=await fetch("https://script.google.com/macros/s/AKfycbzOoN0I6voxC84bBc6oKm6RIRVE_SrZ18x2HoufC2UgiOhyjXHYCatMe37j8_sZaey-SQ/exec");if(!t.ok)throw new Error("Lỗi khi lấy dữ liệu");getAggregatedData(await t.json())}catch(t){}}function getAggregatedData(t){let e={};if(!t||"object"!=typeof t)return;let a=new Date(viewStartOodo),n=new Date(viewEndOodo);if(isNaN(a)||isNaN(n))return;let o=a.getFullYear(),r=a.getMonth()+1,d=n.getFullYear(),s=n.getMonth()+1;for(let a in t){if(!t[a])continue;let n=parseInt(a);for(let i in t[a]){let c=parseInt(i);if((n>o||n===o&&c>=r)&&(n<d||n===d&&c<=s))for(let n in t[a][i])e[n]=(e[n]||0)+t[a][i][n]}}targetGlobal=e}function updateByProChart(t,e){if(!window.byProChartInstance)return;let a=new Set,n={},o={};"Students & Target"===e?(a=new Set([...t.map((t=>getTagDisplayWon(t.tag_ids)||"Unknown")),...Object.keys(targetGlobal).filter((t=>!t.includes("Revenue")))]),a.forEach((t=>{n[t]=0,o[t]=0})),t.forEach((t=>{const e=getTagDisplayWon(t.tag_ids)||"Unknown";n[e]+=1})),a.forEach((t=>{o[t]=targetGlobal[t]||0}))):"Paid in time & Target"===e?(a=new Set([...t.map((t=>`${getTagDisplayWon(t.tag_ids)||"Unknown"} Revenue`)),...Object.keys(targetGlobal).filter((t=>t.includes("Revenue")))]),a.forEach((t=>{n[t]=0,o[t]=0})),t.forEach((t=>{const e=`${getTagDisplayWon(t.tag_ids)||"Unknown"} Revenue`;n[e]+=Number(t.amount_total_month)||0})),a.forEach((t=>{o[t]=targetGlobal[t]||0}))):"Expected Revenue"===e?(a=new Set([...t.map((t=>getTagDisplayWon(t.tag_ids)||"Unknown"))]),a.forEach((t=>{n[t]=0})),t.forEach((t=>{const e=getTagDisplayWon(t.tag_ids)||"Unknown";n[e]+=Number(t.amount_total_pre)||0})),o=null):"Total Paid"===e&&(a=new Set([...t.map((t=>getTagDisplayWon(t.tag_ids)||"Unknown"))]),a.forEach((t=>{n[t]=0})),t.forEach((t=>{const e=getTagDisplayWon(t.tag_ids)||"Unknown";n[e]+=Number(t.amount_total_signed)||0})),o=null),window.byProChartInstance.data.labels=Array.from(a),window.byProChartInstance.data.datasets=[{label:e,data:Object.values(n),backgroundColor:"rgba(255,169,0, 1)",borderColor:"rgba(255,169,0, 1)",borderWidth:1}],o&&window.byProChartInstance.data.datasets.push({label:"Target",data:Object.values(o),backgroundColor:"rgba(255, 99, 132, 1)",borderColor:"rgba(255, 99, 132, 1)",borderWidth:1}),window.byProChartInstance.update()}function drawByProChart(t){const e=document.getElementById("wonbyProgramChart").getContext("2d");window.byProChartInstance&&window.byProChartInstance.destroy(),window.byProChartInstance=new Chart(e,{type:"bar",data:{labels:[],datasets:[]},options:{responsive:!0,maintainAspectRatio:!1,borderRadius:5,plugins:{legend:{display:!1},tooltip:{enabled:!0},datalabels:{anchor:"end",align:"top",color:"#7c7c7c",font:{size:13,weight:"bold"},formatter:t=>formatCurrencyText(t)}},scales:{x:{ticks:{font:{size:13}}},y:{beginAtZero:!0,ticks:{font:{size:13},callback:function(t){return formatCurrencyText(t)}},afterDataLimits:t=>{t.max*=1.1}}}},plugins:[ChartDataLabels]}),updateByProChart(t,"Students & Target")}function updateExpectTableFooter(t){const e=document.querySelector("#expected_table.table.oodo");let a=document.querySelector("#expected_table.table.oodo tfoot");a&&a.remove();let n=0;n=t.length;const{totalMonth:o}=t.reduce(((t,e)=>(t.totalMonth+=e.expected_revenue||0,t)),{totalMonth:0}),r=document.createElement("tfoot");r.innerHTML=`\n      <tr>\n        <td style="text-align:center" colspan="3"><strong>TOTAL ${n} ROW</strong></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td ></td>\n        <td><strong>${formatCurrency(o)}</strong></td>\n       <td ></td>\n      <td ></td>\n       <td ></td>\n        <td ></td>\n        <td ></td>\n        <td colspan="3"></td>\n      </tr>\n    `,e.appendChild(r)}function processAndRenderLeads(t){const e={};t.forEach((({user_id:t,tag_ids:a})=>{const n=t?t[1]:"Khác";if(!saleteam.includes(n))return;let o=e[n]??={total:0,Needed:0,"Status - New":0,"Bad-Timing":0,Unqualified:0,Junk:0};if(o.total++,Array.isArray(a)){let t=new Set(a);t.has(129)||t.has(170)?o.Needed++:t.has(126)?o["Status - New"]++:t.has(127)?o["Bad-Timing"]++:t.has(154)?o.Unqualified++:t.has(128)&&o.Junk++}})),salesDataGlobal=e,renderChart(e),renderUloodo(e,saleteam[0]),calculateTotalSalesData(e)}function renderProgressBar(t){const e=document.querySelector("#progressBar"),a=document.querySelector(".progess_label"),n=document.querySelector(".oodo_total");e.replaceChildren(),a.replaceChildren();let o=Object.values(t).reduce(((t,e)=>t+e),0);if(n.innerText=o,0===o)return;let r=document.createDocumentFragment(),d=document.createDocumentFragment();Object.entries(t).forEach((([t,e])=>{if(0===e)return;const a=(e/o*100).toFixed(1),n=makeColor(t);let s=document.createElement("p");s.classList.add("segment"),s.style=`width:${a}%; background:${n}`,r.appendChild(s);let i=document.createElement("p");i.innerHTML=`<span style="background: ${n}"></span>${t}: <b>${e} (${a}%)</b>`,d.appendChild(i)})),e.appendChild(r),a.appendChild(d)}function calculateTotalSalesData(t){const e={Needed:0,"Status - New":0,"Bad-Timing":0,Unqualified:0,Junk:0};Object.values(t).forEach((t=>{e.Needed+=t.Needed||0,e["Status - New"]+=t["Status - New"]||0,e["Bad-Timing"]+=t["Bad-Timing"]||0,e.Unqualified+=t.Unqualified||0,e.Junk+=t.Junk||0})),renderProgressBar(e)}let reachChartInstanceOodo=null;function renderChart(t){null!==reachChartInstanceOodo&&reachChartInstanceOodo.destroy();const e=Object.keys(t),a=e.map((t=>{const e=t.split(" ");return e[e.length-1]})),n=e.map((e=>t[e].total)),o=e.map((e=>t[e].Needed)),r=document.getElementById("leadChart").getContext("2d");reachChartInstanceOodo=new Chart(r,{type:"bar",data:{labels:a,datasets:[{label:"Total Lead",data:n,backgroundColor:"rgba(255, 171, 0,1)",borderWidth:1},{label:"Needed",data:o,backgroundColor:"rgba(255, 99, 132, 1)",borderWidth:1}]},options:{plugins:{legend:{display:!0},tooltip:{enabled:!0},datalabels:{anchor:"end",align:"top",color:"#7c7c7c",font:{size:11,weight:"bold"},formatter:t=>t}},responsive:!0,scales:{y:{beginAtZero:!0,ticks:{font:{size:9}},afterDataLimits:t=>{t.max*=1.15}}}},plugins:[ChartDataLabels]})}const expected_table_block=document.querySelector(".expected_table");let startFetch="",endFetch="";async function main(){if(loading.classList.add("acitve"),startFetch!==startDate||endFetch!==endDate){startFetch=startDate,endFetch=endDate;try{await ensureLogin();const[t,{wonLeads:e,specialLeads:a},n]=await Promise.all([fetchLeads(),fetchWonLeadsThisYear(),processUnpaidInvoices(),fetchLeadsAndUpdateChart()]);t&&t.length?processAndRenderLeads(t):processAndRenderLeads([]),e&&e.length?(wonLeadsGlobal=e,renderWon(e),drawByProChart(e)):renderWon([]),expected_table_block.style.display=a?.length?"block":"none",a?.length&&renderExpected(a)}catch(t){}}}function getRound(t,e,a){return"Form"===t&&"Facebook IDEAS"===e&&"FB Ads"===a?"Vòng Form":"Mess/Web/Hotline"}function formatTagName(t){return t?t.toLowerCase().replace(/\s*-\s*/g,"_").replace(/\s+/g,"_"):""}function getTagDisplay(t){if(!t||0===t.length)return"";if(t.includes(129)||t.includes(170))return"Needed";for(let e of t)if(tagName[e])return tagName[e];return""}function getTagDisplayWon(t){if(!t||0===t.length)return"No tag";for(let e of t)if(tagWon[e])return tagWon[e];return"Unknow Tag"}function getTagDisplayNeeded(t){return t.includes(129)||t.includes(170)?"Needed":null}function filterTable(t){const e=document.querySelectorAll("table.table.oodo tbody tr");let a=[];e.forEach((e=>{const n=e.children[5].textContent.trim().toLowerCase(),o=normalizeVietnamese(e.children[9].textContent.trim().toLowerCase()),r=e.children[2].textContent.trim().toLowerCase(),d=normalizeVietnamese(e.children[4].textContent.trim().toLowerCase());o.includes(t)||r.includes(t)||d.includes(t)||n.includes(t)?(e.style.display="",a.push({amount_total_month:formatCurrencyToNumber(e.children[6].textContent)||0,amount_total_signed:formatCurrencyToNumber(e.children[7].textContent)||0,amount_total_pre:formatCurrencyToNumber(e.children[8].textContent)||0})):e.style.display="none"})),updateTableFooter(a)}function formatDateRange(t){if(!t)return[];const e=t.split(" - ").map((t=>{const[e,a,n]=t.split("/");return`${n}-${a}-${e}`})),a=e[0];return[[["create_date",">=",a],["create_date","<=",e[1]||a]]]}function formatNextRange(t){if(!t)return[];const e=t.split(" - ").map((t=>{const[e,a,n]=t.split("/");return`${n}-${a}-${e}`})),a=e[0];let n=e[1];if(!n||(new Date(n)-new Date(a))/864e5<26){const[t,e]=a.split("-");n=new Date(t,parseInt(e),0).toISOString().split("T")[0]}return startInvoiceDate=a,endInvoiceDate=n,[[["invoice_date",">=",a],["invoice_date","<=",n],["state","=","posted"],["payment_state","=","not_paid"]]]}function formatDateRangeWon(t){if(!t)return[];const e=t.split(" - ").map((t=>{const[e,a,n]=t.split("/");return`${n}-${a}-${e}`})),a=e[0],n=e[1]||a;return viewStartOodo=a,viewEndOodo=n,[[["date_last_stage_update",">=",a],["date_last_stage_update","<=",n],["stage_id","in",[4,6,13]]]]}function normalizeVietnamese(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D")}function formatCurrencyToNumber(t){return parseFloat(t.replace(/\,/g,"").replace("đ","").trim())}const dom_block_invoice=document.querySelector(".dom_block.invoice_table"),dom_block_main_odoo=document.querySelector(".dom_block.main_odoo"),dom_show_chartbtns=document.querySelectorAll(".dom_show_chartbtns.invoice_table p"),dom_show_chartbtnsMain=document.querySelectorAll(".dom_show_chartbtns.main_odoo p");dom_show_chartbtns.forEach(((t,e)=>{t.addEventListener("click",(()=>{setActiveOnly(t,".dom_show_chartbtns.invoice_table p.active"),0===e?dom_block_invoice.classList.remove("chartshow"):dom_block_invoice.classList.add("chartshow")}))})),dom_show_chartbtnsMain.forEach(((t,e)=>{t.addEventListener("click",(()=>{setActiveOnly(t,".dom_show_chartbtns.main_odoo p.active"),0===e?dom_block_main_odoo.classList.remove("chartshow"):dom_block_main_odoo.classList.add("chartshow")}))}));
