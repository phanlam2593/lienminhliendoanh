// 20/11 (Kir duyệt — "hướng lai"): Lomi trả lời bằng thư viện trên máy trước; CHỈ câu Lomi bí mới gửi sang Claude (Anthropic API).
//   • Key: secret ANTHROPIC_API_KEY (tài khoản trả trước của Kir ở platform.claude.com). Chưa có key / hết tiền / lỗi
//     → trả { fallback: true } (HTTP 200) để app giữ nguyên câu trả lời trên máy — không bao giờ làm khung chat lỗi.
//   • Chốt chi phí ở server (RPC consume_ai_chat_quota): 20 câu / người / ngày, 300 câu / ngày cho cả app; chỉ thành viên Membership còn hạn.
//     Gọi lỗi thì hoàn lượt (refund_ai_chat_quota).
//   • Model mặc định claude-haiku-5-5 (rẻ nhất); đổi bằng secret ANTHROPIC_MODEL nếu cần. max_tokens 600.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Giống prompt của ai-assistant (đã kiểm tra an toàn), đổi tên app thành iLomi, thêm phần riêng cho vai "dự phòng".
const BASE_PROMPT = `Bạn là "Lomi" — trợ lý trò chuyện bên trong ứng dụng iLomi (khẩu hiệu "Một cộng đồng – Nhiều giá trị") (một cộng đồng kết nối thành viên và doanh nghiệp địa phương ở Đà Lạt, Việt Nam).
Lomi giúp được: (1) cách dùng app, (2) tâm sự – tư vấn tâm lý, (3) chuyện tình cảm, (4) kiến thức sức khoẻ thường gặp, (5) bói Tarot khi người dùng tự xin, (6) trò chuyện thường ngày.

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
- Trả lời ngắn: tối đa khoảng 120 chữ, không dùng tiêu đề, tối đa 4 gạch đầu dòng.
- Sức khoẻ: chỉ nói điều đã được các nguồn y khoa chính thống thống nhất (Bộ Y tế, WHO, NHS, CDC…); không đưa liều thuốc, không chẩn đoán; nhắc đi khám khi cần.
- Không nói mình là Claude hay mô hình AI của hãng nào trừ khi được hỏi thẳng; nếu được hỏi, nói thật: câu này Lomi nhờ Claude (của Anthropic) trả lời.`;

type Msg = { role: "user" | "assistant"; content: string };

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

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ fallback: true, error: "AI_UNAVAILABLE" });

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
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-8)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
    if (typeof body?.card === "string") card = body.card.slice(0, 3000);
  } catch {
    return json({ fallback: true, error: "BAD_REQUEST" }, 400);
  }
  messages = normalize(messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ fallback: true, error: "BAD_REQUEST" }, 400);

  const { data: remaining, error: qErr } = await userClient.rpc("consume_ai_chat_quota");
  if (qErr) {
    const m = qErr.message ?? "";
    const code = /MEMBER_ONLY/.test(m) ? "MEMBER_ONLY" : /AI_LIMIT/.test(m) ? "AI_LIMIT" : /AI_BUSY_GLOBAL/.test(m) ? "AI_BUSY" : "QUOTA_ERROR";
    return json({ fallback: true, error: code });
  }
  const refund = async () => {
    try {
      await createClient(supabaseUrl, serviceKey).rpc("refund_ai_chat_quota", { _uid: uid });
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
      body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: 600, system, messages }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("lomi-claude anthropic", res.status, t.slice(0, 300));
      await refund();
      const code = /credit balance/i.test(t) ? "AI_CREDITS" : res.status === 429 || res.status === 529 ? "AI_BUSY" : "AI_ERROR";
      return json({ fallback: true, error: code });
    }
    const data = await res.json();
    const reply = (Array.isArray(data?.content) ? data.content : [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => String(b.text))
      .join("\n")
      .trim();
    if (!reply) {
      await refund();
      return json({ fallback: true, error: "AI_ERROR" });
    }
    return json({ reply, remaining });
  } catch (e) {
    console.error("lomi-claude", e);
    await refund();
    return json({ fallback: true, error: "AI_ERROR" });
  }
});
