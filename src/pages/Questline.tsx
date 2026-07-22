import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw, PartyPopper } from "lucide-react";

interface Quest {
  id: string;
  category: string;
  title: string;
  action: string;
  expect: string;
}

const QUESTS: Quest[] = [
  // Tài khoản & Hồ sơ
  { id: "acc-login", category: "Tài khoản & Hồ sơ", title: "Đăng nhập", action: "Đăng xuất rồi đăng nhập lại bằng đúng tài khoản đang test.", expect: "Vào lại được trang chủ, không lỗi." },
  { id: "acc-avatar", category: "Tài khoản & Hồ sơ", title: "Đổi ảnh đại diện", action: "Vào Hồ sơ → đổi ảnh đại diện + trạng thái (status message).", expect: "Ảnh mới hiện ngay, không cần tải lại trang." },
  { id: "acc-password", category: "Tài khoản & Hồ sơ", title: "Đổi mật khẩu", action: "Cài đặt → Đổi mật khẩu.", expect: "Đổi thành công, đăng xuất rồi đăng nhập lại bằng mật khẩu mới được." },
  { id: "acc-dark", category: "Tài khoản & Hồ sơ", title: "Dark mode", action: "Bật/tắt chế độ tối trong Cài đặt.", expect: "Toàn bộ giao diện đổi màu đúng, không chỗ nào 'lệch tông' (chữ trắng trên nền trắng...)." },
  { id: "acc-lang", category: "Tài khoản & Hồ sơ", title: "Đổi ngôn ngữ", action: "Đổi từ Tiếng Việt sang English trong Cài đặt.", expect: "Toàn app đổi ngôn ngữ, không còn chữ Việt sót lại." },
  { id: "acc-otherprofile", category: "Tài khoản & Hồ sơ", title: "Xem hồ sơ người khác", action: "Bấm vào tên/avatar 1 người khác bất kỳ (trong đánh giá, chat...).", expect: "Hiện đúng tên thật — KHÔNG hiện 'Ẩn danh'." },
  { id: "acc-follow", category: "Tài khoản & Hồ sơ", title: "Theo dõi & danh sách", action: "Theo dõi 1 người, mở lại danh sách 'Đang theo dõi' / 'Người theo dõi'.", expect: "Tên mọi người trong danh sách đúng, không ai 'Ẩn danh'." },

  // Doanh nghiệp
  { id: "biz-detail", category: "Doanh nghiệp", title: "Xem chi tiết 1 DN", action: "Khám phá → bấm vào 1 doanh nghiệp bất kỳ.", expect: "Ảnh bìa, thông tin, giờ mở cửa đầy đủ, không treo/trắng trang." },
  { id: "biz-gallery", category: "Doanh nghiệp", title: "Xem ảnh gallery DN", action: "Bấm vào 1 ảnh trong thư viện ảnh của DN.", expect: "Ảnh phóng to hiện NGAY GIỮA màn hình, không phải cuộn." },
  { id: "biz-map", category: "Doanh nghiệp", title: "Bản đồ", action: "Khám phá → chuyển chế độ Bản đồ.", expect: "Thấy đúng các DN đã ghim vị trí." },
  { id: "biz-review", category: "Doanh nghiệp", title: "Viết đánh giá", action: "Viết 1 đánh giá kèm ảnh cho 1 DN.", expect: "Hiện ngay trong danh sách, ảnh xem được." },
  { id: "biz-review-author", category: "Doanh nghiệp", title: "Xem tên người đánh giá", action: "Xem đánh giá của 1 DN có nhiều người đánh giá.", expect: "Tên tất cả đúng, không ai 'Ẩn danh'." },
  { id: "biz-review-photo", category: "Doanh nghiệp", title: "Xem ảnh đánh giá", action: "Bấm vào ảnh đính kèm trong 1 đánh giá.", expect: "Ảnh phóng to đúng giữa màn hình." },
  { id: "biz-follow", category: "Doanh nghiệp", title: "Theo dõi DN", action: "Bấm 'Theo dõi' 1 doanh nghiệp.", expect: "Số người theo dõi tăng đúng." },

  // Ưu đãi
  { id: "offer-claim", category: "Ưu đãi", title: "Nhận 1 ưu đãi", action: "Bấm 'Nhận ưu đãi' ở 1 DN, nhập mã PIN.", expect: "Nhận mã code + đồng hồ đếm ngược đúng." },
  { id: "offer-claimlist", category: "Ưu đãi", title: "Xem người đã nhận (chủ DN)", action: "Nếu là chủ DN có người nhận ưu đãi, xem danh sách người nhận.", expect: "Tên người nhận hiện đúng." },

  // Cộng đồng
  { id: "comm-channel", category: "Cộng đồng", title: "Đổi kênh chat", action: "Cộng đồng → đổi qua lại vài kênh vị trí/chủ đề.", expect: "Tin nhắn đổi đúng theo kênh, không lẫn." },
  { id: "comm-send", category: "Cộng đồng", title: "Gửi tin nhắn", action: "Gửi 1 tin text, 1 ảnh, 1 GIF, thả 1 reaction.", expect: "Hiện ngay, không cần tải lại trang." },
  { id: "comm-tag", category: "Cộng đồng", title: "Gắn thẻ @tên", action: "Gõ '@' tag 1 người bất kỳ (kể cả người không mới), gửi tin.", expect: "Gợi ý tên đúng, người bị tag nhận được thông báo." },
  { id: "comm-online", category: "Cộng đồng", title: "Danh sách online", action: "Mở danh sách thành viên trong kênh chat.", expect: "Chỉ hiện đúng người đang thật sự online." },

  // Tin nhắn riêng
  { id: "msg-thread", category: "Tin nhắn riêng", title: "Nhắn tin 1-1", action: "Nhắn riêng 1 người, gửi ảnh, reply, sửa, xoá 1 tin.", expect: "Mượt, không khoảng trắng dư, không tự tải lại liên tục." },
  { id: "msg-inbox", category: "Tin nhắn riêng", title: "Hộp thư", action: "Mở danh sách hội thoại.", expect: "Tin nhắn cuối + số chưa đọc đúng." },

  // Trao đổi hỗ trợ
  { id: "exchange-full", category: "Trao đổi hỗ trợ", title: "Trọn quy trình trao đổi", action: "Từ 1 DN gửi yêu cầu trao đổi tới DN khác, chấp nhận, đánh dấu hoàn thành cả 2 bên.", expect: "Trạng thái đúng từng bước, cả 2 bên nhận +1 điểm." },

  // Thông báo
  { id: "notif-read", category: "Thông báo", title: "Thông báo", action: "Tạo 1 hành động sinh thông báo (follow, tag...), mở chuông.", expect: "Hiện đúng, đánh dấu đã đọc được." },

  // Báo cáo
  { id: "report-send", category: "Báo cáo", title: "Gửi báo cáo", action: "Gửi báo cáo 1 DN bất kỳ (test xong huỷ cũng được).", expect: "Hiện trong 'Báo cáo của tôi'." },
  { id: "report-reply", category: "Báo cáo", title: "Phản hồi báo cáo", action: "Từ Admin phản hồi 1 báo cáo, xem lại bằng tài khoản đã gửi.", expect: "Tên admin phản hồi đúng, không phải 'Người dùng'." },

  // PWA & Cài đặt
  { id: "pwa-install", category: "PWA & Cài đặt", title: "Cài app", action: "Cài đặt → Cài app ra màn hình chính.", expect: "Icon app xuất hiện trên màn hình chính." },
  { id: "pwa-push", category: "PWA & Cài đặt", title: "Thông báo đẩy", action: "Bật quyền thông báo đẩy trong Cài đặt.", expect: "Nhận được 1 thông báo đẩy thử." },
  { id: "pwa-offline", category: "PWA & Cài đặt", title: "Mất mạng thật", action: "Bật chế độ máy bay, mở app.", expect: "Không treo/trắng màn hình, báo mất mạng rõ ràng." },
  { id: "pwa-update", category: "PWA & Cài đặt", title: "Cập nhật bản mới", action: "Sau khi deploy bản mới, mở lại app.", expect: "Hiện toast 'Đã có bản cập nhật', bấm vào cập nhật đúng, KHÔNG tự reload đột ngột." },
];

