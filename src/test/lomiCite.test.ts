// 15/10 — Kir: lời đáp sức khoẻ bỏ tên cơ quan ("NHS: …") và dòng nguồn; hỏi nguồn mới nói (lib/lomiCite).
import { describe, expect, it } from "vitest";
import { asksSource, plainPub, splitSource, tidyCited } from "@/lib/lomiCite";

describe("lomiCite — câu chữ tự nhiên, nguồn cất riêng", () => {
  it("bỏ tên cơ quan ở đầu ý, giữ nguyên nội dung", () => {
    expect(plainPub("• NIDDK: một số người thấy triệu chứng nặng hơn khi ăn đồ chua.")).toBe("• Một số người thấy triệu chứng nặng hơn khi ăn đồ chua.");
    expect(plainPub("• NHS khuyên tránh những thứ hay kích triệu chứng như cà phê.")).toBe("• Tránh những thứ hay kích triệu chứng như cà phê.");
    expect(plainPub("NHS khuyên ăn ít chất béo bão hoà và đường hơn.")).toBe("Nên ăn ít chất béo bão hoà và đường hơn.");
    expect(plainPub("NHS gợi ý kiểu ăn Địa Trung Hải dựa trên rau, trái cây.")).toBe("Nên theo kiểu ăn Địa Trung Hải dựa trên rau, trái cây.");
    expect(plainPub("Theo MedlinePlus, kết hợp tư vấn và thuốc là cách tốt nhất.")).toBe("Kết hợp tư vấn và thuốc là cách tốt nhất.");
    expect(plainPub("Phòng ngừa theo Mayo Clinic: đừng ngoáy mũi.")).toBe("Phòng ngừa: đừng ngoáy mũi.");
    expect(plainPub("Vắc xin dại rất hiệu quả nếu tiêm đủ sớm (MedlinePlus).")).toBe("Vắc xin dại rất hiệu quả nếu tiêm đủ sớm.");
    expect(plainPub("NIDDK không nêu món cụ thể nào giúp giảm trào ngược.")).toBe("Hướng dẫn y khoa không nêu món cụ thể nào giúp giảm trào ngược.");
    expect(plainPub("Hãy xin tư vấn y tế (NHS 111 ở Anh).")).toBe("Hãy xin tư vấn y tế.");
    expect(plainPub("🩺 150/95 cao hơn ngưỡng **140/90** của NHS — tức là cao.")).toBe("🩺 150/95 cao hơn ngưỡng **140/90** — tức là cao.");
  });
  it("hai nguồn nói KHÁC nhau → giữ tên (bỏ đi thì thành hai câu mâu thuẫn)", () => {
    const t = "Sảy thai là mất thai sớm. NHS tính là trước 24 tuần; MedlinePlus tính là trước tuần thứ 20.";
    expect(plainPub(t)).toBe(t);
  });
  it("không đụng chữ thường trùng tên ('who'), không đụng câu không có tên cơ quan", () => {
    expect(plainPub("guess who is back")).toBe("guess who is back");
    expect(plainPub("Ăn bữa nhỏ hơn nhưng nhiều bữa hơn.")).toBe("Ăn bữa nhỏ hơn nhưng nhiều bữa hơn.");
  });
  it("tách dòng nguồn; thông tin đã cũ thì vẫn nhắc trong lời đáp", () => {
    const r = splitSource("Nội dung.\n\n📚 Nguồn: NHS (Anh), rà soát 01/01/2025. Lomi đối chiếu ngày 01/01/2026.");
    expect(r.text).toBe("Nội dung.");
    expect(r.src).toMatch(/^📚 Nguồn: NHS/);
    const s = splitSource("Nội dung.\n\n📚 Nguồn: NHS. Lomi đối chiếu ngày 01/01/2024 — đã hơn một năm, bạn nên hỏi lại dược sĩ / bác sĩ để có thông tin mới nhất.");
    expect(s.text).toMatch(/đã hơn một năm/);
    // lời đáp không có dòng nguồn → giữ nguyên, kể cả có chữ "NHS" (không phải lời đáp có nguồn)
    expect(tidyCited("Ở Anh gọi NHS 111.")).toEqual({ text: "Ở Anh gọi NHS 111." });
  });
  it("nhận câu hỏi nguồn ngắn", () => {
    for (const q of ["nguồn đâu", "nguồn?", "nguồn ở đâu vậy", "cho xin nguồn", "lấy ở đâu ra vậy", "dựa vào đâu mà nói vậy", "có nguồn không e"]) expect(asksSource(q), q).toBe(true);
    for (const q of ["viêm khớp nên kiêng gì", "nguồn gốc bệnh gout", "nguồn canxi có trong gì", "nguồn lây bệnh là gì"]) expect(asksSource(q), q).toBe(false);
  });
});
