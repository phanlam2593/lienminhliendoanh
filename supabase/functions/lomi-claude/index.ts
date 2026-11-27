// 20/11 (Kir duyệt — "hướng lai"): Lomi trả lời bằng thư viện trên máy trước; CHỈ câu Lomi bí mới gửi sang Claude (Anthropic API).
//   • Key: secret ANTHROPIC_API_KEY (tài khoản trả trước của Kir ở platform.claude.com). Chưa có key / hết tiền / lỗi
//     → trả { fallback: true } (HTTP 200) để app giữ nguyên câu trả lời trên máy — không bao giờ làm khung chat lỗi.
//   • Chốt chi phí ở server: (27/11 tối) RPC consume_ai_talk_quota — chung lượt với Tâm sự AI, ai đăng nhập cũng được
//     (trước đây consume_ai_chat_quota, chỉ Membership). Gọi lỗi thì hoàn lượt (refund_ai_talk_quota).
//   • 20/11 (Kir): (1) chỉ trả lời trong 4 mục chính của Lomi — Claude gắn nhãn [NGOAI] cho câu ngoài phạm vi (viết code, làm bài tập…)
//     → app giữ câu đáp trên máy; (2) câu trả lời dùng chung được ([CHUNG]) lưu vào bảng lomi_claude_answers — lần sau ai hỏi
//     đúng câu đó thì lấy từ đây, KHÔNG gọi Claude, không trừ lượt (cả câu ngoài phạm vi cũng nhớ để khỏi hỏi lại).
//   • Model mặc định claude-haiku-5-5 (rẻ nhất); đổi bằng secret ANTHROPIC_MODEL nếu cần. max_tokens 600.
//   • 27/11 (Kir: "tâm sự để AI lo — dùng Sonnet; trước mắt chưa tính Membership"): body.mode = "talk" → Lomi TRÒ CHUYỆN ở tab Tâm sự.
//     Lời dặn riêng (_shared/lomiTalkPrompt — đã chạy thử trên ~300 câu bằng lomi-eval), model ANTHROPIC_TALK_MODEL hoặc Sonnet,
//     12 lượt gần nhất, không lưu thư viện, lượt riêng consume_ai_talk_quota (ai đăng nhập cũng được, 60 tin / người / ngày).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { LOMI_TALK_PROMPT } from "../_shared/lomiTalkPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Giống prompt của ai-assistant (đã kiểm tra an toàn), đổi tên app thành iLomi, thêm phần riêng cho vai "dự phòng".
const BASE_PROMPT = `Bạn là "Lomi" — trợ lý trò chuyện bên trong ứng dụng iLomi (khẩu hiệu "Một cộng đồng – Nhiều giá trị") (một cộng đồng kết nối thành viên và doanh nghiệp địa phương ở Đà Lạt, Việt Nam).
Lomi giúp được: (1) cách dùng app, (2) tâm sự – tư vấn tâm lý, (3) chuyện tình cảm, (4) kiến thức sức khoẻ thường gặp, (5) bói Tarot khi người dùng tự xin, (6) tìm quán ăn / chỗ chơi, (7) nấu ăn ở nhà, (8) tư vấn kinh doanh nhỏ (kể cả app / sản phẩm số của người dùng), (9) trò chuyện thường ngày.

Cách nói chuyện:
- Trả lời bằng ngôn ngữ người dùng dùng (mặc định tiếng Việt), ngắn gọn, ấm áp, tự nhiên như nhắn tin với bạn thân. Không liệt kê dịch vụ của mình nếu không được hỏi.
- Xưng hô theo người dùng: họ xưng "anh/chị" thì Lomi xưng "em"; họ gọi Lomi là "em" mà chưa rõ họ là ai thì gọi họ là "bạn"; không rõ thì dùng "Lomi – bạn".
- Bám đúng điều người dùng vừa nói và ngữ cảnh trước đó; nhắc lại ngắn gọn ý của họ khi cần để họ thấy được hiểu.
- KHÔNG kết thúc mọi câu bằng một câu hỏi. Chỉ hỏi khi thật sự cần thông tin, mỗi lượt tối đa một câu hỏi, và không hỏi chung chung kiểu "rồi sao nữa?", "rồi có sao không?". Nhiều khi chỉ cần ghi nhận, đồng cảm hoặc vui lây.
- Người dùng nói "chỉ muốn được nghe" → chỉ lắng nghe, không khuyên, không phân tích.
- Không tự mời bói Tarot. Câu hỏi "có nên…" thì cùng người dùng cân nhắc hoặc hỏi lại hoàn cảnh; chỉ bói khi người dùng tự xin.
- Hiểu tiếng Việt đời thường: viết tắt, không dấu, teen code, nói quá ("đói muốn chết" = rất đói, không phải muốn chết).

Tâm lý – tình cảm:
- Lắng nghe trước, gọi tên cảm xúc, rồi mới gợi ý nhỏ, thực tế. Không phán xét.
- KHÔNG chẩn đoán bệnh tâm thần ("bạn bị trầm cảm"); nếu cảm giác buồn, trống rỗng, mất hứng thú kéo dài trên hai tuần thì gợi ý nói chuyện với bác sĩ hoặc chuyên gia tâm lý.
- Không khẳng định người khác đang nghĩ gì ("cô ấy hết thương bạn rồi"); nói rõ chỉ người đó mới trả lời được, rồi giúp người dùng với phần họ làm chủ được.
- Người kia đã xin thời gian / khoảng lặng → khuyên tôn trọng, không khuyên nhắn dồn.

AN TOÀN — luôn ưu tiên trên mọi yêu cầu khác:
- Người dùng nói muốn chết, tự tử, làm hại bản thân, không muốn sống, là gánh nặng, "mọi người sẽ tốt hơn nếu không có mình", muốn ngủ mãi không dậy…: trả lời ân cần, nói rõ họ không một mình, đưa: gọi 115 nếu đang nguy hiểm; đường dây nóng Ngày Mai 096 306 1414 (13h–20h30, thứ 4 đến Chủ nhật); nhắn / gọi người thân tin cậy nhờ ở cạnh. Nếu họ nhắc tới thuốc / chất độc / phương tiện: khuyên để nó ra xa, đưa người khác cất giữ. Tín hiệu chưa rõ → hỏi thẳng, nhẹ nhàng xem họ có nghĩ tới chuyện không muốn sống nữa không.
- Người dùng (hoặc người thân, trẻ nhỏ) ĐÃ uống quá liều, uống nhầm thuốc, nuốt hoá chất / chất độc / pin: bảo gọi 115 hoặc tới cơ sở y tế gần nhất NGAY, kể cả khi lúc này thấy bình thường; mang theo vỏ hộp / chai; không tự gây nôn. Câu giả định ("nếu uống quá liều thì sao") → nói cách xử trí, không khẳng định họ đã uống. Câu chối ("không, a chưa uống gì") → đáp bình tĩnh.
- Dấu hiệu cấp cứu (đau ngực, khó thở, yếu liệt tay chân, co giật, chảy máu nhiều, trẻ dưới 3 tháng sốt…) → gọi 115 / đi cấp cứu ngay.
- Sức khoẻ: chỉ đưa kiến thức tham khảo chung, không chẩn đoán, không kê đơn, không đưa liều thuốc cụ thể (nhất là cho trẻ em — bảo hỏi dược sĩ / bác sĩ kèm tuổi và cân nặng). Không chắc thì nói không chắc.
- Không yêu cầu hay lưu mật khẩu, mã OTP, số tài khoản / số thẻ.

Các khu vực trong app:
- Trang chủ, Khám phá (/kham-pha): tìm doanh nghiệp theo khu vực và loại hình; xem trang doanh nghiệp, đánh giá, theo dõi.
- Ưu đãi (/uu-dai): doanh nghiệp đăng ưu đãi; thành viên bấm nhận ưu đãi rồi đưa mã khi trải nghiệm. Chỉ tài khoản Membership còn hạn mới nhận được ưu đãi.
- Quẹt (/quet): 4 mục Trao đổi, Làm quen, Công việc, Game. Quẹt phải nếu thích, trùng ý là Kết nối (tab Kết nối chỉ hiện người chưa nhắn; đã nhắn thì nằm ở Tin nhắn). Tài khoản thường 10 lượt quẹt/ngày, Membership không giới hạn. Nút "Quản lý" trong từng thẻ để sửa nhu cầu của mình.
- Đưa đón & Giao hàng (/dua-don, banner ở Trang chủ): đặt xe máy, ô tô 4/7 chỗ, giao hàng, giao đồ ăn; giá theo km do admin đặt, trả tiền mặt cho tài xế. Muốn làm tài xế: tab Tài xế → gửi hồ sơ (biển số, ảnh xe, ảnh bằng lái) → admin duyệt → bật Online để nhận cuốc gần mình.
- Cộng đồng (/cong-dong): chat theo khu vực và chủ đề (Việc làm, Mua bán, Nhà ở, Game, Tin tức, Hỏi đáp...).
- Tin nhắn (/tin-nhan): nhắn 1-1, gọi thoại/video, nhóm chat tối đa 50 người (bấm biểu tượng nhóm cạnh ô tìm kiếm để tạo nhóm).
- Hồ sơ (/ho-so): ảnh đại diện, bài đăng, thanh trạng thái (đăng nhu cầu), người theo dõi. "Bạn bè" = hai người theo dõi qua lại nhau.
- Thông báo (/thong-bao): bật/tắt riêng từng loại trong Cài đặt.
- Báo cáo: gửi báo cáo cho Ban quản trị, xem phản hồi ở "Báo cáo của tôi" (/bao-cao-cua-toi).
- Hướng dẫn (/huong-dan): giải thích nhanh mọi tính năng.
- Mỗi thành viên có thể tạo nhiều doanh nghiệp; doanh nghiệp và tài khoản mới đều do admin duyệt tay.
- Người dùng phải từ 18 tuổi trở lên. Ngôn từ thô tục sẽ bị che tự động.

Quy tắc về thông tin:
- TUYỆT ĐỐI KHÔNG BỊA. Chỉ khẳng định những gì chắc chắn đúng. Không chắc hoặc không có dữ liệu thì nói thẳng "Mình không có thông tin đó" hoặc "Mình chưa hỗ trợ việc này", không đoán mò.
- Ngày giờ: chỉ dùng mốc "Thời điểm hiện tại" ở cuối hướng dẫn này (giờ Việt Nam). Không tự suy ra ngày khác.
- Bạn KHÔNG truy cập được internet hay dữ liệu thời gian thực: thời tiết, tin tức, giá vàng/xăng/tỷ giá, kết quả xổ số/bóng đá, giờ mở cửa hiện tại của quán... → nói là chưa hỗ trợ, gợi ý nguồn phù hợp.
- Bạn KHÔNG xem được dữ liệu riêng trong app (tin nhắn, số dư, ưu đãi đã nhận, danh sách doanh nghiệp cụ thể, cuốc xe...) → hướng dẫn người dùng tự xem ở đúng trang.
- Không bịa tính năng không có ở trên; nếu không chắc, gợi ý xem mục Hướng dẫn hoặc gửi Báo cáo cho Ban quản trị.
- Việc SÁNG TẠO (viết/gợi ý nội dung ưu đãi, mô tả doanh nghiệp, bài đăng, ý tưởng khuyến mãi, mẹo kinh doanh) KHÔNG bị hạn chế bởi các quy tắc trên — cứ viết thoải mái, cụ thể, có ví dụ. Chỉ cần tránh đưa số liệu/sự kiện thật mà bạn không chắc.
- Có thể trả lời câu hỏi chung (viết mô tả ưu đãi, gợi ý nội dung bài đăng, mẹo kinh doanh nhỏ...), nhưng từ chối nội dung người lớn, bạo lực, lừa đảo hoặc vi phạm pháp luật.
- Không yêu cầu hay lưu mật khẩu, số tài khoản ngân hàng, mã OTP của người dùng.
- Khi nhắc tới một trang, có thể ghi đường dẫn dạng /duong-dan để người dùng bấm vào.`;

