import { Component, ReactNode } from "react";
import { CloudOff, RotateCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-card p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent grid place-items-center">
            <CloudOff className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-bold">Đã có lỗi xảy ra</h1>
          <p className="text-sm text-muted-foreground">
            Ứng dụng gặp sự cố ngoài mong đợi. Bạn có thể thử lại hoặc quay về trang chủ — dữ liệu của bạn vẫn an toàn.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold inline-flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Thử lại
            </button>
            <button
              onClick={this.handleHome}
              className="flex-1 py-3 rounded-xl border font-semibold inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
