// ─────────────────────────────────────────────────────────────────────────────
// THƯ VIỆN HỎI – ĐÁP VỀ APP CỦA LOMI (viết lại 30/09 theo ý Kir: "Lomi trả lời được hết câu hỏi về app,
// không phụ thuộc Lovable") — chạy 100% trên máy, không gọi AI, không tốn credit.
// • Nội dung đối chiếu với CODE THẬT ngày 30/09 (claim_offer: PIN + mã hạn 2 giờ; quên mật khẩu cần
//   email + SĐT; điểm +1 mỗi lượt nhận ưu đãi; Membership 3 tháng miễn phí, gói 49.000đ/tháng sắp mở…).
//   App đổi tính năng thì sửa ở đây. Đường dẫn dạng /duong-dan tự thành link bấm được trong khung chat.
// • So khớp: cụm từ khoá (kw) + so từ (bỏ dấu, bỏ từ đệm, đồng nghĩa, chịu được gõ sai 1 ký tự).
//   Không chắc → Lomi gợi ý vài câu gần nhất để người dùng chọn (suggestFaqs) thay vì trả lời bừa.
// ─────────────────────────────────────────────────────────────────────────────

export type FaqCat = "start" | "offers" | "explore" | "biz" | "quet" | "rides" | "chat" | "profile" | "account";
export type Faq = { id: string; cat: FaqCat; q: { vi: string; en: string }; a: { vi: string; en: string }; kw: string[] };

export const FAQ_CATS: { id: FaqCat; vi: string; en: string; emoji: string }[] = [
  { id: "start", vi: "Bắt đầu", en: "Getting started", emoji: "🌱" },
  { id: "offers", vi: "Ưu đãi", en: "Offers", emoji: "🎁" },
  { id: "explore", vi: "Khám phá", en: "Explore", emoji: "🔎" },
  { id: "biz", vi: "Doanh nghiệp", en: "Business", emoji: "🏪" },
  { id: "quet", vi: "Quẹt", en: "Swipe", emoji: "💘" },
  { id: "rides", vi: "Đưa đón", en: "Rides", emoji: "🛵" },
  { id: "chat", vi: "Tin nhắn & Cộng đồng", en: "Chat & Community", emoji: "💬" },
  { id: "profile", vi: "Hồ sơ", en: "Profile", emoji: "👤" },
  { id: "account", vi: "Tài khoản & Cài đặt", en: "Account & Settings", emoji: "⚙️" },
];

const F = (id: string, cat: FaqCat, qvi: string, qen: string, avi: string, aen: string, kw: string[]): Faq => ({
  id,
  cat,
  q: { vi: qvi, en: qen },
  a: { vi: avi, en: aen },
  kw,
});