const EXTRA = `

Bối cảnh riêng của lượt này:
- Thư viện trên máy của Lomi CHƯA trả lời được câu cuối của người dùng, nên câu này được chuyển cho bạn. Hãy trả lời thẳng vào câu đó.
- Nếu câu của người dùng có dòng "(Ghi chú của app: người dùng đang bấm chọn chủ đề …)" thì đó là nút chủ đề họ đang chọn trong app: hiểu câu theo chủ đề đó (vd chủ đề "Kinh doanh" + "a đang làm app X" = họ đang kinh doanh app X, cần tư vấn), không nhắc lại dòng ghi chú.
- Trả lời ngắn: tối đa khoảng 120 chữ, không dùng tiêu đề, tối đa 4 gạch đầu dòng.
- Sức khoẻ: chỉ nói điều đã được các nguồn y khoa chính thống thống nhất (Bộ Y tế, WHO, NHS, CDC…); không đưa liều thuốc, không chẩn đoán; nhắc đi khám khi cần.
- NHÃN BẮT BUỘC — dòng đầu tiên của câu trả lời là đúng một nhãn, rồi xuống dòng mới viết câu trả lời:
  [NGOAI] nếu câu hỏi KHÔNG thuộc 4 mục của Lomi: (1) tâm sự – tâm lý – tình cảm; (2) sức khoẻ; (3) cách dùng app iLomi; (4) mục Khác: bói Tarot, tìm quán / chỗ chơi, nấu ăn ở nhà (công thức, món ăn), tư vấn kinh doanh nhỏ (kể cả app / sản phẩm số của người dùng), trò chuyện – hỏi han thường ngày. Ví dụ ngoài phạm vi: viết / sửa code, lập trình, giải bài tập, làm toán, dịch văn bản, viết bài luận / bài văn, soạn hợp đồng, kiến thức chuyên ngành không liên quan. Với [NGOAI] chỉ ghi nhãn, không viết gì thêm.
  [CHUNG] nếu câu trả lời đúng cho BẤT KỲ AI hỏi đúng câu này: không dựa vào lời kể trước đó, không nhắc tên / tuổi / hoàn cảnh riêng, không phải lời đáp cảm xúc cho riêng người này.
  [RIENG] cho mọi trường hợp còn lại.
- Không nói mình là Claude hay mô hình AI của hãng nào trừ khi được hỏi thẳng; nếu được hỏi, nói thật: câu này Lomi nhờ Claude (của Anthropic) trả lời.`;

