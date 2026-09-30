// ─────────────────────────────────────────────────────────────────────────────
// BÓI TAROT CỦA LOMI (30/09) — chạy 100% trên máy người dùng: không gọi AI, không tốn lượt,
// không tốn credit, dùng được cả khi offline. Ai cũng bói được, không giới hạn số lần.
// • 78 lá (22 Ẩn Chính + 56 Ẩn Phụ), nội dung tự viết (không chép sách/web).
// • Rút bài random thật bằng crypto.getRandomValues (Fisher–Yates), mỗi lá 50% bị ngược.
// • Lời giải = nghĩa lá (xuôi/ngược) + câu theo chủ đề (chất bài × chủ đề) + nhận xét tổng
//   (nhiều lá Ẩn Chính, chất bài trội, nhiều lá ngược…) + lời khuyên — giọng thân thiện của Lomi.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";

type L = "vi" | "en";
type T2 = { vi: string; en: string };

export type TarotTopic = "general" | "love" | "work" | "money" | "travel" | "study" | "health";
export type TarotSpread = "one" | "ppf" | "sca" | "five" | "celtic"; // 1 lá · QK–HT–TL · TH–TT–LK · 5 lá phân tích sâu · Celtic Cross 10 lá
export type TarotSuit = "major" | "wands" | "cups" | "swords" | "pentacles";
export type TarotDraw = { id: number; rev: boolean };
// kind (30/09 r2): kiểu câu hỏi — daily (thông điệp hôm nay), open (hỏi chung), timing (khi nào),
// yesno (có/không), choice (A hay B). question = câu người dùng hỏi; pos = nhãn vị trí từng lá.
export type TarotKind = "daily" | "open" | "timing" | "yesno" | "choice";
export type TarotReading = {
  topic: TarotTopic;
  spread: TarotSpread;
  cards: TarotDraw[];
  at: number;
  kind?: TarotKind;
  question?: string;
  /** Cả câu người dùng gõ (có phần kể chuyện) — để đọc tâm lý đúng hơn. */
  context?: string;
  /** Ý câu hỏi (vd "feelings", "quit", "nextmonth") — quyết định tên vị trí lá & cách chốt (xem INTENTS). */
  intent?: string;
  pos?: T2[];
};

export const TAROT_TOPICS: { id: TarotTopic; emoji: string; vi: string; en: string }[] = [
  { id: "general", emoji: "🌿", vi: "Tổng quan", en: "General" },
  { id: "love", emoji: "💞", vi: "Tình cảm", en: "Love" },
  { id: "work", emoji: "💼", vi: "Công việc", en: "Work" },
  { id: "money", emoji: "💰", vi: "Tài chính", en: "Money" },
  { id: "travel", emoji: "✈️", vi: "Đi xa · giấy tờ", en: "Travel · paperwork" },
  { id: "study", emoji: "📚", vi: "Học tập", en: "Study" },
  { id: "health", emoji: "💚", vi: "Sức khoẻ", en: "Health" },
];

export const TAROT_SPREADS: { id: TarotSpread; n: number; vi: string; en: string; pos: T2[] }[] = [
  { id: "one", n: 1, vi: "1 lá · Thông điệp hôm nay", en: "1 card · Today's message", pos: [{ vi: "Thông điệp", en: "Message" }] },
  {
    id: "ppf",
    n: 3,
    vi: "3 lá · Quá khứ – Hiện tại – Tương lai",
    en: "3 cards · Past – Present – Future",
    pos: [
      { vi: "Quá khứ", en: "Past" },
      { vi: "Hiện tại", en: "Present" },
      { vi: "Tương lai", en: "Future" },
    ],
  },
  {
    id: "five",
    n: 5,
    vi: "5 lá · Phân tích sâu",
    en: "5 cards · Deep reading",
    pos: [
      { vi: "Hiện tại", en: "Present" },
      { vi: "Nguyên nhân", en: "Cause" },
      { vi: "Điều ẩn giấu", en: "Hidden factor" },
      { vi: "Lời khuyên", en: "Advice" },
      { vi: "Kết quả", en: "Outcome" },
    ],
  },
  {
    id: "celtic",
    n: 10,
    vi: "Celtic Cross · 10 lá chuyên sâu",
    en: "Celtic Cross · 10 cards",
    pos: [
      { vi: "Hiện tại", en: "Present" },
      { vi: "Thử thách", en: "Challenge" },
      { vi: "Gốc rễ", en: "Foundation" },
      { vi: "Quá khứ gần", en: "Recent past" },
      { vi: "Điều tốt nhất có thể", en: "Best outcome" },
      { vi: "Tương lai gần", en: "Near future" },
      { vi: "Bản thân bạn", en: "Yourself" },
      { vi: "Người xung quanh", en: "Environment" },
      { vi: "Hy vọng & nỗi sợ", en: "Hopes & fears" },
      { vi: "Kết quả", en: "Outcome" },
    ],
  },
  {
    id: "sca",
    n: 3,
    vi: "3 lá · Tình huống – Thử thách – Lời khuyên",
    en: "3 cards · Situation – Challenge – Advice",
    pos: [
      { vi: "Tình huống", en: "Situation" },
      { vi: "Thử thách", en: "Challenge" },
      { vi: "Lời khuyên", en: "Advice" },
    ],
  },
];

// ── 22 lá Ẩn Chính ──
// [tên VI, tên EN, biểu tượng, xuôi VI, ngược VI, xuôi EN, ngược EN]
type Row = [string, string, string, string, string, string, string];
const MAJOR: Row[] = [
  ["Chàng Khờ", "The Fool", "🎒", "Một khởi đầu mới đang mở ra. Cứ nhẹ nhàng bước tới với tâm thế hồn nhiên, không cần biết trước hết mọi thứ đâu.", "Bạn đang hơi liều, hoặc ngược lại là chần chừ mãi chưa dám bước. Dừng lại tính kỹ một chút rồi hẵng đi.", "A fresh, carefree beginning — daring to step out before seeing the whole road.", "A bit reckless, or hesitating too long; look before you leap."],
  ["Nhà Ảo Thuật", "The Magician", "🪄", "Bạn đang có trong tay đủ thứ cần thiết rồi đó — kỹ năng, ý tưởng, cơ hội. Việc còn lại là bắt tay vào làm.", "Có năng lực mà chưa dùng đúng chỗ, hoặc có người đang nói hay hơn làm. Để ý những lời hứa hẹn quá ngọt nha.", "You have every tool you need to turn ideas into reality.", "Talent is being misused, or someone isn't being genuine."],
  ["Nữ Tư Tế", "The High Priestess", "🌙", "Hãy tin vào cảm nhận của mình. Có những điều không cần ai nói, tự bạn đã lờ mờ biết câu trả lời rồi.", "Bạn đang lờ đi tiếng nói bên trong, hoặc có chuyện gì đó chưa được nói ra. Im lặng một chút để nghe lòng mình.", "Trust your intuition — the answer is already within you.", "You're ignoring your inner voice, or something is hidden."],
  ["Nữ Hoàng", "The Empress", "🌾", "Giai đoạn đủ đầy và ấm áp. Những gì bạn chăm chút đang dần đơm hoa kết trái.", "Bạn lo cho mọi người nhiều quá mà quên mất bản thân. Dành chút thời gian chiều chuộng mình đi.", "Abundance, nurturing and creativity are blooming around you.", "You're giving so much that you forget to care for yourself."],
  ["Hoàng Đế", "The Emperor", "👑", "Sự kỷ luật và vững vàng sẽ giúp bạn nắm chắc tình hình. Lúc này cần một kế hoạch rõ ràng và giữ đúng lời.", "Hoặc bạn đang quá cứng nhắc, hoặc mọi thứ đang hơi mất kiểm soát. Nới chỗ cần nới, siết chỗ cần siết.", "Discipline and steadiness put you in control.", "Too rigid, or losing control; time to rebalance."],
  ["Giáo Hoàng", "The Hierophant", "📜", "Nghe lời khuyên của người đi trước sẽ có lợi. Những cách làm quen thuộc, đã được kiểm chứng đang hợp với bạn.", "Đã đến lúc bạn tìm cách làm của riêng mình, không nhất thiết phải theo khuôn mẫu nữa.", "Mentors and trusted traditions will guide you.", "Time to write your own rules instead of following the template."],
  ["Tình Nhân", "The Lovers", "💞", "Sự hoà hợp và một lựa chọn quan trọng — hãy chọn theo điều trái tim bạn thật sự tin.", "Có chút lệch nhịp: hai người không còn chung hướng, hoặc bạn đang chọn điều chưa thật đúng với mình.", "Harmony, and an important choice made from the heart.", "Imbalance in a relationship, or values drifting apart."],
  ["Cỗ Xe Chiến", "The Chariot", "🏇", "Bạn đang có đà để tiến lên. Giữ vững tay lái và quyết tâm, bạn sẽ tới được nơi mình muốn.", "Bạn bị kéo về quá nhiều phía nên hơi mất phương hướng. Chọn một mục tiêu chính và tập trung vào đó.", "Willpower and determination carry you forward.", "Pulled in too many directions; losing your way."],
  ["Sức Mạnh", "Strength", "🦁", "Sức mạnh thật sự của bạn nằm ở sự kiên nhẫn và mềm mỏng, chứ không phải ở việc gồng lên.", "Dạo này bạn hơi thiếu tự tin, hoặc để cảm xúc lấn át. Nhớ là bạn mạnh mẽ hơn bạn nghĩ nhiều.", "True strength comes from patience and gentleness.", "Self-doubt or emotions taking over; believe in yourself a little more."],
  ["Ẩn Sĩ", "The Hermit", "🏮", "Lùi lại một bước, cho mình chút thời gian yên tĩnh để suy nghĩ. Câu trả lời sẽ rõ dần.", "Bạn thu mình hơi lâu rồi đó. Ra ngoài gặp gỡ, trò chuyện với mọi người sẽ giúp ích nhiều.", "Step back and reflect — things will become clearer.", "You've been alone a while; time to reconnect."],
  ["Vòng Quay Số Phận", "Wheel of Fortune", "🎡", "Vận may đang xoay chiều theo hướng tốt. Một bước ngoặt tích cực có thể đến bất ngờ.", "Giai đoạn hơi lận đận, nhưng vòng quay nào rồi cũng xoay tiếp. Cứ bình tĩnh, chuyện sẽ khác thôi.", "Luck is turning; a positive turning point is coming.", "A bumpy phase — but every wheel keeps turning."],
  ["Công Lý", "Justice", "⚖️", "Mọi chuyện sẽ được phân định công bằng, rõ ràng. Bạn làm đúng thì sẽ nhận lại xứng đáng.", "Có điều gì đó chưa sòng phẳng, hoặc ai đó đang né trách nhiệm. Rõ ràng mọi thứ từ đầu sẽ đỡ rắc rối.", "Fairness and clarity — you reap what you sow.", "Something isn't fair, or someone is dodging responsibility."],
  ["Người Treo Ngược", "The Hanged Man", "🙃", "Tạm dừng lại và thử nhìn chuyện này từ một góc khác — có khi lối ra nằm ở chỗ bạn chưa để ý.", "Bạn đang chờ đợi mà không rõ mình chờ điều gì. Đừng hy sinh hay trì hoãn thêm nếu không đáng.", "Pausing to see things from another angle opens a new path.", "Waiting without reason; don't sacrifice for nothing."],
  ["Cái Chết", "Death", "🦋", "Đừng sợ tên lá bài nha! Lá này chỉ nói một giai đoạn đang khép lại để một chương mới bắt đầu.", "Bạn đang cố níu giữ điều đã cũ vì ngại thay đổi. Buông ra một chút sẽ nhẹ lòng hơn.", "One chapter ends so a new one can begin — a needed change.", "Holding on to the old out of fear of change."],
  ["Tiết Chế", "Temperance", "🍶", "Vừa đủ là đẹp. Giữ cân bằng và kiên nhẫn, mọi thứ sẽ hoà hợp dần.", "Có gì đó đang quá đà — làm quá, tiêu quá, hay nghĩ quá. Điều chỉnh lại nhịp sống một chút nha.", "Balance, patience and moderation bring peace.", "Something is overdone; adjust your rhythm."],
  ["Ác Quỷ", "The Devil", "⛓️", "Để ý những thói quen hay cám dỗ đang níu chân bạn. Nhận ra được là đã thoát được một nửa rồi.", "Bạn đang dần gỡ được một ràng buộc cũ. Cảm giác tự do đang quay lại đó.", "Watch the habits or temptations holding you back.", "You're breaking free of an old attachment — freedom is near."],
  ["Tòa Tháp", "The Tower", "🗼", "Có thể sắp có một thay đổi bất ngờ làm xáo trộn mọi thứ. Nghe đáng sợ, nhưng nó dọn chỗ để bạn xây lại vững hơn.", "Né tránh thay đổi chỉ khiến nó đến muộn hơn thôi. Chủ động đối diện sẽ đỡ bị bất ngờ.", "A sudden upheaval clears the old so you can rebuild stronger.", "Avoiding change only delays it."],
  ["Ngôi Sao", "The Star", "⭐", "Lá của hy vọng và chữa lành. Cứ tin vào điều tốt đẹp phía trước, bạn đang đi đúng hướng.", "Bạn đang hơi mất niềm tin. Nhẹ nhàng với bản thân, rồi hy vọng sẽ quay lại.", "Hope, healing and faith in the future.", "Faith is a little shaken; be gentle with yourself."],
  ["Mặt Trăng", "The Moon", "🌕", "Mọi thứ còn mờ mờ, chưa rõ ràng. Đừng vội kết luận, cũng đừng để nỗi lo dẫn đường.", "Sương mù đang tan dần, sự thật từ từ lộ ra. Bạn sẽ sớm thấy rõ hơn.", "Things aren't clear yet — don't rush to conclusions.", "The fog is lifting; the truth is surfacing."],
  ["Mặt Trời", "The Sun", "☀️", "Một trong những lá đẹp nhất! Niềm vui, thành công và năng lượng tích cực đang ở bên bạn.", "Niềm vui vẫn ở đó, chỉ là bạn đang hơi mệt. Nhìn mọi thứ lạc quan hơn một chút nha.", "Joy, success and bright positive energy.", "The joy is still there — just look on the bright side."],
  ["Phán Xét", "Judgement", "📯", "Một lời thức tỉnh — cơ hội để làm mới bản thân và bắt đầu lại tốt hơn.", "Bạn đang tự trách mình hơi nhiều. Bỏ qua lỗi cũ đi, ai cũng xứng đáng có cơ hội thứ hai.", "An awakening and a chance to renew yourself.", "Don't be so hard on yourself; let old mistakes go."],
  ["Thế Giới", "The World", "🌍", "Một hành trình đang khép lại thật trọn vẹn. Bạn xứng đáng tự hào về chặng đường đã qua.", "Chỉ còn một chút nữa là xong rồi, đừng bỏ dở giữa chừng nha.", "Completion and wholeness — a journey beautifully closed.", "Almost there; don't quit now."],
];

// ── 56 lá Ẩn Phụ: 4 chất × 14 lá (Át, 2–10, Tiểu Đồng, Hiệp Sĩ, Hoàng Hậu, Vua) ──
// [xuôi VI, ngược VI, xuôi EN, ngược EN]
type MRow = [string, string, string, string];
const RANKS: { vi: string; en: string; short: string }[] = [
  { vi: "Át", en: "Ace", short: "A" },
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    vi: ["Hai", "Ba", "Bốn", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười"][n - 2],
    en: ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n - 2],
    short: String(n),
  })),
  { vi: "Tiểu Đồng", en: "Page", short: "P" },
  { vi: "Hiệp Sĩ", en: "Knight", short: "Kn" },
  { vi: "Hoàng Hậu", en: "Queen", short: "Q" },
  { vi: "Vua", en: "King", short: "K" },
];

const SUITS: { id: Exclude<TarotSuit, "major">; vi: string; en: string; emoji: string; rows: MRow[] }[] = [
  {
    id: "wands",
    vi: "Gậy",
    en: "Wands",
    emoji: "🔥",
    rows: [
      ["Một ý tưởng hay cảm hứng mới đang bừng lên. Cứ nắm lấy và bắt đầu thôi!", "Hứng khởi đang chững lại, kế hoạch mãi chưa khởi động được. Có khi bạn cần thêm chút động lực.", "A spark of inspiration or a new plan ignites.", "Enthusiasm stalls; plans are slow to start."],
      ["Bạn đang đứng trước nhiều hướng đi và bắt đầu lên kế hoạch cho bước tiếp theo.", "Bạn hơi ngại bước ra khỏi vùng an toàn — nghĩ nhiều mà chưa dám làm.", "Planning ahead and looking to the next step.", "Afraid to leave your comfort zone."],
      ["Những nỗ lực trước đây bắt đầu có kết quả, cơ hội mở rộng đang đến gần.", "Kết quả đến chậm hơn bạn mong. Kiên nhẫn thêm chút, đừng bỏ cuộc lúc này.", "Efforts start to bloom; room to expand is coming.", "Results are slower than hoped; be patient."],
      ["Có chuyện vui đáng ăn mừng! Một giai đoạn ổn định, ấm cúng bên người thân.", "Có chút lấn cấn nhỏ trong nhà hoặc trong nhóm. Nói chuyện với nhau là ổn thôi.", "Joy, stability and something to celebrate.", "Minor unrest at home or in the group."],
      ["Xung quanh hơi nhiều va chạm, cạnh tranh — nhưng đây cũng là dịp để bạn thể hiện mình.", "Tốt nhất nên tránh những cuộc tranh cãi không đáng. Giữ hoà khí sẽ lợi hơn.", "Competition and clashing ideas — a chance to shine.", "Avoid unnecessary conflict."],
      ["Chiến thắng và sự công nhận đang đến. Bạn xứng đáng được khen đó!", "Bạn chưa được ghi nhận xứng đáng, hoặc đang hơi thiếu tự tin vào thành quả của mình.", "Victory and recognition.", "Not getting due credit, or lacking confidence."],
      ["Bạn cần giữ vững lập trường trước áp lực. Đừng để người khác làm mình lung lay.", "Bạn đang thấy quá tải, muốn buông xuôi. Nghỉ một chút rồi tính tiếp cũng được.", "Standing your ground under pressure.", "Feeling overwhelmed, wanting to give up."],
      ["Mọi thứ đang chuyển động rất nhanh, tin tức có thể đến dồn dập.", "Có chút trễ hẹn, trục trặc, hoặc bạn đang vội quá. Chậm lại một nhịp nha.", "Things move fast; news arrives quickly.", "Delays, hiccups or too much haste."],
      ["Bạn đã đi gần tới đích rồi. Mệt thì mệt, nhưng cố thêm chút nữa thôi!", "Bạn đang kiệt sức thật sự. Nghỉ ngơi không phải là bỏ cuộc đâu.", "Stay resilient — you're nearly there.", "Exhausted; you need real rest."],
      ["Bạn đang ôm quá nhiều việc cùng lúc. Có những thứ nên nhờ người khác phụ.", "Đã đến lúc buông bớt gánh nặng. Không phải việc gì bạn cũng phải tự làm.", "Carrying too many responsibilities at once.", "Time to put some burdens down."],
      ["Tin vui đang đến, kèm theo sự tò mò muốn thử điều mới.", "Ý tưởng thì hay mà hay bỏ dở. Thử theo đuổi đến cùng một việc xem sao.", "Good news, curiosity and a spirit of adventure.", "Great ideas but little follow-through."],
      ["Năng lượng mạnh mẽ, dám nghĩ dám làm — rất hợp để hành động ngay.", "Hơi nóng vội và bốc đồng. Nghĩ kỹ trước khi lao vào nha.", "Bold, passionate action.", "Hasty and impulsive."],
      ["Bạn đang rất tự tin và cuốn hút, người xung quanh dễ được bạn truyền cảm hứng.", "Có chút ghen tị hoặc tự ti đang len lỏi. Bạn không cần so sánh mình với ai cả.", "Confident, magnetic and full of energy.", "A bit jealous or insecure."],
      ["Bạn có tầm nhìn và dám dẫn dắt. Đây là lúc đứng ra cầm lái.", "Cẩn thận kẻo trở nên độc đoán, hoặc đặt kỳ vọng quá cao cho mình và người khác.", "A visionary leader who dares to act.", "Domineering or expecting too much."],
    ],
  },
  {
    id: "cups",
    vi: "Cốc",
    en: "Cups",
    emoji: "💧",
    rows: [
      ["Một cảm xúc mới, một mối quan hệ mới đang chớm nở. Lòng bạn đang mở ra.", "Bạn đang kìm nén cảm xúc bên trong. Cho phép mình được buồn, được vui thật lòng.", "New feelings and affection are blooming.", "Emotions are being held back."],
      ["Một sự kết nối hai chiều thật đẹp — hai bên hiểu và trân trọng nhau.", "Có chút lệch pha, hiểu lầm nho nhỏ. Một cuộc nói chuyện thật lòng sẽ gỡ được.", "A mutual connection, harmony and understanding.", "Disconnection or a small misunderstanding."],
      ["Niềm vui bên bạn bè, những buổi tụ tập, ăn mừng. Vui lắm đó!", "Vui chơi hơi quá đà, hoặc có người thứ ba chen vào chuyện của bạn.", "Friendship, gatherings and celebration.", "Overindulgence, or a third party interfering."],
      ["Bạn đang hơi chán, dễ bỏ lỡ những điều tốt đang được trao tới ngay trước mắt.", "Bạn bắt đầu mở lòng và sẵn sàng đón nhận điều mới rồi.", "A bit bored, missing what's being offered.", "Starting to open up again."],
      ["Bạn đang tiếc nuối điều đã mất. Nhưng quay lại nhìn xem, vẫn còn những điều quý giá ở đó.", "Nỗi buồn đang dần qua. Bạn đang từ từ đứng dậy được rồi.", "Grieving a loss — yet something precious remains.", "Slowly moving past the sadness."],
      ["Những kỷ niệm đẹp, một người cũ, hay cảm giác bình yên như hồi còn nhỏ.", "Bạn đang mắc kẹt trong quá khứ hơi lâu. Hiện tại cũng có nhiều điều đáng trân trọng.", "Sweet memories, old friends or innocence.", "Stuck in the past."],
      ["Quá nhiều lựa chọn khiến bạn mơ mộng mà khó quyết. Tỉnh táo chọn cái thực tế nhất nha.", "Bạn đang dần tỉnh ra và nhìn mọi thứ rõ ràng hơn.", "Many options; easy to daydream.", "Clearer and more grounded now."],
      ["Bạn đang rời bỏ điều không còn khiến mình hạnh phúc — đi để tìm điều tốt hơn.", "Biết là nên đi mà vẫn chưa nỡ rời. Hỏi lòng mình thêm lần nữa.", "Walking away from what no longer makes you happy.", "Knowing you should go but afraid to leave."],
      ["Điều ước của bạn có thể thành sự thật! Một cảm giác hài lòng, mãn nguyện.", "Bề ngoài thì ổn, nhưng bên trong vẫn thấy thiếu thiếu điều gì đó.", "A wish come true; contentment.", "Satisfied on the surface, not inside."],
      ["Hạnh phúc trọn vẹn, gia đình êm ấm, mọi người yêu thương nhau.", "Kỳ vọng và thực tế đang hơi vênh nhau. Bớt so sánh sẽ thấy nhẹ lòng hơn.", "Complete happiness and a warm home.", "Expectations and reality don't match."],
      ["Có thể có một lời tỏ tình, một tin nhắn dễ thương, hay một ý tưởng sáng tạo bất ngờ.", "Cảm xúc còn non nớt, dễ tổn thương. Đừng vội trao hết niềm tin.", "A sweet message, a confession or a creative idea.", "Immature feelings; easily hurt."],
      ["Một lời mời lãng mạn, một người đến với tấm lòng chân thành.", "Hứa thì nhiều mà làm chẳng bao nhiêu — cẩn thận những lời quá ngọt.", "A romantic offer from a sincere heart.", "Big promises, little action."],
      ["Bạn đang rất tinh tế, biết lắng nghe và thấu hiểu người khác.", "Bạn nhạy cảm quá mức và quên chăm sóc cảm xúc của chính mình.", "Empathetic, gentle and a good listener.", "Oversensitive and neglecting yourself."],
      ["Bạn giữ được sự cân bằng giữa lý trí và cảm xúc — rất đáng tin cậy.", "Cảm xúc đang thất thường, lúc nắng lúc mưa. Hít thở sâu trước khi phản ứng nha.", "Balancing head and heart.", "Moody and unpredictable."],
    ],
  },
  {
    id: "swords",
    vi: "Kiếm",
    en: "Swords",
    emoji: "⚔️",
    rows: [
      ["Mọi thứ đang sáng tỏ. Một ý tưởng sắc bén hoặc một sự thật cuối cùng cũng được nói ra.", "Đầu óc đang rối, thông tin nhiễu loạn. Đừng vội tin hết những gì nghe được.", "Clarity, a sharp idea or a truth spoken.", "Muddled thinking, noisy information."],
      ["Bạn đang phân vân giữa hai lựa chọn và cố né, chưa muốn quyết.", "Đến lúc phải quyết rồi, né mãi cũng không giải quyết được gì.", "Torn between two choices.", "Time to decide — stop avoiding it."],
      ["Có một nỗi buồn hay tổn thương cần được thừa nhận. Khóc được thì cứ khóc.", "Vết thương đang lành dần. Bạn đang ổn hơn từng ngày.", "Sadness or hurt that needs acknowledging.", "The wound is healing."],
      ["Bạn cần nghỉ ngơi để hồi phục năng lượng. Đừng ép mình quá.", "Bạn đã sẵn sàng quay lại sau khoảng thời gian nghỉ ngơi.", "Rest and recovery.", "Returning after a break."],
      ["Thắng được một trận cãi mà mất nhiều hơn được. Cân nhắc xem có đáng không nha.", "Đã đến lúc làm hoà, bỏ qua chuyện cũ.", "Winning at a cost — weigh the price of arguing.", "Making peace, letting go."],
      ["Bạn đang rời xa khó khăn để hướng tới nơi bình yên hơn.", "Muốn đi tiếp mà vẫn còn vướng bận chuyện cũ.", "Leaving trouble behind for calmer waters.", "Still tied to the past."],
      ["Để ý chuyện thiếu minh bạch, hoặc ai đó đang đi đường tắt.", "Sự thật dần lộ ra, chuyện gì khuất tất rồi cũng rõ.", "Watch for hidden motives or shortcuts.", "The truth comes out."],
      ["Bạn đang thấy bị mắc kẹt — nhưng thật ra lối ra gần hơn bạn nghĩ.", "Bạn đang thoát ra khỏi những suy nghĩ tự trói buộc mình.", "Feeling trapped — but the way out is closer than you think.", "Breaking free of limiting thoughts."],
      ["Lo âu, nghĩ nhiều đến mất ngủ. Nhiều khi chuyện không tệ như mình tưởng đâu.", "Nỗi lo đang giảm dần, bạn đang nhẹ lòng hơn.", "Anxiety and sleepless overthinking.", "Worries are easing."],
      ["Có thể bạn đang chạm đáy — nhưng từ đây chỉ có đi lên thôi.", "Bạn đang hồi phục sau một giai đoạn khó khăn.", "Hitting bottom — only up from here.", "Recovering after a hard time."],
      ["Sự tò mò, ham học hỏi, và có tin tức mới sắp đến.", "Nói nhiều mà làm ít, hoặc dễ bị cuốn vào chuyện thị phi.", "Curious, eager to learn, fresh news.", "All talk, gossip."],
      ["Hành động quyết liệt, nói thẳng nói thật.", "Hấp tấp quá, lời nói dễ làm người khác tổn thương.", "Decisive action, straight talk.", "Rash words that can hurt."],
      ["Bạn sắc sảo, độc lập và nhìn mọi chuyện rất rõ ràng.", "Bạn đang hơi lạnh lùng, khắt khe với người khác — và với cả chính mình.", "Sharp, independent and clear.", "A bit cold or harsh."],
      ["Lý trí, công bằng và có nguyên tắc — bạn đưa ra quyết định rất chuẩn.", "Cẩn thận kẻo dùng lý lẽ để áp đặt người khác.", "Rational, fair and principled.", "Using logic to control others."],
    ],
  },
  {
    id: "pentacles",
    vi: "Tiền",
    en: "Pentacles",
    emoji: "🪙",
    rows: [
      ["Một cơ hội mới về tiền bạc hoặc công việc đang xuất hiện. Nắm lấy nha!", "Cơ hội dễ bị tuột mất nếu không tính toán kỹ.", "A new opportunity in money or work.", "An opportunity may slip; plan more carefully."],
      ["Bạn đang xoay xở nhiều việc cùng lúc khá khéo léo.", "Quá nhiều việc, lịch trình rối tung. Sắp xếp lại thứ tự ưu tiên nha.", "Juggling several things skillfully.", "Overloaded, messy schedule."],
      ["Làm việc nhóm hiệu quả, tay nghề của bạn được ghi nhận.", "Mọi người phối hợp chưa ăn ý — cần rõ ràng ai làm việc gì.", "Great teamwork; your skills are recognized.", "Poor coordination."],
      ["Bạn đang giữ chặt tài chính, biết tiết kiệm.", "Hoặc là giữ khư khư quá, hoặc là chi tiêu mất kiểm soát. Cân bằng lại nha.", "Holding on to money, saving well.", "Too tight-fisted, or spending out of control."],
      ["Có chút khó khăn tạm thời. Đừng ngại nhờ người khác giúp đỡ.", "Tình hình đang dần khởi sắc, qua cơn khó rồi.", "Temporary hardship — don't be shy to ask for help.", "Things are improving."],
      ["Cho và nhận — bạn giúp người và cũng được người giúp lại.", "Sự cho đi đang chưa cân bằng; đừng để ai lợi dụng lòng tốt của bạn.", "Giving and receiving; generosity and support.", "Unbalanced giving."],
      ["Kiên nhẫn chờ thành quả, và nhân tiện xem lại hướng đi của mình.", "Bạn đang sốt ruột vì mãi chưa thấy kết quả.", "Patiently awaiting results; reassessing.", "Impatient for results."],
      ["Chăm chỉ rèn luyện, trau dồi tay nghề mỗi ngày — rồi sẽ giỏi thôi.", "Làm cho có, thiếu tập trung. Chất lượng quan trọng hơn số lượng.", "Diligent practice, honing your craft.", "Going through the motions."],
      ["Bạn tự chủ và sung túc nhờ chính nỗ lực của mình. Tự hào đi!", "Hoặc đang phụ thuộc người khác, hoặc tiêu xài hơi quá tay.", "Independent and comfortable through your own effort.", "Dependence or overspending."],
      ["Ổn định lâu dài: tiền bạc, nhà cửa, gia đình đều vững.", "Tài chính trong nhà có chút lấn cấn, cần ngồi lại tính toán.", "Long-term stability, wealth and family.", "Family finances are shaky."],
      ["Bạn đang học điều mới, có cơ hội nhỏ nhưng chắc chắn.", "Mơ hơi xa thực tế, hoặc chần chừ chưa bắt tay vào.", "Learning something new; small but solid chances.", "Unrealistic or procrastinating."],
      ["Chậm mà chắc, đều đặn và đáng tin cậy.", "Hơi trì trệ, an phận quá. Thử làm mới mình chút.", "Steady, reliable, dependable.", "Stagnant, too comfortable."],
      ["Bạn chu đáo, thực tế và rất biết vun vén.", "Bạn đang lo toan cho người khác nhiều quá mà quên mình.", "Caring, practical and resourceful.", "Worrying too much about others."],
      ["Thành công và vững vàng về tài chính — bạn đang ở vị thế tốt.", "Cẩn thận kẻo đặt nặng chuyện tiền bạc quá mức.", "Success and financial security.", "Too focused on money."],
    ],
  },
];

