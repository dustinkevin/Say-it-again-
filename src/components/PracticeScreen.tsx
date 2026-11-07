import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Mic,
  Square,
  Volume2,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Sentence, SentenceProgress, ShadowStep, ScreenType } from '../types';
import { YouTubePlayerRef } from './YouTubePlayer';

interface Props {
  sentences: Sentence[];
  currentIndex: number;
  progress: Record<number, SentenceProgress>;
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  isLoopWaiting?: boolean;
  onNavigateIndex: (index: number) => void;
  onNavigateScreen: (screen: ScreenType) => void;
  onUpdateProgress: (id: number, updater: (prev: SentenceProgress) => SentenceProgress) => void;
}

export const PracticeScreen: React.FC<Props> = ({
  sentences,
  currentIndex,
  progress,
  playerRef,
  isLoopWaiting = false,
  onNavigateIndex,
  onNavigateScreen,
  onUpdateProgress,
}) => {
  const currentSentence = sentences[currentIndex];

  // UI state
  const [currentStep, setCurrentStep] = useState<ShadowStep>(1);
  const [isTextHidden, setIsTextHidden] = useState(true); // Step 1 starts with text hidden
  const [isKoreanHidden, setIsKoreanHidden] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlayingSegment, setIsPlayingSegment] = useState(false);

  // Audio Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlobUrl, setRecordingBlobUrl] = useState<string | null>(null);
  const [recordingsCache, setRecordingsCache] = useState<Record<number, string>>({});
  const [micErrorNotice, setMicErrorNotice] = useState<string | null>(null);
  const [isPlayingMyVoice, setIsPlayingMyVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recordStopTimerRef = useRef<any>(null);

  // Speech Recognition state
  const [speechResult, setSpeechResult] = useState<{
    transcript: string;
    matchedCount: number;
    totalCount: number;
    words: { word: string; matched: boolean }[];
  } | null>(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);

  // Check speech recognition support
  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Sync text visibility when step changes (PRD Section 5 Step guide)
  const handleSelectStep = (step: ShadowStep) => {
    setCurrentStep(step);
    if (step === 1 || step === 2 || step === 4) {
      setIsTextHidden(true); // hidden for step 1, 2, 4
    } else if (step === 3) {
      setIsTextHidden(false); // shown for step 3 (Read & Shadow)
    }
  };

  // Reset audio states and auto-play new sentence when sentence changes
  useEffect(() => {
    setIsPlayingSegment(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlayingMyVoice(false);
    }
    setRecordingBlobUrl(recordingsCache[currentSentence?.id] || null);
    setSpeechResult(null);

    // Automatically reset back to Step 1 (Listen / 듣기) with text hidden for the new question
    setCurrentStep(1);
    setIsTextHidden(true);

    // Auto-play this sentence when navigating to it
    if (currentSentence) {
      const autoPlayTimer = setTimeout(() => {
        handlePlaySegment();
      }, 300);
      return () => clearTimeout(autoPlayTimer);
    }
  }, [currentIndex, currentSentence?.id]);

  // Clean up media recorder on unmount
  useEffect(() => {
    return () => {
      if (recordStopTimerRef.current) clearTimeout(recordStopTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!currentSentence) {
    return (
      <div className="w-full text-center py-12 px-4 space-y-4">
        <p className="text-base text-slate-700">No sentence found.</p>
        <button
          onClick={() => onNavigateScreen('list')}
          className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm"
        >
          Return to sentence list
        </button>
      </div>
    );
  }

  const currentProgress = progress[currentSentence.id] || {
    id: currentSentence.id,
    plays: 0,
    recordings: 0,
    selfCheck: [null, null, null],
    status: 'new',
  };

  const isSelfCheckComplete =
    currentProgress.selfCheck[0] !== null &&
    currentProgress.selfCheck[1] !== null &&
    currentProgress.selfCheck[2] !== null;

  const selfCheckCount = currentProgress.selfCheck.filter((c) => c !== null).length;
  const isStep4Recorded = currentProgress.status === 'done';
  const isSentenceFullyDone = isStep4Recorded && isSelfCheckComplete;

  // 1. Play segment logic
  const handlePlaySegment = (overrideLoop?: boolean) => {
    if (!currentSentence) return;
    const loopToUse = overrideLoop !== undefined ? overrideLoop : isLooping;
    setIsPlayingSegment(true);

    // Track play count
    onUpdateProgress(currentSentence.id, (prev) => ({
      ...prev,
      plays: prev.plays + 1,
    }));

    playerRef.current?.playSegment(
      currentSentence.start,
      currentSentence.end,
      loopToUse,
      () => {
        setIsPlayingSegment(false);
      }
    );
  };

  const handlePause = () => {
    setIsPlayingSegment(false);
    playerRef.current?.pause();
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    playerRef.current?.setLoop(next);
    if (next && !isPlayingSegment) {
      // If user enabled loop while stopped, automatically start playback with loop
      handlePlaySegment(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    playerRef.current?.setSpeed(speed);
  };

  // Helper to find supported audio MIME type across browsers (Chrome, Safari, Firefox, iOS, Android)
  // 2. Audio Recording (PRD Section 5: "plays the sentence once and records learner's voice at same time. Stops 1s after segment end. Loop is ignored while recording")
  const startRecording = async () => {
    setMicErrorNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setRecordingBlobUrl(url);
        setRecordingsCache((prev) => ({ ...prev, [currentSentence.id]: url }));
        setIsRecording(false);
        setIsPlayingSegment(false);

        // Update progress: status becomes "practiced" or "done" if in step 4
        onUpdateProgress(currentSentence.id, (prev) => {
          const nextStatus = currentStep === 4 ? 'done' : prev.status === 'done' ? 'done' : 'practiced';
          return {
            ...prev,
            recordings: prev.recordings + 1,
            status: nextStatus,
          };
        });

        // Release microphone tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Play sentence once (loop ignored during recording)
      playerRef.current?.playSegment(
        currentSentence.start,
        currentSentence.end,
        false, // loop is false
        () => {
          // Sentence reached its end: stop recording 1 second later
          if (recordStopTimerRef.current) clearTimeout(recordStopTimerRef.current);
          recordStopTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                mediaRecorderRef.current.stop();
              } catch (e) {
                console.warn('Error stopping media recorder', e);
              }
            }
          }, 1000);
        }
      );
    } catch (err: any) {
      console.warn('Microphone access denied or failed:', err);
      setIsRecording(false);
      setMicErrorNotice('Mic is off. You can still listen and shadow out loud.');
    }
  };

  const stopRecordingManual = () => {
    if (recordStopTimerRef.current) clearTimeout(recordStopTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    playerRef.current?.pause();
  };

  // Play learner's recorded voice
  const handlePlayMyVoice = () => {
    if (!recordingBlobUrl) return;
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    const audio = new Audio(recordingBlobUrl);
    audioElementRef.current = audio;
    setIsPlayingMyVoice(true);

    audio.onended = () => {
      setIsPlayingMyVoice(false);
    };
    audio.onerror = () => {
      setIsPlayingMyVoice(false);
    };
    audio.play();
  };

  // Play Original sentence right after
  const handlePlayOriginal = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlayingMyVoice(false);
    }
    handlePlaySegment(false);
  };

  // 3. Self-check rating (3 questions: 0 = 😀, 1 = 🙂, 2 = 😐)
  const handleSelfCheckRating = (questionIndex: number, rating: number) => {
    onUpdateProgress(currentSentence.id, (prev) => {
      const nextRatings = [...prev.selfCheck];
      nextRatings[questionIndex] = rating;
      return {
        ...prev,
        selfCheck: nextRatings,
      };
    });
  };

  // 4. Word check with Web Speech API
  const handleWordCheck = () => {
    if (!hasSpeechRecognition) return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListeningSpeech(true);
    setSpeechResult(null);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript || '';
      const recognizedWords = transcript
        .toLowerCase()
        .replace(/[^a-z0-9'\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      // Clean target sentence words
      const targetWords = currentSentence.text.split(/\s+/).map((raw) => {
        const cleaned = raw.toLowerCase().replace(/[^a-z0-9']/g, '');
        const matched = recognizedWords.some((rw: string) => rw === cleaned);
        return {
          word: raw,
          matched,
        };
      });

      const matchedCount = targetWords.filter((w) => w.matched).length;
      const totalCount = targetWords.length;

      setSpeechResult({
        transcript,
        matchedCount,
        totalCount,
        words: targetWords,
      });
      setIsListeningSpeech(false);
    };

    recognition.onerror = () => {
      setIsListeningSpeech(false);
    };

    recognition.onend = () => {
      setIsListeningSpeech(false);
    };

    try {
      recognition.start();
    } catch {
      setIsListeningSpeech(false);
    }
  };

  // Helper to format stress words in text
  const renderSentenceWithStress = (text: string, stressWords: string[]) => {
    const stressSet = new Set(stressWords.map((s) => s.toLowerCase().trim()));

    // Tokenize text keeping spaces/punctuation attached
    const tokens = text.split(/(\s+)/);

    return tokens.map((token, index) => {
      const cleaned = token.toLowerCase().replace(/[^a-z0-9']/g, '');
      const isStressed = stressSet.has(cleaned);

      if (isStressed) {
        return (
          <span
            key={index}
            className="font-extrabold text-amber-700 underline decoration-amber-400 decoration-3 underline-offset-4"
          >
            {token}
          </span>
        );
      }
      return <span key={index}>{token}</span>;
    });
  };

  const isLastSentence = currentIndex === sentences.length - 1;

  return (
    <div className="w-full space-y-4 px-3 py-1">
      {/* 2. Top Navigation Bar & Counter */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
        <button
          onClick={() => onNavigateScreen('list')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <List className="w-4 h-4 text-slate-500" />
          <span>List / 목록</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigateIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 disabled:text-slate-300 hover:bg-slate-100 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
            aria-label="Previous sentence"
            title="이전 문장으로 되돌아가기"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전</span>
          </button>

          <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums px-1">
            Sentence {currentIndex + 1} / {sentences.length}
          </span>
        </div>

        <button
          onClick={() => setIsTextHidden(!isTextHidden)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
        >
          {isTextHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isTextHidden ? 'Show Text' : 'Hide Text'}</span>
        </button>
      </div>

      {/* Completion Criteria & Mission Guide Card */}
      <div className="w-full bg-linear-to-r from-sky-50 via-indigo-50/50 to-amber-50/60 border border-sky-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>문장 완료 미션 (Completion Goals)</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              isSentenceFullyDone
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {isSentenceFullyDone ? '★ 문장 완료 달성!' : '진행 중 ⏳'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Mission 1: Step 4 Shadow Recording */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
              isStep4Recorded
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-medium'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                isStep4Recorded ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isStep4Recorded ? '✓' : '1'}
            </div>
            <div className="leading-tight truncate">
              <p className="font-bold truncate">4단계 무자막 녹음</p>
              <p className={`text-[10px] truncate ${isStep4Recorded ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isStep4Recorded ? '★ 녹음 완료!' : 'Step 4에서 녹음 필요'}
              </p>
            </div>
          </div>

          {/* Mission 2: 3 Self-Checks */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
              isSelfCheckComplete
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-medium'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                isSelfCheckComplete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isSelfCheckComplete ? '✓' : '2'}
            </div>
            <div className="leading-tight truncate">
              <p className="font-bold truncate">3가지 발음 점검</p>
              <p className={`text-[10px] truncate ${isSelfCheckComplete ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isSelfCheckComplete ? '3/3 점검 완료!' : `현재 ${selfCheckCount}/3 완료 (필수)`}
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center pt-0.5">
          💡 <strong>4단계 녹음</strong>과 <strong>3가지 자가점검</strong>을 모두 마치면 목록에 <strong>★완료</strong>로 등록됩니다.
        </p>
      </div>

      {/* 6. Step Guide (4 Distinct Color-Coded Tabs) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            {
              step: 1,
              icon: '🎧',
              label: '1. Listen',
              sub: '듣기',
              badge: null,
              activeClass: 'bg-sky-500 text-white border-sky-600 shadow-md ring-2 ring-sky-200',
              inactiveClass: 'bg-sky-50/80 text-sky-900 border border-sky-200 hover:bg-sky-100',
            },
            {
              step: 2,
              icon: '🤫',
              label: '2. Mumble',
              sub: '중얼거리기',
              badge: null,
              activeClass: 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-200',
              inactiveClass: 'bg-amber-50/80 text-amber-900 border border-amber-200 hover:bg-amber-100',
            },
            {
              step: 3,
              icon: '📖',
              label: '3. Read',
              sub: '읽으며 쉐도잉',
              badge: null,
              activeClass: 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200',
              inactiveClass: 'bg-indigo-50/80 text-indigo-900 border border-indigo-200 hover:bg-indigo-100',
            },
            {
              step: 4,
              icon: '⭐',
              label: '4. Shadow',
              sub: '무자막 쉐도잉',
              badge: '★완료필수',
              activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-200',
              inactiveClass: 'bg-emerald-50/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-100',
            },
          ].map((tab) => {
            const isActive = currentStep === tab.step;
            return (
              <button
                key={tab.step}
                onClick={() => handleSelectStep(tab.step as ShadowStep)}
                className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer border relative ${
                  isActive ? tab.activeClass : tab.inactiveClass
                }`}
              >
                {tab.badge && (
                  <span className="absolute -top-2 right-1 text-[8px] bg-amber-400 text-amber-950 font-extrabold px-1 py-0.2 rounded-full shadow-2xs">
                    {tab.badge}
                  </span>
                )}
                <div className="text-xs mb-0.5">{tab.icon}</div>
                <div className="text-[11px] font-bold leading-tight truncate">{tab.label}</div>
                <div
                  className={`text-[9px] font-semibold leading-tight truncate mt-0.5 ${
                    isActive ? 'opacity-90' : 'opacity-75'
                  }`}
                >
                  {tab.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Instruction Card */}
        <div className="mt-2 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
          {currentStep === 1 && (
            <p>
              🎧 <strong className="text-slate-800">Step 1 Listen:</strong> Text hidden. Just listen
              2–3 times to character emotions & rhythm. (자막 없이 소리에만 집중하여 들어보세요.)
            </p>
          )}
          {currentStep === 2 && (
            <p>
              🤫 <strong className="text-slate-800">Step 2 Mumble:</strong> Text hidden. Quietly
              follow the sound without forcing words. (자막 없이 입술로 작게 소리를 따라 해보세요.)
            </p>
          )}
          {currentStep === 3 && (
            <p>
              📖 <strong className="text-slate-800">Step 3 Read & Shadow:</strong> Text shown. Speak
              together with the actor simultaneously. (자막을 보며 강조 단어에 힘을 실어 말해보세요.)
            </p>
          )}
          {currentStep === 4 && (
            <p>
              ⭐ <strong className="text-slate-800">Step 4 Shadow:</strong> Text hidden. Speak
              together naturally from memory. (자막을 끄고 완벽하게 감정을 실어 쉐도잉해보세요.)
            </p>
          )}
        </div>
      </div>

      {/* 3 & 4. Sentence Box (Large font >= 22px, stress in bold, Korean toggleable) */}
      <div className="w-full bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-800 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200">
            {currentSentence.speaker}
          </span>
          <button
            onClick={() => setIsKoreanHidden(!isKoreanHidden)}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline decoration-dotted cursor-pointer"
          >
            {isKoreanHidden ? '한국어 뜻 보기' : '한국어 뜻 숨기기'}
          </button>
        </div>

        {/* Sentence text (at least 22px, stress in bold) */}
        <div className="min-h-[72px] flex items-center justify-center text-center p-2">
          {isTextHidden ? (
            <div className="text-slate-400 italic text-base flex flex-col items-center gap-1">
              <span>(Text hidden for shadowing practice)</span>
              <button
                onClick={() => setIsTextHidden(false)}
                className="text-xs text-sky-600 font-semibold not-italic hover:underline cursor-pointer"
              >
                Tap to peek text / 살짝 확인하기
              </button>
            </div>
          ) : (
            <p className="text-[23px] sm:text-[25px] leading-snug font-bold text-slate-900 tracking-tight">
              {renderSentenceWithStress(currentSentence.text, currentSentence.stress)}
            </p>
          )}
        </div>

        {/* Korean Meaning (small, gray, toggleable) */}
        {!isKoreanHidden && (
          <p className="text-xs text-slate-500 text-center font-medium border-t border-amber-200/60 pt-2">
            {currentSentence.korean}
          </p>
        )}
      </div>

      {/* 5. Segment Controls Row: Play, Loop, Speed buttons */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-3">
        {/* Loop Status Banner */}
        {isLoopWaiting && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold animate-pulse">
            <RotateCcw className="w-4 h-4 text-amber-700 animate-spin" />
            <span>🗣️ 1.5초 쉐도잉 시간: 지금 따라 말해보세요! (곧 자동 반복)</span>
          </div>
        )}

        {isLooping && isPlayingSegment && !isLoopWaiting && (
          <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-[11px] font-medium">
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>반복 재생 중: 원본 청취 후 1.5초간 따라 말할 시간이 주어집니다</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={() => (isPlayingSegment ? handlePause() : handlePlaySegment())}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isPlayingSegment ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <div className="text-left">
                  <div className="leading-tight">Pause</div>
                  <div className="text-[10px] font-normal text-sky-100">일시정지</div>
                </div>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <div className="text-left">
                  <div className="leading-tight">Play Sentence</div>
                  <div className="text-[10px] font-normal text-sky-100">문장 재생</div>
                </div>
              </>
            )}
          </button>

          {/* Loop Toggle */}
          <button
            onClick={handleToggleLoop}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isLooping
                ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1 font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Loop: {isLooping ? 'ON' : 'OFF'}</span>
            </div>
            <span className="text-[10px] font-normal text-slate-500">1.5초 간격 반복</span>
          </button>
        </div>

        {/* Speed Controls (0.5x / 0.75x / 1.0x) */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">Speed / 재생 속도:</span>
          <div className="flex items-center gap-1.5">
            {[0.5, 0.75, 1.0].map((rate) => {
              const isSelected = playbackSpeed === rate;
              return (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`min-w-[48px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {rate}×
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Record Area */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Mic className="w-4 h-4 text-rose-500" />
            <span>Voice Recording / 내 목소리 녹음</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {currentProgress.recordings > 0
              ? `${currentProgress.recordings}회 녹음 완료`
              : '아직 녹음 안 됨'}
          </span>
        </div>

        {/* Mic Denial Warning */}
        {micErrorNotice && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{micErrorNotice}</span>
          </div>
        )}

        {/* Primary Record Button */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-full min-h-[50px] px-4 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-xs flex flex-col items-center justify-center transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 text-base">
              <Mic className="w-5 h-5 fill-current" />
              <span>Record & Shadow / 녹음하며 따라하기</span>
            </div>
            <span className="text-[11px] font-normal text-rose-100">
              영상이 재생되며 동시에 내 목소리가 녹음됩니다 (종료 1초 후 자동 중단)
            </span>
          </button>
        ) : (
          <button
            onClick={stopRecordingManual}
            className="w-full min-h-[50px] px-4 py-3 bg-red-600 hover:bg-red-700 animate-pulse text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>Recording now... Tap to stop / 녹음 중... 중지하기</span>
          </button>
        )}

        {/* Step-aware Mission Guide Banner */}
        <div
          className={`p-2.5 rounded-xl text-[11px] border flex items-center gap-2 transition-all ${
            currentStep === 4
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          {currentStep === 4 ? (
            <>
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                ⭐ <strong>최종 4단계(무자막 쉐도잉):</strong> 여기서 녹음하면 <strong>[미션 1: 4단계 녹음]</strong>이 완료(★) 처리됩니다!
              </span>
            </>
          ) : (
            <>
              <span className="text-xs">💡</span>
              <span>
                1~3단계 연습 후, 마지막 <strong>[4단계 무자막 쉐도잉]</strong>에서 녹음해야 문장이 공식 <strong>'★ 완료'</strong>로 인정됩니다.
              </span>
            </>
          )}
        </div>

        {/* Replay Buttons (My Voice & Original) */}
        {recordingBlobUrl && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handlePlayMyVoice}
              disabled={isPlayingMyVoice}
              className="min-h-[48px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>{isPlayingMyVoice ? 'Playing...' : '▶ My Voice'}</span>
              </div>
              <span className="text-[10px] font-normal text-emerald-700">내 목소리 듣기</span>
            </button>

            <button
              onClick={handlePlayOriginal}
              className="min-h-[48px] px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-sky-600" />
                <span>▶ Original</span>
              </div>
              <span className="text-[10px] font-normal text-sky-700">배우 원본 듣기</span>
            </button>
          </div>
        )}

        {/* 9. Optional Speech Recognition (Check My Words) */}
        {hasSpeechRecognition && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleWordCheck}
              disabled={isListeningSpeech}
              className="w-full min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>
                {isListeningSpeech
                  ? 'Listening... Speak English clearly'
                  : 'Check My Words / 단어 일치 확인 (Web Speech)'}
              </span>
            </button>

            {speechResult && (
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    You said {speechResult.matchedCount} of {speechResult.totalCount} words!
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    {speechResult.matchedCount === speechResult.totalCount
                      ? 'Awesome match! 🎉'
                      : 'Great effort! Keep it up 👍'}
                  </span>
                </div>

                {/* Word badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {speechResult.words.map((item, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                        item.matched
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200/80 text-slate-500 underline decoration-slate-400'
                      }`}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Self-Check (after recording) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>Self-Check / 발음 자가진단</span>
          </h3>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              isSelfCheckComplete
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isSelfCheckComplete ? '3/3 점검 완료 ✓' : `${selfCheckCount}/3 점검 (다음 이동 필수)`}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          📋 <strong>필수 안내:</strong> 속도, 강세, 억양 3가지를 모두 체크해야 다음 문제 잠금이 해제되고 완료 미션 2번을 충족합니다.
        </p>

        {/* Question 1: Speed */}
        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-800">
            1. Did I keep up with the speed?
          </p>
          <p className="text-[11px] text-slate-500">배우의 속도를 놓치지 않고 따라갔나요?</p>
          <div className="flex gap-2 pt-1">
            {[
              { val: 0, label: '😀 Good' },
              { val: 1, label: '🙂 OK' },
              { val: 2, label: '😐 Try again' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => handleSelfCheckRating(0, opt.val)}
                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  currentProgress.selfCheck[0] === opt.val
                    ? 'bg-sky-500 text-white border-sky-500 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2: Stress */}
        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-800">
            2. Did I stress the bold words?
          </p>
          <p className="text-[11px] text-slate-500">굵은 글씨의 강조 단어에 힘을 주었나요?</p>
          <div className="flex gap-2 pt-1">
            {[
              { val: 0, label: '😀 Good' },
              { val: 1, label: '🙂 OK' },
              { val: 2, label: '😐 Try again' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => handleSelfCheckRating(1, opt.val)}
                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  currentProgress.selfCheck[1] === opt.val
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question 3: Intonation */}
        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-800">
            3. Did my voice go up and down like the actor?
          </p>
          <p className="text-[11px] text-slate-500">배우처럼 억양의 높낮이와 감정을 살렸나요?</p>
          <div className="flex gap-2 pt-1">
            {[
              { val: 0, label: '😀 Good' },
              { val: 1, label: '🙂 OK' },
              { val: 2, label: '😐 Try again' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => handleSelfCheckRating(2, opt.val)}
                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  currentProgress.selfCheck[2] === opt.val
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 10. Next Button / Finish CTA (Mandatory Self-Check requirement) */}
      <div className="w-full pt-1 pb-4">
        {/* Verification Notice */}
        {!isSelfCheckComplete ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-2">
            <span className="text-sm">🔒</span>
            <span>
              <strong>다음 이동 잠금:</strong> 속도·강세·억양 3가지 점검({selfCheckCount}/3)을 모두 완료해야 다음으로 넘어갈 수 있습니다.
            </span>
          </div>
        ) : isStep4Recorded ? (
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              🎉 <strong>완벽 달성!</strong> 4단계 녹음과 3가지 점검을 모두 완료하여 이 문장을 <strong>완료(★)</strong>했습니다.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>
              자가진단 완료! 다음 문장으로 이동 가능합니다. (💡 <strong>4단계(무자막)</strong>에서 녹음까지 마치면 목록에 <strong>★완료</strong>로 등록됩니다)
            </span>
          </div>
        )}

        {isLastSentence ? (
          <button
            onClick={() => onNavigateScreen('finish')}
            disabled={!isSelfCheckComplete}
            className="w-full min-h-[52px] px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 flex flex-col items-center justify-center transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Finish Practice! / 연습 완료</span>
            </div>
            <span className="text-[11px] font-normal opacity-90">연습 완료 및 결과 보기</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigateIndex(currentIndex + 1)}
            disabled={!isSelfCheckComplete}
            className="w-full min-h-[52px] px-6 py-3 bg-sky-500 hover:bg-sky-600 active:scale-98 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-md shadow-sky-500/20 flex flex-col items-center justify-center transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 text-base">
              <span>Next Sentence / 다음 문장</span>
              <ChevronRight className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-normal opacity-90">
              다음 문장으로 넘어가기 (#{currentIndex + 2})
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
