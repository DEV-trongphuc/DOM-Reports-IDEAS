const brandData = {
  labels: quick_filter,
  datasets: [
    {
      data: [],
      backgroundColor: [
        "#ffa900db",
        "#ffa900db",
        "#ffa900db",
        "#ffa900db",
        "#ffa900db",
        "#ffa900db",
      ],
      borderWidth: 1,
    },
  ],
};
let startDateGlobal = "";
let endDateGlobal = "";
let viewCampaigns = "";
let viewAdsets = "";
let quickview_adset = false;
let currentChart = null; // Biến lưu trữ đối tượng biểu đồ hiện tại

const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?level=adset&fields=campaign_name,adset_name,adset_id,spend,impressions,reach,actions,optimization_goal&date_preset=this%5fmonth&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&access_token=${accessToken}&limit=1000`;
const apiDaily = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=spend,reach,actions,date_start&time_increment=1&date_preset=this%5fmonth&access_token=${accessToken}&limit=1000`;

let allData = [];

// _____ELEMENT________
const dom_reach_unit = document.getElementById("dom_reach_unit");
const dom_reaction_unit = document.getElementById("dom_reaction_unit");
const dom_mess_unit = document.getElementById("dom_mess_unit");
const dom_like_unit = document.getElementById("dom_like_unit");
const percentChart = document.querySelector(".percentChart");
const dom_main_menu_a = document.querySelectorAll(".dom_main_menu li a");
const dom_contentarea = document.querySelector("#dom_contentarea");
const dom_event_ul = document.querySelector(".dom_event_ul > ul");
const dom_not_data = document.querySelector(".dom_not_data");
const dom_choose_day = document.querySelector(".dom_choose_day");
const dom_choosed = document.querySelector(".dom_choosed");
const dom_choosed_day = document.querySelector(".dom_choosed_day");
const itemDate = document.querySelectorAll(".dom_choose_day li"); // Select all li items in the dom_choose_day list
const radio_choose_date = document.querySelectorAll(
  ".dom_choose_day li .radio_box"
);
const viewAdsetUl = document.querySelector(".view_adset ul");
const viewAdsetTitle = document.querySelector(".dom_view_campaign.adset");
const viewAdsetUlList = document.querySelector(
  ".view_adset .dom_title_report_list > div"
);
const dom_quick_filter = document.querySelector(".dom_quick_filter");
const dom_table_data = document.querySelector(".dom_table_data");

let dailyChartInstance; // Declare globally
const view_selected_campaign = document.querySelector(
  ".view_selected.campaign"
);
const view_selected_account = document.querySelector(".view_selected.account");
const dom_select_view = document.querySelector(".dom_select_view.campaign");
const dom_select_li = document.querySelectorAll(
  ".dom_select_view.campaign ul li"
);
const dom_select_view_acc = document.querySelector(".dom_select_view.account");
const dom_select_li_acc = document.querySelectorAll(
  ".dom_select_view.account ul li"
);
let allDatasets = []; // Store datasets globally
let allDatasets2 = []; // Store datasets globally
// Hàm để vẽ lại biểu đồ
let impressionDoughnutChart;

function drawChart(data) {
  const ctx = document.getElementById("brandChart").getContext("2d");

  // Nếu biểu đồ hiện tại đã tồn tại, hủy bỏ nó
  if (currentChart !== null) {
    currentChart.destroy();
  }

  // Tạo biểu đồ mới
  currentChart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      borderRadius: 5,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true, // Hiển thị tooltip khi hover
        },
        datalabels: {
          // Thêm plugin để hiển thị giá trị trên cột
          anchor: "end", // Vị trí gắn (có thể là 'center', 'end', 'start')
          align: "top", // Căn chỉnh vị trí (trên đầu cột)
          color: "#7c7c7c", // Màu chữ
          font: {
            size: 11, // Kích thước chữ
            weight: "bold", // Đậm chữ để dễ nhìn hơn
          },
          formatter: function (value) {
            return formatCurrency(value); // Hiển thị đúng giá trị của cột
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 10,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 9,
            },
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels], // Kích hoạt plugin datalabels
  });
}

// ___________________
let firstload = true;
async function fetchData(api) {
  document.querySelector(".loading").classList.add("active");
  const query = localStorage.getItem("query");
  const iview = localStorage.getItem("iview");
  if (!query) {
    localStorage.setItem("query", quick_filter[0]);
  }
  if (iview) {
    dom_main_menu_a[iview].classList.add("active");
  }
  allData = []; // Khởi tạo danh sách để chứa toàn bộ dữ liệu
  let nextUrl = api; // URL ban đầu

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);

      // Kiểm tra xem phản hồi có thành công không
      if (!response.ok) {
        throw new Error(`Network error: ${response.statusText}`);
      }

      const data = await response.json();

      // Kiểm tra lỗi từ API
      if (data.error) {
        document.querySelector(".loading").classList.remove("active");
        console.error("Error from API:", data.error.message);
        return;
      }

      // Debug: Log dữ liệu trả về

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...(data.data || [])];

      // Kiểm tra và cập nhật URL của trang tiếp theo
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Render dữ liệu vào giao diện
    if (typeof renderTopCampaigns === "function") {
      renderTopCampaigns(allData);
    }

    const totals = calculateTotals(allData);

    document.getElementById("total_spend").textContent = formatCurrency(
      Math.round(totals.spend)
    );
    document.getElementById("total_reach").textContent = formatNumber(
      Math.round(totals.reach)
    );
    document.getElementById("total_reaction").textContent = formatNumber(
      Math.round(totals.lead)
    );
    document.getElementById("total_follows").textContent = formatNumber(
      Math.round(totals.follows)
    );
    document.getElementById("total_clicks").textContent = formatNumber(
      Math.round(totals.clicks)
    );
    document.getElementById("total_impressions").textContent = formatNumber(
      Math.round(totals.impressions)
    );
    document.getElementById("total_message").textContent = formatNumber(
      Math.round(totals.message)
    );
    document.getElementById("total_love").textContent = formatNumber(
      Math.round(totals.reaction)
    );

    const totalSpends = calculateBrandSpending(allData, brandData.labels);
    brandData.datasets[0].data = totalSpends;
    drawChart(brandData); // Thay vì dùng new Chart, giờ gọi drawChart
    // processData(allData);
    renderReportPerformance();

    const quickID = localStorage.getItem("quickID");
    if (firstload && (!quickID || !query) && !iview) {
      filterData("");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
  firstload = false;
  document.querySelector(".loading").classList.remove("active");
}
function calculateMetrics(rows) {
  const metrics = {
    spend: 0,
    reach: 0,
    result: 0,
    impressions: 0,
    engagement: 0,
    reactions: 0,
    follows: 0,
    comments: 0,
    video: 0,
    photo: 0,
    lead: 0,
    linkClicks: 0,
    messengerStart: 0,
  };

  const fields = [
    { key: "spend", type: "float" },
    { key: "reach", type: "int" },
    { key: "result", type: "int" },
    { key: "impressions", type: "int" },
    { key: "engagement", type: "int" },
    { key: "postReaction", type: "int", mapTo: "reactions" },
    { key: "follows", type: "int" },
    { key: "comments", type: "int" },
    { key: "video", type: "int" },
    { key: "photo", type: "int" },
    { key: "lead", type: "int" },
    { key: "linkClick", type: "int", mapTo: "linkClicks" },
    { key: "messengerStart", type: "int" },
  ];

  rows.forEach((row) => {
    fields.forEach(({ key, type, mapTo }) => {
      const element = row.querySelector(`.${key}`);
      const value = element
        ? type === "float"
          ? parseFloat(element.dataset.value)
          : parseInt(element.dataset.value)
        : 0;
      metrics[mapTo || key] += value || 0;
    });
  });

  return metrics;
}

