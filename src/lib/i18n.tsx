import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "vi" | "en";

// Chỉ dịch "khung app cố định" (nav, nút bấm, nhãn) — KHÔNG dịch nội dung do người
// dùng tự viết (mô tả DN, đánh giá, tin nhắn...). Thêm khoá mới ở đây khi cần mở rộng.
const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    "nav.home": "Trang chủ",
    "nav.explore": "Khám phá",
    "nav.community": "Cộng đồng",
    "nav.admin": "Admin",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.delete": "Xóa",
    "common.send": "Gửi",
    "common.loading": "Đang tải…",
    "common.logout": "Đăng xuất",
    "common.login": "Đăng nhập",
    "common.register": "Đăng ký",
    "common.edit": "Chỉnh sửa",
    "common.collapse": "Thu gọn",
    "common.search": "Tìm kiếm",
    "common.loadMore": "Tải thêm",
    "common.confirm": "Xác nhận",
    "common.back": "Quay lại",
    "profile.personal": "Hồ sơ cá nhân",
    "profile.business": "Hồ sơ doanh nghiệp",
    "profile.createBusiness": "Tạo hồ sơ doanh nghiệp",
    "profile.guide": "Hướng dẫn",
    "profile.myReports": "Báo cáo của tôi",
    "profile.settings": "Cài đặt",
    "type.food": "Ăn uống",
    "type.service": "Dịch vụ",
    "type.stay": "Lưu trú",
    "type.travel": "Du lịch",
    "type.creator": "Sáng tạo nội dung",
    "type.freelance": "Freelance",
    "type.broker": "Môi giới",
    "type.other": "Khác",
    "stats.members": "Thành viên",
    "stats.businesses": "Doanh nghiệp",
    "stats.offers": "Ưu đãi",
    "stats.offersClaimed": "Ưu đãi đã nhận",
    "home.featured": "Doanh nghiệp nổi bật",
    "home.exploreBusinesses": "Khám phá doanh nghiệp",
    "home.noFeatured": "Chưa có doanh nghiệp nổi bật",
    "common.searchPlaceholder": "Tìm kiếm…",
    "common.noResults": "Không có kết quả",
    "home.badge": "✦ Hệ sinh thái cộng đồng",
    "home.heroTitle": "Nơi thành viên và doanh nghiệp cùng phát triển",
    "app.tagline": "Một cộng đồng – Nhiều giá trị",
    "home.contactAdmin": "Liên hệ ban quản trị",
    "home.joinNow": "Tham gia ngay",
    "common.all": "Tất cả",
    "explore.searchPlaceholder": "Tìm doanh nghiệp trong cộng đồng...",
    "explore.area": "Khu vực:",
    "explore.allAreas": "Tất cả khu vực",
    "sort.nearby": "Gần đây",
    "sort.requestingLocation": "Đang xin quyền…",
    "sort.rating": "Đánh giá cao",
    "sort.mostClaimed": "Nhiều ưu đãi được nhận",
    "sort.newest": "Mới nhất",
    "explore.underKm": "Dưới {r}km",
    "explore.locationDenied":
      'Bạn đã từ chối quyền định vị. Vào cài đặt trình duyệt để bật lại rồi bấm "Gần đây" lần nữa.',
    "explore.locationUnsupported": "Trình duyệt của bạn không hỗ trợ định vị.",
    "explore.noResultsRadius": "Chưa có doanh nghiệp nào trong bán kính {r}km. Thử tăng bán kính lên xem sao.",
    "explore.noResults": "Không tìm thấy kết quả phù hợp",
    "biz.offers": "Ưu đãi",
    "biz.reviews": "Đánh giá",
    "biz.writeReview": "Viết đánh giá",
    "biz.noReviews": "Chưa có đánh giá nào",
    "biz.claimOffer": "Nhận ưu đãi",
    "biz.message": "Nhắn tin",
    "biz.report": "Báo cáo",
    "biz.follow": "Theo dõi",
    "biz.following": "Đang theo dõi",
    "biz.followers": "{n} người theo dõi",
    "biz.claimsCount": "Đã có {n} lượt nhận",
    "biz.viewList": "Xem danh sách",
    "biz.pinInstructions": "Hỏi nhân viên/chủ quán mã PIN (4-8 ký tự) để xác nhận bạn đang có mặt tại đây.",
    "biz.enterPin": "Nhập mã PIN",
    "biz.checking": "Đang kiểm tra…",
    "biz.yourCode": "Mã ưu đãi của bạn",
    "biz.showCode":
      "Xuất trình mã này cho nhân viên doanh nghiệp để xác nhận thủ công. Mã hết hạn sau 2 giờ. Mỗi lần ghé thăm bạn có thể nhận một mã mới.",
    "biz.codeExpired": "Mã đã hết hạn",
    "biz.timeLeft": "Còn lại {time}",
    "biz.writeReviewTitle": "Viết đánh giá",
    "biz.commentPlaceholder": "Nhận xét…",
    "biz.addPhoto": "Thêm ảnh (tùy chọn)",
    "biz.noOneClaimed": "Chưa có ai nhận",
    "biz.reply": "Trả lời",
    "biz.replyPlaceholder": "Trả lời đánh giá…",
  },
  en: {
    "nav.home": "Home",
    "nav.explore": "Explore",
    "nav.community": "Community",
    "nav.admin": "Admin",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.send": "Send",
    "common.loading": "Loading…",
    "common.logout": "Log out",
    "common.login": "Log in",
    "common.register": "Sign up",
    "common.edit": "Edit",
    "common.collapse": "Collapse",
    "common.search": "Search",
    "common.loadMore": "Load more",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "profile.personal": "Personal Profile",
    "profile.business": "Business Profile",
    "profile.createBusiness": "Create Business Profile",
    "profile.guide": "Guide",
    "profile.myReports": "My Reports",
    "profile.settings": "Settings",
    "type.food": "Food & Drink",
    "type.service": "Service",
    "type.stay": "Accommodation",
    "type.travel": "Travel",
    "type.creator": "Content Creator",
    "type.freelance": "Freelance",
    "type.broker": "Broker",
    "type.other": "Other",
    "stats.members": "Members",
    "stats.businesses": "Businesses",
    "stats.offers": "Offers",
    "stats.offersClaimed": "Offers claimed",
    "home.featured": "Featured Businesses",
    "home.exploreBusinesses": "Explore Businesses",
    "home.noFeatured": "No featured businesses yet",
    "common.searchPlaceholder": "Search…",
    "common.noResults": "No results",
    "home.badge": "✦ Community Ecosystem",
    "home.heroTitle": "Where members and businesses grow together",
    "app.tagline": "One community – Many values",
    "home.contactAdmin": "Contact the admin team",
    "home.joinNow": "Join now",
    "common.all": "All",
    "explore.searchPlaceholder": "Search businesses in the community...",
    "explore.area": "Area:",
    "explore.allAreas": "All areas",
    "sort.nearby": "Nearby",
    "sort.requestingLocation": "Requesting…",
    "sort.rating": "Top rated",
    "sort.mostClaimed": "Most claimed",
    "sort.newest": "Newest",
    "explore.underKm": "Under {r}km",
    "explore.locationDenied":
      'You denied location access. Enable it in your browser settings, then tap "Nearby" again.',
    "explore.locationUnsupported": "Your browser doesn't support location.",
    "explore.noResultsRadius": "No businesses within {r}km yet. Try increasing the radius.",
    "explore.noResults": "No matching results",
    "biz.offers": "Offers",
    "biz.reviews": "Reviews",
    "biz.writeReview": "Write a review",
    "biz.noReviews": "No reviews yet",
    "biz.claimOffer": "Claim offer",
    "biz.message": "Message",
    "biz.report": "Report",
    "biz.follow": "Follow",
    "biz.following": "Following",
    "biz.followers": "{n} followers",
    "biz.claimsCount": "{n} claimed",
    "biz.viewList": "View list",
    "biz.pinInstructions": "Ask staff for the PIN code (4-8 characters) to confirm you're here in person.",
    "biz.enterPin": "Enter PIN",
    "biz.checking": "Checking…",
    "biz.yourCode": "Your offer code",
    "biz.showCode":
      "Show this code to staff to confirm manually. It expires in 2 hours. You can get a new code on your next visit.",
    "biz.codeExpired": "Code expired",
    "biz.timeLeft": "{time} left",
    "biz.writeReviewTitle": "Write a review",
    "biz.commentPlaceholder": "Your comment…",
    "biz.addPhoto": "Add photo (optional)",
    "biz.noOneClaimed": "No claims yet",
    "biz.reply": "Reply",
    "biz.replyPlaceholder": "Reply to review…",
  },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "vi") return saved;
    } catch {}
    return "vi";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let s = DICT[lang][key] ?? DICT.vi[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return s;
  };

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
