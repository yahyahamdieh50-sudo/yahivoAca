import React, { useRef, useCallback } from 'react';
import { Video, Sparkles, Clock, Film, Clapperboard, Languages } from 'lucide-react';
import {
  InteractiveTrainingVideoPlayer,
  type InteractiveTelemetryPayload,
} from './InteractiveTrainingVideoPlayer';
import { type InteractiveLessonId } from '../data/interactiveTrainingVideos';

export interface AcademyVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  playbackType?: 'interactive' | 'mp4';
  interactiveLessonId?: InteractiveLessonId | null;
  technicalSkillLevel?: string;
  requiredTools?: string[];
  safetyPrerequisites?: string[];
  referenceManualId?: string | null;
  metadataUpdatedAt?: string;
  metadataUpdatedBy?: string;
  prompt: string;
  interactionId: string;
  parentVideoId: string | null;
  rootVideoId: string;
  turnType: 'generate' | 'edit' | 'extend';
  turnNumber: number;
  durationSeconds: number;
  cumulativeDurationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  resolution: string;
  streamUrl: string;
  courseId: string | null;
  moduleId: string | null;
  isCourseTrailer: boolean;
  showInLibrary: boolean;
  published: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface AcademyVideoPlayerProps {
  video?: AcademyVideo | null;
  title: string;
  subtitle?: string;
  posterImage?: string;
  canGenerate?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  onGenerateClick?: () => void;
  onEditInStudioClick?: (video: AcademyVideo) => void;
  onVideoEnded?: () => void;
  compact?: boolean;
}