function processData(data, performance) {
  let render = ``;
  const dom_detail_tbody = document.querySelector(".dom_detail_tbody ");
  // Hàm tính tổng và cập nhật tfoot
  function updateTotals(rows, selectedCount = 0) {
    let metrics = calculateMetrics(rows);
    const renderEvents = [
      { name: "Post Reaction", value: metrics.reactions },
      { name: "Messenger Start", value: metrics.messengerStart },
      { name: "Lead Complete", value: metrics.lead },
      { name: "Comments on Ads", value: metrics.comments },
      { name: "Video view", value: metrics.video },
      { name: "Photo view", value: metrics.photo },
      { name: "Post Engagement", value: metrics.engagement },
      { name: "Follows/Likepage", value: metrics.follows },
      { name: "Link Click", value: metrics.linkClicks },
    ];

    // Sắp xếp theo `value` giảm dần
    renderEvents.sort((a, b) => b.value - a.value);

    // Xác định giá trị lớn nhất để tính % chiều rộng
    const maxValue = renderEvents[0].value || 1; // Tránh chia cho 0

    // Render danh sách
    dom_event_ul.innerHTML = renderEvents
      .map(
        ({ name, value }) => `
          <li>
            <p><span>${name}</span> <span>${formatNumber(value)}</span></p>
            <p><span style="width: ${(value * 100) / maxValue}%;"></span></p>
          </li>
        `
      )
      .join("");

    const adset_quick_view = document.querySelectorAll(".adset_quick_view");
    adset_quick_view.forEach((item, index) => {
      item.addEventListener("click", () => {
        const campaign = item.dataset.campaignquick;
        const adset = item.dataset.adsetquick;
        dom_contentarea.classList.add("viewPerformance");
        dom_contentarea.classList.add("viewDemographic");
        dom_contentarea.classList.add("viewQuickAdset");
        window.scrollTo({ top: 0, behavior: "smooth" });
        quickview_adset = true;
        // filterData(campaign, adset);
        renderReportPerformance(campaign, adset);
      });
    });

    // Cập nhật tfoot
    const tfootContent = `
    <tr>
      <td class="dom_selected_total" colspan="4">
        ${
          selectedCount > 0
            ? `TOTAL x${selectedCount} adsets`
            : "TOTAL ALL ADSETS"
        }
      </td>
      <td>${formatCurrency(metrics.spend)}</td>
      <td>${formatNumber(metrics.reach)}</td>
      <td>${formatNumber(metrics.impressions)}</td>
      <td>${formatNumber(metrics.result)}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td>${formatNumber(metrics.follows)}</td>
      <td>${formatNumber(metrics.reactions)}</td>
      <td>${formatNumber(metrics.messengerStart)}</td>
      <td>${formatNumber(metrics.lead)}</td>
      <td>-</td>
      <td>${formatNumber(metrics.engagement)}</td>
      <td>${formatNumber(metrics.video)}</td>
      <td>${formatNumber(metrics.photo)}</td>
      <td>${formatNumber(metrics.comments)}</td>
      <td>${formatNumber(metrics.linkClicks)}</td>
    </tr>
  `;
    document.querySelector("tfoot").innerHTML = tfootContent;

    // Update viewPerformance
    const viewPerformance = document.querySelector(
      "#dom_contentarea.viewPerformance"
    );
    if (viewPerformance) {
      const metricMap = {
        total_spend_viewPerformance: formatCurrency(metrics.spend),
        total_reach_viewPerformance: formatNumber(metrics.reach),
        total_messenger_viewPerformance: formatNumber(metrics.messengerStart),
        total_follows_viewPerformance: formatNumber(metrics.follows),
        total_reaction_viewPerformance: formatNumber(metrics.lead),
        total_engagement_viewPerformance: formatNumber(metrics.engagement),
        total_comment_viewPerformance: formatNumber(metrics.comments),
        total_link_viewPerformance: formatNumber(metrics.linkClicks),
        total_cpm_viewPerformance: formatCurrency(
          ((metrics.spend * 1000) / metrics.impressions).toFixed(0)
        ),
        total_prr_viewPerformance: `${(
          (metrics.result * 100) /
          metrics.reach
        ).toFixed(2)}%`,
      };

      Object.entries(metricMap).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
      });

      // Update frequency labels
      const impressionEl = document.querySelector(
        ".dom_frequency_label_impression"
      );
      const reachEl = document.querySelector(".dom_frequency_label_reach");
      updateDonut(metrics.impressions, metrics.reach);
      if (impressionEl)
        impressionEl.innerText = formatNumber(metrics.impressions);
      if (reachEl) reachEl.innerText = formatNumber(metrics.reach);
    }
  }

  // Lắng nghe sự kiện checkbox
  document.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      const row = e.target.closest("tr");

      // Thêm hoặc loại bỏ class 'checked'
      if (e.target.checked) {
        row.classList.add("checked");
      } else {
        row.classList.remove("checked");
      }

      // Lấy tất cả các hàng được check
      const checkedRows = Array.from(
        document.querySelectorAll("tbody tr.checked")
      );

      if (checkedRows.length > 0) {
        updateTotals(checkedRows, checkedRows.length); // Gửi số hàng được chọn
      } else {
        // Nếu không có hàng nào được check, tính tổng toàn bộ
        const allRows = Array.from(document.querySelectorAll("tbody tr"));
        updateTotals(allRows);
      }
    }
  });

  // Xử lý sự kiện khi click vào #dom_select_all
  document
    .getElementById("dom_select_all")
    .addEventListener("click", function () {
      const checkboxes = document.querySelectorAll(
        'tbody input[type="checkbox"]'
      );
      const isChecked = this.checked; // Trạng thái của nút "chọn tất cả"

      checkboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
        const row = checkbox.closest("tr");

        if (isChecked) {
          row.classList.add("checked");
        } else {
          row.classList.remove("checked");
        }
      });

      // Cập nhật tổng khi chọn tất cả hoặc bỏ chọn
      const checkedRows = isChecked
        ? Array.from(document.querySelectorAll("tr.checked"))
        : Array.from(document.querySelectorAll("tbody tr"));

      updateTotals(checkedRows, isChecked ? checkedRows.length : undefined);
    });

  // Render dữ liệu và thêm thuộc tính data-value cho các ô số liệu
  // Tạo các nhóm dữ liệu cho từng mục tiêu
  const metrics = {
    awareness: { totalSpend: 0, totalReach: 0 },
    engagement: { totalSpend: 0, totalReaction: 0 },
    message: { totalSpend: 0, totalMessageCount: 0 },
    likepage: { totalSpend: 0, totalLikeCount: 0 },
    traffic: { totalSpend: 0, totalLinkClick: 0 },
    lead: { totalSpend: 0, totalLeadCount: 0 },
  };

  data.forEach((campaignItem) => {
    const itemSpend = parseFloat(campaignItem.spend) || 0;
    if (itemSpend > 0) {
      const itemReach = campaignItem.reach * 1 || 0;
      const itemImpressions = campaignItem.impressions * 1 || 0;

      const actions = campaignItem.actions || [];
      const engagementCount =
        getValueFromActions(actions, "post_engagement") || 0;
      const reactionCount = getValueFromActions(actions, "post_reaction") || 0;
      const likeCount = getValueFromActions(actions, "like") || 0;
      const leadCount =
        getValueFromActions(actions, "onsite_conversion.lead_grouped") || 0;
      const commentCount = getValueFromActions(actions, "comment") || 0;
      const linkClickCount = getValueFromActions(actions, "link_click") || 0;
      const photoViewCount = getValueFromActions(actions, "photo_view") || 0;
      const videoViewCount = getValueFromActions(actions, "video_view") || 0;
      const messageStartCount =
        getValueFromActions(
          actions,
          "onsite_conversion.messaging_conversation_started_7d"
        ) || 0;

      const optimizationGoal = campaignItem.optimization_goal;
      const goalType = Object.entries(goalMapping).find(([_, goals]) =>
        goals.includes(optimizationGoal)
      )?.[0];

      // Phân loại theo mục tiêu
      if (performance === "true") {
        switch (goalType) {
          case "Awareness":
            metrics.awareness.totalSpend += itemSpend;
            metrics.awareness.totalReach += itemReach;
            break;

          case "Traffic":
            metrics.traffic.totalSpend += itemSpend;
            metrics.traffic.totalLinkClick += linkClickCount;
            break;

          case "Engagement":
            metrics.engagement.totalSpend += itemSpend;
            metrics.engagement.totalReaction += reactionCount;
            break;

          case "Message":
            metrics.message.totalSpend += itemSpend;
            metrics.message.totalMessageCount += messageStartCount;
            break;

          case "Pagelike":
            metrics.likepage.totalSpend += itemSpend;
            metrics.likepage.totalLikeCount += likeCount;
            break;

          case "Lead Form":
            metrics.lead.totalSpend += itemSpend;
            metrics.lead.totalLeadCount += leadCount;
            break;
        }
      }

      // Xác định kết quả chính dựa trên mục tiêu
      const resultType =
        {
          Engagement: reactionCount,
          Awareness: itemReach,
          Traffic: linkClickCount,
          Message: messageStartCount,
          Pagelike: likeCount,
          "Lead Form": leadCount,
        }[goalType] || 0;

      const costPerResult =
        resultType > 0 ? Math.round(itemSpend / resultType) : "-";
      const cpm =
        itemImpressions > 0
          ? Math.round((itemSpend / itemImpressions) * 1000)
          : 0;
      const frequency =
        itemReach > 0 ? (itemImpressions / itemReach).toFixed(2) : "-";

      // Render dữ liệu ra bảng
      render += `
      <tr>
        <td><input type="checkbox"></td>
        <td>${campaignItem.campaign_name}</td>
        <td>${campaignItem.adset_name}</td>
        <td class="adset_quick_view" data-campaignquick="${
          campaignItem.campaign_name
        }" data-adsetquick="${campaignItem.adset_name}">
          <i class="fa-solid fa-magnifying-glass-chart"></i>
        </td>
        <td class="spend" data-value="${itemSpend}">${formatCurrency(
        itemSpend
      )}</td>
        <td class="reach" data-value="${itemReach}">${formatNumber(
        itemReach
      )}</td>
        <td class="impressions" data-value="${itemImpressions}">${formatNumber(
        itemImpressions
      )}</td>
        <td class="result" data-value="${resultType}">${
        resultType > 0 ? formatNumber(resultType) : "-"
      }</td>
        <td class="costPerResult" data-value="${costPerResult}">${formatCurrency(
        costPerResult
      )}</td>
       <td>${formatLabel(optimizationGoal)}</td>
        <td class="frequency" data-value="${frequency}">${frequency}</td>
        <td class="follows" data-value="${likeCount}">${formatNumber(
        likeCount
      )}</td>
        <td class="postReaction" data-value="${reactionCount}">${formatNumber(
        reactionCount
      )}</td>
        <td class="messengerStart" data-value="${messageStartCount}">${formatNumber(
        messageStartCount
      )}</td>
        <td class="lead" data-value="${leadCount}">${formatNumber(
        leadCount
      )}</td>
        <td class="cpm" data-value="${cpm}">${formatCurrency(cpm)}</td>
        <td class="engagement" data-value="${engagementCount}">${formatNumber(
        engagementCount
      )}</td>
        <td class="video" data-value="${videoViewCount}">${formatNumber(
        videoViewCount
      )}</td>
        <td class="photo" data-value="${photoViewCount}">${formatNumber(
        photoViewCount
      )}</td>
        <td class="comments" data-value="${commentCount}">${formatNumber(
        commentCount
      )}</td>
        <td class="linkClick" data-value="${linkClickCount}">${formatNumber(
        linkClickCount
      )}</td>
      </tr>
    `;
    }
  });

  // Cập nhật UI nếu đang ở chế độ performance
  if (performance === "true") {
    updateProgressBar(
      metrics.awareness.totalSpend,
      metrics.engagement.totalSpend,
      metrics.likepage.totalSpend,
      metrics.message.totalSpend,
      metrics.traffic.totalSpend,
      metrics.lead.totalSpend
    );
    console.log(metrics.awareness.totalReach);

    dom_reach_unit.innerText =
      metrics.awareness.totalReach > 0
        ? formatCurrency(
            (
              metrics.awareness.totalSpend / metrics.awareness.totalReach
            ).toFixed(2)
          )
        : "No goal campaign";

    dom_reaction_unit.innerText =
      metrics.lead.totalLeadCount > 0
        ? formatCurrency(
            (metrics.lead.totalSpend / metrics.lead.totalLeadCount).toFixed(0)
          )
        : "No goal campaign";

    dom_mess_unit.innerText =
      metrics.message.totalMessageCount > 0
        ? formatCurrency(
            (
              metrics.message.totalSpend / metrics.message.totalMessageCount
            ).toFixed(0)
          )
        : "No goal campaign";

    dom_like_unit.innerText =
      metrics.likepage.totalLikeCount > 0
        ? formatCurrency(
            (
              metrics.likepage.totalSpend / metrics.likepage.totalLikeCount
            ).toFixed(0)
          )
        : "No goal campaign";
  }

  dom_detail_tbody.innerHTML = render;
  const allRows = Array.from(document.querySelectorAll("tbody tr"));
  updateTotals(allRows);
}
function sortTableBySpend() {
  const tbody = document.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Sắp xếp các hàng dựa trên giá trị spend (data-value)
  rows.sort((a, b) => {
    const spendA = parseFloat(a.querySelector(".spend").dataset.value) || 0;
    const spendB = parseFloat(b.querySelector(".spend").dataset.value) || 0;
    return spendB - spendA; // Sắp xếp giảm dần
  });

  // Xóa các hàng cũ và chèn lại theo thứ tự mới
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));
}