export const FAQS: Faq[] = [
  // ── Bắt đầu ──
  F("what", "start", "Liên Minh Liên Doanh là gì?", "What is Liên Minh Liên Doanh?",
    "Liên Minh Liên Doanh là cộng đồng kết nối thành viên và doanh nghiệp địa phương 🌿\n• Khám phá quán, dịch vụ theo khu vực (/kham-pha)\n• Nhận ưu đãi dành riêng cho thành viên (/uu-dai)\n• Quẹt tìm bạn chơi game, làm quen, việc làm, trao đổi, mua bán (/quet)\n• Đặt xe, giao hàng với tài xế trong cộng đồng (/dua-don)\n• Chat theo khu vực và chủ đề ở Cộng đồng (/cong-dong)\n• Nhắn tin, gọi thoại/video, chat nhóm (/tin-nhan)",
    "Liên Minh Liên Doanh is a community connecting members and local businesses 🌿\n• Explore places by area (/kham-pha)\n• Claim member-only offers (/uu-dai)\n• Swipe for gamers, friends, jobs, trades (/quet)\n• Rides & deliveries with community drivers (/dua-don)\n• Area/topic chat in Community (/cong-dong)\n• Messages, voice/video calls, group chats (/tin-nhan)",
    ["app nay la gi", "lien minh lien doanh la gi", "app dung de lam gi", "gioi thieu app", "app co gi", "tinh nang app", "what is this app"]),
  F("register", "start", "Đăng ký tài khoản thế nào?", "How do I sign up?",
    "Ở màn hình đầu bấm Tham gia ngay / Đăng ký, rồi điền:\n• Tên đăng nhập (3–20 ký tự: chữ thường, số, dấu _)\n• Họ tên, email, số điện thoại\n• Mật khẩu từ 6 ký tự, có cả chữ và số\n• Ngày sinh (cần đủ 18 tuổi)\nCó doanh nghiệp thì điền luôn thông tin doanh nghiệp ở bước sau. Hoặc bấm “Tiếp tục với Google”, rồi bổ sung tên đăng nhập, SĐT và ngày sinh. Đăng ký xong Ban quản trị sẽ duyệt tài khoản nha.",
    "Tap Join now / Sign up and fill in: username (3–20 chars: lowercase, digits, _), full name, email, phone, a password of 6+ characters with letters and numbers, and your birthday (18+). Business owners can add business info in the next step. Or use “Continue with Google” and then add a username, phone and birthday. Admins then review your account.",
    ["dang ky", "tao tai khoan", "lap tai khoan", "mo tai khoan", "dang ky the nao", "sign up", "register"]),
  F("google", "start", "Đăng nhập bằng Google được không?", "Can I log in with Google?",
    "Được nha! Ở màn đăng nhập bấm “Tiếp tục với Google”. Lần đầu app sẽ nhờ bạn chọn tên đăng nhập, nhập số điện thoại và ngày sinh để hoàn tất hồ sơ.",
    "Yes! Tap “Continue with Google” on the login screen. The first time, you'll pick a username and enter your phone and birthday to finish your profile.",
    ["dang nhap google", "tai khoan google", "gmail", "login google", "google"]),
  F("approve", "start", "Sao tài khoản của mình đang chờ duyệt?", "Why is my account pending?",
    "Mỗi tài khoản mới đều được Ban quản trị duyệt tay để giữ cộng đồng an toàn, thường chỉ mất một lúc thôi. Trong lúc chờ bạn vẫn xem được Hồ sơ, Tin nhắn và Thông báo. Duyệt xong app sẽ báo cho bạn 🔔",
    "Every new account is reviewed by the admins to keep the community safe — usually quick. While waiting you can still use Profile, Messages and Notifications. You'll be notified once approved 🔔",
    ["cho duyet", "chua duoc duyet", "duyet tai khoan", "pending", "bao lau duoc duyet", "chua duyet", "doi duyet"]),
  F("age", "start", "Dưới 18 tuổi có dùng app được không?", "Can I use the app under 18?",
    "Chưa được bạn ơi. Liên Minh Liên Doanh dành cho người từ đủ 18 tuổi trở lên. Ngày sinh chỉ dùng để kiểm tra tuổi, không hiển thị công khai.",
    "Sorry, Liên Minh Liên Doanh is for people aged 18 and over. Your birthday is only used to check age and is never shown publicly.",
    ["18 tuoi", "du tuoi", "bao nhieu tuoi", "tre em", "hoc sinh", "vi thanh nien", "ngay sinh"]),
  F("free", "start", "Dùng app có mất phí không?", "Is the app free?",
    "Dùng app là miễn phí nha 💚\n• Tài khoản mới được duyệt có 3 tháng Membership miễn phí\n• Đặt xe: tài xế nhận 100% tiền cước, app không thu phí\n• Tip ủng hộ app hoàn toàn tự nguyện\nGói Membership trả phí (49.000đ/tháng) sẽ mở thanh toán sau, app sẽ báo trước.",
    "The app is free 💚 New approved accounts get 3 months of Membership free; drivers keep 100% of fares; tipping the app is optional. Paid Membership (49,000đ/month) will open later — you'll be notified.",
    ["mat phi", "tra phi", "mien phi", "co ton tien", "co mat tien", "thu phi", "free"]),
  F("membership", "start", "Membership là gì?", "What is Membership?",
    "Membership mở khoá quyền lợi thành viên:\n• Nhận ưu đãi từ doanh nghiệp\n• Quẹt không giới hạn (tài khoản thường 10 lượt/ngày)\n• Chủ doanh nghiệp đăng được ưu đãi mới\nTài khoản mới được duyệt có sẵn 3 tháng Membership miễn phí. Xem hạn ở Hồ sơ → ⋯ → Hồ sơ cá nhân (/ho-so?view=personal).",
    "Membership unlocks: claiming business offers, unlimited swipes (regular accounts: 10/day), and posting new offers for business owners. Newly approved accounts get 3 months free. Check your expiry in Profile → ⋯ → Personal profile (/ho-so?view=personal).",
    ["membership", "membership la gi", "hoi vien", "goi thanh vien", "quyen loi thanh vien", "dang ky membership", "han membership"]),
  F("memberexp", "start", "Hết 3 tháng Membership miễn phí thì sao?", "What happens when my free Membership ends?",
    "Khi hết hạn thì:\n• Chưa nhận được ưu đãi mới\n• Quẹt còn 10 lượt/ngày\n• Chủ doanh nghiệp chưa đăng được ưu đãi mới (ưu đãi cũ vẫn chạy bình thường)\nGói 49.000đ/tháng đang chuẩn bị mở thanh toán, bạn theo dõi thông báo nha. Các tính năng khác vẫn dùng bình thường 😊",
    "When it ends you can't claim new offers, swipes drop to 10/day, and owners can't post new offers (existing ones keep running). The 49,000đ/month plan will open soon — watch for a notification. Everything else keeps working 😊",
    ["het han membership", "membership het han", "het 3 thang", "gia han", "gia han membership", "sau 3 thang", "mua membership", "49k", "49000"]),
  F("points", "start", "Điểm và cấp bậc hoạt động thế nào?", "How do points and levels work?",
    "Mỗi lần bạn nhận ưu đãi được +1 điểm, và chủ doanh nghiệp đó cũng được +1 điểm 🎉 Đủ điểm sẽ lên hạng:\n🥉 Đồng 100 · 🥈 Bạc 500 · 🥇 Vàng 1.000 · 💠 Bạch kim 2.000 · 💎 Kim cương 5.000 · 👑 Huyền thoại 10.000\nBấm vào huy hiệu cạnh tên ở Hồ sơ để xem bảng bậc.",
    "Each offer you claim gives you +1 point, and the business owner +1 too 🎉 Tiers: 🥉 Bronze 100 · 🥈 Silver 500 · 🥇 Gold 1,000 · 💠 Platinum 2,000 · 💎 Diamond 5,000 · 👑 Legend 10,000. Tap the badge next to your name on Profile to see them.",
    ["diem", "tich diem", "diem thuong", "cap bac", "len hang", "len cap", "huy hieu", "hang dong", "hang bac", "hang vang", "kim cuong", "huyen thoai", "points", "level"]),
  F("install", "start", "Cài app lên màn hình điện thoại thế nào?", "How do I install the app?",
    "• Android (Chrome): Hồ sơ → ⋯ → Cài đặt → Cài app ra màn hình chính, hoặc menu ⋮ của trình duyệt → Thêm vào màn hình chính.\n• iPhone (Safari): bấm nút Chia sẻ ⬆️ → Thêm vào MH chính.\nCài xong app mở toàn màn hình và nhận được thông báo như app thường.",
    "• Android (Chrome): Profile → ⋯ → Settings → Install app, or browser menu ⋮ → Add to Home screen.\n• iPhone (Safari): tap Share ⬆️ → Add to Home Screen.\nOnce installed it opens full-screen and can receive notifications.",
    ["cai app", "cai dat app", "tai app", "man hinh chinh", "install", "them vao man hinh", "tai ung dung", "download app", "app store", "ch play"]),
  F("update", "start", "App không hiện tính năng mới?", "I don't see the new features",
    "App lưu sẵn bản cũ để mở cho nhanh. Khi có bản mới app sẽ hiện nút Cập nhật; nếu không thấy thì bạn tắt hẳn app (vuốt khỏi đa nhiệm) rồi mở lại là có bản mới nhất nha 🔄",
    "The app caches the previous version to open fast. When there's an update you'll see an Update button; otherwise fully close the app and reopen it 🔄",
    ["khong cap nhat", "ban moi", "tinh nang moi", "khong thay thay doi", "cap nhat app", "update", "phien ban moi"]),
  F("home", "start", "Trang chủ có những gì?", "What's on the Home page?",
    "Trang chủ có:\n• Ô số liệu: thành viên, doanh nghiệp, ưu đãi bạn đã nhận (bấm để xem chi tiết, lọc Còn hạn/Hết hạn)\n• Đưa đón & Giao hàng\n• Doanh nghiệp nổi bật được cộng đồng tin dùng",
    "Home shows stats (members, businesses, offers you claimed — tap for details), Rides & Delivery, and featured businesses.",
    ["trang chu", "man hinh chinh co gi", "home"]),

  // ── Ưu đãi ──
  F("claim", "offers", "Làm sao để nhận ưu đãi?", "How do I claim an offer?",
    "Dễ lắm nè 🎁\n1. Tới quán, mở trang doanh nghiệp đó (từ Khám phá /kham-pha hoặc Ưu đãi /uu-dai) → bấm Nhận ưu đãi\n2. Hỏi nhân viên/chủ quán mã PIN (4–8 ký tự) rồi nhập vào — để xác nhận bạn đang có mặt tại quán\n3. App hiện mã ưu đãi của bạn, đưa mã cho quán là xong\nMã có hiệu lực 2 giờ. Cần tài khoản đã duyệt và Membership còn hạn nha.",
    "1. At the shop, open its business page (Explore /kham-pha or Offers /uu-dai) → tap Claim offer\n2. Ask the staff for the PIN (4–8 characters) and enter it — this confirms you're there in person\n3. Show the offer code to the staff\nCodes are valid for 2 hours. You need an approved account and active Membership.",
    ["nhan uu dai", "lay uu dai", "dung uu dai", "ma uu dai", "claim", "su dung uu dai", "nhan khuyen mai", "lay ma"]),
  F("pin", "offers", "Mã PIN khi nhận ưu đãi là gì?", "What's the PIN when claiming?",
    "Mã PIN do chính doanh nghiệp đặt, dùng để xác nhận bạn đang có mặt tại quán khi nhận ưu đãi. Bạn cứ hỏi nhân viên hoặc chủ quán nha. Nhập sai 5 lần thì bị khoá 5 phút.",
    "The PIN is set by the business to confirm you're there in person. Just ask the staff. 5 wrong tries lock it for 5 minutes.",
    ["ma pin", "pin la gi", "nhap pin", "sai pin", "pin o dau", "khong biet pin", "hoi pin"]),
  F("claimexp", "offers", "Mã ưu đãi dùng được bao lâu, xem lại ở đâu?", "How long is a code valid, where do I find it?",
    "Mã có hiệu lực 2 giờ kể từ lúc nhận (có đồng hồ đếm ngược). Trong 2 giờ đó bấm Nhận ưu đãi lại sẽ hiện đúng mã cũ. Xem lại các ưu đãi đã nhận ở Trang chủ → ô Ưu đãi đã nhận (lọc Còn hạn / Hết hạn).",
    "Codes are valid for 2 hours (with a countdown). Tapping Claim again within that time shows the same code. See your claims on Home → Offers claimed (filter Valid / Expired).",
    ["het han ma", "han dung", "ma het han", "bao lau", "hieu luc", "uu dai da nhan", "ma cua toi", "xem lai ma", "nhan lai"]),
  F("offerlocked", "offers", "Sao mình không nhận được ưu đãi?", "Why can't I claim an offer?",
    "Thường là do một trong mấy lý do này:\n• Tài khoản chưa được duyệt\n• Membership đã hết hạn\n• Nhập sai mã PIN (sai 5 lần sẽ khoá 5 phút)\n• Doanh nghiệp chưa thiết lập mã PIN hoặc đã tạm ẩn ưu đãi\nVẫn không được thì gửi Báo cáo cho Ban quản trị nha.",
    "Usually: account not approved yet, Membership expired, wrong PIN (5 wrong tries = 5-minute lock), or the business hasn't set a PIN / hid the offer. Still stuck? Send a Report to the admins.",
    ["khong nhan duoc uu dai", "khong claim duoc", "loi uu dai", "khong thay uu dai", "bi khoa uu dai", "chi danh cho hoi vien"]),
  F("offerlist", "offers", "Xem các ưu đãi ở đâu?", "Where can I see offers?",
    "Vào mục Ưu đãi (/uu-dai) để xem tất cả, hoặc mở trang từng doanh nghiệp ở Khám phá (/kham-pha). Theo dõi doanh nghiệp thì có ưu đãi mới là bạn được báo ngay 🔔",
    "Open Offers (/uu-dai) for all of them, or a business page from Explore (/kham-pha). Follow a business to get notified of new offers 🔔",
    ["xem uu dai", "danh sach uu dai", "uu dai o dau", "tim uu dai", "co uu dai gi"]),
  F("offerbad", "offers", "Quán không giữ đúng ưu đãi thì sao?", "A business didn't honor an offer",
    "Bạn bấm Báo cáo ngay trên trang doanh nghiệp đó, mô tả chuyện gì đã xảy ra (thêm ảnh nếu có). Bạn chọn gửi cho Doanh nghiệp hoặc cho Admin, rồi theo dõi phản hồi ở Báo cáo của tôi (/bao-cao-cua-toi).",
    "Tap Report on that business page, describe what happened (photo optional), choose to send it to the business or the admins, and follow up in My reports (/bao-cao-cua-toi).",
    ["khong giu dung", "khong cho dung", "tu choi ma", "lua dao uu dai", "quan khong nhan", "khong ap dung"]),

  // ── Khám phá ──
  F("search", "explore", "Tìm quán, dịch vụ thế nào?", "How do I find places?",
    "Vào Khám phá (/kham-pha):\n• Gõ tên vào ô tìm kiếm (gõ không dấu cũng được)\n• Lọc theo Khu vực và loại hình\n• Sắp xếp: Gần đây, Đánh giá cao, Nhiều ưu đãi được nhận, Mới nhất\n• Xem dạng Danh sách hoặc Bản đồ",
    "Open Explore (/kham-pha): search by name (no accents needed), filter by area and type, sort by Nearby / Top rated / Most claimed / Newest, and switch between List and Map.",
    ["tim quan", "tim doanh nghiep", "tim kiem", "tim dich vu", "loc khu vuc", "kham pha", "search"]),
  F("nearby", "explore", "Tìm chỗ gần mình thế nào?", "How do I find places near me?",
    "Ở Khám phá (/kham-pha) chọn sắp xếp Gần đây và cho phép app dùng vị trí, rồi chọn bán kính. Hoặc chuyển sang Bản đồ để xem các quán quanh bạn và bấm Chỉ đường 🗺️",
    "In Explore (/kham-pha) sort by Nearby, allow location and pick a radius — or switch to Map to see places around you and tap Directions 🗺️",
    ["gan day", "gan minh", "gan toi", "xung quanh", "xem ban do", "ban do", "chi duong", "dinh vi", "ban kinh", "nearby", "quan gan day"]),
  F("review", "explore", "Viết đánh giá cho quán thế nào?", "How do I write a review?",
    "Mở trang doanh nghiệp → Viết đánh giá: chọn số sao, viết nhận xét, thêm ảnh nếu muốn. Mỗi người đánh giá 1 lần cho mỗi doanh nghiệp, sau đó vẫn sửa hoặc xoá được.",
    "Open the business page → Write a review: stars, comment, optional photo. One review per business per person — you can edit or delete it later.",
    ["danh gia", "viet danh gia", "review", "cho sao", "nhan xet", "sua danh gia", "xoa danh gia"]),
  F("openhours", "explore", "Biết quán đang mở hay đóng thế nào?", "How do I know if a place is open?",
    "Mỗi doanh nghiệp có nhãn Đang mở / Đã đóng tính theo giờ mở cửa mà chủ quán khai. Doanh nghiệp chỉ bán online thì có nhãn Bán hàng online.",
    "Each business shows Open / Closed based on its listed hours. Online-only businesses show an Online store badge.",
    ["dang mo", "da dong", "gio mo cua", "mo cua", "may gio dong", "ban hang online"]),
  F("follow", "explore", "Theo dõi doanh nghiệp để làm gì?", "Why follow a business?",
    "Theo dõi để lưu nơi quen và được báo ngay khi quán có ưu đãi mới 🔔 Bấm Theo dõi trên trang doanh nghiệp là xong.",
    "Following saves your favorites and notifies you of new offers 🔔 Tap Follow on the business page.",
    ["theo doi doanh nghiep", "follow quan", "theo doi quan", "bo theo doi"]),

  // ── Doanh nghiệp ──
  F("bizcreate", "biz", "Đăng doanh nghiệp lên app thế nào?", "How do I list my business?",
    "Vào Hồ sơ → ⋯ → Tạo hồ sơ doanh nghiệp (/ho-so?view=business) rồi điền:\n• Tên, loại hình (9 loại), giờ mở/đóng, mô tả, địa chỉ, SĐT\n• Mã PIN 4–8 ký tự (bắt buộc — để khách nhận ưu đãi tại quán)\n• Ảnh bìa, link Facebook/TikTok/Instagram/YouTube/Website (tuỳ chọn)\n• Ghim vị trí hiện tại để hiện ở mục Gần đây; chỉ bán online thì bật “Chỉ bán hàng online”\nBấm Gửi để duyệt, Ban quản trị duyệt xong doanh nghiệp mới hiện công khai.",
    "Profile → ⋯ → Create business profile (/ho-so?view=business): name, type (9 types), hours, description, address, phone, a 4–8 character PIN (required, for in-store claims), optional cover and social links, pin your location for Nearby or toggle Online-only. Submit — it goes public after admin approval.",
    ["dang doanh nghiep", "tao doanh nghiep", "them doanh nghiep", "dang ky doanh nghiep", "mo shop", "dang quan", "tao hoso doanh nghiep", "dua quan len app"]),
  F("bizoffer", "biz", "Doanh nghiệp đăng ưu đãi ở đâu?", "Where do I post an offer?",
    "Hồ sơ → ⋯ → Hồ sơ doanh nghiệp (/ho-so?view=business) → mục Ưu đãi / Deal → Thêm ưu đãi mới. Mỗi ưu đãi có thể Tạm ẩn, Hiện lại, Xoá hoặc Gửi thông báo cho người theo dõi. Đăng ưu đãi mới cần Membership còn hạn. Cần ý tưởng thì gõ “tư vấn ưu đãi” để Lomi gợi ý nha 💡",
    "Profile → ⋯ → Business profile (/ho-so?view=business) → Offers / Deals → add a new offer. Each offer can be hidden, shown, deleted or broadcast to followers. Posting new offers needs active Membership. Need ideas? Type “offer ideas” 💡",
    ["dang uu dai", "tao uu dai", "them uu dai", "sua uu dai", "an uu dai", "xoa uu dai", "dang deal"]),
  F("bizbroadcast", "biz", "Gửi thông báo ưu đãi cho khách thế nào?", "How do I notify followers about an offer?",
    "Trong Hồ sơ doanh nghiệp, ở từng ưu đãi có nút Gửi thông báo → Gửi ngay. Người theo dõi doanh nghiệp sẽ nhận được thông báo 🔔",
    "In your Business profile, each offer has a Broadcast button → Send now. Your followers get notified 🔔",
    ["gui thong bao uu dai", "thong bao cho khach", "bao khach", "broadcast", "gui thong bao"]),
  F("bizpin", "biz", "Đặt hoặc đổi mã PIN doanh nghiệp ở đâu?", "Where do I set my business PIN?",
    "Hồ sơ → ⋯ → Hồ sơ doanh nghiệp → ô “Mã PIN xác nhận claim (4–8 ký tự)” → Lưu doanh nghiệp. Đổi PIN xong nhớ báo nhân viên để đưa khách mã mới nha.",
    "Profile → ⋯ → Business profile → “Claim PIN (4–8 characters)” → Save. Tell your staff the new PIN.",
    ["dat pin", "doi pin", "ma pin doanh nghiep", "thiet lap pin", "pin cua quan"]),
  F("bizedit", "biz", "Sửa thông tin doanh nghiệp thế nào?", "How do I edit my business?",
    "Hồ sơ → ⋯ → Hồ sơ doanh nghiệp → sửa thông tin → Lưu doanh nghiệp. Nếu doanh nghiệp đang ở trạng thái Cần bổ sung, lưu xong sẽ tự gửi lại để Ban quản trị duyệt.",
    "Profile → ⋯ → Business profile → edit → Save. If it's marked Needs revision, saving resubmits it for review.",
    ["sua doanh nghiep", "doi thong tin quan", "cap nhat doanh nghiep", "sua gio mo cua", "doi dia chi", "doi ten quan"]),
  F("bizphotos", "biz", "Thêm ảnh cho doanh nghiệp thế nào?", "How do I add business photos?",
    "Trong Hồ sơ doanh nghiệp có Ảnh bìa (Đổi ảnh bìa) và Thư viện ảnh, tải được tối đa 8 ảnh (chọn nhiều ảnh một lần cũng được). Ảnh JPG, PNG hoặc WEBP.",
    "In your Business profile: Change cover, plus a photo gallery of up to 8 photos (multi-select works). JPG, PNG or WEBP.",
    ["anh doanh nghiep", "them anh quan", "them anh cho quan", "them anh doanh nghiep", "thu vien anh", "anh bia", "up anh", "tai anh len"]),
  F("bizlocation", "biz", "Ghim vị trí doanh nghiệp lên bản đồ thế nào?", "How do I pin my business on the map?",
    "Đứng tại quán, vào Hồ sơ doanh nghiệp → bấm “Ghim vị trí hiện tại” → Lưu doanh nghiệp. Doanh nghiệp sẽ hiện trên Bản đồ và mục Gần đây. Chỉ bán online thì bật “Chỉ bán hàng online” thay vì ghim.",
    "At your shop, open Business profile → “Pin current location” → Save. It'll show on the Map and in Nearby. Online-only? Toggle that instead.",
    ["ghim vi tri", "vi tri quan", "len ban do", "toa do", "dinh vi quan", "khong hien tren ban do"]),
  F("bizonline", "biz", "Chỉ bán online, không có cửa hàng thì sao?", "I only sell online",
    "Không sao nha! Trong hồ sơ doanh nghiệp bật “Chỉ bán hàng online (không có địa điểm/giờ mở cửa cố định)”. Doanh nghiệp sẽ có nhãn Bán hàng online.",
    "No problem — toggle “Online-only” in your business profile and you'll get an Online store badge.",
    ["ban online", "ban hang online", "khong co cua hang", "shop online", "khong co dia diem"]),
  F("bizmulti", "biz", "Một người tạo được nhiều doanh nghiệp không?", "Can I own several businesses?",
    "Được nha! Mỗi thành viên tạo được nhiều doanh nghiệp. Vào Hồ sơ → ⋯ → Hồ sơ doanh nghiệp → Tạo thêm doanh nghiệp.",
    "Yes — Profile → ⋯ → Business profile → Create another business.",
    ["nhieu doanh nghiep", "them doanh nghiep thu hai", "tao them", "2 quan"]),
  F("bizstatus", "biz", "Doanh nghiệp bị yêu cầu bổ sung hoặc từ chối?", "My business needs revision / was rejected",
    "Xem ghi chú “Ban quản trị yêu cầu bổ sung” trong Hồ sơ doanh nghiệp hoặc trong thông báo, sửa đúng mục được nhắc rồi Lưu — hồ sơ sẽ tự gửi lại để duyệt. Cần hỏi thêm thì vào Hồ sơ → ⋯ → Trợ giúp & Liên hệ.",
    "Check the admin note in your Business profile or notifications, fix the items and Save — it resubmits automatically. Questions? Profile → ⋯ → Help & Contact.",
    ["bi tu choi", "yeu cau bo sung", "can bo sung", "can chinh sua", "khong duoc duyet doanh nghiep", "doanh nghiep cho duyet"]),
  F("regulars", "biz", "Khách quen / Tin dùng là gì?", "What are Regulars?",
    "Khách nhận ưu đãi ở doanh nghiệp nhiều lần sẽ tự vào danh sách Khách quen của doanh nghiệp đó: Khách VIP (từ 5 lần), Khách quen (2–4 lần), Khách mới (1 lần). Phía thành viên, các nơi bạn hay nhận ưu đãi hiện ở mục Tin dùng, có thể bật/tắt thông báo deal mới của từng nơi.",
    "Customers who claim offers repeatedly show up in the business's Regulars: VIP (5+), Regular (2–4), New (1). On the member side, places you use appear under Trusted, with per-place deal notifications.",
    ["khach quen", "tin dung", "khach vip", "khach than thiet", "danh sach khach"]),
  F("reviewreply", "biz", "Trả lời đánh giá của khách thế nào?", "How do I reply to reviews?",
    "Mở trang doanh nghiệp của bạn, dưới mỗi đánh giá bấm Trả lời. Gặp đánh giá chưa tốt thì cứ bình tĩnh cảm ơn, xin lỗi và mời khách quay lại nha 😊",
    "Open your business page and tap Reply under a review. For negative ones, thank, apologize and invite them back 😊",
    ["tra loi danh gia", "phan hoi danh gia", "rep review", "danh gia xau", "bi che"]),
  F("bizreports", "biz", "Có người báo cáo doanh nghiệp của mình thì sao?", "Someone reported my business",
    "Vào Báo cáo của tôi (/bao-cao-cua-toi) → tab Về doanh nghiệp của tôi. Bạn phản hồi, xử lý rồi bấm Đánh dấu đã xử lý xong; người báo cáo sẽ xác nhận có hài lòng hay không. Nếu chưa hài lòng, Admin sẽ hỗ trợ thêm.",
    "Go to My reports (/bao-cao-cua-toi) → About my business. Reply, fix it and mark as resolved; the reporter confirms whether they're satisfied, otherwise an admin steps in.",
    ["bao cao doanh nghiep cua toi", "bi bao cao", "khach bao cao", "khieu nai"]),

  // ── Quẹt ──
  F("quetwhat", "quet", "Quẹt là gì, dùng thế nào?", "What is Swipe?",
    "Quẹt (/quet) giúp tìm người hợp ý theo 4 mục: Game, Làm quen, Trao đổi, Công việc.\n1. Chọn mục → tạo nhu cầu của bạn\n2. Vuốt phải 👉 nếu thích, trái 👈 để bỏ qua, vuốt lên 👆 (hoặc bấm ⓘ) xem chi tiết\n3. Hai bên cùng thích → Kết nối, nhắn tin được ngay 💬",
    "Swipe (/quet) has 4 categories: Game, Dating, Trade, Jobs. Pick one → create your need → swipe right to like, left to pass, up (or ⓘ) for details. Mutual like → Connection, start chatting 💬",
    ["quet la gi", "cach quet", "dung quet", "quet the nao", "swipe", "ket noi la gi"]),
  F("quetlimit", "quet", "Mỗi ngày được quẹt bao nhiêu lượt?", "How many swipes per day?",
    "Tài khoản thường được 10 lượt quẹt/ngày, Membership thì quẹt không giới hạn. Lượt mới tính lại mỗi ngày theo giờ Việt Nam.",
    "Regular accounts get 10 swipes/day; Membership is unlimited. Resets daily (Vietnam time).",
    ["luot quet", "het luot", "gioi han quet", "quet bi gioi han", "bao nhieu luot", "10 luot", "khong quet duoc"]),
  F("quetundo", "quet", "Lỡ quẹt nhầm thì sao?", "I swiped by mistake",
    "Bấm nút ↺ (hoàn tác) cạnh nút ✕ ngay sau khi quẹt. Người bạn đã bỏ qua cũng sẽ hiện lại sau 48 giờ, hoặc khi họ sửa nhu cầu.",
    "Tap ↺ (undo) next to ✕ right after. Passed people also reappear after 48h or when they edit their need.",
    ["quet nham", "hoan tac", "undo", "bo qua nham", "lo tay"]),
  F("quetconnect", "quet", "Kết nối và Tin nhắn khác nhau sao?", "Connections vs Messages?",
    "Tab Kết nối chỉ hiện những người bạn CHƯA nhắn tin. Sau tin nhắn đầu tiên, cuộc trò chuyện chuyển sang Tin nhắn (có nhãn 🔥 Từ Quẹt). Muốn huỷ kết nối thì bấm ⋯ ở tab Kết nối hoặc trong khung chat → Huỷ kết nối.",
    "Connections only lists people you haven't messaged yet. After the first message the chat lives in Messages (🔥 From Swipe). To unmatch: ⋯ → Unmatch.",
    ["ket noi", "huy ket noi", "unmatch", "tu quet", "tab ket noi"]),
  F("quetmanage", "quet", "Sửa, tạm dừng hoặc xoá nhu cầu ở đâu?", "How do I edit or pause my need?",
    "Vào Quẹt → bấm nút Quản lý / Chỉnh sửa trên thẻ mục đó → sửa, Tạm dừng, Kích hoạt lại hoặc Xoá nhu cầu. Nhu cầu đang tạm dừng sẽ không hiện cho người khác.",
    "Swipe → Manage / Edit on that category card → edit, pause, reactivate or delete. Paused needs are hidden from others.",
    ["sua nhu cau", "tat nhu cau", "xoa nhu cau", "quan ly nhu cau", "tam dung nhu cau", "an nhu cau"]),
  F("quettrade", "quet", "Đăng mua bán, cho thuê nhà, đồ đạc ở đâu?", "Where do I post buy/sell or rentals?",
    "Vào Quẹt → Trao đổi → chọn hình thức Mua/bán hoặc Thuê/cho thuê (hoặc Trao đổi tương tác mạng xã hội). Điền loại hình, giá, tình trạng, diện tích (với nhà đất), thêm tối đa 4 ảnh. Người quan tâm quẹt phải là hai bên kết nối nhắn tin được.",
    "Swipe → Trade → pick Buy/sell or Rent (or social engagement swap). Fill in type, price, condition, area for property, up to 4 photos. Mutual likes connect you.",
    ["mua ban", "cho thue", "thue nha", "ban nha", "phong tro", "ban do", "dang ban", "thanh ly"]),
  F("quetjob", "quet", "Tìm việc hoặc tuyển người trên app thế nào?", "How do I find a job or hire?",
    "Vào Quẹt → Công việc → chọn Tìm việc hoặc Tuyển người. Điền ngành nghề, lương (mong muốn/đề nghị), kinh nghiệm, ca làm theo ngày… Hai bên cùng thích là kết nối nhắn tin được. Ngoài ra có kênh Việc làm ở Cộng đồng (/cong-dong).",
    "Swipe → Jobs → Job seeker or Hiring. Add industry, salary, experience, shifts… Mutual likes connect you. There's also a Jobs channel in Community (/cong-dong).",
    ["tim viec", "tuyen nguoi", "tuyen nhan vien", "viec lam", "xin viec", "tuyen dung", "lam them"]),
  F("quetfilter", "quet", "Lọc người theo tuổi, khoảng cách được không?", "Can I filter by age or distance?",
    "Được nha! Khi đang quẹt, bấm Bộ lọc để chọn độ tuổi, hình thức… Bấm “📍 Bật định vị” thì chọn thêm Bán kính (5–100 km) và thấy khoảng cách tới từng người. Muốn người khác thấy khoảng cách tới bạn thì bật “Chia sẻ vị trí” khi tạo nhu cầu.",
    "Yes — tap Filters for age, mode, etc. Turn on location to pick a radius (5–100 km) and see distances. Share your location on your need so others see yours.",
    ["loc", "bo loc", "khoang cach", "ban kinh", "do tuoi", "filter"]),
  F("quetsafety", "quet", "Gặp người lạ trên Quẹt cần lưu ý gì?", "Safety tips for meeting people",
    "• Gặp lần đầu ở nơi công cộng, báo cho người thân biết\n• Không chuyển tiền cọc trước khi xem hàng / gặp người\n• Thấy dấu hiệu lừa đảo → bấm ⋯ trên thẻ để Báo cáo hoặc Chặn",
    "• Meet in public first and tell someone\n• Never pay a deposit before seeing the item/person\n• Suspicious? Tap ⋯ on the card to Report or Block",
    ["an toan", "lua dao", "nguoi la", "gap nguoi la", "an toan khi gap", "coc tien"]),

  // ── Đưa đón ──
  F("ridebook", "rides", "Đặt xe hoặc giao hàng thế nào?", "How do I book a ride or delivery?",
    "Trang chủ → Đưa đón & Giao hàng (/dua-don):\n1. Chọn Chở người, Giao hàng hoặc Giao đồ ăn, rồi chọn loại xe (xe máy, ô tô 4/7 chỗ, xe giao hàng)\n2. Chọn điểm đón và điểm đến (kéo ghim trên bản đồ cho chính xác)\n3. Xem giá tham khảo → Đặt ngay\nTài xế nhận chuyến sẽ liên hệ bạn, bạn theo dõi tài xế trực tiếp trên bản đồ 🗺️",
    "Home → Rides & Delivery (/dua-don): choose passenger, parcel or food delivery and a vehicle, set pickup and drop-off (drag the pins), check the reference fare → Book. The driver contacts you and you can track them live 🗺️",
    ["dat xe", "goi xe", "giao hang", "dua don", "ship do", "book xe", "xe om", "giao do an", "chuyen xe"]),
  F("ridprice", "rides", "Giá cuốc xe tính thế nào?", "How is the fare calculated?",
    "App hiện giá THAM KHẢO theo quãng đường ước tính: giá mở cửa (đã gồm vài km đầu) + giá mỗi km tiếp theo, tuỳ loại xe; hàng cồng kềnh hoặc cần bốc dỡ có phụ phí. Giá cuối cùng hai bên tự thoả thuận, trả tiền mặt cho tài xế — tài xế nhận 100%, app không thu phí. Tối đa 200 km mỗi chuyến.",
    "The app shows a REFERENCE fare from the estimated distance: base fare (covers the first few km) + per-km rate by vehicle, with surcharges for bulky items or loading help. You and the driver agree the final price and pay cash — drivers keep 100%. Max 200 km per trip.",
    ["gia cuoc", "tinh gia", "bao nhieu tien", "gia xe", "phi giao hang", "tinh tien", "cuoc phi", "bang gia"]),
  F("ridepay", "rides", "Trả tiền chuyến xe thế nào?", "How do I pay for a ride?",
    "Bạn trả tiền mặt trực tiếp cho tài xế theo giá hai bên thoả thuận. App không thu tiền và không lấy phí 💚",
    "Pay the driver in cash at the agreed price. The app takes no money or fee 💚",
    ["tra tien", "tra tien tai xe", "thanh toan chuyen", "chuyen khoan tai xe", "tien mat", "thanh toan"]),
  F("ridecancel", "rides", "Huỷ chuyến xe thế nào?", "How do I cancel a ride?",
    "Mở Đưa đón (/dua-don) → ở Chuyến hiện tại bấm Hủy chuyến. Nếu tài xế đã nhận chuyến, bạn nhắn hoặc gọi báo tài xế một tiếng cho lịch sự nha.",
    "Open Rides (/dua-don) → Current trip → Cancel. If a driver already accepted, message or call them to let them know.",
    ["huy chuyen", "huy xe", "khong di nua", "cancel"]),
  F("ridetrack", "rides", "Theo dõi tài xế đang tới ở đâu?", "How do I track my driver?",
    "Khi tài xế nhận chuyến, bản đồ ở Chuyến hiện tại sẽ hiện vị trí tài xế trực tiếp ● và thời gian ước tính. Bạn cũng nhắn tin hoặc gọi tài xế được ngay trong chuyến. Xem lại các chuyến cũ ở Lịch sử chuyến.",
    "Once accepted, the Current trip map shows the driver live ● with an ETA. You can message or call them. Past trips are in Trip history.",
    ["theo doi tai xe", "tai xe o dau", "vi tri tai xe", "lich su chuyen", "tai xe den chua"]),
  F("ridedriver", "rides", "Muốn làm tài xế thì đăng ký sao?", "How do I become a driver?",
    "Vào Đưa đón (/dua-don) → tab Tài xế → gửi hồ sơ: ảnh chân dung (bắt buộc), biển số, hiệu/màu xe, có thể thêm ảnh xe và bằng lái, chọn nhận cả giao hàng nếu muốn. Ban quản trị duyệt xong bạn bật Online để thấy các chuyến gần mình.",
    "Rides (/dua-don) → Driver tab → submit a portrait photo (required), plate, vehicle description, optional vehicle/license photos, and whether you also deliver. After approval, go Online to see nearby trips.",
    ["lam tai xe", "dang ky tai xe", "chay xe", "nhan cuoc", "tai xe", "lam shipper", "chay grab"]),
  F("driveronline", "rides", "Tài xế nhận chuyến thế nào?", "How do drivers take trips?",
    "Ở tab Tài xế bật Online để thấy các chuyến đang chờ gần bạn → Nhận chuyến → Đã đón khách / Đã lấy hàng → Hoàn thành chuyến. Trong lúc chạy nhớ giữ app mở để khách thấy bạn trên bản đồ nha.",
    "In the Driver tab go Online to see nearby trips → Accept → Picked up → Complete. Keep the app open while driving so the customer sees you on the map.",
    ["bat online", "nhan chuyen", "tai xe online", "khong thay chuyen", "hoan thanh chuyen"]),
  F("tip", "rides", "Tip ủng hộ app là gì?", "What is tipping the app?",
    "Sau chuyến đi hoặc khi nhận ưu đãi, bạn có thể tự nguyện tip 5k–20k để ủng hộ app 💚 Hiện chỉ ghi nhận, chưa thu tiền thật — khi mở thanh toán app sẽ báo.",
    "After a ride or claiming an offer you may voluntarily tip 5k–20k 💚 It's recorded only — no money is charged yet.",
    ["tip", "ung ho app", "donate", "boa"]),

  // ── Tin nhắn & Cộng đồng ──
  F("msgstart", "chat", "Nhắn tin cho ai đó thế nào?", "How do I message someone?",
    "Vào Tin nhắn (/tin-nhan), gõ tên hoặc @username vào ô tìm kiếm rồi chọn người. Hoặc bấm Nhắn tin ngay trên hồ sơ người đó hay trên trang doanh nghiệp.",
    "Open Messages (/tin-nhan), search a name or @username and pick them — or tap Message on their profile or business page.",
    ["nhan tin", "gui tin nhan", "chat voi", "nhan cho", "inbox", "tin nhan rieng"]),
  F("msgfeatures", "chat", "Trong khung chat làm được những gì?", "What can I do in a chat?",
    "Trong chat bạn có thể:\n• Gửi ảnh (chọn ảnh hoặc chụp), GIF và Sticker\n• Ghi âm tin nhắn thoại (tạm dừng/tiếp tục được)\n• Trả lời, sửa hoặc xoá tin nhắn\n• Gọi thoại 📞, gọi video 🎥\n• Xem “Đã xem lúc…” khi người kia đọc",
    "In chats you can send photos, GIFs and stickers, record voice messages, reply to/edit/delete messages, make voice 📞 or video 🎥 calls, and see read receipts.",
    ["gui anh", "gui gif", "sticker", "tin nhan thoai", "ghi am", "sua tin nhan", "xoa tin nhan", "tra loi tin nhan", "da xem"]),
  F("msgmanage", "chat", "Ghim, tắt thông báo hoặc xoá cuộc trò chuyện?", "Pin, mute or delete a conversation?",
    "Trong danh sách Tin nhắn, nhấn giữ hoặc bấm ⋯ ở cuộc trò chuyện để Ghim, Tắt thông báo hoặc Xóa cuộc trò chuyện. Trong khung chat có mục Xem tất cả media để xem lại ảnh/GIF đã gửi.",
    "In Messages, long-press or tap ⋯ on a conversation to Pin, Mute or Delete it. Inside a chat, “See all media” shows shared photos/GIFs.",
    ["ghim tin nhan", "tat thong bao tin nhan", "xoa cuoc tro chuyen", "an tin nhan", "mute", "media"]),
  F("group", "chat", "Tạo nhóm chat thế nào?", "How do I create a group chat?",
    "Vào Tin nhắn (/tin-nhan) → bấm biểu tượng nhóm cạnh ô tìm kiếm → chọn thành viên → đặt tên nhóm. Mỗi nhóm tối đa 50 người. Trưởng nhóm đổi tên, thêm hoặc mời người ra được; ai cũng có thể Rời nhóm.",
    "Messages (/tin-nhan) → group icon next to search → pick members → name it. Up to 50 people. The group admin can rename, add or remove people; anyone can leave.",
    ["tao nhom", "nhom chat", "chat nhom", "group", "roi nhom", "them nguoi vao nhom"]),
  F("call", "chat", "Gọi thoại, gọi video thế nào?", "How do voice/video calls work?",
    "Trong khung chat 1-1, bấm 📞 để gọi thoại hoặc 🎥 để gọi video (người kia cần đang online). Trong cuộc gọi có tắt/bật mic, camera, đổi camera. Nhật ký cuộc gọi xem ở /cuoc-goi.",
    "In a 1-1 chat tap 📞 for voice or 🎥 for video (they must be online). Toggle mic/camera or switch camera during the call. Call history is at /cuoc-goi.",
    ["goi dien", "goi video", "goi thoai", "cuoc goi", "call", "nhat ky cuoc goi", "cuoc goi nho"]),
  F("community", "chat", "Cộng đồng dùng để làm gì?", "What is Community for?",
    "Cộng đồng (/cong-dong) là phòng chat chung theo KHU VỰC và CHỦ ĐỀ: Chat chung, Việc làm, Mua bán, Nhà ở / Phòng trọ, Game, Chia sẻ, Hỏi đáp, Tin tức, Linh tinh. Chọn vị trí (hoặc Toàn quốc) và chủ đề ở đầu trang để vào đúng phòng. Cần tài khoản đã được duyệt nha.",
    "Community (/cong-dong) is group chat by AREA and TOPIC: General, Jobs, Marketplace, Housing, Game, Sharing, Q&A, News, Random. Pick a location (or Nationwide) and topic at the top. Requires an approved account.",
    ["cong dong", "phong chat", "chat chung", "kenh khu vuc", "chu de", "hoi dap", "toan quoc"]),
  F("block", "chat", "Chặn hoặc bỏ chặn ai đó?", "How do I block or unblock someone?",
    "Trong khung chat hoặc hồ sơ người đó bấm ⋯ → Chặn người dùng. Người bị chặn không nhắn tin, gọi hay xem hồ sơ của bạn được. Muốn bỏ chặn: Hồ sơ → ⋯ → Cài đặt → Người dùng đã chặn.",
    "In their chat or profile tap ⋯ → Block user — they can't message, call or view you. To unblock: Profile → ⋯ → Settings → Blocked users.",
    ["chan", "chan nguoi", "chan nguoi khac", "bo chan", "block", "unblock", "bi lam phien"]),
  F("report", "chat", "Báo cáo nội dung hoặc người dùng thế nào?", "How do I report something?",
    "Bấm nút Báo cáo (⚑ hoặc ⋯ → Báo cáo) trên trang doanh nghiệp, đánh giá, thẻ Quẹt hoặc hồ sơ. Mô tả vấn đề là bắt buộc, ảnh minh hoạ thì tuỳ chọn. Theo dõi phản hồi ở Báo cáo của tôi (/bao-cao-cua-toi): Chờ xử lý → Đã phản hồi → Đã giải quyết.",
    "Tap Report (⚑ or ⋯ → Report) on a business, review, swipe card or profile. A description is required, a photo optional. Track it in My reports (/bao-cao-cua-toi).",
    ["bao cao", "to cao", "report", "khieu nai", "bao cao cua toi", "bi lua"]),

  // ── Hồ sơ ──
  F("friends", "profile", "Bạn bè và người theo dõi khác nhau sao?", "Friends vs followers?",
    "Bạn theo dõi ai đó thì thấy hoạt động của họ. Khi hai người theo dõi qua lại nhau thì tự thành Bạn bè 🤝 Xem danh sách ở nút Bạn bè trên Hồ sơ, hoặc tab Theo dõi trong Tin nhắn.",
    "Following someone shows their activity. When you follow each other you become Friends 🤝 See them via Friends on your Profile or the Follows tab in Messages.",
    ["ban be", "theo doi", "follow", "nguoi theo doi", "ket ban", "huy ket ban", "bo theo doi"]),
  F("status", "profile", "Dòng trạng thái trên hồ sơ để làm gì?", "What is the status line?",
    "Là một dòng ngắn (tối đa 60 ký tự) hiện ngay trên ảnh đại diện của bạn: tuyển người, tìm việc, tìm đối tác… hoặc đơn giản là một lời chào. Bấm “+ Thêm dòng trạng thái” trên Hồ sơ để viết.",
    "A short line (max 60 characters) above your avatar — hiring, job hunting, looking for partners, or just a hello. Tap “+ Add status line” on Profile.",
    ["trang thai", "status", "dong trang thai", "ghi chu"]),
  F("avatar", "profile", "Đổi ảnh đại diện, tên, giới thiệu thế nào?", "Change avatar, name or bio?",
    "Vào Hồ sơ (/ho-so): chạm ảnh đại diện (biểu tượng máy ảnh) để đổi ảnh. Bấm ⋯ → Hồ sơ cá nhân để sửa họ tên, email, SĐT và phần giới thiệu (tối đa 300 ký tự) → Lưu thay đổi.",
    "Profile (/ho-so): tap your avatar (camera icon) to change it. ⋯ → Personal profile to edit name, email, phone and bio (max 300 chars) → Save.",
    ["doi anh", "anh dai dien", "doi ten", "sua ho so", "gioi thieu ban than", "avatar", "doi so dien thoai", "doi email", "bio"]),
  F("username", "profile", "Đổi tên đăng nhập được không?", "Can I change my username?",
    "Tên đăng nhập hiện không tự đổi được. Nếu thật sự cần đổi, bạn liên hệ Ban quản trị ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ nha. Họ tên hiển thị thì tự sửa ở Hồ sơ cá nhân được.",
    "Usernames can't be changed yourself — contact the admins via Profile → ⋯ → Help & Contact. Your display name can be edited in Personal profile.",
    ["doi ten dang nhap", "doi username", "sua username", "ten dang nhap"]),
  F("wall", "profile", "Đăng bài lên trang cá nhân thế nào?", "How do I post on my profile?",
    "Trên Hồ sơ, ở ô “Bạn đang nghĩ gì?” viết nội dung, thêm ảnh nếu muốn → Đăng. Mọi người thả tim ❤️ và bình luận được; bạn sửa hoặc xoá bài bất cứ lúc nào.",
    "On your Profile, write in “What's on your mind?”, add a photo → Post. People can react ❤️ and comment; you can edit or delete anytime.",
    ["dang bai", "viet bai", "tuong", "bai viet", "dang status", "binh luan", "tha tim"]),
  F("profileview", "profile", "Xem hồ sơ người khác thế nào?", "How do I view someone's profile?",
    "Bấm vào tên hoặc ảnh đại diện của họ ở bất kỳ đâu (Cộng đồng, Tin nhắn, đánh giá…) để xem nhanh, rồi bấm Xem trang cá nhân. Trên Hồ sơ của bạn cũng có mục Gợi ý cho bạn để theo dõi người quen.",
    "Tap anyone's name or avatar for a quick view, then View profile. Your Profile also has “Suggested for you”.",
    ["xem ho so", "trang ca nhan nguoi khac", "tim nguoi", "goi y theo doi"]),

  // ── Tài khoản & Cài đặt ──
  F("password", "account", "Đổi mật khẩu ở đâu?", "How do I change my password?",
    "Hồ sơ → ⋯ → Cài đặt (/ho-so?view=settings) → Đổi mật khẩu: nhập mật khẩu hiện tại và mật khẩu mới (từ 6 ký tự).",
    "Profile → ⋯ → Settings (/ho-so?view=settings) → Change password: enter your current and new password (6+ characters).",
    ["doi mat khau", "thay mat khau", "change password", "mat khau moi"]),
  F("forgot", "account", "Quên mật khẩu thì làm sao?", "I forgot my password",
    "Ở màn đăng nhập bấm Quên mật khẩu, nhập ĐÚNG cả email và số điện thoại đã đăng ký. App sẽ cho bạn xem tên đăng nhập và gợi ý mật khẩu (2 ký tự đầu + ký tự cuối). Nhập sai nhiều lần sẽ bị khoá tạm vài phút. Vẫn không nhớ thì liên hệ admin qua Email / Zalo / Facebook ngay trên màn đó.",
    "On the login screen tap Forgot password and enter BOTH your registered email and phone. You'll see your username and a password hint (first 2 + last character). Too many wrong tries lock it for a few minutes. Still stuck? Contact the admins from that screen.",
    ["quen mat khau", "khong dang nhap duoc", "mat tai khoan", "forgot password", "quen ten dang nhap", "lay lai mat khau", "quen mk"]),
  F("forgotnoemail", "account", "Quên mật khẩu mà không nhớ email / số điện thoại?", "Forgot password and don't remember my email or phone?",
    "Vì lý do bảo mật, lấy lại mật khẩu cần nhập đúng cả email và số điện thoại đã đăng ký. Nếu không nhớ (hoặc không còn dùng) email/SĐT đó, bạn liên hệ Ban quản trị qua Email / Zalo / Facebook ngay ở màn Quên mật khẩu — admin sẽ hỏi vài thông tin để xác minh đúng là bạn rồi hỗ trợ lấy lại tài khoản nha.",
    "For security, password recovery needs BOTH your registered email and phone. If you don't remember them (or no longer use them), contact the admins via Email / Zalo / Facebook right on the Forgot password screen — they'll verify it's you and help you recover your account.",
    ["khong co email", "khong nho email", "mat email", "quen email", "khong nho so dien thoai", "doi so dien thoai roi", "mat sim", "khong con dung email"]),
  F("deleterestore", "account", "Xoá tài khoản rồi có lấy lại được không?", "Can a deleted account be restored?",
    "Việc xoá tài khoản do Ban quản trị thực hiện theo yêu cầu của bạn. Muốn hỏi tài khoản đã xoá có khôi phục được không, bạn liên hệ Ban quản trị qua Hồ sơ → ⋯ → Trợ giúp & Liên hệ (hoặc Email / Zalo / Facebook ở màn đăng nhập) để được trả lời chính xác nha.",
    "Account deletion is done by the admins on request. To ask whether a deleted account can be restored, contact the admins via Profile → ⋯ → Help & Contact (or Email / Zalo / Facebook on the login screen).",
    ["xoa roi lay lai", "khoi phuc tai khoan", "lay lai tai khoan da xoa", "tai khoan bi xoa", "xoa roi co lay lai duoc khong", "mo lai tai khoan"]),
  F("notif", "account", "Tắt / bật thông báo thế nào?", "Turn notifications on/off?",
    "Hồ sơ → ⋯ → Cài đặt → Thông báo: bấm Bật thông báo đẩy, rồi chọn riêng từng loại: Tin nhắn mới, Người theo dõi mới, Ưu đãi mới từ doanh nghiệp đang theo dõi, Thông báo từ admin, Hoạt động khách quen, Được nhắc tên. Muốn tắt riêng một cuộc trò chuyện thì bấm ⋯ ở cuộc trò chuyện đó → Tắt thông báo.",
    "Profile → ⋯ → Settings → Notifications: enable push, then choose each type (messages, new followers, deals, admin, regulars activity, mentions). To mute one chat: ⋯ on that conversation → Mute.",
    ["thong bao", "tat thong bao", "bat thong bao", "notification", "thong bao day"]),
  F("notifmissing", "account", "Sao mình không nhận được thông báo?", "Why am I not getting notifications?",
    "Bạn kiểm tra giúp mình mấy điều này nha:\n1. Hồ sơ → ⋯ → Cài đặt → Thông báo → đã Bật thông báo đẩy chưa (hoặc bấm Đồng bộ lại)\n2. Trình duyệt/điện thoại có cho phép thông báo không\n3. iPhone: phải cài app ra màn hình chính thì mới nhận được thông báo\n4. Android: vào Cài đặt ứng dụng của app → tắt “Quản lý ứng dụng nếu không dùng”",
    "Check: 1) Profile → ⋯ → Settings → Notifications → push enabled (or tap Resync); 2) notifications allowed in the browser/phone; 3) on iPhone the app must be installed to the Home Screen; 4) on Android turn off “Manage app if unused”.",
    ["khong nhan thong bao", "khong nhan duoc thong bao", "khong co thong bao", "mat thong bao", "thong bao khong den", "khong bao", "khong thay thong bao"]),
  F("theme", "account", "Đổi giao diện tối hoặc ngôn ngữ?", "Dark mode / language?",
    "Hồ sơ → ⋯ → Cài đặt → Giao diện (sáng/tối) và Ngôn ngữ / Language (Tiếng Việt / English).",
    "Profile → ⋯ → Settings → Theme (light/dark) and Language (Vietnamese / English).",
    ["giao dien toi", "che do toi", "dark mode", "ngon ngu", "tieng anh", "language", "doi mau"]),
  F("support", "account", "Liên hệ Ban quản trị thế nào?", "How do I contact the admins?",
    "Vào Hồ sơ → ⋯ → Trợ giúp & Liên hệ: Email lienminhliendoanh@gmail.com, Zalo 0339565246 hoặc Facebook Liên Minh Liên Doanh. Hoặc gửi Báo cáo và theo dõi phản hồi ở /bao-cao-cua-toi.",
    "Profile → ⋯ → Help & Contact: email lienminhliendoanh@gmail.com, Zalo 0339565246 or our Facebook page. Or send a Report and track it at /bao-cao-cua-toi.",
    ["lien he", "ban quan tri", "admin", "ho tro", "hotline", "support", "zalo", "email admin", "tro giup"]),
  F("logout", "account", "Đăng xuất thế nào? Sao mình bị đăng xuất?", "How do I log out? Why was I logged out?",
    "Đăng xuất: Hồ sơ → ⋯ → Đăng xuất (chỉ đăng xuất trên máy đó). Nếu tự nhiên bị đăng xuất trên Android, bạn vào Cài đặt ứng dụng của app và tắt “Quản lý ứng dụng nếu không dùng”, rồi đăng nhập lại nha.",
    "Log out: Profile → ⋯ → Log out (this device only). If Android logs you out on its own, turn off “Manage app if unused” for the app and log in again.",
    ["dang xuat", "bi dang xuat", "thoat tai khoan", "logout", "tu dang xuat"]),
  F("deleteacc", "account", "Xoá tài khoản thế nào?", "How do I delete my account?",
    "Hiện chưa có nút tự xoá tài khoản trong app. Bạn liên hệ Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ) để được hỗ trợ xoá nha.",
    "There's no self-delete button yet — contact the admins via Profile → ⋯ → Help & Contact.",
    ["xoa tai khoan", "huy tai khoan", "khoa tai khoan", "delete account", "xoa acc"]),
  F("privacy", "account", "Thông tin cá nhân của mình có an toàn không?", "Is my personal data safe?",
    "App chỉ dùng thông tin để vận hành dịch vụ, không bán dữ liệu. Ngày sinh không hiển thị công khai. Chi tiết xem Chính sách bảo mật ở chân Trang chủ. Lomi không bao giờ hỏi mật khẩu hay mã OTP của bạn 🔒",
    "Data is only used to run the service and never sold. Your birthday isn't public. See the Privacy Policy at the bottom of Home. Lomi never asks for your password or OTP 🔒",
    ["bao mat", "an toan thong tin", "du lieu ca nhan", "privacy", "rieng tu", "chinh sach"]),
  F("lomi", "account", "Lomi là ai, hỏi Lomi được gì?", "Who is Lomi?",
    "Mình là Lomi — trợ lý của Liên Minh Liên Doanh 🌱 Mình giỏi mấy việc này:\n• 🔮 Bói Tarot: cứ gõ câu hỏi, vd “bói xem khi nào mình có việc mới”\n• 💬 Tâm sự, tư vấn tình cảm – tâm lý: buồn, áp lực, cãi nhau với người yêu… kể mình nghe nha\n• 🩺 Sức khoẻ thường gặp: kể triệu chứng, mình gợi ý nên làm gì, kiêng gì, khám khoa nào\n• 📱 Cách dùng app, gợi ý quán ăn, tư vấn kinh doanh\nTất cả đều miễn phí nha! Kéo mình đi đâu cũng được, thả sát mép thì mình nấp cho đỡ vướng 😄",
    "I'm Lomi, the Liên Minh Liên Doanh assistant 🌱 Tarot readings, a listening ear (love & wellbeing), common health tips, and help with the app — all free! Drag me anywhere; drop me at the edge to hide 😄",
    ["lomi la ai", "ban la ai", "tro ly", "hoi duoc gi", "who are you", "lomi lam duoc gi"]),
];

