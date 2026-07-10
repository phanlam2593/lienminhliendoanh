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

export default function Terms() {
  return (
    <div className="p-4 space-y-4 pb-10 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link to="/ho-so" className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center" aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Điều khoản sử dụng</h1>
      </div>
      <p className="text-xs text-muted-foreground">Cập nhật lần cuối: 07/2026</p>

      <Section title="1. Giới thiệu">
        <p>
          "Liên Minh Liên Doanh" (sau đây gọi là "Ứng dụng") là nền tảng cộng đồng kết nối thành viên và doanh nghiệp
          tại Đà Lạt. Bằng việc đăng ký và sử dụng Ứng dụng, bạn đồng ý tuân thủ các điều khoản dưới đây.
        </p>
      </Section>

      <Section title="2. Tài khoản người dùng">
        <p>Bạn cần cung cấp thông tin chính xác (họ tên, email, số điện thoại) khi đăng ký.</p>
        <p>Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động diễn ra dưới tài khoản của mình.</p>
        <p>
          Tài khoản mới cần được Ban quản trị (BQT) xem xét trong một số trường hợp (đặc biệt là hồ sơ doanh nghiệp)
          trước khi được hiển thị công khai.
        </p>
      </Section>

      <Section title="3. Quy tắc ứng xử cộng đồng">
        <p>Khi sử dụng tính năng trò chuyện, đánh giá, báo cáo, bạn cam kết:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Không đăng nội dung sai sự thật, xúc phạm, quấy rối người khác</li>
          <li>Không mạo danh người khác hoặc doanh nghiệp khác</li>
          <li>Không spam, quảng cáo trái phép ngoài mục đích của Ứng dụng</li>
          <li>Tôn trọng quyền riêng tư của thành viên khác</li>
        </ul>
      </Section>

      <Section title="4. Doanh nghiệp & Ưu đãi">
        <p>
          Chủ doanh nghiệp chịu trách nhiệm về tính chính xác của thông tin doanh nghiệp và các ưu đãi đã đăng, bao
          gồm việc thực hiện đúng cam kết ưu đãi khi thành viên xuất trình mã hợp lệ.
        </p>
        <p>Nếu doanh nghiệp không thực hiện đúng ưu đãi đã đăng, thành viên có thể báo cáo qua mục "Báo cáo".</p>
      </Section>

      <Section title="5. Nội dung do người dùng tạo">
        <p>
          Bạn giữ quyền sở hữu với nội dung mình đăng (đánh giá, ảnh, tin nhắn), nhưng cấp cho Ứng dụng quyền hiển thị
          nội dung đó trong phạm vi hoạt động của cộng đồng.
        </p>
      </Section>

      <Section title="6. Hành vi bị cấm">
        <ul className="list-disc pl-4 space-y-1">
          <li>Tạo tài khoản giả, sử dụng thông tin của người khác không có sự cho phép</li>
          <li>Can thiệp trái phép vào hệ thống, khai thác lỗ hổng bảo mật</li>
          <li>Sử dụng Ứng dụng cho mục đích vi phạm pháp luật Việt Nam</li>
        </ul>
        <p>BQT có quyền tạm khoá hoặc xoá tài khoản vi phạm mà không cần báo trước.</p>
      </Section>

      <Section title="7. Gói thành viên (Membership)">
        <p>
          Khi tính năng gói thành viên trả phí được kích hoạt, các điều khoản riêng về thanh toán, hoàn tiền và gia
          hạn sẽ được thông báo và cần sự đồng ý riêng của bạn trước khi đăng ký.
        </p>
      </Section>

      <Section title="8. Giới hạn trách nhiệm">
        <p>
          Ứng dụng đóng vai trò kết nối thành viên và doanh nghiệp, không phải bên trực tiếp cung cấp hàng hoá/dịch vụ
          của doanh nghiệp. Ứng dụng không chịu trách nhiệm về chất lượng hàng hoá, dịch vụ do doanh nghiệp cung cấp.
        </p>
      </Section>

      <Section title="9. Thay đổi điều khoản">
        <p>
          Điều khoản có thể được cập nhật theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trong
          Ứng dụng.
        </p>
      </Section>

      <Section title="10. Liên hệ">
        <p>
          Mọi thắc mắc về điều khoản, vui lòng liên hệ qua Zalo{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>{" "}
          hoặc Facebook "Liên Minh Liên Doanh".
        </p>
      </Section>
    </div>
  );
}
