import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RotateCcw, List, ArrowRight, Award, Mic, CheckCircle } from 'lucide-react';
import { Sentence, SentenceProgress, ScreenType } from '../types';
import { MOVIE_SETTINGS } from '../constants/insideOutData';

interface Props {
  sentences: Sentence[];
  progress: Record<number, SentenceProgress>;
  onSelectSentence: (index: number) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const FinishScreen: React.FC<Props> = ({
  sentences,
  progress,
  onSelectSentence,
  onNavigate,
}) => {
  // Fire celebration confetti on screen mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  // Compute stats
  const completedSentences = sentences.filter((s) => progress[s.id]?.status === 'done');
  const totalRecordings = Object.values(progress).reduce((acc, curr) => acc + (curr.recordings || 0), 0);
  const totalPlays = Object.values(progress).reduce((acc, curr) => acc + (curr.plays || 0), 0);

  // Find sentences marked with 😐 (rating = 2) in any self-check criteria
  const sentencesNeedingPractice = sentences.filter((s) => {
    const p = progress[s.id];
    if (!p || !p.selfCheck) return false;
    return p.selfCheck.some((rate) => rate === 2);
  });

  return (
    <div className="w-full flex flex-col items-center px-4 py-6 space-y-6">
      {/* Celebration Header */}
      <div className="w-full text-center space-y-2 pt-2">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
          <Award className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Great job! 🎉
        </h1>
        <p className="text-base font-semibold text-sky-600">
          연습을 훌륭하게 완수하셨습니다!
        </p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Inside Out 명장면 속 인물들의 억양과 리듬을 완벽하게 귀로 익히고 연습했습니다.
        </p>
      </div>

      {/* Summary Stats Grid */}
      <div className="w-full grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-2xs">
          <div className="text-xl font-extrabold text-sky-600 tabular-nums">
            {completedSentences.length} / {sentences.length}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
            Completed (★)
          </div>
          <div className="text-[9px] text-slate-400">완료한 문장</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-2xs">
          <div className="text-xl font-extrabold text-rose-500 tabular-nums">
            {totalRecordings}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
            Recordings
          </div>
          <div className="text-[9px] text-slate-400">총 음성 녹음</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-2xs">
          <div className="text-xl font-extrabold text-amber-500 tabular-nums">
            {totalPlays}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
            Listened
          </div>
          <div className="text-[9px] text-slate-400">문장 청취 횟수</div>
        </div>
      </div>

      {/* Sentences marked with 😐 (needs more practice) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">😐</span>
            <h3 className="text-sm font-bold text-slate-900">
              Needs More Practice / 다시 점검할 문장
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {sentencesNeedingPractice.length} sentences
          </span>
        </div>

        {sentencesNeedingPractice.length === 0 ? (
          <div className="text-center py-5 px-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-emerald-900">
              No 😐 ratings recorded! All practiced lines passed with flying colors!
            </p>
            <p className="text-[11px] text-emerald-700">
              아쉬운 평가(😐)를 남긴 문장이 없습니다. 정말 훌륭한 실력입니다!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              속도, 강조 단어, 억양 자가진단에서 😐를 선택한 문장들입니다. 바로 다시 연습해보세요.
            </p>
            {sentencesNeedingPractice.map((s) => {
              const originalIndex = sentences.findIndex((item) => item.id === s.id);
              return (
                <div
                  key={s.id}
                  className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {s.speaker}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {s.text}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.korean}</p>
                  </div>

                  <button
                    onClick={() => onSelectSentence(originalIndex >= 0 ? originalIndex : 0)}
                    className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <span>Practice again</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation CTAs */}
      <div className="w-full space-y-2.5 pt-1">
        <button
          onClick={() => onSelectSentence(0)}
          className="w-full min-h-[50px] px-4 py-3 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-bold rounded-2xl shadow-md shadow-sky-500/20 flex flex-col items-center justify-center transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-sm">
            <RotateCcw className="w-4 h-4" />
            <span>Practice From Start</span>
          </div>
          <span className="text-[11px] font-normal text-sky-100">처음 문장부터 다시 연습</span>
        </button>

        <button
          onClick={() => onNavigate('list')}
          className="w-full min-h-[46px] px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-200 font-semibold rounded-2xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
        >
          <List className="w-4 h-4 text-slate-500" />
          <span>Review Sentence List / 전체 목록 보기</span>
        </button>
      </div>

      {/* One-Line Credit At Bottom (PRD Section 0-3 item 3) */}
      <div className="w-full pt-4 border-t border-slate-200/80 text-center">
        <p className="text-[13px] leading-snug text-slate-500 font-medium break-words">
          {MOVIE_SETTINGS.oneLineCredit}
        </p>
      </div>
    </div>
  );
};
