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
const sale_switch = document.querySelectorAll(".sale_switch");
let salesData = [];
const PROXY = "https://ideas.edu.vn/wp-admin/network/NewFolder/proxy.php";
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
async function fetchLeads() {
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
            fields: [
              "create_date",
              "contact_name",
              "email_from",
              "phone",
              "tag_ids",
              "user_id",
              "description",
              "__last_update",
              "medium_id",
              "source_id",
              "campaign_id",
            ],
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
    setActive(item, ".sale_switch.active");
    renderUloodo(salesData, saleteam[index]);
  });
});
function makeColor(value) {
  let color = "rgba(255, 99, 132, 1);";
  if (value == "Needed") {
    return color;
  } else if (value == "Status - New") {
    color = "rgb(255, 68, 0);";
  } else if (value == "Bad-Timing") {
    color = "rgb(108, 0, 86);";
  } else if (value == "Unqualified") {
    color = "rgb(229, 217, 0);";
  } else if (value == "Junk") {
    color = "rgb(0, 0, 0);";
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
function processAndRenderLeads(leads) {
  const tbody = document.querySelector(".dom_detail_tbody_oodo");
  tbody.innerHTML = ""; // Xóa dữ liệu cũ

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
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(lead.create_date) || ""}</td>
      <td>${lead.contact_name || ""}</td>
      <td>${lead.email_from || ""}</td>
      <td>${lead.phone || ""}</td>
      <td class="${formatTagName(getTagDisplay(lead.tag_ids))}">${getTagDisplay(
      lead.tag_ids
    )}</td>
      <td> <img src="${
        saleAvatar[saleperson]
      }"/> <span>${saleperson}</span></td>
      <td>${lead.description || ""}</td>
      <td>${formatDate(lead.__last_update) || ""}</td>
      <td>${getRound(
        lead.medium_id[1],
        lead.source_id[1],
        lead.campaign_id[1]
      )}</td>
    `;
    tbody.appendChild(row);
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
    const leads = await fetchLeads(); // Lấy dữ liệu leads
    processAndRenderLeads(leads);
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

function getTagDisplayNeeded(tags) {
  return tags.includes(129) || tags.includes(170) ? "Needed" : null;
}

document
  .querySelector("#dom_detail_input.oodo")
  .addEventListener("input", function () {
    const searchValue = this.value.trim().toLowerCase(); // Lấy giá trị nhập vào, bỏ khoảng trắng 2 đầu
    filterTable(searchValue);
  });
function filterTable(searchValue) {
  const rows = document.querySelectorAll(".dom_table_container.oodo tbody tr"); // Lấy tất cả hàng trong bảng

  rows.forEach((row) => {
    const phone = row.children[3].textContent.trim().toLowerCase(); // Cột Phone (cột thứ 4)
    const saleperson = row.children[5].textContent.trim().toLowerCase(); // Cột SalePerson (cột thứ 6)

    // Nếu phone hoặc saleperson chứa giá trị nhập vào thì hiển thị, ngược lại ẩn đi
    if (phone.includes(searchValue) || saleperson.includes(searchValue)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
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
