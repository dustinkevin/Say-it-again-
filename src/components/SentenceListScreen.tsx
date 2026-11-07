import React, { useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Sentence, SentenceProgress, ScreenType } from '../types';
import { formatTime } from '../utils/storage';

interface Props {
  sentences: Sentence[];
  progress: Record<number, SentenceProgress>;
  onSelectSentence: (index: number) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const SentenceListScreen: React.FC<Props> = ({
  sentences,
  progress,
  onSelectSentence,
  onNavigate,
}) => {
  const [hideAllText, setHideAllText] = useState(false);

  // Helper for speaker color styling
  const getSpeakerStyle = (speaker: string) => {
    const s = speaker.toLowerCase();
    if (s.includes('anger')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (s.includes('riley')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (s.includes('mom')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (s.includes('dad')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Helper for progress icon
  const renderProgressMark = (p?: SentenceProgress) => {
    if (!p || p.status === 'new') {
      return <span className="text-slate-400 font-bold text-lg" title="Not started">☆</span>;
    }
    if (p.status === 'practiced') {
      return <span className="text-amber-500 font-bold text-lg" title="Practiced">◐</span>;
    }
    return <span className="text-emerald-500 font-bold text-lg" title="Done">★</span>;
  };

  // Completed count
  const doneCount = sentences.filter((s) => progress[s.id]?.status === 'done').length;
  const practicedCount = sentences.filter((s) => progress[s.id]?.status === 'practiced').length;

  return (
    <div className="w-full space-y-4 px-4 py-2">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => onNavigate('start')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home / 홈</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideAllText(!hideAllText)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            {hideAllText ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{hideAllText ? 'Show Text / 텍스트 보기' : 'Hide Text / 텍스트 숨기기'}</span>
          </button>

          <button
            onClick={() => onNavigate('edit')}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Edit Sentences / 문장 편집"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Summary Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Inside Out Practice Sentences</h2>
          <p className="text-xs text-slate-500">
            총 {sentences.length}개 문장 중 {doneCount}개 완료 (★) · {practicedCount}개 연습 중 (◐)
          </p>
        </div>
        <button
          onClick={() => onSelectSentence(0)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start All / 처음부터</span>
        </button>
      </div>

      {/* Completion Criteria Legend Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-slate-700">📌 문장 상태 기준:</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-400 font-bold">☆</span> 미시작
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-amber-500 font-bold">◐</span> 연습 중 (1~3단계 녹음)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-emerald-500 font-bold">★</span> <strong>완료</strong> (4단계 녹음 + 3가지 점검)
          </span>
        </div>
      </div>

      {/* Empty State */}
      {sentences.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-300 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            No sentences yet. Tap Edit Sentences to add some.
          </p>
          <p className="text-xs text-slate-500">
            등록된 연습 문장이 없습니다. 문장 편집에서 문장을 추가해보세요.
          </p>
          <button
            onClick={() => onNavigate('edit')}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-xs font-semibold hover:bg-sky-600"
          >
            Edit Sentences / 문장 편집하기
          </button>
        </div>
      ) : (
        /* Sentences List */
        <div className="space-y-2.5">
          {sentences.map((sentence, idx) => {
            const p = progress[sentence.id];

            return (
              <div
                key={sentence.id}
                onClick={() => onSelectSentence(idx)}
                className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-300 rounded-2xl p-3.5 shadow-2xs transition-all cursor-pointer active:scale-[0.99] group text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Number & Status */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-8 pt-0.5">
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="mt-1">{renderProgressMark(p)}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getSpeakerStyle(
                          sentence.speaker
                        )}`}
                      >
                        {sentence.speaker}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatTime(sentence.start)} – {formatTime(sentence.end)}
                      </span>
                    </div>

                    {/* Sentence English */}
                    <p className="text-base font-semibold text-slate-900 leading-snug">
                      {hideAllText ? (
                        <span className="italic text-slate-400 text-sm">
                          (Sentence hidden / 탭하여 연습하기)
                        </span>
                      ) : (
                        sentence.text
                      )}
                    </p>

                    {/* Korean Meaning */}
                    {!hideAllText && (
                      <p className="text-xs text-slate-500 leading-normal line-clamp-1">
                        {sentence.korean}
                      </p>
                    )}
                  </div>

                  {/* Arrow Indicator */}
                  <div className="shrink-0 self-center text-slate-300 group-hover:text-amber-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