// Gọi hàm sắp xếp sau khi render

// Add event listener to the FIND button

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

const inputElement = document.getElementById("dom_detail_input");
const debouncedFilter = debounce(filterData, 500); // Chờ 300ms sau khi nhập xong

inputElement.addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  debouncedFilter(keyword);
  console.log(keyword);
});
// document
//   .getElementById("dom_detail_find")
//   .addEventListener("click", function () {
//     dom_main_menu_a[0].click();
//     filterData(keyword);
//   });
document
  .getElementById("dom_detail_find")
  .addEventListener("click", function () {
    const table = document.getElementById("dom_table"); // Thay bằng ID bảng cần xuất
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

function clearFilter() {
  const activeItem = document.querySelector(".dom_quick_filter a.active");
  if (activeItem) {
    activeItem.classList.remove("active");
  }
  localStorage.removeItem("quickID");
}
function filterData(campaign_name = "", adset_name = "", query_type) {
  console.log(campaign_name);

  const isMatch = (item, key, value) =>
    !value || (item[key] || "").toLowerCase().includes(value.toLowerCase());

  const goalList = goalMapping[query_type];

  const filteredData = allData.filter((item) => {
    console.log(item);

    if (query_type && goalList) {
      return goalList.includes(item.optimization_goal);
    }
    return (
      isMatch(item, "campaign_name", campaign_name) &&
      isMatch(item, "adset_name", adset_name)
    );
  });

  console.log("Filtered Data:", campaign_name);
  processData(filteredData, "true");
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(); // Chỉ viết hoa chữ cái đầu tiên
}

function formatCurrency(value) {
  return value === "-"
    ? "-"
    : new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

function formatNumber(value) {
  if (value === "-") return "-";
  return new Intl.NumberFormat("de-DE").format(value); // Sử dụng định dạng tiếng Đức, dấu phân cách là "."
}

function getValueFromActions(actions, actionType) {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? action.value * 1 : 0;
}
// Hàm tính tổng spend cho từng brand

function calculateBrandSpending(allData, brandLabels) {
  // Khởi tạo mảng tổng spend cho từng brand
  const brandTotals = brandLabels.map(() => 0);

  allData.forEach((adset) => {
    const campaignGoal = adset.optimization_goal;
    const spend = parseFloat(adset.spend || 0); // Chi tiêu của adset

    // Duyệt qua brandLabels để xác định nơi cần cộng spend
    brandLabels.forEach((brand, index) => {
      if (goalMapping[brand]?.includes(campaignGoal)) {
        brandTotals[index] += spend; // Cộng vào tổng chi tiêu của brand
      }
    });
  });

  return brandTotals;
}

// Tính toán tổng spend
function calculateTotals(allData) {
  // Khởi tạo biến lưu tổng
  const totals = {
    spend: 0,
    reach: 0,
    reaction: 0,
    follows: 0,
    lead: 0,
    impressions: 0,
    clicks: 0,
    message: 0,
  };

  // Lặp qua tất cả các adset
  allData.forEach((adset) => {
    // Cộng dồn các giá trị
    totals.spend += parseFloat(adset.spend || 0);
    totals.reach += parseInt(adset.reach || 0);
    totals.impressions += parseInt(adset.impressions || 0);
    totals.reaction += parseInt(
      getValueFromActions(adset.actions, "post_reaction") || 0
    );
    totals.follows += parseInt(getValueFromActions(adset.actions, "like") || 0);
    totals.lead += parseInt(
      getValueFromActions(adset.actions, "onsite_conversion.lead_grouped") || 0
    );
    totals.clicks += parseInt(
      getValueFromActions(adset.actions, "link_click") || 0
    );
    totals.message += parseInt(
      getValueFromActions(
        adset.actions,
        "onsite_conversion.messaging_conversation_started_7d"
      ) || 0
    );
  });
  return totals;
}

function renderTopCampaigns(allData) {
  // Nhóm các adset theo tên campaign
  const campaignTotals = allData.reduce((totals, adset) => {
    const campaignName = adset.campaign_name || "Unknown Campaign"; // Lấy tên campaign hoặc gán mặc định nếu không có
    const spend = parseFloat(adset.spend) || 0; // Lấy spend hoặc gán 0 nếu không có

    // Kiểm tra campaign đã tồn tại trong danh sách chưa
    const existingCampaign = totals.find((item) => item.name === campaignName);

    if (existingCampaign) {
      // Nếu tồn tại, cộng thêm spend
      existingCampaign.spend += spend;
    } else {
      // Nếu chưa, thêm mới campaign vào danh sách
      totals.push({ name: campaignName, spend });
    }

    return totals;
  }, []);

  // Sắp xếp các campaign theo tổng spend giảm dần
  campaignTotals.sort((a, b) => b.spend - a.spend);

  // Render lên giao diện
  const ulElement = document.querySelector(".dom_chart_most_ul"); // Phần tử danh sách trên UI
  ulElement.innerHTML = ""; // Xóa nội dung cũ nếu có
  campaignTotals.forEach((campaign) => {
    const li = document.createElement("li");
    li.innerHTML = `<p><span>${campaign.name}</span> <span>${formatCurrency(
      campaign.spend
    )}</span></p> <p> <span style="width: ${
      (campaign.spend * 100) / campaignTotals[0].spend
    }%"></span> </p>`;
    ulElement.appendChild(li);
  });
}

dom_choose_day.addEventListener("click", function (event) {
  if (quickview_adset) {
    alert(
      "Dữ liệu adset đang tùy chọn có thể không tồn tại ở khoảng thời gian khác. Vui lòng làm sạch bộ lọc."
    );
  } else {
    // Kiểm tra nếu phần tử được click không nằm trong <li> cuối cùng
    const lastLi = dom_choose_day.querySelector("li:last-child");
    if (!lastLi.contains(event.target)) {
      dom_choose_day.classList.toggle("active");
    }
  }
});
dom_choosed_day.addEventListener("click", function (event) {
  if (quickview_adset) {
    alert(
      "Dữ liệu adset đang tùy chọn có thể không tồn tại ở khoảng thời gian khác. Vui lòng làm sạch bộ lọc"
    );
  } else {
    dom_choose_day.classList.toggle("active");
  }
});

let preset = "this%5fmonth";
// Select all li items in the dom_choose_day list
radio_choose_date[4].classList.add("active");
itemDate.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (item.dataset.date != preset) {
      if (index < itemDate.length - 1) {
        const iview = localStorage.getItem("iview");
        if (!iview) {
          filterData("");
        }
        dom_view_campaign.innerText = "Data for all campaigns";
        const view_adsetActive = document.querySelector(".view_adset.active");
        if (view_adsetActive) {
          view_adsetActive.classList.remove("active");
        }
        startDateGlobal = "";
        endDateGlobal = "";
        const radio_choose_dateActive = document.querySelector(
          ".dom_choose_day li .radio_box.active"
        );
        radio_choose_dateActive &&
          radio_choose_dateActive.classList.remove("active");
        radio_choose_date[index].classList.add("active");
        // Cập nhật nội dung của dom_choosed với nội dung của mục được chọn
        dom_choosed.innerText = item.innerText;
        // Lấy giá trị data-date
        const datePreset = item.getAttribute("data-date");

        // Lấy khoảng ngày phù hợp
        const formattedDate = getFormattedDateRange(datePreset);
        dom_choosed_day.innerText = formattedDate;

        // Gọi API với ngày đã chọn
        const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?level=adset&fields=campaign_name,adset_id,adset_name,spend,impressions,reach,actions,optimization_goal&date_preset=${datePreset}&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&access_token=${accessToken}&limit=1000`;
        const apiDaily = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=spend,reach,actions,date_start&time_increment=1&date_preset=${datePreset}&access_token=${accessToken}&limit=1000`;
        preset = datePreset;
        fetchData(apiUrl);
        fetchDailyInsights2(apiDaily);
        percentChart.classList.remove("adset");
      }
    }
  });
});

// document
//   .querySelector(".apply_custom_date")
//   .addEventListener("click", function () {
//     // Lấy giá trị từ các ô nhập ngày
//     dom_view_campaign.innerText = "Data for all campaigns";
//     const view_adsetActive = document.querySelector(".view_adset.active");
//     if (view_adsetActive) {
//       view_adsetActive.classList.remove("active");
//     }
//     const startDate = document.getElementById("start").value;
//     const endDate = document.getElementById("end").value;
//     startDateGlobal = startDate;
//     endDateGlobal = endDate;
//     percentChart.classList.remove("adset");
//     // Kiểm tra nếu người dùng nhập thiếu ngày
//     if (!startDate || !endDate) {
//       alert("Please select both start and end dates.");
//       return;
//     }

//     // Kiểm tra nếu ngày bắt đầu lớn hơn ngày kết thúc
//     if (new Date(startDate) > new Date(endDate)) {
//       alert("Start date cannot be later than the end date.");
//       return;
//     }
//     const radio_choose_dateActive = document.querySelector(
//       ".dom_choose_day li .radio_box.active"
//     );
//     radio_choose_dateActive &&
//       radio_choose_dateActive.classList.remove("active");
//     radio_choose_date[radio_choose_date.length - 1].classList.add("active");
//     // Gọi API với khoảng thời gian cụ thể
//     const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?level=adset&fields=campaign_name,adset_name,spend,impressions,reach,actions,optimization_goal&time_range={"since":"${startDate}","until":"${endDate}"}&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&access_token=${accessToken}&limit=1000`;
//     preset = null;
//     fetchData(apiUrl);
//     // if (!iview) {
//     //   filterData("");
//     // } else if (!viewCampaigns) {
//     //   filterData("", "", query);
//     //   renderReportPerformance();
//     // } else {
//     //   filterData(viewCampaigns, viewAdsets);
//     //   renderReportPerformance(viewCampaigns, viewAdsets);
//     // }

//     dom_choose_day.classList.remove("active");
//     dom_choosed_day.innerText = `${formatDate(startDate)} - ${formatDate(
//       endDate
//     )}`;
//     dom_choosed.innerText = `Custom time`;
//   });

// Hàm định dạng ngày thành dd/mm/yyyy
function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