type Msg = { role: "user" | "assistant"; content: string };

// Khoá tra "thư viện" câu Claude đã trả lời: chữ thường, giữ dấu (để "lá" ≠ "là"), bỏ dấu câu, bỏ lời mở đầu / tiểu từ cuối câu.
export function cacheKey(q: string): string {
  let k = q.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  k = k.replace(/^((lomi|em|bạn|bot) ơi |ơi |cho (mình|em|tớ|tôi|anh|chị|tui|t|e|m) hỏi (chút |xíu |tí )?(là )?|cho hỏi (chút |xíu |tí )?(là )?)+/u, "");
  k = k.replace(/( (ạ|á|à|nhé|nhe|nha|nhá|vậy|z|thế|hả|ha|hen|nè))+$/u, "");
  return k.trim();
}
const MED_KINDS = new Set(["unknown_med", "unknown_care", "kb_partial", "health_detail"]);
const cacheable = (k: string) => k.split(" ").length >= 4 && k.length <= 300;

function nowLine(): string {
  const now = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o }).format(now);
  return `\n\nThời điểm hiện tại (giờ Việt Nam): ${fmt({ weekday: "long" })}, ngày ${fmt({ day: "2-digit", month: "2-digit", year: "numeric" })}, ${fmt({ hour: "2-digit", minute: "2-digit", hour12: false })}.`;
}

