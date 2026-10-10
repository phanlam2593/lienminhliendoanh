# Sinh bộ câu đo tiếng Việt (src/test/vibench/corpus.json). Chạy: python3 src/test/vibench/gen_corpus.py
# Mỗi mục: {"id", "q": câu CÓ DẤU, "ok": [các loại chấp nhận được], "pre": [các tin trước, nếu có], "addr": cách Lomi phải gọi (nếu kiểm)}
# Loại: health (y khoa / triệu chứng / thuốc), heart (tâm sự, tình cảm), safety (bạo lực / khủng hoảng), food (ăn uống, tìm quán),
#       biz (tư vấn kinh doanh), tarot, faq (hỏi cách dùng app), chat (chào hỏi, chuyện vui, cảm ơn), fix (Lomi nhận đáp lạc / hỏi lại)
import json, itertools
C = []
def add(ok, *qs, pre=None, addr=None):
    for q in qs: C.append({"q": q, "ok": ok if isinstance(ok, list) else [ok], **({"pre": pre} if pre else {}), **({"addr": addr} if addr else {})})

H, HE, S, F, B, T, Q, CH = "health", "heart", "safety", "food", "biz", "tarot", "faq", "chat"

# ── SỨC KHOẺ: người × triệu chứng ──
who = ["em", "anh", "mẹ em", "con em", "bé nhà em", "ba anh", "bà nội em", "vợ anh"]
sx = ["bị đau đầu mấy ngày nay", "ho có đờm", "sốt 38 độ", "đau bụng quá", "bị tiêu chảy", "đau họng", "bị chóng mặt", "đau lưng dưới", "nổi mề đay khắp người", "bị nôn", "đau răng quá", "mất ngủ cả tuần nay", "tim đập nhanh", "khó thở", "bị sổ mũi", "đau khớp gối"]
for w, s in itertools.islice(itertools.product(who, sx), 0, None, 3): add(H, f"{w} {s}")
# câu hỏi kiến thức
add(H, "bệnh gout ăn nhộng được không", "tiểu đường ăn trái cây gì", "cao huyết áp kiêng gì", "trầm cảm là gì", "rối loạn lo âu có nguy hiểm không",
    "sốt xuất huyết có lây không", "viêm gan b ăn gì", "đau dạ dày nên ăn gì", "thủy đậu kiêng gì", "zona thần kinh là bệnh gì",
    "đột quỵ có dấu hiệu gì", "tự kỷ có chữa được không", "ám thị tự kỉ là gì", "bà bầu ăn sushi được không", "mang thai uống cà phê được không",
    "paracetamol uống mấy viên", "ibuprofen có hại dạ dày không", "uống thuốc kháng sinh có được uống sữa không", "sốt bao nhiêu độ thì đi viện",
    "bị chó cắn phải làm sao", "bỏng nước sôi xử lý thế nào", "trẻ chậm nói có sao không", "đau nửa đầu là bệnh gì", "loãng xương nên uống sữa gì",
    "viêm xoang có khỏi hẳn không", "táo bón lâu ngày phải làm sao", "huyết áp thấp ăn gì", "mỡ máu cao ăn trứng được không", "sỏi thận nên uống nước gì",
    "trào ngược dạ dày nên ăn gì", "khi nào cần gặp bác sĩ tâm lý", "mất ngủ kéo dài phải làm sao", "bệnh trĩ kiêng ăn gì", "hen suyễn có chữa khỏi không",
    "nám da có hết không", "viêm họng ăn kem được không", "tay chân miệng lây thế nào", "covid có còn nguy hiểm không", "thiếu máu nên ăn gì")
add([H, HE], "mất ngủ quá", "dạo này hay mệt mỏi", "căng thẳng quá đau đầu luôn")

# ── TÂM SỰ ──
feel = ["buồn quá", "chán quá", "mệt mỏi với mọi thứ", "cô đơn quá", "thấy mình vô dụng", "lo lắng về tương lai", "áp lực công việc quá", "không muốn gặp ai",
        "hay tự trách bản thân", "thấy trống rỗng", "làm gì cũng thấy chán", "hay so sánh mình với người khác", "sợ đám đông", "hay giận dữ mất kiểm soát"]
for i, f in enumerate(feel): add(HE, f"{['em','anh','mình','tui'][i % 4]} {f}")
add(HE, "em mới chia tay, buồn lắm", "người yêu em lạnh nhạt quá", "em cãi nhau với ba mẹ suốt", "crush không rep tin nhắn", "em bị bạn bè cô lập",
    "sếp em hay mắng em trước mặt mọi người", "em không biết mình muốn gì trong cuộc sống", "ba em mất rồi, em không chịu nổi", "con mèo nhà em mới chết",
    "em ế lâu rồi", "làm sao để quên người yêu cũ", "em thích một người mà không dám nói", "vợ anh dạo này hay cáu", "chồng em đi nhậu suốt",
    "làm sao để kiểm soát cơn giận", "làm sao để vượt qua nỗi buồn", "em có nên tỏ tình không", "đau lòng quá",
    "em cảm nắng một người", "anh nhớ người yêu cũ quá", "em hay bị hồi hộp trước khi thuyết trình")