export const AcademyVideoPlayer: React.FC<AcademyVideoPlayerProps> = ({
  video,
  title,
  subtitle,
  posterImage,
  canGenerate = false,
  currentUserId,
  currentUserName,
  onGenerateClick,
  onEditInStudioClick,
  onVideoEnded,
  compact = false,
}) => {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const viewRecordedRef = useRef<string | null>(null);
  const completeRecordedRef = useRef<string | null>(null);
  const endedFlagRef = useRef<boolean>(false);
  const maxTimeRef = useRef<number>(0);
  const lastBucketRef = useRef<number>(-1);
  const lastPingTsRef = useRef<number>(0);

  const sendTelemetry = useCallback(
    (
      videoId: string,
      payload: InteractiveTelemetryPayload
    ) => {
      fetch(`/api/videos/${encodeURIComponent(videoId)}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          userId: currentUserId || 'usr_guest',
          userName: currentUserName || 'Academy Student',
        }),
      }).catch(() => {});
    },
    [currentUserId, currentUserName]
  );

  // Built-in Bilingual Narrated Animated Interactive Training Lesson
  if (video && video.playbackType === 'interactive' && video.interactiveLessonId) {
    const tools = Array.isArray(video.requiredTools) ? video.requiredTools : [];
    const safety = Array.isArray(video.safetyPrerequisites) ? video.safetyPrerequisites : [];
    const hasTechBrief = !compact && Boolean(video.technicalSkillLevel || tools.length > 0 || safety.length > 0);

    return (
      <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <InteractiveTrainingVideoPlayer
          lessonId={video.interactiveLessonId}
          videoId={video.id}
          compact={compact}
          onTelemetry={(payload) => sendTelemetry(video.id, payload)}
          onVideoEnded={onVideoEnded}
        />

        <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
              <Film className="w-3.5 h-3.5" />
              {video.durationSeconds}s
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <Languages className="w-3.5 h-3.5" />
              EN / AR Voice & Captions
            </span>
            {video.technicalSkillLevel && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-200">{video.technicalSkillLevel}</span>
              </>
            )}
          </div>
        </div>

        {hasTechBrief && (
          <div className="px-4 py-3.5 bg-slate-900/70 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-sky-400 tracking-wide">
                Required Tools ({tools.length})
              </div>
              {tools.length > 0 ? (
                <ul className="space-y-1 text-slate-300">
                  {tools.map((tool, i) => (
                    <li key={`${tool}-${i}`} className="leading-snug">
                      <span className="font-mono tabular-nums text-slate-500 mr-1.5">
                        {i + 1}.
                      </span>
                      {tool}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">Standard HVAC field tool kit.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-400 tracking-wide">
                Safety Prerequisites ({safety.length})
              </div>
              {safety.length > 0 ? (
                <ul className="space-y-1 text-slate-300">
                  {safety.map((req, i) => (
                    <li key={`${req}-${i}`} className="leading-snug">
                      <span className="font-mono tabular-nums text-amber-500/80 mr-1.5">
                        S{i + 1}
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">
                  Verify LOTO, PPE, and ELCB/RCCB isolation prior to work.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (video && video.streamUrl) {
    const isPortrait = video.aspectRatio === '9:16';

    const getBucket = (el: HTMLVideoElement) => {
      const dur = el.duration && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (video.cumulativeDurationSeconds || video.durationSeconds || 10);
      return Math.min(9, Math.max(0, Math.floor((el.currentTime / dur) * 10)));
    };

    const getPercent = (el: HTMLVideoElement) => {
      const dur = el.duration && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (video.cumulativeDurationSeconds || video.durationSeconds || 10);
      return Math.min(100, Math.max(0, Math.round((el.currentTime / dur) * 100)));
    };

    const handlePlay = () => {
      if (viewRecordedRef.current !== video.id) {
        viewRecordedRef.current = video.id;
        completeRecordedRef.current = null;
        maxTimeRef.current = 0;
        lastBucketRef.current = -1;
        sendTelemetry(video.id, { eventType: 'view' });
      } else if (endedFlagRef.current) {
        endedFlagRef.current = false;
        sendTelemetry(video.id, { eventType: 'rewatch', bucketIndex: 0 });
      }
    };

    const handleTimeUpdate = () => {
      const el = videoElRef.current;
      if (!el || el.paused) return;
      const bucket = getBucket(el);
      const pct = getPercent(el);
      if (el.currentTime > maxTimeRef.current) {
        maxTimeRef.current = el.currentTime;
      }

      const now = Date.now();
      if (bucket !== lastBucketRef.current || now - lastPingTsRef.current >= 2500) {
        const delta = lastPingTsRef.current ? Math.min(5, (now - lastPingTsRef.current) / 1000) : 1;
        lastBucketRef.current = bucket;
        lastPingTsRef.current = now;
        sendTelemetry(video.id, {
          eventType: 'progress',
          bucketIndex: bucket,
          maxPercent: pct,
          watchSecondsDelta: delta,
        });
      }

      if (pct >= 90 && completeRecordedRef.current !== video.id) {
        completeRecordedRef.current = video.id;
        sendTelemetry(video.id, { eventType: 'complete', maxPercent: 100 });
      }
    };

    const handleSeeked = () => {
      const el = videoElRef.current;
      if (!el) return;
      if (el.currentTime < maxTimeRef.current - 0.8) {
        const bucket = getBucket(el);
        sendTelemetry(video.id, {
          eventType: 'rewatch',
          bucketIndex: bucket,
          maxPercent: getPercent(el),
        });
      }
    };

    const handleEnded = () => {
      endedFlagRef.current = true;
      if (completeRecordedRef.current !== video.id) {
        completeRecordedRef.current = video.id;
        sendTelemetry(video.id, { eventType: 'complete', maxPercent: 100 });
      }
      if (onVideoEnded) {
        onVideoEnded();
      }
    };

    const tools = Array.isArray(video.requiredTools) ? video.requiredTools : [];
    const safety = Array.isArray(video.safetyPrerequisites) ? video.safetyPrerequisites : [];
    const hasTechBrief = !compact && Boolean(video.technicalSkillLevel || tools.length > 0 || safety.length > 0);

    return (
      <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <div
          className={`relative bg-slate-950 flex items-center justify-center ${
            compact ? 'aspect-video' : 'aspect-video'
          }`}
        >
          <video
            ref={videoElRef}
            key={video.streamUrl}
            src={video.streamUrl}
            controls
            playsInline
            preload="metadata"
            onPlay={handlePlay}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onEnded={handleEnded}
            className={
              isPortrait
                ? 'h-full w-auto max-w-full object-contain bg-black'
                : 'w-full h-full object-contain bg-black'
            }
          />
        </div>

        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
              <Film className="w-3.5 h-3.5" />
              {video.cumulativeDurationSeconds || video.durationSeconds}s
            </span>
            <span className="text-slate-600">·</span>
            <span>{video.aspectRatio}</span>
            <span className="text-slate-600">·</span>
            <span>{video.resolution}</span>
            <span className="text-slate-600">·</span>
            <span>
              Rev {video.turnNumber} ({video.turnType})
            </span>
            {video.technicalSkillLevel && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-200">{video.technicalSkillLevel}</span>
              </>
            )}
            {!video.published && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-semibold">Draft</span>
              </>
            )}
          </div>

          {canGenerate && onEditInStudioClick && (
            <button
              type="button"
              onClick={() => onEditInStudioClick(video)}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Clapperboard className="w-3.5 h-3.5" />
              Edit / Extend in Studio
            </button>
          )}
        </div>

        {hasTechBrief && (
          <div className="px-4 py-3.5 bg-slate-900/70 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-sky-400 tracking-wide">
                Required Tools ({tools.length})
              </div>
              {tools.length > 0 ? (
                <ul className="space-y-1 text-slate-300">
                  {tools.map((tool, i) => (
                    <li key={`${tool}-${i}`} className="leading-snug">
                      <span className="font-mono tabular-nums text-slate-500 mr-1.5">
                        {i + 1}.
                      </span>
                      {tool}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">Standard HVAC field tool kit.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-400 tracking-wide">
                Safety Prerequisites ({safety.length})
              </div>
              {safety.length > 0 ? (
                <ul className="space-y-1 text-slate-300">
                  {safety.map((req, i) => (
                    <li key={`${req}-${i}`} className="leading-snug">
                      <span className="font-mono tabular-nums text-amber-500/80 mr-1.5">
                        S{i + 1}
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">
                  Verify LOTO, PPE, and ELCB/RCCB isolation prior to work.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // No real AI video generated yet for this lesson / slot
  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-white flex flex-col items-center justify-center text-center ${
        compact ? 'aspect-video p-5' : 'aspect-video p-8'
      }`}
    >
      {posterImage && (
        <img
          src={posterImage}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}
      <div className="relative z-10 max-w-md space-y-3">
        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center mx-auto">
          <Video className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
            {title}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {canGenerate
              ? subtitle ||
                'No teaching video has been produced for this module yet. Generate a custom Daikin HVAC demonstration clip in the AI Video Studio.'
              : subtitle ||
                'Instructor training video is scheduled for studio production. Review the approved technical specifications and manuals below.'}
          </p>
        </div>

        {canGenerate && onGenerateClick ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={onGenerateClick}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Teaching Video
            </button>
          </div>
        ) : (
          <div className="pt-1 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Awaiting instructor publication
          </div>
        )}
      </div>
    </div>
  );
};
