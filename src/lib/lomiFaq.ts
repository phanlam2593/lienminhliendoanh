// ─────────────────────────────────────────────────────────────────────────────
// CÂU HỎI THƯỜNG GẶP CỦA LOMI (26/09) — trả lời SẴN, không gọi AI (không tốn lượt, không tốn
// credit, ai cũng dùng được kể cả chưa có Membership). Lomi dùng danh sách này theo 2 cách:
//   1) Người dùng bấm chọn câu hỏi trong mục "Câu hỏi thường gặp".
//   2) Người dùng tự gõ: nếu câu gõ khớp từ khoá của 1 mục (so khớp không dấu) → trả lời ngay
//      bằng nội dung soạn sẵn; không khớp mới gửi cho AI (chỉ Membership).
// Sửa nội dung ở đây khi app đổi tính năng. Đường dẫn dạng /duong-dan trong câu trả lời sẽ tự
// thành link bấm được trong khung chat.
// ─────────────────────────────────────────────────────────────────────────────

export type FaqCat = "start" | "offers" | "biz" | "quet" | "rides" | "chat" | "profile" | "account";
export type Faq = { id: string; cat: FaqCat; q: { vi: string; en: string }; a: { vi: string; en: string }; kw: string[] };

export const FAQ_CATS: { id: FaqCat; vi: string; en: string; emoji: string }[] = [
  { id: "start", vi: "Bắt đầu", en: "Getting started", emoji: "🌱" },
  { id: "offers", vi: "Ưu đãi", en: "Offers", emoji: "🎁" },
  { id: "biz", vi: "Doanh nghiệp", en: "Business", emoji: "🏪" },
  { id: "quet", vi: "Quẹt", en: "Swipe", emoji: "💘" },
  { id: "rides", vi: "Đưa đón", en: "Rides", emoji: "🛵" },
  { id: "chat", vi: "Chat & Cộng đồng", en: "Chat & Community", emoji: "💬" },
  { id: "profile", vi: "Hồ sơ", en: "Profile", emoji: "👤" },
  { id: "account", vi: "Tài khoản & Cài đặt", en: "Account & Settings", emoji: "⚙️" },
];

