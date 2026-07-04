import { defineMcp } from "@lovable.dev/mcp-js";
import listBusinesses from "./tools/list-businesses";
import getBusiness from "./tools/get-business";
import listOffers from "./tools/list-offers";
import communityStats from "./tools/community-stats";

export default defineMcp({
  name: "lien-minh-lien-doanh-mcp",
  title: "Liên Minh Liên Doanh",
  version: "0.1.0",
  instructions:
    "Truy cập dữ liệu công khai của cộng đồng Liên Minh Liên Doanh tại Đà Lạt: danh sách doanh nghiệp đã duyệt, ưu đãi đang hoạt động và thống kê cộng đồng. Dùng list_businesses/get_business để khám phá doanh nghiệp, list_offers cho ưu đãi, community_stats cho tổng quan.",
  tools: [listBusinesses, getBusiness, listOffers, communityStats],
});
