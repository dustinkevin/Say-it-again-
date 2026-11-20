import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  handleReload = () => {
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4 text-slate-800">
          <div className="w-full max-w-[400px] bg-white border border-slate-200 rounded-3xl shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-extrabold text-slate-900">
                화면을 불러오는 중 문제가 발생했습니다
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                일시적인 오류이거나 환경 설정 문제일 수 있습니다. 새로고침 후 다시 시도해주세요.
              </p>
            </div>
            {this.state.errorMessage && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 break-words">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full min-h-[44px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-2xl shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>페이지 새로고침</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