export const FAQS: Faq[] = [
  // ── Bắt đầu ──
  {
    id: "what",
    cat: "start",
    q: { vi: "Liên Minh Liên Doanh là gì?", en: "What is Liên Minh Liên Doanh?" },
    a: {
      vi: "Liên Minh Liên Doanh là cộng đồng kết nối thành viên và doanh nghiệp địa phương 🌿\n• Khám phá quán, dịch vụ theo khu vực (/kham-pha)\n• Nhận ưu đãi riêng cho thành viên (/uu-dai)\n• Quẹt tìm bạn chơi game, làm quen, việc làm, trao đổi (/quet)\n• Đặt xe, giao hàng với tài xế trong cộng đồng (/dua-don)\n• Chat theo khu vực ở Cộng đồng (/cong-dong)",
      en: "Liên Minh Liên Doanh is a community connecting members and local businesses 🌿\n• Explore places by area (/kham-pha)\n• Claim member offers (/uu-dai)\n• Swipe to find gamers, friends, jobs, trades (/quet)\n• Book rides & deliveries with community drivers (/dua-don)\n• Chat by area in Community (/cong-dong)",
    },
    kw: ["app nay la gi", "lien minh lien doanh la gi", "app dung de lam gi", "gioi thieu app", "what is this app"],
  },
  {
    id: "approve",
    cat: "start",
    q: { vi: "Sao tài khoản của mình đang chờ duyệt?", en: "Why is my account pending?" },
    a: {
      vi: "Mỗi tài khoản mới đều được Ban quản trị duyệt tay để giữ cộng đồng an toàn. Thường chỉ mất một lúc thôi. Trong lúc chờ bạn vẫn xem được Hồ sơ, Tin nhắn và Thông báo. Duyệt xong app sẽ báo cho bạn 🔔",
      en: "Every new account is reviewed by the admins to keep the community safe — usually quick. While waiting you can still use Profile, Messages and Notifications. You'll get a notification once approved 🔔",
    },
    kw: ["cho duyet", "chua duoc duyet", "duyet tai khoan", "pending", "bao lau duoc duyet", "chua duyet"],
  },
  {
    id: "membership",
    cat: "start",
    q: { vi: "Membership là gì, có mất phí không?", en: "What is Membership? Is it paid?" },
    a: {
      vi: "Membership mở khoá các quyền lợi thành viên:\n• Nhận ưu đãi từ doanh nghiệp\n• Quẹt không giới hạn (tài khoản thường 10 lượt/ngày)\n• Hỏi Lomi AI 20 câu/ngày\nTài khoản mới được duyệt sẽ có 3 tháng Membership miễn phí. Xem hạn Membership trong Hồ sơ → Thông tin cá nhân (/ho-so?view=personal).",
      en: "Membership unlocks member perks:\n• Claim business offers\n• Unlimited swipes (regular accounts: 10/day)\n• Ask Lomi AI 20 questions/day\nNewly approved accounts get 3 months of Membership free. Check your expiry in Profile → Personal info (/ho-so?view=personal).",
    },
    kw: ["membership", "membership la gi", "thanh vien", "hoi vien", "mat phi", "tra phi", "membership het han", "het han membership", "gia han", "mien phi 3 thang", "phi thanh vien", "dang ky membership"],
  },
  {
    id: "points",
    cat: "start",
    q: { vi: "Điểm và cấp bậc hoạt động thế nào?", en: "How do points and levels work?" },
    a: {
      vi: "Bạn tích điểm khi hoạt động trong app. Đủ điểm sẽ lên hạng:\n🥉 Đồng 100 · 🥈 Bạc 500 · 🥇 Vàng 1.000 · 💠 Bạch kim 2.000 · 💎 Kim cương 5.000 · 👑 Huyền thoại 10.000\nHạng hiện cạnh tên bạn ở khắp nơi trong app.",
      en: "You earn points by being active. Levels:\n🥉 Bronze 100 · 🥈 Silver 500 · 🥇 Gold 1,000 · 💠 Platinum 2,000 · 💎 Diamond 5,000 · 👑 Legend 10,000\nYour tier shows next to your name across the app.",
    },
    kw: ["diem", "diem dung lam gi", "tich diem", "diem thuong", "cap bac", "len hang", "len cap", "huy hieu", "hang dong", "hang bac", "hang vang", "points", "level"],
  },
  {
    id: "install",
    cat: "start",
    q: { vi: "Cài app lên màn hình điện thoại thế nào?", en: "How do I install the app?" },
    a: {
      vi: "• Android (Chrome): Hồ sơ → ⋯ → Cài đặt → Cài ứng dụng, hoặc bấm biểu tượng ⋮ của trình duyệt → Thêm vào màn hình chính.\n• iPhone (Safari): bấm nút Chia sẻ ⬆️ → Thêm vào MH chính.\nSau khi cài, app mở toàn màn hình và nhận thông báo như app thường.",
      en: "• Android (Chrome): Profile → ⋯ → Settings → Install app, or browser menu ⋮ → Add to Home screen.\n• iPhone (Safari): tap Share ⬆️ → Add to Home Screen.\nOnce installed it opens full-screen and can receive notifications.",
    },
    kw: ["cai app", "cai dat app", "tai app", "man hinh chinh", "install", "them vao man hinh"],
  },
  {
    id: "update",
    cat: "start",
    q: { vi: "App không hiện tính năng mới?", en: "I don't see the new features" },
    a: {
      vi: "App lưu sẵn bản cũ để mở nhanh. Bạn hãy tắt hẳn app (vuốt khỏi đa nhiệm) rồi mở lại là có bản mới nhất nha 🔄",
      en: "The app caches the previous version to open fast. Fully close it (swipe it away) and reopen to get the latest version 🔄",
    },
    kw: ["khong cap nhat", "ban moi", "tinh nang moi", "khong thay thay doi", "loi hien thi", "cap nhat app"],
  },

  // ── Ưu đãi ──
  {
    id: "claim",
    cat: "offers",
    q: { vi: "Làm sao để nhận ưu đãi?", en: "How do I claim an offer?" },
    a: {
      vi: "1. Vào Ưu đãi (/uu-dai) hoặc trang của một doanh nghiệp\n2. Bấm Nhận ưu đãi → bạn có 1 mã riêng\n3. Khi tới quán/dùng dịch vụ, đưa mã cho doanh nghiệp\nChỉ tài khoản Membership còn hạn mới nhận được ưu đãi. Các mã đã nhận xem ở Trang chủ → ô Ưu đãi đã nhận.",
      en: "1. Open Offers (/uu-dai) or a business page\n2. Tap Claim → you get a personal code\n3. Show the code when you visit\nOnly active Membership accounts can claim. See your codes on Home → Offers claimed.",
    },
    kw: ["nhan uu dai", "lay uu dai", "dung uu dai", "ma uu dai", "claim", "khuyen mai", "giam gia"],
  },
  {
    id: "claimexp",
    cat: "offers",
    q: { vi: "Mã ưu đãi có hạn dùng không?", en: "Do offer codes expire?" },
    a: {
      vi: "Có. Mỗi mã có hạn sử dụng riêng, xem ở Trang chủ → bấm ô Ưu đãi đã nhận (có lọc Còn hạn / Hết hạn). Mã hết hạn sẽ hiện mờ.",
      en: "Yes. Each code has its own expiry — see Home → Offers claimed (filter Valid / Expired). Expired codes appear faded.",
    },
    kw: ["het han ma", "han dung", "ma het han", "uu dai het han", "het han su dung", "uu dai da nhan", "ma cua toi", "xem lai ma"],
  },
  {
    id: "offerbad",
    cat: "offers",
    q: { vi: "Quán không giữ đúng ưu đãi thì sao?", en: "A business didn't honor an offer" },
    a: {
      vi: "Bạn gửi Báo cáo cho Ban quản trị ngay trên trang doanh nghiệp hoặc ưu đãi đó (nút ⚑). Theo dõi phản hồi ở Báo cáo của tôi (/bao-cao-cua-toi).",
      en: "Send a Report from that business or offer page (⚑). Track replies in My reports (/bao-cao-cua-toi).",
    },
    kw: ["khong giu dung", "khong cho dung", "tu choi ma", "lua dao uu dai", "quan khong nhan"],
  },
  {
    id: "offeridea",
    cat: "offers",
    q: { vi: "Doanh nghiệp nên đăng ưu đãi gì?", en: "What kind of offer should I post?" },
    a: {
      vi: "Mẹo: biến điểm yếu thành lợi thế 💡\n• Sáng vắng khách → ưu đãi giờ sáng\n• Tháng thấp điểm → ưu đãi cả tháng\n• Mua 5 tặng 1, freeship, tặng món khi đi nhóm\nMuốn Lomi viết giúp nội dung ưu đãi thì cứ nhắn chi tiết quán của bạn nha (dành cho Membership).",
      en: "Tip: turn slow times into perks 💡\n• Quiet mornings → morning deal\n• Low season → month-long deal\n• Buy 5 get 1, free delivery, group gifts\nWant Lomi to write it? Send your shop details (Membership).",
    },
    kw: ["nen dang uu dai gi", "y tuong uu dai", "goi y uu dai", "uu dai nao hay"],
  },

  // ── Doanh nghiệp ──
  {
    id: "bizcreate",
    cat: "biz",
    q: { vi: "Đăng doanh nghiệp lên app thế nào?", en: "How do I list my business?" },
    a: {
      vi: "Vào Hồ sơ → ⋯ → Doanh nghiệp (/ho-so?view=business) → Tạo doanh nghiệp, điền tên, loại hình, địa chỉ, giờ mở cửa, ảnh. Ban quản trị sẽ duyệt rồi doanh nghiệp mới hiện công khai. Mỗi thành viên tạo được nhiều doanh nghiệp.",
      en: "Go to Profile → ⋯ → Business (/ho-so?view=business) → Create, fill in name, type, address, hours, photos. Admins review it before it goes public. You can own several businesses.",
    },
    kw: ["dang doanh nghiep", "tao doanh nghiep", "them doanh nghiep", "dang ky doanh nghiep", "mo shop", "dang quan"],
  },
  {
    id: "bizoffer",
    cat: "biz",
    q: { vi: "Doanh nghiệp đăng ưu đãi ở đâu?", en: "Where do I post an offer?" },
    a: {
      vi: "Hồ sơ → Doanh nghiệp (/ho-so?view=business) → chọn doanh nghiệp → mục Ưu đãi → Thêm ưu đãi. Người theo dõi doanh nghiệp sẽ được báo ngay khi có ưu đãi mới 🔔",
      en: "Profile → Business (/ho-so?view=business) → pick your business → Offers → Add. Followers get notified right away 🔔",
    },
    kw: ["dang uu dai", "tao uu dai", "them uu dai", "sua uu dai"],
  },
  {
    id: "bizstatus",
    cat: "biz",
    q: { vi: "Doanh nghiệp bị yêu cầu chỉnh sửa / từ chối?", en: "My business needs revision / was rejected" },
    a: {
      vi: "Xem ghi chú của Ban quản trị trong thông báo hoặc trang Doanh nghiệp của bạn, sửa đúng mục được nhắc rồi gửi lại. Cần hỏi thêm thì gửi Báo cáo hoặc bấm Liên hệ hỗ trợ trong menu ⋯.",
      en: "Check the admin note in your notification or business page, fix the mentioned items and resubmit. Questions? Send a Report or use Contact support in the ⋯ menu.",
    },
    kw: ["bi tu choi", "yeu cau chinh sua", "can chinh sua", "doanh nghiep bi tu choi", "khong duoc duyet doanh nghiep"],
  },
  {
    id: "follow",
    cat: "biz",
    q: { vi: "Theo dõi doanh nghiệp để làm gì?", en: "Why follow a business?" },
    a: {
      vi: "Theo dõi để lưu nơi quen và nhận thông báo ngay khi quán có ưu đãi mới. Doanh nghiệp cũng thấy khách quen để chăm sóc tốt hơn.",
      en: "Follow to save your favorites and get notified of new offers. Businesses can also see their regulars.",
    },
    kw: ["theo doi doanh nghiep", "follow quan", "khach quen"],
  },

  // ── Quẹt ──
  {
    id: "quetwhat",
    cat: "quet",
    q: { vi: "Quẹt là gì, dùng thế nào?", en: "What is Swipe?" },
    a: {
      vi: "Quẹt (/quet) giúp tìm người hợp ý theo 4 mục: Game, Làm quen, Trao đổi, Công việc.\n1. Chọn mục → tạo nhu cầu của bạn\n2. Quẹt phải 👉 nếu thích, trái 👈 để bỏ qua, vuốt lên 👆 xem chi tiết\n3. Hai bên cùng thích → Kết nối, nhắn tin được ngay 💬",
      en: "Swipe (/quet) matches you in 4 categories: Game, Dating, Trade, Jobs.\n1. Pick one → create your need\n2. Swipe right 👉 to like, left 👈 to pass, up 👆 for details\n3. Mutual like → Connection, start chatting 💬",
    },
    kw: ["quet la gi", "cach quet", "dung quet", "quet the nao", "swipe"],
  },
  {
    id: "quetlimit",
    cat: "quet",
    q: { vi: "Mỗi ngày được quẹt bao nhiêu lượt?", en: "How many swipes per day?" },
    a: {
      vi: "Tài khoản thường 10 lượt quẹt/ngày, Membership quẹt không giới hạn. Lượt mới tính lại mỗi ngày (giờ Việt Nam).",
      en: "Regular accounts get 10 swipes/day; Membership is unlimited. Resets daily (Vietnam time).",
    },
    kw: ["luot quet", "het luot", "gioi han quet", "quet bi gioi han", "bao nhieu luot", "10 luot", "khong quet duoc"],
  },
  {
    id: "quetundo",
    cat: "quet",
    q: { vi: "Lỡ quẹt nhầm thì sao?", en: "I swiped by mistake" },
    a: {
      vi: "Bấm nút ↺ (hoàn tác) ngay cạnh nút ✕ trong vài giây sau khi quẹt. Người đã bỏ qua cũng sẽ hiện lại sau 48 giờ hoặc khi họ sửa nhu cầu.",
      en: "Tap ↺ (undo) next to ✕ within a few seconds. Passed people also reappear after 48h or when they edit their need.",
    },
    kw: ["quet nham", "hoan tac", "undo", "bo qua nham"],
  },
  {
    id: "quetconnect",
    cat: "quet",
    q: { vi: "Kết nối và Tin nhắn khác nhau sao?", en: "Connections vs Messages?" },
    a: {
      vi: "Tab Kết nối chỉ hiện những người bạn CHƯA nhắn tin. Sau tin nhắn đầu tiên, cuộc trò chuyện chuyển hẳn sang Tin nhắn (có nhãn 🔥 Từ Quẹt). Muốn huỷ kết nối: bấm ⋯ ở tab Kết nối hoặc trong khung chat.",
      en: "Connections shows people you haven't messaged yet. After the first message the chat lives in Messages (🔥 From Swipe label). To unmatch: ⋯ in Connections or in the chat.",
    },
    kw: ["ket noi", "huy ket noi", "unmatch", "tu quet"],
  },
  {
    id: "quetmanage",
    cat: "quet",
    q: { vi: "Sửa hoặc tắt nhu cầu của mình ở đâu?", en: "How do I edit or pause my need?" },
    a: {
      vi: "Vào Quẹt → bấm nút Quản lý trong thẻ mục đó → sửa, bật/tắt hoặc xoá nhu cầu. Nhu cầu đang tắt sẽ không hiện cho người khác.",
      en: "Swipe → tap Manage on that category card → edit, pause or delete. Paused needs aren't shown to others.",
    },
    kw: ["sua nhu cau", "tat nhu cau", "xoa nhu cau", "quan ly nhu cau"],
  },
  {
    id: "quetsafety",
    cat: "quet",
    q: { vi: "Gặp người lạ trên Quẹt cần lưu ý gì?", en: "Safety tips for meeting people" },
    a: {
      vi: "• Gặp lần đầu ở nơi công cộng, báo cho người thân\n• Không chuyển tiền cọc trước khi xem hàng/gặp người\n• Thấy dấu hiệu lừa đảo → bấm ⋯ trên thẻ để Báo cáo hoặc Chặn",
      en: "• Meet in public first and tell someone\n• Never pay a deposit before seeing the item/person\n• Suspicious? Tap ⋯ on the card to Report or Block",
    },
    kw: ["an toan", "lua dao", "nguoi la", "gap nguoi la", "an toan khi gap", "bao cao nguoi"],
  },

  // ── Đưa đón ──
  {
    id: "ridebook",
    cat: "rides",
    q: { vi: "Đặt xe / giao hàng thế nào?", en: "How do I book a ride or delivery?" },
    a: {
      vi: "Trang chủ → Đưa đón & Giao hàng (/dua-don):\n1. Chọn loại: chở người hoặc giao hàng\n2. Chọn điểm đón, điểm đến (kéo ghim trên bản đồ cho chính xác)\n3. Xem giá tham khảo → Đặt\nTài xế nhận cuốc sẽ liên hệ bạn, bạn theo dõi tài xế trên bản đồ trực tiếp 🗺️",
      en: "Home → Rides & Delivery (/dua-don):\n1. Choose passenger or delivery\n2. Set pickup and drop-off (drag pins to adjust)\n3. Check the estimate → Book\nThe driver contacts you and you can track them live 🗺️",
    },
    kw: ["dat xe", "goi xe", "giao hang", "dua don", "ship do", "book xe", "xe om"],
  },
  {
    id: "ridprice",
    cat: "rides",
    q: { vi: "Giá cuốc xe tính thế nào?", en: "How is the fare calculated?" },
    a: {
      vi: "App tính giá THAM KHẢO theo quãng đường đi thật: giá mở cửa (đã gồm vài km đầu) + giá mỗi km tiếp theo, tuỳ loại xe. Giá cuối cùng hai bên tự thoả thuận, trả tiền mặt trực tiếp cho tài xế — tài xế nhận 100%, app không thu phí.",
      en: "The app shows a REFERENCE fare based on real road distance: base fare (covers the first few km) + per-km rate by vehicle. You and the driver agree the final price and pay cash — the driver keeps 100%.",
    },
    kw: ["gia cuoc", "tinh gia", "bao nhieu tien", "gia xe", "phi giao hang", "tra tien tai xe", "tinh tien", "cuoc phi"],
  },
  {
    id: "ridedriver",
    cat: "rides",
    q: { vi: "Muốn làm tài xế thì đăng ký sao?", en: "How do I become a driver?" },
    a: {
      vi: "Vào Đưa đón (/dua-don) → tab Tài xế → gửi hồ sơ (ảnh chân dung, loại xe, biển số). Ban quản trị duyệt xong bạn bật Online để nhận cuốc gần mình.",
      en: "Open Rides (/dua-don) → Driver tab → submit your profile (portrait, vehicle, plate). After admin approval, switch Online to receive nearby jobs.",
    },
    kw: ["lam tai xe", "dang ky tai xe", "chay xe", "nhan cuoc", "tai xe"],
  },
  {
    id: "tip",
    cat: "rides",
    q: { vi: "Tip ủng hộ app là gì?", en: "What is tipping the app?" },
    a: {
      vi: "Sau chuyến đi hoặc khi nhận ưu đãi, bạn có thể tự nguyện tip 5k–20k để ủng hộ app 💚. Hiện chỉ ghi nhận, chưa thu tiền thật.",
      en: "After a ride or offer you may voluntarily tip 5k–20k to support the app 💚. It's recorded only — no money is charged yet.",
    },
    kw: ["tip", "ung ho app", "donate"],
  },

  // ── Chat & Cộng đồng ──
  {
    id: "community",
    cat: "chat",
    q: { vi: "Cộng đồng dùng để làm gì?", en: "What is Community for?" },
    a: {
      vi: "Cộng đồng (/cong-dong) là phòng chat chung theo KHU VỰC và CHỦ ĐỀ: Việc làm, Mua bán, Nhà ở, Game, Chia sẻ, Hỏi đáp, Tin tức… Chọn khu vực + chủ đề ở đầu trang để vào đúng phòng.",
      en: "Community (/cong-dong) is group chat by AREA and TOPIC: Jobs, Marketplace, Housing, Game, Sharing, Q&A, News… Pick area + topic at the top.",
    },
    kw: ["cong dong", "phong chat", "chat chung", "kenh khu vuc"],
  },
  {
    id: "group",
    cat: "chat",
    q: { vi: "Tạo nhóm chat thế nào?", en: "How do I create a group chat?" },
    a: {
      vi: "Vào Tin nhắn (/tin-nhan) → bấm biểu tượng nhóm cạnh ô tìm kiếm → chọn thành viên → đặt tên nhóm. Mỗi nhóm tối đa 50 người.",
      en: "Messages (/tin-nhan) → tap the group icon next to search → pick members → name it. Up to 50 people.",
    },
    kw: ["tao nhom", "nhom chat", "chat nhom", "group"],
  },
  {
    id: "call",
    cat: "chat",
    q: { vi: "Gọi thoại, gọi video, gửi tin nhắn thoại?", en: "Voice/video calls and voice messages?" },
    a: {
      vi: "Trong khung chat 1-1, bấm 📞 để gọi thoại hoặc 🎥 để gọi video (người kia cần đang online). Giữ nút 🎤 để ghi tin nhắn thoại. Lịch sử cuộc gọi xem ở /cuoc-goi.",
      en: "In a 1-1 chat tap 📞 for voice or 🎥 for video (the other person must be online). Hold 🎤 to record a voice message.",
    },
    kw: ["goi dien", "goi video", "goi thoai", "cuoc goi", "tin nhan thoai", "ghi am", "call"],
  },
  {
    id: "block",
    cat: "chat",
    q: { vi: "Chặn hoặc báo cáo ai đó?", en: "How do I block or report someone?" },
    a: {
      vi: "Trong khung chat bấm ⋯ → Chặn. Người bị chặn không nhắn, gọi hay xem hồ sơ của bạn được. Bỏ chặn ở Cài đặt → Người dùng đã chặn. Muốn báo cáo: bấm ⚑ / ⋯ → Báo cáo, theo dõi ở /bao-cao-cua-toi.",
      en: "In a chat tap ⋯ → Block — they can't message, call or view you. Unblock in Settings → Blocked users. To report: ⚑ / ⋯ → Report, track in /bao-cao-cua-toi.",
    },
    kw: ["chan", "chan nguoi", "chan nguoi khac", "bo chan", "bao cao", "to cao", "block", "report"],
  },

  // ── Hồ sơ ──
  {
    id: "friends",
    cat: "profile",
    q: { vi: "Bạn bè và người theo dõi khác nhau sao?", en: "Friends vs followers?" },
    a: {
      vi: "Bạn theo dõi ai đó thì thấy hoạt động của họ. Khi hai người theo dõi qua lại nhau thì thành Bạn bè 🤝",
      en: "Following someone shows their activity. When you follow each other you become Friends 🤝",
    },
    kw: ["ban be", "theo doi", "follow", "nguoi theo doi", "ket ban"],
  },
  {
    id: "status",
    cat: "profile",
    q: { vi: "Thanh trạng thái trên hồ sơ để làm gì?", en: "What is the status bar on my profile?" },
    a: {
      vi: "Đăng nhanh nhu cầu ngay trên hồ sơ: tuyển người, tìm việc, tìm đối tác… hoặc đơn giản là một lời chào. Mọi người thấy dòng này cạnh tên bạn.",
      en: "Post a quick need on your profile — hiring, job hunting, partners… or just a hello. People see it next to your name.",
    },
    kw: ["trang thai", "status", "dong trang thai"],
  },
  {
    id: "avatar",
    cat: "profile",
    q: { vi: "Đổi ảnh đại diện, tên, giới thiệu?", en: "Change avatar, name or bio?" },
    a: {
      vi: "Vào Hồ sơ (/ho-so): chạm ảnh đại diện để đổi ảnh; bấm ⋯ → Thông tin cá nhân để sửa tên, giới thiệu và thông tin khác.",
      en: "Profile (/ho-so): tap your avatar to change it; ⋯ → Personal info to edit name, bio and details.",
    },
    kw: ["doi anh", "anh dai dien", "doi ten", "sua ho so", "gioi thieu ban than", "avatar"],
  },

  // ── Tài khoản & Cài đặt ──
  {
    id: "password",
    cat: "account",
    q: { vi: "Đổi mật khẩu ở đâu?", en: "How do I change my password?" },
    a: {
      vi: "Hồ sơ → ⋯ → Cài đặt (/ho-so?view=settings) → Đổi mật khẩu.",
      en: "Profile → ⋯ → Settings (/ho-so?view=settings) → Change password.",
    },
    kw: ["doi mat khau", "thay mat khau", "change password"],
  },
  {
    id: "forgot",
    cat: "account",
    q: { vi: "Quên mật khẩu thì làm sao?", en: "I forgot my password" },
    a: {
      vi: "Ở màn đăng nhập bấm Quên mật khẩu, nhập số điện thoại đã đăng ký để xem lại tên đăng nhập và gợi ý mật khẩu. Vẫn không vào được thì liên hệ Ban quản trị (Email / Hotline / Facebook ở màn đăng nhập).",
      en: "On the login screen tap Forgot password and enter your registered phone to see your username and password hint. Still stuck? Contact the admins (Email / Hotline / Facebook on the login screen).",
    },
    kw: ["quen mat khau", "khong dang nhap duoc", "mat tai khoan", "forgot password"],
  },
  {
    id: "notif",
    cat: "account",
    q: { vi: "Tắt / bật thông báo thế nào?", en: "Turn notifications on/off?" },
    a: {
      vi: "Hồ sơ → ⋯ → Cài đặt → Thông báo: bật thông báo đẩy và chọn riêng từng loại (tin nhắn, follow, ưu đãi, admin…). Trên Android nhớ tắt \"Quản lý ứng dụng nếu không dùng\" cho app để không bị mất thông báo.",
      en: "Profile → ⋯ → Settings → Notifications: enable push and pick each type. On Android, turn off \"Manage app if unused\" so notifications keep arriving.",
    },
    kw: ["thong bao", "tat thong bao", "bat thong bao", "khong nhan thong bao", "notification"],
  },
  {
    id: "theme",
    cat: "account",
    q: { vi: "Đổi giao diện tối / ngôn ngữ?", en: "Dark mode / language?" },
    a: {
      vi: "Hồ sơ → ⋯ → Cài đặt → Giao diện (sáng/tối) và Ngôn ngữ / Language (Tiếng Việt / English).",
      en: "Profile → ⋯ → Settings → Theme (light/dark) and Language.",
    },
    kw: ["giao dien toi", "che do toi", "dark mode", "ngon ngu", "tieng anh", "language"],
  },
  {
    id: "support",
    cat: "account",
    q: { vi: "Liên hệ Ban quản trị thế nào?", en: "How do I contact the admins?" },
    a: {
      vi: "Bấm ⋯ ở Hồ sơ → Liên hệ hỗ trợ (Email / Hotline / Facebook), hoặc gửi Báo cáo và theo dõi phản hồi ở /bao-cao-cua-toi.",
      en: "Profile ⋯ → Contact support (Email / Hotline / Facebook), or send a Report and track it in /bao-cao-cua-toi.",
    },
    kw: ["lien he", "ban quan tri", "admin", "ho tro", "hotline", "support"],
  },
  {
    id: "privacy",
    cat: "account",
    q: { vi: "Thông tin cá nhân của mình có an toàn không?", en: "Is my personal data safe?" },
    a: {
      vi: "App chỉ dùng thông tin để vận hành dịch vụ, không bán dữ liệu. Ngày sinh không hiển thị công khai. Chi tiết xem Chính sách bảo mật ở chân Trang chủ. Lomi không bao giờ hỏi mật khẩu hay mã OTP của bạn 🔒",
      en: "Data is only used to run the service and never sold. Your birthday isn't public. See the Privacy Policy at the bottom of Home. Lomi will never ask for your password or OTP 🔒",
    },
    kw: ["bao mat", "an toan thong tin", "du lieu ca nhan", "privacy", "rieng tu"],
  },
  {
    id: "lomi",
    cat: "account",
    q: { vi: "Lomi là ai, hỏi Lomi được gì?", en: "Who is Lomi?" },
    a: {
      vi: "Mình là Lomi — trợ lý của Liên Minh Liên Doanh 🌱\n• Câu hỏi thường gặp: trả lời ngay, miễn phí cho mọi người\n• Câu khác (viết nội dung ưu đãi, bài đăng, mẹo kinh doanh…): Lomi AI trả lời, dành cho Membership, 20 câu/ngày\nKéo mình đi đâu cũng được, thả sát mép thì mình nấp cho đỡ vướng nha 😄",
      en: "I'm Lomi, the Liên Minh Liên Doanh assistant 🌱\n• FAQs: instant and free for everyone\n• Anything else (writing offers, posts, tips…): Lomi AI for Membership, 20/day\nDrag me anywhere; drop me at the edge to hide 😄",
    },
    kw: ["lomi la ai", "ban la ai", "tro ly", "hoi duoc gi", "who are you"],
  },
];

