const saleteam = [
  "Lưu Phan Hoàng Phúc",
  "Nguyễn Thị Linh Đan",
  "Lê Đinh Ý Nhi",
  "Mai Thị Nữ",
  "Nguyễn Thị Hà Miên",
];
const saleAvatar = {
  "Lưu Phan Hoàng Phúc": "./DOM-img/phuc.jpg",
  "Nguyễn Thị Linh Đan": "./DOM-img/dan.jpg",
  "Lê Đinh Ý Nhi": "./DOM-img/ynhi.jpg",
  "Mai Thị Nữ": "./DOM-img/nu.jpg",
  "Nguyễn Thị Hà Miên": "./DOM-img/hamien.png",
};
const tagName = {
  126: "Status - New",
  127: "Bad-timing",
  128: "Junk",
  129: "Qualified",
  154: "Unqualified",
  170: "Needed",
};
const tagWon = {
  96: "DBA",
  143: "EMBA UMEF",
  155: "SBS",
  156: "ASC",
  201: "MBA UMEF",
  203: "BBA",
  206: "MSc AI",
};
let viewStartOodo = null;
let viewEndOodo = null;
let wonLeadsGlobal = [];
let targetGlobal = [];
const sale_switch = document.querySelectorAll(".sale_switch");
const PROXY = "https://ideas.edu.vn/proxy.php";
let loginPromise = loginOdoo(); // Gọi login ngay từ lúc vào trang
let fisrtFetch = false;
async function ensureLogin() {
  loading.classList.add("active");
  await loginPromise;
  loading.classList.remove("active");
}

async function loginOdoo() {
  const response = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "/web/session/authenticate",
      data: {
        jsonrpc: "2.0",
        params: {
          db: "IBM_Prod",
          login: "numt@ideas.edu.vn",
          password: "1",
        },
      },
    }),
  });

  const data = await response.json();

  if (data.result && data.result.uid) {
    console.log("Đăng nhập thành công!");
    return data.result;
  } else {
    console.error("Đăng nhập thất bại:", data);
    throw new Error("Login failed!");
  }
}
let startInvoiceDate;
let endInvoiceDate;
let targetData;
function getDateFilter(type) {
  let startDate, endDate;

  if (startDateGlobal && endDateGlobal) {
    startDate = startDateGlobal;
    endDate = endDateGlobal;
  } else {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  }

  // Nếu type là "next", kiểm tra khoảng cách giữa startDate và endDate
  if (type === "next" && startDate && endDate) {
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffDays = Math.ceil((endObj - startObj) / 86400000); // Tính số ngày giữa 2 mốc

    if (diffDays < 26) {
      // Lấy ngày cuối tháng theo GMT+7
      const lastDay = new Date(
        startObj.getFullYear(),
        startObj.getMonth() + 1,
        0
      );
      lastDay.setHours(7, 0, 0, 0);
      endDate = lastDay.toISOString().split("T")[0];
    }

    startInvoiceDate = startDate;
    endInvoiceDate = endDate;
  }
  console.log(startInvoiceDate, endInvoiceDate);

  const filters = {
    default: [
      ["create_date", ">=", startDate],
      ["create_date", "<=", endDate],
    ],
    next: [
      ["invoice_date_due", ">=", startDate],
      ["invoice_date_due", "<=", endDate],
      ["state", "=", "posted"],
      ["payment_state", "=", "not_paid"],
    ],
    won: [
      ["date_last_stage_update", ">=", startDate],
      ["date_last_stage_update", "<=", endDate],
      ["stage_id", "in", [4, 6]],
    ],
  };

  return [filters[type] || filters.default];
}

function checkDateTime(type) {
  if (date_preset) {
    const formattedDate = getFormattedDateRange(date_preset);
    if (type === "next") return formatNextRange(formattedDate);
    if (type === "won") return formatDateRangeWon(formattedDate);
    return formatDateRange(formattedDate);
  } else if (startDateGlobal && endDateGlobal) {
    return getDateFilter(type);
  }
  return [];
}

async function fetchWonLeadsThisYear() {
  try {
    const response = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/web/dataset/call_kw",
        data: {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model: "crm.lead",
            method: "search_read",
            args: checkDateTime("won"),
            kwargs: {
              fields: [
                "name",
                "create_date",
                "contact_name",
                "partner_id",
                "tag_ids",
                "user_id",
                "medium_id",
                "source_id",
                "campaign_id",
                "date_last_stage_update",
                "stage_id",
                "expected_revenue",
                "probability",
              ],
              limit: 0,
            },
          },
        },
      }),
    });

    const data = await response.json();
    if (!data.result || !Array.isArray(data.result)) {
      throw new Error("Không có dữ liệu hoặc lỗi API.");
    }

    // Lọc lead đã won & đếm số lượng theo tháng
    const monthlyWonCounts = new Uint8Array(12);
    const wonLeads = [];
    const partnerIds = new Set();

    for (const lead of data.result) {
      if (lead.stage_id?.[0] === 4) {
        wonLeads.push(lead);
        const month = new Date(lead.date_last_stage_update).getMonth();
        monthlyWonCounts[month]++;
      }
      if (lead.partner_id[0]) partnerIds.add(lead.partner_id[0]);
    }

    // Chạy fetch hóa đơn song song với vẽ biểu đồ
    const invoicePromise = fetchInvoicesByLeadIds([...partnerIds], data.result);

    drawWonLeadsChart(monthlyWonCounts);

    return await invoicePromise; // Đợi fetch hóa đơn xong
  } catch (error) {
    console.error("Lỗi khi fetch lead:", error);
    return [];
  }
}
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .split("T")[0];
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  .toISOString()
  .split("T")[0];