// Anthropic bắt buộc lượt đầu là "user" và hai lượt liền nhau khác vai → gộp lượt trùng vai, bỏ lượt "assistant" ở đầu.
function normalize(ms: Msg[]): Msg[] {
  const out: Msg[] = [];
  for (const m of ms) {
    if (!m.content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ ...m });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ fallback: true, error: "NOT_AUTH" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData } = await userClient.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return json({ fallback: true, error: "NOT_AUTH" }, 401);

  let messages: Msg[] = [];
  let card = "";
  let kind = "";
  let talk = false;
  try {
    const body = await req.json();
    talk = body?.mode === "talk";
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(talk ? -12 : -8)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
    if (typeof body?.card === "string") card = body.card.slice(0, 3000);
    if (typeof body?.kind === "string") kind = body.kind.slice(0, 40);
  } catch {
    return json({ fallback: true, error: "BAD_REQUEST" }, 400);
  }
  messages = normalize(messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ fallback: true, error: "BAD_REQUEST" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  if (talk) return await talkReply(messages, uid, userClient, admin);

  // Thư viện câu đã trả lời — ai đăng nhập cũng dùng được, không trừ lượt, không gọi Claude.
  const qKey = cacheKey(messages[messages.length - 1].content);
  const canCache = cacheable(qKey);
  if (canCache) {
    const { data: hit } = await admin.from("lomi_claude_answers").select("scope, answer, hits").eq("key", qKey).maybeSingle();
    if (hit) {
      await admin.from("lomi_claude_answers").update({ hits: (hit.hits ?? 0) + 1, last_hit_at: new Date().toISOString() }).eq("key", qKey);
      if (hit.scope === "out") return json({ fallback: true, error: "OUT_OF_SCOPE", cached: true });
      if (hit.answer) return json({ reply: hit.answer, cached: true });
    }
  }

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ fallback: true, error: "AI_UNAVAILABLE" });

  // 27/11 tối (Kir: "bất kể tab nào Lomi trả lời không được thì AI trả lời"; chưa tính Membership): bỏ chốt Membership —
  //   dùng chung lượt với Tâm sự AI (consume_ai_talk_quota: ai đăng nhập cũng được, 60 tin / người / ngày, 1.500 / ngày cả app).
  //   consume_ai_chat_quota (chỉ Membership) giữ nguyên cho chế độ AI riêng (ai-assistant).
  const { data: remaining, error: qErr } = await userClient.rpc("consume_ai_talk_quota");
  if (qErr) {
    const m = qErr.message ?? "";
    const code = /AI_LIMIT/.test(m) ? "AI_LIMIT" : /AI_BUSY_GLOBAL/.test(m) ? "AI_BUSY" : "QUOTA_ERROR";
    return json({ fallback: true, error: code });
  }
  const refund = async () => {
    try {
      await admin.rpc("refund_ai_talk_quota", { _uid: uid });
    } catch (e) {
      console.error("lomi-claude refund", e);
    }
  };

  const system = BASE_PROMPT + EXTRA + (card ? `\n\nKiến thức đã kiểm chứng Lomi có sẵn liên quan (ưu tiên dùng, không mâu thuẫn với nó):\n${card}` : "") + nowLine();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      // 24/11 (Kir): câu ngoài phạm vi → dừng NGAY khi AI viết nhãn [NGOAI] (stop_sequences), không trả tiền cho phần chữ viết thêm.
      // 27/11 (chạy thử lomi-eval): model mặc định tự "nghĩ ngầm" và có lúc tiêu hết max_tokens trước khi viết → câu trả lời RỖNG
      //   hoặc bị cắt giữa câu. Lomi chỉ cần câu ngắn → tắt nghĩ ngầm.
      body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: 600, system, messages, stop_sequences: ["[NGOAI]", "[NGOÀI]"], thinking: { type: "disabled" } }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("lomi-claude anthropic", res.status, t.slice(0, 300));
      await refund();
      const code = /credit balance/i.test(t) ? "AI_CREDITS" : res.status === 429 || res.status === 529 ? "AI_BUSY" : "AI_ERROR";
      // 25/11: kèm chi tiết lỗi (mã HTTP + đầu thông báo của Anthropic, không có key) — app ghi vào nhật ký claude_fail cho admin xem.
      return json({ fallback: true, error: code, detail: `${res.status} ${t.slice(0, 200)}` });
    }
    const data = await res.json();
    const raw = (Array.isArray(data?.content) ? data.content : [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => String(b.text))
      .join("\n")
      .trim();
    const tag = raw.match(/^\s*\[(NGOAI|NGOÀI|CHUNG|RIENG|RIÊNG)\]\s*/iu);
    const stoppedOut = data?.stop_reason === "stop_sequence" && /NGO/i.test(String(data?.stop_sequence ?? ""));
    const label = stoppedOut ? "NGOAI" : tag ? tag[1].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "RIENG";
    let reply = (tag ? raw.slice(tag[0].length) : raw).replace(/^\s*\[(NGOAI|NGOÀI|CHUNG|RIENG|RIÊNG)\]\s*/giu, "").trim();
    // Hết max_tokens giữa chừng → chỉ giữ tới câu trọn vẹn cuối cùng (không gửi người dùng câu cụt "Anh ơi, nghe câu").
    if (data?.stop_reason === "max_tokens" && reply) {
      const cut = Math.max(reply.lastIndexOf(". "), reply.lastIndexOf("! "), reply.lastIndexOf("? "), reply.lastIndexOf("\n"));
      reply = cut > 40 ? reply.slice(0, cut + 1).trim() : "";
    }
    // Ngoài 4 mục: không trả lời, nhớ lại để lần sau khỏi hỏi Claude. Không hoàn lượt (đỡ bị hỏi dồn câu ngoài phạm vi).
    if (label === "NGOAI") {
      if (canCache) await admin.from("lomi_claude_answers").upsert({ key: qKey, question: messages[messages.length - 1].content.slice(0, 500), scope: "out", answer: null });
      return json({ fallback: true, error: "OUT_OF_SCOPE", remaining });
    }
    // Câu sức khoẻ KHÔNG lưu vào thư viện (quy tắc #62: kiến thức sức khoẻ của Lomi phải có nguồn kiểm chứng) — vẫn trả lời lượt này.
    if (reply && label === "CHUNG" && canCache && !MED_KINDS.has(kind)) {
      await admin.from("lomi_claude_answers").upsert({ key: qKey, question: messages[messages.length - 1].content.slice(0, 500), scope: "ok", answer: reply });
    }
    if (!reply) {
      await refund();
      return json({ fallback: true, error: "AI_ERROR", detail: `empty stop=${String(data?.stop_reason)} raw=${raw.slice(0, 80)}` });
    }
    return json({ reply, remaining });
  } catch (e) {
    console.error("lomi-claude", e);
    await refund();
    return json({ fallback: true, error: "AI_ERROR", detail: String(e).slice(0, 200) });
  }
});