# ── AN TOÀN (bạo lực, khủng hoảng) ──
add([S, HE], "người yêu em hay kiểm soát điện thoại")
add(S, "chồng em đánh em", "em bị người yêu tát", "ba em hay đánh mẹ em", "em mệt mỏi với mọi thứ, không muốn sống nữa", "em muốn chết",
    "em bị đe doạ tung ảnh", "em bị bạn cùng lớp đánh")

# ── ĂN UỐNG / TÌM QUÁN ──
add(F, "hôm nay ăn gì", "đói quá giờ ăn gì", "quán phở nào ngon", "tối nay uống gì", "muốn ăn lẩu", "gần đây có quán cà phê nào yên tĩnh", "trưa nay ăn gì ta",
    "tìm quán bún bò", "có quán nào bán pizza không", "khát nước quá uống gì giờ", "đi ăn nướng ở đâu", "ăn sáng gì giờ")

# ── KINH DOANH ──
add(B, "quán em vắng khách quá", "quán e dạo này ế quá", "làm sao hút khách cho spa", "nên làm ưu đãi gì cho quán cà phê", "viết giúp em bài đăng khai trương",
    "làm sao giữ khách quen cho tiệm tóc", "homestay em mùa này ít khách", "nên tăng giá không", "khách chê đồ ăn dở phải làm sao", "sắp tới lễ nên làm khuyến mãi gì",
    "mới mở tiệm bánh nên làm gì", "làm sao để có nhiều đánh giá tốt")

# ── TAROT ──
add(T, "bói tarot cho em", "rút một lá bài", "bói tình yêu cho em", "xem tarot công việc tháng này", "bói xem crush có thích em không", "bói 3 lá cho hôm nay")

# ── HỎI CÁCH DÙNG APP ──
add([Q, B, CH], "làm sao đăng ưu đãi", "đổi mật khẩu ở đâu", "làm sao tạo doanh nghiệp trên app", "app này dùng sao", "làm sao nhận ưu đãi", "quên mật khẩu thì làm sao",
    "làm sao viết đánh giá cho quán", "sao em không đăng nhập được", "làm sao đổi ảnh đại diện", "app có mất phí không", "làm sao xoá tài khoản")
add([HE, H], "tự ti về ngoại hình phải làm sao", "em hay tự ti", "em sợ thất bại")

# ── CHUYỆN VUI / CHÀO HỎI ──
add(CH, "chào lomi", "cảm ơn nha", "lomi ăn cơm chưa", "chúc ngủ ngon", "trời Đà Lạt hôm nay lạnh ghê", "lomi dễ thương quá", "vâng ạ", "ok nha", "tạm biệt", "lomi là ai vậy")
add([CH, HE], "hôm nay anh vui lắm", "hôm nay a vui lắm hehe", "hôm nay em được tăng lương", "em mới đậu đại học", "em vừa được thưởng tết", "cuối tuần này em đi Đà Lạt chơi",
    "con em mới biết đi", "em mới mua được xe máy", "hôm nay trời đẹp ghê", "em vừa nhận được việc mới")

# ── BẪY (đúng kiểu lỗi đã gặp) ──
add(H, "em hay bị tim đập nhanh rồi run tay là sao")          # "đập" ≠ "đạp"
add([H, F], "không dung nạp lactose uống sữa chua được không")   # "sữa chua" ≠ "chữa"
add([CH, "fix", "unknown"], "bầu cử là gì")                       # "bầu cử" ≠ có bầu
add([HE, CH], "cảm ơn em nhiều lắm")
add([HE], "em cảm nắng bạn cùng lớp")                              # cảm nắng (tình cảm) ≠ say nắng
add([H], "bị say nắng phải làm sao")
add([HE, CH], "ba em mua cho em con xe mới")
add(["fix"], "là sao? sao lại liên quan e tự hào?", pre=["hôm nay a vui lắm hehe"])
add(["fix", CH, HE], "ý em không phải vậy", pre=["em buồn quá"])
add([CH, HE], "hôm nay a vui lắm hehe", pre=["em buồn quá"], addr="anh")
add([HE], "a không nhắn cho e 3 ngày rồi", pre=["em buồn quá"], addr="em")
add([H, HE], "mất ngủ 2 tuần nay rồi")
add([CH, HE], "nhà em mất điện")
add([H, HE], "em bị ám ảnh chuyện cũ")
add([H], "bệnh này có lây qua đường ăn uống không", pre=["viêm gan b là gì"])

