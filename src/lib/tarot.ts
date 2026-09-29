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
  ["Kẻ Khờ", "The Fool", "🎒", "Một khởi đầu mới thật hồn nhiên — dám bước đi dù chưa thấy hết con đường.", "Hơi liều hoặc chần chừ quá lâu; nhìn kỹ một chút trước khi nhảy nha.", "A fresh, carefree beginning — daring to step out before seeing the whole road.", "A bit reckless, or hesitating too long; look before you leap."],
  ["Nhà Ảo Thuật", "The Magician", "🪄", "Bạn đang có đủ công cụ và khả năng để biến ý tưởng thành hiện thực.", "Năng lực chưa được dùng đúng chỗ, hoặc có ai đó chưa thật lòng.", "You have every tool you need to turn ideas into reality.", "Talent is being misused, or someone isn't being genuine."],
  ["Nữ Tư Tế", "The High Priestess", "🌙", "Lắng nghe trực giác nhé — câu trả lời đã có sẵn bên trong bạn.", "Bạn đang lờ đi tiếng nói bên trong, hoặc có điều gì đó còn bị che giấu.", "Trust your intuition — the answer is already within you.", "You're ignoring your inner voice, or something is hidden."],
  ["Hoàng Hậu", "The Empress", "🌾", "Sự sung túc, chăm sóc và sáng tạo đang nảy nở quanh bạn.", "Bạn đang cho đi quá nhiều mà quên chăm sóc chính mình.", "Abundance, nurturing and creativity are blooming around you.", "You're giving so much that you forget to care for yourself."],
  ["Hoàng Đế", "The Emperor", "👑", "Kỷ luật và sự vững vàng giúp bạn làm chủ tình hình.", "Hơi cứng nhắc hoặc đang mất kiểm soát; cần cân bằng lại.", "Discipline and steadiness put you in control.", "Too rigid, or losing control; time to rebalance."],
  ["Giáo Hoàng", "The Hierophant", "📜", "Người đi trước và những giá trị quen thuộc sẽ dẫn đường cho bạn.", "Đã đến lúc tự đặt luật chơi cho mình thay vì làm theo khuôn mẫu.", "Mentors and trusted traditions will guide you.", "Time to write your own rules instead of following the template."],
  ["Tình Nhân", "The Lovers", "💞", "Sự hoà hợp, và một lựa chọn quan trọng xuất phát từ trái tim.", "Có chút lệch nhịp trong mối quan hệ hoặc giá trị không còn chung.", "Harmony, and an important choice made from the heart.", "Imbalance in a relationship, or values drifting apart."],
  ["Cỗ Xe", "The Chariot", "🏇", "Quyết tâm và ý chí đang đưa bạn tiến lên phía trước.", "Bị kéo về nhiều phía nên hơi mất phương hướng.", "Willpower and determination carry you forward.", "Pulled in too many directions; losing your way."],
  ["Sức Mạnh", "Strength", "🦁", "Sức mạnh thật sự đến từ sự kiên nhẫn và dịu dàng.", "Hơi tự ti hoặc để cảm xúc lấn át; tin vào mình hơn chút nha.", "True strength comes from patience and gentleness.", "Self-doubt or emotions taking over; believe in yourself a little more."],
  ["Ẩn Sĩ", "The Hermit", "🏮", "Lùi lại một chút để suy ngẫm, bạn sẽ thấy mọi thứ rõ hơn.", "Ở một mình hơi lâu rồi; đến lúc kết nối lại với mọi người.", "Step back and reflect — things will become clearer.", "You've been alone a while; time to reconnect."],
  ["Bánh Xe Số Phận", "Wheel of Fortune", "🎡", "Vận may đang xoay chiều, một bước ngoặt tích cực đang tới.", "Giai đoạn hơi trắc trở — nhưng bánh xe nào rồi cũng quay tiếp.", "Luck is turning; a positive turning point is coming.", "A bumpy phase — but every wheel keeps turning."],
  ["Công Lý", "Justice", "⚖️", "Công bằng và rõ ràng — gieo gì thì gặt nấy.", "Có điều chưa sòng phẳng, hoặc ai đó đang né tránh trách nhiệm.", "Fairness and clarity — you reap what you sow.", "Something isn't fair, or someone is dodging responsibility."],
  ["Người Treo Ngược", "The Hanged Man", "🙃", "Tạm dừng và nhìn từ một góc khác sẽ mở ra lối đi mới.", "Chờ đợi mãi mà không rõ vì sao; đừng hi sinh vô ích.", "Pausing to see things from another angle opens a new path.", "Waiting without reason; don't sacrifice for nothing."],
  ["Sự Chuyển Hoá", "Death", "🦋", "Một chương khép lại để chương mới mở ra — thay đổi cần thiết thôi.", "Bạn đang níu giữ điều đã cũ vì ngại thay đổi.", "One chapter ends so a new one can begin — a needed change.", "Holding on to the old out of fear of change."],
  ["Tiết Chế", "Temperance", "🍶", "Cân bằng, kiên nhẫn và vừa đủ sẽ đem lại bình an.", "Có gì đó đang quá đà; điều chỉnh lại nhịp sống nhé.", "Balance, patience and moderation bring peace.", "Something is overdone; adjust your rhythm."],
  ["Ác Quỷ", "The Devil", "⛓️", "Để ý những thói quen hay cám dỗ đang giữ chân bạn.", "Bạn đang dần thoát khỏi một ràng buộc cũ — tự do đang tới.", "Watch the habits or temptations holding you back.", "You're breaking free of an old attachment — freedom is near."],
  ["Toà Tháp", "The Tower", "🗼", "Một biến động bất ngờ phá cái cũ để xây lại vững hơn.", "Né thay đổi chỉ khiến nó đến muộn hơn thôi.", "A sudden upheaval clears the old so you can rebuild stronger.", "Avoiding change only delays it."],
  ["Ngôi Sao", "The Star", "⭐", "Hy vọng, chữa lành và niềm tin vào tương lai.", "Hơi mất niềm tin; nhẹ nhàng với chính mình một chút nha.", "Hope, healing and faith in the future.", "Faith is a little shaken; be gentle with yourself."],
  ["Mặt Trăng", "The Moon", "🌕", "Mọi thứ chưa thật rõ — đừng vội kết luận, tin vào cảm nhận.", "Sương mù đang tan dần, sự thật từ từ lộ ra.", "Things aren't clear yet — don't rush to conclusions.", "The fog is lifting; the truth is surfacing."],
  ["Mặt Trời", "The Sun", "☀️", "Niềm vui, thành công và năng lượng tích cực toả sáng.", "Niềm vui vẫn ở đó, chỉ cần bạn nhìn lạc quan hơn chút.", "Joy, success and bright positive energy.", "The joy is still there — just look on the bright side."],
  ["Phán Xét", "Judgement", "📯", "Một sự thức tỉnh và cơ hội làm mới bản thân.", "Đừng khắt khe với mình quá; bỏ qua lỗi cũ đi nha.", "An awakening and a chance to renew yourself.", "Don't be so hard on yourself; let old mistakes go."],
  ["Thế Giới", "The World", "🌍", "Hoàn thành, trọn vẹn — một hành trình khép lại thật đẹp.", "Chỉ còn một chút nữa là xong; đừng bỏ dở giữa chừng.", "Completion and wholeness — a journey beautifully closed.", "Almost there; don't quit now."],
];