// ── Chuẩn hoá chữ (không dấu, chữ thường) ──
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

// Từ đồng nghĩa / viết tắt hay gặp → quy về một cách viết.
const SYN: [RegExp, string][] = [
  [/\b(khuyen mai|voucher|deal|coupon|giam gia)\b/g, "uu dai"],
  [/\b(mk|pass word|password|pw)\b/g, "mat khau"],
  [/\b(tk|acc|account)\b/g, "tai khoan"],
  [/\b(sdt|so dt|dt)\b/g, "so dien thoai"],
  [/\b(dn)\b/g, "doanh nghiep"],
  [/\b(dk|dki|dang ki|dangky|dangki)\b/g, "dang ky"],
  [/\b(matkhau)\b/g, "mat khau"],
  [/\b(noti|notification|thong bao day)\b/g, "thong bao"],
  [/\b(ib|inbox|chat rieng)\b/g, "nhan tin"],
  [/\b(shipper|xe om|grab)\b/g, "tai xe"],
  [/\b(swipe)\b/g, "quet"],
  [/\b(ava)\b/g, "anh dai dien"],
  [/\b(k|ko|khong|hong|hok|hk)\b/g, "khong"],
  [/\b(dc|duoc|dk duoc)\b/g, "duoc"],
  [/\b(sao|tai sao|vi sao)\b/g, "sao"],
  // 30/09 r6: cách hỏi đời thường ("1 ngày quẹt đc mấy lần", "admin duyệt lâu k")
  [/\b(1 ngay|mot ngay|moi hom|1 hom)\b/g, "moi ngay"],
  [/\b(may lan|bao nhieu lan|may luot|may cai)\b/g, "bao nhieu luot"],
  [/\b(duyet lau|lau duyet|bao gio duoc duyet|khi nao duoc duyet|duyet bao lau|cho duyet lau)\b/g, "bao lau duoc duyet"],
  [/\b(ad|quan tri vien|ban quan tri)\b/g, "admin"],
];
// Từ đệm, không mang nghĩa khi so khớp.
const STOP = new Set(
  "la gi the nao sao lam cach o dau duoc khong co toi tui t minh em anh a e oi vay nhi nha nhe voi cho cua va hay thi ma de muon can biet giup huong dan chi hoi di roi nao ai lomi app nay do day cai nhung cac mot nhu nguoi ta vao ra len xuong".split(
    " ",
  ),
);

