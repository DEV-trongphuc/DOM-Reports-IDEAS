const accessToken =
  "EAAQwS9m6tIABO8ZCZCvO4TtPBXcbilAYn3nwZCZB739B8GtMfy2V2uJmgjHMtvsdKS6XMl7YiBuXqg3BxTdh37H7Vv5qYcsZA7IqVYMLqHX3FhQdxD8fSguISa0sDg1INzOfVtUCt8OoNqh0j6PXvu50rZCgMerGZAJ7NAYgLYuTsPw8NvdOEdF5kRX9C0ctu1ka7CS6VcbbXosWnMM"; // Token của bạn
const adAccountId = "1852318231510577"; // ID tài khoản quảng cáo
const quick_filter = [
  "Lead Form",
  "Awareness",
  "Engagement",
  "Message",
  "Pagelike",
  "Traffic",
];
const goalMapping = {
  "Lead Form": ["LEAD_GENERATION", "QUALITY_LEAD"],
  Awareness: ["REACH", "AD_RECALL_LIFT", "IMPRESSIONS"],
  Engagement: ["POST_ENGAGEMENT", "THRUPLAY", "EVENT_RESPONSES"],
  Message: ["REPLIES"],
  Traffic: [
    "OFFSITE_CONVERSIONS",
    "LINK_CLICKS",
    "PROFILE_VISIT",
    "LADING_PAGE_VIEWS",
  ],
  Pagelike: ["PAGE_LIKES"],
};
