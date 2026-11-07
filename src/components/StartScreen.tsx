import React from 'react';
import {
  Play,
  Film,
  Sparkles,
  Sliders,
  ExternalLink,
  Volume2,
  Mic,
  Smile,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { MOVIE_SETTINGS } from '../constants/insideOutData';
import { ScreenType } from '../types';

interface Props {
  onNavigate: (screen: ScreenType) => void;
  sentenceCount: number;
}

export const StartScreen: React.FC<Props> = ({ onNavigate, sentenceCount }) => {
  return (
    <div className="flex flex-col items-center w-full px-4 py-5 space-y-5">
      {/* 1. Refined Modern Hero Header */}
      <div className="w-full text-center space-y-2 pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold tracking-tight border border-sky-200/80">
          <Film className="w-3.5 h-3.5 text-sky-600" />
          <span>Movie-Clip Shadowing · CEFR B1–B2</span>
        </div>

        <h1 className="text-3xl sm:text-[34px] font-extrabold text-slate-900 tracking-tight leading-tight">
          Scene Shadow
        </h1>
        <p className="text-xl font-bold text-sky-600 tracking-tight">
          Say It Again!
        </p>

        <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
          배우의 억양과 감정을 그대로 흡수하는 <br />
          <strong className="text-slate-900 font-semibold">10~15분 영화 쉐도잉 훈련</strong>
        </p>
      </div>

      {/* 2. Hero Movie Card (Inside Out Dinner Scene) */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
              Pixar Animation
            </span>
            <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              0:55 – 1:53 (58초)
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {MOVIE_SETTINGS.titleEn}
            </h2>
            <p className="text-xs text-sky-300 font-medium">
              인사이드 아웃 ({MOVIE_SETTINGS.releaseYear}) · {MOVIE_SETTINGS.sceneDescription}
            </p>
          </div>

          <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-300 border-t border-slate-700/80">
            <span className="font-semibold text-white">총 {sentenceCount}개 핵심 문장</span>
            <span>·</span>
            <span>라일리 & 부모님의 대화</span>
            <span>·</span>
            <span className="text-amber-300 font-medium">생생한 감정 억양</span>
          </div>
        </div>
      </div>

      {/* 3. Shadowing 3-Step Guide (Structured, High Legibility) */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>How to Shadow / 쉐도잉 3단계 훈련법</span>
          </h3>
          <span className="text-[10px] font-semibold text-slate-400">부담 없이 편안하게</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-sky-50/70 border border-sky-100/80">
            <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
              1
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">귀로 듣기 (Listen Closely)</p>
              <p className="text-[11px] text-slate-600 leading-snug">
                자막 없이 귀로만 원어민의 리듬, 강조 단어, 억양의 높낮이를 느껴보세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100/80">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
              2
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">그림자처럼 따라하기 (Mumble & Read)</p>
              <p className="text-[11px] text-slate-600 leading-snug">
                0.5초 뒤 입으로 작게 중얼거려보고, 자막을 켜서 강조 단어에 힘을 실어보세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
              3
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">녹음하고 자가진단 (Record & Check)</p>
              <p className="text-[11px] text-slate-600 leading-snug">
                내 목소리를 녹음해 원본과 비교하고 3가지 질문(속도·강세·억양)을 점검합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Thumb-Friendly Primary CTAs */}
      <div className="w-full space-y-2.5 pt-1">
        <button
          onClick={() => onNavigate('list')}
          className="w-full min-h-[54px] px-6 py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-md shadow-sky-500/25 flex items-center justify-between transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current text-white" />
            </div>
            <div className="text-left">
              <div className="text-base leading-tight font-extrabold">연습 시작하기</div>
              <div className="text-[10px] font-normal text-sky-100">Start Practice · 문장 목록</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-sky-100 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('edit')}
          className="w-full min-h-[46px] px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 font-semibold rounded-2xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>문장 편집 및 전체 목록 보기 (Edit Sentences)</span>
        </button>
      </div>

      {/* 5. Educational Use & Source Card (High Legibility, Clean Structure) */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 text-xs text-slate-600 space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <h4 className="font-bold text-slate-900 text-sm">
            Educational Use & Source / 교육용 고지 및 출처
          </h4>
        </div>

        {/* Notices */}
        <div className="space-y-2 text-[11px] leading-relaxed">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-bold text-slate-900">교육 목적 전용 (Non-Commercial Educational Use)</p>
            <p className="text-slate-600">{MOVIE_SETTINGS.noticeKo}</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-bold text-slate-900">Educational Use Notice (English)</p>
            <p className="text-slate-600">{MOVIE_SETTINGS.noticeEn}</p>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="pt-1 text-[11px] space-y-1.5 divide-y divide-slate-100">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Movie Title</span>
            <span className="font-bold text-slate-800">
              {MOVIE_SETTINGS.titleEn} ({MOVIE_SETTINGS.titleKo})
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Release Year / Year</span>
            <span className="font-medium text-slate-800">{MOVIE_SETTINGS.releaseYear}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Director</span>
            <span className="font-medium text-slate-800 text-right">{MOVIE_SETTINGS.director}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Screenplay</span>
            <span className="font-medium text-slate-800 text-right">{MOVIE_SETTINGS.screenplay}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Production</span>
            <span className="font-medium text-slate-800">{MOVIE_SETTINGS.production}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Distribution</span>
            <span className="font-medium text-slate-800">{MOVIE_SETTINGS.distribution}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Scene Description</span>
            <span className="font-semibold text-slate-800">{MOVIE_SETTINGS.sceneDescription}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Practice Range</span>
            <span className="font-bold text-sky-600">0:55 – 1:53</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Made by</span>
            <span className="font-bold text-slate-900">{MOVIE_SETTINGS.madeBy}</span>
          </div>
          <div className="pt-2 text-center">
            <a
              href={MOVIE_SETTINGS.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-semibold underline underline-offset-4"
            >
              <span>{MOVIE_SETTINGS.youtubeChannel} 공식 유튜브 영상 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
