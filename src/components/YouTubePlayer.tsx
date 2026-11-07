import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { ExternalLink, AlertCircle, Play, Film, Clock } from 'lucide-react';
import { MOVIE_SETTINGS } from '../constants/insideOutData';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerRef {
  playSegment: (start: number, end: number, loop: boolean, onSegmentEnd?: () => void) => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  isReady: () => boolean;
  openPreview: () => void;
}

interface Props {
  onTimeUpdate?: (time: number) => void;
  onStateChange?: (state: number) => void;
  onLoopWaitingChange?: (isWaiting: boolean) => void;
  className?: string;
  autoPlayRange?: { start: number; end: number } | null;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, Props>(
  ({ onTimeUpdate, onStateChange, onLoopWaitingChange, className = '' }, ref) => {
    const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
    const playerRef = useRef<any>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [hasEmbedError, setHasEmbedError] = useState(false);
    const [isLoopWaiting, setIsLoopWaiting] = useState(false);
    const [currentTime, setCurrentTime] = useState(MOVIE_SETTINGS.startSeconds);
    const [showPreviewOverlay, setShowPreviewOverlay] = useState<boolean>(true);

    // Active segment definition and playback tracking
    const targetSegmentRef = useRef<{
      start: number;
      end: number;
      loop: boolean;
      onEnd?: () => void;
      seekTargetTime?: number;
      isWaiting: boolean;
      loopTimer?: any;
    } | null>(null);

    const timeCheckIntervalRef = useRef<any>(null);

    // Notify parent of loop waiting status changes
    useEffect(() => {
      if (onLoopWaitingChange) {
        onLoopWaitingChange(isLoopWaiting);
      }
    }, [isLoopWaiting, onLoopWaitingChange]);

    // Load YouTube IFrame API
    useEffect(() => {
      let isMounted = true;

      const initPlayer = () => {
        if (!window.YT || !window.YT.Player) return;
        if (playerRef.current) return;

        try {
          playerRef.current = new window.YT.Player(containerId.current, {
            videoId: MOVIE_SETTINGS.videoId,
            playerVars: {
              start: MOVIE_SETTINGS.startSeconds,
              end: MOVIE_SETTINGS.endSeconds,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1,
              cc_load_policy: 0,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                if (!isMounted) return;
                setIsPlayerReady(true);
                try {
                  playerRef.current.seekTo(MOVIE_SETTINGS.startSeconds, true);
                  playerRef.current.pauseVideo?.();
                } catch {
                  // ignore
                }
              },
              onStateChange: (event: any) => {
                if (!isMounted) return;
                const state = event.data;
                if (onStateChange) onStateChange(state);
              },
              onError: (event: any) => {
                if (!isMounted) return;
                console.warn('YouTube player error:', event.data);
                if (event.data === 101 || event.data === 150 || event.data === 2) {
                  setHasEmbedError(true);
                }
              },
            },
          });
        } catch (err) {
          console.error('Failed to create YouTube player', err);
          if (isMounted) setHasEmbedError(true);
        }
      };

      if (!window.YT) {
        const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevReady) prevReady();
          if (isMounted) initPlayer();
        };
      } else if (window.YT && window.YT.Player) {
        initPlayer();
      }

      return () => {
        isMounted = false;
        if (timeCheckIntervalRef.current) {
          clearInterval(timeCheckIntervalRef.current);
        }
        if (targetSegmentRef.current?.loopTimer) {
          clearTimeout(targetSegmentRef.current.loopTimer);
        }
        if (playerRef.current && playerRef.current.destroy) {
          try {
            playerRef.current.destroy();
          } catch {
            // ignore
          }
        }
      };
    }, []);

    // Strict time interval checking (every 50ms)
    useEffect(() => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }

      timeCheckIntervalRef.current = setInterval(() => {
        if (!playerRef.current || !isPlayerReady) return;

        try {
          const time = playerRef.current.getCurrentTime?.() ?? 0;
          setCurrentTime(time);
          if (onTimeUpdate) onTimeUpdate(time);

          // Enforce 0:55 to 1:53 range restriction
          if (time < MOVIE_SETTINGS.startSeconds && time > 1.0) {
            playerRef.current.seekTo?.(MOVIE_SETTINGS.startSeconds, true);
          } else if (time > MOVIE_SETTINGS.endSeconds + 0.5) {
            playerRef.current.pauseVideo?.();
            playerRef.current.seekTo?.(MOVIE_SETTINGS.startSeconds, true);
          }

          const seg = targetSegmentRef.current;
          if (seg) {
            // If waiting for 1.5s loop interval
            if (seg.isWaiting) {
              playerRef.current.pauseVideo?.();
              return;
            }

            // Check if player has completed seek
            if (seg.seekTargetTime !== undefined) {
              // Wait until time is near seekTargetTime (within start window)
              if (time >= seg.start - 0.8 && time < seg.end) {
                // Seek confirmed! Clear seek target
                seg.seekTargetTime = undefined;
              } else {
                // Still waiting for seekTo to register in YouTube clock; don't trigger end yet
                return;
              }
            }

            // When current time reaches or exceeds segment end:
            if (time >= seg.end) {
              // ALWAYS immediately pause video
              playerRef.current.pauseVideo?.();

              // Trigger end callback if present
              if (seg.onEnd) {
                const cb = seg.onEnd;
                seg.onEnd = undefined;
                cb();
              }

              // Check loop state
              if (seg.loop) {
                seg.isWaiting = true;
                setIsLoopWaiting(true);

                if (seg.loopTimer) clearTimeout(seg.loopTimer);

                // Wait 1.5 seconds, then loop specifically this sentence
                seg.loopTimer = setTimeout(() => {
                  if (targetSegmentRef.current && targetSegmentRef.current.loop && playerRef.current) {
                    try {
                      targetSegmentRef.current.isWaiting = false;
                      targetSegmentRef.current.seekTargetTime = targetSegmentRef.current.start;
                      setIsLoopWaiting(false);
                      playerRef.current.seekTo(targetSegmentRef.current.start, true);
                      playerRef.current.playVideo();
                    } catch (e) {
                      console.warn('Loop restart failed', e);
                    }
                  } else {
                    setIsLoopWaiting(false);
                  }
                }, 1500);
              } else {
                // Loop is OFF: strictly stay paused at end!
                seg.isWaiting = false;
                setIsLoopWaiting(false);
                seg.seekTargetTime = undefined;
              }
            }
          }
        } catch {
          // ignore transient iframe access errors
        }
      }, 50);

      return () => {
        if (timeCheckIntervalRef.current) {
          clearInterval(timeCheckIntervalRef.current);
        }
      };
    }, [isPlayerReady, onTimeUpdate]);

    // Expose control methods to parent component
    useImperativeHandle(ref, () => ({
      playSegment: (start: number, end: number, loop: boolean, onSegmentEnd?: () => void) => {
        setShowPreviewOverlay(false);

        if (!playerRef.current || !isPlayerReady) {
          if (onSegmentEnd) {
            setTimeout(onSegmentEnd, (end - start) * 1000 + 1000);
          }
          return;
        }

        if (targetSegmentRef.current?.loopTimer) {
          clearTimeout(targetSegmentRef.current.loopTimer);
        }

        setIsLoopWaiting(false);
        targetSegmentRef.current = {
          start,
          end,
          loop,
          seekTargetTime: start,
          isWaiting: false,
          onEnd: onSegmentEnd,
          loopTimer: null,
        };

        try {
          playerRef.current.seekTo(start, true);
          playerRef.current.playVideo();
        } catch (e) {
          console.warn('playSegment failed', e);
        }
      },

      pause: () => {
        if (targetSegmentRef.current?.loopTimer) {
          clearTimeout(targetSegmentRef.current.loopTimer);
        }
        if (targetSegmentRef.current) {
          targetSegmentRef.current.isWaiting = false;
        }
        setIsLoopWaiting(false);
        try {
          playerRef.current?.pauseVideo?.();
        } catch (e) {
          console.warn('pause failed', e);
        }
      },

      stop: () => {
        if (targetSegmentRef.current?.loopTimer) {
          clearTimeout(targetSegmentRef.current.loopTimer);
        }
        targetSegmentRef.current = null;
        setIsLoopWaiting(false);
        try {
          playerRef.current?.pauseVideo?.();
          playerRef.current?.seekTo?.(MOVIE_SETTINGS.startSeconds, true);
        } catch (e) {
          console.warn('stop failed', e);
        }
      },

      setSpeed: (rate: number) => {
        try {
          playerRef.current?.setPlaybackRate?.(rate);
        } catch (e) {
          console.warn('setSpeed failed', e);
        }
      },

      setLoop: (loop: boolean) => {
        if (targetSegmentRef.current) {
          targetSegmentRef.current.loop = loop;

          // If loop is turned OFF while in 1.5s waiting period:
          if (!loop && targetSegmentRef.current.loopTimer) {
            clearTimeout(targetSegmentRef.current.loopTimer);
            targetSegmentRef.current.loopTimer = null;
            targetSegmentRef.current.isWaiting = false;
            setIsLoopWaiting(false);
            playerRef.current?.pauseVideo?.();
          }
        }
      },

      getCurrentTime: () => {
        try {
          return playerRef.current?.getCurrentTime?.() ?? currentTime;
        } catch {
          return currentTime;
        }
      },

      seekTo: (seconds: number) => {
        try {
          playerRef.current?.seekTo?.(seconds, true);
        } catch (e) {
          console.warn('seekTo failed', e);
        }
      },

      isReady: () => isPlayerReady && !hasEmbedError,

      openPreview: () => {
        setShowPreviewOverlay(true);
        try {
          playerRef.current?.pauseVideo?.();
          playerRef.current?.seekTo?.(MOVIE_SETTINGS.startSeconds, true);
        } catch {
          // ignore
        }
      },
    }));

    // Start full 0:55 – 1:53 preview playback
    const handleStartFullPreview = () => {
      setShowPreviewOverlay(false);
      if (playerRef.current && isPlayerReady) {
        targetSegmentRef.current = {
          start: MOVIE_SETTINGS.startSeconds,
          end: MOVIE_SETTINGS.endSeconds,
          loop: false,
          seekTargetTime: MOVIE_SETTINGS.startSeconds,
          isWaiting: false,
          loopTimer: null,
        };
        try {
          playerRef.current.seekTo(MOVIE_SETTINGS.startSeconds, true);
          playerRef.current.playVideo();
        } catch (e) {
          console.warn('Preview play failed', e);
        }
      }
    };

    return (
      <div className={`w-full flex flex-col items-center ${className}`}>
        {/* Video 16:9 Aspect Ratio Container */}
        <div className="w-full relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-200">
          {hasEmbedError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white z-20">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-base font-semibold mb-1">
                This video can't play inside the app.
              </p>
              <p className="text-xs text-slate-300 mb-4">
                외부 임베드가 제한되어 있어 유튜브 창에서 직접 확인하실 수 있습니다.
              </p>
              <a
                href={`${MOVIE_SETTINGS.youtubeUrl}&t=${MOVIE_SETTINGS.startSeconds}s`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Tap to open it on YouTube / 유튜브에서 열기
              </a>
              <p className="text-[11px] text-slate-400 mt-3">
                문장 자막, 녹음, 발음 자가진단은 앱에서 정상 동작합니다.
              </p>
            </div>
          ) : (
            <div className="w-full h-full relative">
              {/* Underlying YouTube Iframe */}
              <div id={containerId.current} className="w-full h-full pointer-events-auto" />

              {/* ‘쉐도잉 영상 미리보기’ Overlay (Shown when initially entering) */}
              {showPreviewOverlay && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-950/95 text-white p-5 text-center backdrop-blur-xs transition-opacity">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/40 mb-2">
                    <Film className="w-3.5 h-3.5" />
                    <span>{MOVIE_SETTINGS.titleEn} ({MOVIE_SETTINGS.releaseYear})</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-1">
                    쉐도잉 영상 미리보기
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 max-w-xs leading-relaxed">
                    장면: {MOVIE_SETTINGS.sceneDescription}
                    <span className="block text-[11px] text-amber-200 font-mono mt-0.5">
                      지정 연습 구간: 0:55 – 1:53 (총 58초 클립)
                    </span>
                  </p>

                  <button
                    onClick={handleStartFullPreview}
                    className="min-h-[48px] px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-bold text-sm shadow-lg shadow-sky-500/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>재생하기 (0:55부터 시작)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2.5">
                    또는 아래 문장의 '문장 재생' 버튼을 누르면 해당 문장만 재생됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mandatory Educational One-Line Credit Under Video (At least 13px, gray) */}
        <div className="w-full px-2 pt-2 pb-1 text-center flex flex-col items-center">
          <p className="text-[13px] leading-snug text-slate-500 break-words font-medium">
            {MOVIE_SETTINGS.oneLineCredit}
          </p>
        </div>
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';