// ── Câu theo chủ đề: chất bài × chủ đề × xuôi/ngược ──
const TOPIC_LINE: Record<TarotSuit, Record<Exclude<TarotTopic, "general">, [string, string, string, string]>> = {
  major: {
    love: ["Về tình cảm, đây là dấu hiệu của một chuyện quan trọng — đáng để bạn nghiêm túc.", "Về tình cảm, có một bài học lớn bạn nên nhìn thẳng vào.", "In love, this points to something significant — take it seriously.", "There's a big lesson in love worth facing."],
    work: ["Về công việc, một bước ngoặt đáng kể đang đến gần.", "Về công việc, giai đoạn này hơi thử thách nhưng sẽ giúp bạn trưởng thành.", "At work, a meaningful turning point is coming.", "Work is testing you, but helping you grow."],
    money: ["Về tiền bạc, sắp có thay đổi lớn — chuẩn bị tinh thần đón nhận nha.", "Về tiền bạc, nên xem lại tổng thể, đừng quyết định vội.", "Big changes in money — be ready.", "Review your finances as a whole; don't rush decisions."],
    travel: ["Về chuyện đi xa, giấy tờ, mọi thứ đang ở một bước chuyển lớn.", "Về hồ sơ, giấy tờ, nên rà lại thật kỹ, đừng nóng vội.", "Travel and paperwork are at a big turning point.", "Double-check your documents; don't rush."],
    study: ["Về học hành, bạn đang ở một bước ngoặt quan trọng.", "Về học hành, có lẽ nên thay đổi cách học một chút.", "Your studies are at an important turning point.", "Time to rethink how you study."],
    health: ["Về sức khoẻ, cơ thể đang ở giai đoạn chuyển biến, tự điều chỉnh dần.", "Về sức khoẻ, bài nhắc bạn đừng chủ quan, làm đúng lời bác sĩ dặn nha.", "Health-wise, your body is in a turning phase, adjusting itself.", "Don't be careless with your health — follow your doctor."],
  },
  wands: {
    love: ["Chuyện tình cảm đang có lửa, nhiều hứng khởi và chủ động.", "Chuyện tình cảm dễ nóng giận hoặc nhanh chán — giữ lửa đều đều thôi nha.", "Love is fiery, exciting and proactive.", "Quick tempers or fading sparks — keep the fire steady."],
    work: ["Công việc đang có động lực, rất hợp để khởi động dự án mới.", "Công việc dễ kiểu cháy nhanh tắt nhanh — chia sức cho đều nha.", "Motivated at work — great time to start something new.", "Burning bright then out; pace yourself."],
    money: ["Tiền bạc đến từ sự chủ động và dám làm.", "Về tiền, tránh đầu tư theo cảm hứng nhất thời.", "Money comes from initiative and boldness.", "Avoid impulse investments."],
    travel: ["Chuyện đi xa đang có năng lượng dịch chuyển mạnh — hợp để chủ động nộp hồ sơ, lên đường.", "Chuyện đi xa dễ vội vàng — kiểm tra kỹ giấy tờ trước khi nộp nha.", "Strong movement energy — a good time to apply and go.", "Easy to rush; check your papers before submitting."],
    study: ["Việc học đang hăng say, hợp để bắt đầu một khoá mới.", "Việc học dễ nản giữa chừng — chia nhỏ mục tiêu ra nha.", "Eager to learn — great time to start a new course.", "Easy to lose steam; break goals into small steps."],
    health: ["Năng lượng sống đang lên, tinh thần tốt sẽ giúp mau khoẻ.", "Đừng cố sức quá, cơ thể cần được nghỉ để hồi phục.", "Your vitality is rising — a good mood helps recovery.", "Don't push too hard; your body needs rest."],
  },
  cups: {
    love: ["Tình cảm là điểm sáng lúc này — cứ mở lòng ra nha.", "Cảm xúc hai bên đang hơi rối, nói chuyện thật lòng sẽ ổn hơn.", "Love is the bright spot — open your heart.", "Feelings are tangled; an honest talk will help."],
    work: ["Không khí làm việc dễ chịu, đồng nghiệp hợp nhau.", "Cảm xúc cá nhân đang ảnh hưởng tới công việc.", "A pleasant workplace with good colleagues.", "Emotions are spilling into work."],
    money: ["Tiền bạc đủ đầy, có thể thoải mái chi cho vài niềm vui nhỏ.", "Cẩn thận kiểu chi tiêu theo cảm xúc nha.", "Money is comfortable; room for small joys.", "Watch emotional spending."],
    travel: ["Chuyến đi hứa hẹn nhiều niềm vui và những kết nối mới.", "Bạn còn lăn tăn về chuyến đi — hỏi lòng mình thật kỹ.", "The trip brings joy and new connections.", "Mixed feelings about the trip; listen to your heart."],
    study: ["Học cùng bạn bè sẽ vui và tiến bộ nhanh hơn.", "Tâm trạng đang kéo việc học xuống, nghỉ ngơi chút rồi học tiếp.", "Learning with friends helps you grow.", "Your mood is affecting your studies."],
    health: ["Tinh thần thoải mái, có người thân chăm lo — đó cũng là một liều thuốc tốt.", "Lo lắng đang làm bạn mệt thêm, thả lỏng tâm trí một chút nha.", "Being cared for and at ease is good medicine.", "Worry is wearing you out; let your mind relax."],
  },
  swords: {
    love: ["Trong mối quan hệ, cần nói chuyện rõ ràng, thẳng thắn với nhau.", "Dễ hiểu lầm vì lời nói — nhẹ nhàng với nhau hơn chút nha.", "Clear, honest communication is needed.", "Words may cause misunderstandings — be gentler."],
    work: ["Công việc hợp để phân tích, lên kế hoạch và ra quyết định.", "Công việc đang áp lực, dễ tranh luận — giữ cái đầu lạnh nha.", "Good time to analyze, plan and decide.", "Pressure and debates at work; keep a cool head."],
    money: ["Tính toán kỹ trước mọi khoản chi.", "Bạn lo chuyện tiền hơi nhiều — ghi lại chi tiêu sẽ thấy đỡ hơn.", "Think carefully before every expense.", "Money worries run high — tracking spending will help."],
    travel: ["Chuyện giấy tờ cần sắp xếp rõ ràng, chuẩn bị hồ sơ thật chỉn chu.", "Có thể vướng thủ tục, thông tin rối — hỏi thêm người có kinh nghiệm.", "Get your information in order and prepare a tidy file.", "Possible red tape — ask someone experienced."],
    study: ["Đầu óc đang minh mẫn, rất hợp để ôn thi.", "Áp lực thi cử đang cao — nhớ ngủ đủ nha.", "A clear mind — great for exam prep.", "Exam pressure is high; get enough sleep."],
    health: ["Hiểu rõ tình trạng của mình và làm đúng hướng dẫn sẽ giúp khỏi nhanh hơn.", "Nghĩ nhiều quá dễ mất ngủ — ngủ đủ cũng là đang chữa bệnh đó.", "Understanding your condition and following advice speeds recovery.", "Overthinking costs sleep — and sleep is medicine."],
  },
  pentacles: {
    love: ["Tình cảm bền vững, xây từ những điều giản dị, thực tế.", "Đừng để chuyện tiền bạc chen vào tình cảm.", "Steady love built on practical things.", "Don't let money come between you."],
    work: ["Công việc ổn định, chăm chỉ sẽ được đền đáp xứng đáng.", "Công việc hơi dậm chân tại chỗ, nên học thêm kỹ năng mới.", "Stable work; diligence pays off.", "Work feels stuck; refresh your skills."],
    money: ["Tài chính thuận lợi, hợp để tích luỹ.", "Nên siết lại chi tiêu và tránh rủi ro lúc này.", "Finances look good — time to save.", "Tighten spending and avoid risks."],
    travel: ["Tài chính và giấy tờ vững vàng thì mọi thứ sẽ thuận lợi.", "Chi phí, chứng minh tài chính cần chuẩn bị kỹ hơn.", "Solid finances and papers make things smooth.", "Costs or proof of funds need more preparation."],
    study: ["Chăm chỉ đều đặn sẽ cho kết quả chắc chắn.", "Việc học chưa đều, lập một lịch học cụ thể nha.", "Steady effort brings solid results.", "Inconsistent study; make a concrete schedule."],
    health: ["Ăn uống, nghỉ ngơi điều độ là nền tảng để khoẻ lại.", "Cơ thể hồi phục chậm mà chắc, kiên nhẫn thêm chút nha.", "Regular meals and rest are the foundation of recovery.", "Recovery is slow but steady — be patient."],
  },
};

const ADVICE: Record<TarotSuit, [string, string, string, string]> = {
  major: ["Tin vào dòng chảy và mạnh dạn đón nhận thay đổi.", "Chậm lại, lắng nghe bản thân trước khi bước tiếp.", "Trust the flow and embrace change.", "Slow down and look inward before moving on."],
  wands: ["Hành động ngay khi còn hứng khởi!", "Nghỉ một nhịp để nạp lại năng lượng rồi đi tiếp.", "Act while the spark is alive!", "Take a breath and recharge."],
  cups: ["Làm theo trái tim và dám chia sẻ cảm xúc thật.", "Chăm sóc cảm xúc của chính mình trước đã.", "Follow your heart and share how you feel.", "Take care of your own feelings first."],
  swords: ["Nghĩ cho rõ rồi nói thẳng điều cần nói.", "Bớt nghĩ ngợi, cho đầu óc được thả lỏng chút.", "Think it through, then say what needs saying.", "Stop overthinking; give your mind a rest."],
  pentacles: ["Kiên trì từng bước nhỏ, thành quả sẽ đến.", "Xem lại kế hoạch và chi tiêu cho thực tế hơn.", "Keep taking small steady steps — results will come.", "Review your practical plans and spending."],
};

// ── Tra cứu lá bài (id 0–21: Ẩn Chính; 22–77: Ẩn Phụ theo thứ tự Gậy, Cốc, Kiếm, Tiền) ──
export const TAROT_DECK_SIZE = 78;
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

export type TarotCardInfo = { id: number; suit: TarotSuit; name: T2; symbol: string; corner: string; up: T2; rev: T2 };

export function tarotCard(id: number): TarotCardInfo {
  if (id < 22) {
    const r = MAJOR[id];
    return { id, suit: "major", name: { vi: r[0], en: r[1] }, symbol: r[2], corner: ROMAN[id], up: { vi: r[3], en: r[5] }, rev: { vi: r[4], en: r[6] } };
  }
  const s = SUITS[Math.floor((id - 22) / 14)];
  const k = (id - 22) % 14;
  const rank = RANKS[k];
  const row = s.rows[k];
  return {
    id,
    suit: s.id,
    name: { vi: `${rank.vi} ${s.vi}`, en: `${rank.en} of ${s.en}` },
    symbol: s.emoji,
    corner: rank.short,
    up: { vi: row[0], en: row[2] },
    rev: { vi: row[1], en: row[3] },
  };
}