// Hàm lấy khoảng ngày phù hợp theo preset
function getFormattedDateRange(preset) {
  const today = new Date();
  let startDate, endDate;

  switch (preset) {
    case "today":
      startDate = endDate = today;
      break;
    case "yesterday":
      startDate = new Date();
      startDate.setDate(today.getDate() - 1);
      endDate = startDate;
      break;
    case "last%5f3d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 3);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "last%5f7d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 7);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "last%5f30d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 30);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "this%5fmonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
      break;
    case "last%5fmonth":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "this%5fweek%5fmon%5ftoday":
      const currentDay = today.getDay();
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Calculate days back to Monday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday);
      endDate = today;
      break;
    case "last%5fweek%5fmon%5fsun":
      const lastWeekMonday = new Date(today);
      lastWeekMonday.setDate(today.getDate() - (today.getDay() + 6)); // Last week's Monday
      startDate = lastWeekMonday;
      const lastWeekSunday = new Date(today);
      lastWeekSunday.setDate(today.getDate() - (today.getDay() + 0)); // Last week's Sunday
      endDate = lastWeekSunday;
      break;
    case "this%5fquarter":
      const currentQuarterStart = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3,
        1
      );
      startDate = currentQuarterStart;
      endDate = today;
      break;
    case "last%5fquarter":
      const lastQuarterEnd = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3,
        0
      );
      const lastQuarterStart = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3 - 3,
        1
      );
      startDate = lastQuarterStart;
      endDate = lastQuarterEnd;
      break;
    default:
      return "";
  }

  return startDate.getTime() === endDate.getTime()
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

dom_choosed_day.innerText = getFormattedDateRange(preset);

// Render danh sách
quick_filter.forEach((item) => {
  const li = document.createElement("li");
  li.innerHTML = `
      <a class="" data-quick="${item}">
        <i class="fa-solid fa-bolt"></i> <span>${item}</span>
      </a>
    `;
  dom_quick_filter.appendChild(li);
});

const filterItems = document.querySelectorAll(".dom_quick_filter a");
// Hàm tạo URL API
function createApiUrl(baseField, adAccountId, filtering, preset, accessToken) {
  if (startDateGlobal && endDateGlobal) {
    return `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=${baseField}&filtering=${filtering}&time_range={"since":"${startDateGlobal}","until":"${endDateGlobal}"}&access_token=${accessToken}&limit=1000`;
  } else {
    return `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=${baseField}&filtering=${filtering}&date_preset=${preset}&access_token=${accessToken}&limit=1000`;
  }
}

// Xử lý sự kiện click cho từng item
const dom_view_campaign = document.querySelector(".dom_view_campaign");
const daily_title = document.querySelector(".daily_title");
const view_adset = document.querySelector(".view_adset");

// Hàm xử lý Active Class
function setActive(element, selector) {
  document
    .querySelectorAll(selector)
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
}

// Hàm xử lý Filter Click
function handleFilterClick(item, index) {
  percentChart.classList.remove("adset");
  setActive(item, ".dom_quick_filter li a");

  document.querySelector(".view_adset.active")?.classList.remove("active");

  const iview = localStorage.getItem("iview") || 1;
  dom_main_menu_a[iview * 1].click();

  localStorage.setItem("quickID", index);
  localStorage.setItem("query", item.dataset.quick);

  dom_view_campaign.innerText = "Data for all campaigns";
  renderReportPerformance();
  filterData("", "", item.dataset.quick);

  quickview_adset = false;
  viewCampaigns = "";
  viewAdsets = "";
}

// Gán sự kiện cho Filter Items
filterItems.forEach((item, index) => {
  item.addEventListener("click", () => handleFilterClick(item, index));
});