// TÍNH LẠI
// 🟢 HÀM 1: Lấy danh sách partner_id từ hóa đơn chưa thanh toán trong tháng
async function fetchUnpaidInvoicesThisMonth() {
  try {
    const response = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/web/dataset/call_kw",
        data: {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model: "account.move",
            method: "search_read",
            args: checkDateTime("next"),
            kwargs: {
              fields: ["partner_id"],
              order: "invoice_date asc",
            },
          },
        },
      }),
    });

    const data = await response.json();
    const allInvoices = data.result || [];
    console.log(allInvoices);
    // Lấy danh sách partner_id duy nhất
    const partnerIds = [
      ...new Set(allInvoices.map((inv) => inv.partner_id?.[0]).filter(Boolean)),
    ];

    const { leads, newPartnerIds } = await fetchStudentsFromCRM(partnerIds);
    console.log(leads, newPartnerIds);

    const invoicePromise = await fetchInvoicesByLeadIds(newPartnerIds, leads);
    return invoicePromise;
  } catch (error) {
    console.error("Lỗi khi fetch hóa đơn chưa thanh toán:", error);
    return [];
  }
}

// 🟢 HÀM 2: Lấy danh sách học viên từ CRM theo partner_id
async function fetchStudentsFromCRM(partnerIds) {
  if (!partnerIds.length) return { leads: [], newPartnerIds: [] };

  try {
    const response = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/web/dataset/call_kw",
        data: {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model: "crm.lead",
            method: "search_read",
            args: [[["partner_id", "in", partnerIds]]],
            kwargs: {
              fields: [
                "name",
                "create_date",
                "contact_name",
                "partner_id",
                "tag_ids",
                "user_id",
                "medium_id",
                "source_id",
                "campaign_id",
                "date_last_stage_update",
                "stage_id",
                "expected_revenue",
                "probability",
              ],
              limit: 0,
            },
          },
        },
      }),
    });

    const data = await response.json();
    const leads = data.result || [];

    // Lấy danh sách partner_id mới từ leads
    const newPartnerIds = [
      ...new Set(leads.map((lead) => lead.partner_id?.[0]).filter(Boolean)),
    ];

    return { leads, newPartnerIds };
  } catch (error) {
    console.error("Lỗi khi fetch học viên từ CRM:", error);
    return { leads: [], newPartnerIds: [] };
  }
}

async function fetchInvoicesByLeadIds(leadIds, leads) {
  if (!leadIds.length) return leads;

  try {
    const response = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/web/dataset/call_kw",
        data: {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model: "account.move",
            method: "search_read",
            args: [
              [
                ["partner_id", "in", leadIds],
                ["move_type", "in", ["out_invoice", "out_refund"]],
                ["state", "=", "posted"],
              ],
            ],
            kwargs: {
              fields: [
                "partner_id",
                "invoice_date",
                "invoice_date_due",
                "amount_total_signed",
                "payment_state",
              ],
              order: "invoice_date asc",
            },
          },
        },
      }),
    });

    const data = await response.json();
    const allInvoices = data.result || [];

    const invoiceTotals = new Map(),
      invoicePreTotals = new Map(),
      invoiceMonthTotals = new Map(),
      invoiceNextPaid = new Map(),
      invoiceList = new Map(),
      unpaidInvoiceMap = new Map(),
      debtInvoiceMap = new Map();

    const startDate = new Date(viewStartOodo),
      endDate = new Date(viewEndOodo),
      startInvoiceDateObj = new Date(startInvoiceDate),
      endInvoiceDateObj = new Date(endInvoiceDate);

    allInvoices.forEach((inv) => {
      const partnerId = inv.partner_id?.[0];
      if (!partnerId) return;

      const invoiceDateDue = new Date(inv.invoice_date_due);
      const amount = inv.amount_total_signed;

      if (!invoiceList.has(partnerId)) invoiceList.set(partnerId, []);
      invoiceList.get(partnerId).push(inv);

      if (inv.payment_state !== "reversed") {
        invoicePreTotals.set(
          partnerId,
          (invoicePreTotals.get(partnerId) || 0) + amount
        );
      }
      if (inv.payment_state === "paid" || inv.payment_state === "in_payment") {
        invoiceTotals.set(
          partnerId,
          (invoiceTotals.get(partnerId) || 0) + amount
        );
        if (invoiceDateDue >= startDate && invoiceDateDue <= endDate) {
          invoiceMonthTotals.set(
            partnerId,
            (invoiceMonthTotals.get(partnerId) || 0) + amount
          );
        }
      } else if (inv.payment_state === "not_paid") {
        debtInvoiceMap.set(
          partnerId,
          (debtInvoiceMap.get(partnerId) || 0) + amount
        );
        if (
          invoiceDateDue >= startInvoiceDateObj &&
          invoiceDateDue <= endInvoiceDateObj
        ) {
          invoiceNextPaid.set(
            partnerId,
            (invoiceNextPaid.get(partnerId) || 0) + amount
          );

          if (!unpaidInvoiceMap.has(partnerId))
            unpaidInvoiceMap.set(partnerId, []);

          unpaidInvoiceMap.get(partnerId).push(inv);
        }
      }
    });

    const wonLeads = [],
      specialLeads = [];

    leads.forEach((lead) => {
      const partnerId = lead.partner_id?.[0];
      const invoices = invoiceList.get(partnerId) || [];
      const unpaidInvoices = unpaidInvoiceMap.get(partnerId) || [];

      lead.first_invoice = invoices.length
        ? invoices[0].invoice_date_due
        : null;

      if (unpaidInvoices.length) {
        let nextInvoiceDates = new Set(); // Dùng Set để tránh trùng ngày
        unpaidInvoices.forEach(({ invoice_date_due }) => {
          const invoiceDate = new Date(invoice_date_due);
          if (
            invoiceDate >= startInvoiceDateObj &&
            invoiceDate <= endInvoiceDateObj
          ) {
            nextInvoiceDates.add(invoice_date_due);
          }
        });

        lead.next_invoice = nextInvoiceDates.size
          ? Array.from(nextInvoiceDates).join(", ")
          : null;
      } else {
        lead.next_invoice = null;
      }

      if ([4, 6, 12].includes(lead.stage_id?.[0])) {
        lead.amount_total_signed = invoiceTotals.get(partnerId) || 0;
        lead.amount_total_pre = invoicePreTotals.get(partnerId) || 0;
        lead.amount_total_month = invoiceMonthTotals.get(partnerId) || 0;
        lead.amount_next = invoiceNextPaid.get(partnerId) || 0;
        lead.amount_debt = debtInvoiceMap.get(partnerId) || 0;
        lead.conversion_days =
          lead.first_invoice && lead.create_date
            ? Math.floor(
                (new Date(lead.first_invoice) - new Date(lead.create_date)) /
                  86400000
              )
            : null;

        wonLeads.push(lead);
      } else if (lead.stage_id?.[0] === 13) {
        lead.amount_total_signed = 0;
        lead.amount_total_pre = 0;
        lead.amount_total_month = 0;

        lead.conversion_days =
          lead.date_last_stage_update && lead.create_date
            ? Math.floor(
                (new Date(lead.date_last_stage_update) -
                  new Date(lead.create_date)) /
                  86400000
              )
            : null;

        specialLeads.push(lead);
      }
    });

    console.log("📌 Kết quả cuối cùng:", { wonLeads, specialLeads });
    return { wonLeads, specialLeads };
  } catch (error) {
    console.error("❌ Lỗi khi fetch hóa đơn:", error);
    return { wonLeads: [], specialLeads: [] };
  }
}

