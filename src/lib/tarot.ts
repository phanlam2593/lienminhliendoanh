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

export type TarotTopic = "general" | "love" | "work" | "money" | "travel" | "study";
export type TarotSpread = "one" | "ppf" | "sca"; // 1 lá · Quá khứ–Hiện tại–Tương lai · Tình huống–Thử thách–Lời khuyên
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
  pos?: T2[];
};

export const TAROT_TOPICS: { id: TarotTopic; emoji: string; vi: string; en: string }[] = [
  { id: "general", emoji: "🌿", vi: "Tổng quan", en: "General" },
  { id: "love", emoji: "💞", vi: "Tình cảm", en: "Love" },
  { id: "work", emoji: "💼", vi: "Công việc", en: "Work" },
  { id: "money", emoji: "💰", vi: "Tài chính", en: "Money" },
  { id: "travel", emoji: "✈️", vi: "Đi xa · giấy tờ", en: "Travel · paperwork" },
  { id: "study", emoji: "📚", vi: "Học tập", en: "Study" },
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
  },
  wands: {
    love: ["Chuyện tình cảm đang có lửa, nhiều hứng khởi và chủ động.", "Chuyện tình cảm dễ nóng giận hoặc nhanh chán — giữ lửa đều đều thôi nha.", "Love is fiery, exciting and proactive.", "Quick tempers or fading sparks — keep the fire steady."],
    work: ["Công việc đang có động lực, rất hợp để khởi động dự án mới.", "Công việc dễ kiểu cháy nhanh tắt nhanh — chia sức cho đều nha.", "Motivated at work — great time to start something new.", "Burning bright then out; pace yourself."],
    money: ["Tiền bạc đến từ sự chủ động và dám làm.", "Về tiền, tránh đầu tư theo cảm hứng nhất thời.", "Money comes from initiative and boldness.", "Avoid impulse investments."],
    travel: ["Chuyện đi xa đang có năng lượng dịch chuyển mạnh — hợp để chủ động nộp hồ sơ, lên đường.", "Chuyện đi xa dễ vội vàng — kiểm tra kỹ giấy tờ trước khi nộp nha.", "Strong movement energy — a good time to apply and go.", "Easy to rush; check your papers before submitting."],
    study: ["Việc học đang hăng say, hợp để bắt đầu một khoá mới.", "Việc học dễ nản giữa chừng — chia nhỏ mục tiêu ra nha.", "Eager to learn — great time to start a new course.", "Easy to lose steam; break goals into small steps."],
  },
  cups: {
    love: ["Tình cảm là điểm sáng lúc này — cứ mở lòng ra nha.", "Cảm xúc hai bên đang hơi rối, nói chuyện thật lòng sẽ ổn hơn.", "Love is the bright spot — open your heart.", "Feelings are tangled; an honest talk will help."],
    work: ["Không khí làm việc dễ chịu, đồng nghiệp hợp nhau.", "Cảm xúc cá nhân đang ảnh hưởng tới công việc.", "A pleasant workplace with good colleagues.", "Emotions are spilling into work."],
    money: ["Tiền bạc đủ đầy, có thể thoải mái chi cho vài niềm vui nhỏ.", "Cẩn thận kiểu chi tiêu theo cảm xúc nha.", "Money is comfortable; room for small joys.", "Watch emotional spending."],
    travel: ["Chuyến đi hứa hẹn nhiều niềm vui và những kết nối mới.", "Bạn còn lăn tăn về chuyến đi — hỏi lòng mình thật kỹ.", "The trip brings joy and new connections.", "Mixed feelings about the trip; listen to your heart."],
    study: ["Học cùng bạn bè sẽ vui và tiến bộ nhanh hơn.", "Tâm trạng đang kéo việc học xuống, nghỉ ngơi chút rồi học tiếp.", "Learning with friends helps you grow.", "Your mood is affecting your studies."],
  },
  swords: {
    love: ["Trong mối quan hệ, cần nói chuyện rõ ràng, thẳng thắn với nhau.", "Dễ hiểu lầm vì lời nói — nhẹ nhàng với nhau hơn chút nha.", "Clear, honest communication is needed.", "Words may cause misunderstandings — be gentler."],
    work: ["Công việc hợp để phân tích, lên kế hoạch và ra quyết định.", "Công việc đang áp lực, dễ tranh luận — giữ cái đầu lạnh nha.", "Good time to analyze, plan and decide.", "Pressure and debates at work; keep a cool head."],
    money: ["Tính toán kỹ trước mọi khoản chi.", "Bạn lo chuyện tiền hơi nhiều — ghi lại chi tiêu sẽ thấy đỡ hơn.", "Think carefully before every expense.", "Money worries run high — tracking spending will help."],
    travel: ["Chuyện giấy tờ cần sắp xếp rõ ràng, chuẩn bị hồ sơ thật chỉn chu.", "Có thể vướng thủ tục, thông tin rối — hỏi thêm người có kinh nghiệm.", "Get your information in order and prepare a tidy file.", "Possible red tape — ask someone experienced."],
    study: ["Đầu óc đang minh mẫn, rất hợp để ôn thi.", "Áp lực thi cử đang cao — nhớ ngủ đủ nha.", "A clear mind — great for exam prep.", "Exam pressure is high; get enough sleep."],
  },
  pentacles: {
    love: ["Tình cảm bền vững, xây từ những điều giản dị, thực tế.", "Đừng để chuyện tiền bạc chen vào tình cảm.", "Steady love built on practical things.", "Don't let money come between you."],
    work: ["Công việc ổn định, chăm chỉ sẽ được đền đáp xứng đáng.", "Công việc hơi dậm chân tại chỗ, nên học thêm kỹ năng mới.", "Stable work; diligence pays off.", "Work feels stuck; refresh your skills."],
    money: ["Tài chính thuận lợi, hợp để tích luỹ.", "Nên siết lại chi tiêu và tránh rủi ro lúc này.", "Finances look good — time to save.", "Tighten spending and avoid risks."],
    travel: ["Tài chính và giấy tờ vững vàng thì mọi thứ sẽ thuận lợi.", "Chi phí, chứng minh tài chính cần chuẩn bị kỹ hơn.", "Solid finances and papers make things smooth.", "Costs or proof of funds need more preparation."],
    study: ["Chăm chỉ đều đặn sẽ cho kết quả chắc chắn.", "Việc học chưa đều, lập một lịch học cụ thể nha.", "Steady effort brings solid results.", "Inconsistent study; make a concrete schedule."],
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
  /(?<![a-z])(boi\s+tarot|xem\s+tarot|tarot|boi\s+bai|rut\s+bai|trai\s+bai|xem\s+boi|boi\s+toan|rut\s+(?:1|mot|3|ba)\s+la|boi\s+(?:1|mot|3|ba)\s+la|boi)(?![a-z])/g;

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
  /^[\s,.:;!?\-–—…"“”'()]*(?:(?:xem|giup|dum|gium|ho|cho|em|anh|a|e|minh|toi|tui|voi|thu|coi|ve|la|muon|oi|lomi|ban|chi|bai|tarot|cai|cua|dc|duoc|hoi|nhu the nao)(?![a-z])|(?:1|mot|3|ba)\s+la(?![a-z])|[\s,.:;!?\-–—…"“”'()]+)/;
const TRAIL =
  /(?:[\s,.:;!\-–—…]*(?:(?:giup|dum|gium|ho|voi)(?:\s+(?:em|anh|minh|toi|tui|mk|a|e|t))?|nha|nhe|ne|di|nhen|hen|lomi|oi|ik|xem|coi|thu)(?![a-z]))+[\s,.:;!\-–—…]*$|[\s,.:;!\-–—…]+$/;

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

const nWords = (x: string) => x.split(/\s+/).filter(Boolean).length;
const DAILY_RE = /(?<![a-z])(hom nay|thong diep|1 la|mot la|today)(?![a-z])/;

/** Câu gõ có ý muốn bói không? Trả về câu hỏi bóc ra (rỗng nếu chưa hỏi gì cụ thể). */
export function detectTarot(text: string): { question: string; daily: boolean } | null {
  const f = fold(text);
  const m = findTrigger(text, f);
  if (!m) return null;
  const after = clean(text.slice(m.end));
  const before = clean(text.slice(0, m.start));
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
  if (/(?<![a-z])(tinh cam|tinh yeu|nguoi yeu|crush|nguoi ay|hen ho|yeu|ny|vo|chong|ket hon|cuoi|chia tay|quay lai|ex|love|dating|boyfriend|girlfriend|marry)(?![a-z])/.test(f))
    return "love";
  if (/(?<![a-z])(hoc|thi|du hoc|truong|dai hoc|bang cap|ielts|toeic|exam|study|school)(?![a-z])/.test(f)) return "study";
  if (/(?<![a-z])(visa|nuoc ngoai|du lich|xuat canh|dinh cu|xuat khau lao dong|ho chieu|chuyen di|di (uc|my|nhat|han|canada|duc|anh|phap|dai loan|sing|thai)|travel|trip|abroad|passport)(?![a-z])/.test(f))
    return "travel";
  if (/(?<![a-z])(cong viec|su nghiep|viec lam|cong ty|sep|phong van|xin viec|thang chuc|nghi viec|chuyen viec|work|job|career|interview|promotion|boss)(?![a-z])/.test(f))
    return "work";
  if (/(?<![a-z])(tien|tai chinh|dau tu|kinh doanh|buon ban|mo quan|lam an|luong|thu nhap|money|invest|business|salary)(?![a-z])/.test(f))
    return "money";
  return "general";
}

function detectKind(q: string): { kind: TarotKind; options?: [string, string] } {
  const f = fold(q);
  // A hay B — chỉ khi có dấu hiệu lựa chọn (chữ "hay" còn nghĩa là "thường": "mình hay cãi nhau…").
  const cm = f.match(/^(.*?)\s+(hay la|hoac la|hay|hoac|or)\s+(.+)$/);
  if (cm && !/^(khong|ko|k|chua|not)(?![a-z])/.test(cm[3]) && (/(hay la|hoac|or)/.test(cm[2]) || /(?<![a-z])(nen|chon|giua|which|should|choose)(?![a-z])/.test(f))) {
    const cut = cm[1].length;
    let a = q.slice(0, cut);
    let b = q.slice(cut + cm[0].length - cm[1].length - cm[3].length);
    a = a.replace(/^.*?(?:nên chọn|nen chon|nên|nen|chọn|chon|giữa|giua|should i|choose)\s+/i, "");
    b = b.replace(/\s*(thì tốt hơn|thi tot hon|tốt hơn|tot hon|hơn|nhỉ|nhi|ạ|đây|day)?\s*[?.!…]*\s*$/i, "");
    a = clean(a);
    b = clean(b);
    if (nWords(a) >= 1 && nWords(b) >= 1 && nWords(a) <= 8 && nWords(b) <= 8) return { kind: "choice", options: [a, b] };
  }
  if (/(?<![a-z])(khi nao|bao gio|bao lau|luc nao|thang nao|nam nao|may thang|bao nhieu lau|when|how long)(?![a-z])/.test(f)) return { kind: "timing" };
  if (
    /(?<![a-z])(khong|ko|chua|k)\s*[?.!…]*\s*$/.test(f) ||
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
export function drawForQuestion(question: string): TarotReading {
  const q = question.trim();
  if (!q) return { topic: "general", spread: "one", cards: drawCards(1), at: Date.now(), kind: "daily", question: "", pos: POS.daily };
  const { kind, options } = detectKind(q);
  const topic = detectTopic(fold(q));
  if (kind === "choice" && options)
    return {
      topic,
      spread: "sca",
      cards: drawCards(2),
      at: Date.now(),
      kind,
      question: q,
      pos: options.map((o) => P(short(o), short(o))),
    };
  return { topic, spread: "sca", cards: drawCards(3), at: Date.now(), kind, question: q, pos: POS[kind as Exclude<TarotKind, "choice">] };
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
      if (c.suit === "swords") body += en ? ", though things may feel rushed" : ", nhưng có thể hơi gấp gáp";
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
const LEAD_W = new Set(["a", "e", "anh", "em", "minh", "toi", "tui", "t", "co", "thi", "nen", "se", "duoc", "ban", "hay", "la", "ve", "cua"]);
const TRAIL_W = new Set(["khong", "ko", "k", "chua", "nhi", "nha", "vay", "the", "a", "sao", "nao", "nhe", "di", "ha", "ta", "day", "ne"]);
const TOPIC_NOUN: Record<TarotTopic, string> = {
  general: "chuyện này",
  love: "chuyện tình cảm",
  work: "chuyện công việc",
  money: "chuyện tiền bạc",
  travel: "chuyện đi xa, giấy tờ",
  study: "chuyện học hành",
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
  let fw = f();
  while (w.length && LEAD_W.has(fw[0])) (w.shift(), (fw = f()));
  while (w.length && TRAIL_W.has(fw[fw.length - 1])) (w.pop(), (fw = f()));
  if (w.length >= 2 && fw[w.length - 2] === "cua") w = w.slice(0, -2); // "... của mình"
  if (!w.length || w.length > 9) return TOPIC_NOUN[topic];
  const core = w.join(" ");
  return fold(core).startsWith("chuyen") ? core : `chuyện ${core}`;
}
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  study: [["Chuyện học hành hả, cố lên nha! Lomi xem bài nè 📚", "Để Lomi xem việc học của bạn sắp tới ra sao nha 📚"], ["Studies — let's see what the cards say 📚"]],
};

// ── Ghép lời giải: từng lá gắn với chủ đề + phần “Tóm lại” nối các lá thành một câu chuyện ──
export function readingText(r: TarotReading, lang: L): string {
  const en = lang === "en";
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

  // Từng lá
  r.cards.forEach((d, i) => {
    const c = tarotCard(d.id);
    const name = en ? c.name.en : `${c.name.vi} (${c.name.en})`;
    const orient = d.rev ? (en ? " · reversed" : " · ngược") : "";
    const label = pos[i] ? (en ? pos[i].en : pos[i].vi) : "";
    const head = r.cards.length > 1 ? `${nums[i]} ${kind === "choice" ? (en ? "Option" : "Lựa chọn") + ` “${label}”` : label} — ${name}${orient}` : `${name}${orient}`;
    const meaning = en ? (d.rev ? c.rev.en : c.up.en) : d.rev ? c.rev.vi : c.up.vi;
    out.push(`${head}\n${frame(roles[i] ?? "situation", d, S, en, label)} ${meaning}`);
  });

  // Trả lời thẳng câu hỏi + tóm lại
  const [c1, c2, c3] = r.cards;
  const nowPart = (d: TarotDraw) => (en ? (hard(d) ? `is tangled in ${kw(d, en)}` : `carries ${kw(d, en)}`) : hard(d) ? `đang hơi vướng ${kw(d, en)}` : `đang có ${kw(d, en)}`);
  const goPart = (d: TarotDraw) => (en ? (hard(d) ? `let go of ${kw(d, en)}` : `lean into ${kw(d, en)}`) : hard(d) ? `gỡ bỏ ${kw(d, en)}` : `để tâm tới ${kw(d, en)}`);
  const lastCard = r.cards[r.cards.length - 1];
  const topicLine = () => {
    if (r.topic === "general") return "";
    const tl = TOPIC_LINE[tarotCard(lastCard.id).suit][r.topic];
    return ` ${en ? (lastCard.rev ? tl[3] : tl[2]) : lastCard.rev ? tl[1] : tl[0]}`;
  };
  if (clar) {
    const sc = cardScore(c1);
    out.push(
      en
        ? `🔎 This card ${sc > 0 ? "tips things toward the bright side" : sc < 0 ? "asks you to be careful and patient" : "says it's still open — your next step decides"}.`
        : `🔎 Lá này ${sc > 0 ? `kéo ${S} nghiêng về phía tích cực hơn` : sc < 0 ? "nhắc bạn cẩn thận và kiên nhẫn thêm chút" : "cho thấy mọi chuyện còn để ngỏ — bước tiếp theo của bạn sẽ quyết định"}.`,
    );
  } else if (kind === "timing" && c3) {
    out.push(`⏳ ${en ? "Timing" : "Về thời điểm"}: ${timingPhrase(c3, en)}`);
    out.push(`🌿 ${en ? "In short" : "Tóm lại"}: ${en ? `This ${nowPart(c1)}; to move it forward, ${goPart(c2)}.` : `${capFirst(S)} ${nowPart(c1)}. Muốn mọi thứ thuận lợi thì hãy ${goPart(c2)} nha.`}${topicLine()}`);
  } else if (kind === "yesno" && c3) {
    out.push(`🔎 ${en ? "The cards' answer" : "Lá bài trả lời"}: ${yesnoPhrase(r.cards, en)}`);
    out.push(`🌿 ${en ? "In short" : "Tóm lại"}: ${en ? `This ${nowPart(c1)}; the key thing to watch is ${kw(c2, en)}.` : `${capFirst(S)} ${nowPart(c1)}, điều cần để ý nhất là ${kw(c2, en)}.`}${topicLine()}`);
  } else if (kind === "choice" && r.pos && c2) {
    const [a, b] = [cardScore(c1), cardScore(c2)];
    const [na, nb] = r.pos.map((p) => (en ? p.en : p.vi));
    const win = a >= b ? c1 : c2;
    out.push(
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
      `🌿 ${en ? "In short" : "Tóm lại"}: ${
        en ? `This ${nowPart(c1)}, the challenge is ${kw(c2, en)}, and the advice is to ${goPart(c3)}.` : `${capFirst(S)} ${nowPart(c1)}; thử thách là ${kw(c2, en)}, và bài khuyên bạn ${goPart(c3)}.`
      }${topicLine()}`,
    );
    const majors = r.cards.filter((d) => tarotCard(d.id).suit === "major").length;
    if (majors >= 2)
      out.push(en ? "✨ Several Major Arcana showed up — this is a meaningful phase." : "✨ Có nhiều lá Ẩn Chính xuất hiện — đây là giai đoạn khá quan trọng với bạn đó.");
  }

  if (/(?<![a-z])(suc khoe|benh|mang thai|co bau|health|sick|pregnan)/.test(fold(q)))
    out.push(en ? "💚 For anything health-related, please check with a doctor too." : "💚 Chuyện sức khoẻ thì nhớ hỏi thêm bác sĩ nữa nha.");

  // Lời khuyên hành động (bỏ qua với kiểu hỏi chung — lá thứ 3 đã là lời khuyên)
  if (kind !== "open" || clar || !q) {
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
  vi: "Okie, Lomi xáo bài nè 🔮 Bạn muốn hỏi bài điều gì? Cứ gõ tự nhiên như đang tâm sự nha — ví dụ “Khi nào mình có việc mới?”, “Mình có nên nhắn tin cho người ấy không?” hay “Nên đi Đà Lạt hay Nha Trang?”. Còn muốn nhận thông điệp chung cho hôm nay thì gõ “hôm nay” là được 😊",
  en: "Okay, Lomi's shuffling 🔮 What would you like to ask the cards? Just type it naturally — e.g. “When will I get a new job?”, “Should I text them?” or “Da Lat or Nha Trang?”. For a general message for today, just type “today” 😊",
};
export const TAROT_SUGGEST: T2[] = [
  { vi: "Thông điệp hôm nay", en: "Today's message" },
  { vi: "Tình cảm sắp tới của mình thế nào?", en: "How will my love life go?" },
  { vi: "Công việc tháng này ra sao?", en: "How will work go this month?" },
];
export const TAROT_CANCEL: T2 = {
  vi: "Okie, lúc nào muốn bói thì gọi Lomi nha 😊",
  en: "Okay! Call Lomi whenever you want a reading 😊",
};
