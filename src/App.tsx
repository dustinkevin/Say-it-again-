import React, { useState, useRef, useEffect } from 'react';
import { YouTubePlayer, YouTubePlayerRef } from './components/YouTubePlayer';
import { StartScreen } from './components/StartScreen';
import { SentenceListScreen } from './components/SentenceListScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { EditScreen } from './components/EditScreen';
import { FinishScreen } from './components/FinishScreen';
import {
  Sentence,
  SentenceProgress,
  ScreenType,
} from './types';
import {
  loadSentences,
  saveSentences,
  resetSentencesToDefault,
  loadProgress,
  saveProgress,
} from './utils/storage';
import { MOVIE_SETTINGS } from './constants/insideOutData';

export default function App() {
  const [sentences, setSentences] = useState<Sentence[]>(loadSentences);
  const [progress, setProgress] = useState<Record<number, SentenceProgress>>(loadProgress);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('start');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoopWaiting, setIsLoopWaiting] = useState<boolean>(false);

  const playerRef = useRef<YouTubePlayerRef | null>(null);

  // Sync state to storage
  const handleSaveSentences = (newSentences: Sentence[]) => {
    setSentences(newSentences);
    saveSentences(newSentences);
    if (currentIndex >= newSentences.length) {
      setCurrentIndex(Math.max(0, newSentences.length - 1));
    }
  };

  const handleResetSentences = () => {
    const defaults = resetSentencesToDefault();
    setSentences(defaults);
    setCurrentIndex(0);
  };

  const handleUpdateProgress = (
    id: number,
    updater: (prev: SentenceProgress) => SentenceProgress
  ) => {
    setProgress((prev) => {
      const current = prev[id] || {
        id,
        plays: 0,
        recordings: 0,
        selfCheck: [null, null, null],
        status: 'new',
      };
      const updated = updater(current);
      const next = { ...prev, [id]: updated };
      saveProgress(next);
      return next;
    });
  };

  const handleSelectSentence = (index: number) => {
    setCurrentIndex(index);
    setCurrentScreen('practice');
  };

  // Screens that show the video player (Screens 2, 3, 4)
  const showVideoPlayer =
    currentScreen === 'list' || currentScreen === 'practice' || currentScreen === 'edit';

  return (
    <div className="min-h-screen bg-amber-50/30 flex justify-center text-slate-800">
      {/* Centered Mobile Portrait Frame (max-w-[480px]) */}
      <div className="w-full max-w-[480px] min-h-screen bg-slate-50 flex flex-col shadow-2xl border-x border-slate-200 relative">
        {/* Persistent Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('start')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <span className="text-xl">✏️</span>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
                Scene Shadow
              </div>
              <div className="text-[10px] font-bold text-sky-600 leading-tight">
                Say It Again!
              </div>
            </div>
          </button>

          {/* Screen Indicator or Quick Links */}
          <div className="flex items-center gap-1.5 text-xs">
            {currentScreen !== 'start' && (
              <button
                onClick={() => setCurrentScreen('start')}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
              >
                Home
              </button>
            )}
            {currentScreen !== 'list' && (
              <button
                onClick={() => setCurrentScreen('list')}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
              >
                List
              </button>
            )}
            {currentScreen !== 'edit' && (
              <button
                onClick={() => setCurrentScreen('edit')}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
              >
                Edit
              </button>
            )}
          </div>
        </header>

        {/* Video Player Area for Screens 2, 3, 4 */}
        {showVideoPlayer && (
          <div className="w-full px-3 pt-3 bg-white border-b border-slate-100">
            <YouTubePlayer
              ref={playerRef}
              onLoopWaitingChange={setIsLoopWaiting}
            />
          </div>
        )}

        {/* Screen Content */}
        <main className="flex-1 w-full pb-8">
          {currentScreen === 'start' && (
            <StartScreen
              onNavigate={setCurrentScreen}
              sentenceCount={sentences.length}
            />
          )}

          {currentScreen === 'list' && (
            <SentenceListScreen
              sentences={sentences}
              progress={progress}
              onSelectSentence={handleSelectSentence}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'practice' && (
            <PracticeScreen
              sentences={sentences}
              currentIndex={currentIndex}
              progress={progress}
              playerRef={playerRef}
              isLoopWaiting={isLoopWaiting}
              onNavigateIndex={setCurrentIndex}
              onNavigateScreen={setCurrentScreen}
              onUpdateProgress={handleUpdateProgress}
            />
          )}

          {currentScreen === 'edit' && (
            <EditScreen
              sentences={sentences}
              playerRef={playerRef}
              onSaveSentences={handleSaveSentences}
              onResetSentences={handleResetSentences}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'finish' && (
            <FinishScreen
              sentences={sentences}
              progress={progress}
              onSelectSentence={handleSelectSentence}
              onNavigate={setCurrentScreen}
            />
          )}
        </main>
      </div>
    </div>
  );
}