// Hàm xử lý Main Menu Click
function handleMenuClick(item, index) {
  setActive(item, ".dom_main_menu li a.active");

  const views = [
    () => {
      filterData("");
      dom_contentarea.classList.remove("viewPerformance", "viewDemographic");
      localStorage.removeItem("iview");
      document
        .querySelector(".dom_quick_filter a.active")
        ?.classList.remove("active");
    },
    viewPerformance,
    viewDemographic,
  ];

  views[index]?.();

  if (index !== 0) {
    localStorage.setItem("iview", index);
    const quickID = localStorage.getItem("quickID") || "0";
    const query = localStorage.getItem("query");

    setActive(filterItems[quickID * 1], ".dom_quick_filter a.active");

    if (viewCampaigns && viewCampaigns !== "Data for all campaigns") {
      filterData(viewCampaigns, viewAdsets);
    } else {
      filterData("", "", query);
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  dom_contentarea.classList.remove("viewQuickAdset");
}

// Gán sự kiện cho Main Menu Items
dom_main_menu_a.forEach((item, index) => {
  item.addEventListener("click", () => handleMenuClick(item, index));
});

function viewDemographic() {
  dom_contentarea.classList.add("viewDemographic");
  dom_contentarea.classList.remove("viewPerformance");
}
function viewPerformance() {
  dom_contentarea.classList.add("viewPerformance");
  dom_contentarea.classList.remove("viewDemographic");
}

async function fetchDataAge(api) {
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let ageGenderReach = {};

    allData.forEach((entry) => {
      const ageRange = entry.age || "Unknown";
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;

      // Tạo key kết hợp tuổi và giới tính (ví dụ: "18-24_male")
      const key = `${ageRange}_${gender}`;
      if (!ageGenderReach[key]) {
        ageGenderReach[key] = 0;
      }
      ageGenderReach[key] += reach;
    });

    // Chuyển đổi dữ liệu thành dạng phù hợp cho biểu đồ
    const ageLabels = [...new Set(allData.map((entry) => entry.age))].sort();
    const maleData = ageLabels.map((age) => ageGenderReach[`${age}_male`] || 0);
    const femaleData = ageLabels.map(
      (age) => ageGenderReach[`${age}_female`] || 0
    );

    // Gọi hàm vẽ biểu đồ
    drawAgeGenderChart(ageLabels, maleData, femaleData);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function fetchDataFlat(api) {
  try {
    let allData = []; // Mảng để lưu toàn bộ dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let platformReach = {};
    allData.forEach((entry) => {
      const platform = entry.publisher_platform || "Unknown";
      const reach = entry.reach || 0;
      if (!platformReach[platform]) {
        platformReach[platform] = 0;
      }
      platformReach[platform] += reach;
    });

    drawChart2(platformReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

let reachChartInstance = null; // Biến lưu trữ biểu đồ

function drawChart2(platformReach) {
  const ctx = document.getElementById("reachChart").getContext("2d");

  // Sắp xếp các nền tảng theo thứ tự mong muốn
  const platformOrder = [
    "audience_network",
    "facebook",
    "instagram",
    "messenger",
  ];

  // Sắp xếp lại dữ liệu platformReach theo đúng thứ tự yêu cầu
  const sortedPlatformReach = platformOrder.reduce((acc, platform) => {
    if (platformReach[platform]) {
      acc[platform] = platformReach[platform];
    }
    return acc;
  }, {});

  const platforms = Object.keys(sortedPlatformReach).map((platform) =>
    capitalizeFirstLetter(platform)
  );
  const reachValues = Object.values(sortedPlatformReach);

  // Kiểm tra và hủy biểu đồ cũ nếu đã tồn tại
  if (reachChartInstance) {
    reachChartInstance.destroy();
  }

  // Tạo biểu đồ mới
  reachChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "Total Reach",
          data: reachValues,
          backgroundColor: [
            "#ffab00",
            "#262a53", // Messenger
            "#cccccc", // Audience Network
            "#ffc756", // Instagram
          ],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
        title: {
          display: false, // Ẩn tiêu đề nếu không cần
        },
      },
    },
  });
}

async function fetchRegionData(api) {
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let regionReach = {};
    allData.forEach((entry) => {
      const region = entry.region || "Unknown";
      const reach = entry.reach || 0;
      if (!regionReach[region]) {
        regionReach[region] = 0;
      }
      regionReach[region] += reach;
    });

    drawRegionChart(regionReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

let ageGenderChartInstance;
function drawAgeGenderChart(ageLabels, maleData, femaleData) {
  const ctx = document.getElementById("ageGenderChart").getContext("2d");
  if (ageGenderChartInstance) {
    ageGenderChartInstance.destroy();
  }
  ageGenderChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ageLabels,
      datasets: [
        {
          label: "Male",
          data: maleData,
          backgroundColor: "#202449ed", // Màu xanh dương
        },
        {
          label: "Female",
          data: femaleData,
          backgroundColor: "#ffab00e3", // Màu hồng
        },
      ],
    },
    options: {
      borderRadius: 5,
      responsive: true,
      plugins: {
        legend: {
          position: "top", // Đặt chú thích ở dưới
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          stacked: false, // Hiển thị cột cạnh nhau
        },
        y: {
          beginAtZero: true,
        },
      },
      barPercentage: 0.8, // Kích thước cột nhỏ lại (0.1 - 1)
    },
  });
}

let regionChartInstance;
function drawRegionChart(regionReach) {
  const ctx = document.getElementById("regionChart").getContext("2d");

  // Tính tổng reach để lọc region có tỷ lệ quá thấp
  const totalReach = Object.values(regionReach).reduce(
    (sum, value) => sum + value * 1,
    0
  );

  const minThreshold = totalReach * 0.015; // Ngưỡng tối thiểu là 5% tổng reach

  // Lọc bỏ các region có reach quá thấp
  const filteredRegions = Object.entries(regionReach).filter(
    ([, value]) => value >= minThreshold
  );

  if (filteredRegions.length === 0) {
    console.warn("Không có khu vực nào đủ điều kiện để hiển thị.");
    return;
  }

  const regions = filteredRegions.map(([region]) =>
    region.replace(/\s*(Province|City)$/i, "").trim()
  );

  const reachValues = filteredRegions.map(([, value]) => value);

  if (regionChartInstance) {
    regionChartInstance.destroy();
  }

  regionChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: regions,
      datasets: [
        {
          data: reachValues,
          backgroundColor: [
            "#ffb524",
            "#ffb524",
            "#ffb524",
            "#ffb524",
            "#ffb524",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      borderRadius: 5,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      barPercentage: 0.6, // Kích thước cột nhỏ lại (0.1 - 1)
    },
  });
}

async function fetchGenderData(api) {
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let genderReach = {};
    allData.forEach((entry) => {
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;
      if (!genderReach[gender]) {
        genderReach[gender] = 0;
      }
      genderReach[gender] += reach;
    });

    // Gọi hàm vẽ biểu đồ tròn khi có dữ liệu
    drawGenderChart(genderReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

let genderChartInstance;
function drawGenderChart(genderReach) {
  const ctx = document.getElementById("genderChart").getContext("2d");

  // Chuyển đổi các giới tính và giá trị reach
  const genders = Object.keys(genderReach).map((gd) =>
    capitalizeFirstLetter(gd)
  );
  const reachValues = Object.values(genderReach);

  // Nếu biểu đồ đã tồn tại, hủy đi trước khi vẽ lại
  if (genderChartInstance) {
    genderChartInstance.destroy();
  }

  // Vẽ lại biểu đồ tròn
  genderChartInstance = new Chart(ctx, {
    type: "pie", // Biểu đồ tròn
    data: {
      labels: genders, // Các nhãn giới tính
      datasets: [
        {
          label: "Lượt Reach theo giới tính", // Tiêu đề cho dữ liệu
          data: reachValues, // Dữ liệu reach theo giới tính
          backgroundColor: [
            "#ffab00", // Màu cho Nữ
            "#262a53", // Màu cho Nam
            "#cccccc", // Màu cho Unknown nếu có
          ],
          hoverOffset: 4, // Hiệu ứng khi hover
        },
      ],
    },
    options: {
      responsive: true, // Đảm bảo biểu đồ linh hoạt với kích thước màn hình
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
      },
    },
  });
}

dom_select_view_acc.addEventListener("click", () => {
  dom_select_view_acc.classList.toggle("active");
});
// Toggle dropdown visibility
dom_select_view.addEventListener("click", () => {
  dom_select_view.classList.toggle("active");
});

// Update the chart with selected view
function updateChart(selectedView) {
  if (dailyChartInstance) {
    // Filter the dataset based on the selected view
    const filter = [...allDatasets];
    const filteredDataset = filter.filter(
      (dataset) => dataset.label === selectedView
    );

    if (filteredDataset.length > 0) {
      // Update chart with the selected dataset
      dailyChartInstance.data.datasets = filteredDataset;
      dailyChartInstance.update();
    } else {
      console.error("Dataset không tồn tại:", selectedView);
    }
  }
}

const dom_select_li_radio = document.querySelectorAll(
  ".dom_select_view.campaign ul li .radio_box"
);
dom_select_li_radio[6].classList.add("active");
// Handle click events for dropdown list items
dom_select_li.forEach((li, index) => {
  li.addEventListener("click", function () {
    const dom_select_li_radioActive = document.querySelector(
      ".dom_select_view.campaign ul li .radio_box.active"
    );
    dom_select_li_radioActive &&
      dom_select_li_radioActive.classList.remove("active");
    dom_select_li_radio[index].classList.add("active");
    const selectedView = this.getAttribute("data-view");
    view_selected_campaign.innerText = selectedView; //
    dataDailyFilter = selectedView;
    // Update displayed selected view
    // Call updateChart with the selected view
    updateChart(selectedView);
  });
});
const dom_select_li_radio_acc = document.querySelectorAll(
  ".dom_select_view.account ul li .radio_box"
);
dom_select_li_radio_acc[6].classList.add("active");
// Handle click events for dropdown list items
dom_select_li_acc.forEach((li, index) => {
  li.addEventListener("click", function () {
    const dom_select_li_radioActive = document.querySelector(
      ".dom_select_view.account ul li .radio_box.active"
    );
    dom_select_li_radioActive &&
      dom_select_li_radioActive.classList.remove("active");
    dom_select_li_radio_acc[index].classList.add("active");
    const selectedView = this.getAttribute("data-view");
    view_selected_account.innerText = selectedView;
    dataDailyFilter2 = selectedView;
    // Update displayed selected view
    // Call updateChart with the selected view
    updateChart2(selectedView);
  });
});
async function fetchDailyInsights(api) {
  document.querySelector(".loading").classList.add("active");

  try {
    let allData = []; // Store all data
    let nextUrl = api; // Initial URL

    // Fetch data with pagination
    while (nextUrl) {
      const response = await fetch(nextUrl);

      // Check if response is valid
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // Validate response format
      if (!data || typeof data !== "object") {
        throw new Error("Invalid API response format");
      }

      // Check for 'data' property in response
      if (!data.hasOwnProperty("data")) {
        console.error("Missing 'data' property in response:", data);
        throw new Error("Response does not contain 'data'");
      }

      if (data.error) {
        console.error("API Error:", data.error.message);
        document.querySelector(".loading").classList.remove("active");

        return;
      }

      if (!Array.isArray(data.data)) {
        console.warn("API response 'data' is not an array:", data.data);
        document.querySelector(".loading").classList.remove("active");

        break;
      }

      // Merge data into allData
      allData = [...allData, ...data.data];

      // Check if there's a next page
      nextUrl = data.paging?.next || null;
    }
    let dates = [];
    let spendValues = [];
    let reachValues = [];
    let messagingConversations = [];
    let postReactions = [];
    let pageLikes = [];
    let postEngagement = [];
    let linkClicks = [];
    let leads = [];
    document.querySelector(".loading").classList.remove("active");
    // No data to process
    if (allData.length === 0) {
      drawDailyChart(
        dates,
        spendValues,
        reachValues,
        messagingConversations,
        postReactions,
        pageLikes,
        postEngagement,
        linkClicks,
        leads
      );
      console.warn("No data available to draw the chart.");
      return;
    }

    allData.forEach((entry) => {
      const date = entry?.date_start || "Unknown Date";
      const spend = parseFloat(entry?.spend) || 0;
      const reach = parseFloat(entry?.reach) || 0;
      let messaging = 0;
      let reactions = 0;
      let likes = 0;
      let engagement = 0;
      let linkclick = 0;
      let lead = 0;

      // Check if actions exists and is an array
      if (entry.actions && Array.isArray(entry.actions)) {
        entry.actions.forEach((action) => {
          if (
            action?.action_type ===
            "onsite_conversion.messaging_conversation_started_7d"
          ) {
            messaging = action?.value || 0;
          }
          if (action?.action_type === "post_reaction") {
            reactions = action?.value || 0;
          }
          if (action?.action_type === "like") {
            likes = action?.value || 0;
          }
          if (action?.action_type === "post_engagement") {
            engagement = action?.value || 0;
          }
          if (action?.action_type === "link_click") {
            linkclick = action?.value || 0;
          }
          if (action?.action_type === "onsite_conversion.lead_grouped") {
            lead = action?.value || 0;
          }
        });
      }

      dates.push(date);
      spendValues.push(spend);
      reachValues.push(reach);
      messagingConversations.push(messaging);
      postReactions.push(reactions);
      pageLikes.push(likes);
      postEngagement.push(engagement);
      linkClicks.push(linkclick);
      leads.push(lead);
    });

    if (dates.length === 0) {
      document.querySelector(".loading").classList.remove("active");
      console.warn("No valid data to draw the chart.");
      return;
    }

    drawDailyChart(
      dates,
      spendValues,
      reachValues,
      messagingConversations,
      postReactions,
      pageLikes,
      postEngagement,
      linkClicks,
      leads
    );
  } catch (error) {
    document.querySelector(".loading").classList.remove("active");
    console.error("Fetch error:", error.message);
  }
  document.querySelector(".loading").classList.remove("active");
}
// Draw the daily chart with given data
let dataDailyFilter = "Spend";
let dataDailyFilter2 = "Spend";
function drawDailyChart(
  dates,
  spendValues,
  reachValues,
  messagingConversations,
  postReactions,
  pageLikes,
  postEngagement,
  linkClicks,
  lead
) {
  const ctx = document.getElementById("dailyChart").getContext("2d");
  const gradientSpend = ctx.createLinearGradient(0, 0, 0, 400);
  gradientSpend.addColorStop(0, "rgba(255, 171, 0,0.7)");
  gradientSpend.addColorStop(1, "rgba(255, 171, 0, 0.1)");
  // Destroy existing chart instance if any
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
  }

  // Save all datasets for future use
  allDatasets = [
    {
      label: "Post Engagement",
      data: postEngagement,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Leads",
      data: lead,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Link Click",
      data: linkClicks,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Spend",
      data: spendValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Reach",
      data: reachValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Messaging Conversations",
      data: messagingConversations,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Post Reactions",
      data: postReactions,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Page Likes",
      data: pageLikes,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.2,
    },
  ];

  // Default chart view with "Spend"
  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: allDatasets.filter(
        (dataset) => dataset.label === dataDailyFilter
      ),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 10, // Giảm kích thước chữ trục X (mặc định khoảng 12-14)
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 10, // Giảm kích thước chữ trục Y
            },
          },
        },
      },
    },
  });
}
let dailyChartInstance2;
async function fetchDailyInsights2(api) {
  try {
    let allData = []; // Store all data
    let nextUrl = api; // Initial URL

    // Fetch data with pagination
    while (nextUrl) {
      const response = await fetch(nextUrl);

      // Check if response is valid
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // Validate response format
      if (!data || typeof data !== "object") {
        throw new Error("Invalid API response format");
      }

      // Check for 'data' property in response
      if (!data.hasOwnProperty("data")) {
        console.error("Missing 'data' property in response:", data);
        throw new Error("Response does not contain 'data'");
      }

      if (data.error) {
        console.error("API Error:", data.error.message);
        return;
      }

      if (!Array.isArray(data.data)) {
        console.warn("API response 'data' is not an array:", data.data);
        break;
      }

      // Merge data into allData
      allData = [...allData, ...data.data];

      // Check if there's a next page
      nextUrl = data.paging?.next || null;
    }
    let dates = [];
    let spendValues = [];
    let reachValues = [];
    let messagingConversations = [];
    let postReactions = [];
    let pageLikes = [];
    let postEngagement = [];
    let linkClicks = [];
    let leads = [];
    // No data to process
    if (allData.length === 0) {
      drawDailyChart2(
        dates,
        spendValues,
        reachValues,
        messagingConversations,
        postReactions,
        pageLikes,
        postEngagement,
        linkClicks,
        leads
      );
      console.warn("No data available to draw the chart.");
      return;
    }

    allData.forEach((entry) => {
      const date = entry?.date_start || "Unknown Date";
      const spend = parseFloat(entry?.spend) || 0;
      const reach = parseFloat(entry?.reach) || 0;
      let messaging = 0;
      let reactions = 0;
      let likes = 0;
      let engagement = 0;
      let linkclick = 0;
      let lead = 0;

      // Check if actions exists and is an array
      if (entry.actions && Array.isArray(entry.actions)) {
        entry.actions.forEach((action) => {
          if (
            action?.action_type ===
            "onsite_conversion.messaging_conversation_started_7d"
          ) {
            messaging = action?.value || 0;
          }
          if (action?.action_type === "post_reaction") {
            reactions = action?.value || 0;
          }
          if (action?.action_type === "like") {
            likes = action?.value || 0;
          }
          if (action?.action_type === "post_engagement") {
            engagement = action?.value || 0;
          }
          if (action?.action_type === "link_click") {
            linkclick = action?.value || 0;
          }
          if (action?.action_type === "onsite_conversion.lead_grouped") {
            lead = action?.value || 0;
          }
        });
      }

      dates.push(date);
      spendValues.push(spend);
      reachValues.push(reach);
      messagingConversations.push(messaging);
      postReactions.push(reactions);
      pageLikes.push(likes);
      postEngagement.push(engagement);
      linkClicks.push(linkclick);
      leads.push(lead);
    });

    if (dates.length === 0) {
      console.warn("No valid data to draw the chart.");
      return;
    }

    drawDailyChart2(
      dates,
      spendValues,
      reachValues,
      messagingConversations,
      postReactions,
      pageLikes,
      postEngagement,
      linkClicks,
      leads
    );
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}
function updateChart2(selectedView) {
  if (dailyChartInstance2) {
    // Filter the dataset based on the selected view
    const filter = [...allDatasets2];
    const filteredDataset = filter.filter(
      (dataset) => dataset.label === selectedView
    );

    if (filteredDataset.length > 0) {
      // Update chart with the selected dataset
      dailyChartInstance2.data.datasets = filteredDataset;
      dailyChartInstance2.update();
    } else {
      console.error("Dataset không tồn tại:", selectedView);
    }
  }
}
function drawDailyChart2(
  dates,
  spendValues,
  reachValues,
  messagingConversations,
  postReactions,
  pageLikes,
  postEngagement,
  linkClicks,
  lead
) {
  const ctx = document.getElementById("dailyChart_Account").getContext("2d");
  const gradientSpend = ctx.createLinearGradient(0, 0, 0, 400);
  gradientSpend.addColorStop(0, "rgba(255, 171, 0,0.7)");
  gradientSpend.addColorStop(1, "rgba(255, 171, 0, 0.1)");
  // Destroy existing chart instance if any
  if (dailyChartInstance2) {
    dailyChartInstance2.destroy();
  }

  // Save all datasets for future use
  allDatasets2 = [
    {
      label: "Post Engagement",
      data: postEngagement,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Leads",
      data: lead,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Link Click",
      data: linkClicks,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Spend",
      data: spendValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Reach",
      data: reachValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Messaging Conversations",
      data: messagingConversations,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Post Reactions",
      data: postReactions,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
    {
      label: "Page Likes",
      data: pageLikes,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.4,
    },
  ];

  // Default chart view with "Spend"
  dailyChartInstance2 = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: allDatasets2.filter(
        (dataset) => dataset.label === dataDailyFilter2
      ),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 10, // Giảm kích thước chữ trục X (mặc định khoảng 12-14)
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 10, // Giảm kích thước chữ trục Y
            },
          },
        },
      },
    },
  });
}
// Hàm fetch dữ liệu từ API
async function fetchImpressionData(api) {
  try {
    const response = await fetch(api); // Fetch dữ liệu từ API
    const result = await response.json(); // Chuyển dữ liệu thành JSON

    // Kiểm tra dữ liệu trả về
    if (!result.data || !Array.isArray(result.data)) {
      console.error("Dữ liệu không hợp lệ:", result);
      return;
    }

    // Tự động tổng hợp số lượt hiển thị cho từng loại thiết bị
    const impressionsData = result.data.reduce((acc, entry) => {
      const device = entry.impression_device; // Lấy loại thiết bị từ impression_device
      const impressions = parseInt(entry.impressions, 10); // Đảm bảo impressions là số
      acc[device] = (acc[device] || 0) + impressions; // Cộng dồn số liệu
      return acc;
    }, {});

    // Vẽ biểu đồ với dữ liệu đã xử lý
    handleImpressionDevide(impressionsData);
    // drawDoughnutChart(impressionsData);
  } catch (error) {
    console.error("Lỗi khi fetch dữ liệu từ API:", error);
  }
}
const impression_chart_ul = document.querySelector(".impression_chart_ul");
function handleImpressionDevide(data) {
  if (data) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sắp xếp giảm dần theo impression
    let render = "";

    const maxImpression = entries.length > 0 && entries[0][1]; // Lấy giá trị impression lớn nhất để tính % độ dài thanh

    entries.forEach(([label, impression]) => {
      const widthPercentage = (impression / maxImpression) * 100; // Tính phần trăm chiều rộng của thanh
      render += `<li>
                <p><span>${formatLabel(label)}</span> <span>${formatNumber(
        impression
      )}</span></p>
                <p><span style="width: ${widthPercentage}%"></span></p>
              </li>`;
    });

    impression_chart_ul.innerHTML = render;
  }
}

