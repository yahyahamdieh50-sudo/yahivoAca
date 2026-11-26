import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  Sparkles,
  RefreshCw,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Scissors,
  Trash2,
  BookOpen,
  Play,
  Lock,
  Film,
  Layers,
  Save,
  BarChart3,
} from 'lucide-react';
import type { AcademyVideo } from './AcademyVideoPlayer';
import {
  VideoMetadataEditor,
  TECHNICAL_SKILL_LEVELS,
  type VideoTechnicalMetadata,
} from './VideoMetadataEditor';

export interface StudioPrefill {
  title?: string;
  description?: string;
  prompt?: string;
  category?: string;
  level?: string;
  courseId?: string | null;
  moduleId?: string | null;
  isCourseTrailer?: boolean;
  sourceVideoId?: string | null;
  mode?: 'generate' | 'extend' | 'edit';
}

interface VideoStudioProps {
  currentUser: any;
  authToken: string | null;
  courses: any[];
  videos: AcademyVideo[];
  prefill: StudioPrefill | null;
  onClearPrefill: () => void;
  onVideosUpdated: () => Promise<void> | void;
  onCoursesUpdated: () => Promise<void> | void;
  onOpenAuthModal: () => void;
  onOpenVideoLibrary: () => void;
  onOpenAnalytics?: () => void;
  onOpenLesson: (courseId: string, moduleId?: string | null) => void;
}

const HVAC_CATEGORIES = [
  'Air-Cooled Chillers',
  'Water-Cooled Chillers',
  'VRV / VRF Systems',
  'Air Handling Units (AHU)',
  'Fresh Air Handling Units (FAHU)',
  'Fan Coil Units (FCU)',
  'DX and Split AC Systems',
  'Packaged AC Units',
  'HVAC Controls and BMS Interfaces',
  'Chilled Water System Installation',
];

const HVAC_PRESETS = [
  {
    label: 'EWAD-TZ Chiller Rigging',
    title: 'Chiller Rigging & Anti-Vibration Spring Isolator Placement',
    category: 'Air-Cooled Chillers',
    level: 'Advanced',
    prompt:
      'Industrial crane slowly lowering a commercial air-cooled screw chiller onto heavy-duty seismic spring vibration isolators on a rooftop concrete plinth, HVAC rigging engineers using spreader bars and checking base frame level with a precision spirit level.',
  },
  {
    label: 'VRV 4.15 MPa Nitrogen Test',
    title: 'VRV Nitrogen Pressure Testing at 4.15 MPa (601 psi)',
    category: 'VRV / VRF Systems',
    level: 'Intermediate',
    prompt:
      'Close-up of a commercial HVAC technician connecting a high-pressure nitrogen cylinder regulator and digital manifold gauge to copper VRV outdoor unit service ports, slowly pressurizing the refrigerant piping circuit to 4.15 MPa and inspecting brazed refnet joints with leak detection solution.',
  },
  {
    label: 'Nitrogen-Purged Brazing',
    title: 'Copper Pipe Brazing with Nitrogen Purging & Flow Control',
    category: 'VRV / VRF Systems',
    level: 'Beginner',
    prompt:
      'HVAC technician in safety goggles and heat-resistant gloves brazing a copper refnet Y-branch joint using an oxy-acetylene torch while low-pressure dry nitrogen purges continuously through the pipe to prevent internal copper oxide scaling.',
  },
  {
    label: 'FAHU Heat Recovery Wheel',
    title: 'FAHU Rotary Heat Recovery Wheel Alignment & Sealing',
    category: 'Fresh Air Handling Units (FAHU)',
    level: 'Advanced',
    prompt:
      'Mechanical commissioning engineer inspecting a large modular fresh air handling unit interior, verifying smooth rotation of the aluminum rotary heat recovery wheel, drive belt tension, and perimeter brush seal alignment inside a bright plant room.',
  },
  {
    label: 'Inverter Compressor & EEV',
    title: 'Inverter Compressor Diagnostics & EEV Troubleshooting',
    category: 'HVAC Controls and BMS Interfaces',
    level: 'Advanced',
    prompt:
      'HVAC service engineer inside a commercial outdoor VRV electrical compartment measuring DC bus voltage on an inverter PCB with a calibrated digital multimeter and inspecting the electronic expansion valve coil seating.',
  },
];