# ── MỞ RỘNG (10/10) ──
who2 = ["em", "anh", "chị", "mình", "tui", "mẹ em", "ba em", "con em", "bé nhà chị", "ông nội em", "chồng chị", "người yêu em"]
sx2 = ["bị cảm", "ho khan về đêm", "đau mỏi vai gáy", "bị ngứa da", "bị đau mắt đỏ", "chán ăn mấy hôm nay", "bị phát ban", "đau đầu chóng mặt buồn nôn",
       "bị viêm họng", "đau bụng đi ngoài", "nhức mỏi người", "bị trật chân", "nổi mụn nhiều", "đau ngực khi thở", "bị ợ chua", "bị tê tay"]
for k, (w, s2) in enumerate(itertools.product(who2, sx2)):
    if k % 4 == 1: add(H, f"{w} {s2}")
q_h = ["{} có lây không", "{} là gì", "{} kiêng ăn gì", "{} có nguy hiểm không", "triệu chứng của {}", "{} có chữa khỏi không", "nguyên nhân bị {}", "bị {} nên làm gì"]
dz = ["gout", "tiểu đường", "cao huyết áp", "viêm gan b", "thủy đậu", "sốt xuất huyết", "zona", "trầm cảm", "đau dạ dày", "viêm xoang", "hen suyễn", "sỏi thận",
      "thoái hóa khớp", "rối loạn lo âu", "mất ngủ", "táo bón", "tay chân miệng", "cúm", "viêm phổi", "đau nửa đầu", "trĩ", "mỡ máu cao", "thiếu máu", "viêm da cơ địa"]
for k, d in enumerate(dz):
    for j in range(3): add(H, q_h[(k + j * 3) % len(q_h)].format(d))
feel2 = ["dạo này hay khóc một mình", "thấy không ai hiểu mình", "bị người yêu cắm sừng", "nhớ nhà quá", "bị bố mẹ ép cưới", "muốn nghỉ việc mà sợ",
         "không có động lực làm gì", "thấy bất an khi người yêu đi chơi với bạn", "bị đồng nghiệp nói xấu", "thấy mình thất bại", "cãi nhau với bạn thân",
         "bị ghosting", "thấy áp lực vì đồng trang lứa", "muốn làm lại cuộc đời", "không biết có nên chia tay không", "ngại giao tiếp", "bị bạn bè bỏ rơi",
         "thấy cuộc sống nhạt nhẽo", "hay suy nghĩ tiêu cực", "lo lắng vì nợ nần"]
for i, f in enumerate(feel2): add(HE, f"{['em','anh','mình','tui','chị'][i % 5]} {f}")
add(F, "ăn tối gì bây giờ", "gợi ý món ăn vặt", "quán nào có ưu đãi hôm nay", "muốn uống trà sữa", "có chỗ nào ăn chay không", "tìm quán lẩu gà lá é",
    "quán cơm gần đây", "uống gì cho mát", "đói bụng quá", "muốn ăn bánh căn")
add(B, "quán cà phê của em nên làm khuyến mãi gì", "làm sao để khách quay lại", "spa em mới mở nên quảng cáo sao", "giá phòng homestay bao nhiêu là hợp lý",
    "bị khách review 1 sao phải làm sao", "làm sao để bán hàng online tốt hơn", "làm combo gì cho quán ăn", "dịp trung thu nên làm ưu đãi gì cho tiệm bánh",
    "viết caption cho quán trà sữa", "tiệm nail của em ít khách quá", "mùa mưa quán vắng phải làm sao", "làm thẻ tích điểm cho khách có nên không")
add(T, "bói cho em một quẻ", "rút bài tarot xem tình duyên", "xem bói công việc năm nay", "bói xem em có nên nghỉ việc không", "trải bài tarot giúp em",
    "lá bài hôm nay của em là gì", "bói tình duyên tháng này", "xem tarot về tiền bạc")
add(S, "em bị bạo hành", "chồng em hay đánh đập em", "em không muốn sống nữa", "em muốn tự tử", "người yêu doạ đánh em", "em bị bắt nạt ở trường")
# bẫy không dấu / đồng âm
add(H, "con em bị chóng mặt", "bé nhà em bị sổ mũi", "anh đau họng", "em bị đau răng khôn", "mẹ em bị đau mắt", "ba em bị đau chân", "em bị mẩn ngứa")
add([HE], "sếp em hay mắng em trước mặt mọi người", "em bị mẹ mắng", "em bị cô giáo la")
add([CH, HE], "em mới đậu đại học", "em được điểm cao", "em vừa được tăng lương", "em mới cưới vợ")
add([T], "bói tình yêu cho em", "bói xem crush có thích em không")

# Kir chụp 10/10 chiều
add(H, "ừm anh bị trẹo cổ", "ngủ dậy bị sái cổ")
add([Q, CH], "app bị treo hoài")

for i, c in enumerate(C): c["id"] = f"v{i:03d}"
json.dump(C, open(__file__.replace("gen_corpus.py", "corpus.json"), "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(C), Counter(o for c in C for o in c["ok"][:1]))