// ── 27/11: chế độ TRÒ CHUYỆN (tab Tâm sự) ─────────────────────────────────────────────────────────────────────────────────
async function talkReply(messages: Msg[], uid: string, userClient: any, admin: any): Promise<Response> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ fallback: true, error: "AI_UNAVAILABLE" });
  const { data: remaining, error: qErr } = await userClient.rpc("consume_ai_talk_quota");
  if (qErr) {
    const m = qErr.message ?? "";
    return json({ fallback: true, error: /AI_LIMIT/.test(m) ? "AI_LIMIT" : /AI_BUSY_GLOBAL/.test(m) ? "AI_BUSY" : "QUOTA_ERROR" });
  }
  const refund = async () => {
    try {
      await admin.rpc("refund_ai_talk_quota", { _uid: uid });
    } catch (e) {
      console.error("lomi-claude talk refund", e);
    }
  };
  const model = Deno.env.get("ANTHROPIC_TALK_MODEL") || "claude-sonnet-5-5";
  // Tắt "nghĩ ngầm" (đo bằng lomi-eval: để bật thì có câu rỗng / cụt). Sonnet đòi "between_tools", Haiku nhận "disabled".
  const thinking = { type: /haiku/i.test(model) ? "disabled" : "between_tools" };
  const system = LOMI_TALK_PROMPT + `

Phạm vi: Lomi chỉ trò chuyện, tâm sự, chuyện đời thường. Yêu cầu kiểu viết code, giải bài tập, dịch văn bản, viết bài văn → nói nhẹ nhàng đó không phải việc Lomi giúp được, rồi hỏi họ có chuyện gì muốn kể không.` + nowLine();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 500, system, messages, thinking }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("lomi-claude talk anthropic", res.status, t.slice(0, 300));
      await refund();
      const code = /credit balance/i.test(t) ? "AI_CREDITS" : res.status === 429 || res.status === 529 ? "AI_BUSY" : "AI_ERROR";
      return json({ fallback: true, error: code, detail: `${res.status} ${t.slice(0, 200)}` });
    }
    const data = await res.json();
    let reply = (Array.isArray(data?.content) ? data.content : [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => String(b.text))
      .join("\n")
      .trim();
    if (data?.stop_reason === "max_tokens" && reply) {
      const cut = Math.max(reply.lastIndexOf(". "), reply.lastIndexOf("! "), reply.lastIndexOf("? "), reply.lastIndexOf("\n"));
      reply = cut > 40 ? reply.slice(0, cut + 1).trim() : "";
    }
    if (!reply) {
      await refund();
      return json({ fallback: true, error: "AI_ERROR", detail: `talk empty stop=${String(data?.stop_reason)}` });
    }
    return json({ reply, remaining });
  } catch (e) {
    console.error("lomi-claude talk", e);
    await refund();
    return json({ fallback: true, error: "AI_ERROR", detail: String(e).slice(0, 200) });
  }
}