// Định nghĩa hàm formatLabel
const formatLabel = (label) => {
  return label
    .split("_") // Tách các từ bằng dấu "_"
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Viết hoa chữ cái đầu, các chữ còn lại viết thường
    .join(" "); // Ghép lại thành chuỗi có khoảng trắng
};

// Định nghĩa màu sắc cố định cho từng loại thiết bị
const deviceColors = {
  android_smartphone: "#262a53",
  android_tablet: "#66b3ff",
  desktop: "#99ff99",
  ipad: "#ffcc99",
  iphone: "#ffab00",
  other: "#c2f0c2",
};

// Hàm vẽ biểu đồ Doughnut Chart
// function drawDoughnutChart(impressionsData) {
//   // Xóa biểu đồ cũ nếu đã tồn tại
//   if (impressionDoughnutChart) {
//     impressionDoughnutChart.destroy();
//   }

//   const ctx = document
//     .getElementById("impressionDoughnutChart")
//     ?.getContext("2d");

//   if (!ctx) {
//     console.error("Canvas context không hợp lệ");
//     return; // Nếu ctx không hợp lệ, không thể vẽ biểu đồ
//   }

//   // Lấy danh sách màu dựa trên thiết bị
//   const backgroundColors = Object.keys(impressionsData).map(
//     (device) => deviceColors[device] || "#999999" // Mặc định là màu xám nếu không tìm thấy màu
//   );

//   // Vẽ biểu đồ Doughnut Chart
//   impressionDoughnutChart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels: Object.keys(impressionsData).map(formatLabel), // Gắn nhãn từ dữ liệu
//       datasets: [
//         {
//           label: "Impressions",
//           data: Object.values(impressionsData), // Gắn giá trị từ dữ liệu
//           backgroundColor: backgroundColors, // Sử dụng màu cố định
//           borderWidth: 0,
//         },
//       ],
//     },
//     options: {
//       responsive: true,
//       plugins: {
//         legend: {
//           position: "bottom",
//           align: "center",
//           display: false,
//         },
//       },
//     },
//   });
// }

const downloadButtons = document.querySelectorAll(".download_btn");
downloadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const elementId = button.getAttribute("data-id"); // Lấy data-id từ icon
    let fileName = button.getAttribute("data-name") || "screenshot.png"; // Lấy data-name làm tên file, nếu không có thì mặc định là "screenshot.png"
    const query = localStorage.getItem("query");
    if (query) {
      fileName = `${fileName}`;
    }
    downloadElementAsPNG(elementId, `${fileName}.png`); // Gọi hàm download với id và tên file tương ứng
  });
});
function downloadElementAsPNG(elementId, filename) {
  const element = document.getElementById(elementId);

  html2canvas(element).then((canvas) => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  });
}
// _______________---

// Ví dụ gọi hàm update
const dom_bar = document.querySelector(".dom_bar");
const dom_bar_close = document.querySelector(".dom_bar_close");
const dom_zoom = document.querySelector(".dom_zoom");
const dom_sidebar = document.querySelector("#dom_sidebar");
dom_bar.addEventListener("click", () => {
  dom_sidebar.classList.add("active");
});
dom_bar_close.addEventListener("click", () => {
  dom_sidebar.classList.toggle("active");
});
dom_sidebar.addEventListener("click", () => {
  dom_sidebar.classList.remove("active");
});
dom_zoom.addEventListener("click", () => {
  dom_sidebar.classList.toggle("zoom");
  dom_contentarea.classList.toggle("zoom");
});
const segment_legend = document.querySelector(".segment_legend");
const progressBar = document.querySelector(".progress-bar");

// function updateProgressBar(reach, engagement, likePage, messages, traffic) {
//   const total = reach + engagement + likePage + messages + traffic;
//   const colors = [
//     "#ffa900",
//     "rgb(180, 123, 0)", // Màu cho reach
//     "rgb(116, 79, 0)", // Màu cho engagement
//     "rgb(57, 39, 0)", // Màu cho likePage
//     "rgb(127, 127, 127)", // Màu cho traffic
//     "#ffae00", // Màu cho message
//   ];

//   const segments = [
//     { name: "reach", value: (reach / total) * 100 },
//     { name: "engagement", value: (engagement / total) * 100 },
//     { name: "likepage", value: (likePage / total) * 100 },
//     { name: "traffic", value: (traffic / total) * 100 },
//     { name: "message", value: (messages / total) * 100 },
//   ];

//   let legendParts = [];
//   let i = 0;

//   // Xóa hết các phần tử segment cũ trong progress bar
//   progressBar.innerHTML = "";

//   // Lặp qua các segment để tạo ra các div mới nếu có giá trị
//   segments.forEach(({ name, value }) => {
//     if (value > 0) {
//       // Tạo phần tử segment mới
//       const segmentElement = document.createElement("div");
//       segmentElement.classList.add("segment");

//       // Cập nhật chiều rộng và màu sắc cho phần tử segment
//       segmentElement.style.width = `${value}%`;
//       segmentElement.style.backgroundColor = colors[i];

//       // Thêm phần tử segment vào progress bar
//       progressBar.appendChild(segmentElement);

//       // Thêm thông tin vào phần chú giải
//       legendParts.push(
//         `${name.charAt(0).toUpperCase() + name.slice(1)}: <b>${value.toFixed(
//           0
//         )}%</b>`
//       );

//       i++; // Tăng chỉ số màu sắc
//     }
//   });

//   // Cập nhật legend
//   segment_legend.innerHTML = legendParts.join(" | ");
// }
let progressBarChartInstance;
function updateProgressBar(
  reach,
  engagement,
  likePage,
  messages,
  traffic,
  lead
) {
  const total = reach + engagement + likePage + messages + traffic + lead;

  // Kiểm tra tránh lỗi chia cho 0
  if (total === 0) {
    console.warn("No data available to render chart.");
    return;
  }

  const values = [reach, engagement, likePage, messages, traffic, lead];
  const labels = [
    "Reach",
    "Engagement",
    "Like Page",
    "Messages",
    "Traffic",
    "Lead",
  ];
  const colors = [
    "#ffa900",
    "#ffa900",
    "#ffa900",
    "#ffa900",
    "#ffa900",
    "#ffa900",
  ];

  // Kiểm tra nếu chart đã tồn tại thì xóa
  if (window.progressBarChartInstance) {
    window.progressBarChartInstance.destroy();
  }

  // Tạo chart mới
  const ctx = document.getElementById("progressBarChart").getContext("2d");
  window.progressBarChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Spend",
          data: values,
          backgroundColor: colors,
          borderColor: "#333",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 10 }, // Kích thước số trục Y
          },
        },
        x: {
          ticks: {
            font: { size: 10 }, // Kích thước chữ trục X
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Ẩn legend
        },
      },
      // Chỉnh chiều rộng cột
      barPercentage: 0.7, // Kích thước cột nhỏ lại (0.1 - 1)
    },
  });
}

