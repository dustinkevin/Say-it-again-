import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Play,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
  RotateCcw,
  Clock,
  AlertCircle,
  Check,
  Copy,
} from 'lucide-react';
import { Sentence, ScreenType } from '../types';
import { MOVIE_SETTINGS } from '../constants/insideOutData';
import { formatTime } from '../utils/storage';
import { YouTubePlayerRef } from './YouTubePlayer';

interface Props {
  sentences: Sentence[];
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  onSaveSentences: (sentences: Sentence[]) => void;
  onResetSentences: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const EditScreen: React.FC<Props> = ({
  sentences,
  playerRef,
  onSaveSentences,
  onResetSentences,
  onNavigate,
}) => {
  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState('Riley');
  const [text, setText] = useState('');
  const [korean, setKorean] = useState('');
  const [stressInput, setStressInput] = useState('');
  const [startTime, setStartTime] = useState<number>(55.0);
  const [endTime, setEndTime] = useState<number>(58.0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  // Import / Export modal
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // In-app confirmation dialog state (avoiding window.confirm in iframe)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Set Start = now (rounded to 0.1s)
  const handleSetStartNow = () => {
    const now = playerRef.current?.getCurrentTime?.() ?? MOVIE_SETTINGS.startSeconds;
    const rounded = Math.round(now * 10) / 10;
    setStartTime(rounded);
    if (endTime <= rounded) {
      setEndTime(Math.round((rounded + 2.5) * 10) / 10);
    }
    validateTimeAndLength(rounded, endTime, text);
  };

  // Set End = now (rounded to 0.1s)
  const handleSetEndNow = () => {
    const now = playerRef.current?.getCurrentTime?.() ?? (startTime + 2.0);
    const rounded = Math.round(now * 10) / 10;
    setEndTime(rounded);
    validateTimeAndLength(startTime, rounded, text);
  };

  // Test segment playback
  const handleTestSegment = () => {
    if (startTime >= endTime) {
      setFormError('End time must be greater than start time.');
      return;
    }
    playerRef.current?.playSegment(startTime, endTime, false);
  };

  // Validation rules check
  const validateTimeAndLength = (start: number, end: number, sentenceText: string): boolean => {
    setFormError(null);
    setFormWarning(null);

    // Range bounds
    if (start < MOVIE_SETTINGS.startSeconds || start > MOVIE_SETTINGS.endSeconds) {
      setFormError(`Start time must be within [0:55 – 1:53] (${MOVIE_SETTINGS.startSeconds}s–${MOVIE_SETTINGS.endSeconds}s).`);
      return false;
    }
    if (end < MOVIE_SETTINGS.startSeconds || end > MOVIE_SETTINGS.endSeconds) {
      setFormError(`End time must be within [0:55 – 1:53] (${MOVIE_SETTINGS.startSeconds}s–${MOVIE_SETTINGS.endSeconds}s).`);
      return false;
    }
    if (end <= start) {
      setFormError('End time must be greater than start time.');
      return false;
    }

    // Gentle warnings
    const duration = end - start;
    const wordCount = sentenceText.trim().split(/\s+/).filter(Boolean).length;
    const warnings: string[] = [];

    if (duration > 4.0) {
      warnings.push(`Duration (${duration.toFixed(1)}s) is longer than recommended 4 seconds.`);
    }
    if (wordCount > 12) {
      warnings.push(`Word count (${wordCount} words) is longer than recommended 12 words.`);
    }

    if (warnings.length > 0) {
      setFormWarning(warnings.join(' '));
    }

    return true;
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setFormError('Please enter the English sentence text.');
      return;
    }

    if (!validateTimeAndLength(startTime, endTime, text)) {
      return;
    }

    const stressWords = stressInput
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    if (editingId !== null) {
      // Edit existing
      const updated = sentences.map((s) => {
        if (s.id === editingId) {
          return {
            ...s,
            speaker: speaker.trim() || 'Speaker',
            text: text.trim(),
            korean: korean.trim(),
            stress: stressWords,
            start: startTime,
            end: endTime,
          };
        }
        return s;
      });
      onSaveSentences(updated);
      setEditingId(null);
    } else {
      // Add new
      const nextId = sentences.length > 0 ? Math.max(...sentences.map((s) => s.id)) + 1 : 1;
      const newSentence: Sentence = {
        id: nextId,
        speaker: speaker.trim() || 'Speaker',
        text: text.trim(),
        korean: korean.trim(),
        stress: stressWords,
        start: startTime,
        end: endTime,
      };
      onSaveSentences([...sentences, newSentence]);
    }

    // Reset fields
    setText('');
    setKorean('');
    setStressInput('');
    setStartTime(56.0);
    setEndTime(59.0);
    setFormError(null);
    setFormWarning(null);
  };

  const handleStartEdit = (s: Sentence) => {
    setEditingId(s.id);
    setSpeaker(s.speaker);
    setText(s.text);
    setKorean(s.korean);
    setStressInput(s.stress.join(', '));
    setStartTime(s.start);
    setEndTime(s.end);
    validateTimeAndLength(s.start, s.end, s.text);
    playerRef.current?.seekTo(s.start);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setText('');
    setKorean('');
    setStressInput('');
    setStartTime(56.0);
    setEndTime(59.0);
    setFormError(null);
    setFormWarning(null);
  };

  const handleRequestDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const handleExecuteDelete = () => {
    if (confirmDeleteId === null) return;
    const updated = sentences.filter((s) => s.id !== confirmDeleteId);
    onSaveSentences(updated);
    if (editingId === confirmDeleteId) handleCancelEdit();
    setConfirmDeleteId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sentences.length) return;

    const copy = [...sentences];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onSaveSentences(copy);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(sentences, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleImportJson = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of sentences.');
      }
      for (const item of parsed) {
        if (!item.text || typeof item.start !== 'number' || typeof item.end !== 'number') {
          throw new Error('Each sentence must have text, start, and end properties.');
        }
      }
      onSaveSentences(parsed);
      setIsImportOpen(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON format.');
    }
  };

