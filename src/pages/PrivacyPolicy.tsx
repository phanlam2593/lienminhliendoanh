import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-bold text-sm">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="p-4 space-y-4 pb-10 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link to="/ho-so" className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center" aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Chính sách bảo mật</h1>
      </div>
      <p className="text-xs text-muted-foreground">Cập nhật lần cuối: 07/2026</p>

      <Section title="1. Dữ liệu chúng tôi thu thập">
        <ul className="list-disc pl-4 space-y-1">
          <li>Thông tin đăng ký: họ tên, tên đăng nhập, email, số điện thoại</li>
          <li>Ảnh đại diện, ảnh bìa doanh nghiệp, ảnh đánh giá/báo cáo (nếu bạn tải lên)</li>
          <li>Nội dung bạn tạo: tin nhắn, đánh giá, bình luận, báo cáo</li>
          <li>Vị trí GPS — CHỈ khi bạn chủ động bấm "Gần đây" hoặc chủ DN ghim vị trí, không thu thập ngầm</li>
          <li>Lịch sử hoạt động cơ bản (thời điểm truy cập gần nhất) để phục vụ vận hành</li>
        </ul>
      </Section>

      <Section title="2. Mục đích sử dụng dữ liệu">
        <ul className="list-disc pl-4 space-y-1">
          <li>Tạo và duy trì tài khoản của bạn</li>
          <li>Hiển thị thông tin doanh nghiệp, ưu đãi, đánh giá cho cộng đồng</li>
          <li>Gửi thông báo liên quan tới hoạt động của bạn (tin nhắn, ưu đãi, theo dõi...)</li>
          <li>Tính khoảng cách cho tính năng "Gần đây" (chỉ xử lý tạm thời, không lưu vị trí bạn)</li>
          <li>Ngăn chặn gian lận, lạm dụng hệ thống</li>
        </ul>
      </Section>

      <Section title="3. Cơ sở pháp lý xử lý dữ liệu">
        <p>
          Chúng tôi xử lý dữ liệu cá nhân của bạn dựa trên sự đồng ý bạn cung cấp khi đăng ký và sử dụng từng tính
          năng cụ thể, phù hợp với Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
        </p>
      </Section>

      <Section title="4. Chia sẻ dữ liệu">
        <p>
          Chúng tôi <b>không bán</b> dữ liệu cá nhân của bạn cho bên thứ ba. Thông tin công khai (tên, ảnh đại diện,
          đánh giá) hiển thị cho các thành viên khác trong cộng đồng theo đúng mục đích của Ứng dụng. Dữ liệu chỉ được
          cung cấp cho cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.
        </p>
      </Section>

      <Section title="5. Bảo mật dữ liệu">
        <p>
          Dữ liệu được lưu trữ trên hạ tầng Supabase với kiểm soát truy cập theo vai trò (Row Level Security). Mật
          khẩu được mã hoá, không lưu dưới dạng văn bản thô.
        </p>
      </Section>

      <Section title="6. Thời gian lưu trữ">
        <p>
          Dữ liệu được lưu trong suốt thời gian bạn còn sử dụng tài khoản. Khi bạn yêu cầu xoá tài khoản, dữ liệu cá
          nhân sẽ được xoá theo quy trình xử lý của BQT, trừ trường hợp pháp luật yêu cầu lưu giữ.
        </p>
      </Section>

      <Section title="7. Quyền của bạn">
        <p>Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Được biết dữ liệu của mình đang được xử lý ra sao</li>
          <li>Truy cập, xem, yêu cầu chỉnh sửa dữ liệu cá nhân</li>
          <li>Rút lại sự đồng ý đã cung cấp trước đó</li>
          <li>Yêu cầu xoá dữ liệu cá nhân</li>
          <li>Yêu cầu hạn chế hoặc phản đối việc xử lý dữ liệu</li>
          <li>Khiếu nại, tố cáo theo quy định pháp luật</li>
        </ul>
        <p>
          Để thực hiện các quyền trên, liên hệ Zalo{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>
          . Chúng tôi phản hồi trong vòng 72 giờ theo quy định.
        </p>
      </Section>

      <Section title="8. Trẻ em">
        <p>Ứng dụng dành cho người từ đủ 16 tuổi trở lên. Chúng tôi không chủ đích thu thập dữ liệu của trẻ em.</p>
      </Section>

      <Section title="9. Thay đổi chính sách">
        <p>Chính sách có thể được cập nhật theo thời gian. Thay đổi quan trọng sẽ được thông báo trong Ứng dụng.</p>
      </Section>
    </div>
  );
}