const dom_title_report_list = document.querySelector(
  ".dom_title_report_list > div"
);
function filterCampaignQuery() {
  let query = localStorage.getItem("query");
  let filteredCampaigns = [];
  const goalList = goalMapping[query];

  if (goalList) {
    filteredCampaigns = allData.filter((item) =>
      goalList.includes(item.optimization_goal)
    );
  } else {
    console.log("Loại chiến dịch không hợp lệ.");
  }

  const uniqueCampaignNames = [
    "Data for all campaigns",
    ...new Set(filteredCampaigns.map((item) => item.campaign_name)),
  ];
  console.log(uniqueCampaignNames);

  return uniqueCampaignNames;
}
function filterAdsetByCampaign(selectedCampaign) {
  let uniqueAdsetNames = ["Data for all adsets"];

  if (!selectedCampaign || selectedCampaign === "Data for all campaigns") {
    uniqueAdsetNames = [
      ...uniqueAdsetNames,
      ...new Set(allData.map((item) => item.adset_name)),
    ];
  } else {
    const filteredAdsets = allData.filter(
      (item) =>
        item.campaign_name.toLowerCase() === selectedCampaign.toLowerCase()
    );

    uniqueAdsetNames = [
      ...uniqueAdsetNames,
      ...new Set(filteredAdsets.map((item) => item.adset_name)),
    ];
  }

  return uniqueAdsetNames;
}

function renderTitleReport() {
  const uniqueCampaignNames = filterCampaignQuery();
  const dom_title_report_list_ul = document.querySelector(
    ".dom_title_report_list  ul"
  );
  let render = "";
  uniqueCampaignNames.forEach((item, index) => {
    render += `
    <li data-campaign="${item}"><span class="radio_box"></span> <span>${item}</span></li>
    `;
  });
  dom_title_report_list_ul.innerHTML = render;
  const dom_title_report_list_ul_li = document.querySelectorAll(
    ".dom_title_report_list.campaign  ul li"
  );
  const selectedCampaign =
    document.querySelector(".dom_view_campaign")?.innerText || "";

  document
    .querySelectorAll(".dom_title_report_list.campaign ul li")
    .forEach((li) => {
      const radioBox = li.querySelector(".radio_box");
      if (li.innerText.trim() === selectedCampaign) {
        radioBox?.classList.add("active");
      } else {
        radioBox?.classList.remove("active"); // Đảm bảo chỉ có 1 radio được active
      }
    });
  dom_title_report_list_ul_li.forEach((item, index) => {
    item.addEventListener("click", () => {
      let query = localStorage.getItem("query") || "";
      const check = document.querySelector(".dom_view_campaign");
      if (item.dataset.campaign != check.innerText) {
        if (index > 0) {
          const item_select = item.dataset.campaign;
          dom_view_campaign.innerText = item_select;
          percentChart.classList.add("adset");
          renderReportPerformance(item_select);
          filterData(item_select);
          view_adset.classList.add("active");
          viewAdset(item_select, index);
        } else {
          dom_view_campaign.innerText = "Data for all campaigns";
          renderReportPerformance();
          filterData("", "", query);
          view_adset.classList.remove("active");
          percentChart.classList.remove("adset");
        }
      }
      viewCampaigns = item.dataset.campaign;
      viewAdsets = "";
    });
  });
}

viewAdsetUlList.addEventListener("click", () => {
  viewAdsetUlList.classList.toggle("active");
});
document
  .querySelectorAll(".dom_title_report_list.campaign > div")
  .forEach((campaignDiv) => {
    campaignDiv.addEventListener("click", () => {
      document
        .querySelectorAll(".dom_title_report_list.adset > div.active")
        .forEach((adsetDiv) => adsetDiv.classList.remove("active"));
    });
  });

document
  .querySelectorAll(".dom_title_report_list.adset > div")
  .forEach((adsetDiv) => {
    adsetDiv.addEventListener("click", () => {
      document
        .querySelectorAll(".dom_title_report_list.campaign > div.active")
        .forEach((campaignDiv) => campaignDiv.classList.remove("active"));
    });
  });

function viewAdset(campaign_name, index) {
  const dom_title_report_list_ul_li_radioActive = document.querySelector(
    ".dom_title_report_list.campaign  ul li .radio_box.active"
  );
  dom_title_report_list_ul_li_radioActive &&
    dom_title_report_list_ul_li_radioActive.classList.remove("active");
  const dom_title_report_list_ul_li_radio = document.querySelectorAll(
    ".dom_title_report_list.campaign  ul li .radio_box"
  );
  const adsets = filterAdsetByCampaign(campaign_name);
  viewAdsetTitle.innerText = adsets[0];
  let render = "";
  adsets.forEach((item, index) => {
    render += `
    <li data-adsetname="${item}"><span class="radio_box"></span> <span>${item}</span></li>
    `;
  });
  viewAdsetUl.innerHTML = render;
  const viewAdsetUlLi = document.querySelectorAll(".view_adset ul li");
  viewAdsetUlLi.forEach((item, index) => {
    item.addEventListener("click", () => {
      if (item.dataset.adsetname != viewAdsetTitle.innerText) {
        if (index > 0) {
          renderReportPerformance(campaign_name, item.dataset.adsetname);
          filterData(campaign_name, item.dataset.adsetname);
        } else {
          renderReportPerformance(campaign_name);
          filterData(campaign_name);
        }
        viewAdsetTitle.innerText = item.dataset.adsetname;
      }
      if (index == 0) {
        viewAdsets = "";
      } else {
        viewAdsets = item.dataset.adsetname;
      }
    });
  });
  dom_title_report_list_ul_li_radio[index].classList.add("active");
}
dom_title_report_list.addEventListener("click", () => {
  dom_title_report_list.classList.toggle("active");
});

function filterUniqueCampaigns(data) {
  const uniqueCampaigns = new Map();

  data.forEach((item) => {
    const campaignName = item.campaign_name.toLowerCase();

    // Nếu campaign chưa có trong Map, thì thêm vào
    if (!uniqueCampaigns.has(campaignName)) {
      uniqueCampaigns.set(campaignName, item.campaign_name);
    }
  });

  // Trả về danh sách các campaign không trùng lặp
  return Array.from(uniqueCampaigns.values());
}
async function fetchHourlyData(api) {
  try {
    const response = await fetch(api);
    const data = await response.json();
    processHourlyData(data.data);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu theo giờ:", error);
  }
}
function processHourlyData(data) {
  const hours = [];
  const impressions = [];
  const spend = [];

  data.forEach((item) => {
    // Lấy phần giờ từ timestamp và chuyển sang định dạng 12 giờ
    const hour =
      item.hourly_stats_aggregated_by_advertiser_time_zone.split(":")[0];
    hours.push(`${hour * 1}h`); // Chỉ cần phần giờ
    impressions.push(item.impressions);
    spend.push(item.spend);
  });

  drawHourlyChart(hours, impressions, spend);
}

function drawHourlyChart(hours, impressions, spend) {
  const ctx = document.getElementById("hourlyChart").getContext("2d");

  // Tạo gradient cho background
  const gradientImpressions = ctx.createLinearGradient(0, 0, 0, 400);
  gradientImpressions.addColorStop(0, "rgba(48, 51, 86, 0.7)");
  gradientImpressions.addColorStop(1, "rgba(48, 51, 86, 0.1)");

  const gradientSpend = ctx.createLinearGradient(0, 0, 0, 400);
  gradientSpend.addColorStop(0, "rgba(255, 171, 0,0.7)");
  gradientSpend.addColorStop(1, "rgba(255, 171, 0, 0.1)");

  // Hủy chart cũ nếu có
  if (window.hourlyChartInstance) {
    window.hourlyChartInstance.destroy();
  }

  // Vẽ biểu đồ mới
  window.hourlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: hours, // Xử lý giờ, giờ chỉ hiển thị phần giờ
      datasets: [
        {
          label: "Impressions",
          data: impressions,
          backgroundColor: gradientImpressions,
          borderColor: "rgba(48, 51, 86, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Spend",
          data: spend,
          backgroundColor: gradientSpend,
          borderColor: "rgba(255, 171, 0, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
        },
      },
      scales: {
        x: {
          title: {
            display: false,
            text: "Giờ trong ngày",
          },
          ticks: {
            min: 0, // Giới hạn từ 0 giờ
            max: 23, // Giới hạn đến 23 giờ
            stepSize: 1, // Mỗi bước là 1 giờ
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: false,
            text: "Số lượng",
          },
        },
      },
    },
  });
}
const fixapp = document.querySelector("#fixapp");

fixapp.addEventListener("click", () => {
  // Xóa toàn bộ dữ liệu trong localStorage
  localStorage.clear();

  // Reload lại trang
  location.reload();
});

// const dom_role = document.querySelector("#dom_role");
// const dom_role_container = document.querySelector(".dom_role_container");
// const dom_role_container_overlay = document.querySelector(
//   ".dom_role_container_overlay"
// );
// const closeRole = document.querySelector(".dom_role_container > i");

// dom_role.addEventListener("click", () => {
//   dom_role_container.classList.add("active");
// });
// dom_role_container_overlay.addEventListener("click", () => {
//   dom_role_container.classList.remove("active");
// });
// closeRole.addEventListener("click", () => {
//   dom_role_container.classList.remove("active");
// });

function updateDonut(impression, reach) {
  const donut = document.querySelector(".semi-donut");
  const frequencyNumber = donut.querySelector(".frequency_number");

  // Kiểm tra dữ liệu hợp lệ
  if (!impression || !reach || reach === 0) {
    donut.style.setProperty("--percentage", 0); // Đặt % bằng 0
    donut.style.setProperty("--fill", "#ccc"); // Màu xám nhạt cho trạng thái trống
    frequencyNumber.textContent = "0"; // Hiển thị số 0
    return;
  }

  // Tính toán tỷ lệ Impression/Reach
  const frequency = (impression / reach).toFixed(2);
  const percentage = Math.floor((impression * 100) / reach / 4);

  // Cập nhật các giá trị trong HTML
  donut.style.setProperty("--percentage", percentage);
  donut.style.setProperty("--fill", "#ffa900");

  frequencyNumber.textContent = frequency;
}