// ── Rút bài: Fisher–Yates bằng crypto.getRandomValues ──
function randInt(n: number): number {
  try {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n; // bỏ phần dư để không lệch xác suất
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

function drawCards(n: number, exclude: number[] = []): TarotDraw[] {
  const deck = Array.from({ length: TAROT_DECK_SIZE }, (_, i) => i).filter((i) => !exclude.includes(i));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map((id) => ({ id, rev: randInt(2) === 1 }));
}

const pick = <X,>(arr: X[]) => arr[randInt(arr.length)];

// ─────────────────────────────────────────────────────────────────────────────
// HỎI – ĐÁP TỰ NHIÊN (30/09 r2, theo ý Kir): người dùng gõ câu hỏi tự do ("bói tarot xem khi nào
// mình có visa đi Úc") → Lomi tự nhận ra loại câu hỏi và rút bài trả lời thẳng câu đó, không hiện
// bảng chọn. Chỉ gõ "bói tarot" thì Lomi hỏi lại bằng lời: "bạn muốn hỏi bài điều gì?".
// ─────────────────────────────────────────────────────────────────────────────

/** Bỏ dấu + chữ thường, GIỮ NGUYÊN độ dài chuỗi (để cắt câu gốc theo vị trí tìm được). */
function fold(s: string): string {
  let out = "";
  for (const ch of s.split("")) {
    const c = ch === "đ" || ch === "Đ" ? "d" : (ch.normalize("NFD")[0] ?? ch);
    out += c.toLowerCase()[0] ?? c;
  }
  return out;
}

const TRIG =
  /(?<![a-z])(boi\s+tarot|xem\s+tarot|tarot|boi\s+bai|rut\s+bai|trai\s+bai|xem\s+boi|boi\s+toan|rut\s+(?:1|mot|3|ba|5|nam|10|muoi)\s+la|boi\s+(?:1|mot|3|ba|5|nam|10|muoi)\s+la|boi)(?![a-z])/g;

function findTrigger(orig: string, f: string): { start: number; end: number } | null {
  TRIG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRIG.exec(f))) {
    // "boi" đứng một mình chỉ tính khi gõ đúng "bói" (hoặc "boi" liền "tarot/bài"…); tránh "bơi", "bồi", "bới".
    if (m[1] === "boi") {
      const o = orig[m.index + 1];
      if (o !== "ó" && o !== "Ó") continue;
    }
    return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

const LEAD =
  /^[\s,.:;!?\-–—…"“”'()]*(?:(?:xem|giup|dum|gium|ho|cho|em|anh|a|e|minh|toi|tui|voi|thu|coi|ve|la|muon|oi|lomi|ban|chi|bai(?!\s+hoc)|tarot|cai|cua|dc|duoc|hoi|nhu the nao|tiep(?=\s*:))(?![a-z])|(?:1|mot|3|ba|5|nam|10|muoi)\s+la(?![a-z])|celtic\s+cross(?![a-z])|celtic(?![a-z])|trai\s+(?:5|10|nam|muoi)\s+la(?![a-z])|[\s,.:;!?\-–—…"“”'()]+)/;
const TRAIL =
  /(?:(?:^|[\s,.:;!\-–—…]+)(?:(?:giup|dum|gium|ho|voi)(?:\s+(?:em|anh|minh|toi|tui|mk|a|e|t))?|nha|nhe|ne|di|nhen|hen|lomi|oi|ik|xem|coi|thu|(?:\d+|mot|hai|ba|vai|may)\s+la(?:\s+bai)?)(?![a-z]))+[\s,.:;!\-–—…]*$|[\s,.:;!\-–—…]+$/;

/** Cắt bớt các chữ đệm ở 2 đầu ("xem giúp em …", "… nha") — làm trên bản bỏ dấu, cắt trên câu gốc. */
function clean(orig: string): string {
  let s = orig;
  for (let guard = 0; guard < 12; guard++) {
    const f = fold(s);
    const a = f.match(LEAD);
    if (a && a[0].length) {
      s = s.slice(a[0].length);
      continue;
    }
    const b = f.match(TRAIL);
    if (b && b[0].length && b.index !== undefined) {
      s = s.slice(0, b.index);
      continue;
    }
    break;
  }
  return s.trim().replace(/^["“”']+|["“”']+$/g, "").trim();
}

const FILLER_RE =
  /^((cho|giup|dum|gium|ho|minh|em|anh|toi|tui|ban|may|vai|\d+|mot|hai|ba|nam|la|bai|tarot|di|nha|nhe|voi|thu|coi|xem|cai|nao|ne|luon|lien|nhanh|phat|chut|xiu|coi thu|boi|rut)[\s,.!?…]*)*$/;
const nWords = (x: string) => x.split(/\s+/).filter(Boolean).length;
const DAILY_RE = /(?<![a-z])(hom nay|thong diep|1 la|mot la|today)(?![a-z])/;

/** Câu gõ có ý muốn bói không? Trả về câu hỏi bóc ra (rỗng nếu chưa hỏi gì cụ thể). */
export function detectTarot(text: string): { question: string; daily: boolean } | null {
  const f = fold(text);
  const m = findTrigger(text, f);
  if (!m) return null;
  let after = clean(text.slice(m.end));
  const before = clean(text.slice(0, m.start));
  // Phần sau chữ "bói" chỉ là chữ đệm ("… bói cho mấy lá đi", "bói giùm 3 lá") → câu hỏi nằm ở phía trước.
  if (FILLER_RE.test(fold(after).trim())) after = "";
  let q = nWords(after) >= 2 ? after : nWords(before) >= 2 ? before : after || before;
  const fq = fold(q).trim();
  const dailyOnly = !fq || /^(cho )?(hom nay|thong diep( hom nay)?|ngay hom nay|today)\s*\??$/.test(fq);
  if (dailyOnly) q = "";
  return { question: q, daily: !q && DAILY_RE.test(f) };
}

/** Đang chờ người dùng nói câu hỏi → câu này có phải "thông điệp hôm nay" không. */
export function isDailyAsk(text: string) {
  const f = fold(text).trim();
  return /^(cho |xem |rut )?(thong diep( hom nay)?|hom nay|ngay hom nay|1 la|mot la|today('s message)?)\s*[?.!]*$/.test(f);
}
export function isTarotMore(text: string) {
  return /(?<![a-z])(rut them|them 1 la|them mot la|lam ro|rut 1 la nua|rut them 1 la|draw one more|one more card)(?![a-z])/.test(fold(text));
}
export function isTarotRedo(text: string) {
  return /(?<![a-z])(boi lai|rut lai|xao lai|redraw|draw again)(?![a-z])/.test(fold(text));
}
export function isTarotCancel(text: string) {
  return /^(thoi|khong|ko|huy|khoi|de sau|no|cancel|stop)(?![a-z])/.test(fold(text).trim());
}

function detectTopic(f: string): TarotTopic {
  if (/(?<![a-z])(benh|het benh|khoi benh|bi om|om dau|om nang|uong thuoc|thuoc men|toa thuoc|don thuoc|thuoc nay|suc khoe|bac si|benh vien|kham benh|xet nghiem|phau thuat|mo tim|bi sot|sot cao|cam cum|bi cam|dau bung|dau dau|dau lung|nhuc dau|mang thai|co bau|health|sick|illness|medicine|doctor)(?![a-z])/.test(f))
    return "health";
  if (/(?<![a-z])(tinh cam|tinh yeu|nguoi yeu|crush|nguoi ay|hen ho|yeu|ny|vo|chong|ket hon|cuoi|chia tay|quay lai|ex|love|dating|boyfriend|girlfriend|marry)(?![a-z])/.test(f))
    return "love";
  if (/(?<![a-z])(hoc|thi|du hoc|truong|dai hoc|bang cap|ielts|toeic|exam|study|school)(?![a-z])/.test(f)) return "study";
  if (/(?<![a-z])(visa|nuoc ngoai|du lich|xuat canh|dinh cu|xuat khau lao dong|ho chieu|chuyen di|di (uc|my|nhat|han|canada|duc|anh|phap|dai loan|sing|thai)|travel|trip|abroad|passport)(?![a-z])/.test(f))
    return "travel";
  if (/(?<![a-z])(cong viec|su nghiep|viec lam|cong ty|sep|phong van|xin viec|tim viec|kiem viec|co viec|that nghiep|mat viec|di lam|thang chuc|nghi viec|chuyen viec|work|job|career|interview|promotion|boss)(?![a-z])/.test(f))
    return "work";
  if (/(?<![a-z])(tien|tai chinh|dau tu|kinh doanh|buon ban|mo quan|lam an|luong|thu nhap|money|invest|business|salary)(?![a-z])/.test(f))
    return "money";
  return "general";
}

function detectKind(q: string): { kind: TarotKind; options?: [string, string] } {
  const f = fold(q);
  // A hay B — chỉ khi có dấu hiệu lựa chọn (chữ "hay" còn nghĩa là "thường": "mình hay cãi nhau…").
  const cm = f.match(/^(.*?)\s+(hay la|hoac la|hay|hoac|or)\s+(.+)$/);
  // "Ở lại hay đi?", "Công việc A hay B?" — chữ "hay" đứng giữa 2 vế ngắn cũng là câu chọn, trừ khi "hay" nghĩa là
  // "thường" (đứng sau đại từ: "mình hay cãi nhau…").
  const shortChoice =
    !!cm && /\?\s*$/.test(q) && cm[2] === "hay" && !/(?<![a-z])(minh|toi|em|anh|ban|ho|nguoi ay|no|chung ta)$/.test(cm[1].trim()) &&
    cm[1].trim().split(/\s+/).length <= 6 && cm[3].trim().split(/\s+/).length <= 6;
  if (cm && !/^(khong|ko|k|chua|not)(?![a-z])/.test(cm[3]) && (shortChoice || /(hay la|hoac|or)/.test(cm[2]) || /(?<![a-z])(nen|chon|giua|which|should|choose)(?![a-z])/.test(f))) {
    const cut = cm[1].length;
    let a = q.slice(0, cut);
    let b = q.slice(cut + cm[0].length - cm[1].length - cm[3].length);
    a = a.replace(/^.*?(?:nên chọn|nen chon|nên|nen|chọn|chon|giữa|giua|should i|choose)\s+/i, "");
    b = b.replace(/\s*(thì tốt hơn|thi tot hon|tốt hơn|tot hon|hơn|nhỉ|nhi|ạ|đây|day)?\s*[?.!…]*\s*$/i, "");
    const rawB = b.replace(/[?.!…]+$/, "").trim();
    a = clean(a);
    b = clean(b) || rawB; // "Ở lại hay đi?" — chữ "đi" không phải chữ đệm ở đây
    if (nWords(a) >= 1 && nWords(b) >= 1 && nWords(a) <= 8 && nWords(b) <= 8) return { kind: "choice", options: [a, b] };
  }
  if (/(?<![a-z])(khi nao|bao gio|bao lau|luc nao|thang nao|nam nao|may thang|bao nhieu lau|when|how long)(?![a-z])/.test(f)) return { kind: "timing" };
  if (
    /(?<![a-z])(khong|ko|chua|k|hok|hong|hem|khum|hk|kh|hn|kg)\s*[?.!…]*\s*$/.test(f) ||
    /(?<![a-z])(lieu|co nen|nen khong|co phai|co duoc|duoc khong|will|should|can i|is it|am i|do i|does)(?![a-z])/.test(f)
  )
    return { kind: "yesno" };
  return { kind: "open" };
}

const P = (vi: string, en: string): T2 => ({ vi, en });
const POS: Record<Exclude<TarotKind, "choice">, T2[]> = {
  daily: [P("Thông điệp", "Message")],
  open: [P("Tình huống", "Situation"), P("Thử thách", "Challenge"), P("Lời khuyên", "Advice")],
  timing: [P("Hiện tại", "Now"), P("Điều cần làm", "To do"), P("Thời điểm", "Timing")],
  yesno: [P("Hiện tại", "Now"), P("Trở ngại", "Obstacle"), P("Kết quả", "Outcome")],
};
const short = (x: string) => (x.length > 16 ? `${x.slice(0, 15).trim()}…` : x);

/** Rút bài cho 1 câu hỏi (rỗng = thông điệp hôm nay). */
/** Người dùng xin trải bài riêng trong câu gõ: "5 lá", "10 lá / Celtic Cross", "quá khứ – hiện tại – tương lai". */
export function spreadFromText(text: string): "five" | "celtic" | "ppf" | null {
  const f = ` ${fold(text).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ")} `;
  if (/ (celtic|10 la|muoi la|chu thap) /.test(f)) return "celtic";
  if (/ (5 la|nam la) /.test(f)) return "five";
  if (/ qua khu .*hien tai .*tuong lai /.test(f)) return "ppf";
  return null;
}
const SPREAD_GROUPS: Record<"five" | "celtic" | "ppf", Group[]> = {
  ppf: ["state", "state", "result"],
  five: ["state", "block", "block", "action", "result"],
  celtic: ["state", "block", "state", "state", "result", "phase", "state", "state", "block", "result"],
};
export function drawForQuestion(question: string, context?: string): TarotReading {
  const q = question.trim();
  if (!q) return { topic: "general", spread: "one", cards: drawCards(1), at: Date.now(), kind: "daily", question: "", pos: POS.daily };
  const { kind, options } = detectKind(q);
  const ctx = context?.trim() || undefined;
  // Chủ đề đọc từ câu hỏi; nếu câu hỏi chung chung thì xem thêm phần kể chuyện xung quanh.
  const t0 = detectTopic(fold(q));
  const topic = t0 === "general" && ctx ? detectTopic(fold(ctx)) : t0;
  if (kind === "choice" && options)
    return {
      topic,
      spread: "sca",
      cards: drawCards(2),
      at: Date.now(),
      kind,
      question: q,
      context: ctx,
      intent: detectIntent(q, kind)?.id,
      pos: options.map((o) => P(capFirst(short(o)), capFirst(short(o)))),
    };
  const it = detectIntent(q, kind);
  // Trải bài riêng người dùng xin (5 lá / Celtic Cross / QK–HT–TL) được ưu tiên hơn vị trí theo ý câu hỏi.
  const sp = spreadFromText(`${ctx ?? ""} ${q}`);
  if (sp) {
    const def = TAROT_SPREADS.find((x) => x.id === sp)!;
    return { topic, spread: sp, cards: drawCards(def.n), at: Date.now(), kind, question: q, context: ctx, intent: it?.id, pos: def.pos };
  }
  const ipos = it?.pos ? (typeof it.pos === "function" ? it.pos() : it.pos) : undefined;
  return {
    topic,
    spread: "sca",
    cards: drawCards(3),
    at: Date.now(),
    kind,
    question: q,
    context: ctx,
    intent: it?.id,
    pos: ipos ? ipos.map((x) => P(x, x)) : POS[kind as Exclude<TarotKind, "choice">],
  };
}

/** Rút thêm 1 lá làm rõ cho lượt bói trước (không trùng các lá đã ra). */
export function drawClarifier(prev: TarotReading): TarotReading {
  return {
    topic: prev.topic,
    spread: "one",
    cards: drawCards(1, prev.cards.map((c) => c.id)),
    at: Date.now(),
    kind: "open",
    question: prev.question ?? "",
    pos: [P("Lá làm rõ", "Clarifier")],
  };
}

// Điểm "thuận" của 1 lá: xuôi +1, ngược −1; vài lá sáng (Nhà Ảo Thuật, Hoàng Hậu, Bánh Xe, Ngôi Sao,
// Mặt Trời, Thế Giới) cộng thêm; lá nặng (Ác Quỷ, Toà Tháp, Mặt Trăng, 3/5/8/9/10 Kiếm, 5 Cốc, 5 Tiền,
// 10 Gậy) xuôi thì trừ, ngược lại hơi dịu.
function cardScore(d: TarotDraw): number {
  const c = tarotCard(d.id);
  let s = d.rev ? -1 : 1;
  if (c.suit === "major") {
    if (!d.rev && [1, 3, 10, 17, 19, 21].includes(d.id)) s += 1;
    if (!d.rev && [15, 16, 18].includes(d.id)) s -= 2;
    if (d.rev && d.id === 15) s = 1;
    return s;
  }
  const k = (d.id - 22) % 14;
  const hard =
    (c.suit === "swords" && [2, 4, 7, 8, 9].includes(k)) ||
    (c.suit === "cups" && k === 4) ||
    (c.suit === "pentacles" && k === 4) ||
    (c.suit === "wands" && k === 9);
  if (hard) s = d.rev ? 0 : -1;
  return s;
}

function timingPhrase(d: TarotDraw, en: boolean): string {
  const c = tarotCard(d.id);
  const nm = en ? c.name.en : c.name.vi;
  let body: string;
  if (c.suit === "major") {
    body = d.rev
      ? en
        ? "it may take longer than you hope — finish what's still pending first."
        : "chuyện này có thể lâu hơn bạn mong một chút — làm xong vài việc còn dang dở trước đã nha."
      : en
        ? "it comes with a clear turning point, possibly sudden — mostly when you're truly ready."
        : "chuyện này sẽ đến cùng một bước ngoặt rõ ràng, có khi khá bất ngờ — thường là đúng lúc bạn thật sự sẵn sàng."
  } else {
    const k = (d.id - 22) % 14;
    if (k <= 9) {
      const n = k + 1;
      const monthly = c.suit === "cups" || c.suit === "pentacles";
      const unit = en ? (monthly ? (n > 1 ? "months" : "month") : n > 1 ? "weeks" : "week") : monthly ? "tháng" : "tuần";
      body = en ? `roughly within ${n} ${unit}` : `chuyện này có thể đến trong khoảng ${n} ${unit} tới`;
      if (c.suit === "swords") body += en ? ", though things may feel rushed" : ", dù quãng chờ có thể hơi căng thẳng";
      body += d.rev ? (en ? " — reversed, so maybe a bit later than that." : " — lá ngược nên có thể trễ hơn chút.") : ".";
    } else {
      const court: [string, string][] = [
        ["sắp có tin rồi đó — để ý tin nhắn, email trong thời gian tới nha.", "news is coming soon — watch your messages."],
        ["mọi thứ sẽ chuyển động nhanh thôi, sớm hơn bạn nghĩ.", "things will move fast — fairly soon."],
        ["cần thêm chút thời gian vun vén, tầm vài tháng nữa.", "it needs some nurturing — a few months."],
        ["chuyện này sẽ đến khi mọi thứ đã chín muồi — cần kiên nhẫn thêm chút.", "when everything is ripe and stable — be patient."],
      ];
      body = en ? court[k - 10][1] : court[k - 10][0];
      if (d.rev) body += en ? " (Reversed: possibly delayed.)" : " (Lá ngược: có thể chậm hơn.)";
    }
  }
  return en ? `The “${nm}” card suggests ${body}` : `Lá ${nm} cho thấy ${body}`;
}

/** Trả lời thẳng câu "có nên…/có… không" — gắn với chủ đề ({S}) để nghe như đang nói chuyện thật. */
function yesnoAnswer(cards: TarotDraw[], S: string, should: boolean): string {
  const total = cards.reduce((acc, d, i) => acc + cardScore(d) * (i === cards.length - 1 ? 2 : 1), 0);
  if (should) {
    if (total >= 3) return `NÊN nha! Bài khá ủng hộ ${S} đó 😄`;
    if (total >= 1) return `Nghiêng về NÊN — ${S} ổn đó, miễn là bạn giữ chừng mực.`;
    if (total === 0) return `Lưng chừng — ${S} làm cũng được mà không cũng chẳng sao, tuỳ tâm trạng bạn nha.`;
    if (total >= -2) return `Chưa nên lắm — bài hơi ngại ${S} lúc này, cân nhắc thêm chút nha.`;
    return `Lá bài bảo thôi, lần này bỏ qua ${S} đi nha 😅`;
  }
  if (total >= 3) return `Có vẻ là CÓ nha! Năng lượng quanh ${S} khá thuận đó.`;
  if (total >= 1) return `Nghiêng về CÓ — nhưng ${S} cần bạn chủ động thêm chút nữa.`;
  if (total === 0) return `Chưa rõ ràng lắm — ${S} còn tuỳ vào những gì bạn làm từ giờ.`;
  if (total >= -2) return `Hiện tại ${S} hơi khó, có thể chưa phải lúc — đừng nản nha.`;
  return `Lá bài nói là chưa đâu 😅 ${capFirst(S)} có lẽ nên đổi cách, hoặc chờ thời điểm khác.`;
}

/** Hỏi chuyện bệnh có khỏi không → không phán “có/không”, chỉ nói năng lượng + nhắc làm đúng lời bác sĩ. */
function healthAnswer(cards: TarotDraw[]): string {
  const total = cards.reduce((acc, d, i) => acc + cardScore(d) * (i === cards.length - 1 ? 2 : 1), 0);
  if (total >= 1)
    return "Năng lượng bài khá tích cực — tinh thần tốt sẽ giúp mau khoẻ lại. Cứ uống thuốc đúng giờ, đúng liều, ăn uống nghỉ ngơi đầy đủ nha.";
  if (total === 0) return "Bài cho thấy cơ thể cần thêm chút thời gian — khỏi bệnh là chuyện từ từ, đừng sốt ruột nha.";
  return "Bài nhắc bạn kiên nhẫn và đừng chủ quan — uống thuốc đúng chỉ định, nếu vài hôm chưa đỡ hoặc thấy nặng hơn thì quay lại bác sĩ liền nha.";
}

function yesnoPhrase(cards: TarotDraw[], en: boolean): string {
  const total = cards.reduce((acc, d, i) => acc + cardScore(d) * (i === cards.length - 1 ? 2 : 1), 0);
  if (total >= 3) return en ? "Looks like a YES! The cards feel quite favorable." : "Có vẻ là CÓ nha! Năng lượng các lá khá thuận đó.";
  if (total >= 1) return en ? "Leaning YES — but it needs a bit more effort from you." : "Nghiêng về CÓ, nhưng cần bạn chủ động thêm chút nữa.";
  if (total === 0) return en ? "Not clear yet — it depends on what you do from here." : "Chưa rõ ràng lắm — kết quả còn tuỳ vào những gì bạn làm từ giờ.";
  if (total >= -2) return en ? "A bit tough right now — maybe not the moment yet. Don't lose heart!" : "Hiện tại hơi khó, có thể chưa phải lúc — đừng nản nha.";
  return en ? "The cards say not yet 😅 Maybe try a different approach or wait for a better time." : "Lá bài nói là chưa đâu 😅 Có lẽ nên đổi cách, hoặc chờ thời điểm khác nha.";
}

// ── Ghép lời giải ──
// ── Từ khoá ý nghĩa của từng lá (cụm danh từ ngắn) — để ghép câu gắn với CHỦ ĐỀ người hỏi (30/09 r3) ──
// [VI xuôi, VI ngược, EN xuôi, EN ngược]
type KW = [string, string, string, string];
const KW_MAJOR: KW[] = [
  ["một khởi đầu mới, dám bước đi", "sự liều lĩnh hoặc chần chừ", "a fresh start", "recklessness or hesitation"],
  ["sự chủ động và đủ khả năng", "năng lực chưa dùng đúng chỗ", "initiative and skill", "wasted potential"],
  ["trực giác và tiếng nói bên trong", "những điều còn giấu kín", "intuition", "hidden things"],
  ["sự đủ đầy, được chăm chút", "việc cho đi quá nhiều mà quên mình", "abundance and care", "neglecting yourself"],
  ["kỷ luật và kế hoạch rõ ràng", "sự cứng nhắc hoặc mất kiểm soát", "discipline and structure", "rigidity or lost control"],
  ["lời khuyên của người đi trước", "khuôn mẫu cũ không còn hợp", "trusted guidance", "outdated rules"],
  ["sự hoà hợp và lựa chọn từ trái tim", "sự lệch nhịp, chọn chưa đúng", "harmony and a heartfelt choice", "misalignment"],
  ["quyết tâm và đà tiến lên", "sự phân tán, mất phương hướng", "drive and momentum", "scattered direction"],
  ["sự kiên nhẫn và mềm mỏng", "sự tự ti, cảm xúc lấn át", "patient strength", "self-doubt"],
  ["một khoảng lặng để suy ngẫm", "sự thu mình quá lâu", "time to reflect", "too much isolation"],
  ["vận may đang xoay chiều", "một giai đoạn lận đận tạm thời", "a lucky turn", "a temporary rough patch"],
  ["sự công bằng, rõ ràng", "điều chưa sòng phẳng", "fairness", "unfairness"],
  ["một khoảng dừng để nhìn góc khác", "sự trì hoãn không cần thiết", "a pause for perspective", "needless delay"],
  ["một chương mới sau khi khép lại cái cũ", "sự níu kéo điều đã cũ", "an ending that makes room", "clinging to the past"],
  ["sự cân bằng và kiên nhẫn", "sự quá đà", "balance and patience", "excess"],
  ["những ràng buộc và cám dỗ", "việc thoát khỏi ràng buộc cũ", "attachments and temptation", "breaking free"],
  ["một thay đổi bất ngờ", "sự né tránh thay đổi", "sudden change", "avoiding change"],
  ["hy vọng và sự chữa lành", "chút mất niềm tin", "hope and healing", "shaken faith"],
  ["những điều còn mơ hồ", "sự thật dần sáng tỏ", "uncertainty", "clarity returning"],
  ["niềm vui và thành công", "chút mệt mỏi làm mờ niềm vui", "joy and success", "dimmed joy"],
  ["sự thức tỉnh, cơ hội làm lại", "sự tự trách quá mức", "a wake-up call", "self-blame"],
  ["sự hoàn thành trọn vẹn", "việc còn dang dở", "completion", "unfinished business"],
];
const KW_MINOR: Record<Exclude<TarotSuit, "major">, KW[]> = {
  wands: [
    ["một nguồn cảm hứng mới", "hứng khởi bị chững lại", "fresh inspiration", "stalled enthusiasm"],
    ["việc lên kế hoạch cho bước tiếp theo", "nỗi ngại bước ra vùng an toàn", "planning ahead", "fear of leaving your comfort zone"],
    ["những cơ hội mở rộng", "kết quả đến chậm", "room to expand", "slow results"],
    ["niềm vui và sự ổn định", "chút lấn cấn trong nhà hoặc trong nhóm", "joy and stability", "friction at home or in the team"],
    ["sự cạnh tranh, va chạm", "những tranh cãi không đáng", "competition", "pointless conflict"],
    ["chiến thắng và sự công nhận", "cảm giác chưa được ghi nhận", "victory and recognition", "lack of recognition"],
    ["việc giữ vững lập trường", "cảm giác quá tải", "standing your ground", "overwhelm"],
    ["những chuyển động nhanh, tin tức dồn dập", "sự trễ hẹn, vội vàng", "fast movement and news", "delays or haste"],
    ["sự kiên cường ở chặng cuối", "sự kiệt sức", "resilience near the finish", "exhaustion"],
    ["gánh nặng trách nhiệm", "việc buông bớt gánh nặng", "heavy responsibility", "letting burdens go"],
    ["tin vui và tinh thần khám phá", "ý tưởng hay nhưng thiếu kiên trì", "good news and curiosity", "ideas without follow-through"],
    ["hành động mạnh mẽ, nhiệt huyết", "sự nóng vội, bốc đồng", "bold action", "impulsiveness"],
    ["sự tự tin, cuốn hút", "chút ghen tị hoặc tự ti", "confidence and charm", "jealousy or insecurity"],
    ["tầm nhìn và khả năng dẫn dắt", "sự độc đoán, kỳ vọng quá cao", "vision and leadership", "being domineering"],
  ],
  cups: [
    ["một cảm xúc mới đang chớm nở", "những cảm xúc bị kìm nén", "new feelings", "bottled-up feelings"],
    ["sự kết nối hai chiều", "chút lệch pha, hiểu lầm", "a mutual connection", "misunderstanding"],
    ["niềm vui bạn bè, sum họp", "sự quá đà hoặc người thứ ba", "friendship and celebration", "overindulgence or a third party"],
    ["sự chán nản, dễ bỏ lỡ", "việc mở lòng trở lại", "boredom and missed chances", "opening up again"],
    ["sự tiếc nuối điều đã mất", "việc dần vượt qua nỗi buồn", "grief over a loss", "moving past sadness"],
    ["kỷ niệm đẹp, người cũ", "sự mắc kẹt trong quá khứ", "sweet memories", "being stuck in the past"],
    ["quá nhiều lựa chọn, dễ mơ mộng", "sự tỉnh táo trở lại", "too many options", "clarity returning"],
    ["việc rời bỏ điều không còn hợp", "sự lưỡng lự chưa nỡ rời đi", "walking away", "reluctance to leave"],
    ["một điều ước thành sự thật", "sự hài lòng chưa trọn", "a wish come true", "incomplete satisfaction"],
    ["hạnh phúc trọn vẹn, gia đình êm ấm", "kỳ vọng và thực tế còn vênh", "complete happiness", "expectations vs reality"],
    ["một tin nhắn dễ thương, lời tỏ tình", "cảm xúc non nớt, dễ tổn thương", "a sweet message", "fragile feelings"],
    ["một lời mời lãng mạn, chân thành", "những lời hứa hẹn quá ngọt", "a sincere romantic offer", "empty promises"],
    ["sự tinh tế, thấu cảm", "sự nhạy cảm quá mức", "empathy", "oversensitivity"],
    ["sự cân bằng giữa lý trí và cảm xúc", "cảm xúc thất thường", "emotional balance", "moodiness"],
  ],
  swords: [
    ["sự sáng tỏ, một sự thật được nói ra", "thông tin rối, nhiễu loạn", "clarity and truth", "confusion"],
    ["sự phân vân giữa hai lựa chọn", "một quyết định không thể né thêm", "indecision", "a decision you can't avoid"],
    ["một nỗi buồn cần được thừa nhận", "vết thương đang lành dần", "heartache", "healing"],
    ["sự nghỉ ngơi, hồi phục", "việc quay lại sau thời gian nghỉ", "rest and recovery", "returning after a break"],
    ["cái giá của tranh cãi", "sự làm hoà", "the cost of conflict", "making peace"],
    ["việc rời xa khó khăn", "những vướng bận cũ", "moving on from trouble", "lingering baggage"],
    ["sự thiếu minh bạch", "sự thật dần lộ ra", "hidden motives", "the truth coming out"],
    ["cảm giác bị mắc kẹt", "việc thoát khỏi suy nghĩ tự trói mình", "feeling trapped", "breaking mental chains"],
    ["nỗi lo âu, nghĩ quá nhiều", "nỗi lo đang vơi dần", "anxiety", "easing worries"],
    ["một điểm chạm đáy trước khi đi lên", "sự hồi phục sau khó khăn", "hitting bottom", "recovery"],
    ["sự tò mò, tin tức mới", "chuyện thị phi, nói nhiều làm ít", "curiosity and news", "gossip"],
    ["hành động quyết liệt, nói thẳng", "sự hấp tấp trong lời nói", "decisive action", "rash words"],
    ["sự sắc sảo, độc lập", "sự lạnh lùng, khắt khe", "sharp independence", "coldness"],
    ["lý trí và nguyên tắc", "sự áp đặt bằng lý lẽ", "reason and principle", "controlling logic"],
  ],
  pentacles: [
    ["một cơ hội mới về tiền bạc, công việc", "cơ hội dễ tuột mất", "a new money or work opportunity", "a slipping chance"],
    ["sự xoay xở khéo léo", "sự quá tải, lịch trình rối", "skillful juggling", "overload"],
    ["việc làm việc nhóm hiệu quả", "sự phối hợp chưa ăn ý", "teamwork", "poor coordination"],
    ["sự giữ gìn, tiết kiệm", "sự khư khư hoặc chi tiêu quá tay", "saving and security", "hoarding or overspending"],
    ["khó khăn tạm thời", "dấu hiệu khởi sắc", "temporary hardship", "things improving"],
    ["sự cho và nhận", "sự cho đi chưa cân bằng", "giving and receiving", "unbalanced giving"],
    ["sự kiên nhẫn chờ thành quả", "sự sốt ruột", "patience for results", "impatience"],
    ["sự chăm chỉ rèn luyện", "sự làm cho có, thiếu tập trung", "diligent practice", "half-hearted effort"],
    ["sự tự chủ, sung túc", "sự phụ thuộc hoặc tiêu xài quá tay", "independence and comfort", "dependence or overspending"],
    ["sự ổn định lâu dài", "chút bất ổn tài chính trong nhà", "long-term stability", "family money worries"],
    ["cơ hội nhỏ mà chắc", "sự chần chừ, thiếu thực tế", "small solid chances", "procrastination"],
    ["sự đều đặn, chắc chắn", "sự trì trệ", "steady progress", "stagnation"],
    ["sự chu đáo, biết vun vén", "việc lo toan cho người khác quá nhiều", "practical care", "over-caring for others"],
    ["sự vững vàng về tài chính", "việc đặt nặng tiền bạc", "financial security", "money obsession"],
  ],
};
function kwRow(d: TarotDraw): KW {
  const c = tarotCard(d.id);
  return c.suit === "major" ? KW_MAJOR[d.id] : KW_MINOR[c.suit][(d.id - 22) % 14];
}
function kw(d: TarotDraw, en: boolean): string {
  const row = kwRow(d);
  return en ? (d.rev ? row[3] : row[2]) : d.rev ? row[1] : row[0];
}
// Không phải lá ngược nào cũng xấu, lá xuôi nào cũng tốt (vd Năm Tiền ngược = khởi sắc, Chín Kiếm xuôi = lo âu).
// Chọn câu dẫn theo "nặng/nhẹ" của từ khoá để lời giải không tự mâu thuẫn ("đang vướng sự hồi phục").
const SOFT_REV = new Set([
  "việc thoát khỏi ràng buộc cũ", "sự thật dần sáng tỏ", "việc buông bớt gánh nặng", "việc mở lòng trở lại",
  "việc dần vượt qua nỗi buồn", "sự tỉnh táo trở lại", "vết thương đang lành dần", "việc quay lại sau thời gian nghỉ",
  "sự làm hoà", "sự thật dần lộ ra", "việc thoát khỏi suy nghĩ tự trói mình", "nỗi lo đang vơi dần",
  "sự hồi phục sau khó khăn", "dấu hiệu khởi sắc",
]);
const HARD_UP = new Set([
  "những ràng buộc và cám dỗ", "những điều còn mơ hồ", "gánh nặng trách nhiệm", "sự cạnh tranh, va chạm",
  "sự chán nản, dễ bỏ lỡ", "sự tiếc nuối điều đã mất", "quá nhiều lựa chọn, dễ mơ mộng", "sự phân vân giữa hai lựa chọn",
  "một nỗi buồn cần được thừa nhận", "cái giá của tranh cãi", "sự thiếu minh bạch", "cảm giác bị mắc kẹt",
  "nỗi lo âu, nghĩ quá nhiều", "khó khăn tạm thời",
]);
function hard(d: TarotDraw): boolean {
  const row = kwRow(d);
  return d.rev ? !SOFT_REV.has(row[1]) : HARD_UP.has(row[0]);
}

// ── Chủ đề người hỏi: bóc phần "lõi" của câu hỏi → "chuyện visa đi Úc" ──
const Q_PHRASES = [
  "khi nao", "bao gio", "bao lau", "luc nao", "the nao", "ra sao", "nhu the nao", "nhu nao", "co nen", "tai sao", "vi sao",
  "lieu rang", "lieu", "co phai", "duoc khong", "hay khong", "co duoc khong", "sap toi", "bao nhieu",
];
const TIME_PHRASES = [
  "hom nay", "toi nay", "sang nay", "chieu nay", "dem nay", "ngay mai", "tuan nay", "tuan sau", "tuan toi", "thang nay",
  "thang sau", "thang toi", "nam nay", "nam sau", "sap toi", "co nen", "nen",
];
const LEAD_W = new Set(["a", "e", "anh", "em", "minh", "toi", "tui", "t", "co", "thi", "nen", "se", "duoc", "ban", "hay", "la", "ve", "cua"]);
const TRAIL_W = new Set(["khong", "ko", "k", "hok", "hong", "hem", "khum", "hk", "kh", "chua", "nhi", "nha", "vay", "the", "a", "sao", "nao", "nhe", "di", "ha", "ta", "day", "ne"]);
const TOPIC_NOUN: Record<TarotTopic, string> = {
  general: "chuyện này",
  love: "chuyện tình cảm",
  work: "chuyện công việc",
  money: "chuyện tiền bạc",
  travel: "chuyện đi xa, giấy tờ",
  study: "chuyện học hành",
  health: "chuyện sức khoẻ",
};
function subjectOf(q: string, topic: TarotTopic): string {
  let w = q.replace(/[?!.,…"“”]+/g, " ").split(/\s+/).filter(Boolean);
  const f = () => w.map((x) => fold(x).replace(/[^a-z0-9]/g, ""));
  for (const ph of Q_PHRASES) {
    const parts = ph.split(" ");
    let fw = f();
    for (let i = 0; i + parts.length <= fw.length; i++) {
      if (parts.every((p, k) => fw[i + k] === p)) {
        w.splice(i, parts.length);
        fw = f();
        i--;
      }
    }
  }
  // Bỏ mốc thời gian ("hôm nay", "tháng này"…) và chữ "nên" để chủ đề gọn: "hôm nay mình nên đi nhậu" → "chuyện đi nhậu".
  for (const ph of TIME_PHRASES) {
    const parts = ph.split(" ");
    let fw2 = f();
    for (let i = 0; i + parts.length <= fw2.length; i++) {
      if (parts.every((p, k) => fw2[i + k] === p) && w.length > parts.length) {
        w.splice(i, parts.length);
        fw2 = f();
        i--;
      }
    }
  }
  let fw = f();
  while (w.length && LEAD_W.has(fw[0])) (w.shift(), (fw = f()));
  while (w.length && TRAIL_W.has(fw[fw.length - 1])) (w.pop(), (fw = f()));
  if (w.length >= 2 && fw[w.length - 2] === "cua") w = w.slice(0, -2); // "... của mình"
  // Câu dài, nhiều chữ nói kiểu miệng ("ổng cho uống uống hết bệnh") → dùng tên chủ đề cho gọn, dễ đọc.
  if (!w.length || w.length > 5) return TOPIC_NOUN[topic];
  const core = w.join(" ");
  return fold(core).startsWith("chuyen") ? core : `chuyện ${core}`;
}
function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Role = "now" | "todo" | "timing" | "obstacle" | "outcome" | "situation" | "challenge" | "advice" | "message" | "option" | "clarify";
const ROLES: Record<Exclude<TarotKind, "choice">, Role[]> = {
  daily: ["message"],
  open: ["situation", "challenge", "advice"],
  timing: ["now", "todo", "timing"],
  yesno: ["now", "obstacle", "outcome"],
};
// Câu mở đầu cho từng vị trí — ghép chủ đề ({S}) + từ khoá lá ({k}); [VI xuôi, VI ngược, EN xuôi, EN ngược].
const FRAME: Record<Role, [string, string, string, string]> = {
  now: ["Lúc này, {S} đang mang năng lượng của {k}.", "Lúc này, {S} đang hơi vướng {k}.", "Right now this carries the energy of {k}.", "Right now this is tangled in {k}."],
  todo: ["Để mọi thứ suôn sẻ, lá này nhắc bạn để tâm tới {k}.", "Để mọi thứ suôn sẻ, bạn cần gỡ bỏ {k}.", "To make it work, lean into {k}.", "To make it work, let go of {k}."],
  timing: ["Về thời điểm, lá này mang tín hiệu của {k}.", "Về thời điểm, lá này còn vướng {k} nên có thể cần thêm chút thời gian.", "For timing, this card signals {k}.", "For timing, {k} may slow things a little."],
  obstacle: ["Điều bạn cần lưu tâm trong {S} là {k}.", "Điều có thể cản trở {S} chính là {k}.", "What to watch in this is {k}.", "What may block this is {k}."],
  outcome: ["Kết quả của {S} nghiêng về {k}.", "Kết quả của {S} có thể còn vướng {k}.", "The outcome leans toward {k}.", "The outcome may still carry {k}."],
  situation: ["Tình hình {S} hiện đang xoay quanh {k}.", "Tình hình {S} hiện đang vướng {k}.", "The situation revolves around {k}.", "The situation is caught up in {k}."],
  challenge: ["Điều thử thách bạn lúc này liên quan tới {k}.", "Thử thách lớn nhất ở đây là {k}.", "Your challenge relates to {k}.", "The biggest challenge is {k}."],
  advice: ["Lời khuyên của bài: hãy để tâm tới {k}.", "Lời khuyên của bài: gỡ bỏ {k} là mọi thứ sẽ nhẹ hơn.", "The advice: lean into {k}.", "The advice: release {k} and things get lighter."],
  message: ["Năng lượng hôm nay của bạn là {k}.", "Hôm nay bạn có thể hơi vướng {k}.", "Today's energy is {k}.", "Today you may bump into {k}."],
  option: ["Nếu chọn “{O}”, bài cho thấy {k}.", "Nếu chọn “{O}”, có thể sẽ vướng {k}.", "If you choose “{O}”, the cards show {k}.", "If you choose “{O}”, watch out for {k}."],
  clarify: ["Lá làm rõ cho {S}: {k}.", "Lá làm rõ cho {S}: cẩn thận {k}.", "The clarifier shows {k}.", "The clarifier warns of {k}."],
};
function frame(role: Role, d: TarotDraw, S: string, en: boolean, O = ""): string {
  const t = FRAME[role][(en ? 2 : 0) + (hard(d) ? 1 : 0)];
  return t.replace("{S}", S).replace("{k}", kw(d, en)).replace("{O}", O);
}

const TOPIC_INTRO: Record<TarotTopic, [string[], string[]]> = {
  general: [["Lomi xáo bài rồi nè ✨", "Hít một hơi… Lomi đã rút bài cho bạn ✨", "Bài đã sẵn sàng, cùng xem nha 🔮"], ["Cards are shuffled ✨", "Here's your reading 🔮"]],
  love: [["Chuyện tình cảm thì Lomi xáo bài thật kỹ nè 💞", "Để Lomi xem trái tim bạn đang được bài nói gì nha 💞"], ["Matters of the heart — Lomi shuffled carefully 💞"]],
  work: [["Chuyện công việc hả, để Lomi xem bài nha 💼", "Sự nghiệp là chuyện lớn, Lomi rút bài kỹ nè 💼"], ["Work question — let's see what the cards say 💼"]],
  money: [["Chuyện tiền bạc thì phải xem kỹ nè 💰", "Để Lomi xem túi tiền của bạn sắp tới thế nào nha 💰"], ["Money matters — let's take a careful look 💰"]],
  travel: [["Chuyện đi xa, giấy tờ… Lomi rút bài liền nha ✈️", "Hành trình sắp tới của bạn đây, cùng xem nha ✈️"], ["Travel and paperwork — here's your reading ✈️"]],
  health: [["Lomi mong bạn mau khoẻ nè 💚 Cùng xem bài nói gì nha", "Chuyện sức khoẻ thì Lomi xem thật nhẹ nhàng nè 💚"], ["Wishing you good health 💚 Let's see the cards"]],
  study: [["Chuyện học hành hả, cố lên nha! Lomi xem bài nè 📚", "Để Lomi xem việc học của bạn sắp tới ra sao nha 📚"], ["Studies — let's see what the cards say 📚"]],
};

// ── Bối cảnh cụ thể của câu hỏi (chi tiết hơn chủ đề): tìm việc khác đang đi làm, người cũ khác crush… ──
type Scene =
  | "jobseek" | "work" | "business" | "newlove" | "ex" | "crush" | "love" | "money" | "travel" | "study" | "health"
  | "fun" | "future" | "self" | "others" | "general";
function sceneOf(q: string, topic: TarotTopic, context?: string): Scene {
  const f = ` ${fold(`${context ?? ""} ${q}`)} `.replace(/[?!.,…"“”]/g, " ");
  const has = (re: RegExp) => re.test(f);
  if (topic === "health") return "health";
  if (has(/ (that nghiep|tim viec|kiem viec|xin viec|co viec|mat viec|bi duoi|nghi viec roi|chua co viec|phong van|nop cv|nop ho so xin) /)) return "jobseek";
  if (has(/ (tim duoc viec|kiem duoc viec|co viec lam|bao gio co viec|khi nao co viec) /)) return "jobseek";
  // Làm ăn / đầu tư / dự án / cửa hàng (hỏi chuyện kinh doanh, khác hỏi chuyện đi làm)
  if (has(/ (dau tu|lam an|hun von|gop von|mo quan|kinh doanh|buon ban|startup|du an|cua hang|quan cua minh|tiem cua minh|shop cua minh) /)) return "business";
  if (topic === "work") return "work";
  // Độc thân / vừa thất tình muốn có người mới — khác hẳn hỏi chuyện quay lại với người cũ.
  if (has(/ (nguoi yeu moi|co nguoi yeu|kiem nguoi yeu|tim nguoi yeu|doc than|bi e|e qua|van e|con e|gap dung nguoi|nguoi moi|chua co nguoi yeu|gap duoc ai) /) && !has(/ quay lai /))
    return "newlove";
  if (has(/ (nguoi yeu cu|nguoi cu|ny cu|ex|quay lai|tai hop|chia tay) /)) return "ex";
  if (has(/ (crush|nhan tin|to tinh|lam quen|bat chuyen|nguoi ay|thich (anh|em|ban|nguoi)|co thich minh) /)) return "crush";
  if (topic === "love") return "love";
  if (topic === "money" || topic === "travel" || topic === "study") return topic;
  if (has(/ (nhau|ruou|bia|di choi|quay|tiec|bar|pub) /)) return "fun";
  // Người khác (sếp, bạn bè, đồng nghiệp, "người đó"…) — không phải chuyện tình cảm
  if (has(/ (nguoi do|nguoi kia|sep|dong nghiep|ban be|ban than|nguoi a|anh a|chi a|ho nghi|ho nhin|y dinh|bien mat|mat lien lac) /)) return "others";
  // Bản thân / hướng đi
  if (has(/ (mac ket|be tac|can tro|tap trung vao|bai hoc|huong di|ban than minh|phu hop voi minh|hop voi minh|dinh huong|dam chan) /)) return "self";
  // Tương lai gần
  if (has(/ (thang toi|thang sau|sap toi|vai thang|nua nam|nam toi|nam sau|tuong lai|sap xuat hien|chuan bi cho|hom nay cua minh) /)) return "future";
  return "general";
}
type Tpl = [string, string]; // [bài thuận, bài thử thách]
type SceneBank = { noun?: string; state: Tpl; action: Tpl; block: Tpl; result: Tpl; tip: Tpl };
// {k} = ý chính của lá (cụm danh từ), {S} = chủ đề người hỏi ("chuyện visa đi Úc").
const SCENE: Record<Scene, SceneBank> = {
  jobseek: {
    noun: "chuyện tìm việc",
    state: [
      "Áp vào chuyện tìm việc, lá này cho thấy bạn vẫn đang giữ được {k}. Về mặt tâm lý, giữ được tinh thần tích cực là “vốn” quý nhất của người đang tìm việc: ai còn tin vào năng lực của mình thì thường kiên trì lâu hơn — và kiên trì mới là thứ quyết định kết quả.",
      "Áp vào chuyện tìm việc, lá này phản ánh bạn đang vướng {k}. Không có việc một thời gian, bị từ chối vài lần thì rất dễ tự nghi ngờ bản thân — đó là phản ứng tâm lý bình thường, không phải bằng chứng là bạn kém.",
    ],
    action: [
      "Với việc tìm việc, lá này khuyên bạn dựa vào {k}. Cụ thể là chủ động hơn một chút: nhắn người quen trong ngành, chỉnh CV cho từng vị trí thay vì gửi một bản cho tất cả.",
      "Với việc tìm việc, điều cần gỡ là {k}. Khi lo cả bức tranh lớn, đầu óc dễ quá tải và mình đâm ra trì hoãn; chia nhỏ mục tiêu mỗi ngày (vd 2 hồ sơ thật chỉn chu) sẽ giúp bạn thấy mình đang tiến lên.",
    ],
    block: [
      "Điều cần để ý khi tìm việc là {k} — dùng đúng lúc, đây sẽ là điểm cộng khi đi phỏng vấn.",
      "Thứ có thể cản bước bạn lúc này là {k}. Nhận diện được nó là đã gỡ được một nửa rồi.",
    ],
    result: [
      "Kết quả nghiêng về {k} — tín hiệu khá tốt cho một công việc phù hợp đang tới.",
      "Kết quả còn vướng {k}, nghĩa là có thể phải qua thêm vài vòng thử. Coi mỗi buổi phỏng vấn là một lần luyện tập, bạn sẽ khá lên thấy rõ.",
    ],
    tip: [
      "Việc nên làm ngay: mỗi ngày gửi vài hồ sơ được chỉnh riêng cho từng chỗ, và nhắn hỏi thăm người quen — rất nhiều công việc đến từ lời giới thiệu.",
      "Việc nên làm ngay: giữ nhịp sinh hoạt đều (dậy đúng giờ, vận động nhẹ) để tinh thần không đi xuống, rồi đặt một mục tiêu nhỏ mỗi ngày cho việc nộp hồ sơ.",
    ],
  },
  work: {
    noun: "chuyện công việc",
    state: [
      "Ở chỗ làm, lá này cho thấy bạn đang có {k}. Khi thấy mình làm chủ được công việc, người ta thường làm tốt hơn và dễ được ghi nhận hơn.",
      "Ở chỗ làm, lá này phản ánh bạn đang vướng {k}. Áp lực kéo dài dễ khiến mình mệt và nhìn mọi thứ tiêu cực hơn thực tế.",
    ],
    action: [
      "Trong công việc, bài khuyên bạn phát huy {k} — mạnh dạn đề xuất ý tưởng, nhận thêm phần việc bạn làm giỏi.",
      "Trong công việc, điều cần gỡ là {k}. Thử nói chuyện thẳng thắn với sếp hoặc đồng nghiệp về điều đang làm bạn vướng.",
    ],
    block: ["Điều cần để ý là {k} — biết tận dụng sẽ giúp bạn nổi bật.", "Thứ có thể cản bạn là {k} — đừng để nó kéo tinh thần làm việc xuống."],
    result: ["Kết quả nghiêng về {k} — công sức của bạn có khả năng được đền đáp.", "Kết quả còn vướng {k}, nên chuẩn bị thêm phương án dự phòng cho chắc."],
    tip: [
      "Ghi lại những việc bạn đã làm tốt — lúc cần đề xuất tăng lương hay chuyển vị trí sẽ có “bằng chứng” rõ ràng.",
      "Sắp việc theo thứ tự ưu tiên, nghỉ ngắn giữa giờ, và đừng ôm hết mọi thứ một mình.",
    ],
  },
  business: {
    noun: "chuyện làm ăn",
    state: [
      "Với chuyện làm ăn, lá này cho thấy đang có {k} — nền tảng khá ổn để phát triển.",
      "Với chuyện làm ăn, lá này phản ánh đang vướng {k}. Kinh doanh nào cũng có lúc chững, quan trọng là nhìn đúng chỗ nghẽn.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k}: thử một chương trình nhỏ trước, xem khách phản hồi ra sao rồi mới làm lớn.",
      "Điều cần gỡ là {k}. Xem lại chi phí, bớt những khoản không mang lại khách — giữ được tiền cũng là lời.",
    ],
    block: ["Điều cần để ý là {k} — đó có thể là lợi thế cạnh tranh của bạn.", "Rủi ro nằm ở {k} — tính kỹ trước khi rót thêm vốn."],
    result: ["Kết quả nghiêng về {k} — có khả năng phát triển tốt.", "Kết quả còn vướng {k}, nên đi từng bước nhỏ và giữ vốn dự phòng."],
    tip: [
      "Ghi chép thu – chi mỗi tuần; số liệu rõ ràng thì quyết định mới chắc.",
      "Đừng dồn hết vốn một lần — chia nhỏ, thử nghiệm, cái nào hiệu quả mới mở rộng.",
    ],
  },
  future: {
    noun: "thời gian tới",
    state: ["Thời gian tới mở đầu bằng năng lượng của {k} — một khởi điểm khá dễ chịu.", "Thời gian tới có thể mở đầu hơi vướng {k}. Biết trước để chuẩn bị là đã thắng một nửa rồi."],
    action: ["Điều nên chuẩn bị là {k} — càng sẵn sàng, cơ hội tới càng dễ nắm.", "Điều cần gỡ trước là {k}; dọn dẹp xong thì đường sẽ thoáng hơn."],
    block: ["Điều đáng chú ý là {k}.", "Cần để ý {k} — đừng để nó làm bạn bất ngờ."],
    result: ["Xa hơn một chút, mọi thứ nghiêng về {k}.", "Xa hơn một chút có thể còn vướng {k}, nên giữ sẵn phương án dự phòng."],
    tip: [
      "Viết ra 3 mục tiêu nhỏ cho thời gian tới và bắt đầu từ cái dễ nhất.",
      "Giữ sức khoẻ và một khoản tiền dự phòng — nền vững thì chuyện gì tới cũng xoay xở được.",
    ],
  },
  self: {
    noun: "hướng đi của bạn",
    state: ["Nhìn vào bên trong, lá này cho thấy bạn đang có {k} — đó là điểm tựa của bạn.", "Nhìn vào bên trong, lá này cho thấy bạn đang vướng {k}. Nhận ra được điều này là bước đầu để thay đổi."],
    action: ["Điều nên tập trung là {k} — dồn sức vào đây bạn sẽ thấy mình tiến lên rõ.", "Điều cần buông bớt là {k}; nhẹ đi một chút thì mới bước nhanh được."],
    block: ["Điều cần để ý trong mình là {k}.", "Thứ đang cản bạn chính là {k} — nó thường nằm trong suy nghĩ nhiều hơn ngoài đời."],
    result: ["Nếu đi đúng hướng, bạn sẽ chạm tới {k}.", "Nếu cứ giữ nguyên như cũ, bạn có thể còn vướng {k} — đổi một thói quen nhỏ thôi cũng khác nhiều."],
    tip: [
      "Mỗi tối dành 5 phút ghi lại một điều mình làm tốt trong ngày — sự tự tin lớn lên từ đó.",
      "Chọn MỘT việc nhỏ để thay đổi trong tuần này và làm đều đặn — thay đổi lớn bắt đầu từ việc nhỏ.",
    ],
  },
  others: {
    noun: "mối quan hệ này",
    state: ["Trong mắt người đó, lá này cho thấy {k}. Nhìn chung họ khá thiện cảm với bạn.", "Trong mắt người đó, lá này phản ánh {k}. Có thể giữa hai người còn điều chưa hiểu nhau."],
    action: ["Để mối quan hệ tốt hơn, hãy dựa vào {k}.", "Để mối quan hệ nhẹ nhàng hơn, cần gỡ bớt {k}."],
    block: ["Điều cần để ý giữa hai người là {k}.", "Thứ có thể tạo khoảng cách là {k}."],
    result: ["Mối quan hệ nghiêng về {k} — chiều hướng khá ổn.", "Mối quan hệ có thể còn vướng {k}, cần thêm thời gian và sự rõ ràng."],
    tip: [
      "Chủ động hỏi han, cảm ơn hoặc giúp một việc nhỏ — thiện cảm lớn lên từ những điều nhỏ.",
      "Giữ khoảng cách vừa đủ, nói chuyện rõ ràng, đừng đoán ý người khác quá nhiều.",
    ],
  },
  newlove: {
    noun: "chuyện tìm một người mới",
    state: [
      "Với chuyện tìm một người mới, lá này cho thấy bạn đang có {k}. Sau một lần tổn thương, việc lòng mình dần mở ra lại là dấu hiệu bạn đang hồi phục tốt.",
      "Với chuyện tìm một người mới, lá này phản ánh bạn đang vướng {k}. Vừa trải qua chuyện buồn thì thu mình, nghi ngờ bản thân là phản ứng rất bình thường — trái tim cần thời gian để lành.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k}: mở rộng vòng bạn bè, nhận lời những buổi cà phê, đi chơi — người phù hợp thường đến từ những kết nối rất đời thường.",
      "Điều cần gỡ là {k}. Đừng vội lao vào mối quan hệ mới chỉ để quên người cũ; chăm cho bản thân trước, bạn sẽ thu hút đúng người hơn.",
    ],
    block: ["Điều cần để ý là {k} — đó chính là điểm thu hút của bạn.", "Thứ có thể cản là {k} — đừng để vết thương cũ khiến bạn đóng cửa với người mới."],
    result: ["Kết quả nghiêng về {k} — một người mới có thể sắp xuất hiện.", "Kết quả còn vướng {k} — có lẽ nên cho mình thêm thời gian chữa lành."],
    tip: [
      "Chăm chút bản thân, ra ngoài nhiều hơn, thử mục Làm quen trên Quẹt — gặp gỡ nhiều thì cơ hội gặp đúng người cũng nhiều hơn.",
      "Cho mình thời gian buồn, ngủ đủ, gặp bạn bè thân — khi lòng nhẹ rồi thì người mới đến cũng trọn vẹn hơn.",
    ],
  },
  ex: {
    noun: "chuyện với người cũ",
    state: [
      "Với người cũ, lá này cho thấy giữa hai người vẫn còn {k}. Tâm lý học gọi cảm giác còn vương vấn này là “chuyện chưa khép lại” — cảm xúc cũ còn đó nên mình mới hay nghĩ tới.",
      "Với người cũ, lá này phản ánh bạn đang vướng {k}. Khi một mối quan hệ kết thúc, mình vẫn quen có người đó trong cuộc sống — nên nhớ nhung là chuyện bình thường.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k}: nếu muốn nối lại, hãy bắt đầu nhẹ nhàng, như hai người bạn hỏi thăm nhau.",
      "Điều cần gỡ là {k}. Trước khi nghĩ tới chuyện quay lại, hãy hỏi lòng mình: mình nhớ người đó, hay nhớ cảm giác không cô đơn?",
    ],
    block: ["Điều cần để ý là {k} — đó có thể là cầu nối giữa hai người.", "Thứ có thể cản là {k} — những lý do khiến hai người chia tay có thể vẫn còn đó."],
    result: ["Kết quả nghiêng về {k} — cánh cửa chưa đóng hẳn đâu.", "Kết quả còn vướng {k} — có lẽ đây là lúc chăm cho bản thân hơn là chờ đợi."],
    tip: [
      "Nếu liên lạc lại, hãy nói chuyện thật lòng về điều từng khiến hai người xa nhau, đừng chỉ nhắc kỷ niệm đẹp.",
      "Dành thời gian cho bạn bè, sở thích riêng — khi lòng nhẹ hơn, bạn sẽ biết rõ mình thật sự muốn gì.",
    ],
  },
  crush: {
    noun: "chuyện với người ấy",
    state: [
      "Trong chuyện với người ấy, lá này cho thấy đang có {k}. Khi thích ai đó, mình hay soi từng tín hiệu nhỏ — lần này năng lượng khá tích cực đó.",
      "Trong chuyện với người ấy, lá này phản ánh bạn đang vướng {k}. Sợ bị từ chối là nỗi sợ rất tự nhiên — ai đứng trước người mình thích cũng vậy.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k}: chủ động một bước nhỏ và tự nhiên thôi — một tin nhắn hỏi thăm, một lời rủ đi cà phê.",
      "Điều cần gỡ là {k}. Đừng đoán ý người ta quá nhiều; một câu hỏi thẳng mà nhẹ nhàng thường hiệu quả hơn cả tuần suy diễn.",
    ],
    block: ["Điều cần để ý là {k} — đó chính là điểm khiến bạn thu hút.", "Thứ có thể cản là {k} — cẩn thận kẻo mình tự làm khó mình."],
    result: ["Kết quả nghiêng về {k} — khả năng người ta đáp lại là có đó.", "Kết quả còn vướng {k} — có thể cần thêm thời gian để hai người hiểu nhau hơn."],
    tip: [
      "Cứ là chính mình và giữ nhịp tự nhiên — sự thoải mái là điều hấp dẫn nhất.",
      "Đừng dồn hết cảm xúc vào một người; giữ cuộc sống của mình thật vui, ai hợp sẽ tự đến gần.",
    ],
  },
  love: {
    noun: "chuyện tình cảm",
    state: [
      "Trong chuyện tình cảm, lá này cho thấy đang có {k}. Cảm giác an toàn và được thấu hiểu là nền móng của mọi mối quan hệ bền.",
      "Trong chuyện tình cảm, lá này phản ánh đang vướng {k}. Khi thiếu cảm giác an toàn, mình dễ nghĩ nhiều và hiểu lầm cả những điều nhỏ.",
    ],
    action: [
      "Bài khuyên dựa vào {k} — dành thời gian thật sự cho nhau, nói ra điều mình trân trọng ở đối phương.",
      "Điều cần gỡ là {k}. Nói bằng “mình cảm thấy…” thay vì “bạn lúc nào cũng…” sẽ giúp hai người bớt phòng thủ.",
    ],
    block: ["Điều cần để ý là {k} — giữ được điều này thì tình cảm sẽ bền.", "Thứ có thể cản là {k} — đừng để nó tích tụ thành khoảng cách."],
    result: ["Kết quả nghiêng về {k} — mối quan hệ có hướng đi tốt.", "Kết quả còn vướng {k} — cần cả hai cùng cố gắng thêm."],
    tip: [
      "Giữ những thói quen nhỏ: một lời hỏi thăm, một bữa ăn chung — tình cảm lớn lên từ những điều nhỏ.",
      "Chọn một lúc bình tĩnh để nói chuyện thật lòng, lắng nghe nhiều hơn là tranh cãi đúng sai.",
    ],
  },
  money: {
    noun: "chuyện tiền bạc",
    state: [
      "Về tiền bạc, lá này cho thấy bạn đang có {k}. Cảm giác làm chủ được tài chính giúp mình quyết định sáng suốt hơn.",
      "Về tiền bạc, lá này phản ánh đang vướng {k}. Lo về tiền làm đầu óc bị “chật”, dễ quyết định vội — nên bình tĩnh trước đã.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k} — lập kế hoạch rõ ràng cho khoản tiền sắp tới.",
      "Điều cần gỡ là {k}. Ghi lại chi tiêu trong 1–2 tuần sẽ giúp bạn thấy tiền đang “chảy” đi đâu.",
    ],
    block: ["Điều cần để ý là {k} — tận dụng tốt sẽ giúp tiền sinh sôi.", "Thứ có thể cản là {k} — cẩn thận những khoản chi theo cảm xúc."],
    result: ["Kết quả nghiêng về {k} — tài chính có chiều hướng khá lên.", "Kết quả còn vướng {k} — nên giữ một khoản dự phòng cho chắc."],
    tip: [
      "Trích một phần để tiết kiệm ngay khi nhận tiền, đừng đợi cuối tháng mới để dành.",
      "Tạm hoãn khoản chi lớn, ưu tiên việc thiết yếu và tránh vay mượn thêm lúc này.",
    ],
  },
  travel: {
    state: [
      "Với {S}, lá này cho thấy đang có {k} — mọi thứ đang chuyển động theo hướng tốt.",
      "Với {S}, lá này phản ánh đang vướng {k}. Chờ kết quả giấy tờ là giai đoạn dễ sốt ruột nhất, vì phần lớn nằm ngoài tầm kiểm soát của mình.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k} — chủ động chuẩn bị trước những gì có thể: hồ sơ, tài chính, lịch trình.",
      "Điều cần gỡ là {k}. Tập trung vào phần mình kiểm soát được (hồ sơ đầy đủ, đúng hạn), phần còn lại cứ để thời gian lo.",
    ],
    block: ["Điều cần để ý là {k} — đây là lợi thế của bạn.", "Thứ có thể cản là {k} — rà lại hồ sơ thật kỹ để khỏi bị trả về."],
    result: ["Kết quả nghiêng về {k} — khả năng suôn sẻ là khá cao.", "Kết quả còn vướng {k} — có thể cần bổ sung giấy tờ hoặc chờ thêm một chút."],
    tip: [
      "Chuẩn bị sẵn bản sao giấy tờ và kế hoạch chi tiết để có tin là lên đường được ngay.",
      "Lập danh sách giấy tờ cần có, kiểm tra từng mục, và hỏi thêm người đã từng làm để tránh sai sót.",
    ],
  },
  study: {
    noun: "chuyện học hành",
    state: [
      "Về học hành, lá này cho thấy bạn đang có {k} — tinh thần học đang tốt.",
      "Về học hành, lá này phản ánh đang vướng {k}. Áp lực thi cử làm mình khó ghi nhớ hơn — nên bớt lo cũng là một cách học.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k} — tự kiểm tra bằng cách làm đề sẽ nhớ lâu hơn nhiều so với đọc đi đọc lại.",
      "Điều cần gỡ là {k}. Học theo từng phiên ngắn (khoảng 25–30 phút rồi nghỉ) giúp tập trung tốt hơn ngồi lì cả buổi.",
    ],
    block: ["Điều cần để ý là {k} — đó là điểm mạnh khi đi thi.", "Thứ có thể cản là {k} — đừng để nó lấy mất giấc ngủ, vì ngủ đủ giúp não ghi nhớ bài."],
    result: ["Kết quả nghiêng về {k} — công sức sẽ được đền đáp.", "Kết quả còn vướng {k} — cần đều đặn hơn một chút."],
    tip: [
      "Giữ lịch học đều mỗi ngày và ôn lại bài cũ theo chu kỳ, kiến thức sẽ nằm lâu hơn.",
      "Ngủ đủ giấc, chia nhỏ bài, và nhờ bạn bè hoặc thầy cô giảng lại phần khó.",
    ],
  },
  health: {
    noun: "chuyện sức khoẻ",
    state: [
      "Về sức khoẻ, lá này mang năng lượng của {k}. Tinh thần tốt không thay được thuốc, nhưng giúp mình ăn được, ngủ ngon — nền tảng để hồi phục.",
      "Về sức khoẻ, lá này phản ánh đang vướng {k}. Lúc mệt, mình hay lo nhiều hơn — mà lo lắng lại làm cơ thể căng thêm.",
    ],
    action: [
      "Bài khuyên bạn dựa vào {k} — uống thuốc đúng liều, ăn uống và nghỉ ngơi như bác sĩ dặn.",
      "Điều cần gỡ là {k}. Có gì chưa yên tâm về cách điều trị thì cứ hỏi lại bác sĩ, hoặc đi khám thêm ở chỗ khác.",
    ],
    block: ["Điều cần để ý là {k} — giữ được điều này sẽ giúp hồi phục nhanh hơn.", "Thứ có thể cản là {k} — đừng cố sức hay tự ý bỏ thuốc giữa chừng nha."],
    result: ["Kết quả nghiêng về {k} — tín hiệu tích cực cho việc hồi phục.", "Kết quả còn vướng {k} — cơ thể có thể cần thêm thời gian, đừng sốt ruột."],
    tip: [
      "Uống thuốc đúng giờ, uống đủ nước, ngủ sớm — mấy việc nhỏ này giúp cơ thể hồi phục rất nhiều.",
      "Nếu vài hôm chưa đỡ hoặc thấy nặng hơn, quay lại bác sĩ hoặc khám ở nơi khác để có thêm ý kiến nha.",
    ],
  },
  fun: {
    state: [
      "Với {S}, lá này mang năng lượng của {k} — tâm trạng đang khá hợp để vui chơi.",
      "Với {S}, lá này phản ánh bạn đang vướng {k}. Đôi khi mình muốn đi chơi vì cần xả stress — cũng tốt, miễn đừng quá đà.",
    ],
    action: ["Bài khuyên bạn dựa vào {k} — vui có chừng mực mới là vui trọn vẹn.", "Điều cần gỡ là {k}. Hẹn giờ về trước khi đi sẽ giúp bạn không bị cuốn theo cuộc vui."],
    block: ["Điều cần để ý là {k}.", "Thứ có thể cản là {k} — cẩn thận kẻo cuộc vui thành chuyện không vui."],
    result: ["Kết quả nghiêng về {k} — một buổi vui vẻ đang chờ bạn.", "Kết quả còn vướng {k} — có khi hôm nay nghỉ ngơi thì hơn."],
    tip: ["Vui thì vui, nhưng về nhà an toàn nha — đã uống thì gọi xe.", "Nếu đang mệt, ở nhà nghỉ một hôm cũng là cách tự thương mình đó."],
  },
  general: {
    state: ["Với {S}, lá này cho thấy đang có {k} — một khởi điểm khá tốt.", "Với {S}, lá này phản ánh bạn đang vướng {k}. Nhận ra được điều này đã là một bước tiến rồi."],
    action: ["Bài khuyên bạn dựa vào {k} để đi tiếp.", "Điều cần gỡ là {k} — bắt đầu từ một việc nhỏ nhất bạn làm được ngay hôm nay."],
    block: ["Điều cần để ý là {k} — tận dụng cho tốt nha.", "Thứ có thể cản là {k} — nhận diện sớm để tránh."],
    result: ["Kết quả nghiêng về {k} — chiều hướng khá tích cực.", "Kết quả còn vướng {k} — có thể cần thêm thời gian hoặc một cách làm khác."],
    tip: ["Cứ tin vào cảm nhận của mình và bước từng bước chắc chắn.", "Chậm lại một nhịp, viết ra điều mình lo nhất rồi xử lý từng phần."],
  },
};
type Group = "state" | "action" | "block" | "result" | "time" | "phase";
const ROLE_GROUP: Record<Role, Group> = {
  now: "state", situation: "state", message: "state", clarify: "state",
  todo: "action", advice: "action",
  obstacle: "block", challenge: "block",
  outcome: "result", option: "result",
  timing: "time",
};
// Vị trí theo mốc thời gian (sáng/chiều/tối, đầu/giữa/cuối tháng, từng cặp tháng…)
const PHASE_TPL: Tpl = [
  "Khoảng này mang năng lượng của {k} — mọi thứ khá thuận, cứ mạnh dạn.",
  "Khoảng này có thể vướng {k} — nên chậm lại và cẩn thận hơn một chút.",
];
const TIME_TPL: Tpl = [
  "Về thời điểm, lá này mang năng lượng của {k} — một tín hiệu tốt: khi bạn đã chuẩn bị đủ, {S} sẽ đến đúng lúc.",
  "Về thời điểm, lá này còn vướng {k} — {S} có thể cần thêm chút thời gian, hãy dùng khoảng chờ này để chuẩn bị kỹ hơn.",
];
const CHOICE_TPL: [string[], string[]] = [
  ["bạn sẽ có {k} — một hướng đi khá sáng.", "điểm cộng rõ nhất là {k} — lựa chọn này hợp với bạn đó."],
  ["bạn có thể phải đối mặt với {k} — cân nhắc xem mình đã sẵn sàng chưa.", "có thể sẽ vướng {k}, nên chuẩn bị tinh thần trước."],
];
const fillT = (t: string, k: string, S: string) => t.replace("{k}", k).replace("{S}", S);
const lcFirst = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);

// ── Nghĩa theo LĨNH VỰC (30/09 r7, theo mẫu Kir gửi): cùng một lá nhưng hỏi việc làm khác hỏi tình cảm ──
// [việc làm xuôi, việc làm ngược, tình cảm xuôi, tình cảm ngược]
const MAJOR_DOMAIN: [string, string, string, string][] = [
  ["Trong công việc, đây là lá của khởi đầu mới — có thể là một ngành, một chỗ làm bạn chưa từng thử. Dám nhận cơ hội lạ chính là điểm mấu chốt.", "Về công việc, lá này nhắc đừng nhảy vào việc gì quá vội chỉ vì sốt ruột, nhưng cũng đừng chần chừ mãi mà không nộp hồ sơ.", "Trong tình cảm, đây là năng lượng mới mẻ, hồn nhiên — một mối quan hệ nhẹ nhàng, không toan tính.", "Trong tình cảm, có chút bồng bột hoặc chần chừ; nghĩ kỹ rồi hãy bước tiếp."],
  ["Về công việc, bạn đã có đủ kỹ năng và “đồ nghề” — chỉ cần chủ động thể hiện. Đây là lá rất tốt cho phỏng vấn, tự giới thiệu bản thân.", "Về công việc, năng lực của bạn chưa được thể hiện đúng chỗ — có thể CV chưa làm nổi điểm mạnh, hoặc đang ứng tuyển chưa đúng hướng.", "Trong tình cảm, bạn có sức hút và biết cách bắt chuyện; chủ động là có kết quả.", "Trong tình cảm, cẩn thận những lời nói ngọt mà hành động không đi kèm."],
  ["Về công việc, câu trả lời chưa lộ hết — có những chuyện đang âm thầm diễn ra phía sau (hồ sơ đang được xem, có người đang cân nhắc bạn). Tin vào trực giác khi chọn nơi làm.", "Về công việc, có điều bạn chưa được biết hết; hỏi rõ thông tin trước khi quyết định.", "Trong tình cảm, có những cảm xúc chưa nói ra — cả hai đều đang dè dặt quan sát nhau.", "Trong tình cảm, có điều đang bị giấu; cần thẳng thắn với nhau hơn."],
  ["Về công việc, đây là lá của sinh sôi — nỗ lực bắt đầu đơm hoa, môi trường làm việc dễ chịu.", "Về công việc, bạn đang cho đi nhiều mà chưa nhận lại tương xứng; đừng tự hạ giá bản thân.", "Trong tình cảm, là sự ấm áp, được chăm sóc — mối quan hệ đang được nuôi dưỡng tốt.", "Trong tình cảm, bạn lo cho người kia mà quên chăm lo chính mình."],
  ["Về công việc, lá này nói về quy củ, kỷ luật — hợp với công ty có tổ chức hoặc vị trí cần trách nhiệm.", "Về công việc, có thể gặp môi trường áp đặt, hoặc chính bạn đang quá cứng nhắc với tiêu chuẩn của mình.", "Trong tình cảm, là sự vững chãi, che chở — có người muốn nghiêm túc.", "Trong tình cảm, sự kiểm soát hoặc cứng nhắc đang làm người kia ngột ngạt."],
  ["Về công việc, hợp với con đường quen thuộc: nơi ổn định, được người đi trước dìu dắt, hoặc cơ hội đến qua người giới thiệu.", "Về công việc, cách làm cũ không còn hợp; thử một hướng khác ngoài khuôn khổ quen thuộc.", "Trong tình cảm, hướng tới cam kết nghiêm túc, được gia đình ủng hộ.", "Trong tình cảm, hai người khác quan điểm hoặc chịu áp lực từ gia đình, khuôn mẫu."],
  ["Về công việc, đây là lá của lựa chọn đúng với giá trị bản thân — một công việc bạn thật sự thấy hợp, hoặc một mối hợp tác tốt.", "Về công việc, điều bạn muốn và điều đang có còn lệch nhau; xem lại tiêu chí chọn việc.", "Trong tình cảm, đây là lá rất đẹp — sự hoà hợp, hai người chọn nhau bằng trái tim.", "Trong tình cảm, có lệch nhịp hoặc lựa chọn chưa đúng; cần nói chuyện thật lòng."],
  ["Về công việc, đây là lá của quyết tâm và tiến lên — càng chủ động, kết quả càng đến nhanh.", "Về công việc, bạn đang bị kéo về quá nhiều hướng; chọn một mục tiêu rõ rồi dồn sức vào đó.", "Trong tình cảm, chủ động theo đuổi sẽ có kết quả.", "Trong tình cảm, mỗi người một hướng, thiếu sự đồng lòng."],
  ["Về công việc, sức mạnh nằm ở sự kiên nhẫn và bình tĩnh — giữ vững tinh thần là vượt qua được giai đoạn khó.", "Về công việc, sự tự ti đang kéo bạn xuống nhiều hơn là thực lực — bạn giỏi hơn bạn nghĩ đó.", "Trong tình cảm, sự dịu dàng và kiên nhẫn sẽ cảm hoá được người kia.", "Trong tình cảm, cảm xúc đang lấn át lý trí, dễ tổn thương."],
  ["Về công việc, đây là lúc lùi lại để nhìn rõ mình muốn gì — dùng thời gian này học thêm, định hướng lại là rất đáng.", "Về công việc, đừng thu mình quá lâu; cơ hội cần bạn bước ra và kết nối.", "Trong tình cảm, bạn đang cần khoảng lặng để hiểu mình trước khi hiểu người.", "Trong tình cảm, sự thu mình đang tạo khoảng cách."],
  ["Về công việc, vận đang xoay chiều — một thay đổi thuận lợi có thể tới khá bất ngờ.", "Về công việc, đang ở vòng lận đận tạm thời — nhưng bánh xe nào rồi cũng quay.", "Trong tình cảm, duyên đang tới, có thể gặp đúng người vào lúc không ngờ.", "Trong tình cảm, chưa đúng thời điểm; đừng cố ép."],
  ["Về công việc, làm đúng sẽ được đánh giá công bằng — hợp đồng, giấy tờ, thoả thuận rõ ràng.", "Về công việc, đọc kỹ hợp đồng và điều khoản; có điều chưa sòng phẳng.", "Trong tình cảm, cần sự công bằng — cho và nhận cân bằng.", "Trong tình cảm, có một bên đang chịu thiệt."],
  ["Về công việc, đây là giai đoạn chờ có chủ đích — thử nhìn theo góc khác, có thể bạn đang tìm chưa đúng chỗ.", "Về công việc, đừng trì hoãn nữa; chờ thêm cũng không làm cơ hội tự tới.", "Trong tình cảm, tạm dừng để nhìn lại, bớt cái tôi một chút.", "Trong tình cảm, chờ đợi mà không rõ mình chờ điều gì."],
  ["Về công việc, một chương cũ khép lại để mở chương mới — rất có thể là chuyển ngành hoặc một kiểu công việc khác trước đây.", "Về công việc, bạn đang níu hình mẫu công việc cũ; buông ra sẽ thấy nhiều lựa chọn hơn.", "Trong tình cảm, kết thúc cái cũ để bắt đầu lại — không phải điềm xấu đâu.", "Trong tình cảm, đang níu kéo điều đã hết."],
  ["Về công việc, mọi thứ đến từ từ và cân bằng — kiên nhẫn, kết hợp nhiều kỹ năng sẽ tìm được chỗ phù hợp.", "Về công việc, đang có sự quá đà: nộp tràn lan, hoặc ngược lại buông hẳn — tìm lại nhịp vừa phải.", "Trong tình cảm, hoà hợp, nhẹ nhàng, hợp để đi lâu dài.", "Trong tình cảm, mất cân bằng — một người đang cho quá nhiều."],
  ["Về công việc, cẩn thận những lời mời hấp dẫn quá mức, hoặc công việc giữ chân bằng tiền nhưng bào mòn bạn.", "Về công việc, bạn đang thoát khỏi một ràng buộc cũ — tự do chọn hướng mới.", "Trong tình cảm, có sự ràng buộc, ghen tuông hoặc phụ thuộc cảm xúc.", "Trong tình cảm, bạn đang dần gỡ được ràng buộc không lành mạnh."],
  ["Về công việc, thay đổi đột ngột — có thể làm bạn chao đảo, nhưng dọn đường cho điều phù hợp hơn.", "Về công việc, bạn đang né một thay đổi không thể tránh; chủ động đón nhận sẽ đỡ sốc hơn.", "Trong tình cảm, một cú sốc hoặc một sự thật bất ngờ.", "Trong tình cảm, né tránh vấn đề chỉ làm nó lớn thêm."],
  ["Về công việc, đây là lá của hy vọng — sau giai đoạn khó, mọi thứ bắt đầu sáng dần, bạn đang đi đúng hướng.", "Về công việc, bạn hơi mất niềm tin sau vài lần không như ý — đừng để nó dập tắt động lực.", "Trong tình cảm, là sự chữa lành và hy vọng.", "Trong tình cảm, niềm tin đang lung lay tạm thời."],
  ["Về công việc, thông tin còn mơ hồ — đừng tin vội lời hứa hẹn, tìm hiểu kỹ nơi làm trước khi nhận.", "Về công việc, mọi thứ đang dần rõ ra; bạn sẽ sớm biết mình nên đi hướng nào.", "Trong tình cảm, còn nhiều mập mờ, dễ suy diễn.", "Trong tình cảm, sự thật đang dần sáng tỏ."],
  ["Về công việc, đây là một trong những lá đẹp nhất — thành công, được công nhận, tin vui rõ ràng.", "Về công việc, kết quả vẫn tốt nhưng chậm hơn mong đợi; đừng để mệt mỏi làm mờ niềm vui.", "Trong tình cảm, vui vẻ, rõ ràng, đàng hoàng.", "Trong tình cảm, vẫn ổn nhưng hơi nhạt."],
  ["Về công việc, một lời gọi mới — có thể là cơ hội quay lại lĩnh vực cũ, hoặc ai đó từ trước liên hệ lại.", "Về công việc, đừng tự trách vì những lựa chọn trước; bài học có rồi, giờ là lúc làm lại.", "Trong tình cảm, cơ hội làm lại, nhìn nhận lại mối quan hệ.", "Trong tình cảm, vẫn còn tự trách hoặc chưa tha thứ được."],
  ["Về công việc, hoàn thành một giai đoạn, bước sang cấp độ mới — có thể là môi trường rộng hơn trước.", "Về công việc, còn việc dang dở cần khép lại trước khi bước tiếp.", "Trong tình cảm, viên mãn, trọn vẹn.", "Trong tình cảm, còn điều chưa trọn cần hoàn thiện."],
];
// Lá phụ: nghĩa theo từng lá cho VIỆC LÀM và TÌNH CẢM — [việc xuôi, việc ngược, tình xuôi, tình ngược] (Át → Vua)
const MINOR_DOMAIN: Record<Exclude<TarotSuit, "major">, [string, string, string, string][]> = {
  wands: [
    ["Về công việc, một cơ hội hoặc ý tưởng mới đang nhen nhóm — hợp để bắt đầu ngay khi còn hứng khởi.", "Về công việc, có ý tưởng mà chưa bắt đầu được, hoặc cơ hội bị hoãn lại; đừng để hứng khởi nguội đi.", "Trong tình cảm, có một sự rung động mới, nhiều hào hứng.", "Trong tình cảm, lửa đang hơi nguội hoặc bắt đầu chưa đúng lúc."],
    ["Về công việc, bạn đang lên kế hoạch cho bước tiếp theo và nhìn ra những lựa chọn xa hơn — kể cả việc ở nơi khác.", "Về công việc, ngại bước ra khỏi vùng an toàn nên cứ đứng yên ở chỗ cũ.", "Trong tình cảm, đang cân nhắc tương lai, tính chuyện lâu dài.", "Trong tình cảm, còn do dự, chưa dám quyết."],
    ["Về công việc, những gì bạn gieo trước đây bắt đầu có hồi âm — cơ hội mở rộng, có khi từ nơi xa.", "Về công việc, phản hồi đến chậm hơn mong đợi; cần kiên nhẫn chờ.", "Trong tình cảm, mối quan hệ có triển vọng, hướng về tương lai.", "Trong tình cảm, mong đợi chưa được đáp lại như ý."],
    ["Về công việc, có chuyện đáng ăn mừng — một cột mốc, hoặc một môi trường làm việc thân thiện.", "Về công việc, có chút lấn cấn trong nhóm, hoặc chưa thấy mình thuộc về nơi làm.", "Trong tình cảm, ấm cúng, có thể tính chuyện ra mắt, về chung.", "Trong tình cảm, có chút không yên giữa hai người hoặc trong nhà."],
    ["Về công việc, cạnh tranh khá gắt, nhiều người cùng giành một vị trí — cần làm nổi bật điểm khác biệt của mình.", "Về công việc, tránh những tranh cãi không đáng, tập trung vào việc của mình.", "Trong tình cảm, hay cãi nhau vặt, mỗi người một ý.", "Trong tình cảm, những va chạm đang lắng xuống."],
    ["Về công việc, đây là lá của chiến thắng và được công nhận — tin vui, được chọn.", "Về công việc, bạn thấy mình chưa được ghi nhận xứng đáng; đừng để nó làm nản lòng.", "Trong tình cảm, tự hào về nhau, mối quan hệ được công nhận.", "Trong tình cảm, cần được quan tâm, ghi nhận nhiều hơn."],
    ["Về công việc, cần giữ vững lập trường, bảo vệ giá trị của mình (vd khi thương lượng lương).", "Về công việc, đang quá tải, dễ buông xuôi — chỉ chọn những “trận” đáng theo thôi.", "Trong tình cảm, cần bảo vệ mối quan hệ trước tác động bên ngoài.", "Trong tình cảm, mệt vì phải gồng quá lâu."],
    ["Về công việc, mọi thứ chuyển động nhanh — tin tức, lời mời, lịch phỏng vấn có thể tới dồn dập.", "Về công việc, có sự trễ hẹn, chậm phản hồi; đừng vội kết luận.", "Trong tình cảm, tin nhắn qua lại nhiều, mọi thứ tiến triển nhanh.", "Trong tình cảm, dễ hiểu lầm vì vội vàng hoặc trễ hẹn."],
    ["Về công việc, bạn đã đi gần tới đích — mệt nhưng đừng bỏ cuộc lúc này.", "Về công việc, đang kiệt sức; nghỉ một nhịp rồi tính tiếp.", "Trong tình cảm, còn chút phòng thủ vì từng tổn thương, nhưng vẫn kiên trì.", "Trong tình cảm, mệt mỏi, muốn buông."],
    ["Về công việc, đang ôm quá nhiều trách nhiệm — cẩn thận nhận việc quá sức.", "Về công việc, bạn bắt đầu biết buông bớt gánh nặng, ưu tiên điều quan trọng.", "Trong tình cảm, một người đang gồng gánh quá nhiều.", "Trong tình cảm, cùng chia sẻ gánh nặng sẽ nhẹ hơn."],
    ["Về công việc, có tin vui hoặc lời mời mới, hợp để học thêm một kỹ năng.", "Về công việc, ý tưởng nhiều mà thiếu kiên trì theo đến cùng.", "Trong tình cảm, một lời rủ rê, một tin nhắn thú vị.", "Trong tình cảm, cảm xúc thất thường, nhanh chán."],
    ["Về công việc, hành động mạnh mẽ — hợp để chủ động nộp hồ sơ, đi gặp người.", "Về công việc, cẩn thận nóng vội, quyết định bốc đồng.", "Trong tình cảm, một người đầy nhiệt huyết, theo đuổi mạnh mẽ.", "Trong tình cảm, đến nhanh thì đi cũng nhanh."],
    ["Về công việc, bạn tự tin và cuốn hút — thể hiện bản thân là điểm mạnh khi phỏng vấn.", "Về công việc, chút tự ti hoặc so sánh với người khác đang kéo bạn lại.", "Trong tình cảm, bạn đang rất thu hút và tự tin.", "Trong tình cảm, có chút ghen tuông hoặc bất an."],
    ["Về công việc, tầm nhìn và khả năng dẫn dắt — hợp vị trí quản lý hoặc tự làm chủ.", "Về công việc, kỳ vọng quá cao hoặc độc đoán có thể gây mâu thuẫn.", "Trong tình cảm, một người chín chắn, dám cam kết.", "Trong tình cảm, muốn kiểm soát, áp đặt."],
  ],
  cups: [
    ["Về công việc, một công việc khiến bạn thật sự thấy vui, đúng với điều mình thích.", "Về công việc, bạn đang làm vì phải làm chứ không vì thích, cảm xúc bị kìm nén.", "Trong tình cảm, một cảm xúc mới chớm nở, rất đẹp.", "Trong tình cảm, cảm xúc bị kìm nén, chưa dám mở lòng."],
    ["Về công việc, một mối hợp tác hoặc đồng nghiệp rất hợp ý.", "Về công việc, lệch pha với đối tác hoặc đồng nghiệp.", "Trong tình cảm, hai người có sự kết nối hai chiều — lá rất đẹp cho chuyện tình cảm.", "Trong tình cảm, lệch pha, dễ hiểu lầm."],
    ["Về công việc, môi trường vui vẻ, có bạn bè giới thiệu cơ hội.", "Về công việc, vui chơi quá đà đang ảnh hưởng tới việc.", "Trong tình cảm, vui vẻ, được bạn bè vun vào.", "Trong tình cảm, có người thứ ba hoặc sự xen vào."],
    ["Về công việc, đang chững lại, chưa thấy cơ hội nào thật sự vừa ý — có khi cơ hội ở ngay đó mà mình chưa để ý.", "Về công việc, bạn bắt đầu mở lòng đón nhận lựa chọn mới.", "Trong tình cảm, hơi chán, thờ ơ, dễ bỏ lỡ tín hiệu từ người khác.", "Trong tình cảm, bắt đầu mở lòng trở lại."],
    ["Về công việc, còn tiếc nuối một cơ hội đã mất — nhưng phía sau vẫn còn những cơ hội khác.", "Về công việc, bạn đang dần vượt qua thất vọng, sẵn sàng thử lại.", "Trong tình cảm, tiếc nuối, buồn vì điều đã mất.", "Trong tình cảm, vết thương đang lành dần."],
    ["Về công việc, cơ hội có thể đến từ người quen cũ hoặc chỗ làm cũ.", "Về công việc, đừng mãi so sánh với công việc trước đây.", "Trong tình cảm, kỷ niệm đẹp — có thể người cũ quay lại.", "Trong tình cảm, đang mắc kẹt trong quá khứ."],
    ["Về công việc, nhiều lựa chọn quá, dễ mơ mộng — cần chọn cái thực tế nhất.", "Về công việc, bạn đang tỉnh táo lại, nhìn rõ đâu là lựa chọn thật.", "Trong tình cảm, nhiều mộng tưởng, dễ lý tưởng hoá người kia.", "Trong tình cảm, tỉnh táo nhìn rõ mối quan hệ."],
    ["Về công việc, rời bỏ điều không còn hợp để tìm hướng tốt hơn.", "Về công việc, biết là nên đổi mà vẫn chưa nỡ rời.", "Trong tình cảm, ra đi vì mối quan hệ không còn làm mình hạnh phúc.", "Trong tình cảm, lưỡng lự, chưa nỡ buông."],
    ["Về công việc, điều ước dễ thành thật — hài lòng với kết quả.", "Về công việc, bề ngoài ổn nhưng bên trong vẫn thấy thiếu.", "Trong tình cảm, hài lòng, như ý.", "Trong tình cảm, hài lòng chưa trọn."],
    ["Về công việc, một nơi làm như gia đình, cân bằng công việc và cuộc sống.", "Về công việc, kỳ vọng và thực tế còn vênh.", "Trong tình cảm, trọn vẹn, hướng tới gia đình — lá rất đẹp.", "Trong tình cảm, kỳ vọng và thực tế còn vênh."],
    ["Về công việc, một lời mời dễ thương hoặc một ý tưởng sáng tạo.", "Về công việc, còn non kinh nghiệm, dễ tự ái khi bị góp ý.", "Trong tình cảm, một tin nhắn dễ thương, một lời tỏ tình.", "Trong tình cảm, cảm xúc còn non nớt."],
    ["Về công việc, một lời mời hấp dẫn, hợp với việc sáng tạo.", "Về công việc, lời hứa hẹn ngọt quá — kiểm chứng kỹ trước khi nhận.", "Trong tình cảm, một lời mời lãng mạn, chân thành.", "Trong tình cảm, hứa hẹn quá ngọt, cẩn thận nha."],
    ["Về công việc, sự tinh tế, thấu cảm là điểm mạnh — hợp nghề chăm sóc, dịch vụ.", "Về công việc, dễ bị cảm xúc chi phối, nhạy cảm quá mức.", "Trong tình cảm, thấu hiểu, dịu dàng.", "Trong tình cảm, nhạy cảm quá, dễ tổn thương."],
    ["Về công việc, cân bằng lý trí và cảm xúc — xử lý mọi chuyện chín chắn.", "Về công việc, cảm xúc thất thường ảnh hưởng quyết định.", "Trong tình cảm, một người chín chắn, bao dung.", "Trong tình cảm, cảm xúc thất thường, khó đoán."],
  ],
  swords: [
    ["Về công việc, sự sáng tỏ — bạn nhìn rõ mình muốn gì, có một quyết định dứt khoát.", "Về công việc, thông tin đang rối, đừng quyết vội.", "Trong tình cảm, một sự thật được nói ra rõ ràng.", "Trong tình cảm, hiểu lầm vì thông tin nhiễu."],
    ["Về công việc, đang phân vân giữa hai lựa chọn và né quyết định.", "Về công việc, đến lúc phải chọn rồi, né thêm không được nữa.", "Trong tình cảm, né tránh cảm xúc thật, chưa dám đối diện.", "Trong tình cảm, buộc phải đưa ra quyết định."],
    ["Về công việc, một nỗi thất vọng (bị từ chối, bị chê) cần được thừa nhận để đi tiếp.", "Về công việc, nỗi buồn đang qua dần.", "Trong tình cảm, tổn thương, đau lòng.", "Trong tình cảm, vết thương đang lành."],
    ["Về công việc, cần nghỉ ngơi, nạp lại năng lượng trước khi tiếp tục.", "Về công việc, bạn đã sẵn sàng quay lại sau thời gian nghỉ.", "Trong tình cảm, cần một khoảng lặng.", "Trong tình cảm, sẵn sàng kết nối lại."],
    ["Về công việc, thắng mà mất nhiều — cân nhắc xem có đáng tranh không.", "Về công việc, làm hoà, bỏ qua mâu thuẫn để đi tiếp.", "Trong tình cảm, cãi thắng mà mất lòng.", "Trong tình cảm, làm hoà."],
    ["Về công việc, đang rời xa giai đoạn khó, chuyển sang chỗ yên ổn hơn.", "Về công việc, còn vướng bận chuyện cũ nên chưa đi tiếp được.", "Trong tình cảm, đang cùng nhau đi qua giai đoạn khó.", "Trong tình cảm, còn vướng bận chuyện cũ."],
    ["Về công việc, cẩn thận thông tin chưa minh bạch, đọc kỹ điều khoản.", "Về công việc, sự thật dần lộ ra.", "Trong tình cảm, có điều chưa thật lòng.", "Trong tình cảm, sự thật dần lộ ra."],
    ["Về công việc, cảm giác bị mắc kẹt — nhưng phần lớn là do mình tự giới hạn mình.", "Về công việc, bạn đang thoát ra khỏi suy nghĩ tự trói buộc.", "Trong tình cảm, thấy bế tắc, mắc kẹt.", "Trong tình cảm, đang dần thoát ra."],
    ["Về công việc, lo âu, mất ngủ vì chuyện việc làm — nỗi lo thường lớn hơn thực tế.", "Về công việc, nỗi lo đang vơi dần.", "Trong tình cảm, suy nghĩ quá nhiều, lo lắng.", "Trong tình cảm, nỗi lo dịu đi."],
    ["Về công việc, một điểm chạm đáy — nhưng đáy rồi thì chỉ còn đi lên.", "Về công việc, đang hồi phục sau cú vấp.", "Trong tình cảm, một kết thúc đau lòng.", "Trong tình cảm, hồi phục sau tổn thương."],
    ["Về công việc, tò mò, ham học — có tin tức mới.", "Về công việc, cẩn thận chuyện thị phi, nói nhiều làm ít.", "Trong tình cảm, đang tìm hiểu, dò hỏi.", "Trong tình cảm, lời ra tiếng vào."],
    ["Về công việc, hành động quyết liệt, nói thẳng.", "Về công việc, hấp tấp trong lời nói và quyết định.", "Trong tình cảm, thẳng thắn, chủ động.", "Trong tình cảm, dễ nói lời làm tổn thương."],
    ["Về công việc, sắc sảo, độc lập — lợi thế ở vị trí cần phân tích.", "Về công việc, khắt khe quá với người khác và chính mình.", "Trong tình cảm, tỉnh táo, rõ ràng, không để cảm xúc che mắt.", "Trong tình cảm, lạnh lùng, khắt khe."],
    ["Về công việc, lý trí, nguyên tắc — hợp vai trò chuyên môn.", "Về công việc, áp đặt bằng lý lẽ.", "Trong tình cảm, một người lý trí, đáng tin.", "Trong tình cảm, lạnh lùng, áp đặt."],
  ],
  pentacles: [
    ["Về công việc, một cơ hội vật chất thực sự — offer, công việc mới hoặc nguồn thu mới. Đây là lá rất đẹp khi hỏi chuyện việc làm.", "Về công việc, cơ hội có đó nhưng dễ tuột nếu không chuẩn bị kỹ.", "Trong tình cảm, một khởi đầu vững chắc, thực tế.", "Trong tình cảm, còn tính toán, chưa chắc chắn."],
    ["Về công việc, xoay xở khéo nhiều việc cùng lúc — có thể làm thêm việc tạm để giữ nhịp.", "Về công việc, quá tải, lịch trình rối.", "Trong tình cảm, cân bằng giữa tình cảm và cuộc sống.", "Trong tình cảm, bận quá nên xao nhãng nhau."],
    ["Về công việc, làm việc nhóm hiệu quả, kỹ năng được đánh giá cao.", "Về công việc, phối hợp chưa ăn ý.", "Trong tình cảm, cùng nhau vun đắp.", "Trong tình cảm, chưa đồng lòng."],
    ["Về công việc, giữ chặt thứ đang có — an toàn nhưng ít phát triển.", "Về công việc, chi tiêu hoặc giữ khư khư quá mức.", "Trong tình cảm, muốn giữ chặt, sợ mất.", "Trong tình cảm, chiếm hữu hoặc buông lỏng quá."],
    ["Về công việc, khó khăn tài chính tạm thời — đừng ngại nhờ người quen giúp đỡ, giới thiệu.", "Về công việc, tình hình đang khởi sắc, qua cơn khó rồi.", "Trong tình cảm, cảm giác bị bỏ rơi.", "Trong tình cảm, đang dần ấm lại."],
    ["Về công việc, có người giúp đỡ, nâng đỡ bạn.", "Về công việc, chuyện cho và nhận chưa cân bằng.", "Trong tình cảm, cho và nhận hài hoà.", "Trong tình cảm, một bên đang cho quá nhiều."],
    ["Về công việc, kiên nhẫn chờ thành quả — bạn đã gieo đủ rồi.", "Về công việc, sốt ruột vì chưa thấy kết quả.", "Trong tình cảm, vun đắp chậm mà chắc.", "Trong tình cảm, sốt ruột, muốn nhanh."],
    ["Về công việc, đây là lá của kỹ năng và bắt tay vào làm rất rõ — càng chủ động rèn nghề, gửi hồ sơ, hỏi người quen thì càng dễ kích hoạt cơ hội.", "Về công việc, làm cho có, thiếu tập trung.", "Trong tình cảm, chăm chút cho nhau từng chút.", "Trong tình cảm, đang lơ là nhau."],
    ["Về công việc, tự chủ, sung túc — thành quả từ nỗ lực của chính mình.", "Về công việc, phụ thuộc hoặc tiêu xài quá tay.", "Trong tình cảm, tự tin, độc lập.", "Trong tình cảm, phụ thuộc cảm xúc."],
    ["Về công việc, ổn định lâu dài, nơi làm có nền tảng vững.", "Về công việc, có bất ổn về tài chính.", "Trong tình cảm, bền vững, hướng tới gia đình.", "Trong tình cảm, lấn cấn chuyện tiền bạc, gia đình."],
    ["Về công việc, cơ hội nhỏ mà chắc — một khoá học, một việc làm thử.", "Về công việc, chần chừ, thiếu thực tế.", "Trong tình cảm, tìm hiểu chậm rãi, nghiêm túc.", "Trong tình cảm, còn chần chừ."],
    ["Về công việc, đều đặn, chắc chắn — tiến chậm mà chắc.", "Về công việc, trì trệ, an phận quá.", "Trong tình cảm, một người đáng tin, kiên định.", "Trong tình cảm, đều đều quá thành nhàm."],
    ["Về công việc, chu đáo, biết vun vén — hợp việc quản lý, chăm sóc.", "Về công việc, lo toan quá nhiều cho người khác.", "Trong tình cảm, ấm áp, biết chăm lo.", "Trong tình cảm, quên chăm lo bản thân."],
    ["Về công việc, vững vàng tài chính, có vị trí.", "Về công việc, đặt nặng tiền bạc quá.", "Trong tình cảm, một người vững chãi, có trách nhiệm.", "Trong tình cảm, thực dụng quá."],
  ],
};
type Domain = "career" | "love" | "general";
const DOMAIN_OF: Record<Scene, Domain> = {
  jobseek: "career", work: "career", money: "career", business: "career", newlove: "love",
  future: "general", self: "general", others: "general",
  ex: "love", crush: "love", love: "love",
  travel: "general", study: "general", health: "general", fun: "general", general: "general",
};
function domainText(d: TarotDraw, dom: Domain): string {
  const c = tarotCard(d.id);
  if (dom === "general") return "";
  const j = (dom === "career" ? 0 : 2) + (d.rev ? 1 : 0);
  return c.suit === "major" ? MAJOR_DOMAIN[d.id][j] : MINOR_DOMAIN[c.suit][(d.id - 22) % 14][j];
}

// Khung thời gian cụ thể (quy ra tháng/năm tính từ hôm nay) cho câu hỏi "bao giờ / khi nào".
function timingWindow(d: TarotDraw): { lo: number; hi: number; unit: "tuần" | "tháng"; note: string } {
  const c = tarotCard(d.id);
  if (c.suit === "major")
    return d.rev
      ? { lo: 3, hi: 6, unit: "tháng", note: "lá Ẩn Chính ngược nên có thể lâu hơn bạn mong một chút" }
      : { lo: 1, hi: 3, unit: "tháng", note: "đi kèm một bước ngoặt khá rõ" };
  const k = (d.id - 22) % 14;
  let w: { lo: number; hi: number; unit: "tuần" | "tháng"; note: string };
  if (k <= 9) {
    const n = k + 1;
    const monthly = c.suit === "cups" || c.suit === "pentacles";
    w = monthly ? { lo: n, hi: n + 2, unit: "tháng", note: "" } : { lo: n, hi: n + 2, unit: "tuần", note: "" };
  } else
    w = [
      { lo: 2, hi: 4, unit: "tuần" as const, note: "để ý tin nhắn, email trong thời gian này" },
      { lo: 1, hi: 3, unit: "tuần" as const, note: "mọi thứ chuyển động khá nhanh" },
      { lo: 2, hi: 3, unit: "tháng" as const, note: "cần chút thời gian vun vén" },
      { lo: 3, hi: 6, unit: "tháng" as const, note: "khi mọi thứ đã chín muồi" },
    ][k - 10];
  if (d.rev) w = { ...w, hi: w.hi + (w.unit === "tuần" ? 2 : 1), note: w.note || "lá ngược nên có thể trễ hơn chút" };
  return w;
}
function monthLabel(dt: Date) {
  return `tháng ${dt.getMonth() + 1}/${dt.getFullYear()}`;
}
function calendarRange(w: { lo: number; hi: number; unit: "tuần" | "tháng" }, now = new Date()): { from: string; range: string } {
  const add = (n: number) => new Date(now.getTime() + n * (w.unit === "tuần" ? 7 : 30) * 86400000);
  const a = add(w.lo);
  const b = add(w.hi);
  const part = now.getDate() <= 10 ? "đầu" : now.getDate() <= 20 ? "giữa" : "cuối";
  const from = `${part} tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  const sameYear = a.getFullYear() === b.getFullYear();
  const range =
    a.getMonth() === b.getMonth() && sameYear
      ? `trong ${monthLabel(a)}`
      : sameYear
        ? `khoảng tháng ${a.getMonth() + 1} → tháng ${b.getMonth() + 1}/${b.getFullYear()}`
        : `khoảng ${monthLabel(a)} → ${monthLabel(b)}`;
  return { from, range };
}

// Câu hỏi có/không viết lại theo bối cảnh — để phần kết luận nói thẳng vào điều người hỏi muốn biết.
const SCENE_ASK: Record<Scene, string> = {
  jobseek: "có việc hay không", business: "chuyện làm ăn có phát triển không", future: "thời gian tới có gì sáng sủa không",
  self: "mình nên đi hướng nào", others: "mối quan hệ này sẽ ra sao", newlove: "có người yêu mới hay không", work: "công việc có thuận lợi không", ex: "người cũ có quay lại không",
  crush: "chuyện với người ấy có thành không", love: "tình cảm có tiến triển không", money: "tiền bạc có khá lên không",
  travel: "mọi chuyện có suôn sẻ không", study: "kết quả có tốt không", health: "có mau khoẻ không", fun: "có nên đi không",
  general: "chuyện này có thành không",
};
// Gợi ý bói tiếp theo bối cảnh (hiện thành nút bấm; có chữ "Bói" nên bấm là bói luôn).
const SCENE_NEXT: Record<Scene, string[]> = {
  jobseek: ["Bói tiếp: công việc sắp tới hợp ngành gì", "Bói tiếp: môi trường làm việc sắp tới thế nào", "Bói tiếp: thu nhập công việc mới có ổn không"],
  work: ["Bói tiếp: có nên nhảy việc không", "Bói tiếp: sếp đánh giá mình thế nào", "Bói tiếp: năm nay có tăng lương không"],
  business: ["Bói tiếp: có nên mở rộng kinh doanh không", "Bói tiếp: tài chính vài tháng tới thế nào", "Bói tiếp: khách hàng sắp tới thế nào"],
  future: ["Bói tiếp: tháng tới có chuyện gì đáng chú ý", "Bói tiếp: mình cần chuẩn bị cho điều gì", "Bói tiếp: 3–6 tháng tới cuộc sống thay đổi thế nào"],
  self: ["Bói tiếp: điều gì đang cản trở mình", "Bói tiếp: mình nên tập trung vào điều gì", "Bói tiếp: hướng đi nào phù hợp với mình"],
  others: ["Bói tiếp: người đó có ý định gì", "Bói tiếp: mối quan hệ giữa mình và người đó sẽ thay đổi ra sao", "Bói một lá cho hôm nay"],
  newlove: ["Bói tiếp: người sắp tới của mình là người thế nào", "Bói tiếp: mình đã sẵn sàng cho mối quan hệ mới chưa", "Bói tiếp: có nên quay lại với người cũ không"],
  ex: ["Bói tiếp: người cũ còn nghĩ về mình không", "Bói tiếp: mình có nên chủ động liên lạc không", "Bói tiếp: sắp tới tình cảm của mình thế nào"],
  crush: ["Bói tiếp: người ấy nghĩ gì về mình", "Bói tiếp: mình có nên tỏ tình không", "Bói tiếp: khi nào hai đứa thân hơn"],
  love: ["Bói tiếp: người ấy nghĩ gì về mình", "Bói tiếp: mối quan hệ này có lâu dài không", "Bói tiếp: khi nào mình gặp đúng người"],
  money: ["Bói tiếp: có nên đầu tư lúc này không", "Bói tiếp: khi nào tài chính ổn định hơn", "Bói tiếp: nguồn thu mới sẽ đến từ đâu"],
  travel: ["Bói tiếp: chuyến đi có suôn sẻ không", "Bói tiếp: cần chuẩn bị gì thêm cho hồ sơ", "Bói tiếp: cuộc sống ở nơi mới thế nào"],
  study: ["Bói tiếp: kỳ thi sắp tới thế nào", "Bói tiếp: mình có hợp ngành đang học không", "Bói tiếp: có nên học thêm không"],
  health: ["Bói một lá cho hôm nay", "Bói tiếp: tinh thần mình dạo này thế nào"],
  fun: ["Bói một lá cho hôm nay", "Bói tiếp: cuối tuần này có gì vui không"],
  general: ["Bói một lá cho hôm nay", "Bói tiếp: tháng này của mình thế nào"],
};
// ─────────────────────────────────────────────────────────────────────────────
// Ý CÂU HỎI (30/09 r10, theo danh sách câu hay hỏi Kir gửi) — mỗi kiểu câu hỏi có trải bài riêng:
// tên vị trí lá, cách đọc từng vị trí, câu mở/kết kiểu “thầy bói – phù thủy”, cách chốt câu trả lời.
// ─────────────────────────────────────────────────────────────────────────────
type Lean = [string, string, string]; // [bài thuận, lưng chừng, nhiều thử thách]
type Intent = {
  id: string;
  re: RegExp; // so trên câu hỏi đã bỏ dấu, có khoảng trắng 2 đầu
  kinds?: TarotKind[]; // chỉ áp dụng cho các kiểu này (mặc định: mọi kiểu trừ choice)
  scene?: Scene; // bối cảnh khi câu hỏi chưa rõ bối cảnh
  force?: boolean; // luôn dùng scene này
  pos?: string[] | (() => string[]);
  groups?: Group[];
  ask?: string;
  lean?: Lean;
  answer?: string; // chốt kiểu “chỉ ra điều gì” — {k1} {k2} {k3} {go3} {res3}
  intro: string[];
  outro: string[];
  next?: string[];
  invest?: boolean;
  generalOnly?: boolean; // chỉ dùng khi câu hỏi không nói rõ chủ đề (tình cảm / công việc / tiền…)
};
const monthOf = (add: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + add);
  return d.getMonth() + 1;
};
const DIRECTION: Lean = [
  "đang đi theo chiều hướng khá sáng — chỉ cần bạn tiếp tục vun",
  "đang ở một ngã rẽ — hướng đi phụ thuộc nhiều vào lựa chọn của bạn",
  "đang có khá nhiều thử thách — nên chậm lại và điều chỉnh một chút",
];
const INTENTS: Intent[] = [
  // ❤️ Tình cảm
  {
    id: "third",
    re: / (nguoi thu ba|tuesday|ngoai tinh|co ai khac|bat ca hai tay|lang nhang|co nguoi khac|them ai|phan boi) /,
    scene: "love",
    pos: ["Hiện tại của mối quan hệ", "Điều đang ẩn giấu", "Sự thật sẽ lộ ra"],
    groups: ["state", "block", "result"],
    ask: "có người thứ ba không",
    lean: [
      "nghiêng về KHÔNG có ai chen vào — mối quan hệ khá an toàn",
      "chưa rõ ràng — có điều hai người cần nói chuyện thẳng thắn",
      "có dấu hiệu bất ổn — nên nói chuyện rõ ràng với nhau thay vì tự đoán",
    ],
    intro: ["Câu hỏi này nặng lòng lắm… Lomi thắp nến, soi thật kỹ nha 🕯️", "Để Lomi lật từng lớp màn xem có bóng ai khác không nha 🔍"],
    outro: [
      "Đừng vội kết luận chỉ vì một trải bài — nói chuyện thẳng thắn vẫn là cách rõ nhất 🌙",
      "Niềm tin giống ly nước đầy, giữ thì khó mà làm đổ thì dễ — cẩn thận với cả nghi ngờ lẫn im lặng nha 💧",
    ],
  },
  {
    id: "whenlove",
    re: / (khi nao|bao gio|luc nao) .*(nguoi yeu|gap dung nguoi|co doi|lay chong|lay vo|ket hon|co nguoi thuong|thoat e) /,
    kinds: ["timing"],
    scene: "newlove",
    force: true,
    pos: ["Bạn lúc này", "Điều cần mở lòng", "Thời điểm duyên tới"],
    groups: ["state", "action", "time"],
    ask: "khi nào gặp người thương",
    intro: ["Sợi chỉ đỏ của bạn đang được kéo về phía nào đây… Lomi xem nha 🧶", "Để Lomi hỏi thử các vì sao xem người ấy đang ở đâu trên đường tới nha ✨"],
    outro: [
      "Duyên đến vào lúc mình sống vui nhất — cứ rạng rỡ là người đúng sẽ nhận ra bạn 🌸",
      "Người đúng không đến sớm, cũng không đến muộn — mà đến đúng lúc bạn sẵn sàng 🌙",
    ],
  },
  {
    id: "feelings",
    re: / (co tinh cam|thich minh|yeu minh|co y voi minh|co thuong minh|con yeu minh|con thuong minh|de y minh|co cam tinh|thuong minh khong) /,
    scene: "crush",
    pos: ["Cảm xúc của người ấy", "Điều người ấy giữ trong lòng", "Hướng đi của hai người"],
    groups: ["state", "block", "result"],
    ask: "người ấy có tình cảm với mình không",
    intro: ["Lòng người khó đoán, nhưng lá bài thì hay nói thật lắm 🌙", "Để Lomi lắng nghe xem trái tim người ấy đang đập theo nhịp nào nha 💓"],
    outro: [
      "Tình cảm thật thì không cần đoán quá lâu — nó sẽ tự lộ ra qua hành động 🌙",
      "Dù bài nói gì, bạn vẫn xứng đáng được thương một cách rõ ràng và trọn vẹn 💚",
    ],
  },
  {
    id: "thinks",
    re: / (nghi gi ve minh|nghi sao ve minh|nhin minh the nao|nhin nhan minh|danh gia minh|an tuong ve minh|nghi ve minh the nao|thay minh the nao) /,
    scene: "others",
    pos: ["Ấn tượng bên ngoài", "Cảm nhận bên trong", "Điều họ chưa nói ra"],
    groups: ["state", "state", "block"],
    ask: "người đó nghĩ gì về mình",
    answer: "người đó nhìn bạn qua lăng kính của {k1}, trong lòng thì có {k2}, còn điều họ chưa nói ra là {k3}.",
    intro: ["Để Lomi thử bước vào suy nghĩ của người ấy một chút nha… suỵt 🤫", "Mỗi người là một cuốn sách — để Lomi mở trang viết về bạn ra xem nha 📖"],
    outro: [
      "Người khác nghĩ gì là việc của họ, còn bạn là ai là do bạn chọn — đừng để một ánh nhìn định nghĩa mình nha 🌿",
      "Muốn biết chắc nhất thì một câu hỏi nhẹ nhàng, thật lòng vẫn hơn trăm lần đoán 🌙",
    ],
  },
  {
    id: "comeback",
    re: / (bien mat|mat lien lac|khong lien lac|roi xa minh|bo di|khong con lien lac|bat vo am tin) /,
    scene: "others",
    pos: ["Lý do rời đi", "Hiện tại của họ", "Khả năng quay lại"],
    groups: ["block", "state", "result"],
    ask: "người đó có quay lại không",
    intro: ["Có những người đi mà chưa kịp nói lời tạm biệt… để Lomi tìm dấu chân họ nha 👣"],
    outro: ["Người đến rồi đi là chuyện của duyên — giữ lòng mình nhẹ nhàng, ai thuộc về mình sẽ tự quay về 🌙"],
  },
  {
    id: "exback",
    re: / (quay lai|tai hop|nguoi cu|nguoi yeu cu|ny cu) /,
    kinds: ["yesno", "open"],
    scene: "ex",
    pos: ["Điều còn đọng lại", "Điều ngăn cách", "Khả năng quay lại"],
    groups: ["state", "block", "result"],
    ask: "có khả năng quay lại không",
    intro: ["Chuyện cũ thường để lại dư âm lâu hơn mình nghĩ… để Lomi xem sợi dây ấy còn không nha 🕯️", "Để Lomi gõ cửa quá khứ một chút, xem còn ai đứng chờ không nha 🚪"],
    outro: [
      "Có người quay lại để ở lâu, có người quay lại chỉ để mình học cách buông — cả hai đều đáng nha 🌙",
      "Dù cửa mở hay đóng, bạn vẫn luôn có quyền chọn bình yên cho mình 💚",
    ],
  },
  {
    id: "lovefuture",
    re: /^(?=.* (tinh cam|tinh yeu|chuyen yeu|duyen) )(?=.* (thoi gian toi|sap toi|thang toi|thang sau|nam nay|nam toi|vai thang|tuong lai) )/,
    kinds: ["open", "yesno"],
    scene: "love",
    pos: ["Hiện tại", "Chuyển động sắp tới", "Kết quả"],
    groups: ["state", "phase", "result"],
    ask: "tình cảm thời gian tới thế nào",
    lean: DIRECTION,
    intro: ["Để Lomi xem trái tim bạn sắp bước sang mùa nào nha 🌸", "Chuyện tình cảm sắp tới hả… Lomi xáo bài thật chậm, thật kỹ nè 💞"],
    outro: ["Tình yêu đến vào lúc mình vui vẻ với chính mình nhất — cứ sống rạng rỡ nha 🌸", "Dù mùa nào, bạn vẫn xứng đáng được thương một cách dịu dàng 💚"],
  },
  {
    id: "direction",
    re: / (di ve dau|se ra sao|co lau dai|lau dai khong|tuong lai cua (hai|chung)|co ben lau|di den dau|ket qua cua moi quan he|co ket qua) /,
    kinds: ["open", "yesno"],
    scene: "love",
    pos: ["Hiện tại của mối quan hệ", "Thử thách phía trước", "Hướng đi sắp tới"],
    groups: ["state", "block", "result"],
    ask: "mối quan hệ này sẽ đi về đâu",
    lean: DIRECTION,
    intro: ["Để Lomi trải con đường của hai bạn ra xem nó dẫn về đâu nha 🛤️", "Mỗi mối quan hệ là một hành trình — cùng xem chặng tiếp theo của hai bạn nè 🌙"],
    outro: [
      "Tình cảm như cây non, không tự lớn nếu không ai tưới — bài chỉ nói hướng, còn vun là việc của hai người 🌱",
      "Điều quan trọng không phải là đi được bao xa, mà là đi cùng nhau có vui không 💞",
    ],
  },
  // 💼 Công việc
  {
    id: "quit",
    re: / (nghi viec|chuyen viec|nhay viec|doi viec|bo viec|nghi lam|doi cong ty|chuyen cong ty) /,
    scene: "work",
    force: true,
    pos: ["Nếu ở lại", "Nếu ra đi", "Lời khuyên"],
    groups: ["result", "result", "action"],
    ask: "có nên nghỉ việc / chuyển việc không",
    next: ["Bói tiếp: công việc mới có phù hợp không", "Bói tiếp: sự nghiệp thời gian tới thay đổi thế nào", "Bói tiếp: tài chính vài tháng tới thế nào"],
    intro: ["Ở hay đi luôn là câu hỏi khó nhất… để Lomi đặt hai con đường lên bàn cho bạn xem 🕯️", "Để Lomi soi thử cả hai cánh cửa — cửa đang mở và cửa sắp mở nha 🚪"],
    outro: [
      "Đừng rời đi chỉ vì mệt một ngày, cũng đừng ở lại chỉ vì sợ thay đổi — chọn vì con người bạn muốn trở thành 🌿",
      "Trước khi quyết, thử viết ra 3 điều bạn cần nhất ở một công việc — câu trả lời thường nằm sẵn trong đó 📝",
    ],
  },
  {
    id: "newjob",
    re: / (cong viec moi|cho lam moi|cong ty moi|viec moi) .*(phu hop|hop|on|tot|the nao) /,
    scene: "work",
    force: true,
    pos: ["Bạn và công việc mới", "Điều cần thích nghi", "Triển vọng"],
    groups: ["state", "block", "result"],
    ask: "công việc mới có phù hợp không",
    intro: ["Công việc mới như đôi giày mới — để Lomi xem có vừa chân bạn không nha 👟", "Để Lomi xem duyên giữa bạn và chỗ làm mới thế nào nè 💼"],
    outro: ["Tháng đầu ở chỗ mới ai cũng lóng ngóng — cho mình ba tháng rồi hẵng đánh giá nha 🌱", "Hợp hay không, bạn sẽ cảm nhận rõ nhất qua việc sáng thứ Hai mình có muốn đi làm không đó 😄"],
  },
  {
    id: "careerfuture",
    re: /^(?=.* (su nghiep|cong viec|viec lam) )(?=.* (thoi gian toi|sap toi|thay doi|nam nay|nam toi|tuong lai|vai thang|thang toi|thang sau|nhu the nao|the nao|ra sao) )/,
    scene: "work",
    force: true,
    pos: ["Hiện tại", "Chuyển động sắp tới", "Kết quả"],
    groups: ["state", "phase", "result"],
    ask: "sự nghiệp sắp tới thay đổi thế nào",
    lean: DIRECTION,
    intro: ["Để Lomi xem bản đồ sự nghiệp của bạn đang vẽ tiếp những đường nào nha 🗺️", "Các lá bài về công việc đã xếp hàng — cùng xem chặng tới nha 💼"],
    outro: ["Sự nghiệp là cuộc chạy đường dài — giữ sức, giữ lửa, và đừng so với ai cả 🏃", "Cơ hội thường đến với người đã chuẩn bị sẵn — học thêm một kỹ năng nhỏ ngay từ tuần này nha 📚"],
  },
  // 💰 Tiền bạc & làm ăn
  {
    id: "invest",
    re: / (dau tu|lam an|hun von|gop von|mo quan|mo tiem|mo shop|startup|khoi nghiep) /,
    scene: "business",
    force: true,
    pos: ["Thời cơ hiện tại", "Rủi ro cần tính", "Kết quả có thể"],
    groups: ["state", "block", "result"],
    ask: "có nên đầu tư / làm ăn không",
    invest: true,
    intro: ["Chuyện tiền nong làm ăn thì Lomi soi kỹ lắm nè 🪙", "Để Lomi gieo quẻ xem thời vận làm ăn của bạn ra sao nha 💰"],
    outro: ["Buôn có bạn, bán có phường — đừng đi một mình, hỏi thêm người có kinh nghiệm nha 🤝", "Tiền vào từ từ mà chắc vẫn hơn vào nhanh ra nhanh — chắc tay trước, lớn sau 🌱"],
  },
  {
    id: "bizgrowth",
    re: / (kinh doanh|cua hang|quan|tiem|shop|doanh nghiep|du an) .*(phat trien|dong khach|on dinh|khoi sac|lam an|thanh cong|co tien) /,
    scene: "business",
    force: true,
    pos: ["Sức khoẻ kinh doanh hiện tại", "Điểm cần cải thiện", "Triển vọng"],
    groups: ["state", "action", "result"],
    ask: "việc kinh doanh có phát triển không",
    lean: DIRECTION,
    intro: ["Để Lomi xem vận làm ăn của chỗ bạn đang lên hay đang lắng nha 📈", "Lomi xáo bài cầu cho chỗ bạn đông khách nè 🧧"],
    outro: ["Khách quen là vốn quý nhất — giữ được một khách quen còn hơn kéo mười khách lạ 💚", "Muốn đông khách thì đăng ưu đãi trên Liên Minh Liên Doanh thử xem, Lomi giúp nghĩ ý tưởng cho nè 😉"],
    next: ["Tư vấn ưu đãi cho chỗ mình", "Bói tiếp: tài chính vài tháng tới thế nào"],
  },
  {
    id: "bigmoney",
    re: / (khoan tien lon|tien lon|trung so|lam giau|phat tai|giau to|hoanh tai|co tien lon) /,
    scene: "money",
    force: true,
    pos: ["Vận tiền hiện tại", "Cơ hội sắp đến", "Điều cần giữ"],
    groups: ["state", "result", "block"],
    ask: "có cơ hội kiếm được khoản tiền lớn không",
    intro: ["Để Lomi lắc thử cây tiền xem có quả nào sắp rụng không nha 🌳💰", "Thần tài có ghé nhà bạn không đây… Lomi xem liền 🧧"],
    outro: ["Tiền lớn thường đến từ nhiều dòng tiền nhỏ được giữ kỹ — giữ được mới là của mình 💰", "Nhớ nha: cơ hội thật hiếm khi hứa lời nhanh — cái gì hứa quá hời thì cẩn thận 🔍"],
  },
  {
    id: "moneyfuture",
    re: /^(?=.* (tai chinh|tien bac|tien nong|thu nhap) )(?=.* (thang toi|vai thang|sap toi|nam nay|thoi gian toi|3 thang) )/,
    scene: "money",
    force: true,
    pos: () => [`Tháng ${monthOf(1)}`, `Tháng ${monthOf(2)}`, `Tháng ${monthOf(3)}`],
    groups: ["phase", "phase", "phase"],
    ask: "tài chính vài tháng tới thế nào",
    lean: DIRECTION,
    intro: ["Để Lomi mở sổ tài chính của vũ trụ ra xem vài tháng tới của bạn nha 📒", "Lomi lật từng tháng một, xem túi tiền của bạn đi lên hay đi xuống nè 💰"],
    outro: ["Tiền không lớn vì kiếm nhiều, mà lớn vì giữ được — trích để dành ngay khi nhận lương nha 🐷", "Tháng nào bài hơi tối thì tháng đó chi tiêu chậm lại chút là được, đừng lo quá 🌿"],
  },
  // 🔮 Tương lai gần
  {
    id: "today",
    re: / (hom nay cua minh|ngay hom nay (se|the nao|ra sao)|hom nay (se|the nao|ra sao)) /,
    scene: "future",
    force: true,
    pos: ["Buổi sáng", "Buổi chiều", "Buổi tối"],
    groups: ["phase", "phase", "phase"],
    ask: "hôm nay của mình thế nào",
    lean: DIRECTION,
    intro: ["Lomi chia ngày của bạn làm ba khúc — sáng, chiều, tối — xem mỗi khúc mang màu gì nha ☀️🌤️🌙", "Ba lá cho ba buổi trong ngày, cùng xem hôm nay bạn gặp gì nha ✨"],
    outro: ["Buổi nào bài hơi tối thì buổi đó làm chậm lại, uống ly nước, hít thở sâu là ổn 🌿", "Chúc bạn một ngày gặp toàn người dễ thương 💚"],
  },
  {
    id: "halfyear",
    generalOnly: true,
    re: / (3 6 thang|3 den 6 thang|3 toi 6 thang|nua nam|6 thang toi|vai thang toi|thoi gian toi) /,
    scene: "future",
    pos: () => [`Tháng ${monthOf(1)}–${monthOf(2)}`, `Tháng ${monthOf(3)}–${monthOf(4)}`, `Tháng ${monthOf(5)}–${monthOf(6)}`],
    groups: ["phase", "phase", "phase"],
    ask: "vài tháng tới cuộc sống thay đổi thế nào",
    lean: DIRECTION,
    intro: ["Để Lomi nhìn xa hơn một chút — nửa năm tới của bạn trông thế nào nha 🔭", "Ba lá, ba chặng đường — cùng xem nửa năm tới của bạn nè 🗺️"],
    outro: ["Nửa năm trôi nhanh lắm — đặt một mục tiêu nhỏ cho mỗi chặng là thấy mình đi xa rồi 🌱", "Tương lai không cố định đâu, bài chỉ vẽ hướng gió — tay lái vẫn là của bạn ⛵"],
  },
  {
    id: "nextmonth",
    generalOnly: true,
    re: / (thang toi|thang sau) /,
    scene: "future",
    pos: () => {
      const m = monthOf(1);
      return [`Đầu tháng ${m}`, `Giữa tháng ${m}`, `Cuối tháng ${m}`];
    },
    groups: ["phase", "phase", "phase"],
    ask: "tháng tới có chuyện gì đáng chú ý",
    lean: DIRECTION,
    intro: ["Lomi lật lịch sang tháng mới, xem các vì sao sắp xếp gì cho bạn nè 🌙", "Tháng mới, trang mới — để Lomi đọc trước vài dòng cho bạn nha 📅"],
    outro: ["Tháng nào cũng có ngày mưa ngày nắng — biết trước để mang dù là được rồi ☂️", "Đánh dấu vài ngày quan trọng trong tháng và chuẩn bị sớm một chút nha 📌"],
  },
  {
    id: "prepare",
    generalOnly: true,
    re: / (chuan bi (cho|gi)|can chuan bi|nen chuan bi) /,
    scene: "future",
    pos: ["Điều sắp đến", "Điều cần chuẩn bị", "Kết quả nếu sẵn sàng"],
    groups: ["phase", "action", "result"],
    ask: "mình cần chuẩn bị cho điều gì",
    answer: "điều bạn cần chuẩn bị nhất là {k2} — sẵn sàng rồi thì kết quả sẽ nghiêng về {k3}.",
    intro: ["Người khôn chuẩn bị trước cơn mưa — để Lomi xem trời sắp đổi gió gì nha 🌬️"],
    outro: ["Chuẩn bị không phải để lo, mà để khi chuyện tới mình mỉm cười được 😊"],
  },
  {
    id: "coming",
    generalOnly: true,
    re: / (dieu gi sap|chuyen gi sap|sap xuat hien|sap den voi minh|dieu gi dang den|co gi moi) /,
    scene: "future",
    pos: ["Điều đang tới gần", "Cơ hội đi kèm", "Điều cần chú ý"],
    groups: ["phase", "result", "block"],
    ask: "điều gì sắp xuất hiện trong cuộc sống",
    answer: "thứ đang tới gần bạn mang dáng dấp của {k1}, đi kèm cơ hội {k2} — chỉ cần để ý {k3}.",
    intro: ["Có gì đó đang gõ cửa nhà bạn… để Lomi hé mắt nhìn trước nha 👀", "Quả cầu pha lê đang hiện lên vài hình ảnh mờ mờ… Lomi đọc cho bạn nè 🔮"],
    outro: ["Điều mới đến thường mang hình dạng lạ — mở lòng một chút là nhận ra nó thôi 🌸"],
  },
  // 🧠 Bản thân
  {
    id: "stuck",
    re: / (mac ket|be tac|dam chan tai cho|luan quan|ket o dau) /,
    scene: "self",
    force: true,
    pos: ["Gốc rễ", "Điều đang giữ chân", "Lối ra"],
    groups: ["state", "block", "action"],
    ask: "mình đang bị mắc kẹt ở đâu",
    answer: "chỗ bạn đang kẹt bắt nguồn từ {k1}, bị giữ chân bởi {k2} — còn lối ra nằm ở {k3}.",
    intro: ["Mắc kẹt giống như lạc trong sương — để Lomi thắp đèn soi đường cho bạn nha 🏮", "Để Lomi gỡ từng nút thắt một nha, từ từ thôi 🧶"],
    outro: ["Đôi khi không phải mình kẹt, mà là mình đang đứng yên chờ đủ can đảm — và bạn có đủ mà 💚"],
  },
  {
    id: "blocker",
    re: / (can tro|ngan can|dieu gi dang can|dang ngan|dieu gi dang giu) /,
    scene: "self",
    force: true,
    pos: ["Điều cản bên ngoài", "Điều cản bên trong", "Cách vượt qua"],
    groups: ["block", "block", "action"],
    ask: "điều gì đang cản trở mình",
    answer: "thứ cản bạn nhiều nhất là {k2} ở bên trong mình; muốn vượt qua, hãy {go3}.",
    intro: ["Để Lomi soi xem hòn đá nào đang chắn đường bạn nha 🪨", "Có khi thứ cản mình lại nằm ngay trong túi mình… Lomi xem thử nè 🔍"],
    outro: ["Nhận ra được vật cản là đã bước qua được nửa đường rồi đó 🌿"],
  },
  {
    id: "focus",
    re: / (tap trung vao|nen tap trung|uu tien gi|nen lam gi|nen uu tien) /,
    scene: "self",
    force: true,
    pos: ["Điều bạn đang dồn sức", "Điều nên buông bớt", "Điều đáng tập trung"],
    groups: ["state", "block", "action"],
    ask: "mình nên tập trung vào điều gì",
    answer: "điều đáng tập trung nhất lúc này là {k3}; còn {k2} thì nên buông bớt.",
    intro: ["Ôm nhiều quá thì tay nào cũng mỏi — để Lomi chỉ ra đâu là thứ đáng giữ nha 🎯"],
    outro: ["Làm ít mà đúng vẫn hơn làm nhiều mà rối — chọn một việc và làm thật tốt nha ✨"],
  },
  {
    id: "lesson",
    re: / (bai hoc) /,
    scene: "self",
    force: true,
    pos: ["Bài học", "Vì sao nó đến", "Cách vượt qua"],
    groups: ["state", "block", "action"],
    ask: "bài học hiện tại của mình là gì",
    answer: "bài học của bạn lúc này là {k1}; nó đến vì {k2}, và cách vượt qua là {go3}.",
    intro: ["Vũ trụ hay gửi bài học trong những hình dạng lạ lắm… để Lomi dịch giùm nha 📜"],
    outro: ["Bài học nào học xong rồi thì sẽ không phải học lại nữa — bạn đang lớn lên đó 🌱"],
  },
  {
    id: "path",
    re: / (huong di|hop voi minh|phu hop voi minh|nen di duong nao|lam nghe gi|dinh huong|con duong nao) /,
    scene: "self",
    force: true,
    pos: ["Điểm mạnh của bạn", "Điều cần tránh", "Hướng nên đi"],
    groups: ["state", "block", "action"],
    ask: "hướng đi nào phù hợp với mình",
    answer: "hướng hợp với bạn gắn với {k3}, dựa trên điểm mạnh là {k1} — chỉ cần tránh {k2}.",
    intro: ["Để Lomi trải tấm bản đồ đời bạn ra, xem mũi tên đang chỉ về đâu nha 🧭", "Mỗi người có một con đường riêng — cùng xem đường của bạn nè 🛤️"],
    outro: ["Đường nào cũng có dốc — chọn con đường mà lúc mệt bạn vẫn muốn đi tiếp nha 🌄"],
  },
  // 👥 Người khác
  {
    id: "theirintent",
    re: / (y dinh|muon gi o minh|co y do|dinh lam gi|co ac y|co y gi|toan tinh) /,
    scene: "others",
    pos: ["Mục đích bề ngoài", "Cảm xúc thật", "Hành động sắp tới"],
    groups: ["state", "state", "result"],
    ask: "người đó có ý định gì",
    answer: "bề ngoài họ thể hiện {k1}, bên trong là {k2}, và sắp tới có thể {res3}.",
    intro: ["Để Lomi nhìn qua lớp vỏ bên ngoài, xem người ấy thật sự nghĩ gì nha 🎭"],
    outro: ["Hãy tin vào hành động nhiều hơn lời nói — thời gian sẽ cho bạn câu trả lời rõ nhất ⏳"],
  },
  {
    id: "relchange",
    re: / (moi quan he|quan he) .*(thay doi|ra sao|the nao|di ve dau) /,
    kinds: ["open", "yesno"],
    scene: "others",
    pos: ["Hiện tại", "Điều sẽ thay đổi", "Kết quả"],
    groups: ["state", "phase", "result"],
    ask: "mối quan hệ này sẽ thay đổi ra sao",
    lean: DIRECTION,
    intro: ["Mối quan hệ nào cũng có mùa — để Lomi xem hai bạn đang ở mùa nào nha 🍂"],
    outro: ["Mối quan hệ tốt không tự nhiên mà có — chỉ cần một bên chủ động là mọi thứ khác liền 🌿"],
  },
  // 🎯 Hai lựa chọn — chỉ đổi lời mở/kết
  {
    id: "choice",
    re: / /,
    kinds: ["choice"],
    next: ["Bói tiếp: mình nên tập trung vào điều gì", "Bói tiếp: điều gì đang cản trở mình", "Bói một lá cho hôm nay"],
    intro: [
      "Đứng giữa hai ngả đường thì ai cũng phân vân — để Lomi đặt hai lá lên cân nha ⚖️",
      "Hai con đường, hai lá bài — cùng xem bên nào đang vẫy tay với bạn nè 🛤️",
    ],
    outro: [
      "Có khi bài không chọn giùm, mà chỉ giúp bạn nghe rõ tiếng lòng mình hơn thôi 🕯️",
      "Tung đồng xu cũng được — lúc đồng xu đang bay, bạn sẽ biết mình mong mặt nào 😉",
    ],
  },
];
/** Bối cảnh của lượt bói: ý câu hỏi có bối cảnh riêng thì ưu tiên khi câu chưa rõ bối cảnh (hoặc luôn, nếu force). */
function sceneOfReading(r: TarotReading): Scene {
  const base = sceneOf(r.question ?? "", r.topic, r.context);
  const it = intentById(r.intent);
  if (it?.scene && (it.force || base === "general" || (base === "love" && it.scene === "crush"))) return it.scene;
  return base;
}
function detectIntent(q: string, kind: TarotKind): Intent | undefined {
  const f = ` ${fold(q).replace(/[?!.,…"“”–-]/g, " ").replace(/\s+/g, " ")} `;
  const general = detectTopic(fold(q)) === "general";
  return INTENTS.find((it) => (it.kinds ? it.kinds.includes(kind) : kind !== "choice") && (!it.generalOnly || general) && it.re.test(f));
}
const intentById = (id?: string) => (id ? INTENTS.find((x) => x.id === id) : undefined);
const MYSTIC_OPEN = [
  "Lomi thắp nến, xáo bài ba lần… các lá bài đã chọn bạn rồi đó 🕯️",
  "Quả cầu pha lê của Lomi vừa sáng lên một chút ✨",
  "Gió lùa qua bộ bài, vài lá tự trượt ra — mình cùng xem nha 🌙",
  "Hít một hơi thật sâu, nghĩ thật rõ về câu hỏi… bài đã lật 🔮",
];
const MYSTIC_CLOSE: Record<Domain, string[]> = {
  career: ["Bài chỉ gợi đường, còn bước chân là của bạn — cứ vững vàng mà đi nha 💼", "Công sức không bao giờ mất đi đâu cả, nó chỉ đang chờ đúng lúc để nở hoa 🌱"],
  love: ["Trái tim biết đường của nó — bài chỉ cầm đèn soi giùm thôi 💞", "Thương mình trước, rồi người đúng sẽ thương bạn đúng cách 🌙"],
  general: ["Lá bài đã nói xong phần của nó, phần còn lại là của bạn đó ✨", "Mong những lá bài hôm nay giúp lòng bạn nhẹ đi một chút 🌿"],
};

export function tarotFollowUps(r: TarotReading): string[] {
  if (!r.question || r.cards.length < 2) return [];
  const it = intentById(r.intent);
  return it?.next ?? SCENE_NEXT[sceneOfReading(r)];
}
// ── Câu dẫn xoay vòng (30/09 r8, theo ý Kir): mở đầu, danh sách lá, "quá trình", kết luận đều có nhiều
// cách nói; nhớ câu vừa dùng (trên máy) để 2 lần bói liền nhau không bị trùng.
function rotate(key: string, n: number): number {
  const k = `lmld:tarot-rot:${key}`;
  let last = -1;
  try {
    last = Number(localStorage.getItem(k) ?? -1);
  } catch {
    /* không có localStorage (test) */
  }
  let i = randInt(n);
  if (n > 1 && i === last) i = (i + 1 + randInt(n - 1)) % n;
  try {
    localStorage.setItem(k, String(i));
  } catch {
    /* bỏ qua */
  }
  return i;
}
const vary = (key: string, arr: string[]) => arr[rotate(key, arr.length)];
const OPEN_BY_DOMAIN: Record<Domain, string[]> = {
  career: [
    "Chuyện công việc thì Lomi trải bài kỹ cho bạn nha 💼",
    "Để Lomi xem con đường sự nghiệp sắp tới của bạn nè 💼",
    "Hít một hơi thật sâu… bài về công việc của bạn đã sẵn sàng ✨",
    "Okie, Lomi xáo bài xem chuyện làm ăn, công việc liền 🔮",
  ],
  love: [
    "Chuyện trái tim thì Lomi xáo bài thật chậm nè 💞",
    "Để Lomi xem các lá bài nói gì về chuyện tình cảm của bạn nha 💞",
    "Hít một hơi thật sâu, nghĩ về điều bạn đang mong… bài đã sẵn sàng ✨",
    "Okie, chuyện tình cảm là Lomi xem kỹ lắm nè 🔮",
  ],
  general: [
    "Được nè 😌 Lomi xáo bài liền.",
    "Hít một hơi thật sâu… bài đã sẵn sàng ✨",
    "Okie, để Lomi xem các lá bài muốn nói gì với bạn nha 🔮",
    "Lomi trải bài cho bạn đây ✨",
  ],
};
const DISCLAIMER = [
  "Mình đọc theo hướng định hướng – tâm lý, xem để tham khảo chứ không phải lời tiên tri chắc chắn nha.",
  "Tarot giống một tấm gương để mình nhìn lại bản thân — nghe để tham khảo, quyết định vẫn là của bạn nha.",
  "Bài không quyết định thay bạn được, nhưng có thể giúp bạn nhìn mọi chuyện rõ hơn một chút.",
  "Xem như một góc nhìn thêm để tham khảo thôi nha, đừng coi là chắc chắn 100% 😉",
];
const LIST_LEAD = ["Lomi rút được {n} lá:", "{N} lá bài của bạn đây:", "Bài ra như sau:", "Đây là {n} lá vừa lật:"];
const JOURNEY = [
  "Điều thú vị là bộ {names} giống một quá trình:\n{stages}.",
  "Nhìn cả {n} lá cạnh nhau, câu chuyện hiện ra khá rõ:\n{stages}.",
  "Ghép {names} lại, Lomi thấy một mạch khá liền:\n{stages}.",
  "Nếu đọc cả trải bài như một hành trình thì sẽ là:\n{stages}.",
  "Cả {n} lá đang kể một câu chuyện nhỏ:\n{stages}.",
];
const ANSWER_LEAD = ["Nên nếu hỏi riêng “{q}?” thì bài trả lời:", "Quay lại câu hỏi “{q}?” —", "Trả lời thẳng câu “{q}?”:", "Gom cả trải bài lại, với câu “{q}?” thì"];
const VERDICT = [
  "Nên nếu hỏi riêng “{q}?” thì trải bài này {lean}.",
  "Quay lại câu hỏi “{q}?” — nhìn chung trải bài {lean}.",
  "Trả lời thẳng câu “{q}?”: trải bài {lean}.",
  "Tóm lại, với câu “{q}?” thì bài {lean}.",
];

/** Lời giải tiếng Việt theo mẫu Kir thích: liệt kê lá → giải từng lá theo chủ đề → quá trình của cả trải bài
 *  → khung thời gian cụ thể (nếu hỏi "bao giờ") → kết luận thẳng câu hỏi → gợi ý bói tiếp. */
function readingNarrativeVi(r: TarotReading): string {
  const kind = r.kind ?? "open";
  const q = r.question ?? "";
  const it = intentById(r.intent);
  const scene = sceneOfReading(r);
  const bank = SCENE[scene];
  const dom = DOMAIN_OF[scene];
  const sub = subjectOf(q, r.topic);
  const S =
    bank.noun && (sub === TOPIC_NOUN[r.topic] || ["jobseek", "health", "future", "self", "others"].includes(scene)) ? bank.noun : sub;
  const special = r.spread === "five" || r.spread === "celtic" || r.spread === "ppf" ? r.spread : null;
  const groups: Group[] = special
    ? SPREAD_GROUPS[special].map((g, i, a) => (kind === "timing" && i === a.length - 1 ? "time" : g))
    : kind !== "choice" && it?.groups
      ? it.groups
      : kind === "choice"
        ? ["result", "result"]
        : ROLES[kind as Exclude<TarotKind, "choice">].map((x) => ROLE_GROUP[x]);
  const pos = r.pos ?? [];
  const roles: Role[] = kind === "choice" ? ["option", "option"] : ROLES[kind as Exclude<TarotKind, "choice">];
  const rough = (d: TarotDraw) => (d.rev ? hard(d) : hard(d) || cardScore(d) < 0);
  const cardName = (d: TarotDraw) => {
    const c = tarotCard(d.id);
    return `${c.name.vi} (${c.name.en})${d.rev ? " · ngược" : ""}`;
  };
  const posName = (i: number) => (kind === "choice" ? `Nếu chọn “${pos[i]?.vi ?? ""}”` : (pos[i]?.vi ?? ""));
  const out: string[] = [];

  // 1) Mở đầu + câu hỏi + danh sách lá
  const qShow = capFirst(q.replace(/\s+/g, " ").replace(/[.!…]+$/, ""));
  out.push(
    `${it ? vary(`intro-${it.id}`, it.intro) : vary(`open-${dom}`, [...OPEN_BY_DOMAIN[dom], ...MYSTIC_OPEN])} ${vary("disc", DISCLAIMER)}\nCâu hỏi: “${qShow}${/[?]$/.test(qShow) ? "" : "?"}”`,
  );
  const nWord = ["", "Một", "Hai", "Ba"][r.cards.length] ?? String(r.cards.length);
  const lead = vary("list", LIST_LEAD).replace("{n}", String(r.cards.length)).replace("{N}", nWord);
  out.push(`${lead}\n${r.cards.map((d, i) => `${i + 1}. ${posName(i)} — ${cardName(d)}`).join("\n")}`);

  const usedTails = new Set<string>();
  // 2) Từng lá: nghĩa lá → nghĩa theo lĩnh vực → áp vào hoàn cảnh người hỏi
  r.cards.forEach((d, i) => {
    const c = tarotCard(d.id);
    const meaning = d.rev ? c.rev.vi : c.up.vi;
    const g = groups[i] ?? "state";
    const tpl = kind === "choice" ? [CHOICE_TPL[0][i % 2], CHOICE_TPL[1][i % 2]] : g === "time" ? TIME_TPL : g === "phase" ? PHASE_TPL : bank[g];
    const apply = fillT(tpl[rough(d) ? 1 : 0], kw(d, false), S);
    const lines = [`**🃏 ${i + 1}. ${cardName(d)} — ${posName(i)}**`, meaning];
    const dt = domainText(d, dom);
    if (dt) {
      lines.push(dt);
      // Đã có nghĩa theo lĩnh vực → chỉ thêm phần góc nhìn tâm lý / việc cụ thể (câu sau của mẫu), tránh lặp ý.
      const tail = apply.split(/(?<=[.!?])\s+/).slice(1).join(" ");
      if (kind === "choice") lines.push(`${posName(i)}, ${apply}`);
      else if (g === "phase") lines.push(apply);
      else if (tail && (g === "state" || g === "action") && !usedTails.has(tail)) {
        usedTails.add(tail); // trải nhiều lá: không lặp lại cùng một câu nhận xét
        lines.push(tail);
      }
    } else lines.push(kind === "choice" ? `${posName(i)}, ${apply}` : apply);
    if (g === "time") {
      const w = timingWindow(d);
      const cal = calendarRange(w);
      lines.push(
        `Nếu quy về thời gian theo trải bài này, Lomi đọc là: khoảng ${w.lo}–${w.hi} ${w.unit} tới${w.note ? ` (${w.note})` : ""}.\nTức nếu tính từ ${cal.from}, khung Lomi đọc được là ${cal.range}.`,
      );
    }
    out.push(lines.join("\n"));
  });

  // 3) 🔗 Mối liên hệ giữa các lá — đọc cả trải bài như một câu chuyện
  const firstS = cardScore(r.cards[0]);
  const lastS = cardScore(r.cards[r.cards.length - 1]);
  const arcUp = lastS > firstS;
  const arcDown = lastS < firstS;
  if (r.cards.length >= 3) {
    const arc = arcUp
      ? vary("arc-up", [" Một mạch đi lên — tín hiệu khá dễ thương đó.", " Càng về sau càng sáng, đáng mừng nha.", " Khởi đầu hơi chật vật nhưng kết lại khá ổn."])
      : arcDown
        ? vary("arc-down", [" Đoạn cuối cần bạn để tâm nhiều hơn một chút.", " Khởi đầu thuận nhưng về sau cần cẩn thận hơn nha."])
        : "";
    // Trải 10 lá: kể theo trục chính (Hiện tại → Thử thách → Tương lai gần → Kết quả) cho gọn, dễ theo.
    const keyCards = r.spread === "celtic" ? [0, 1, 5, 9].map((i) => r.cards[i]) : r.cards;
    const story =
      vary("journey", JOURNEY)
        .replace("{names}", keyCards.map((d) => tarotCard(d.id).name.vi).join(" → "))
        .replace("{n}", String(r.cards.length))
        .replace("{stages}", keyCards.map((d) => kw(d, false)).join(" → ")) + arc;
    out.push(`**🔗 Mối liên hệ giữa các lá**\n${story}`);
  }

  // 4) 🔮 Tổng quan — nhận định cả trải bài + trả lời thẳng câu hỏi
  const total = toneTotal(r.cards);
  const should = /(?<![a-z])(nen|should)(?![a-z])/.test(fold(q));
  const overview: string[] = [];
  if (r.cards.length >= 3) {
    const n = r.cards.length;
    if (arcUp) overview.push(`Trải bài đi từ ${kw(r.cards[0], false)} tới ${kw(r.cards[n - 1], false)} — thiên về một quá trình phát triển dần hơn là thay đổi đột ngột.`);
    else if (arcDown) overview.push(`Trải bài mở đầu khá thuận nhưng càng về sau càng cần chú ý, nhất là ${kw(r.cards[n - 1], false)}.`);
    else overview.push("Năng lượng cả trải bài khá đều, không có bước ngoặt quá lớn — mọi thứ sẽ đi theo nhịp bạn giữ.");
    const majors = r.cards.filter((d) => tarotCard(d.id).suit === "major").length;
    if (majors * 2 >= n) overview.push("Nhiều lá Ẩn Chính xuất hiện — đây là giai đoạn có ý nghĩa lớn, không chỉ là chuyện nhất thời.");
    const cnt: Partial<Record<TarotSuit, number>> = {};
    r.cards.forEach((d) => {
      const su = tarotCard(d.id).suit;
      if (su !== "major") cnt[su] = (cnt[su] ?? 0) + 1;
    });
    const top = (Object.entries(cnt) as [TarotSuit, number][]).sort((a, b) => b[1] - a[1]);
    if (top[0] && top[0][1] >= 2 && (!top[1] || top[0][1] > top[1][1]))
      overview.push(
        {
          wands: "Bộ Gậy chiếm ưu thế: năng lượng hành động và sự chủ động đang dẫn dắt câu chuyện.",
          cups: "Bộ Cốc chiếm ưu thế: cảm xúc và các mối quan hệ là trọng tâm lúc này.",
          swords: "Bộ Kiếm chiếm ưu thế: suy nghĩ, quyết định và áp lực tinh thần đang chi phối nhiều.",
          pentacles: "Bộ Tiền chiếm ưu thế: chuyện thực tế như tiền bạc, công việc, sự ổn định là trọng tâm.",
          major: "",
        }[top[0][0]],
      );
    if (r.cards.filter((d) => d.rev).length * 2 > n) overview.push("Khá nhiều lá ngược — năng lượng đang bị chặn hoặc hướng vào bên trong, cần thời gian gỡ dần.");
  }
  let verdictLine: string;
  if (kind === "choice" && r.cards.length === 2) {
    const [a, b] = [cardScore(r.cards[0]), cardScore(r.cards[1])];
    const [na, nb] = pos.map((p) => p.vi);
    verdictLine =
      a === b
        ? "Nếu hỏi “chọn bên nào?” thì hai lựa chọn khá ngang nhau — chọn bên khiến lòng bạn thấy nhẹ nhõm nhất nha."
        : `Nếu hỏi “chọn bên nào?” thì trải bài nghiêng về “${a > b ? na : nb}”, vì bên đó mang năng lượng của ${kw(a > b ? r.cards[0] : r.cards[1], false)}. Nhưng quyết định cuối cùng vẫn là ở bạn nha 😄`;
  } else {
    const askQ = it?.ask ?? (should ? "có nên hay không" : SCENE_ASK[scene]);
    // Hỏi "bao giờ" → trả lời theo tốc độ (sớm / đúng khung / chậm hơn), không phán "không có".
    const lean =
      kind === "timing" && scene !== "health"
        ? total >= 1
          ? "nghiêng về CÓ — và có thể còn sớm hơn khung trên nếu bạn chủ động"
          : total === 0
            ? "nghiêng về CÓ, khoảng đúng khung thời gian ở trên nếu bạn giữ nhịp"
            : "vẫn là CÓ, chỉ là có thể chậm hơn khung trên một chút — đừng nản nha"
        : scene === "health"
          ? total >= 1
            ? "khá tích cực — tinh thần tốt sẽ giúp mau khoẻ"
            : total === 0
              ? "cho thấy cơ thể cần thêm thời gian"
              : "nhắc bạn kiên nhẫn và đừng chủ quan"
          : should
            ? total >= 3
              ? "nghiêng khá rõ về NÊN"
              : total >= 1
                ? "nghiêng về NÊN, miễn là bạn giữ chừng mực"
                : total === 0
                  ? "còn lưng chừng — tuỳ vào cảm nhận của bạn"
                  : "nghiêng về CHƯA NÊN lúc này"
            : total >= 3
              ? "nghiêng khá rõ về CÓ"
              : total >= 1
                ? "nghiêng về CÓ nếu bạn chủ động thêm một chút"
                : total === 0
                  ? "còn để ngỏ — phụ thuộc nhiều vào bước tiếp theo của bạn"
                  : "nghiêng về chưa phải lúc — nhưng đừng nản nha";
    const tail = kind === "timing" ? "Tarot không thể xác nhận một ngày cụ thể đâu 😄" : "Quyết định cuối cùng vẫn là ở bạn 😄";
    const [c1, c2, c3] = r.cards;
    const answerText =
      it?.answer && c3 && !special
        ? it.answer
            .replace("{k1}", kw(c1, false))
            .replace("{k2}", kw(c2, false))
            .replace("{k3}", kw(c3, false))
            .replace("{go3}", rough(c3) ? `gỡ bỏ ${kw(c3, false)}` : `dựa vào ${kw(c3, false)}`)
            .replace("{res3}", rough(c3) ? `còn vướng ${kw(c3, false)}` : `nghiêng về ${kw(c3, false)}`)
        : null;
    const leanUse = kind !== "timing" && it?.lean ? it.lean[total >= 1 && !arcDown ? 0 : total >= 0 ? 1 : 2] : lean; // bài đi xuống ở cuối → không kết "khá sáng" cho khỏi vênh với phần mối liên hệ
    verdictLine = answerText
      ? `${vary("answer", ANSWER_LEAD).replace("{q}", askQ)} ${answerText}`
      : `${vary("verdict", VERDICT).replace("{q}", askQ).replace("{lean}", leanUse)} ${tail}`;
  }
  out.push(`**🔮 Tổng quan**\n${[...overview, verdictLine].join(" ")}`);

  // 5) ⚠️ Điều cần lưu ý — lá “yếu” nhất trong trải bài (tránh kiểu phán chắc tương lai)
  const weakest = r.cards.map((d, i) => ({ d, i, sc: cardScore(d) })).sort((a, b) => a.sc - b.sc)[0];
  const cautionText =
    weakest && rough(weakest.d)
      ? `${vary("caution", [
          "Đừng để {k} kéo bạn lại — đây là điểm cần giữ nhất trong trải bài (lá {n} ở vị trí “{p}”).",
          "Lá {n} ở vị trí “{p}” nhắc bạn cẩn thận với {k}. Nhận ra sớm thì xử lý nhẹ nhàng hơn nhiều.",
        ])
          .replace("{k}", kw(weakest.d, false))
          .replace("{n}", tarotCard(weakest.d.id).name.vi)
          .replace("{p}", posName(weakest.i).replace(/^Nếu chọn “|”$/g, ""))}`
      : kind === "timing"
        ? "Đừng quá nóng vội tìm kết quả ngay lập tức — trải bài nhấn mạnh việc chuẩn bị nền tảng trước khi mong thành quả."
        : "Bài khá thuận, nhưng đừng vì thế mà chủ quan — kết quả tốt vẫn cần bạn giữ nhịp đều đặn.";
  out.push(`**⚠️ Điều cần lưu ý**\n${cautionText}`);

  // 6) 💡 Lời khuyên — việc cụ thể theo bối cảnh + lời khuyên của lá cuối
  const lastCard = r.cards[r.cards.length - 1];
  const adv = ADVICE[tarotCard(lastCard.id).suit][rough(lastCard) ? 1 : 0];
  out.push(`**💡 Lời khuyên**\n${bank.tip[total >= 1 ? 0 : 1]} ${adv}`);

  if (r.topic === "health")
    out.push("💚 Lá bài chỉ để mình thêm tinh thần thôi nha — chuyện thuốc men, khỏi hay chưa thì bác sĩ mới là người trả lời chính xác nhất.");
  if (/(?<![a-z])(nhau|ruou|bia|say)(?![a-z])/.test(fold(q))) out.push("🍻 Bài nói gì thì nói, đi nhậu nhớ uống vừa phải và đã uống thì đừng lái xe nha!");
  if (it?.invest)
    out.push("💡 Lá bài chỉ để tham khảo tinh thần thôi nha — quyết định bỏ vốn nên dựa trên số liệu thật, tìm hiểu kỹ và hỏi thêm người có kinh nghiệm.");

  // 7) ✨ Thông điệp — một câu “chữ ký” theo đúng ý câu hỏi
  out.push(`**✨ Thông điệp**\n“${(it ? vary(`outro-${it.id}`, it.outro) : vary(`close-${dom}`, MYSTIC_CLOSE[dom])).trim()}”`);

  // 5) Gợi ý bói tiếp
  const nx = (it?.next ?? SCENE_NEXT[scene]).filter((x) => x.startsWith("Bói tiếp")).map((x) => `“${x.replace("Bói tiếp: ", "")}”`);
  out.push(
    nx.length
      ? `Nếu muốn, Lomi có thể bói tiếp 3 lá riêng về ${nx.slice(0, 3).join(" / ")} — bấm bên dưới nha. Hoặc gõ “rút thêm” để rút thêm 1 lá làm rõ 🔮`
      : "Muốn rõ hơn thì gõ “rút thêm” để Lomi rút thêm 1 lá nha 🔮",
  );
  return out.join("\n\n");
}

// ── 💭 Đọc tâm lý người hỏi: câu hỏi nói lên điều gì về cảm xúc của họ ──
// Dựa trên CÂU HỎI (không dựa vào lá rút ngẫu nhiên) nên hỏi lại / bói lại vẫn nhất quán, và luôn đúng trọng tâm.
function hashStr(x: string): number {
  let h = 7;
  for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0;
  return h;
}
function insightText(q: string, topic: TarotTopic, kind: TarotKind, context?: string): string {
  const f = ` ${fold(context ?? q)} `;
  const scene = sceneOf(q, topic, context);
  const has = (re: RegExp) => re.test(f);
  const h = hashStr(fold(q));
  const one = (arr: string[]) => arr[h % arr.length];
  let base: string;
  if (topic === "health" && has(/ (tao lao|qua loa|khong tin|khong yen tam|do te|te qua|kham dom|kham au|nghi ngo|so sai) /))
    base = one([
      "Lomi hiểu nè — đi khám mà thấy bác sĩ làm qua loa thì ai cũng bất an, uống thuốc cũng không yên lòng. Cảm giác nghi ngờ đó là bình thường, vì bạn đang lo cho sức khoẻ của mình. Nếu vẫn không yên tâm, bạn hoàn toàn có thể đi khám thêm ở một nơi khác để có ý kiến thứ hai.",
      "Nghe là thấy bạn đang vừa mệt vừa bực rồi 🥺 Khi không tin người khám cho mình, mình sẽ cứ lấn cấn mãi. Bài chỉ giúp bạn nhẹ lòng thôi — muốn chắc ăn thì khám lại ở chỗ khác cũng là quyền của bạn nha.",
    ]);
  else if (topic === "health")
    base = one([
      "Lomi đoán bạn (hoặc người thân) đang mệt và mong mau khoẻ lắm. Lúc ốm, mình hay sốt ruột muốn biết “bao giờ mới hết” — cảm giác đó rất bình thường.",
      "Câu hỏi này cho thấy bạn đang lo cho sức khoẻ và muốn được yên tâm. Khi cơ thể chưa khoẻ, tâm trạng cũng dễ chùng xuống theo.",
    ]);
  else if (scene === "newlove")
    base = one([
      "Thất tình là một nỗi đau thật sự — có nghiên cứu còn cho thấy não xử lý nỗi đau chia tay khá giống đau thể chất. Việc bạn đã nghĩ tới chuyện có người mới cho thấy bạn đang dần muốn bước tiếp, và đó là tín hiệu tốt.",
      "Lomi đoán bạn đang vừa buồn vừa mong có ai đó ở bên. Muốn được yêu thương là nhu cầu rất bình thường — chỉ cần mình đừng vội vì cô đơn mà chọn sai người.",
    ]);
  else if (topic === "love" && has(/ (nguoi cu|ex|quay lai|tai hop|chia tay) /))
    base = one([
      "Có vẻ bạn vẫn còn vương vấn chuyện cũ. Nhớ một người không có nghĩa là mình yếu đuối — chỉ là trái tim cần thêm thời gian.",
      "Lomi cảm nhận bạn đang lưng chừng giữa buông và giữ. Câu hỏi này giống như bạn muốn biết mình còn nên hy vọng không.",
    ]);
  else if (topic === "love" && has(/ (nhan tin|to tinh|ruru|ru di|hen|lam quen|bat chuyen) /))
    base = one([
      "Bạn đang muốn tiến thêm một bước nhưng còn sợ bị từ chối — nên mới muốn chắc chắn trước khi làm. Ai cũng vậy hết á.",
      "Lomi đoán bạn đã nghĩ tới chuyện này nhiều lần rồi. Phân vân lâu thường là vì mình thật sự để tâm tới người ta.",
    ]);
  else if (topic === "love")
    base = one([
      "Có một người đang chiếm khá nhiều suy nghĩ của bạn dạo này. Bạn muốn biết mối quan hệ đang đi về đâu để yên lòng hơn.",
      "Câu hỏi này cho thấy bạn đang cần cảm giác an toàn trong tình cảm — muốn biết mình có đang được trân trọng không.",
    ]);
  else if (scene === "jobseek")
    base = one([
      "Thất nghiệp là một trong những giai đoạn áp lực nhất — không chỉ chuyện tiền mà còn là cảm giác chững lại, mất phương hướng so với người khác. Nếu bạn đang thấy vậy thì hoàn toàn bình thường nha. Câu hỏi “bao giờ” cho thấy bạn đang rất mong một điểm sáng để bám vào.",
      "Lomi hiểu cảm giác mỗi ngày mở điện thoại chờ tin phản hồi mà chưa thấy gì. Giai đoạn không có việc dễ làm mình tự ti, dù thật ra đó chỉ là một khúc quanh chứ không nói lên giá trị của bạn.",
    ]);
  else if (topic === "work")
    base = one([
      "Lomi đoán công việc đang tạo cho bạn chút áp lực, và bạn muốn biết nỗ lực của mình có được đền đáp không.",
      "Có vẻ bạn đang đứng trước một thay đổi trong công việc — vừa muốn tiến lên, vừa ngại rủi ro. Cân nhắc kỹ là điều tốt.",
    ]);
  else if (topic === "money")
    base = one([
      "Chuyện tiền bạc đang làm bạn bận lòng một chút. Hỏi vậy là bạn muốn có cảm giác ổn định, an tâm hơn về tương lai.",
      "Lomi đoán bạn đang tính toán cho một kế hoạch nào đó và muốn chắc là mình đi đúng hướng.",
    ]);
  else if (topic === "travel")
    base = one([
      "Bạn đang háo hức xen lẫn hồi hộp — chuẩn bị bao nhiêu thứ rồi nên rất mong mọi chuyện suôn sẻ.",
      "Chờ kết quả giấy tờ là giai đoạn dễ sốt ruột nhất. Lomi hiểu cảm giác mỗi ngày mở điện thoại xem có tin gì chưa đó.",
    ]);
  else if (topic === "study")
    base = one([
      "Lomi đoán bạn đang chịu chút áp lực học hành, muốn biết công sức mình bỏ ra có xứng đáng không.",
      "Câu hỏi này cho thấy bạn rất có trách nhiệm với việc học — chỉ là đang hơi lo về kết quả thôi.",
    ]);
  else if (has(/ (nhau|ruou|bia|di choi|quay|tiec) /))
    base = one([
      "Nghe là biết bạn đang cần xả hơi một chút sau mấy ngày bận rộn rồi 😄 Muốn vui mà vẫn hơi lăn tăn nên mới hỏi bài nè.",
      "Lomi đoán trong lòng bạn đã muốn đi lắm rồi, chỉ cần thêm một cái gật đầu thôi 😄",
    ]);
  else
    base = one([
      "Lomi cảm nhận chuyện này đang nằm trong đầu bạn khá lâu rồi. Khi mình hỏi bài, thường là vì muốn có thêm chút chắc chắn.",
      "Câu hỏi này cho thấy bạn đang cần một góc nhìn khác để quyết định cho nhẹ lòng.",
    ]);
  let tail = "";
  if (kind === "timing") tail = " Chờ đợi mà chưa biết khi nào thì dễ sốt ruột lắm, nên mình xem bài để lòng nhẹ hơn nha.";
  else if (kind === "choice") tail = " Đứng giữa hai ngả thì sợ chọn sai là chuyện thường — thật ra lựa chọn nào cũng dạy mình điều gì đó.";
  else if (kind === "yesno" && has(/ (nen|co nen) /)) tail = " Thường thì khi hỏi “có nên không”, trong lòng mình đã nghiêng về một phía rồi đó.";
  if (has(/ (lo|so|buon|met|chan|stress|ap luc|hoang) /)) tail += " Lomi thấy bạn đang hơi lo — hít sâu một hơi trước đã nha 💚";
  return base + tail;
}

// Câu dẫn theo VỊ TRÍ + sắc thái lá (khi đã có chủ đề cụ thể, không ghép từ khoá của lá để tránh lạc đề
// kiểu "chuyện sức khoẻ đang vướng chi tiêu quá tay").
const ROLE_LEAD: Record<Role, [string, string]> = {
  now: ["Hiện tại khá thuận:", "Hiện tại còn chút vướng:"],
  todo: ["Điều giúp mọi thứ suôn sẻ:", "Điều cần điều chỉnh:"],
  timing: ["Về thời điểm:", "Về thời điểm, có thể cần kiên nhẫn thêm:"],
  obstacle: ["Điều cần lưu tâm:", "Điều có thể cản trở:"],
  outcome: ["Kết quả khả quan:", "Kết quả còn chút trắc trở:"],
  situation: ["Tình hình đang khá ổn:", "Tình hình đang hơi rối:"],
  challenge: ["Thử thách nhẹ thôi:", "Thử thách lớn nhất:"],
  advice: ["Lời khuyên:", "Lời khuyên:"],
  message: ["Thông điệp:", "Thông điệp:"],
  option: ["Nếu chọn “{O}” — khá ổn:", "Nếu chọn “{O}” — cần cân nhắc:"],
  clarify: ["Lá làm rõ:", "Lá làm rõ:"],
};
// Câu hỏi chung (không rõ chủ đề) — câu theo chất bài, không dùng từ khoá chuyên biệt của lá (tiền, tình…).
const GENERAL_LINE: Record<TarotSuit, [string, string, string, string]> = {
  major: ["Đây là chuyện khá quan trọng với bạn — một bước chuyển đang tới.", "Có một bài học lớn trong chuyện này, đừng vội kết luận.", "", ""],
  wands: ["Năng lượng chủ động đang cao — dám làm là có kết quả.", "Dễ hăng lúc đầu rồi nản — giữ nhịp đều đều nha.", "", ""],
  cups: ["Cảm xúc đang tích cực, làm theo trái tim là ổn.", "Cảm xúc hơi rối, lắng lòng lại một chút trước đã.", "", ""],
  swords: ["Suy nghĩ rõ ràng, quyết dứt khoát sẽ giúp bạn.", "Nghĩ nhiều dễ rối — bớt lo xa, tập trung việc trước mắt.", "", ""],
  pentacles: ["Chắc chắn, thực tế và từ từ là thắng.", "Tính toán thực tế hơn, đừng để chuyện nhỏ thành lớn.", "", ""],
};
// Câu chốt theo chủ đề — [bài thuận, bài nhiều thử thách].
const CLOSING: Record<TarotTopic, [string, string]> = {
  general: ["Cứ bình tĩnh làm theo cảm nhận của mình, mọi chuyện sẽ ổn thôi.", "Chậm lại một nhịp, suy nghĩ kỹ rồi hãy quyết nha."],
  love: ["Cứ chân thành và để mọi thứ tự nhiên, tình cảm sẽ đến đúng lúc.", "Đừng vội, cho nhau thêm thời gian và nói chuyện thật lòng nha."],
  work: ["Cứ tự tin làm tốt phần mình, cơ hội đang mở ra đó.", "Giữ bình tĩnh, làm chắc từng việc nhỏ, giai đoạn khó rồi sẽ qua."],
  money: ["Tình hình khá ổn, cứ chi tiêu có kế hoạch là yên tâm.", "Siết lại chi tiêu, tránh quyết định vội là sẽ ổn dần."],
  travel: ["Chuẩn bị hồ sơ chỉn chu rồi thả lỏng chờ tin vui nha.", "Rà lại giấy tờ thật kỹ, kiên nhẫn thêm chút là được."],
  study: ["Cứ đều đặn như vậy, kết quả sẽ xứng đáng với công sức.", "Chia nhỏ mục tiêu, nghỉ ngơi đủ rồi học tiếp, đừng tự ép mình quá."],
  health: ["Giữ tinh thần lạc quan và làm đúng lời bác sĩ dặn, mọi thứ sẽ ổn dần nha.", "Nghỉ ngơi nhiều hơn, làm đúng lời bác sĩ, và đừng ngại đi khám lại nếu chưa đỡ nha."],
};

// Nhìn chung cả trải bài sáng hay tối — để phần Tóm lại có một câu kết luận rõ ràng.
// Cùng một thước đo với phần "Trả lời nhanh" để kết luận trước sau như một.
function toneTotal(cards: TarotDraw[]): number {
  return cards.reduce((acc, d, i) => acc + cardScore(d) * (i === cards.length - 1 ? 2 : 1), 0);
}
function trendLine(cards: TarotDraw[]): string {
  const t = toneTotal(cards);
  if (t >= 3) return "Nhìn chung cả trải bài khá sáng sủa.";
  if (t >= 1) return "Nhìn chung bài nghiêng về phía thuận, chỉ cần để ý một chút.";
  if (t === 0) return "Bài có sáng có tối — kết quả phụ thuộc nhiều vào cách bạn xử lý.";
  return "Bài đang nhắc bạn chậm lại và kiên nhẫn thêm một chút.";
}

// ── Ghép lời giải: từng lá gắn với chủ đề + phần “Tóm lại” nối các lá thành một câu chuyện ──
export function readingText(r: TarotReading, lang: L): string {
  const en = lang === "en";
  // Tiếng Việt, có câu hỏi, trải 2–3 lá → lời giải kiểu kể chuyện (nghĩa lá → áp vào câu hỏi → tóm lại).
  if (!en && r.question && r.cards.length >= 2) return readingNarrativeVi(r);
  // Lá bài hôm nay (1 lá, không câu hỏi) → bản giải CHI TIẾT theo từng mặt, khác với popup (chỉ có nghĩa ngắn).
  if (!en && !r.question && r.cards.length === 1) return dailyDetailVi(r.cards[0]);
  const kind = r.kind ?? "open";
  const q = r.question ?? "";
  const clar = r.cards.length === 1 && !!q;
  const pos = r.pos ?? TAROT_SPREADS.find((s) => s.id === r.spread)?.pos ?? [];
  const nums = ["①", "②", "③"];
  const S = en ? "this" : q ? subjectOf(q, r.topic) : TOPIC_NOUN[r.topic];
  const roles: Role[] = clar ? ["clarify"] : kind === "choice" ? ["option", "option"] : ROLES[kind as Exclude<TarotKind, "choice">];
  const out: string[] = [];

  // Mở đầu
  if (!q) out.push(en ? pick(["Here's today's message for you ✨", "Lomi drew today's card for you 🔮"]) : pick(["Thông điệp hôm nay của bạn nè ✨", "Lá bài hôm nay Lomi rút cho bạn đây 🔮"]));
  else if (clar) out.push(en ? `One more card to clarify “${q}”:` : `Lomi rút thêm 1 lá để làm rõ ${S} nè:`);
  else {
    const [vi, enI] = TOPIC_INTRO[r.topic];
    out.push(`${pick(en ? enI : vi)}\n${en ? "Your question" : "Câu hỏi của bạn"}: “${q}”`);
  }

  // 💭 Lomi đọc tâm lý qua câu hỏi (trước khi vào bài).
  if (q && !clar && !en) out.push(`💭 ${insightText(q, r.topic, kind, r.context)}`);
  // Trả lời thẳng câu hỏi NGAY SAU phần mở đầu (người hỏi muốn biết kết quả trước, chi tiết từng lá sau).
  const ansAt = out.length;
  const usedLines = new Set<string>();
  // Từng lá
  r.cards.forEach((d, i) => {
    const c = tarotCard(d.id);
    const name = en ? c.name.en : `${c.name.vi} (${c.name.en})`;
    const orient = d.rev ? (en ? " · reversed" : " · ngược") : "";
    const label = pos[i] ? (en ? pos[i].en : pos[i].vi) : "";
    const head = r.cards.length > 1 ? `${nums[i]} ${kind === "choice" ? (en ? "Option" : "Lựa chọn") + ` “${label}”` : label} — ${name}${orient}` : `${name}${orient}`;
    const meaning = en ? (d.rev ? c.rev.en : c.up.en) : d.rev ? c.rev.vi : c.up.vi;
    // Câu dẫn đã nói ý chính của lá → chỉ giữ phần lời nhắn phía sau của nghĩa lá, tránh lặp ý.
    const rest = meaning.split(/(?<=[.!?])\s+/).slice(1).join(" ");
    // Có chủ đề cụ thể → nối lá với chủ đề ("Về sức khoẻ, …") thay cho lời nhắn chung chung của lá.
    const role = roles[i] ?? "situation";
    const tl = r.topic !== "general" ? TOPIC_LINE[c.suit][r.topic] : GENERAL_LINE[c.suit];
    // Lá "nặng" theo nghĩa (vd Toà Tháp xuôi) cũng tính là thử thách, dù không ngược.
    const rough = hard(d) || cardScore(d) < 0;
    const apply = en ? "" : rough ? tl[1] : tl[0];
    if (!en && q && !clar) {
      // Trùng câu (2 lá cùng chất) → dùng câu đầu của nghĩa lá để vẫn có ý riêng.
      const own = meaning.split(/(?<=[.!?])\s+/)[0];
      const line = usedLines.has(apply) ? own : apply;
      usedLines.add(line);
      const lead = ROLE_LEAD[role][rough ? 1 : 0].replace("{O}", label);
      out.push(`${head}\n${lead} ${line}`);
    } else out.push(`${head}\n${frame(role, d, S, en, label)}${rest ? ` ${rest}` : ""}`);
  });

  // Trả lời thẳng câu hỏi + tóm lại
  const [c1, c2, c3] = r.cards;
  const nowPart = (d: TarotDraw) => (en ? (hard(d) ? `is tangled in ${kw(d, en)}` : `carries ${kw(d, en)}`) : hard(d) ? `đang hơi vướng ${kw(d, en)}` : `đang có ${kw(d, en)}`);
  const goPart = (d: TarotDraw) => (en ? (hard(d) ? `let go of ${kw(d, en)}` : `lean into ${kw(d, en)}`) : hard(d) ? `gỡ bỏ ${kw(d, en)}` : `để tâm tới ${kw(d, en)}`);
  const lastCard = r.cards[r.cards.length - 1];
  // Mỗi lá đã có câu theo chủ đề → phần Tóm lại chốt bằng nhận định chung của cả trải bài.
  const topicLine = () => (en || r.cards.length < 3 ? "" : ` ${trendLine(r.cards)}`);
  const topicSummary = () => {
    if (en || r.cards.length < 3) return null;
    const good = toneTotal(r.cards) >= 1;
    return `🌿 Tóm lại: ${trendLine(r.cards)} ${CLOSING[r.topic][good ? 0 : 1]}`;
  };
  if (clar) {
    const sc = cardScore(c1);
    out.push(
      en
        ? `🔎 This card ${sc > 0 ? "tips things toward the bright side" : sc < 0 ? "asks you to be careful and patient" : "says it's still open — your next step decides"}.`
        : `🔎 Lá này ${sc > 0 ? `kéo ${S} nghiêng về phía tích cực hơn` : sc < 0 ? "nhắc bạn cẩn thận và kiên nhẫn thêm chút" : "cho thấy mọi chuyện còn để ngỏ — bước tiếp theo của bạn sẽ quyết định"}.`,
    );
  } else if (kind === "timing" && c3) {
    out.splice(ansAt, 0, `⏳ ${en ? "Timing" : "Trả lời nhanh"}: ${timingPhrase(c3, en)}`);
    out.push(topicSummary() ?? `🌿 ${en ? "In short" : "Tóm lại"}: ${en ? `This ${nowPart(c1)}; to move it forward, ${goPart(c2)}.` : `${capFirst(S)} ${nowPart(c1)}. Muốn mọi thứ thuận lợi thì hãy ${goPart(c2)} nha.`}${topicLine()}`);
  } else if (kind === "yesno" && c3) {
    const should = /(?<![a-z])(nen|should)(?![a-z])/.test(fold(q));
    const ans = en
      ? yesnoPhrase(r.cards, en)
      : r.topic === "health"
        ? healthAnswer(r.cards)
        : yesnoAnswer(r.cards, S, should);
    out.splice(ansAt, 0, `🔎 ${en ? "The cards' answer" : "Trả lời nhanh"}: ${ans}`);
    out.push(topicSummary() ?? `🌿 ${en ? "In short" : "Tóm lại"}: ${en ? `This ${nowPart(c1)}; the key thing to watch is ${kw(c2, en)}.` : `${capFirst(S)} ${nowPart(c1)}, điều cần để ý nhất là ${kw(c2, en)}, và kết quả ${hard(c3) ? "có thể còn vướng" : "nghiêng về"} ${kw(c3, en)}.`}${topicLine()}`);
  } else if (kind === "choice" && r.pos && c2) {
    const [a, b] = [cardScore(c1), cardScore(c2)];
    const [na, nb] = r.pos.map((p) => (en ? p.en : p.vi));
    const win = a >= b ? c1 : c2;
    out.splice(
      ansAt,
      0,
      `⚖️ ${
        a === b
          ? en
            ? "Both paths have their own merits — pick the one that makes your heart feel lighter."
            : "Cả hai đều có cái hay riêng — chọn cái khiến lòng bạn thấy nhẹ nhõm nhất nha."
          : en
            ? `The cards lean toward “${a > b ? na : nb}” — that path carries ${kw(win, en)}.`
            : `Lá bài nghiêng về “${a > b ? na : nb}” hơn — bên đó mang năng lượng của ${kw(win, en)}.`
      }`,
    );
  } else if (kind === "open" && c3) {
    out.push(
      topicSummary() ??
      `🌿 ${en ? "In short" : "Tóm lại"}: ${
        en ? `This ${nowPart(c1)}, the challenge is ${kw(c2, en)}, and the advice is to ${goPart(c3)}.` : `${capFirst(S)} ${nowPart(c1)}; thử thách là ${kw(c2, en)}, và bài khuyên bạn ${goPart(c3)}.`
      }${topicLine()}`,
    );
    const majors = r.cards.filter((d) => tarotCard(d.id).suit === "major").length;
    if (majors >= 2)
      out.push(en ? "✨ Several Major Arcana showed up — this is a meaningful phase." : "✨ Có nhiều lá Ẩn Chính xuất hiện — đây là giai đoạn khá quan trọng với bạn đó.");
  }

  if (/(?<![a-z])(suc khoe|benh|mang thai|co bau|health|sick|pregnan)/.test(fold(q)))
    out.push(
      en
        ? "💚 For anything health-related, please check with a doctor too."
        : "💚 Lá bài chỉ để mình thêm tinh thần thôi nha — chuyện thuốc men, khỏi hay chưa thì bác sĩ mới là người trả lời chính xác nhất.",
    );
  if (/(?<![a-z])(nhau|ruou|bia|say|drink|beer)(?![a-z])/.test(fold(q)))
    out.push(en ? "🍻 Whatever the cards say: drink in moderation, and never drive after drinking!" : "🍻 Bài nói gì thì nói, đi nhậu nhớ uống vừa phải và đã uống thì đừng lái xe nha!");

  // Lời khuyên hành động (bỏ qua với kiểu hỏi chung — lá thứ 3 đã là lời khuyên)
  // Có chủ đề cụ thể thì phần Tóm lại đã có lời khuyên hợp chủ đề → bỏ lời khuyên chung theo chất bài.
  if (clar || !q || en) {
    const adviceCard = kind === "choice" && r.cards.length === 2 ? (cardScore(c1) >= cardScore(c2) ? c1 : c2) : lastCard;
    const adv = ADVICE[tarotCard(adviceCard.id).suit];
    out.push(`💡 ${en ? "Advice" : "Lời khuyên"}: ${en ? (adviceCard.rev ? adv[3] : adv[2]) : adviceCard.rev ? adv[1] : adv[0]}`);
  }

  if (q && !clar)
    out.push(en ? "Want more clarity? Type “one more card” and Lomi will draw another 🔮" : "Muốn rõ hơn thì gõ “rút thêm” để Lomi rút thêm 1 lá nha 🔮");
  else
    out.push(
      en
        ? pick(["Hope this helps you see things a little more gently 🌿", "Wishing you a lovely day 💚"])
        : pick(["Mong là lá bài giúp bạn nhìn mọi thứ nhẹ nhàng hơn nha 🌿", "Chúc bạn một ngày thật xinh 💚", "Muốn hỏi gì nữa thì cứ gõ cho Lomi nha 🔮"]),
    );
  return out.join("\n\n");
}

/** Câu gửi Lomi AI khi người dùng muốn giải sâu hơn (chỉ Membership). */
export function readingAiPrompt(r: TarotReading, lang: L): string {
  const en = lang === "en";
  const pos = r.pos ?? TAROT_SPREADS.find((s) => s.id === r.spread)?.pos ?? [];
  const list = r.cards
    .map((d, i) => {
      const c = tarotCard(d.id);
      const p = pos[i] ? `${en ? pos[i].en : pos[i].vi}: ` : "";
      return `${p}${c.name.en}${d.rev ? (en ? " (reversed)" : " (ngược)") : ""}`;
    })
    .join("; ");
  const about = r.question ? (en ? `for the question “${r.question}”` : `cho câu hỏi “${r.question}”`) : en ? "for today's message" : "xem thông điệp hôm nay";
  return en
    ? `I did a tarot reading ${about} — ${list}. Please give me a deeper, friendly interpretation.`
    : `Mình vừa bói tarot ${about} — ${list}. Giải sâu hơn giúp mình nha.`;
}

// ── Lời Lomi hỏi lại khi người dùng chỉ gõ "bói tarot" ──
export const TAROT_ASK: T2 = {
  vi: "Okie, Lomi xáo bài nè 🔮 Bạn muốn hỏi bài điều gì? Chọn một chủ đề bên dưới, hoặc gõ tự nhiên như đang tâm sự — ví dụ “Khi nào mình có việc mới?”, “Người ấy nghĩ gì về mình?” hay “Ở lại hay đi?”. Muốn xem sâu hơn thì chọn trải 5 lá hoặc Celtic Cross 10 lá nha 😊",
  en: "Okay, Lomi's shuffling 🔮 What would you like to ask the cards? Just type it naturally — e.g. “When will I get a new job?”, “Should I text them?” or “Da Lat or Nha Trang?”. For a general message for today, just type “today” 😊",
};
export const TAROT_SUGGEST: T2[] = [
  { vi: "❤️ Tình yêu", en: "How will my love life go?" },
  { vi: "💼 Công việc", en: "How will work go this month?" },
  { vi: "💰 Tài chính", en: "Today's message" },
  { vi: "🌙 Bản thân", en: "" },
  { vi: "🔮 Tương lai gần", en: "" },
  { vi: "👤 Một người cụ thể", en: "" },
  { vi: "🃏 Trải 5 lá", en: "" },
  { vi: "🌟 Celtic Cross 10 lá", en: "" },
  { vi: "Thông điệp hôm nay", en: "" },
];
// Chế độ bói (30/09 r11): bấm chủ đề → Lomi bói luôn bằng câu hỏi mẫu; chọn trải 5/10 lá → Lomi hỏi câu hỏi rồi trải.
export const TAROT_MODE: Record<string, { q?: string; ask?: string; quick?: string[]; spread?: "five" | "celtic" }> = {
  "❤️ Tình yêu": { q: "Tình cảm của mình thời gian tới thế nào?" },
  "💼 Công việc": { q: "Sự nghiệp của mình thời gian tới thay đổi thế nào?" },
  "💰 Tài chính": { q: "Tài chính vài tháng tới thế nào?" },
  "🌙 Bản thân": { q: "Mình nên tập trung vào điều gì?" },
  "🔮 Tương lai gần": { q: "Tháng tới có chuyện gì đáng chú ý?" },
  "👤 Một người cụ thể": {
    ask: "Bạn muốn hỏi bài điều gì về người đó nè? 👤 Gõ tự nhiên nha, hoặc chọn một câu bên dưới:",
    quick: ["Người ấy nghĩ gì về mình?", "Người đó có ý định gì?", "Mối quan hệ giữa mình và người đó sẽ thay đổi ra sao?", "Người ấy có tình cảm với mình không?"],
  },
  "🃏 Trải 5 lá": {
    spread: "five",
    ask: "Okie, trải 5 lá phân tích sâu nha 🃏 (Hiện tại · Nguyên nhân · Điều ẩn giấu · Lời khuyên · Kết quả). Giờ bạn gõ câu hỏi muốn xem nè:",
  },
  "🌟 Celtic Cross 10 lá": {
    spread: "celtic",
    ask: "Celtic Cross — trải bài chuyên sâu 10 lá 🌟, hợp với chuyện lớn cần nhìn toàn cảnh. Bạn gõ câu hỏi muốn xem nha:",
  },
};
export const TAROT_CANCEL: T2 = {
  vi: "Okie, lúc nào muốn bói thì gọi Lomi nha 😊",
  en: "Okay! Call Lomi whenever you want a reading 😊",
};

// ─────────────────────────────────────────────────────────────────────────────
// LÁ BÀI HÔM NAY (30/09 r9, theo ý Kir): mỗi người 1 lá CỐ ĐỊNH trong ngày (tính từ id người dùng + ngày),
// mở Lomi lần đầu trong ngày thì hiện popup kèm lời chúc; hỏi "bói một lá cho hôm nay" cũng ra đúng lá này.
// ─────────────────────────────────────────────────────────────────────────────
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fnv(x: string): number {
  let h = 2166136261;
  for (let i = 0; i < x.length; i++) {
    h ^= x.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
export function dailyDraw(uid: string, d = new Date()): TarotDraw {
  const h = fnv(`${uid}|${dayKey(d)}`);
  return { id: h % TAROT_DECK_SIZE, rev: (h >>> 11) % 10 < 3 }; // ~30% lá ngược cho ngày mới nhẹ nhàng
}
const WISH_GOOD = [
  "Chúc bạn một ngày thật thuận lợi, gặp toàn người dễ thương và chuyện vui bất ngờ ✨",
  "Hôm nay là ngày đẹp để bắt đầu một điều nhỏ mà bạn ấp ủ lâu rồi — cứ mạnh dạn nha 🌿",
  "Chúc bạn làm gì cũng suôn sẻ, về nhà với nụ cười thật tươi 😊",
  "Năng lượng hôm nay đang đứng về phía bạn — tận hưởng từng khoảnh khắc nhé 🌤️",
  "Chúc bạn một ngày nhiều may mắn, ăn ngon, ngủ yên và có ai đó làm bạn cười 💚",
  "Mong hôm nay mọi nỗ lực của bạn đều được đền đáp xứng đáng ✨",
];
const WISH_SOFT = [
  "Hôm nay cứ đi chậm một chút cũng được — chăm sóc bản thân trước đã nha 💚",
  "Nếu có gì chưa như ý, hít một hơi thật sâu — mọi chuyện rồi sẽ ổn thôi 🌿",
  "Chúc bạn đủ bình tĩnh để vượt qua mọi thứ, và đủ dịu dàng với chính mình 🤍",
  "Một ngày chưa hoàn hảo vẫn có thể là một ngày đáng nhớ — Lomi tin bạn làm được ✨",
  "Hôm nay nhớ uống đủ nước, ăn đủ bữa, và đừng quên mỉm cười nha 😊",
  "Chúc bạn tìm được một khoảnh khắc bình yên nho nhỏ giữa ngày bận rộn 🌙",
];
export function dailyMessage(uid: string, d = new Date()): { draw: TarotDraw; name: string; meaning: string; wish: string } {
  const draw = dailyDraw(uid, d);
  const c = tarotCard(draw.id);
  const soft = draw.rev ? hard(draw) : hard(draw) || cardScore(draw) < 0;
  const h = fnv(`${dayKey(d)}|${uid}|wish`);
  const list = soft ? WISH_SOFT : WISH_GOOD;
  return { draw, name: c.name.vi, meaning: draw.rev ? c.rev.vi : c.up.vi, wish: list[h % list.length] };
}

/** Chủ đề của câu hỏi (để biết có nên ghép thêm hoàn cảnh Lomi nhớ vào ngữ cảnh bói không). */
export function questionTopic(q: string): TarotTopic {
  return detectTopic(fold(q));
}


// ── Giải chi tiết lá hôm nay (30/09 r10, theo ý Kir: popup đã có nghĩa ngắn → bấm "Xem giải chi tiết"
// phải ra nội dung sâu hơn: từng mặt tình cảm / công việc / tiền / sức khoẻ + gợi ý may mắn trong ngày). ──
const LUCKY_COLOR: Record<TarotSuit, string[]> = {
  wands: ["đỏ", "cam", "vàng nắng"],
  cups: ["xanh dương", "bạc", "xanh ngọc"],
  swords: ["trắng", "xám bạc", "vàng nhạt"],
  pentacles: ["xanh lá", "nâu đất", "vàng đồng"],
  major: ["tím", "vàng kim", "xanh ngọc", "hồng pastel", "trắng ngà"],
};
const DAILY_OPEN = [
  "Lomi đã thắp nến và lật lá bài của bạn hôm nay 🕯️",
  "Quả cầu pha lê vừa sáng lên — đây là lá bài dẫn đường cho bạn hôm nay 🔮",
  "Lá bài hôm nay đã chọn bạn rồi nè ✨",
];
const DAILY_CLOSE = [
  "Chúc bạn một ngày thật xinh — có gì cứ quay lại kể Lomi nghe nha 💚",
  "Bài chỉ gợi đường, còn bước đi là của bạn. Chúc hôm nay thật nhiều điều dễ thương 🌙",
  "Nhớ mỉm cười nhiều hơn hôm qua một chút nha — năng lượng tốt sẽ tự tìm đến 🌿",
];
export function dailyDetailVi(d: TarotDraw, day = new Date()): string {
  const c = tarotCard(d.id);
  const rough = d.rev ? hard(d) : hard(d) || cardScore(d) < 0;
  const j = d.rev ? 1 : 0;
  const career = c.suit === "major" ? MAJOR_DOMAIN[d.id][j] : MINOR_DOMAIN[c.suit][(d.id - 22) % 14][j];
  const love = c.suit === "major" ? MAJOR_DOMAIN[d.id][2 + j] : MINOR_DOMAIN[c.suit][(d.id - 22) % 14][2 + j];
  const tl = TOPIC_LINE[c.suit];
  const money = rough ? tl.money[1] : tl.money[0];
  const health = rough ? tl.health[1] : tl.health[0];
  const h = fnv(`${dayKey(day)}|${d.id}`);
  const colors = LUCKY_COLOR[c.suit];
  const num = c.suit === "major" ? (d.id % 9) + 1 : ((d.id - 22) % 14) + 1;
  const hour = 7 + (h % 12);
  const adv = ADVICE[c.suit][rough ? 1 : 0];
  const strip = (x: string) => x.replace(/^(Về công việc|Trong công việc|Trong tình cảm|Về tình cảm),\s*/i, "");
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  return [
    `${DAILY_OPEN[h % DAILY_OPEN.length]}\n**${c.name.vi} (${c.name.en})**${d.rev ? " · ngược" : ""}\n${d.rev ? c.rev.vi : c.up.vi}`,
    `Năng lượng chủ đạo hôm nay là ${kw(d, false)}. ${rough ? "Hôm nay có thể có vài chuyện chưa như ý — cứ đi chậm, giữ bình tĩnh là qua." : "Một ngày khá thuận để bạn làm điều mình muốn."}`,
    `**💞 Tình cảm:** ${cap(strip(love))}\n**💼 Công việc:** ${cap(strip(career))}\n**💰 Tiền bạc:** ${money}\n**🌿 Sức khoẻ & tinh thần:** ${health}`,
    `**✨ May mắn hôm nay:** màu ${colors[h % colors.length]} · con số ${num} · giờ đẹp khoảng ${hour}h–${hour + 1}h`,
    `**💡 Lời khuyên:** ${adv}`,
    `${DAILY_CLOSE[(h >>> 4) % DAILY_CLOSE.length]}\nMuốn xem kỹ hơn từng buổi thì bấm “Bói 3 lá cho hôm nay” nha 🔮`,
  ].join("\n\n");
}
