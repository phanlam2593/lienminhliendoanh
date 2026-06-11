import { Business, Review, OfferUsage, User } from "./types";

const cityList = ["Đà Lạt", "Đà Nẵng", "Hồ Chí Minh", "Hà Nội", "Nha Trang"];

export const seedBusinesses: Business[] = [
  {
    id: "b1",
    code: "CFMAY",
    name: "Cafe Mây Lang Thang",
    type: "cafe",
    city: "Đà Lạt",
    address: "12 Trần Hưng Đạo, P.10, Đà Lạt",
    description: "Quán cafe view đồi thông, không gian thư giãn dành cho cộng đồng yêu thiên nhiên.",
    offer: "Giảm 20% toàn menu cho thành viên LMLD",
    rating: 4.8,
    reviewCount: 24,
    cover: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=70",
    phone: "0905 123 456",
    distanceKm: 1.2,
    status: "approved",
    usageCount: 18,
    ownerId: "u1",
  },
  {
    id: "b2",
    code: "SPAZN",
    name: "Zen Spa & Wellness",
    type: "spa",
    city: "Đà Nẵng",
    address: "88 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
    description: "Spa thư giãn cao cấp, liệu trình thảo dược thiên nhiên.",
    offer: "Tặng 1 buổi massage 30 phút khi book combo",
    rating: 4.9,
    reviewCount: 41,
    cover: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=70",
    phone: "0908 777 222",
    distanceKm: 3.5,
    status: "approved",
    usageCount: 12,
    ownerId: "u8",
  },
  {
    id: "b3",
    code: "NHHUY",
    name: "Nhà Hàng Hương Việt",
    type: "nhahang",
    city: "Hồ Chí Minh",
    address: "25 Lê Lợi, Q.1, TP.HCM",
    description: "Ẩm thực Việt truyền thống, không gian sang trọng, phù hợp gia đình & doanh nghiệp.",
    offer: "Giảm 15% hoá đơn, miễn phí món khai vị",
    rating: 4.6,
    reviewCount: 58,
    cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=70",
    phone: "0901 555 888",
    distanceKm: 5.8,
    status: "approved",
    usageCount: 9,
    ownerId: "u15",
  },
  {
    id: "b4",
    code: "SLBLU",
    name: "Blue Hair Salon",
    type: "salon",
    city: "Hà Nội",
    address: "47 Bà Triệu, Hoàn Kiếm, Hà Nội",
    description: "Salon tóc phong cách Hàn Quốc, đội ngũ stylist chuyên nghiệp.",
    offer: "Giảm 25% dịch vụ uốn/nhuộm cho thành viên mới",
    rating: 4.7,
    reviewCount: 33,
    cover: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=70",
    phone: "0912 345 678",
    distanceKm: 2.1,
    status: "approved",
    usageCount: 6,
  },
  {
    id: "b5",
    code: "HSPIN",
    name: "Pine Hill Homestay",
    type: "homestay",
    city: "Đà Lạt",
    address: "Số 9, Hẻm Hoa Hồng, P.7, Đà Lạt",
    description: "Homestay gỗ thông giữa rừng, view hồ Tuyền Lâm, lý tưởng cho nhóm bạn & gia đình.",
    offer: "Tặng 1 đêm khi book 3 đêm liên tục",
    rating: 4.9,
    reviewCount: 19,
    cover: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=70",
    phone: "0987 654 321",
    distanceKm: 8.4,
    status: "approved",
    usageCount: 5,
  },
  {
    id: "b6",
    code: "CFGRN",
    name: "Green Garden Coffee",
    type: "cafe",
    city: "Đà Nẵng",
    address: "100 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
    description: "Quán cafe sân vườn nhiều cây xanh, không gian co-working.",
    offer: "Free 1 ly khi mua 2 ly cùng loại",
    rating: 4.5,
    reviewCount: 15,
    cover: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=70",
    logo: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&q=70",
    phone: "0934 111 222",
    distanceKm: 4.0,
    status: "pending",
    usageCount: 0,
  },
];

const sampleUserNames = [
  "Nguyễn An", "Trần Bình", "Lê Châu", "Phạm Dũng", "Hoàng Em",
  "Vũ Giang", "Đỗ Hà", "Bùi Hùng", "Đặng Khoa", "Phan Lan",
  "Ngô Minh", "Tô Ngọc", "Mai Phúc", "Lý Quân", "Cao Sơn",
  "Trịnh Thảo", "Hồ Uyên", "Dương Vy", "Lưu Xuân", "Tăng Yến",
];

export const seedUsers: User[] = sampleUserNames.map((name, i) => ({
  id: `u${i + 1}`,
  name,
  phone: `09${String(10000000 + i * 13579).slice(0, 8)}`,
  email: i % 3 === 0 ? `${name.split(" ").join("").toLowerCase()}@mail.com` : undefined,
  city: cityList[i % cityList.length],
  isVerified: i % 5 !== 0,
  hasBusiness: i % 7 === 0,
  status: "approved",
}));

const sampleReviewTexts = [
  "Không gian rất đẹp, nhân viên thân thiện, ưu đãi LMLD áp dụng nhanh!",
  "Chất lượng tuyệt vời, giá tốt cho thành viên cộng đồng.",
  "Sẽ quay lại, recommend cho mọi người trong liên minh.",
  "Phục vụ chuyên nghiệp, mã ưu đãi xác nhận chỉ trong 1 phút.",
  "Đáng đồng tiền bát gạo, đặc biệt với ưu đãi của LMLD.",
  "Mình rất hài lòng, không gian thoải mái, đồ ăn ngon.",
];

export const seedReviews: Review[] = [];
seedBusinesses.slice(0, 5).forEach((b, bi) => {
  for (let i = 0; i < 6; i++) {
    const u = seedUsers[(bi * 6 + i) % seedUsers.length];
    seedReviews.push({
      id: `r${bi}_${i}`,
      userId: u.id,
      userName: u.name,
      businessId: b.id,
      stars: 4 + ((bi + i) % 2),
      content: sampleReviewTexts[(bi + i) % sampleReviewTexts.length],
      createdAt: new Date(Date.now() - (bi * 6 + i) * 86400000).toISOString(),
    });
  }
});

export const seedUsages: OfferUsage[] = [];
let codeCounter: Record<string, number> = {};
for (let i = 0; i < 50; i++) {
  const b = seedBusinesses[i % 5];
  codeCounter[b.code] = (codeCounter[b.code] || 0) + 1;
  const u = seedUsers[i % seedUsers.length];
  seedUsages.push({
    id: `o${i}`,
    businessId: b.id,
    businessCode: b.code,
    businessName: b.name,
    userId: u.id,
    userName: u.name,
    code: `${b.code}-${String(codeCounter[b.code]).padStart(6, "0")}`,
    createdAt: new Date(Date.now() - i * 3600000 * 5).toISOString(),
    redeemed: i % 3 === 0,
  });
}