const dom_quick_close = document.querySelector(".dom_quick_close");
const dom_quickadset_overlay = document.querySelector(
  ".dom_quickadset_overlay"
);
dom_quick_close.addEventListener("click", handleCloseQuickAdset);
dom_quickadset_overlay.addEventListener("click", handleCloseQuickAdset);
function handleCloseQuickAdset() {
  quickview_adset = false;
  dom_contentarea.classList.remove("viewQuickAdset");
  dom_contentarea.classList.remove("viewPerformance");
  dom_contentarea.classList.remove("viewDemographic");
  // window.scrollTo({ top: 0, behavior: "smooth" });
  const query = localStorage.getItem("query");
  const iview = localStorage.getItem("iview");
  if (iview) {
    dom_contentarea.classList.add("viewPerformance");
    if (viewCampaigns && viewCampaigns !== "Data for all campaigns") {
      renderReportPerformance(viewCampaigns, viewAdsets);
    } else {
      console.log("ELSE");

      renderReportPerformance();
    }
  } else {
    renderReportPerformance();
  }

  dom_table_data.scrollIntoView();
}
function renderReportPerformance(campaign_name = "", adset_name = "") {
  renderTitleReport();
  const dom_title_reporth2 = document.querySelector(".dom_title_report h2");
  const iview = localStorage.getItem("iview");
  const query = localStorage.getItem("query") || "";
  const quickID = localStorage.getItem("quickID");
  const activeItem = document.querySelector(".dom_quick_filter a.active");

  // Xử lý quickview

  // Xây dựng filter động
  const filters = [{ field: "spend", operator: "GREATER_THAN", value: 0 }];

  if (campaign_name) {
    filters.push({
      field: "campaign.name",
      operator: "EQUAL",
      value: campaign_name,
    });
  }
  if (adset_name) {
    filters.push({ field: "adset.name", operator: "EQUAL", value: adset_name });
  }
  if (!adset_name && !campaign_name) {
    filters.push({
      field: "adset.optimization_goal",
      operator: "IN",
      value: goalMapping[query],
    });
  }

  const filtering = JSON.stringify(filters);

  // API endpoints
  const breakdowns = {
    platform: "campaign_name,reach&breakdowns=publisher_platform",
    age: "campaign_name,reach&breakdowns=age,gender",
    region: "campaign_name,reach&breakdowns=region",
    gender: "campaign_name,reach&breakdowns=gender",
    daily: "spend,reach,actions,date_start&time_increment=1",
    device: "campaign_name,impressions&breakdowns=impression_device",
    hourly:
      "campaign_name,impressions,spend&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone",
  };

  const fetchFunctions = {
    platform: fetchDataFlat,
    age: fetchDataAge,
    region: fetchRegionData,
    gender: fetchGenderData,
    daily: fetchDailyInsights,
    device: fetchImpressionData,
    hourly: fetchHourlyData,
  };

  // Tự động gọi các API
  Object.entries(breakdowns).forEach(([key, breakdown]) => {
    const apiUrl = createApiUrl(
      breakdown,
      adAccountId,
      filtering,
      preset,
      accessToken
    );
    fetchFunctions[key](apiUrl);
  });
  if (!quickview_adset) {
    if (iview) {
      activeItem?.classList.remove("active");
      dom_main_menu_a[iview]?.click();
      filterItems[quickID]?.classList.add("active");
      console.log(campaign_name);

      filterData(campaign_name, adset_name, query);
    } else {
      filterData("");
    }
    dom_title_reporth2.innerText = `Report for ${query}`;
  } else {
    dom_title_reporth2.innerText = `Report for ${campaign_name} - ${adset_name}`;
    filterData(campaign_name, adset_name);
  }
}

document.addEventListener("click", function (event) {
  const activeElement = document.querySelector(".dom_choose_day.active");

  // Kiểm tra nếu có phần tử active và click không nằm trong nó hoặc các phần tử con
  if (activeElement && !event.target.closest(".dom_choose_day")) {
    activeElement.classList.remove("active");
  }
});

// Hàm lấy tham số từ URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Hàm cập nhật URL khi chọn ngày mới
function updateURL(start, end) {
  const newURL = new URL(window.location);
  newURL.searchParams.set("start", formatToDMY(start));
  newURL.searchParams.set("end", formatToDMY(end));
  window.history.pushState({}, "", newURL); // Cập nhật URL mà không tải lại trang
}

// Chuyển định dạng yyyy-mm-dd -> dd/mm/yyyy (để hiển thị trên URL)
function formatToDMY(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd/mm/yyyy
}

// Chuyển định dạng dd/mm/yyyy -> yyyy-mm-dd (để dùng với input type="date")
function formatToISO(dateStr) {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-mm-dd
  }
  return "";
}

// Kiểm tra ngày hợp lệ
function isValidDate(dateStr) {
  return !isNaN(new Date(dateStr).getTime());
}

document
  .querySelector(".apply_custom_date")
  .addEventListener("click", function () {
    // Lấy giá trị từ các ô nhập ngày
    dom_view_campaign.innerText = "Data for all campaigns";
    const view_adsetActive = document.querySelector(".view_adset.active");
    if (view_adsetActive) {
      view_adsetActive.classList.remove("active");
    }

    const startDate = document.getElementById("start").value;
    const endDate = document.getElementById("end").value;
    startDateGlobal = startDate;
    endDateGlobal = endDate;
    percentChart.classList.remove("adset");

    // Kiểm tra nếu người dùng nhập thiếu ngày
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    // Kiểm tra nếu ngày bắt đầu lớn hơn ngày kết thúc
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be later than the end date.");
      return;
    }

    updateURL(startDate, endDate); // Cập nhật URL

    const radio_choose_dateActive = document.querySelector(
      ".dom_choose_day li .radio_box.active"
    );
    radio_choose_dateActive &&
      radio_choose_dateActive.classList.remove("active");
    radio_choose_date[radio_choose_date.length - 1].classList.add("active");

    // Gọi API với khoảng thời gian cụ thể
    const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?level=adset&fields=campaign_name,adset_name,spend,impressions,reach,actions,optimization_goal,status&time_range={"since":"${startDate}","until":"${endDate}"}&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&access_token=${accessToken}&limit=1000`;
    const apiDaily = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=spend,reach,actions,date_start&time_increment=1&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}&limit=1000`;
    preset = null;
    fetchData(apiUrl);
    fetchDailyInsights2(apiDaily);

    dom_choose_day.classList.remove("active");
    dom_choosed_day.innerText = `${formatDate(startDate)} - ${formatDate(
      endDate
    )}`;
    dom_choosed.innerText = `Custom time`;
  });

// Hàm khởi tạo ngày từ URL
function initDateFromURL() {
  const start = getQueryParam("start");
  const end = getQueryParam("end");
  console.log(start, end);

  if (start && end) {
    const startDate = formatToISO(start);
    const endDate = formatToISO(end);
    console.log(startDate, endDate);

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      console.warn("Invalid date format in URL.");
      return;
    }

    document.getElementById("start").value = startDate;
    document.getElementById("end").value = endDate;

    // Gọi sự kiện click để áp dụng bộ lọc như khi bấm nút
    document.querySelector(".apply_custom_date").click();
  }
}

// Lắng nghe sự kiện khi người dùng chọn ngày
function renderTopAdset(allData) {
  // Nhóm các adset theo tên campaign
  const adsetTop = allData.reduce((totals, adset) => {
    const adsetName = adset.adset_name || "Unknown Campaign"; // Lấy tên campaign hoặc gán mặc định nếu không có
    const spend = parseFloat(adset.spend) || 0; // Lấy spend hoặc gán 0 nếu không có
    // Kiểm tra campaign đã tồn tại trong danh sách chưa
    totals.push({ name: adsetName, spend });
    return totals;
  }, []);

  // Sắp xếp các campaign theo tổng spend giảm dần
  adsetTop.sort((a, b) => b.spend - a.spend);

  // Render lên giao diện
  const ulElement = document.querySelector(".dom_chart_most_ul"); // Phần tử danh sách trên UI
  ulElement.innerHTML = ""; // Xóa nội dung cũ nếu có
  adsetTop.forEach((campaign) => {
    const li = document.createElement("li");
    li.innerHTML = `<p><span>${campaign.name}</span> <span>${formatCurrency(
      campaign.spend
    )}</span></p> <p> <span style="width: ${
      (campaign.spend * 100) / adsetTop[0].spend
    }%"></span> </p>`;
    ulElement.appendChild(li);
  });
}
// Gọi hàm khi trang tải
document.addEventListener("DOMContentLoaded", () => {
  const start = getQueryParam("start");
  const end = getQueryParam("end");
  if (start && end) {
    initDateFromURL();
  } else {
    fetchData(apiUrl);
    fetchDailyInsights2(apiDaily);
  }
});
dom_highest_switch_btn = document.querySelectorAll(
  ".dom_highest_switch > div p"
);
dom_highest_switch_btn.forEach((item, index) => {
  item.addEventListener("click", () => {
    setActive(item, ".dom_highest_switch > div p");
    if (index == 0) {
      renderTopCampaigns(allData);
    } else {
      renderTopAdset(allData);
    }
  });
});

async function getAdPostFromAdSet(adset_id) {
  try {
    // 🔹 Bước 1: Lấy danh sách Ads trong Adset
    const adsResponse = await fetch(
      `https://graph.facebook.com/v16.0/${adset_id}/ads?fields=id,name,creative&access_token=${accessToken}`
    );
    const adsData = await adsResponse.json();

    if (!adsData.data || adsData.data.length === 0) {
      console.log("Không có quảng cáo nào trong Adset này.");
      return;
    }

    // 🔹 Bước 2: Lấy bài post từ creative của Ads đầu tiên
    const adCreativeId = adsData.data[0]?.creative?.id;
    if (!adCreativeId) {
      console.log("Không tìm thấy Creative cho Ad này.");
      return;
    }

    const creativeResponse = await fetch(
      `https://graph.facebook.com/v16.0/${adCreativeId}?fields=object_story_id&access_token=${accessToken}`
    );
    const creativeData = await creativeResponse.json();
    const postId = creativeData.object_story_id;

    if (!postId) {
      console.log("Không tìm thấy bài post của quảng cáo.");
      return;
    }

    // 🔹 Bước 3: Hiển thị link bài post
    console.log(`Bài post quảng cáo: https://www.facebook.com/${postId}`);
  } catch (error) {
    console.error("Lỗi khi lấy bài post quảng cáo:", error);
  }
}

// 🟢 Gọi hàm với adset_id và access_token của bạn
getAdPostFromAdSet("120215999275420636");