const STORAGE_KEY = "lmld:questline:v1";
const CATEGORIES = [...new Set(QUESTS.map((q) => q.category))];

export default function Questline() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const reset = () => {
    if (!confirm("Xoá hết tiến độ, làm lại từ đầu?")) return;
    setDone({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const total = QUESTS.length;
  const completed = useMemo(() => QUESTS.filter((q) => done[q.id]).length, [done]);
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="p-4 space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Link to="/ho-so" className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center" aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg flex-1">🎯 Questline kiểm tra app</h1>
        <button
          onClick={reset}
          aria-label="Làm lại từ đầu"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-primary/20 shadow-soft p-4 space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Tiến độ</span>
          <span className="text-primary">
            {completed}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-brand transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-bold pt-1">
            <PartyPopper className="w-4 h-4" /> Hoàn thành 100%! Đã đi qua hết mọi tính năng chính — tự tin launch được rồi 🌿
          </div>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        const items = QUESTS.filter((q) => q.category === cat);
        const catDone = items.filter((q) => done[q.id]).length;
        return (
          <section key={cat} className="space-y-2">
            <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              {cat}
              <span className="text-[11px] font-normal">
                ({catDone}/{items.length})
              </span>
            </h2>
            <div className="space-y-1.5">
              {items.map((q) => {
                const checked = !!done[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      checked ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:bg-accent"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full grid place-items-center mt-0.5 ${
                        checked ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/40"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${checked ? "line-through text-muted-foreground" : ""}`}>
                        {q.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/70">Làm:</span> {q.action}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/70">Kỳ vọng:</span> {q.expect}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