function canon(text: string): string {
  let n = ` ${normalizeVi(text)} `;
  for (const [re, to] of SYN) n = n.replace(re, to);
  return n.replace(/\s+/g, " ").trim();
}
const tokens = (s: string) => s.split(" ").filter((w) => w && !STOP.has(w));

// Chịu được gõ sai 1 ký tự với từ từ 4 chữ trở lên.
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

// Chỉ mục từ cho từng câu hỏi (tính 1 lần).
type Indexed = { f: Faq; text: string; toks: Set<string>; kws: string[] };
let INDEX: Indexed[] | null = null;
function index(): Indexed[] {
  if (INDEX) return INDEX;
  INDEX = FAQS.map((f) => {
    const kws = [...new Set(f.kw.map(canon))]; // bỏ trùng sau khi quy đồng nghĩa (vd "thong bao day" → "thong bao")
    const text = ` ${[canon(f.q.vi), canon(f.q.en), ...kws].join(" | ")} `;
    return { f, text, toks: new Set(tokens(text.replace(/\|/g, " "))), kws };
  });
  return INDEX;
}

function scoreAll(text: string): { f: Faq; score: number; cover: number }[] {
  const n = ` ${canon(text)} `;
  // Câu toàn từ phổ biến ("lomi là ai", "app này là gì") → vẫn so từng từ, không bỏ từ đệm.
  const qt0 = tokens(n.trim());
  const qt = qt0.length ? qt0 : n.trim().split(" ").filter(Boolean);
  if (!qt.length) return [];
  return index()
    .map(({ f, text: ft, toks, kws }) => {
      let score = 0;
      // 1) Trùng cụm từ khoá: cụm càng dài càng chắc.
      for (const k of kws) {
        if (k && n.includes(` ${k} `)) score += k.split(" ").length >= 2 ? 3 + k.split(" ").length : qt.length <= 3 ? 3 : 1.5;
      }
      // 2) Trùng nguyên câu hỏi mẫu.
      if (n.includes(` ${canon(f.q.vi)} `) || n.includes(` ${canon(f.q.en)} `)) score += 12;
      // 3) So từng từ (có chịu gõ sai 1 ký tự) + thưởng cặp từ liền nhau.
      let hit = 0;
      for (const w of qt) {
        if (toks.has(w)) hit++;
        else if (w.length >= 4) for (const t of toks) if (near(w, t)) { hit += 0.8; break; }
      }
      for (let i = 0; i + 1 < qt.length; i++) if (ft.includes(` ${qt[i]} ${qt[i + 1]} `)) score += 1.5;
      const cover = hit / qt.length;
      score += hit * cover * 1.6;
      return { f, score, cover };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Câu nhờ VIẾT / SÁNG TẠO → không trả lời bằng FAQ.
const CREATIVE =
  /\b(viet (giup|ho|dum|gium|cho minh|bai|caption|mo ta|noi dung|quang cao|content)|soan|sang tac|caption|mo ta giup|y tuong cho|dat ten|slogan|content|bai dang cho|write|draft)\b/;

/** Câu trả lời chắc chắn nhất (hoặc null nếu chưa đủ chắc). */
export function matchFaq(text: string): Faq | null {
  const n = normalizeVi(text);
  if (!n || n.length > 300 || CREATIVE.test(` ${n} `)) return null;
  const [best, second] = scoreAll(text);
  if (!best) return null;
  // Đủ chắc: điểm cao, hoặc phủ phần lớn câu hỏi và bỏ xa câu đứng thứ hai.
  const clear = !second || best.score - second.score >= 1.5;
  if (best.score >= 6 || (best.score >= 3.5 && best.cover >= 0.5 && clear)) return best.f;
  return null;
}

/**
 * Câu hỏi NỐI sau một câu trả lời FAQ (vd vừa hỏi "Quẹt là gì" rồi hỏi "1 ngày quẹt đc mấy lần",
 * "còn đăng doanh nghiệp thì sao"): chỉ so với các câu cùng nhóm / các gợi ý vừa hiện, ngưỡng thấp hơn.
 */
export function matchFaqFollowUp(text: string, prevId: string, chips: string[] = []): Faq | null {
  const prev = faqById(prevId);
  if (!prev) return null;
  const n = normalizeVi(text);
  if (!n || CREATIVE.test(` ${n} `)) return null;
  const chipIds = chips.map((c) => FAQS.find((f) => f.q.vi === c || f.q.en === c)?.id).filter(Boolean) as string[];
  const pool = new Set([...FAQS.filter((f) => f.cat === prev.cat).map((f) => f.id), ...chipIds]);
  pool.delete(prev.id);
  // Ghép ngữ cảnh câu trước để hiểu câu cụt ("tin nhắn nữa", "k có email thì sao").
  const withCtx = scoreAll(`${text} ${prev.q.vi}`).filter((x) => x.f.id !== prev.id);
  const own = scoreAll(text).filter((x) => pool.has(x.f.id));
  const best = [...own.map((x) => ({ ...x, score: x.score + 1 })), ...withCtx].sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 3 ? best.f : null;
}

/**
 * Câu hỏi nối mà câu trả lời vừa rồi ĐÃ có sẵn ý đó (vd vừa nói "tối đa 50 người" rồi hỏi "tối đa mấy người")
 * → trích đúng câu đó ra. Trả null nếu không có câu nào khớp đủ.
 */
export function answerFromPrev(text: string, prevAnswer: string): string | null {
  const nq = canon(text);
  // Chỉ từ có nghĩa rõ (≥3 chữ cái hoặc là số) — tránh "ho" (họ) trùng "hồ sơ"…
  const qt = tokens(nq).filter((w) => (w.length >= 3 || /\d/.test(w)) && !["khong", "sao", "biet", "roi", "nua", "thi"].includes(w));
  const qty = /\b(may|bao nhieu|toi da|toi thieu|bao lau)\b/.test(` ${nq} `);
  if (!qt.length) return null;
  const sents = prevAnswer.split(/(?<=[.!?])\s+|\n+/).map((x) => x.replace(/^[•\d.\s]+/, "").trim()).filter((x) => x.length > 8);
  let best: { s: string; hit: number } | null = null;
  for (const x of sents) {
    const st = new Set(tokens(canon(x)));
    const hit = qt.filter((w) => st.has(w)).length;
    if (hit && (!best || hit > best.hit)) best = { s: x, hit };
  }
  // Hỏi số lượng ("tối đa mấy người") → câu có con số và trùng ít nhất 1 từ là đủ.
  if (qty) {
    const raw = nq.split(" ").filter((w) => w.length >= 2 && !["may", "bao", "nhieu", "la", "co", "khong", "duoc"].includes(w));
    const num = sents.find((x) => /\d/.test(x) && raw.some((w) => ` ${canon(x)} `.includes(` ${w} `)));
    if (num) return num;
  }
  return best && best.hit >= Math.min(2, qt.length) ? best.s : null;
}

/** Vài câu gần nhất để gợi ý khi chưa chắc người dùng hỏi gì. */
export function suggestFaqs(text: string, n = 3): Faq[] {
  return scoreAll(text)
    .filter((x) => x.score >= 1.5)
    .slice(0, n)
    .map((x) => x.f);
}

/** Câu liên quan (cùng nhóm) để gợi ý hỏi tiếp sau khi trả lời. */
export function relatedFaqs(f: Faq, n = 2, exclude: string[] = []): Faq[] {
  const pool = FAQS.filter((x) => x.cat === f.cat && x.id !== f.id && !exclude.includes(x.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}

export const POPULAR_FAQ_IDS = ["claim", "quetwhat", "ridebook", "bizcreate", "notifmissing", "forgot"];
export const faqById = (id: string) => FAQS.find((f) => f.id === id);

// ── Chuyện phiếm: chào, cảm ơn, tạm biệt, khen… (xoay câu cho đỡ lặp) ──
const SMALL: { re: RegExp; vi: string[]; en: string[] }[] = [
  {
    re: /^(xin chao|chao|hello|hi|hey|alo|lomi oi|lomi|good morning|chao buoi sang|chao buoi toi)( (lomi|ban|em|nha|nhe|a|oi|ne))*$/,
    vi: [
      "Chào bạn nha 👋 Lomi giúp gì được cho bạn nè?",
      "Hi bạn! Hôm nay bạn cần Lomi giúp chuyện gì nào? 😊",
      "Lomi đây 🌱 Cứ hỏi thoải mái nha, về app, kinh doanh hay bói Tarot đều được!",
    ],
    en: ["Hi there 👋 How can Lomi help?", "Hello! What do you need today? 😊"],
  },
  {
    re: /^(cam on|thanks|thank you|thank|tks|camon|cam on nhieu)\b/,
    vi: ["Không có gì nè 😊 Cần gì cứ hỏi Lomi nha!", "Lomi vui vì giúp được bạn 💚", "Hihi, có gì cứ hỏi tiếp nha!"],
    en: ["You're welcome 😊", "Happy to help 💚"],
  },
  {
    re: /^(tam biet|bye|bai bai|goodbye|see you|hen gap lai)\b/,
    vi: ["Tạm biệt nha 👋 Cần gì cứ gọi Lomi!", "Bye bye, chúc bạn một ngày thật vui 💚"],
    en: ["Bye 👋 Call Lomi anytime!", "See you — have a great day 💚"],
  },
  {
    re: /\b(de thuong|cute|gioi qua|thong minh|hay qua|yeu lomi|thich lomi|dang yeu)\b/,
    vi: ["Hihi, cảm ơn bạn nhiều nha 🥰", "Được khen vậy Lomi ngại quá à 😳💚"],
    en: ["Aww, thank you 🥰"],
  },
  {
    re: /^(ok|oke|okie|okay|uh|u|um|vang|da|duoc roi|hieu roi)$/,
    vi: ["Okie 😊 Cần gì thêm cứ hỏi Lomi nha!", "Dạ, có gì cứ gọi Lomi nha 🌱"],
    en: ["Okay 😊 Ask anytime!"],
  },
];
let lastSmall = "";
export function smallTalk(text: string, lang: "vi" | "en"): string | null {
  const n = normalizeVi(text);
  if (!n || n.split(" ").length > 7) return null;
  for (const s of SMALL) {
    if (!s.re.test(n)) continue;
    const pool = (lang === "en" ? s.en : s.vi).filter((x) => x !== lastSmall);
    lastSmall = pool[Math.floor(Math.random() * pool.length)] ?? (lang === "en" ? s.en[0] : s.vi[0]);
    return lastSmall;
  }
  return null;
}