const MAX_REF_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_REF_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  currentUser,
  authToken,
  courses,
  videos,
  prefill,
  onClearPrefill,
  onVideosUpdated,
  onCoursesUpdated,
  onOpenAuthModal,
  onOpenVideoLibrary,
  onOpenAnalytics,
  onOpenLesson,
}) => {
  const canGenerate =
    Boolean(authToken) &&
    (currentUser?.role === 'admin' || currentUser?.role === 'instructor');

  const [mode, setMode] = useState<'generate' | 'extend' | 'edit'>('generate');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(
    videos[0]?.id || null
  );

  // Studio form state
  const [title, setTitle] = useState(HVAC_PRESETS[1].title);
  const [description, setDescription] = useState(
    'Step-by-step field procedure aligned with Daikin installation and commissioning standards.'
  );
  const [category, setCategory] = useState(HVAC_PRESETS[1].category);
  const [level, setLevel] = useState(HVAC_PRESETS[1].level);
  const [prompt, setPrompt] = useState(HVAC_PRESETS[1].prompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [targetModuleId, setTargetModuleId] = useState<string>('');
  const [isCourseTrailer, setIsCourseTrailer] = useState<boolean>(false);
  const [showInLibrary, setShowInLibrary] = useState<boolean>(true);
  const [published, setPublished] = useState<boolean>(true);
  const [draftMetadata, setDraftMetadata] = useState<VideoTechnicalMetadata>({
    technicalSkillLevel: TECHNICAL_SKILL_LEVELS[2].value,
    requiredTools: [
      'True-RMS Clamp Meter (L1/L2/L3 Voltage & Amps)',
      'Digital Refrigerant Manifold Gauge Set (R-410A)',
      'Dual-Stage Dry Nitrogen Regulator (0–6.0 MPa)',
    ],
    safetyPrerequisites: [
      'Verify ELCB/RCCB breaker rating and trip sensitivity on Main, Master, and Slave units',
      'Apply Lockout/Tagout (LOTO) on main isolator before terminal inspection',
      'Wear safety goggles and refrigerant-rated insulated gloves during pressure checks',
    ],
    referenceManualId: 'res-25',
  });

  // Reference image upload state
  const [refImage, setRefImage] = useState<{
    name: string;
    mimeType: string;
    data: string;
    previewUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Job polling state
  const [activeJob, setActiveJob] = useState<{
    jobId: string;
    status: string;
    phase: string;
    elapsedSeconds: number;
    turnType: 'generate' | 'edit' | 'extend';
  } | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);

  // Publish/attach editor state for currently selected clip
  const [attachCourseId, setAttachCourseId] = useState<string>('');
  const [attachModuleId, setAttachModuleId] = useState<string>('');
  const [attachIsTrailer, setAttachIsTrailer] = useState<boolean>(false);
  const [attachShowInLibrary, setAttachShowInLibrary] = useState<boolean>(true);
  const [attachPublished, setAttachPublished] = useState<boolean>(true);
  const [attachSaving, setAttachSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [starterPackStarting, setStarterPackStarting] = useState<boolean>(false);
  const [starterPackJobs, setStarterPackJobs] = useState<
    Array<{
      jobId: string;
      slotId: string;
      title: string;
      status: string;
      phase: string;
      error?: string;
    }>
  >([]);

  const pollTimerRef = useRef<number | null>(null);
  const starterPollTimerRef = useRef<number | null>(null);

  const activeVideo = useMemo(
    () => videos.find((v) => v.id === activeVideoId) || null,
    [videos, activeVideoId]
  );

  // All revisions belonging to the same clip chain
  const revisionChain = useMemo(() => {
    if (!activeVideo) return [];
    const rootId = activeVideo.rootVideoId || activeVideo.id;
    return videos
      .filter((v) => (v.rootVideoId || v.id) === rootId)
      .sort((a, b) => (a.turnNumber || 1) - (b.turnNumber || 1));
  }, [videos, activeVideo]);

  const remainingExtendSeconds = useMemo(() => {
    if (!activeVideo) return 0;
    const used =
      activeVideo.cumulativeDurationSeconds || activeVideo.durationSeconds || 0;
    return Math.max(0, 30 - used);
  }, [activeVideo]);

  const selectedCourseObj = useMemo(
    () => courses.find((c) => c.id === targetCourseId) || null,
    [courses, targetCourseId]
  );

  const attachCourseObj = useMemo(
    () => courses.find((c) => c.id === attachCourseId) || null,
    [courses, attachCourseId]
  );

  // Apply deep-linked prefill (from Course Module, Lesson Viewer, or Video Library)
  useEffect(() => {
    if (!prefill) return;
    if (prefill.sourceVideoId) {
      setActiveVideoId(prefill.sourceVideoId);
      setMode(prefill.mode || 'extend');
    } else {
      setMode(prefill.mode || 'generate');
    }
    if (prefill.title) setTitle(prefill.title);
    if (prefill.description) setDescription(prefill.description);
    if (prefill.prompt) setPrompt(prefill.prompt);
    if (prefill.category) setCategory(prefill.category);
    if (prefill.level) setLevel(prefill.level);
    if (prefill.courseId !== undefined) setTargetCourseId(prefill.courseId || '');
    if (prefill.moduleId !== undefined) setTargetModuleId(prefill.moduleId || '');
    if (prefill.isCourseTrailer !== undefined)
      setIsCourseTrailer(Boolean(prefill.isCourseTrailer));
    setStudioError(null);
    setStudioNotice(null);
    onClearPrefill();
  }, [prefill, onClearPrefill]);

  // Sync attach bar controls whenever activeVideo changes
  useEffect(() => {
    if (activeVideo) {
      setAttachCourseId(activeVideo.courseId || '');
      setAttachModuleId(activeVideo.moduleId || '');
      setAttachIsTrailer(Boolean(activeVideo.isCourseTrailer));
      setAttachShowInLibrary(activeVideo.showInLibrary !== false);
      setAttachPublished(Boolean(activeVideo.published));
      setConfirmDeleteId(null);
    }
  }, [activeVideo]);

  // Keep activeVideoId valid if list updates
  useEffect(() => {
    if (!activeVideoId && videos.length > 0) {
      setActiveVideoId(videos[0].id);
    } else if (activeVideoId && !videos.some((v) => v.id === activeVideoId)) {
      setActiveVideoId(videos[0]?.id || null);
    }
  }, [videos, activeVideoId]);

  // Clamp extend duration when switching to Extend mode
  useEffect(() => {
    if (mode === 'extend') {
      const maxAllowed = Math.min(10, Math.max(3, remainingExtendSeconds));
      setDurationSeconds((prev) => Math.min(maxAllowed, Math.max(3, prev)));
    } else if (mode === 'generate') {
      setDurationSeconds((prev) => Math.min(15, Math.max(3, prev)));
    }
  }, [mode, remainingExtendSeconds]);

  const checkGeminiStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/ai/videos/status');
      const data = await res.json();
      if (res.ok) {
        setGeminiConfigured(Boolean(data.geminiConfigured));
      }
    } catch {
      // Ignore transient check errors
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (canGenerate) {
      checkGeminiStatus();
    }
  }, [canGenerate]);

  const missingStarterCount = useMemo(() => {
    const existing = new Set(videos.map((v) => v.title.toLowerCase()));
    return HVAC_PRESETS.filter((p) => !existing.has(p.title.toLowerCase())).length;
  }, [videos]);

  // Poll multi-job starter pack queue when active
  useEffect(() => {
    const hasPending = starterPackJobs.some(
      (j) => j.status === 'queued' || j.status === 'generating' || j.status === 'saving'
    );
    if (!hasPending || !authToken) {
      if (starterPollTimerRef.current) {
        window.clearInterval(starterPollTimerRef.current);
        starterPollTimerRef.current = null;
      }
      return;
    }

    const pollStarter = async () => {
      let anyNewlyCompleted = false;
      const updated = await Promise.all(
        starterPackJobs.map(async (job) => {
          if (job.status === 'completed' || job.status === 'failed') {
            return job;
          }
          try {
            const res = await fetch(`/api/ai/videos/jobs/${job.jobId}`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            if (!res.ok) return job;
            if (data.status === 'completed' && job.status !== 'completed') {
              anyNewlyCompleted = true;
            }
            return {
              ...job,
              status: data.status,
              phase: data.phase || job.phase,
              error: data.error || undefined,
            };
          } catch {
            return job;
          }
        })
      );

      setStarterPackJobs(updated);
      if (anyNewlyCompleted) {
        await onVideosUpdated();
        await onCoursesUpdated();
      }
    };

    starterPollTimerRef.current = window.setInterval(pollStarter, 3000);
    return () => {
      if (starterPollTimerRef.current) {
        window.clearInterval(starterPollTimerRef.current);
        starterPollTimerRef.current = null;
      }
    };
  }, [starterPackJobs, authToken, onVideosUpdated, onCoursesUpdated]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
      if (starterPollTimerRef.current) {
        window.clearInterval(starterPollTimerRef.current);
      }
    };
  }, []);

  const handleSelectReferenceImage = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setStudioError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_REF_MIMES.includes(file.type)) {
      setStudioError(
        'Reference image must be a PNG, JPEG, or WebP equipment photo or schematic.'
      );
      return;
    }
    if (file.size > MAX_REF_IMAGE_BYTES) {
      setStudioError('Reference image must be 8 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setRefImage({
        name: file.name,
        mimeType: file.type,
        data: base64,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const startJobPolling = (
    jobId: string,
    turnType: 'generate' | 'edit' | 'extend'
  ) => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }

    const pollOnce = async () => {
      try {
        const res = await fetch(`/api/ai/videos/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to check video job status.');
        }

        if (data.status === 'completed' && data.video) {
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setActiveJob(null);
          await onVideosUpdated();
          await onCoursesUpdated();
          setActiveVideoId(data.video.id);
          setStudioNotice(
            turnType === 'generate'
              ? `Generated "${data.video.title}" (${data.video.durationSeconds}s). You can now edit, extend, or attach it to any course module.`
              : turnType === 'extend'
              ? `Extended clip to ${data.video.cumulativeDurationSeconds}s total (Rev ${data.video.turnNumber}).`
              : `Saved edited revision (Rev ${data.video.turnNumber}) of "${data.video.title}".`
          );
          if (turnType !== 'generate') {
            setPrompt('');
          }
        } else if (data.status === 'failed') {
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setActiveJob(null);
          setStudioError(
            data.error ||
              'Video generation failed. Verify your Gemini API key and billing status.'
          );
        } else {
          setActiveJob({
            jobId,
            status: data.status,
            phase: data.phase || 'Rendering with Gemini Omni 1.2 Flash...',
            elapsedSeconds: Number(data.elapsedSeconds) || 0,
            turnType,
          });
        }
      } catch (err: any) {
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setActiveJob(null);
        setStudioError(err.message || 'Lost connection while polling video job.');
      }
    };

    pollOnce();
    pollTimerRef.current = window.setInterval(pollOnce, 3000);
  };

  const handleSubmitStudioJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGenerate || !authToken) return;

    setStudioError(null);
    setStudioNotice(null);

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 8) {
      setStudioError(
        'Please enter a clear HVAC procedure prompt (at least 8 characters).'
      );
      return;
    }

    if ((mode === 'extend' || mode === 'edit') && !activeVideo) {
      setStudioError('Select an existing generated clip first to edit or extend.');
      return;
    }

    if (mode === 'extend' && remainingExtendSeconds < 3) {
      setStudioError(
        'This clip chain has reached the 30-second maximum continuous length. Start a new clip for the next lesson segment.'
      );
      return;
    }

    try {
      let endpoint = '/api/ai/videos/generate';
      let payload: Record<string, any> = {};

      const refPayload = refImage
        ? { mimeType: refImage.mimeType, data: refImage.data }
        : undefined;

      if (mode === 'generate') {
        endpoint = '/api/ai/videos/generate';
        payload = {
          prompt: trimmedPrompt,
          title: title.trim() || trimmedPrompt.slice(0, 80),
          description: description.trim() || trimmedPrompt,
          category,
          level,
          technicalSkillLevel: draftMetadata.technicalSkillLevel,
          requiredTools: draftMetadata.requiredTools,
          safetyPrerequisites: draftMetadata.safetyPrerequisites,
          referenceManualId: draftMetadata.referenceManualId,
          aspectRatio,
          durationSeconds,
          resolution,
          referenceImage: refPayload,
          courseId: targetCourseId || null,
          moduleId: targetModuleId || null,
          isCourseTrailer,
          showInLibrary,
          published,
        };
      } else if (mode === 'extend' && activeVideo) {
        endpoint = '/api/ai/videos/extend';
        payload = {
          sourceVideoId: activeVideo.id,
          prompt: trimmedPrompt,
          durationSeconds,
          referenceImage: refPayload,
          title: activeVideo.title,
          description: activeVideo.description,
        };
      } else if (mode === 'edit' && activeVideo) {
        endpoint = '/api/ai/videos/edit';
        payload = {
          sourceVideoId: activeVideo.id,
          prompt: trimmedPrompt,
          referenceImage: refPayload,
          title: activeVideo.title,
          description: activeVideo.description,
        };
      }

      setActiveJob({
        jobId: 'starting',
        status: 'queued',
        phase: 'Submitting job to Gemini Omni 1.2 Flash...',
        elapsedSeconds: 0,
        turnType: mode,
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) {
        setActiveJob(null);
        setStudioError(
          data.error || 'Could not start video generation job.'
        );
        return;
      }

      startJobPolling(data.jobId, mode);
    } catch (err: any) {
      setActiveJob(null);
      setStudioError(
        err.message || 'Network error while starting video generation.'
      );
    }
  };

  const handleSaveAttachment = async () => {
    if (!activeVideo || !authToken) return;
    setAttachSaving(true);
    setStudioError(null);
    setStudioNotice(null);
    try {
      const res = await fetch(`/api/videos/${activeVideo.id}/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          courseId: attachCourseId || null,
          moduleId: attachCourseId ? attachModuleId || null : null,
          isCourseTrailer: attachCourseId ? attachIsTrailer : false,
          showInLibrary: attachShowInLibrary,
          published: attachPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save course binding.');
      }
      await onVideosUpdated();
      await onCoursesUpdated();
      setStudioNotice(
        attachPublished
          ? 'Saved and published! Students can now watch this training video in the assigned course and Video Library.'
          : 'Saved as draft. Only Admins and Instructors can preview draft videos.'
      );
    } catch (err: any) {
      setStudioError(err.message || 'Failed to update video attachment.');
    } finally {
      setAttachSaving(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!authToken) return;
    setStudioError(null);
    setStudioNotice(null);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete video.');
      }
      setConfirmDeleteId(null);
      await onVideosUpdated();
      await onCoursesUpdated();
      setStudioNotice('Video removed from academy storage and detached from courses.');
    } catch (err: any) {
      setStudioError(err.message || 'Failed to delete video.');
    }
  };

  const handleProduceStarterPack = async () => {
    if (!canGenerate || !authToken || starterPackStarting) return;
    setStudioError(null);
    setStudioNotice(null);
    setStarterPackStarting(true);
    try {
      const res = await fetch('/api/ai/videos/generate-starter-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not queue starter pack generation.');
      }
      if (data.alreadyComplete) {
        setStudioNotice(data.message || 'All 5 core Daikin masterclasses are already generated.');
        return;
      }
      const initialJobs = (data.jobs || []).map((j: any) => ({
        jobId: j.jobId,
        slotId: j.slotId,
        title: j.title,
        status: 'queued',
        phase: 'Queued for Gemini Omni 1.2 Flash',
      }));
      setStarterPackJobs(initialJobs);
      setStudioNotice(
        `Queued ${initialJobs.length} core Daikin HVAC teaching videos. Each clip publishes directly to its course module and the Video Library as it completes.`
      );
    } catch (err: any) {
      setStudioError(err.message || 'Failed to queue core masterclasses.');
    } finally {
      setStarterPackStarting(false);
    }
  };

  // Role Gate for Students / Unauthenticated Visitors
  if (!canGenerate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                AI HVAC Teaching Video Studio
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Video generation, multi-turn clip extension, and curriculum
                publishing are restricted to{' '}
                <span className="font-semibold text-slate-900">
                  Academy Admins and Instructors
                </span>
                . Students can watch all published teaching videos inside
                enrolled courses and the Training Video Library.
              </p>
              {currentUser && !authToken && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  You are browsing with a default student preview session. Sign
                  in with an Instructor or Admin account to open the studio.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Sign In as Instructor or Admin
            </button>
            <button
              type="button"
              onClick={onOpenVideoLibrary}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-sm rounded-lg transition inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-sky-600" />
              Browse Training Video Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-700 font-semibold uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            Gemini Omni 1.2 Flash · Instructor Production Desk
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            AI HVAC Teaching Video Studio
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Produce, iteratively edit, and extend technical installation videos
            up to 30 seconds, then publish directly into academy modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-600">
          <span>
            <strong className="text-slate-900">{videos.length}</strong> Studio
            Clips
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <strong className="text-slate-900">
              {videos.filter((v) => v.published).length}
            </strong>{' '}
            Published
          </span>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={onOpenVideoLibrary}
            className="font-sans font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" /> View Library
          </button>
          {onOpenAnalytics && (
            <>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="font-sans font-bold text-slate-800 hover:text-[#0B192C] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" /> Video Analytics
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gemini Key Status Alert if not yet configured */}
      {geminiConfigured === false && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Gemini Video Key Not Active on Server: </span>
              Set a billing-enabled <span className="font-mono font-semibold">GEMINI_API_KEY</span> in AI Studio{' '}
              <span className="font-semibold">Settings → Secrets</span>, then click Re-check Key before generating videos.
            </div>
          </div>
          <button
            type="button"
            onClick={checkGeminiStatus}
            disabled={checkingStatus}
            className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-bold text-amber-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            {checkingStatus ? 'Checking...' : 'Re-check Key'}
          </button>
        </div>
      )}

      {/* 1-Click Core Masterclass Batch Producer */}
      {(missingStarterCount > 0 || starterPackJobs.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                Core Daikin HVAC Masterclass Auto-Producer
              </div>
              <p className="text-xs text-slate-600">
                {missingStarterCount > 0
                  ? `${missingStarterCount} of 5 core Daikin field masterclasses still need AI video clips. Produce and publish all missing lessons to courses and the Video Library in one batch.`
                  : 'All 5 core Daikin field masterclasses have been produced.'}
              </p>
            </div>
            {missingStarterCount > 0 && (
              <button
                type="button"
                onClick={handleProduceStarterPack}
                disabled={
                  starterPackStarting ||
                  starterPackJobs.some(
                    (j) => j.status === 'queued' || j.status === 'generating' || j.status === 'saving'
                  )
                }
                className="px-4 py-2.5 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {starterPackStarting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                Produce {missingStarterCount === 5 ? 'All 5 Core Masterclasses' : `${missingStarterCount} Remaining Masterclasses`}
              </button>
            )}
          </div>

          {starterPackJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              {starterPackJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{job.title}</span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold shrink-0 ${
                        job.status === 'completed'
                          ? 'text-emerald-700'
                          : job.status === 'failed'
                          ? 'text-red-600'
                          : 'text-sky-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {job.error ? job.error : job.phase}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Feedback Banners */}
      {studioError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{studioError}</span>
          </div>
          <button
            type="button"
            onClick={() => setStudioError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {studioNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{studioNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStudioNotice(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two-Zone Studio Workspace: 65% Screening Stage + 35% Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ZONE (8 cols ≈ 66%): Screening Stage, Revision Timeline, Publish Bar & Clip Shelf */}
        <div className="lg:col-span-8 space-y-5">
          {/* Screening Stage */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
            <div className="aspect-video relative flex items-center justify-center bg-slate-950">
              {activeJob ? (
                <div className="text-center px-6 py-10 max-w-md space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 flex items-center justify-center mx-auto">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-base font-bold text-white">
                      {activeJob.phase}
                    </div>
                    <p className="text-xs text-slate-400">
                      Gemini Omni 1.2 Flash renders authentic video frames on
                      the server. Typically takes 30–120 seconds.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-3 text-xs font-mono tabular-nums text-sky-400 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg">
                    <span className="uppercase">{activeJob.turnType}</span>
                    <span className="text-slate-600">·</span>
                    <span>Elapsed: {activeJob.elapsedSeconds}s</span>
                  </div>
                </div>
              ) : activeVideo ? (
                <video
                  key={activeVideo.streamUrl}
                  src={activeVideo.streamUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className={
                    activeVideo.aspectRatio === '9:16'
                      ? 'h-full w-auto max-w-full object-contain bg-black'
                      : 'w-full h-full object-contain bg-black'
                  }
                />
              ) : (
                <div className="text-center px-6 py-10 max-w-md space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 flex items-center justify-center mx-auto">
                    <Video className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Ready for Your First Daikin Teaching Clip
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Choose a technical procedure preset on the right or write
                    your own prompt, optionally attach an equipment diagram, and
                    generate a real MP4 demonstration.
                  </p>
                </div>
              )}
            </div>

            {/* Active Clip Metadata Bar */}
            {activeVideo && !activeJob && (
              <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {activeVideo.title}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span>{activeVideo.category}</span>
                    <span>·</span>
                    <span>{activeVideo.level}</span>
                    <span>·</span>
                    <span>
                      {activeVideo.cumulativeDurationSeconds ||
                        activeVideo.durationSeconds}
                      s / 30s max
                    </span>
                    <span>·</span>
                    <span>{activeVideo.aspectRatio}</span>
                    <span>·</span>
                    <span>{activeVideo.resolution}</span>
                    <span>·</span>
                    <span
                      className={
                        activeVideo.published
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                    >
                      {activeVideo.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={remainingExtendSeconds < 3}
                    onClick={() => {
                      setMode('extend');
                      setPrompt('');
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Extend ({remainingExtendSeconds}s left)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('edit');
                      setPrompt('');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-lg transition inline-flex items-center gap-1"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Edit Clip
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Turn Revision Timeline */}
          {activeVideo && revisionChain.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-sky-600" />
                  Clip Revision & Extension Timeline
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {revisionChain.length} revision
                  {revisionChain.length === 1 ? '' : 's'} ·{' '}
                  {activeVideo.cumulativeDurationSeconds ||
                    activeVideo.durationSeconds}
                  s of 30s
                </span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {revisionChain.map((rev) => {
                  const isCurrent = rev.id === activeVideo.id;
                  return (
                    <button
                      key={rev.id}
                      type="button"
                      onClick={() => setActiveVideoId(rev.id)}
                      className={`text-left shrink-0 px-3.5 py-2.5 rounded-lg border transition min-w-[165px] ${
                        isCurrent
                          ? 'bg-[#0B192C] text-white border-[#0B192C]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                        <span className="font-bold">
                          Turn {rev.turnNumber} · {rev.turnType}
                        </span>
                        <span
                          className={
                            isCurrent ? 'text-amber-400' : 'text-sky-700'
                          }
                        >
                          {rev.turnType === 'extend'
                            ? `+${rev.durationSeconds}s`
                            : `${rev.durationSeconds}s`}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 line-clamp-1 ${
                          isCurrent ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {rev.prompt}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Publish & Attach to Academy Curriculum Bar */}
          {activeVideo && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Attach & Publish to Academy Curriculum
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bind this rendered clip to a course trailer, a specific
                    lesson module, and/or the Training Video Library.
                  </p>
                </div>

                {activeVideo.courseId && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLesson(activeVideo.courseId!, activeVideo.moduleId)
                    }
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open in Lesson Viewer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign to Course
                  </label>
                  <select
                    value={attachCourseId}
                    onChange={(e) => {
                      setAttachCourseId(e.target.value);
                      setAttachModuleId('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  >
                    <option value="">Video Library Only (No Course)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign to Module (Optional)
                  </label>
                  <select
                    value={attachModuleId}
                    disabled={!attachCourseObj}
                    onChange={(e) => setAttachModuleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 disabled:opacity-50"
                  >
                    <option value="">Course-wide / Trailer Only</option>
                    {(attachCourseObj?.modules || []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachIsTrailer}
                    disabled={!attachCourseId}
                    onChange={(e) => setAttachIsTrailer(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>Set as Course Trailer</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachShowInLibrary}
                    onChange={(e) => setAttachShowInLibrary(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>List in Training Video Library</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
                  <input
                    type="checkbox"
                    checked={attachPublished}
                    onChange={(e) => setAttachPublished(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>Published (Visible to Students)</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={attachSaving}
                  onClick={handleSaveAttachment}
                  className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {attachSaving
                    ? 'Saving...'
                    : 'Save & Publish Attachment'}
                </button>

                {confirmDeleteId === activeVideo.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-700 font-semibold">
                      Remove this MP4?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(activeVideo.id)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(activeVideo.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 transition inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Clip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Instructor Technical Metadata Editor (Skill Level, Required Tools & Safety Prerequisites) */}
          <VideoMetadataEditor
            activeVideo={activeVideo}
            authToken={authToken}
            draftMetadata={draftMetadata}
            onDraftMetadataChange={setDraftMetadata}
            onVideoMetadataSaved={onVideosUpdated}
          />

          {/* Studio Clips Shelf */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Academy Studio Clips ({videos.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMode('generate');
                  setStudioError(null);
                }}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Clip
              </button>
            </div>

            {videos.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No studio clips rendered yet. Generate your first HVAC lesson
                video using the Production Control Deck on the right.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((v) => {
                  const isSelected = v.id === activeVideoId;
                  const boundCourse = courses.find((c) => c.id === v.courseId);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setActiveVideoId(v.id)}
                      className={`text-left p-3.5 rounded-xl border transition ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">
                          {v.title}
                        </div>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            v.published
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }`}
                        >
                          {v.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
                        {v.cumulativeDurationSeconds || v.durationSeconds}s ·{' '}
                        {v.aspectRatio} · Rev {v.turnNumber} ({v.turnType})
                      </div>
                      {(v.technicalSkillLevel || (v.requiredTools?.length || 0) > 0 || (v.safetyPrerequisites?.length || 0) > 0) && (
                        <div className="text-[11px] font-mono tabular-nums text-sky-700 mt-0.5 truncate">
                          {v.technicalSkillLevel || v.level} · {v.requiredTools?.length || 0} tools · {v.safetyPrerequisites?.length || 0} safety
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 mt-1 truncate">
                        {boundCourse
                          ? `Attached: ${boundCourse.title}`
                          : v.showInLibrary
                          ? 'Training Video Library'
                          : 'Unassigned Studio Clip'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ZONE (4 cols ≈ 34%): Production Control Deck */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          {/* Segmented Mode Tabs */}
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('generate');
                setStudioError(null);
              }}
              className={`py-2 rounded-lg transition ${
                mode === 'generate'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Video
            </button>
            <button
              type="button"
              disabled={!activeVideo}
              onClick={() => {
                setMode('extend');
                setPrompt('');
                setStudioError(null);
              }}
              className={`py-2 rounded-lg transition disabled:opacity-40 ${
                mode === 'extend'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Extend Clip
            </button>
            <button
              type="button"
              disabled={!activeVideo}
              onClick={() => {
                setMode('edit');
                setPrompt('');
                setStudioError(null);
              }}
              className={`py-2 rounded-lg transition disabled:opacity-40 ${
                mode === 'edit'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Edit Clip
            </button>
          </div>

          {/* Context Info for Extend / Edit */}
          {(mode === 'extend' || mode === 'edit') && activeVideo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-slate-900 truncate">
                Source: {activeVideo.title}
              </div>
              <div className="font-mono tabular-nums text-[11px] text-slate-600">
                Rev {activeVideo.turnNumber} ·{' '}
                {activeVideo.cumulativeDurationSeconds ||
                  activeVideo.durationSeconds}
                s used · {remainingExtendSeconds}s extension budget left
              </div>
            </div>
          )}

          {/* HVAC Procedure Presets (New Video mode only) */}
          {mode === 'generate' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Daikin HVAC Procedure Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HVAC_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTitle(preset.title);
                      setCategory(preset.category);
                      setLevel(preset.level);
                      setPrompt(preset.prompt);
                      setStudioError(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitStudioJob} className="space-y-4">
            {mode === 'generate' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lesson Video Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. VRV 4.15 MPa Nitrogen Pressure Test"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                    >
                      {HVAC_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Prompt Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {mode === 'generate'
                  ? 'Technical Scene Description'
                  : mode === 'extend'
                  ? 'Next Lesson Step (Continuation Prompt)'
                  : 'Visual Revision Instruction'}
              </label>
              <textarea
                rows={4}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'generate'
                    ? 'Describe the Daikin equipment, technician actions, tools, gauges, and camera angle...'
                    : mode === 'extend'
                    ? 'e.g. Now zoom closer to the digital manifold gauge showing steady 4.15 MPa pressure as the technician applies soap bubbles to the refnet joint...'
                    : 'e.g. Brighten the mechanical room lighting and emphasize the technician wearing full PPE goggles and insulated gloves...'
                }
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            {/* Optional Reference Equipment Photo / Schematic */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Reference Photo / Schematic (Optional)
                </label>
                {refImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleSelectReferenceImage}
                className="hidden"
              />

              {refImage ? (
                <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <img
                    src={refImage.previewUrl}
                    alt={refImage.name}
                    className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {refImage.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {refImage.mimeType} · Image-to-Video Anchor
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 flex items-center justify-center gap-2 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  Upload Equipment Photo or Diagram (PNG/JPG/WebP)
                </button>
              )}
            </div>

            {/* Duration Slider (Generate & Extend) */}
            {mode !== 'edit' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {mode === 'extend' ? 'Extension Length' : 'Clip Duration'}
                  </label>
                  <span className="text-xs font-mono font-bold tabular-nums text-sky-700">
                    {mode === 'extend' ? `+${durationSeconds}s` : `${durationSeconds}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={
                    mode === 'extend'
                      ? Math.min(10, Math.max(3, remainingExtendSeconds))
                      : 15
                  }
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full accent-[#0B192C]"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>3s</span>
                  <span>
                    {mode === 'extend'
                      ? `${Math.min(10, Math.max(3, remainingExtendSeconds))}s max turn`
                      : '15s initial'}
                  </span>
                </div>
              </div>
            )}

            {/* Aspect Ratio & Resolution (Generate only) */}
            {mode === 'generate' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['16:9', '9:16'] as const).map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`py-2 rounded-lg border text-xs font-mono font-bold transition ${
                          aspectRatio === ar
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Resolution
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['720p', '1080p'] as const).map((resOpt) => (
                      <button
                        key={resOpt}
                        type="button"
                        onClick={() => setResolution(resOpt)}
                        className={`py-2 rounded-lg border text-xs font-mono font-bold transition ${
                          resolution === resOpt
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {resOpt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Direct Target Course & Module Binding (New Video mode) */}
            {mode === 'generate' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Auto-Attach on Completion
                </div>
                <select
                  value={targetCourseId}
                  onChange={(e) => {
                    setTargetCourseId(e.target.value);
                    setTargetModuleId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                >
                  <option value="">Training Video Library Only</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>

                {selectedCourseObj && (
                  <select
                    value={targetModuleId}
                    onChange={(e) => setTargetModuleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                  >
                    <option value="">Attach as Course Trailer</option>
                    {(selectedCourseObj.modules || []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Module: {m.title}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
                  {selectedCourseObj && (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCourseTrailer}
                        onChange={(e) => setIsCourseTrailer(e.target.checked)}
                      />
                      <span>Course trailer</span>
                    </label>
                  )}
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInLibrary}
                      onChange={(e) => setShowInLibrary(e.target.checked)}
                    />
                    <span>Show in Library</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                    />
                    <span>Publish immediately</span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={Boolean(activeJob)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {activeJob ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rendering ({activeJob.elapsedSeconds}s)...
                </>
              ) : mode === 'generate' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Teaching Video
                </>
              ) : mode === 'extend' ? (
                <>
                  <Plus className="w-4 h-4" />
                  Extend Clip (+{durationSeconds}s)
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  Apply Multi-Turn Edit
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