// ── 56 lá Ẩn Phụ: 4 chất × 14 lá (Át, 2–10, Tiểu Đồng, Hiệp Sĩ, Hoàng Hậu, Vua) ──
// [xuôi VI, ngược VI, xuôi EN, ngược EN]
type MRow = [string, string, string, string];
const RANKS: { vi: string; en: string; short: string }[] = [
  { vi: "Át", en: "Ace", short: "A" },
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ vi: String(n), en: ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n - 2], short: String(n) })),
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
      ["Một nguồn cảm hứng hay dự định mới đang bùng lên.", "Hứng khởi chững lại, kế hoạch khởi động chậm.", "A spark of inspiration or a new plan ignites.", "Enthusiasm stalls; plans are slow to start."],
      ["Lên kế hoạch và nhìn xa cho bước tiếp theo.", "Hơi ngại bước ra khỏi vùng an toàn.", "Planning ahead and looking to the next step.", "Afraid to leave your comfort zone."],
      ["Nỗ lực bắt đầu đơm hoa, cơ hội mở rộng đang tới.", "Kết quả đến chậm hơn mong đợi, kiên nhẫn thêm nha.", "Efforts start to bloom; room to expand is coming.", "Results are slower than hoped; be patient."],
      ["Niềm vui, sự ổn định và điều đáng ăn mừng.", "Chút bất ổn nhỏ trong nhà hoặc trong nhóm.", "Joy, stability and something to celebrate.", "Minor unrest at home or in the group."],
      ["Cạnh tranh, va chạm ý kiến — cũng là lúc thể hiện mình.", "Nên tránh những xung đột không cần thiết.", "Competition and clashing ideas — a chance to shine.", "Avoid unnecessary conflict."],
      ["Chiến thắng và được mọi người công nhận.", "Chưa được ghi nhận xứng đáng, hoặc hơi thiếu tự tin.", "Victory and recognition.", "Not getting due credit, or lacking confidence."],
      ["Giữ vững lập trường trước áp lực.", "Cảm thấy quá tải, muốn buông xuôi.", "Standing your ground under pressure.", "Feeling overwhelmed, wanting to give up."],
      ["Mọi việc tiến triển nhanh, tin tức đến dồn dập.", "Trễ hẹn, trục trặc hoặc hơi vội vàng.", "Things move fast; news arrives quickly.", "Delays, hiccups or too much haste."],
      ["Kiên cường lên — bạn đã đi gần tới đích rồi.", "Kiệt sức rồi, cần nghỉ ngơi thật sự.", "Stay resilient — you're nearly there.", "Exhausted; you need real rest."],
      ["Đang gánh quá nhiều trách nhiệm cùng lúc.", "Đến lúc buông bớt gánh nặng rồi.", "Carrying too many responsibilities at once.", "Time to put some burdens down."],
      ["Tin vui, sự tò mò và tinh thần khám phá.", "Ý tưởng hay nhưng thiếu kiên trì.", "Good news, curiosity and a spirit of adventure.", "Great ideas but little follow-through."],
      ["Hành động mạnh mẽ, đầy nhiệt huyết.", "Hơi nóng vội, bốc đồng.", "Bold, passionate action.", "Hasty and impulsive."],
      ["Tự tin, cuốn hút và tràn đầy năng lượng.", "Hơi ghen tị hoặc thiếu tự tin.", "Confident, magnetic and full of energy.", "A bit jealous or insecure."],
      ["Người dẫn dắt có tầm nhìn và dám làm.", "Độc đoán hoặc đặt kỳ vọng quá cao.", "A visionary leader who dares to act.", "Domineering or expecting too much."],
    ],
  },
  {
    id: "cups",
    vi: "Cốc",
    en: "Cups",
    emoji: "💧",
    rows: [
      ["Cảm xúc mới, tình cảm mới đang nảy nở.", "Cảm xúc đang bị kìm nén bên trong.", "New feelings and affection are blooming.", "Emotions are being held back."],
      ["Kết nối hai chiều, hoà hợp và thấu hiểu.", "Mất kết nối, có hiểu lầm nho nhỏ.", "A mutual connection, harmony and understanding.", "Disconnection or a small misunderstanding."],
      ["Niềm vui bạn bè, tụ họp và ăn mừng.", "Vui chơi hơi quá đà, hoặc có người thứ ba chen vào.", "Friendship, gatherings and celebration.", "Overindulgence, or a third party interfering."],
      ["Hơi chán, dễ bỏ lỡ điều đang được trao tới.", "Bắt đầu mở lòng đón nhận lại.", "A bit bored, missing what's being offered.", "Starting to open up again."],
      ["Nuối tiếc điều đã mất — nhưng phía sau vẫn còn điều quý giá.", "Dần vượt qua nỗi buồn rồi.", "Grieving a loss — yet something precious remains.", "Slowly moving past the sadness."],
      ["Kỷ niệm đẹp, người cũ hoặc sự ngây thơ.", "Đang mắc kẹt trong quá khứ.", "Sweet memories, old friends or innocence.", "Stuck in the past."],
      ["Nhiều lựa chọn quá, dễ mơ mộng viển vông.", "Tỉnh táo và rõ ràng hơn rồi.", "Many options; easy to daydream.", "Clearer and more grounded now."],
      ["Rời bỏ điều không còn khiến bạn hạnh phúc.", "Biết nên đi nhưng vẫn ngại rời bỏ.", "Walking away from what no longer makes you happy.", "Knowing you should go but afraid to leave."],
      ["Điều ước thành hiện thực, thật hài lòng.", "Hài lòng bề ngoài nhưng bên trong chưa trọn.", "A wish come true; contentment.", "Satisfied on the surface, not inside."],
      ["Hạnh phúc trọn vẹn, gia đình êm ấm.", "Kỳ vọng và thực tế chưa khớp nhau.", "Complete happiness and a warm home.", "Expectations and reality don't match."],
      ["Một lời tỏ tình, tin nhắn dễ thương hoặc ý tưởng sáng tạo.", "Cảm xúc còn non nớt, dễ tổn thương.", "A sweet message, a confession or a creative idea.", "Immature feelings; easily hurt."],
      ["Lời mời lãng mạn, người đến với tấm lòng.", "Hứa nhiều làm ít, hơi mơ mộng.", "A romantic offer from a sincere heart.", "Big promises, little action."],
      ["Thấu cảm, dịu dàng và biết lắng nghe.", "Nhạy cảm quá mức, quên chăm sóc mình.", "Empathetic, gentle and a good listener.", "Oversensitive and neglecting yourself."],
      ["Cân bằng giữa lý trí và cảm xúc.", "Cảm xúc thất thường, khó đoán.", "Balancing head and heart.", "Moody and unpredictable."],
    ],
  },
  {
    id: "swords",
    vi: "Kiếm",
    en: "Swords",
    emoji: "⚔️",
    rows: [
      ["Sự rõ ràng, một ý tưởng sắc bén hoặc sự thật được nói ra.", "Suy nghĩ rối, thông tin bị nhiễu.", "Clarity, a sharp idea or a truth spoken.", "Muddled thinking, noisy information."],
      ["Đang phân vân giữa hai lựa chọn.", "Đến lúc quyết định rồi, đừng né nữa.", "Torn between two choices.", "Time to decide — stop avoiding it."],
      ["Nỗi buồn hay tổn thương cần được thừa nhận.", "Vết thương đang lành dần.", "Sadness or hurt that needs acknowledging.", "The wound is healing."],
      ["Nghỉ ngơi, hồi phục năng lượng.", "Quay lại sau khoảng thời gian nghỉ.", "Rest and recovery.", "Returning after a break."],
      ["Thắng mà mất nhiều — cân nhắc cái giá của tranh cãi.", "Làm hoà, bỏ qua chuyện cũ.", "Winning at a cost — weigh the price of arguing.", "Making peace, letting go."],
      ["Rời xa khó khăn, hướng tới nơi bình yên hơn.", "Vẫn còn vướng bận điều cũ.", "Leaving trouble behind for calmer waters.", "Still tied to the past."],
      ["Để ý chuyện thiếu minh bạch hoặc đi đường tắt.", "Sự thật dần lộ ra.", "Watch for hidden motives or shortcuts.", "The truth comes out."],
      ["Cảm giác bị mắc kẹt — nhưng lối ra gần hơn bạn nghĩ.", "Thoát khỏi những suy nghĩ tự giới hạn.", "Feeling trapped — but the way out is closer than you think.", "Breaking free of limiting thoughts."],
      ["Lo âu, khó ngủ vì nghĩ quá nhiều.", "Nỗi lo đang giảm dần.", "Anxiety and sleepless overthinking.", "Worries are easing."],
      ["Chạm đáy — và từ đây chỉ còn đi lên thôi.", "Đang hồi phục sau giai đoạn khó.", "Hitting bottom — only up from here.", "Recovering after a hard time."],
      ["Tò mò, ham học hỏi, có tin tức mới.", "Nói nhiều làm ít, dễ buôn chuyện.", "Curious, eager to learn, fresh news.", "All talk, gossip."],
      ["Hành động quyết liệt, nói thẳng.", "Hấp tấp, lời nói dễ làm người khác tổn thương.", "Decisive action, straight talk.", "Rash words that can hurt."],
      ["Sắc sảo, độc lập và rõ ràng.", "Hơi lạnh lùng hoặc khắt khe.", "Sharp, independent and clear.", "A bit cold or harsh."],
      ["Lý trí, công bằng và có nguyên tắc.", "Dùng lý lẽ để áp đặt người khác.", "Rational, fair and principled.", "Using logic to control others."],
    ],
  },
  {
    id: "pentacles",
    vi: "Tiền",
    en: "Pentacles",
    emoji: "🪙",
    rows: [
      ["Một cơ hội mới về tiền bạc hoặc công việc.", "Cơ hội dễ bị lỡ, lên kế hoạch kỹ hơn nha.", "A new opportunity in money or work.", "An opportunity may slip; plan more carefully."],
      ["Xoay xở nhiều việc cùng lúc khá khéo.", "Quá tải, lịch trình bị rối.", "Juggling several things skillfully.", "Overloaded, messy schedule."],
      ["Làm việc nhóm hiệu quả, tay nghề được ghi nhận.", "Thiếu phối hợp với mọi người.", "Great teamwork; your skills are recognized.", "Poor coordination."],
      ["Giữ chặt tài chính, biết tiết kiệm.", "Hoặc keo quá, hoặc chi tiêu mất kiểm soát.", "Holding on to money, saving well.", "Too tight-fisted, or spending out of control."],
      ["Khó khăn tạm thời — đừng ngại nhờ giúp đỡ.", "Tình hình đang dần khởi sắc.", "Temporary hardship — don't be shy to ask for help.", "Things are improving."],
      ["Cho và nhận, hào phóng và được giúp đỡ.", "Cho đi chưa cân bằng.", "Giving and receiving; generosity and support.", "Unbalanced giving."],
      ["Kiên nhẫn chờ thành quả, xem lại hướng đi.", "Sốt ruột vì chưa thấy kết quả.", "Patiently awaiting results; reassessing.", "Impatient for results."],
      ["Chăm chỉ rèn luyện, trau dồi kỹ năng.", "Làm cho có, thiếu tập trung.", "Diligent practice, honing your craft.", "Going through the motions."],
      ["Tự chủ, sung túc nhờ chính nỗ lực của mình.", "Phụ thuộc, hoặc tiêu xài hơi quá tay.", "Independent and comfortable through your own effort.", "Dependence or overspending."],
      ["Ổn định lâu dài, của cải và gia đình.", "Tài chính trong nhà có chút bất ổn.", "Long-term stability, wealth and family.", "Family finances are shaky."],
      ["Học điều mới, cơ hội nhỏ nhưng chắc.", "Thiếu thực tế, còn chần chừ.", "Learning something new; small but solid chances.", "Unrealistic or procrastinating."],
      ["Chắc chắn, đều đặn, đáng tin cậy.", "Trì trệ, hơi quá an phận.", "Steady, reliable, dependable.", "Stagnant, too comfortable."],
      ["Chu đáo, thực tế và biết vun vén.", "Lo toan cho người khác nhiều quá.", "Caring, practical and resourceful.", "Worrying too much about others."],
      ["Thành công và vững vàng về tài chính.", "Đặt nặng chuyện tiền bạc quá mức.", "Success and financial security.", "Too focused on money."],
    ],
  },
];

