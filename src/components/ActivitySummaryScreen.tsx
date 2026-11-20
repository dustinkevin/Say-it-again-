import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  BarChart3,
  Headphones,
  Mic,
  Clock,
  RefreshCw,
  ArrowRight,
  List,
  Home,
  LogIn,
  Database,
  HardDrive,
  Sparkles,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Sentence, ScreenType, UserActivityLog } from '../types';
import { fetchUserActivityLogs } from '../utils/activityLogs';

interface Props {
  sentences: Sentence[];
  onSelectSentence: (index: number) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenLogin: () => void;
}

type FilterType = 'all' | 'listen' | 'shadow';

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export const ActivitySummaryScreen: React.FC<Props> = ({
  sentences,
  onSelectSentence,
  onNavigate,
  onOpenLogin,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [source, setSource] = useState<'supabase' | 'local'>('local');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await fetchUserActivityLogs(user?.id);
    setLogs(result.logs);
    setSource(result.source);
    if (result.error) {
      setErrorMessage(result.error);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const stats = useMemo(() => {
    let totalListen = 0;
    let totalShadow = 0;

    const perSentenceMap = new Map<
      number,
      {
        sentenceId: number;
        sentenceText: string;
        speaker: string;
        listenCount: number;
        shadowCount: number;
        lastRecordedAt: string;
      }
    >();

    for (const log of logs) {
      const listenAdd =
        typeof log.listen_count === 'number'
          ? log.listen_count
          : log.activity_type === 'listen'
            ? 1
            : 0;
      const shadowAdd =
        typeof log.shadow_count === 'number'
          ? log.shadow_count
          : log.activity_type === 'shadow'
            ? 1
            : 0;

      totalListen += listenAdd;
      totalShadow += shadowAdd;

      const existing = perSentenceMap.get(log.sentence_id);
      if (!existing) {
        const fallbackSentence = sentences.find((s) => s.id === log.sentence_id);
        perSentenceMap.set(log.sentence_id, {
          sentenceId: log.sentence_id,
          sentenceText: log.sentence_text || fallbackSentence?.text || `문장 #${log.sentence_id}`,
          speaker: log.speaker || fallbackSentence?.speaker || 'Speaker',
          listenCount: listenAdd,
          shadowCount: shadowAdd,
          lastRecordedAt: log.recorded_at,
        });
      } else {
        existing.listenCount += listenAdd;
        existing.shadowCount += shadowAdd;
        if (new Date(log.recorded_at).getTime() > new Date(existing.lastRecordedAt).getTime()) {
          existing.lastRecordedAt = log.recorded_at;
        }
      }
    }

    const perSentence = Array.from(perSentenceMap.values()).sort(
      (a, b) => new Date(b.lastRecordedAt).getTime() - new Date(a.lastRecordedAt).getTime()
    );

    const latestRecordedAt = logs.length > 0 ? logs[0].recorded_at : null;

    return {
      totalListen,
      totalShadow,
      totalActivities: totalListen + totalShadow,
      practicedSentencesCount: perSentence.length,
      perSentence,
      latestRecordedAt,
    };
  }, [logs, sentences]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((log) => log.activity_type === filter);
  }, [logs, filter]);

  return (
    <div className="w-full px-4 py-5 space-y-5">
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950">
              <BarChart3 className="w-3 h-3" />
              <span>Activity Summary</span>
            </span>

            <button
              onClick={() => void loadLogs()}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              나의 쉐도잉 활동 요약
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              듣기 학습 횟수와 쉐도잉 연습 횟수 및 기록 시각을 한눈에 확인하세요.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {source === 'supabase' ? (
                <>
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Supabase 실시간 동기화</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-amber-200 font-semibold">임시 로컬 기록 (로그인 시 저장)</span>
                </>
              )}
            </span>
            {stats.latestRecordedAt && (
              <span className="text-[10px] text-slate-300 font-mono">
                최근: {formatTimestamp(stats.latestRecordedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Login Prompt Banner when not authenticated */}
      {!isAuthenticated && (
        <div className="w-full bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-900">
              Google 로그인으로 학습 기록을 안전하게 저장하세요
            </p>
            <p className="text-[11px] text-slate-600 leading-snug">
              로그인하면 현재 브라우저의 기록도 Supabase 계정에 자동으로 연동됩니다.
            </p>
          </div>
          <button
            onClick={onOpenLogin}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs">
          기록을 불러오는 중 문제가 발생했습니다: {errorMessage}
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">듣기 학습 횟수</span>
            <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-600 tabular-nums">
            {stats.totalListen}
            <span className="text-xs font-semibold text-slate-500 ml-1">회</span>
          </div>
          <p className="text-[11px] text-slate-500">Step 1 집중 듣기 · 원본 청취</p>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">쉐도잉 횟수</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tabular-nums">
            {stats.totalShadow}
            <span className="text-xs font-semibold text-slate-500 ml-1">회</span>
          </div>
          <p className="text-[11px] text-slate-500">따라 말하기 · 녹음 쉐도잉</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">총 누적 활동</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">
              {stats.totalActivities}회
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">학습한 문장 수</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">
              {stats.practicedSentencesCount} / {sentences.length}
            </div>
          </div>
          <CalendarClock className="w-5 h-5 text-sky-500" />
        </div>
      </div>

      {/* Per-Sentence Activity Summary */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">문장별 학습 요약</h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {stats.perSentence.length}개 문장
          </span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">기록을 불러오는 중...</div>
        ) : stats.perSentence.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-slate-500">
              아직 기록된 학습 활동이 없습니다. 문장 연습을 시작해보세요!
            </p>
            <button
              onClick={() => onNavigate('list')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              <span>연습하러 가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {stats.perSentence.map((item) => {
              const targetIndex = sentences.findIndex((s) => s.id === item.sentenceId);
              return (
                <div
                  key={item.sentenceId}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {item.speaker}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{item.sentenceId}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                        {item.sentenceText}
                      </p>
                    </div>

                    {targetIndex >= 0 && (
                      <button
                        onClick={() => onSelectSentence(targetIndex)}
                        className="shrink-0 px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        다시 연습
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                        <Headphones className="w-3 h-3" />
                        듣기 {item.listenCount}회
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        <Mic className="w-3 h-3" />
                        쉐도잉 {item.shadowCount}회
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTimestamp(item.lastRecordedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chronological Activity Timeline with Timestamp */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">상세 활동 타임라인</h2>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {filteredLogs.length}건
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'all', label: '전체' },
              { id: 'listen', label: '듣기 학습' },
              { id: 'shadow', label: '쉐도잉' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">타임라인을 불러오는 중...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            선택한 조건의 활동 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isListen = log.activity_type === 'listen';
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isListen
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isListen ? (
                          <>
                            <Headphones className="w-3 h-3" />
                            <span>듣기 학습 +1</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3" />
                            <span>쉐도잉 +1</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        Step {log.step}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimestamp(log.recorded_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {log.speaker && (
                      <span className="text-[10px] font-bold text-slate-600">
                        [{log.speaker}]
                      </span>
                    )}
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {log.sentence_text || `문장 #${log.sentence_id}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation Actions */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => onNavigate('list')}
          className="min-h-[46px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl shadow-xs flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer active:scale-98"
        >
          <List className="w-4 h-4" />
          <span>연습 계속하기</span>
        </button>

        <button
          onClick={() => onNavigate('start')}
          className="min-h-[46px] px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-2xl shadow-2xs flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer active:scale-98"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>홈으로</span>
        </button>
      </div>
    </div>
  );
};