  return (
    <div className="w-full space-y-4 px-3 py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('list')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List / 목록으로</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Import JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form Card */}
      <form
        onSubmit={handleSaveForm}
        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            {editingId !== null ? <Edit2 className="w-4 h-4 text-sky-600" /> : <Plus className="w-4 h-4 text-sky-600" />}
            <span>{editingId !== null ? 'Edit Sentence' : 'Add New Sentence'}</span>
          </h3>
          {editingId !== null && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Cancel Edit / 취소
            </button>
          )}
        </div>

        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formWarning && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formWarning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Speaker / 화자
            </label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="e.g. Riley, Dad, Mom"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Stress Words / 강세 단어 (쉼표 구분)
            </label>
            <input
              type="text"
              value={stressInput}
              onChange={(e) => setStressInput(e.target.value)}
              placeholder="e.g. great, attitude"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            English Sentence / 영어 문장 *
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              validateTimeAndLength(startTime, endTime, e.target.value);
            }}
            placeholder="Type exactly what is spoken in the film clip..."
            rows={2}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Korean Meaning / 한국어 뜻
          </label>
          <input
            type="text"
            value={korean}
            onChange={(e) => setKorean(e.target.value)}
            placeholder="e.g. 학교 좋았다고요, 됐죠?"
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Start / End Time with Live Video Buttons */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Segment Timing (0:55 – 1:53)</span>
            </span>
            <button
              type="button"
              onClick={handleTestSegment}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-100 px-2 py-1 rounded-lg cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test Segment / 구간 재생</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                Start: {formatTime(startTime)} ({startTime.toFixed(1)}s)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="55.0"
                  max="113.0"
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 55.0;
                    setStartTime(val);
                    validateTimeAndLength(val, endTime, text);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleSetStartNow}
                  className="text-[10px] font-bold px-2 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Capture current playing time as start"
                >
                  Set Start = now
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">
                End: {formatTime(endTime)} ({endTime.toFixed(1)}s)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="55.0"
                  max="113.0"
                  value={endTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 58.0;
                    setEndTime(val);
                    validateTimeAndLength(startTime, val, text);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleSetEndNow}
                  className="text-[10px] font-bold px-2 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Capture current playing time as end"
                >
                  Set End = now
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full min-h-[48px] py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs"
        >
          {editingId !== null ? 'Save Changes / 변경사항 저장' : 'Add Sentence / 문장 추가하기'}
        </button>
      </form>

      {/* Sentence List Table / Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700">
            Current Sentences ({sentences.length})
          </span>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default / 기본값 복원</span>
          </button>
        </div>

        <div className="space-y-2">
          {sentences.map((s, idx) => (
            <div
              key={s.id}
              className={`p-3 bg-white border rounded-xl shadow-2xs transition-all ${
                editingId === s.id ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                      {s.speaker}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {formatTime(s.start)} – {formatTime(s.end)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1">{s.text}</p>
                  <p className="text-[11px] text-slate-500">{s.korean}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => playerRef.current?.playSegment(s.start, s.end, false)}
                    className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                    title="Play segment"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(s)}
                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg cursor-pointer"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === sentences.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg cursor-pointer"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRequestDelete(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl text-center">
            <h4 className="text-base font-bold text-slate-900">Delete Sentence?</h4>
            <p className="text-xs text-slate-600">
              이 문장을 삭제하시겠습니까? 삭제된 문장은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel / 취소
              </button>
              <button
                onClick={handleExecuteDelete}
                className="flex-1 min-h-[44px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Delete / 삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl text-center">
            <h4 className="text-base font-bold text-slate-900">Reset to Defaults?</h4>
            <p className="text-xs text-slate-600">
              모든 문장을 기본 10개 Inside Out 문장으로 복원하시겠습니까? (현재 수정된 내용이 초기화됩니다)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel / 취소
              </button>
              <button
                onClick={() => {
                  onResetSentences();
                  setShowResetConfirm(false);
                }}
                className="flex-1 min-h-[44px] bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset / 복원하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-900">Export Sentences (JSON)</h4>
              <button
                onClick={() => setIsExportOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Close / 닫기
              </button>
            </div>
            <textarea
              readOnly
              value={JSON.stringify(sentences, null, 2)}
              rows={8}
              className="w-full text-[11px] font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button
              onClick={handleExportJson}
              className="w-full min-h-[44px] bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {copyFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard! / 복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy JSON to Clipboard / 클립보드로 복사</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-900">Import Sentences (JSON)</h4>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Close / 닫기
              </button>
            </div>
            {importError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{importError}</p>
            )}
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON array here..."
              rows={8}
              className="w-full text-[11px] font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsImportOpen(false)}
                className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel / 취소
              </button>
              <button
                onClick={handleImportJson}
                className="flex-1 min-h-[44px] bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
              >
                Import / 가져오기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
