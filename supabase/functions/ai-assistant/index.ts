// Trợ lý AI trong app — CHỈ dành cho thành viên (is_active_member). 30/09: bỏ giới hạn 20 câu/ngày,
// RPC consume_ai_chat_quota chỉ còn chốt chống spam 200 câu/ngày; gọi AI lỗi thì hoàn lượt.
//
// NHÀ CUNG CẤP AI (30/09, theo ý Kir — không phụ thuộc số dư AI của Lovable):
// • Có secret GEMINI_API_KEY (key Google AI Studio của Kir) → gọi THẲNG Google Gemini, không qua Lovable.
//   Model lấy từ secret GEMINI_MODEL (nếu có), không thì thử lần lượt MODEL_FALLBACKS.
// • Chưa có GEMINI_API_KEY → dùng cổng AI của Lovable như trước (LOVABLE_API_KEY).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// 21/10 (audit Lomi): prompt khớp với Lomi trên máy — tên Lomi, đủ phạm vi (app · tâm lý · tình cảm · sức khoẻ · Tarot · trò chuyện),
//   giới hạn an toàn (khủng hoảng, quá liều / ngộ độc, không chẩn đoán, không kê liều) và giọng nói chuyện tự nhiên.
//   AI_ENABLED ở AiAssistant.tsx vẫn = false: prompt này chỉ có tác dụng khi bật lại AI.
const SYSTEM_PROMPT = `Bạn là "Lomi" — trợ lý trò chuyện bên trong ứng dụng Liên Minh Liên Doanh (một cộng đồng kết nối thành viên và doanh nghiệp địa phương ở Đà Lạt, Việt Nam).
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

type Msg = { role: "user" | "assistant"; content: string };

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Google hay đổi/ngừng tên model → alias "latest" trước, rồi tên cố định làm dự phòng.
const MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];

type AiResult = { reply: string } | { error: "AI_BUSY" | "AI_CREDITS" | "AI_ERROR" };

async function callChat(url: string, key: string, model: string, messages: unknown[]): Promise<Response> {
  return await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
}

async function readReply(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

async function askAi(messages: unknown[]): Promise<AiResult> {
  const gemini = Deno.env.get("GEMINI_API_KEY");
  if (gemini) {
    const custom = Deno.env.get("GEMINI_MODEL");
    const models = custom ? [custom, ...MODEL_FALLBACKS.filter((m) => m !== custom)] : MODEL_FALLBACKS;
    for (const model of models) {
      const res = await callChat(GEMINI_URL, gemini, model, messages);
      if (res.ok) {
        const reply = await readReply(res);
        return reply ? { reply } : { error: "AI_ERROR" };
      }
      const detail = await res.text().catch(() => "");
      console.error(`gemini ${model} -> ${res.status}: ${detail.slice(0, 300)}`);
      if (res.status === 429) return { error: "AI_BUSY" }; // hết hạn mức miễn phí / quá nhanh
      if (res.status === 400 || res.status === 404) continue; // model không tồn tại → thử model kế
      return { error: "AI_ERROR" };
    }
    return { error: "AI_ERROR" };
  }
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  if (!lovable) return { error: "AI_ERROR" };
  const res = await callChat(LOVABLE_URL, lovable, "google/gemini-2.5-flash", messages);
  if (!res.ok) return { error: res.status === 429 ? "AI_BUSY" : res.status === 402 ? "AI_CREDITS" : "AI_ERROR" };
  const reply = await readReply(res);
  return reply ? { reply } : { error: "AI_ERROR" };
}

// Mốc thời gian thật (giờ Việt Nam) gắn vào cuối system prompt mỗi lần gọi — trước đây model
// không biết hôm nay là ngày nào nên tự đoán sai.
function nowLine(): string {
  const now = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o }).format(now);
  return `\n\nThời điểm hiện tại (giờ Việt Nam): ${fmt({ weekday: "long" })}, ngày ${fmt({ day: "2-digit", month: "2-digit", year: "numeric" })}, ${fmt({ hour: "2-digit", minute: "2-digit", hour12: false })}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "NOT_AUTH" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!Deno.env.get("GEMINI_API_KEY") && !Deno.env.get("LOVABLE_API_KEY")) return json({ error: "AI_UNAVAILABLE" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData } = await userClient.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return json({ error: "NOT_AUTH" }, 401);

  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "BAD_REQUEST" }, 400);

  // Trừ lượt (kiểm tra membership + chốt chống spam nằm trong RPC).
  const { data: remaining, error: qErr } = await userClient.rpc("consume_ai_chat_quota");
  if (qErr) {
    const code = /MEMBER_ONLY/.test(qErr.message) ? "MEMBER_ONLY" : /AI_LIMIT/.test(qErr.message) ? "AI_LIMIT" : "QUOTA_ERROR";
    return json({ error: code }, code === "QUOTA_ERROR" ? 500 : 403);
  }

  const refund = async () => {
    const admin = createClient(supabaseUrl, serviceKey);
    await admin.rpc("refund_ai_chat_quota", { _uid: uid });
  };

  try {
    const out = await askAi([{ role: "system", content: SYSTEM_PROMPT + nowLine() }, ...messages]);
    if ("error" in out) {
      await refund();
      return json({ error: out.error }, 502);
    }
    return json({ reply: out.reply, remaining });
  } catch (e) {
    console.error("ai-assistant", e);
    await refund();
    return json({ error: "AI_ERROR" }, 502);
  }
});
