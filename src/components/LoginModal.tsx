import React, { useState } from 'react';
import { X, Film, ShieldCheck, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, authError, popupBlockedUrl, clearAuthError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAuthError();
    setIsSubmitting(false);
    onClose();
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-popup-title"
    >
      <div
        className="w-full max-w-[400px] bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Hero Header matching StartScreen design concept */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold tracking-wider uppercase">
                <Film className="w-3 h-3" />
                <span>Scene Shadow</span>
              </div>
              <div>
                <h2
                  id="auth-popup-title"
                  className="text-xl font-black tracking-tight text-white leading-tight"
                >
                  Say It Again!
                </h2>
                <p className="text-xs text-sky-300 font-medium mt-0.5">
                  나만의 영화 쉐도잉 학습 기록 시작하기
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="로그인 팝업 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Popup Body */}
        <div className="p-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-sky-600" />
                <span>간편 시작</span>
              </div>
              <p className="text-sm font-bold text-slate-900 pt-1">
                Google 계정으로 바로 시작하세요
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                별도의 회원가입 절차 없이 Google 로그인 한 번으로
                <br />
                학습 진행도와 자가진단 기록을 이어갈 수 있습니다.
              </p>
            </div>

            {/* Single Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-4 py-3 bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-sm rounded-2xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>{isSubmitting ? 'Google 계정 연결 중...' : 'Google로 로그인'}</span>
            </button>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
                {popupBlockedUrl && (
                  <a
                    href={popupBlockedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 font-bold underline"
                  >
                    <span>새 창에서 Google 로그인 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>비영리 영어 학습 전용 · 안전한 Google 계정 인증</span>
          </div>
        </div>
      </div>
    </div>
  );
};
