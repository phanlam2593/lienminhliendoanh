import { QueryClient } from "@tanstack/react-query";

// QueryClient dùng chung cho toàn app — export ra để có thể invalidate cache
// từ bên ngoài React (ví dụ sau khi admin duyệt/từ chối DN hoặc gửi review).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

// Vô hiệu hoá cache theo "chủ đề" — key được thống nhất giữa nơi query và nơi mutate.
// Chỉ cần gọi hàm này sau mutation, mọi useQuery có key bắt đầu bằng chủ đề tương ứng
// sẽ tự refetch ngay ở lần render kế tiếp — không phải reload trang.
export function invalidateBusinesses(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["businesses"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["business", id] });
}

export function invalidateReviews(businessId?: string) {
  void queryClient.invalidateQueries({ queryKey: ["reviews"] });
  if (businessId) void queryClient.invalidateQueries({ queryKey: ["reviews", businessId] });
  // Card stats hiển thị số review/rating trung bình → cũng cần refetch
  void queryClient.invalidateQueries({ queryKey: ["business-card-stats"] });
}