// ── So khớp câu gõ với FAQ (không dấu, chữ thường) ──
export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Câu nhờ VIẾT / SÁNG TẠO → luôn để AI trả lời, không chặn bằng FAQ.
const CREATIVE = /\b(viet|soan|sang tac|caption|mo ta giup|y tuong cho|dat ten|slogan|content|bai dang cho|write|draft)\b/;

export function matchFaq(text: string): Faq | null {
  const n = ` ${normalizeVi(text)} `;
  if (!n.trim() || n.length > 160 || CREATIVE.test(n)) return null;
  const words = n.trim().split(" ").length;
  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of FAQS) {
    let score = 0;
    for (const k of f.kw) {
      if (!n.includes(` ${k} `)) continue;
      const w = k.split(" ").length;
      // Từ khoá 1 chữ chỉ đủ tin cậy khi câu hỏi ngắn (vd "membership?", "chặn") — câu dài dễ khớp nhầm.
      score += w > 1 ? w : words <= 3 ? 2 : 1;
    }
    // Trùng gần như nguyên câu hỏi mẫu → chắc chắn.
    if (n.includes(normalizeVi(f.q.vi)) || n.includes(normalizeVi(f.q.en))) score += 10;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  // Cần khớp ít nhất 1 cụm 2 chữ trở lên (tránh khớp nhầm vì 1 từ chung chung).
  return bestScore >= 2 ? best : null;
}
