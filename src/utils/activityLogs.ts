import { createClient } from '@/lib/supabase/client';
import type { ActivityType, UserActivityLog } from '../types';

const PENDING_LOGS_KEY = 'scene_shadow_pending_activity_logs_v1';

export interface RecordActivityParams {
  userId?: string | null;
  sentenceId: number;
  sentenceText: string;
  speaker: string;
  step: number;
  activityType: ActivityType;
}

function loadPendingLocalLogs(): UserActivityLog[] {
  try {
    const raw = localStorage.getItem(PENDING_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingLocalLogs(logs: UserActivityLog[]): void {
  try {
    localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // ignore storage errors
  }
}

export async function recordUserActivity({
  userId,
  sentenceId,
  sentenceText,
  speaker,
  step,
  activityType,
}: RecordActivityParams): Promise<UserActivityLog | null> {
  const recordedAt = new Date().toISOString();
  const listenCount = activityType === 'listen' ? 1 : 0;
  const shadowCount = activityType === 'shadow' ? 1 : 0;

  if (!userId) {
    // Buffer locally when user is not signed in yet
    const localLog: UserActivityLog = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sentence_id: sentenceId,
      sentence_text: sentenceText,
      speaker,
      step,
      activity_type: activityType,
      listen_count: listenCount,
      shadow_count: shadowCount,
      recorded_at: recordedAt,
    };
    const existing = loadPendingLocalLogs();
    savePendingLocalLogs([localLog, ...existing].slice(0, 200));
    return localLog;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        sentence_id: sentenceId,
        sentence_text: sentenceText,
        speaker,
        step,
        activity_type: activityType,
        listen_count: listenCount,
        shadow_count: shadowCount,
        recorded_at: recordedAt,
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert activity log into Supabase:', error.message);
      return null;
    }

    return data as UserActivityLog;
  } catch (err) {
    console.warn('Unexpected error saving activity log:', err);
    return null;
  }
}

export async function syncPendingActivitiesToSupabase(userId: string): Promise<void> {
  const pending = loadPendingLocalLogs();
  if (pending.length === 0) return;

  try {
    const supabase = createClient();
    const rows = pending.map((item) => ({
      user_id: userId,
      sentence_id: item.sentence_id,
      sentence_text: item.sentence_text,
      speaker: item.speaker,
      step: item.step,
      activity_type: item.activity_type,
      listen_count: item.listen_count,
      shadow_count: item.shadow_count,
      recorded_at: item.recorded_at,
    }));

    const { error } = await supabase.from('user_activity_logs').insert(rows);
    if (!error) {
      savePendingLocalLogs([]);
    } else {
      console.warn('Failed to sync pending activity logs:', error.message);
    }
  } catch (err) {
    console.warn('Unexpected error syncing pending logs:', err);
  }
}

export async function fetchUserActivityLogs(userId?: string | null): Promise<{
  logs: UserActivityLog[];
  source: 'supabase' | 'local';
  error?: string;
}> {
  if (!userId) {
    return {
      logs: loadPendingLocalLogs(),
      source: 'local',
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(300);

    if (error) {
      return {
        logs: [],
        source: 'supabase',
        error: error.message,
      };
    }

    return {
      logs: (data as UserActivityLog[]) || [],
      source: 'supabase',
    };
  } catch (err: any) {
    return {
      logs: [],
      source: 'supabase',
      error: err?.message || '활동 기록을 불러오지 못했습니다.',
    };
  }
}