// ── Câu theo chủ đề: chất bài × chủ đề × xuôi/ngược ──
const TOPIC_LINE: Record<TarotSuit, Record<Exclude<TarotTopic, "general">, [string, string, string, string]>> = {
  major: {
    love: ["Về tình cảm, đây là dấu hiệu của một điều quan trọng — đáng để bạn nghiêm túc.", "Trong tình cảm có một bài học lớn bạn nên nhìn thẳng vào.", "In love, this points to something significant — take it seriously.", "There's a big lesson in love worth facing."],
    work: ["Về công việc, một bước ngoặt đáng kể đang đến.", "Công việc đang thử thách bạn, nhưng giúp bạn lớn lên nhiều.", "At work, a meaningful turning point is coming.", "Work is testing you, but helping you grow."],
    money: ["Tài chính có thay đổi lớn, chuẩn bị đón nhận nha.", "Tài chính cần xem lại tổng thể, đừng quyết định vội.", "Big changes in money — be ready.", "Review your finances as a whole; don't rush decisions."],
    travel: ["Chuyện đi xa, giấy tờ đang có bước chuyển lớn.", "Hồ sơ, giấy tờ cần xem lại thật kỹ, đừng nóng vội.", "Travel and paperwork are at a big turning point.", "Double-check your documents; don't rush."],
    study: ["Việc học đang ở một bước ngoặt quan trọng.", "Cần nhìn lại cách học của mình một chút.", "Your studies are at an important turning point.", "Time to rethink how you study."],
  },
  wands: {
    love: ["Tình cảm có lửa, nhiều hứng khởi và chủ động.", "Tình cảm dễ nóng giận hoặc nhanh chán — giữ lửa đều nha.", "Love is fiery, exciting and proactive.", "Quick tempers or fading sparks — keep the fire steady."],
    work: ["Công việc có động lực, hợp để khởi động dự án mới.", "Dễ cháy nhanh tắt nhanh; chia sức cho đều nhé.", "Motivated at work — great time to start something new.", "Burning bright then out; pace yourself."],
    money: ["Tiền đến từ sự chủ động và dám làm.", "Tránh đầu tư theo cảm hứng nhất thời.", "Money comes from initiative and boldness.", "Avoid impulse investments."],
    travel: ["Năng lượng dịch chuyển mạnh — hợp để chủ động nộp hồ sơ, lên đường.", "Dễ vội vàng; kiểm tra kỹ giấy tờ trước khi nộp nha.", "Strong movement energy — a good time to apply and go.", "Easy to rush; check your papers before submitting."],
    study: ["Học hăng say, hợp để bắt đầu một khoá mới.", "Dễ nản giữa chừng, chia nhỏ mục tiêu ra nha.", "Eager to learn — great time to start a new course.", "Easy to lose steam; break goals into small steps."],
  },
  cups: {
    love: ["Tình cảm là điểm sáng — cứ mở lòng ra nha.", "Cảm xúc hơi rối, nói chuyện thật lòng với nhau sẽ ổn hơn.", "Love is the bright spot — open your heart.", "Feelings are tangled; an honest talk will help."],
    work: ["Môi trường làm việc dễ chịu, đồng nghiệp hợp nhau.", "Cảm xúc đang ảnh hưởng tới công việc.", "A pleasant workplace with good colleagues.", "Emotions are spilling into work."],
    money: ["Tiền bạc đủ đầy, thoải mái chi cho niềm vui.", "Cẩn thận chi tiêu theo cảm xúc.", "Money is comfortable; room for small joys.", "Watch emotional spending."],
    travel: ["Chuyến đi mang lại niềm vui và những kết nối mới.", "Cảm xúc còn lẫn lộn về chuyến đi; hỏi lòng mình thật kỹ.", "The trip brings joy and new connections.", "Mixed feelings about the trip; listen to your heart."],
    study: ["Học cùng bạn bè, niềm vui giúp bạn tiến bộ.", "Tâm trạng đang ảnh hưởng tới việc học.", "Learning with friends helps you grow.", "Your mood is affecting your studies."],
  },
  swords: {
    love: ["Cần nói chuyện rõ ràng, thẳng thắn trong mối quan hệ.", "Dễ hiểu lầm vì lời nói — nhẹ nhàng hơn chút nha.", "Clear, honest communication is needed.", "Words may cause misunderstandings — be gentler."],
    work: ["Hợp để phân tích, lên kế hoạch và ra quyết định.", "Áp lực và tranh luận nơi làm việc; giữ cái đầu lạnh.", "Good time to analyze, plan and decide.", "Pressure and debates at work; keep a cool head."],
    money: ["Tính toán kỹ trước mọi khoản chi.", "Lo chuyện tiền hơi quá — ghi lại chi tiêu sẽ đỡ hơn.", "Think carefully before every expense.", "Money worries run high — tracking spending will help."],
    travel: ["Cần sắp xếp thông tin rõ ràng, chuẩn bị hồ sơ thật chỉn chu.", "Có thể vướng thủ tục, thông tin rối — hỏi thêm người có kinh nghiệm.", "Get your information in order and prepare a tidy file.", "Possible red tape — ask someone experienced."],
    study: ["Đầu óc minh mẫn, rất hợp để ôn thi.", "Áp lực thi cử đang cao, nhớ ngủ đủ nha.", "A clear mind — great for exam prep.", "Exam pressure is high; get enough sleep."],
  },
  pentacles: {
    love: ["Tình cảm bền vững, xây từ những điều thực tế.", "Đừng để chuyện tiền bạc chen vào tình cảm.", "Steady love built on practical things.", "Don't let money come between you."],
    work: ["Công việc ổn định, chăm chỉ sẽ được đền đáp.", "Công việc hơi trì trệ, nên làm mới kỹ năng.", "Stable work; diligence pays off.", "Work feels stuck; refresh your skills."],
    money: ["Tài chính thuận lợi, hợp để tích luỹ.", "Nên siết lại chi tiêu, tránh rủi ro.", "Finances look good — time to save.", "Tighten spending and avoid risks."],
    travel: ["Tài chính và giấy tờ vững thì mọi thứ sẽ thuận.", "Chi phí, chứng minh tài chính cần chuẩn bị kỹ hơn.", "Solid finances and papers make things smooth.", "Costs or proof of funds need more preparation."],
    study: ["Chăm chỉ đều đặn sẽ có kết quả chắc chắn.", "Học chưa đều, cần một lịch học cụ thể.", "Steady effort brings solid results.", "Inconsistent study; make a concrete schedule."],
  },
};