let wonChartInstance = null;
function drawWonLeadsChart(monthlyWonCounts) {
  const ctx = document.getElementById("wonChart").getContext("2d");

  // Xóa biểu đồ cũ nếu đã tồn tại
  if (window.wonChartInstance) {
    window.wonChartInstance.destroy();
  }

  // Tạo biểu đồ mới
  window.wonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets: [
        {
          label: "Leads Won",
          data: monthlyWonCounts,
          backgroundColor: "rgba(255, 171, 0,0.9)",
          borderColor: "rgba(255, 171, 0,1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      borderRadius: 5,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 11 },
          formatter: (value) => formatCurrencyText(value),
        },
      },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11 },
            callback: (value) => formatCurrencyText(value),
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
async function fetchLeads() {
  document.querySelector(".loading").classList.add("active");
  const response = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "/web/dataset/call_kw",
      data: {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "crm.lead",
          method: "search_read",
          args: checkDateTime("normal"),
          kwargs: {
            fields: ["tag_ids", "user_id"],
            limit: 0,
          },
        },
      },
    }),
  });

  const data = await response.json();
  console.log("Danh sách lead từ Odoo:", data);
  return data.result;
}
sale_switch.forEach((item, index) => {
  item.addEventListener("click", () => {
    renderUloodo(salesDataGlobal, saleteam[index]);
    setActiveOnly(item, ".sale_switch.active");
  });
});
function makeColor(value) {
  let color = "rgba(255, 99, 132, 1)";
  if (value == "Needed") {
    return color;
  } else if (value == "Status - New") {
    color = "rgb(255, 68, 0)";
  } else if (value == "Bad-Timing") {
    color = "rgb(108, 0, 86)";
  } else if (value == "Unqualified") {
    color = "rgb(229, 217, 0)";
  } else if (value == "Junk") {
    color = "rgb(0, 0, 0)";
  }
  return color;
}

function makeColorWon(value) {
  let color = "rgb(182, 0, 0)";
  if (value == "MSc AI") {
    color = "rgb(0, 80, 133)";
  } else if (value == "EMBA UMEF") {
    color = "rgb(0, 136, 146)";
  } else if (value == "ASC") {
    color = "rgb(184, 141, 0)";
  } else if (value == "SBS") {
    color = "rgb(255, 81, 0)";
  } else if (value == "MBA UMEF") {
    color = "rgb(255, 0, 0)";
  } else if (value == "DBA") {
    color = "rgb(196, 0, 153)";
  } else if (value == "BBA") {
    color = "rgb(5, 160, 0)";
  }
  return color;
}
function renderUloodo(salesData, name) {
  let data = salesData[name];
  const ulElement = document.querySelector(".dom_toplist.oodo"); // Phần tử danh sách trên UI
  if (data) {
    let sortedData = Object.entries(salesData[name]).sort(
      (a, b) => b[1] - a[1]
    );

    // Mảng chứa tên các tag
    let labels = sortedData.map(([key, _]) => key);

    // Mảng chứa số lượng tương ứng
    let values = sortedData.map(([_, value]) => value);

    console.log(labels); // ["total", "Needed", "Status - New", "Unqualified", "Junk", "Bad-Timing"]
    console.log(values); // [40, 23, 5, 5, 4, 3]

    ulElement.innerHTML = "";
    labels.forEach((item, index) => {
      if (index == 0) return;
      const li = document.createElement("li");
      li.innerHTML = `<p><span>${item}</span> <span>${
        values[index]
      }</span></p> <p> <span style="width: ${
        (values[index] * 100) / values[0]
      }%; background: ${makeColor(item)}"></span> </p>`;
      ulElement.appendChild(li);
    });
  } else {
    ulElement.innerHTML = "";
  }
  // Chuyển object thành mảng, rồi sắp xếp theo value giảm dần
}

