// Trợ lý AI trong app — CHỈ dành cho thành viên (is_active_member), 20 câu/ngày.
// Quota trừ qua RPC consume_ai_chat_quota (chạy bằng JWT của user); gọi AI lỗi thì hoàn lượt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `Bạn là "Trợ lý Liên Minh Liên Doanh" — trợ lý AI bên trong ứng dụng Liên Minh Liên Doanh (luôn gọi đúng tên này, không viết tắt).
Ứng dụng kết nối thành viên và doanh nghiệp địa phương tại Việt Nam. Trả lời NGẮN GỌN, thân thiện, bằng ngôn ngữ người dùng hỏi (mặc định tiếng Việt).

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

Quy tắc:
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
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI_UNAVAILABLE" }, 500);

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

  // Trừ lượt (kiểm tra membership + giới hạn 20/ngày nằm trong RPC).
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
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT + nowLine() }, ...messages],
      }),
    });
    if (!res.ok) {
      await refund();
      const code = res.status === 429 ? "AI_BUSY" : res.status === 402 ? "AI_CREDITS" : "AI_ERROR";
      return json({ error: code }, 502);
    }
    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "";
    if (!reply) {
      await refund();
      return json({ error: "AI_ERROR" }, 502);
    }
    return json({ reply, remaining });
  } catch {
    await refund();
    return json({ error: "AI_ERROR" }, 502);
  }
});
