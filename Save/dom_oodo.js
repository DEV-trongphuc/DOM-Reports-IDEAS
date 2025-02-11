const saleteam = [
  "Lưu Phan Hoàng Phúc",
  "Nguyễn Thị Linh Đan",
  "Lê Đinh Ý Nhi",
  "Mai Thị Nữ",
];
const saleAvatar = {
  "Lưu Phan Hoàng Phúc": "./DOM-img/phuc.jpg",
  "Nguyễn Thị Linh Đan": "./DOM-img/dan.jpg",
  "Lê Đinh Ý Nhi": "./DOM-img/ynhi.jpg",
  "Mai Thị Nữ": "./DOM-img/nu.jpg",
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
const sale_switch = document.querySelectorAll(".sale_switch");
let salesData = [];
const PROXY = "https://ideas.edu.vn/wp-admin/network/NewFolder/proxy.php";
async function loginOdoo() {
  document.querySelector(".loading").classList.add("active");
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
  document.querySelector(".loading").classList.remove("active");
  console.log("Kết quả từ Odoo:", data);

  if (data.result && data.result.uid) {
    console.log("Đăng nhập thành công!");
    return data.result;
  } else {
    console.error("Đăng nhập thất bại:", data);
    throw new Error("Login failed!");
  }
}

function getDateFilterArgs() {
  let startDate, endDate;
  if (startDateGlobal && endDateGlobal) {
    // Nếu đã chọn ngày thì dùng giá trị đó
    startDate = startDateGlobal;
    endDate = endDateGlobal;
  } else {
    // Nếu chưa chọn ngày, lấy tháng hiện tại
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Ngày đầu tháng
      .toISOString()
      .split("T")[0];
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Ngày cuối tháng
      .toISOString()
      .split("T")[0];
  }

  return [
    [
      ["create_date", ">=", startDate],
      ["create_date", "<=", endDate],
    ],
  ];
}
function getDateWonArg() {
  let startDate, endDate;
  if (startDateGlobal && endDateGlobal) {
    // Nếu đã chọn ngày thì dùng giá trị đó
    startDate = startDateGlobal;
    endDate = endDateGlobal;
  } else {
    // Nếu chưa chọn ngày, lấy tháng hiện tại
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Ngày đầu tháng
      .toISOString()
      .split("T")[0];
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Ngày cuối tháng
      .toISOString()
      .split("T")[0];
  }

  return [
    [
      ["won_status", "=", "won"],
      ["date_last_stage_update", ">=", startDate],
      ["date_last_stage_update", "<=", endDate],
    ],
  ];
}

function checkDateTime() {
  let args = [];
  if (preset) {
    const formattedDate = getFormattedDateRange(preset);
    args = formatDateRange(formattedDate);
  } else if (startDateGlobal && endDateGlobal) {
    args = getDateFilterArgs();
  }
  return args;
}
function checkDateTimeWon() {
  let args = [];
  if (preset) {
    const formattedDate = getFormattedDateRange(preset);
    args = formatDateRangeWon(formattedDate);
  } else if (startDateGlobal && endDateGlobal) {
    args = getDateWonArg();
  }
  return args;
}
async function fetchWonLeadsThisYear() {
  document.querySelector(".loading").classList.add("active");
  let sortedLeads;
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
            args: checkDateTimeWon(),
            kwargs: {
              fields: [
                "name",
                "create_date",
                "contact_name",
                "partner_id",
                "email_from",
                "phone",
                "tag_ids",
                "user_id",
                "__last_update",
                "medium_id",
                "source_id",
                "campaign_id",
                "date_last_stage_update",
                "won_status",
              ],
              limit: 0,
            },
          },
        },
      }),
    });
    const data = await response.json();
    if (!data.result) throw new Error("Không có dữ liệu hoặc lỗi API.");
    // **Sort dữ liệu theo date_last_stage_update**
    sortedLeads = data.result.sort(
      (a, b) =>
        new Date(a.date_last_stage_update) - new Date(b.date_last_stage_update)
    );
    const monthlyWonCounts = new Array(12).fill(0);
    sortedLeads.forEach((lead) => {
      const month = new Date(lead.date_last_stage_update).getMonth();
      monthlyWonCounts[month]++;
    });
    drawWonLeadsChart(monthlyWonCounts);
    drawWonLeadsByProgramChart(sortedLeads);
    const partnerIds = sortedLeads
      .map((lead) => lead.partner_id?.[0])
      .filter((id) => id);
    sortedLeads = await fetchInvoicesByPartnerIds(partnerIds, sortedLeads);
  } catch (error) {
    console.error("Lỗi khi fetch lead:", error);
  } finally {
    document.querySelector(".loading").classList.remove("active");
  }
  return sortedLeads;
}
async function fetchInvoicesByPartnerIds(partnerIds, leads) {
  if (!partnerIds.length) return [];

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
            model: "account.move", // Odoo 13+ (trước đó có thể là "account.invoice")
            method: "search_read",
            args: [
              [
                ["partner_id", "in", partnerIds],
                ["move_type", "=", "out_invoice"],
                ["payment_state", "=", "paid"],
              ],
            ], // Lọc theo partner_id và chỉ lấy hóa đơn bán
            kwargs: {
              fields: [],
              limit: 0, // Lấy tất cả hóa đơn
            },
          },
        },
      }),
    });

    const data = await response.json();
    if (!data.result) throw new Error("Không lấy được hóa đơn.");

    console.log("Hóa đơn lấy được:", data.result);
    const invoiceTotals = {};
    data.result.forEach((invoice) => {
      const partnerId = invoice.partner_id[0];
      invoiceTotals[partnerId] =
        (invoiceTotals[partnerId] || 0) + invoice.amount_total_signed;
    });
    leads.forEach((lead) => {
      const partnerId = lead.partner_id?.[0];
      lead.amount_total_signed = invoiceTotals[partnerId] || 0;
    });
    console.log("Leads sau khi gán tổng hóa đơn đã thanh toán:", leads);
    return leads;
  } catch (error) {
    console.error("Lỗi khi fetch hóa đơn:", error);
    return [];
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
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: false,
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

async function fetchLeads() {
  document.querySelector(".loading").classList.add("active");
  salesData = [];
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
          args: checkDateTime(),
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
  document.querySelector(".loading").classList.remove("active");
  return data.result;
}
sale_switch.forEach((item, index) => {
  item.addEventListener("click", () => {
    setActive(item, ".sale_switch.active");
    renderUloodo(salesData, saleteam[index]);
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
  let color = "rgb(0, 80, 133)";
  if (value == "MSc AI") {
    return color;
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
  const ulElement = document.querySelector(".dom_chart_most_ul.oodo"); // Phần tử danh sách trên UI
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
  const tbody = document.querySelector(".dom_detail_tbody_oodo");
  tbody.innerHTML = ""; // Xóa dữ liệu cũ
  leads.forEach((lead) => {
    const saleperson = lead.user_id ? lead.user_id[1] : "Khác";
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${formatDate(lead.date_last_stage_update) || ""}</td>
    <td>${formatDate(lead.create_date) || ""}</td>
    <td> <span style="background: ${makeColorWon(
      getTagDisplayWon(lead.tag_ids)
    )}"></span>${getTagDisplayWon(lead.tag_ids) || ""}</td>
    <td>${lead.contact_name || ""}</td>
    <td>${lead.email_from || ""}</td>
    <td>${lead.phone || ""}</td>
    <td>${formatCurrency(lead.amount_total_signed) || ""}</td>
    <td> <img src="${saleAvatar[saleperson]}"/> <span>${saleperson}</span></td>
    <td>${lead.source_id[1] || ""}</td>
    <td>${lead.campaign_id[1] || ""}</td>
    <td>${lead.medium_id[1] || ""}</td>
  `;
    tbody.appendChild(row);
  });
  updateTableFooter(leads);
  // Tính tổng số leads và tổng sale_amount_total
}
function updateTableFooter(leads) {
  const table = document.querySelector("#dom_table_oodo");
  let oldTfoot = table.querySelector("#dom_table_oodo tfoot");

  // Xóa tfoot cũ nếu có
  if (oldTfoot) {
    oldTfoot.remove();
  }

  // Tính tổng số leads và tổng amount
  const totalLeads = leads.length;
  const totalAmount = leads.reduce(
    (sum, lead) => sum + (lead.amount_total_signed || 0),
    0
  );

  // Tạo tfoot mới
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
    <tr>
      <td style="text-align:center" colspan="3"><strong>TOTAL ${totalLeads} Won</strong></td>
      <td ></td>
      <td ></td>
      <td ></td>
      <td><strong>${formatCurrency(totalAmount)}</strong></td>
      <td ></td>
      <td colspan="3"></td>
    </tr>
  `;

  // Thêm vào bảng
  table.appendChild(tfoot);
}

function processAndRenderLeads(leads) {
  // Chỉ tính toán với những người trong saleteam
  leads.forEach((lead) => {
    const saleperson = lead.user_id ? lead.user_id[1] : "Khác";

    if (!saleteam.includes(saleperson)) return; // Bỏ qua nếu không thuộc saleteam

    if (!salesData[saleperson]) {
      salesData[saleperson] = {
        total: 0,
        Needed: 0,
        "Status - New": 0,
        "Bad-Timing": 0,
        Unqualified: 0,
        Junk: 0,
      };
    }

    salesData[saleperson].total++;

    // Kiểm tra nếu có tag_ids và là mảng
    if (lead.tag_ids && Array.isArray(lead.tag_ids)) {
      const tagList = [...new Set(lead.tag_ids)]; // Loại bỏ trùng lặp trước

      if (tagList.includes(129) || tagList.includes(170)) {
        salesData[saleperson].Needed++;
      } else if (tagList.includes(126)) {
        salesData[saleperson]["Status - New"]++;
      } else if (tagList.includes(127)) {
        salesData[saleperson]["Bad-Timing"]++;
      } else if (tagList.includes(154)) {
        salesData[saleperson].Unqualified++;
      } else if (tagList.includes(128)) {
        salesData[saleperson].Junk++;
      }
    }

    // Render từng lead vào bảng
  });

  // Render chart và UI
  renderChart(salesData);
  renderUloodo(salesData, saleteam[0]);
  calculateTotalSalesData(salesData);
}
function renderProgressBar(totalData) {
  const progressBar = document.querySelector("#progressBar");
  const progressLabel = document.querySelector(".progess_label");
  const oodo_total = document.querySelector(".oodo_total");

  progressBar.innerHTML = ""; // Xóa nội dung cũ
  progressLabel.innerHTML = ""; // Xóa label cũ

  const total = Object.values(totalData).reduce((sum, num) => sum + num, 0); // Tổng tất cả số liệu
  oodo_total.innerText = total;
  Object.entries(totalData).forEach(([key, value]) => {
    if (value > 0) {
      const percentage = ((value / total) * 100).toFixed(1); // Tính %

      const segment = document.createElement("p");
      segment.classList.add("segment");
      segment.style = `width:${percentage}%; background:${makeColor(key)}`;
      // segment.textContent = `${key} (${value})`; // Hiển thị tên tag và số lượng
      progressBar.appendChild(segment);
      const label = document.createElement("p");
      label.innerHTML = `<span style="background: ${makeColor(
        key
      )}"></span>${key}: <b>${value} (${percentage}%)</b>`;
      progressLabel.appendChild(label);
    }
  });
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
  renderLabel = labels.map((fullName) => {
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
          borderWidth: 1,
        },
        {
          label: "Needed",
          data: neededLeads,
          backgroundColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true, // Hiển thị legend
        },
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 11, weight: "bold" },
          formatter: (value) => value,
        },
      },
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 9,
            },
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.15; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

async function main() {
  try {
    await loginOdoo(); // Đăng nhập trước
    const [leads, wons] = await Promise.all([
      fetchLeads(), // Fetch tất cả leads
      fetchWonLeadsThisYear(), // Fetch leads won
    ]);
    processAndRenderLeads(leads);
    renderWon(wons);
  } catch (error) {
    console.error("Lỗi xảy ra:", error);
  }
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
  if (!tags || tags.length === 0) return ""; // Không có tag thì để trống
  for (let tag of tags) {
    if (tagWon[tag]) return tagWon[tag]; // Lấy tag đầu tiên tìm thấy trong danh sách
  }

  return ""; // Nếu không có tag hợp lệ thì để trống
}

function getTagDisplayNeeded(tags) {
  return tags.includes(129) || tags.includes(170) ? "Needed" : null;
}

document
  .querySelector("#dom_detail_input.oodo")
  .addEventListener("input", function () {
    const searchValue = normalizeVietnamese(this.value.trim().toLowerCase());
    filterTable(searchValue);
  });
function filterTable(searchValue) {
  const rows = document.querySelectorAll(".dom_table_container.oodo tbody tr"); // Lấy tất cả hàng trong bảng
  let filteredLeads = [];
  rows.forEach((row) => {
    const phone = row.children[5].textContent.trim().toLowerCase();
    const saleperson = normalizeVietnamese(
      row.children[7].textContent.trim().toLowerCase()
    );
    const program = row.children[2].textContent.trim().toLowerCase();
    const name = normalizeVietnamese(
      row.children[3].textContent.trim().toLowerCase()
    );

    // Nếu phone hoặc saleperson chứa searchValue thì hiển thị, ngược lại ẩn đi
    if (
      phone.includes(searchValue) ||
      saleperson.includes(searchValue) ||
      program.includes(searchValue) ||
      name.includes(searchValue)
    ) {
      row.style.display = "";
      // Lưu lại dữ liệu của hàng này để cập nhật tfoot
      filteredLeads.push({
        amount_total_signed:
          formatCurrencyToNumber(row.children[6].textContent) || 0, // Cột Amount (cột thứ 8)
      });
    } else {
      row.style.display = "none";
    }
  });

  // Cập nhật lại tfoot theo danh sách đã lọc
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
function formatDateRangeWon(dateRangeStr) {
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
      ["won_status", "=", "won"],
      ["date_last_stage_update", ">=", start],
      ["date_last_stage_update", "<=", end],
    ],
  ];
}
document
  .querySelector("#dom_detail_find.oodo")
  .addEventListener("click", function () {
    const table = document.getElementById("dom_table_oodo"); // Thay bằng ID bảng cần xuất
    if (!table) {
      console.error("Table not found!");
      return;
    }

    // Chuyển đổi table HTML thành worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Xuất file Excel
    XLSX.writeFile(wb, "export.xlsx");
  });
let wonProgramChartInstance = null;
function drawWonLeadsByProgramChart(leads) {
  const ctx = document.getElementById("wonProgramChart").getContext("2d");

  // Đếm số lượng leads theo chương trình
  const programCounts = {};
  leads.forEach((lead) => {
    const program = getTagDisplayWon(lead.tag_ids);
    if (program) {
      programCounts[program] = (programCounts[program] || 0) + 1;
    }
  });

  // Lấy danh sách chương trình & số lượng tương ứng
  const labels = Object.keys(programCounts);
  const data = Object.values(programCounts);

  // Nếu không có dữ liệu thì thoát
  if (data.length === 0) {
    console.warn("Không có dữ liệu để vẽ biểu đồ chương trình");
    return;
  }

  if (window.wonProgramChartInstance) {
    window.wonProgramChartInstance.destroy();
  }

  window.wonProgramChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Leads by Program",
          data: data,
          backgroundColor: "rgba(255, 171, 0,0.9)",
          borderColor: "rgba(255, 171, 0,1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      barPercentage: 0.4,
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function normalizeVietnamese(str) {
  return str
    .normalize("NFD") // Tách dấu khỏi ký tự gốc
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/đ/g, "d") // Chuyển đ -> d
    .replace(/Đ/g, "D"); // Chuyển Đ -> D
}

function formatCurrencyToNumber(currencyStr) {
  return parseFloat(currencyStr.replace(/\./g, "").replace("đ", "").trim());
}