function renderWon(leads) {
  console.log("Render WON", leads);

  // if (!leads || leads.length < 1) return;
  const tbody = document.querySelector(".table.oodo tbody");
  tbody.innerHTML = ""; // Xóa dữ liệu cũ

  // Sắp xếp theo ngày update stage (mới nhất trước)
  leads.sort(
    (a, b) =>
      new Date(b.date_last_stage_update) - new Date(a.date_last_stage_update)
  );

  leads.forEach((lead) => {
    const saleperson = lead.user_id ? lead.user_id[1] : "Khác";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(lead.date_last_stage_update) || ""}</td>
      <td>${formatDate(lead.create_date) || ""}</td>
      <td>${
        `${
          lead.conversion_days
            ? `${formatNumber(lead.conversion_days)} days`
            : "Unpaid"
        }` || ""
      }</td>
      <td> <span style="background: ${makeColorWon(
        getTagDisplayWon(lead.tag_ids)
      )}"></span>${getTagDisplayWon(lead.tag_ids) || ""}</td>
      <td>${lead.contact_name || ""}</td>
      <td>${lead.stage_id[1] || ""}</td>
      <td>${formatCurrency(lead.amount_total_month) || ""}</td>
      <td>${formatCurrency(lead.amount_total_signed) || ""}</td>
      <td>${formatCurrency(lead.amount_total_pre) || ""}</td>
      <td> <img src="${
        saleAvatar[saleperson]
      }"/> <span>${saleperson}</span></td>
      <td>${lead.source_id[1] || ""}</td>
      <td>${lead.campaign_id[1] || ""}</td>
      <td>${lead.medium_id[1] || ""}</td>
    `;
    tbody.appendChild(row);
  });
  document.querySelector(".loading").classList.remove("active");
  updateTableFooter(leads);
}
selecItemLead.addEventListener("click", (event) => {
  selecItemLead.classList.toggle("active");
  const clickedItem = event.target.closest("li");
  if (clickedItem && !clickedItem.classList.contains("active")) {
    setActiveOnly(clickedItem, ".dom_select_show.leadchart li.active");
    const dataView = clickedItem.dataset.view; // Lấy giá trị được chọn
    selecItemLeadText.textContent = dataView;
    const metric = clickedItem.dataset.view || "Paid in time";
    updateByProChart(wonLeadsGlobal, metric);
  }
});
function renderNextPaid(leads) {
  const tbody = document.querySelector("#invoice_table tbody");
  tbody.innerHTML = ""; // Xóa dữ liệu cũ

  // Sắp xếp theo ngày update stage (mới nhất trước)
  leads &&
    leads.sort((a, b) => {
      const dateA = new Date(a.next_invoice.split(", ")[0]); // Lấy ngày đầu tiên
      const dateB = new Date(b.next_invoice.split(", ")[0]);
      return dateA - dateB;
    });

  leads.forEach((lead) => {
    const saleperson = lead.user_id ? lead.user_id[1] : "Khác";
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${lead.contact_name || ""}</td>
      <td> <span style="background: ${makeColorWon(
        getTagDisplayWon(lead.tag_ids)
      )}"></span>${getTagDisplayWon(lead.tag_ids) || ""}</td>
      <td>${formatDate(lead.next_invoice) || ""}</td>
      <td>${formatCurrency(lead.amount_next) || ""}</td>
      <td>${formatCurrency(lead.amount_debt) || ""}</td>
      <td>${formatCurrency(lead.amount_total_signed) || ""}</td>
      <td>${formatCurrency(lead.amount_total_pre) || ""}</td>
      <td> <img src="${
        saleAvatar[saleperson]
      }"/> <span>${saleperson}</span></td>
      <td>${lead.source_id[1] || ""}</td>
      <td>${lead.campaign_id[1] || ""}</td>
      <td>${lead.medium_id[1] || ""}</td>
    `;
    tbody.appendChild(row);
  });
  updateNextInvoiceTableFooter(leads);
}
function renderExpected(leads) {
  const tbody = document.querySelector("#expected_table tbody");
  tbody.innerHTML = ""; // Xóa dữ liệu cũ

  // Sắp xếp theo ngày update stage (mới nhất trước)
  leads.sort(
    (a, b) =>
      new Date(b.date_last_stage_update) - new Date(a.date_last_stage_update)
  );

  leads.forEach((lead) => {
    const saleperson = lead.user_id ? lead.user_id[1] : "Khác";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(lead.date_last_stage_update) || ""}</td>
      <td>${formatDate(lead.create_date) || ""}</td>
      <td>${
        `${
          lead.conversion_days
            ? `${formatNumber(lead.conversion_days)} days`
            : "No Invoice"
        }` || ""
      }</td>
      <td> <span style="background: ${makeColorWon(
        getTagDisplayWon(lead.tag_ids)
      )}"></span>${getTagDisplayWon(lead.tag_ids) || ""}</td>
      <td>${lead.contact_name || ""}</td>
      <td>${lead.email_from || ""}</td>
      <td>${lead.phone || ""}</td>
      <td>${lead.stage_id[1] || ""}</td>
      <td>${formatCurrency(lead.expected_revenue) || ""}</td>
      <td>${lead.probability}%</td>
      <td>${formatCurrency(lead.amount_total_pre) || ""}</td>
      <td> <img src="${
        saleAvatar[saleperson]
      }"/> <span>${saleperson}</span></td>
      <td>${lead.source_id[1] || ""}</td>
      <td>${lead.campaign_id[1] || ""}</td>
      <td>${lead.medium_id[1] || ""}</td>
    `;
    tbody.appendChild(row);
  });
  updateExpectTableFooter(leads);
}
function updateTableFooter(leads) {
  const tableOodo = document.querySelector("#won_table.table.oodo");
  let oldTfoot = document.querySelector("#won_table.table.oodo tfoot");
  console.log(leads);

  // Xóa tfoot cũ nếu có
  if (oldTfoot) {
    oldTfoot.remove();
  }
  let totalLeads = 0;
  // Tính tổng số leads và tổng amount
  totalLeads = leads.length;
  const { totalAmount, totalPreAmount, totalMonth } = leads.reduce(
    (acc, lead) => {
      acc.totalAmount += lead.amount_total_signed * 1 || 0;
      acc.totalPreAmount += lead.amount_total_pre * 1 || 0;
      acc.totalMonth += lead.amount_total_month * 1 || 0;
      return acc;
    },
    { totalAmount: 0, totalPreAmount: 0, totalMonth: 0 }
  );

  // Tạo tfoot mới
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
      <tr>
        <td style="text-align:center" colspan="3"><strong>TOTAL ${totalLeads} ROW</strong></td>
        <td ></td>
        <td ></td>
        <td ></td>
        <td><strong>${formatCurrency(totalMonth)}</strong></td>
        <td><strong>${formatCurrency(totalAmount)}</strong></td>
        <td><strong>${formatCurrency(totalPreAmount)}</strong></td>
        <td ></td>
        <td colspan="3"></td>
      </tr>
    `;

  // Thêm vào bảng
  tableOodo.appendChild(tfoot);
}
function updateNextInvoiceTableFooter(leads) {
  const tableOodo = document.querySelector("#invoice_table");
  let oldTfoot = document.querySelector("#invoice_table tfoot");
  if (oldTfoot) oldTfoot.remove();

  totalLeads = leads.length;
  const { totalNext, totalPreAmount, totalPaid, totalDebt, programData } =
    leads.reduce(
      (acc, lead) => {
        acc.totalNext += lead.amount_next * 1 || 0;
        acc.totalDebt += lead.amount_debt * 1 || 0;
        acc.totalPreAmount += lead.amount_total_pre * 1 || 0;
        acc.totalPaid += lead.amount_total_signed * 1 || 0;

        // Gom nhóm tổng tiền Next Pay theo Program
        const program = getTagDisplayWon(lead.tag_ids) || "Unknown";
        acc.programData[program] =
          (acc.programData[program] || 0) + (lead.amount_next * 1 || 0);

        return acc;
      },
      {
        totalNext: 0,
        totalPreAmount: 0,
        totalDebt: 0,
        totalPaid: 0,
        programData: {},
      }
    );

  // Tạo tfoot mới
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
      <tr>
        <td style="text-align:center" colspan="3"><strong>TOTAL ${totalLeads} ROW</strong></td>
        <td><strong>${formatCurrency(totalNext)}</strong></td>
        <td><strong>${formatCurrency(totalDebt)}</strong></td>
        <td><strong>${formatCurrency(totalPaid)}</strong></td>
        <td><strong>${formatCurrency(totalPreAmount)}</strong></td>
        <td ></td>
        <td ></td>
        <td ></td>
        <td colspan="3"></td>
      </tr>
    `;
  tableOodo.appendChild(tfoot);

  // Gọi hàm vẽ biểu đồ
  drawNextPayChart(programData);
}

// Hàm vẽ biểu đồ Next Pay
let nextChartInstance = null;
let byProChartInstance = null;
function drawNextPayChart(programData) {
  const ctx = document.getElementById("nextChart").getContext("2d");

  // Xóa chart cũ nếu có
  if (window.nextChartInstance) {
    window.nextChartInstance.destroy();
  }

  // Tạo dataset cho biểu đồ
  window.nextChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(programData),
      datasets: [
        {
          label: "Next Pay (VND)",
          data: Object.values(programData),
          backgroundColor: "#ffab00",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      borderRadius: 5,
      plugins: {
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 13 },
          formatter: (value) => formatCurrencyText(value),
        },
      },
      scales: {
        x: { ticks: { font: { size: 13 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 13 },
            callback: function (value) {
              return formatCurrencyText(value);
            },
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
      barPercentage: 0.7, // Kích thước cột nhỏ lại (0.1 - 1)
    },
    plugins: [ChartDataLabels],
  });
}

async function fetchLeadsAndUpdateChart() {
  if (!targetData) {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzOoN0I6voxC84bBc6oKm6RIRVE_SrZ18x2HoufC2UgiOhyjXHYCatMe37j8_sZaey-SQ/exec"
      );

      if (!response.ok) throw new Error("Lỗi khi lấy dữ liệu");

      const data = await response.json(); // Parse JSON từ API
      targetData = data;
      getAggregatedData(data);
    } catch (error) {
      console.error("Lỗi khi fetch dữ liệu:", error);
    }
  } else {
    getAggregatedData(targetData);
  }
}
function getAggregatedData(data) {
  let targetRange = {};

  if (!data || typeof data !== "object") {
    return;
  }

  let startDate = new Date(viewStartOodo);
  let endDate = new Date(viewEndOodo);

  if (isNaN(startDate) || isNaN(endDate)) {
    return;
  }

  let startYear = startDate.getFullYear();
  let startMonth = startDate.getMonth() + 1;
  let endYear = endDate.getFullYear();
  let endMonth = endDate.getMonth() + 1;

  for (let year in data) {
    if (!data[year]) continue;
    let y = parseInt(year);

    for (let month in data[year]) {
      let m = parseInt(month);

      if (
        (y > startYear || (y === startYear && m >= startMonth)) &&
        (y < endYear || (y === endYear && m <= endMonth))
      ) {
        for (let key in data[year][month]) {
          targetRange[key] =
            (targetRange[key] || 0) * 1 + data[year][month][key] * 1;
        }
      }
    }
  }
  targetGlobal = targetRange;
  console.log("Dữ liệu tổng hợp:", targetGlobal);
}

function updateByProChart(leads, metric) {
  if (!window.byProChartInstance) return; // Nếu chưa có biểu đồ thì thoát luôn

  console.log("View Start:", viewStartOodo, "View End:", viewEndOodo);

  let allLabels = new Set(); // Danh sách labels của biểu đồ
  let programData = {}; // Dữ liệu thực tế từ leads
  let secondDataset = {}; // Dữ liệu từ targetGlobal

  // Lấy danh sách labels & xử lý dữ liệu
  if (metric === "Students") {
    allLabels = new Set([
      ...leads.map((lead) => getTagDisplayWon(lead.tag_ids) || "Unknown"),
      ...Object.keys(targetGlobal).filter(
        (key) => !key.toLowerCase().includes("revenue")
      ),
    ]);

    // Loại bỏ giá trị rỗng
    allLabels = new Set([...allLabels].filter((label) => label.trim() !== ""));

    allLabels.forEach((program) => {
      programData[program] = 0;
      secondDataset[program] = 0;
    });

    leads.forEach((lead) => {
      const program = getTagDisplayWon(lead.tag_ids) || "Unknown";
      programData[program] += 1;
    });

    allLabels.forEach((program) => {
      secondDataset[program] = targetGlobal[program] || 0;
    });
  } else if (metric === "Paid in time") {
    allLabels = new Set([
      ...leads.map(
        (lead) => `${getTagDisplayWon(lead.tag_ids) || "Unknown"} Revenue`
      ),
      ...Object.keys(targetGlobal).filter((key) => key.includes("Revenue")),
    ]);

    // Loại bỏ giá trị rỗng
    allLabels = new Set([...allLabels].filter((label) => label.trim() !== ""));

    allLabels.forEach((revenue) => {
      programData[revenue] = 0;
      secondDataset[revenue] = 0;
    });

    leads.forEach((lead) => {
      const revenue = `${getTagDisplayWon(lead.tag_ids) || "Unknown"} Revenue`;
      programData[revenue] += Number(lead.amount_total_month) || 0;
    });

    allLabels.forEach((revenue) => {
      secondDataset[revenue] = targetGlobal[revenue] || 0;
    });
  } else if (metric === "Expected Revenue") {
    allLabels = new Set([
      ...leads.map((lead) => getTagDisplayWon(lead.tag_ids) || "Unknown"),
    ]);

    allLabels.forEach((program) => {
      programData[program] = 0;
    });

    leads.forEach((lead) => {
      const program = getTagDisplayWon(lead.tag_ids) || "Unknown";
      programData[program] += Number(lead.amount_total_pre) || 0;
    });

    secondDataset = null;
  } else if (metric === "Total Paid") {
    allLabels = new Set([
      ...leads.map((lead) => getTagDisplayWon(lead.tag_ids) || "Unknown"),
    ]);

    allLabels.forEach((program) => {
      programData[program] = 0;
    });

    leads.forEach((lead) => {
      const program = getTagDisplayWon(lead.tag_ids) || "Unknown";
      programData[program] += Number(lead.amount_total_signed) || 0;
    });

    secondDataset = null;
  }

  // Debug log để kiểm tra labels & data
  console.log("All Labels:", allLabels);
  console.log("Program Data:", programData);
  console.log("Second Dataset:", secondDataset);

  // Cập nhật dataset của biểu đồ
  window.byProChartInstance.data.labels = Array.from(allLabels);
  window.byProChartInstance.data.datasets = [
    {
      label: metric,
      data: Object.values(programData),
      backgroundColor: "rgba(255,169,0, 1)", // Màu cam
      borderColor: "rgba(255,169,0, 1)",
      borderWidth: 1,
    },
  ];

  // Nếu có targetGlobal thì thêm dataset thứ 2
  if (secondDataset && Object.keys(secondDataset).length) {
    window.byProChartInstance.data.datasets.push({
      label: "Target",
      data: Object.values(secondDataset),
      backgroundColor: "rgba(255, 99, 132, 1)", // Màu đỏ
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 1,
    });
  }

  // Cập nhật lại biểu đồ
  window.byProChartInstance.update();
}
// Khi click vào <li> thì cập nhật biểu đồ theo tiêu chí được chọn

function drawByProChart(leads) {
  const ctx = document.getElementById("wonbyProgramChart").getContext("2d");

  // Xóa biểu đồ cũ nếu có
  if (window.byProChartInstance) {
    window.byProChartInstance.destroy();
  }

  // Khởi tạo biểu đồ trống trước, tránh lỗi
  window.byProChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      borderRadius: 5,
      plugins: {
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 13 },
          formatter: (value) => formatCurrencyText(value),
        },
      },
      scales: {
        x: { ticks: { font: { size: 13 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 13 },
            callback: function (value) {
              return formatCurrencyText(value);
            },
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });

  updateByProChart(leads, selecItemLeadText.textContent);
}

function updateExpectTableFooter(leads) {
  const tableOodo = document.querySelector("#expected_table.table.oodo");
  let oldTfoot = document.querySelector("#expected_table.table.oodo tfoot");
  // Xóa tfoot cũ nếu có
  if (oldTfoot) {
    oldTfoot.remove();
  }
  let totalLeads = 0;
  // Tính tổng số leads và tổng amount
  totalLeads = leads.length;
  const { totalMonth } = leads.reduce(
    (acc, lead) => {
      acc.totalMonth += lead.expected_revenue || 0;
      return acc;
    },
    { totalMonth: 0 }
  );

  // Tạo tfoot mới
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
      <tr>
        <td style="text-align:center" colspan="3"><strong>TOTAL ${totalLeads} ROW</strong></td>
        <td ></td>
        <td ></td>
        <td ></td>
        <td ></td>
        <td ></td>
        <td><strong>${formatCurrency(totalMonth)}</strong></td>
       <td ></td>
      <td ></td>
       <td ></td>
        <td ></td>
        <td ></td>
        <td colspan="3"></td>
      </tr>
    `;

  // Thêm vào bảng
  tableOodo.appendChild(tfoot);
}
function processAndRenderLeads(leads) {
  const salesData = {};

  leads.forEach(({ user_id, tag_ids }) => {
    const saleperson = user_id ? user_id[1] : "Khác";
    if (!saleteam.includes(saleperson)) return;

    let data = (salesData[saleperson] ??= {
      total: 0,
      Needed: 0,
      "Status - New": 0,
      "Bad-Timing": 0,
      Unqualified: 0,
      Junk: 0,
    });

    data.total++;

    if (Array.isArray(tag_ids)) {
      let tagSet = new Set(tag_ids); // Dùng Set để kiểm tra nhanh hơn

      if (tagSet.has(129) || tagSet.has(170)) data.Needed++;
      else if (tagSet.has(126)) data["Status - New"]++;
      else if (tagSet.has(127)) data["Bad-Timing"]++;
      else if (tagSet.has(154)) data.Unqualified++;
      else if (tagSet.has(128)) data.Junk++;
    }
  });
  salesDataGlobal = salesData;
  renderChart(salesData);
  renderUloodo(salesData, saleteam[0]);
  calculateTotalSalesData(salesData);
}