const ADVICE: Record<TarotSuit, [string, string, string, string]> = {
  major: ["Tin vào dòng chảy và mạnh dạn đón nhận thay đổi.", "Chậm lại, nhìn vào bên trong trước khi bước tiếp.", "Trust the flow and embrace change.", "Slow down and look inward before moving on."],
  wands: ["Hành động ngay khi còn hứng khởi!", "Nghỉ một nhịp để nạp lại năng lượng.", "Act while the spark is alive!", "Take a breath and recharge."],
  cups: ["Làm theo trái tim và chia sẻ cảm xúc thật.", "Chăm sóc cảm xúc của chính mình trước đã.", "Follow your heart and share how you feel.", "Take care of your own feelings first."],
  swords: ["Nghĩ cho rõ rồi nói thẳng điều cần nói.", "Bớt nghĩ quá nhiều, thả lỏng đầu óc chút nha.", "Think it through, then say what needs saying.", "Stop overthinking; give your mind a rest."],
  pentacles: ["Kiên trì từng bước nhỏ, thành quả sẽ đến.", "Xem lại kế hoạch thực tế và chi tiêu.", "Keep taking small steady steps — results will come.", "Review your practical plans and spending."],
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
        : "có thể lâu hơn bạn mong một chút — cần hoàn tất vài việc còn dang dở trước."
      : en
        ? "it comes with a clear turning point, possibly sudden — mostly when you're truly ready."
        : "sẽ đến cùng một bước ngoặt rõ ràng, có khi khá bất ngờ — chủ yếu là lúc bạn thật sự sẵn sàng."
  } else {
    const k = (d.id - 22) % 14;
    if (k <= 9) {
      const n = k + 1;
      const monthly = c.suit === "cups" || c.suit === "pentacles";
      const unit = en ? (monthly ? (n > 1 ? "months" : "month") : n > 1 ? "weeks" : "week") : monthly ? "tháng" : "tuần";
      body = en ? `roughly within ${n} ${unit}` : `khoảng ${n} ${unit} tới`;
      if (c.suit === "swords") body += en ? ", though things may feel rushed" : ", nhưng có thể hơi gấp gáp";
      body += d.rev ? (en ? " — reversed, so maybe a bit later than that." : " — lá ngược nên có thể trễ hơn chút.") : ".";
    } else {
      const court: [string, string][] = [
        ["sắp có tin — để ý tin nhắn, email trong thời gian gần nha.", "news is coming soon — watch your messages."],
        ["mọi việc sẽ chuyển động nhanh, khá sớm thôi.", "things will move fast — fairly soon."],
        ["cần thêm chút thời gian vun vén, tầm vài tháng.", "it needs some nurturing — a few months."],
        ["khi mọi thứ đã chín muồi và ổn định — cần kiên nhẫn.", "when everything is ripe and stable — be patient."],
      ];
      body = en ? court[k - 10][1] : court[k - 10][0];
      if (d.rev) body += en ? " (Reversed: possibly delayed.)" : " (Lá ngược: có thể chậm hơn.)";
    }
  }
  return en ? `The “${nm}” card suggests ${body}` : `Lá “${nm}” gợi ý ${body}`;
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
export function readingText(r: TarotReading, lang: L): string {
  const en = lang === "en";
  const kind = r.kind ?? "open";
  const q = r.question ?? "";
  const clar = r.cards.length === 1 && !!q;
  const pos = r.pos ?? TAROT_SPREADS.find((s) => s.id === r.spread)?.pos ?? [];
  const nums = ["①", "②", "③"];
  const out: string[] = [];

  if (!q) out.push(en ? pick(["Here's today's message for you ✨", "Lomi drew today's card for you 🔮"]) : pick(["Thông điệp hôm nay của bạn nè ✨", "Lá bài hôm nay Lomi rút cho bạn đây 🔮"]));
  else if (clar) out.push(en ? `One more card to clarify “${q}”:` : `Lomi rút thêm 1 lá để làm rõ “${q}” nè:`);
  else
    out.push(
      en
        ? pick([`Lomi shuffled the cards for “${q}” ✨`, `Your question: “${q}” — here's what the cards say 🔮`])
        : pick([`Lomi xáo bài cho câu hỏi “${q}” rồi nè ✨`, `Câu hỏi của bạn: “${q}” — cùng xem các lá bài nói gì nha 🔮`, `Hít một hơi… Lomi đã rút bài cho “${q}” ✨`]),
    );

  r.cards.forEach((d, i) => {
    const c = tarotCard(d.id);
    const name = en ? c.name.en : `${c.name.vi}${c.suit === "major" ? ` (${c.name.en})` : ""}`;
    const orient = d.rev ? (en ? "reversed" : "ngược") : en ? "upright" : "xuôi";
    const label = kind === "choice" && r.question ? null : pos[i];
    const head =
      kind === "choice"
        ? `${nums[i]} ${en ? "If you choose" : "Nếu chọn"} “${pos[i] ? (en ? pos[i].en : pos[i].vi) : ""}”: ${name} · ${orient}`
        : r.cards.length > 1 && label
          ? `${nums[i]} ${en ? label.en : label.vi}: ${name} · ${orient}`
          : `${name} · ${orient}`;
    let line = en ? (d.rev ? c.rev.en : c.up.en) : d.rev ? c.rev.vi : c.up.vi;
    if (r.topic !== "general") {
      const tl = TOPIC_LINE[c.suit][r.topic];
      line += ` ${en ? (d.rev ? tl[3] : tl[2]) : d.rev ? tl[1] : tl[0]}`;
    }
    out.push(`${head}\n${line}`);
  });

  // Trả lời thẳng câu hỏi theo loại.
  if (clar) {
    const sc = cardScore(r.cards[0]);
    out.push(
      en
        ? `🔎 This card ${sc > 0 ? "tips things toward the bright side" : sc < 0 ? "asks you to be careful and patient" : "says it's still open — your next step decides"}.`
        : `🔎 Lá này ${sc > 0 ? "kéo mọi thứ nghiêng về phía tích cực hơn" : sc < 0 ? "nhắc bạn cẩn thận và kiên nhẫn thêm chút" : "cho thấy mọi chuyện còn để ngỏ — bước tiếp theo của bạn sẽ quyết định"}.`,
    );
  } else if (kind === "timing") {
    out.push(`⏳ ${en ? "Timing" : "Về thời điểm"}: ${timingPhrase(r.cards[r.cards.length - 1], en)}`);
  } else if (kind === "yesno") {
    out.push(`🔎 ${en ? "The cards' answer" : "Lá bài trả lời"}: ${yesnoPhrase(r.cards, en)}`);
  } else if (kind === "choice" && r.pos) {
    const [a, b] = r.cards.map(cardScore);
    const [na, nb] = r.pos.map((p) => (en ? p.en : p.vi));
    out.push(
      `⚖️ ${
        a === b
          ? en
            ? "Both paths have their own merits — pick the one that makes your heart feel lighter."
            : "Cả hai đều có cái hay riêng — chọn cái khiến lòng bạn thấy nhẹ nhõm nhất nha."
          : en
            ? `The cards lean toward “${a > b ? na : nb}”.`
            : `Lá bài nghiêng về “${a > b ? na : nb}” hơn đó.`
      }`,
    );
  } else if (r.cards.length >= 3) {
    // Hỏi chung: nhận xét tổng.
    const notes: string[] = [];
    const suits = r.cards.map((d) => tarotCard(d.id).suit);
    const majors = suits.filter((x) => x === "major").length;
    const revs = r.cards.filter((d) => d.rev).length;
    const counts: Partial<Record<TarotSuit, number>> = {};
    suits.forEach((x) => (counts[x] = (counts[x] ?? 0) + 1));
    const dom = (Object.keys(counts) as TarotSuit[]).find((x) => x !== "major" && (counts[x] ?? 0) >= 2);
    if (majors >= 2)
      notes.push(en ? "Several Major Arcana showed up — this is a meaningful phase; what you choose now matters for a while." : "Có nhiều lá Ẩn Chính — đây là giai đoạn khá quan trọng, lựa chọn lúc này sẽ ảnh hưởng lâu dài đó.");
    if (dom) {
      const m: Record<string, [string, string]> = {
        wands: ["Chất Gậy nổi trội: năng lượng hành động và đam mê đang dẫn dắt bạn.", "Wands dominate: action and passion are leading you."],
        cups: ["Chất Cốc nổi trội: chuyện cảm xúc và các mối quan hệ là trọng tâm.", "Cups dominate: feelings and relationships are the focus."],
        swords: ["Chất Kiếm nổi trội: bạn đang suy nghĩ nhiều, có quyết định cần đưa ra.", "Swords dominate: lots of thinking, a decision to be made."],
        pentacles: ["Chất Tiền nổi trội: chuyện thực tế — tiền bạc, công việc — đang chiếm phần lớn tâm trí.", "Pentacles dominate: practical matters — money, work — are on your mind."],
      };
      notes.push(en ? m[dom][1] : m[dom][0]);
    }
    if (revs === r.cards.length)
      notes.push(en ? "All cards are reversed — energy feels blocked; slow down and look inward." : "Cả ba lá đều ngược — năng lượng đang hơi nghẽn, chậm lại và lắng nghe bản thân nha.");
    else if (revs === 0) notes.push(en ? "All upright — the energy flows smoothly for you." : "Cả ba lá đều xuôi — năng lượng khá thông suốt đó!");
    if (notes.length) out.push(`✨ ${en ? "Lomi notices" : "Lomi thấy"}: ${notes.join(" ")}`);
  }

  if (/(?<![a-z])(suc khoe|benh|mang thai|co bau|health|sick|pregnan)/.test(fold(q)))
    out.push(en ? "💚 For anything health-related, please check with a doctor too." : "💚 Chuyện sức khoẻ thì nhớ hỏi thêm bác sĩ nữa nha.");

  const adviceCard = kind === "choice" && r.cards.length === 2 ? (cardScore(r.cards[0]) >= cardScore(r.cards[1]) ? r.cards[0] : r.cards[1]) : r.cards[r.cards.length - 1];
  const adv = ADVICE[tarotCard(adviceCard.id).suit];
  out.push(`💡 ${en ? "Advice" : "Lời khuyên"}: ${en ? (adviceCard.rev ? adv[3] : adv[2]) : adviceCard.rev ? adv[1] : adv[0]}`);

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
