import React, { useState, useEffect, useMemo } from 'react';
import {
  ListVideo,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  X,
  BookOpen,
  Sparkles,
  Search,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { AcademyVideoPlayer, type AcademyVideo } from './AcademyVideoPlayer';

export interface LinkedManualRef {
  id: string;
  title: string;
  category: string;
  size: string;
  url: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  trackFocus: string;
  workflowStage: string;
  level: string;
  videoIds: string[];
  manualIds: string[];
  linkedManuals: LinkedManualRef[];
  steps: AcademyVideo[];
  stepCount: number;
  totalDurationSeconds: number;
  categories: string[];
  published: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathProgress {
  userId: string;
  pathId: string;
  completedVideoIds: string[];
  lastVideoId: string | null;
  updatedAt: string;
}

interface LearningPathsPanelProps {
  videos: AcademyVideo[];
  courses: any[];
  currentUser: any;
  authToken: string | null;
  canManage: boolean;
  onOpenVideoStudio: (videoId?: string) => void;
  onOpenLesson: (courseId: string, moduleId?: string | null) => void;
  onPathCountChange?: (count: number) => void;
}

const INSTALLATION_WORKFLOWS = [
  'Rigging & Plinth Placement',
  'Copper Brazing & Refnet Piping',
  '4.15 MPa Nitrogen Pressure Test',
  'Vacuum Dehydration & Charging',
  'Controls, EKEXV & Commissioning',
  'Preventive Maintenance & O&M',
];

const TRACK_FOCUSES = [
  'Cross-Course Commissioning',
  'VRV & Piping',
  'Chiller Plant',
  'Controls & BMS',
  'Installation Manuals',
];

const PATH_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Multi-Level'];

const WORKFLOW_TEMPLATES = [
  {
    label: 'EWAD-TZ Chiller Rigging Manual',
    title: 'EWAD-TZ Chiller Rigging & Seismic Mount Playlist',
    workflowStage: 'Rigging & Plinth Placement',
    trackFocus: 'Chiller Plant',
    level: 'Advanced',
    manualIds: ['res-2', 'res-6'],
    description:
      'Step-by-step installation workflow pairing the EWAD-TZD Chiller O&M Manual with crane hoisting, spreader bar clearance, and seismic isolator leveling videos.',
  },
  {
    label: 'VRV Piping & 4.15 MPa Test Manual',
    title: 'VRV Refnet Brazing & 4.15 MPa Pressure Test Playlist',
    workflowStage: '4.15 MPa Nitrogen Pressure Test',
    trackFocus: 'VRV & Piping',
    level: 'Intermediate',
    manualIds: ['res-1', 'res-8', 'res-21'],
    description:
      'Field sequence anchored to the Daikin VRV Pre-Installation Checklist and RXQ Engineering Databook covering N₂-purged brazing and 24-hour holding tests.',
  },
  {
    label: 'EKEXV / AHU Expansion Kit Manual',
    title: 'EKEQ & EKEXV Expansion Valve Commissioning Playlist',
    workflowStage: 'Controls, EKEXV & Commissioning',
    trackFocus: 'Controls & BMS',
    level: 'Advanced',
    manualIds: ['res-7', 'res-15', 'res-23'],
    description:
      'Structured commissioning workflow aligned with Manual 4PEN383213-1B covering EKEXV upright mounting, thermistor placement, and SM-TS2 malfunction diagnostics.',
  },
];

function isSafeManualUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('/public/') || trimmed.startsWith('https://');
}

export const LearningPathsPanel: React.FC<LearningPathsPanelProps> = ({
  videos,
  courses,
  currentUser,
  authToken,
  canManage,
  onOpenVideoStudio,
  onOpenLesson,
  onPathCountChange,
}) => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [manualsCatalog, setManualsCatalog] = useState<LinkedManualRef[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LearningPathProgress>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [workflowFilter, setWorkflowFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active sequence player state
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Builder modal state (Create / Edit Custom Training Playlist)
  const [builderOpen, setBuilderOpen] = useState<boolean>(false);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formWorkflowStage, setFormWorkflowStage] = useState<string>(INSTALLATION_WORKFLOWS[0]);
  const [formTrackFocus, setFormTrackFocus] = useState<string>(TRACK_FOCUSES[0]);
  const [formLevel, setFormLevel] = useState<string>('Multi-Level');
  const [formPublished, setFormPublished] = useState<boolean>(true);
  const [formVideoIds, setFormVideoIds] = useState<string[]>([]);
  const [formManualIds, setFormManualIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('All');
  const [manualSearch, setManualSearch] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPathsAndProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const userQuery = currentUser?.id
        ? `?userId=${encodeURIComponent(currentUser.id)}`
        : '';

      const [pathsRes, progRes, manualsRes] = await Promise.all([
        fetch('/api/learning-paths', { headers }),
        fetch(`/api/learning-paths/progress${userQuery}`, { headers }),
        fetch('/api/resources'),
      ]);

      const pathsData = await pathsRes.json();
      if (!pathsRes.ok) {
        throw new Error(pathsData.error || 'Failed to load Training Playlists.');
      }

      const list: LearningPath[] = Array.isArray(pathsData) ? pathsData : [];
      setPaths(list);
      onPathCountChange?.(list.length);

      if (progRes.ok) {
        const progData = await progRes.json();
        if (Array.isArray(progData)) {
          const map: Record<string, LearningPathProgress> = {};
          for (const item of progData) {
            map[item.pathId] = item;
          }
          setProgressMap(map);
        }
      }

      if (manualsRes.ok) {
        const resList = await manualsRes.json();
        if (Array.isArray(resList)) {
          setManualsCatalog(resList);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not load Custom Training Playlists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPathsAndProgress();
  }, [authToken, currentUser?.id, videos.length]);

  const activePath = useMemo(
    () => paths.find((p) => p.id === activePathId) || null,
    [paths, activePathId]
  );

  useEffect(() => {
    if (activePath && activePath.steps.length > 0) {
      if (activeStepIndex >= activePath.steps.length) {
        setActiveStepIndex(0);
      }
    }
  }, [activePath, activeStepIndex]);

  const visibleWorkflowTabs = useMemo(() => {
    const dynamic = Array.from(new Set(paths.map((p) => p.workflowStage).filter(Boolean)));
    return ['All', ...Array.from(new Set([...INSTALLATION_WORKFLOWS, ...dynamic]))];
  }, [paths]);

  const filteredPaths = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return paths.filter((p) => {
      const matchesWorkflow =
        workflowFilter === 'All' || p.workflowStage === workflowFilter;
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.workflowStage || '').toLowerCase().includes(q) ||
        (p.linkedManuals || []).some((m) => m.title.toLowerCase().includes(q)) ||
        p.steps.some((s) => s.title.toLowerCase().includes(q));
      return matchesWorkflow && matchesSearch;
    });
  }, [paths, workflowFilter, searchQuery]);

  const availableVideosForPicker = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return videos.filter((v) => {
      const matchesCat = pickerCategory === 'All' || v.category === pickerCategory;
      const matchesSearch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [videos, pickerCategory, pickerSearch]);

  const filteredManualsForPicker = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    return manualsCatalog.filter(
      (m) =>
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [manualsCatalog, manualSearch]);

  const pickerCategories = useMemo(
    () => ['All', ...Array.from(new Set(videos.map((v) => v.category).filter(Boolean)))],
    [videos]
  );

  const selectedFormVideos = useMemo(() => {
    const map = new Map(videos.map((v) => [v.id, v]));
    return formVideoIds.map((id) => map.get(id)).filter((v): v is AcademyVideo => Boolean(v));
  }, [videos, formVideoIds]);

  const openCreateBuilder = () => {
    setEditingPathId(null);
    setFormTitle('');
    setFormDescription('');
    setFormWorkflowStage(INSTALLATION_WORKFLOWS[0]);
    setFormTrackFocus(TRACK_FOCUSES[0]);
    setFormLevel('Multi-Level');
    setFormPublished(true);
    setFormVideoIds(videos.slice(0, Math.min(3, videos.length)).map((v) => v.id));
    setFormManualIds([]);
    setPickerSearch('');
    setPickerCategory('All');
    setManualSearch('');
    setError(null);
    setBuilderOpen(true);
  };

  const openEditBuilder = (lp: LearningPath) => {
    setEditingPathId(lp.id);
    setFormTitle(lp.title);
    setFormDescription(lp.description);
    setFormWorkflowStage(lp.workflowStage || INSTALLATION_WORKFLOWS[0]);
    setFormTrackFocus(lp.trackFocus || TRACK_FOCUSES[0]);
    setFormLevel(lp.level || 'Multi-Level');
    setFormPublished(Boolean(lp.published));
    setFormVideoIds(lp.videoIds || lp.steps.map((s) => s.id));
    setFormManualIds(lp.manualIds || []);
    setPickerSearch('');
    setPickerCategory('All');
    setManualSearch('');
    setError(null);
    setBuilderOpen(true);
  };

  const moveStep = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= formVideoIds.length) return;
    setFormVideoIds((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const addVideoToSequence = (videoId: string) => {
    setFormVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
  };

  const removeVideoFromSequence = (videoId: string) => {
    setFormVideoIds((prev) => prev.filter((id) => id !== videoId));
  };

  const toggleManualAttachment = (manualId: string) => {
    setFormManualIds((prev) =>
      prev.includes(manualId)
        ? prev.filter((id) => id !== manualId)
        : prev.length < 12
        ? [...prev, manualId]
        : prev
    );
  };

  const handleSaveLearningPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !authToken || saving) return;

    setError(null);
    setNotice(null);

    if (formTitle.trim().length < 3) {
      setError('Enter a Custom Training Playlist title (at least 3 characters).');
      return;
    }
    if (formVideoIds.length === 0 && formManualIds.length === 0) {
      setError(
        'Attach at least 1 generated teaching video or 1 Daikin installation manual to save this playlist.'
      );
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingPathId
        ? `/api/learning-paths/${editingPathId}`
        : '/api/learning-paths';
      const method = editingPathId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          trackFocus: formTrackFocus,
          workflowStage: formWorkflowStage,
          level: formLevel,
          videoIds: formVideoIds,
          manualIds: formManualIds,
          published: formPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save Custom Training Playlist.');
      }

      setBuilderOpen(false);
      await fetchPathsAndProgress();
      setNotice(
        editingPathId
          ? `Updated playlist "${data.learningPath.title}".`
          : `Saved playlist "${data.learningPath.title}" (${data.learningPath.stepCount} videos, ${data.learningPath.linkedManuals?.length || 0} manuals).`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to save Custom Training Playlist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLearningPath = async (pathId: string) => {
    if (!canManage || !authToken) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/learning-paths/${pathId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete playlist.');
      }
      if (activePathId === pathId) {
        setActivePathId(null);
      }
      setConfirmDeleteId(null);
      await fetchPathsAndProgress();
      setNotice('Custom Training Playlist removed from the Video Library.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete playlist.');
    }
  };

  const toggleStepCompleted = async (
    pathId: string,
    videoId: string,
    completed: boolean
  ) => {
    setProgressMap((prev) => {
      const current = prev[pathId] || {
        userId: currentUser?.id || 'usr_guest',
        pathId,
        completedVideoIds: [],
        lastVideoId: videoId,
        updatedAt: new Date().toISOString(),
      };
      const nextCompleted = completed
        ? Array.from(new Set([...current.completedVideoIds, videoId]))
        : current.completedVideoIds.filter((id) => id !== videoId);
      return {
        ...prev,
        [pathId]: {
          ...current,
          completedVideoIds: nextCompleted,
          lastVideoId: videoId,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      await fetch(`/api/learning-paths/${pathId}/progress`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          videoId,
          completed,
          userId: currentUser?.id || 'usr_guest',
        }),
      });
    } catch {
      // Non-fatal progress sync failure
    }
  };

  const startPathPlayback = (lp: LearningPath) => {
    const prog = progressMap[lp.id];
    let resumeIdx = 0;
    if (prog && prog.completedVideoIds.length > 0) {
      const firstIncompleteIdx = lp.steps.findIndex(
        (s) => !prog.completedVideoIds.includes(s.id)
      );
      resumeIdx = firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0;
    }
    setActivePathId(lp.id);
    setActiveStepIndex(resumeIdx);
  };

  // --- ACTIVE PLAYLIST SEQUENCE PLAYER VIEW ---
  if (activePath) {
    const currentStep = activePath.steps[activeStepIndex] || null;
    const progress = progressMap[activePath.id];
    const completedSet = new Set(progress?.completedVideoIds || []);
    const completedCount = activePath.steps.filter((s) => completedSet.has(s.id)).length;
    const completionPct =
      activePath.steps.length > 0
        ? Math.round((completedCount / activePath.steps.length) * 100)
        : 0;
    const boundCourse = currentStep?.courseId
      ? courses.find((c) => c.id === currentStep.courseId) || null
      : null;

    return (
      <div className="space-y-6">
        {/* Sequence Top Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActivePathId(null)}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Playlists & Learning Paths
            </button>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              {activePath.workflowStage} · {activePath.level} · {activePath.steps.length} Videos ·{' '}
              {activePath.linkedManuals?.length || 0} Manuals · {activePath.totalDurationSeconds}s
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {activePath.title}
            </h3>
            {activePath.description && (
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                {activePath.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono tabular-nums">
              <div className="text-slate-500">Workflow Progress</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {completedCount}/{activePath.steps.length} videos ({completionPct}%)
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => openEditBuilder(activePath)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                Edit Playlist
              </button>
            )}
          </div>
        </div>

        {/* Linked Installation Manuals Reference Shelf */}
        {activePath.linkedManuals && activePath.linkedManuals.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Linked Daikin Installation Manuals ({activePath.linkedManuals.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Reference these approved technical manuals alongside each video step in this workflow.
                </p>
              </div>
              <FileText className="w-4 h-4 text-sky-700 shrink-0" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePath.linkedManuals.map((man) => (
                <div
                  key={man.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {man.title}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                      {man.category} · {man.size}
                    </div>
                  </div>
                  {isSafeManualUrl(man.url) && (
                    <a
                      href={man.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      Open PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-Zone Split: Sequence Video Stage + Ordered Step Rail */}
        {activePath.steps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
            <div className="text-base font-bold text-slate-900">
              No AI Teaching Videos Attached to This Workflow Playlist Yet
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              This playlist is ready with its installation manual references. Produce videos in Video Studio and add them via Edit Playlist.
            </p>
            {canManage && (
              <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => openEditBuilder(activePath)}
                  className="px-4 py-2 bg-[#0B192C] text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" /> Add Videos to Playlist
                </button>
                <button
                  type="button"
                  onClick={() => onOpenVideoStudio()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Video Studio
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Stage (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {currentStep && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-3 sm:p-4 bg-slate-950">
                    <AcademyVideoPlayer
                      video={currentStep}
                      title={currentStep.title}
                      canGenerate={canManage}
                      currentUserId={currentUser?.id}
                      currentUserName={currentUser?.name}
                      onEditInStudioClick={(vid) => onOpenVideoStudio(vid.id)}
                      onVideoEnded={() => {
                        toggleStepCompleted(activePath.id, currentStep.id, true);
                      }}
                    />
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-mono tabular-nums text-sky-700 font-semibold">
                          Step {String(activeStepIndex + 1).padStart(2, '0')} of{' '}
                          {String(activePath.steps.length).padStart(2, '0')} ·{' '}
                          {currentStep.category} · {currentStep.level}
                        </div>
                        <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
                          {currentStep.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStepCompleted(
                            activePath.id,
                            currentStep.id,
                            !completedSet.has(currentStep.id)
                          )
                        }
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          completedSet.has(currentStep.id)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {completedSet.has(currentStep.id)
                          ? 'Step Completed'
                          : 'Mark Complete'}
                      </button>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {currentStep.description || currentStep.prompt}
                    </p>

                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={activeStepIndex === 0}
                          onClick={() =>
                            setActiveStepIndex((i) => Math.max(0, i - 1))
                          }
                          className="px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous Step
                        </button>
                        <button
                          type="button"
                          disabled={activeStepIndex >= activePath.steps.length - 1}
                          onClick={() => {
                            toggleStepCompleted(activePath.id, currentStep.id, true);
                            setActiveStepIndex((i) =>
                              Math.min(activePath.steps.length - 1, i + 1)
                            );
                          }}
                          className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          Complete & Next Step <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {boundCourse && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLesson(boundCourse.id, currentStep.moduleId)
                          }
                          className="px-3.5 py-2 text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Open {boundCourse.category} Lesson
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sequence Rail (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Workflow Sequence
                  </h4>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500">
                    {activePath.steps.length} videos · {activePath.totalDurationSeconds}s
                  </p>
                </div>
                <ListVideo className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-0.5">
                {activePath.steps.map((step, idx) => {
                  const isActive = idx === activeStepIndex;
                  const isDone = completedSet.has(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg font-mono tabular-nums text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-amber-500 text-slate-950'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-bold leading-snug line-clamp-2">
                          {step.title}
                        </div>
                        <div
                          className={`text-[11px] font-mono tabular-nums flex items-center gap-1.5 ${
                            isActive ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          <span>
                            {step.cumulativeDurationSeconds || step.durationSeconds}s
                          </span>
                          <span>·</span>
                          <span className="truncate">{step.category}</span>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isDone ? (
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              isActive ? 'text-emerald-400' : 'text-emerald-600'
                            }`}
                          />
                        ) : (
                          <Circle
                            className={`w-4 h-4 ${
                              isActive ? 'text-slate-500' : 'text-slate-300'
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN CUSTOM TRAINING PLAYLISTS & LEARNING PATHS DIRECTORY ---
  return (
    <div className="space-y-6">
      {/* Feedback Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Workflow Filter Bar & Create Playlist CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleWorkflowTabs.map((wf) => (
            <button
              key={wf}
              type="button"
              onClick={() => setWorkflowFilter(wf)}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 transition border ${
                workflowFilter === wf
                  ? 'bg-[#0B192C] text-white border-[#0B192C]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {wf === 'All' ? 'All Workflows' : wf}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists or manuals..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateBuilder}
              className="px-4 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Create Custom Playlist
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Loading Custom Training Playlists...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPaths.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <ListVideo className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-lg font-extrabold text-slate-900">
              {paths.length === 0
                ? 'No Custom Training Playlists Saved Yet'
                : 'No Playlists Match This Workflow Filter'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {paths.length === 0
                ? canManage
                  ? 'Group AI-generated teaching videos and Daikin Installation Manuals into reusable Custom Training Playlists organized by installation workflow (Rigging, Brazing, 4.15 MPa Testing, EKEXV Commissioning).'
                  : 'Instructors can curate workflow playlists and attach installation manuals here for guided study.'
                : 'Try clearing the search box or switching to All Workflows.'}
            </p>
          </div>
          {canManage && paths.length === 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={openCreateBuilder}
                className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Create First Workflow Playlist
              </button>
            </div>
          )}
        </div>
      )}

      {/* Playlists Grid */}
      {!loading && filteredPaths.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map((lp) => {
            const prog = progressMap[lp.id];
            const completedSet = new Set(prog?.completedVideoIds || []);
            const completedCount = lp.steps.filter((s) =>
              completedSet.has(s.id)
            ).length;
            const pct =
              lp.steps.length > 0
                ? Math.round((completedCount / lp.steps.length) * 100)
                : 0;

            return (
              <div
                key={lp.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-5 shadow-xs"
              >
                <div className="space-y-3">
                  {/* Quiet zero-pill metadata line */}
                  <div className="text-[11px] font-mono tabular-nums text-slate-500">
                    {lp.workflowStage} · {lp.level} · {lp.stepCount} videos ·{' '}
                    {lp.linkedManuals?.length || 0} manuals
                    {!lp.published && ' · Draft'}
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {lp.title}
                    </h3>
                    {lp.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {lp.description}
                      </p>
                    )}
                  </div>

                  {/* Linked Installation Manuals Preview */}
                  {lp.linkedManuals && lp.linkedManuals.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-slate-500">
                        Installation Manuals
                      </div>
                      {lp.linkedManuals.slice(0, 2).map((man) => (
                        <div
                          key={man.id}
                          className="flex items-center justify-between gap-2 text-xs text-sky-800"
                        >
                          <span className="truncate flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">{man.title}</span>
                          </span>
                          {isSafeManualUrl(man.url) && (
                            <a
                              href={man.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-sky-700 hover:underline shrink-0"
                            >
                              PDF
                            </a>
                          )}
                        </div>
                      ))}
                      {lp.linkedManuals.length > 2 && (
                        <div className="text-[11px] font-mono text-slate-500">
                          +{lp.linkedManuals.length - 2} more manual
                          {lp.linkedManuals.length - 2 === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ordered Video Step Preview */}
                  {lp.steps.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500">
                        Video Sequence ({lp.totalDurationSeconds}s)
                      </div>
                      {lp.steps.slice(0, 3).map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between gap-2 text-xs text-slate-700"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono tabular-nums text-[11px] font-bold text-slate-400 shrink-0">
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <span className="truncate font-medium">
                              {step.title}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                            {step.cumulativeDurationSeconds || step.durationSeconds}s
                          </span>
                        </div>
                      ))}
                      {lp.steps.length > 3 && (
                        <div className="text-[11px] font-mono text-slate-500 pt-0.5">
                          +{lp.steps.length - 3} more video
                          {lp.steps.length - 3 === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {lp.steps.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
                        <span>Progress</span>
                        <span>
                          {completedCount}/{lp.steps.length} completed ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startPathPlayback(lp)}
                      className="flex-1 py-2.5 px-4 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      {lp.steps.length === 0
                        ? 'Open Playlist & Manuals'
                        : completedCount > 0 && completedCount < lp.steps.length
                        ? 'Continue Playlist'
                        : 'Open Training Playlist'}
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditBuilder(lp)}
                          title="Edit Playlist"
                          className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === lp.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteLearningPath(lp.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition whitespace-nowrap shrink-0"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(lp.id)}
                            title="Delete Playlist"
                            className="p-2.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-300 rounded-xl transition shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- CREATE / EDIT CUSTOM TRAINING PLAYLIST MODAL --- */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingPathId
                    ? 'Edit Custom Training Playlist'
                    : 'Create Custom Training Playlist'}
                </h3>
                <p className="text-xs text-slate-500">
                  Group AI-generated teaching videos and Daikin Installation Manuals by specific installation workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuilderOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLearningPath} className="p-6 space-y-6">
              {/* Quick-fill Installation Manual Workflow Presets */}
              {!editingPathId && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">
                    Installation Manual Workflow Presets
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {WORKFLOW_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => {
                          setFormTitle(tpl.title);
                          setFormWorkflowStage(tpl.workflowStage);
                          setFormTrackFocus(tpl.trackFocus);
                          setFormLevel(tpl.level);
                          setFormDescription(tpl.description);
                          setFormManualIds(
                            tpl.manualIds.filter((id) =>
                              manualsCatalog.some((m) => m.id === id)
                            )
                          );
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Playlist Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., VRV Refnet Brazing & 4.15 MPa Pressure Test Workflow"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Installation Workflow Stage
                  </label>
                  <select
                    value={formWorkflowStage}
                    onChange={(e) => setFormWorkflowStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    {INSTALLATION_WORKFLOWS.map((wf) => (
                      <option key={wf} value={wf}>
                        {wf}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Equipment Track
                  </label>
                  <select
                    value={formTrackFocus}
                    onChange={(e) => setFormTrackFocus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    {TRACK_FOCUSES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Difficulty Level
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    {PATH_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Installation Workflow Objectives
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Specify torque limits, safety checkpoints, or manual sections covered by this playlist."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              {/* Linked Installation Manuals Picker */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      Link Daikin Installation Manuals ({formManualIds.length} selected)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Attach official O&M PDFs and commissioning checklists so students study manuals alongside the video sequence.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Search installation manuals..."
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-60 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {filteredManualsForPicker.map((man) => {
                    const selected = formManualIds.includes(man.id);
                    return (
                      <button
                        key={man.id}
                        type="button"
                        onClick={() => toggleManualAttachment(man.id)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                          selected
                            ? 'bg-sky-50 border-sky-400 text-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{man.title}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            {man.category} · {man.size}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold shrink-0 mt-0.5 ${
                            selected ? 'text-sky-700' : 'text-slate-400'
                          }`}
                        >
                          {selected ? 'Linked' : '+ Link'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dual-Column Ordered Video Picker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-slate-200">
                {/* Left: Available Generated Videos */}
                <div className="space-y-3">
                  <div className="text-xs font-extrabold text-slate-900">
                    Available AI Teaching Videos ({videos.length})
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Filter videos..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                    <select
                      value={pickerCategory}
                      onChange={(e) => setPickerCategory(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs max-w-[160px]"
                    >
                      {pickerCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {videos.length === 0 ? (
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                      <Layers className="w-5 h-5 text-slate-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-800">
                        No Generated Teaching Videos Yet
                      </div>
                      <p className="text-[11px] text-slate-500">
                        You can save this playlist with Linked Installation Manuals now, then attach AI videos once generated in Video Studio.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBuilderOpen(false);
                          onOpenVideoStudio();
                        }}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Open Video Studio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {availableVideosForPicker.map((vid) => {
                        const added = formVideoIds.includes(vid.id);
                        return (
                          <div
                            key={vid.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {vid.title}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-slate-500 truncate">
                                {vid.category} ·{' '}
                                {vid.cumulativeDurationSeconds || vid.durationSeconds}s
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={added}
                              onClick={() => addVideoToSequence(vid.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 transition ${
                                added
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                              }`}
                            >
                              {added ? 'Added' : '+ Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Ordered Playlist Video Sequence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-900">
                      Ordered Video Steps ({selectedFormVideos.length})
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedFormVideos.reduce(
                        (s, v) =>
                          s + (v.cumulativeDurationSeconds || v.durationSeconds || 0),
                        0
                      )}
                      s total
                    </div>
                  </div>

                  {selectedFormVideos.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                      Click "+ Add" on generated videos on the left to build the ordered playback sequence, or save with linked installation manuals first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedFormVideos.map((vid, idx) => (
                        <div
                          key={vid.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono tabular-nums text-[11px] font-bold flex items-center justify-center shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {vid.title}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-slate-500 truncate">
                                {vid.category} ·{' '}
                                {vid.cumulativeDurationSeconds || vid.durationSeconds}s
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveStep(idx, -1)}
                              title="Move step up"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedFormVideos.length - 1}
                              onClick={() => moveStep(idx, 1)}
                              title="Move step down"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVideoFromSequence(vid.id)}
                              title="Remove step"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publish & Submit Row */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                  />
                  Publish playlist to students in the Video Library
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBuilderOpen(false)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl whitespace-nowrap shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (formVideoIds.length === 0 && formManualIds.length === 0)}
                    className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    {saving
                      ? 'Saving...'
                      : editingPathId
                      ? 'Save Custom Playlist'
                      : 'Save & Publish Playlist'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