function renderProgressBar(totalData) {
  const progressBar = document.querySelector("#progressBar");
  const progressLabel = document.querySelector(".progess_label");
  const oodo_total = document.querySelector(".oodo_total");

  progressBar.replaceChildren(); // Xóa nhanh hơn innerHTML = ""
  progressLabel.replaceChildren();

  let total = totalData.length
  oodo_total.innerText = total;

  if (total === 0) return;

  let fragmentBar = document.createDocumentFragment();
  let fragmentLabel = document.createDocumentFragment();

  Object.entries(totalData).forEach(([key, value]) => {
    if (value === 0) return;

    const percentage = ((value / total) * 100).toFixed(1);
    const color = makeColor(key);

    let segment = document.createElement("p");
    segment.classList.add("segment");
    segment.style = `width:${percentage}%; background:${color}`;
    fragmentBar.appendChild(segment);

    let label = document.createElement("p");
    label.innerHTML = `<span style="background: ${color}"></span>${key}: <b>${value} (${percentage}%)</b>`;
    fragmentLabel.appendChild(label);
  });

  progressBar.appendChild(fragmentBar);
  progressLabel.appendChild(fragmentLabel);
}

function calculateTotalSalesData(salesData) {
  const totalData = {
    Needed: 0,
    "Status - New": 0,
    "Bad-Timing": 0,
    Unqualified: 0,
    Junk: 0,
  };

  Object.values(salesData).forEach((personData) => {
    totalData.Needed += personData.Needed || 0;
    totalData["Status - New"] += personData["Status - New"] || 0;
    totalData["Bad-Timing"] += personData["Bad-Timing"] || 0;
    totalData.Unqualified += personData.Unqualified || 0;
    totalData.Junk += personData.Junk || 0;
  });
  renderProgressBar(totalData);
}
let reachChartInstanceOodo = null;
function renderChart(salesData) {
  if (reachChartInstanceOodo !== null) {
    reachChartInstanceOodo.destroy();
  }

  const labels = Object.keys(salesData);
  const renderLabel = labels.map((fullName) => {
    const nameParts = fullName.split(" "); // Cắt chuỗi theo dấu cách
    return nameParts[nameParts.length - 1]; // Lấy phần tử cuối (tên)
  });

  // Gán labels cho renderLabel
  const totalLeads = labels.map((name) => salesData[name].total);
  const neededLeads = labels.map((name) => salesData[name].Needed);

  const ctx = document.getElementById("leadChart").getContext("2d");
  reachChartInstanceOodo = new Chart(ctx, {
    type: "bar",
    data: {
      labels: renderLabel,
      datasets: [
        {
          label: "Total Lead",
          data: totalLeads,
          backgroundColor: "rgba(255, 171, 0,1)",
        },
        {
          label: "Needed",
          data: neededLeads,
          backgroundColor: "rgba(255, 99, 132, 1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      borderRadius: 5,
      plugins: {
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 13 },
          formatter: (value) => formatCurrencyText(value),
        },
      },
      scales: {
        x: { ticks: { font: { size: 13 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 13 },
            callback: function (value) {
              return formatCurrencyText(value);
            },
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
const expected_table_block = document.querySelector(".expected_table");
let startFetch = "";
let endFetch = "";
async function main() {
  if (startFetch === startDate && endFetch === endDate) return;
  startFetch = startDate;
  endFetch = endDate;

  try {
    await ensureLogin(); // Đảm bảo đã login trước khi fetch data

    // Fetch dữ liệu quan trọng trước
    const [leads, { wonLeads, specialLeads }] = await Promise.all([
      fetchLeads(),
      fetchWonLeadsThisYear(),
      fetchLeadsAndUpdateChart(),
    ]);

    // Xử lý ngay khi có data
    if (leads?.length) {
      processAndRenderLeads(leads);
    } else {
      processAndRenderLeads([]);
    }

    if (wonLeads?.length) {
      wonLeadsGlobal = wonLeads;
      renderWon(wonLeads);
      drawByProChart(wonLeads);
    } else {
      renderWon([]);
      drawByProChart([]);
    }

    expected_table_block.style.display = specialLeads?.length
      ? "block"
      : "none";
    if (specialLeads?.length) renderExpected(specialLeads);

    // Fetch tiếp invoice mà không delay dữ liệu quan trọng
    const invoucenp = await processUnpaidInvoices();
    if (invoucenp) console.log(invoucenp);
  } catch (error) {
    console.error("Lỗi xảy ra:", error);
  }
}
async function processUnpaidInvoices() {
  const { wonLeads } = await fetchUnpaidInvoicesThisMonth();
  renderNextPaid(wonLeads);
}
function getRound(medium, source, campaign) {
  if (
    medium === "Form" &&
    source === "Facebook IDEAS" &&
    campaign === "FB Ads"
  ) {
    return "Vòng Form";
  }
  return "Mess/Web/Hotline";
}

function formatTagName(tag) {
  if (!tag) return ""; // Nếu không có tag, trả về chuỗi rỗng
  return tag
    .toLowerCase()
    .replace(/\s*-\s*/g, "_")
    .replace(/\s+/g, "_");
}

function getTagDisplay(tags) {
  if (!tags || tags.length === 0) return ""; // Không có tag thì để trống

  if (tags.includes(129) || tags.includes(170)) {
    return "Needed"; // Nếu có 129 hoặc 170 thì luôn hiển thị "Needed"
  }

  for (let tag of tags) {
    if (tagName[tag]) return tagName[tag]; // Lấy tag đầu tiên tìm thấy trong danh sách
  }

  return ""; // Nếu không có tag hợp lệ thì để trống
}
function getTagDisplayWon(tags) {
  if (!tags || tags.length === 0) return "No tag"; // Không có tag thì để trống
  for (let tag of tags) {
    if (tagWon[tag]) return tagWon[tag]; // Lấy tag đầu tiên tìm thấy trong danh sách
  }

  return "Unknow Tag"; // Nếu không có tag hợp lệ thì để trống
}

function getTagDisplayNeeded(tags) {
  return tags.includes(129) || tags.includes(170) ? "Needed" : null;
}

function filterTable(searchValue) {
  const rows = document.querySelectorAll("table.table.oodo tbody tr"); // Lấy tất cả hàng trong bảng
  console.log(searchValue);

  let filteredLeads = [];
  rows.forEach((row) => {
    const payment = row.children[5].textContent.trim().toLowerCase();
    const saleperson = normalizeVietnamese(
      row.children[9].textContent.trim().toLowerCase()
    );
    const program = row.children[2].textContent.trim().toLowerCase();
    const name = normalizeVietnamese(
      row.children[4].textContent.trim().toLowerCase()
    );

    if (
      saleperson.includes(searchValue) ||
      program.includes(searchValue) ||
      name.includes(searchValue) ||
      payment.includes(searchValue)
    ) {
      row.style.display = "";
      // Lưu lại dữ liệu của hàng này để cập nhật tfoot
      filteredLeads.push({
        amount_total_month:
          formatCurrencyToNumber(row.children[6].textContent) || 0, // Cột Amount (cột thứ 8)
        amount_total_signed:
          formatCurrencyToNumber(row.children[7].textContent) || 0, // Cột Amount (cột thứ 8)
        amount_total_pre:
          formatCurrencyToNumber(row.children[8].textContent) || 0, // Cột Amount (cột thứ 9)
      });
    } else {
      row.style.display = "none";
    }
  });
  console.log(filteredLeads);

  updateTableFooter(filteredLeads);
}

function formatDateRange(dateRangeStr) {
  if (!dateRangeStr) return [];

  const dates = dateRangeStr.split(" - ").map((dateStr) => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  });

  // Nếu chỉ có 1 ngày thì gán start = end
  const start = dates[0];
  const end = dates[1] || start; // Nếu không có ngày kết thúc thì dùng ngày bắt đầu

  return [
    [
      ["create_date", ">=", start],
      ["create_date", "<=", end],
    ],
  ];
}
function formatNextRange(dateRangeStr) {
  if (!dateRangeStr) return [];

  const dates = dateRangeStr.split(" - ").map((dateStr) => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  });

  const start = dates[0];
  let end = dates[1];

  // Nếu không có ngày kết thúc hoặc khoảng cách < 26 ngày, lấy ngày cuối tháng của start
  if (!end || (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) < 26) {
    const [year, month] = start.split("-");

    // Lấy ngày cuối tháng của `start`
    const lastDay = new Date(year, parseInt(month), 0);
    lastDay.setHours(7, 0, 0, 0); // Đặt giờ về GMT+7 để tránh lệch ngày

    end = lastDay.toISOString().split("T")[0];
  }

  startInvoiceDate = start;
  endInvoiceDate = end;

  return [
    [
      ["invoice_date_due", ">=", start],
      ["invoice_date_due", "<=", end], // Giờ chuẩn ngày cuối tháng nếu cần
      ["state", "=", "posted"],
      ["payment_state", "=", "not_paid"],
    ],
  ];
}

function formatDateRangeWon(dateRangeStr) {
  if (!dateRangeStr) return [];

  const dates = dateRangeStr.split(" - ").map((dateStr) => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  });

  // Nếu chỉ có 1 ngày thì gán start = end
  const start = dates[0];
  const end = dates[1] || start; // Nếu không có ngày kết thúc thì dùng ngày bắt đầu
  viewStartOodo = start;
  viewEndOodo = end;
  return [
    [
      ["date_last_stage_update", ">=", start],
      ["date_last_stage_update", "<=", end],
      ["stage_id", "in", [4, 6, 13]],
    ],
  ];
}
function normalizeVietnamese(str) {
  return str
    .normalize("NFD") // Tách dấu khỏi ký tự gốc
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/đ/g, "d") // Chuyển đ -> d
    .replace(/Đ/g, "D"); // Chuyển Đ -> D
}

function formatCurrencyToNumber(currencyStr) {
  return parseFloat(currencyStr.replace(/\,/g, "").replace("đ", "").trim());
}
const dom_block_invoice = document.querySelector(".dom_block.invoice_table");
const dom_block_main_odoo = document.querySelector(".dom_block.main_odoo");

const dom_show_chartbtns = document.querySelectorAll(
  ".dom_show_chartbtns.invoice_table p"
);
const dom_show_chartbtnsMain = document.querySelectorAll(
  ".dom_show_chartbtns.main_odoo p"
);
dom_show_chartbtns.forEach((item, index) => {
  item.addEventListener("click", () => {
    setActiveOnly(item, ".dom_show_chartbtns.invoice_table p.active");
    if (index === 0) {
      dom_block_invoice.classList.remove("chartshow");
    } else {
      dom_block_invoice.classList.add("chartshow");
    }
  });
});
dom_show_chartbtnsMain.forEach((item, index) => {
  item.addEventListener("click", () => {
    console.log(123);

    setActiveOnly(item, ".dom_show_chartbtns.main_odoo p.active");
    if (index === 0) {
      dom_block_main_odoo.classList.remove("chartshow");
    } else {
      dom_block_main_odoo.classList.add("chartshow");
    }
  });
});
ex_won_table = document.querySelector("#ex_won_table");
ex_won_table.addEventListener("click", () => {
  downLoadTable("won_table", "won_leads");
});
ex_invoice_table = document.querySelector("#ex_invoice_table");
ex_invoice_table.addEventListener("click", () => {
  downLoadTable("invoice_table", "invoice_table");
});
function downLoadTable(tableID, name) {
  let table = document.getElementById(tableID); // Lấy bảng
  let wb = XLSX.utils.book_new(); // Tạo workbook
  let ws = XLSX.utils.table_to_sheet(table); // Chuyển bảng thành sheet
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); // Thêm sheet vào workbook
  if (name) {
    XLSX.writeFile(wb, `${name}.xlsx`);
  } else {
    XLSX.writeFile(wb, "res.xlsx");
  }
}
