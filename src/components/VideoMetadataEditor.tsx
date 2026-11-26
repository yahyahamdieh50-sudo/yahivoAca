import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  ShieldAlert,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  BookmarkPlus,
  RotateCcw,
} from 'lucide-react';
import type { AcademyVideo } from './AcademyVideoPlayer';

export interface VideoTechnicalMetadata {
  technicalSkillLevel: string;
  requiredTools: string[];
  safetyPrerequisites: string[];
  referenceManualId: string | null;
}

export interface VideoMetadataPreset {
  id: string;
  name: string;
  technicalSkillLevel: string;
  requiredTools: string[];
  safetyPrerequisites: string[];
  referenceManualId: string | null;
  builtIn?: boolean;
  createdByName?: string;
}

interface AcademyResource {
  id: string;
  title: string;
  category: string;
  size: string;
  url: string;
}

export const TECHNICAL_SKILL_LEVELS: Array<{
  value: string;
  shortLabel: string;
  scope: string;
}> = [
  {
    value: 'Level 1 — Apprentice / Helper',
    shortLabel: 'Level 1 · Apprentice',
    scope: 'Basic piping prep, insulation, housekeeping & supervised rigging support',
  },
  {
    value: 'Level 2 — Field Technician',
    shortLabel: 'Level 2 · Field Tech',
    scope: 'Copper brazing with N₂ purge, flaring, vacuum dehydration & 4.15 MPa test',
  },
  {
    value: 'Level 3 — Senior Commissioning Engineer',
    shortLabel: 'Level 3 · Commissioning',
    scope: 'VRV IV Master/Slave start-up, AHU/FAHU balancing, ELCB/L1-L3 electrical checks',
  },
  {
    value: 'Level 4 — Daikin Master Specialist',
    shortLabel: 'Level 4 · Master',
    scope: 'Inverter PCB diagnostics, EKEXV tuning, multi-chiller BMS & fault recovery',
  },
];

const QUICK_TOOLS = [
  'True-RMS Clamp Meter (L1/L2/L3)',
  'Digital Refrigerant Manifold Gauge Set',
  'Dual-Stage Dry Nitrogen Regulator (0–6.0 MPa)',
  'Digital Vacuum Micron Gauge (< 500 Microns)',
  'Calibrated Flare Torque Wrench',
  'Laser Belt & Pulley Alignment Tool',
  '500V Insulation Resistance Tester (Megger)',
  'Oxy-Acetylene Torch with Flashback Arrestors',
];

const QUICK_SAFETY_CHECKS = [
  'Apply Lockout/Tagout (LOTO) on main electrical isolator before panel or fan work',
  'Verify ELCB/RCCB breaker rating and trip sensitivity on Main, Master & Slave units',
  'Confirm hold-down bolts are backed off on spring-mounted AHU fan isolators',
  'Maintain continuous 0.02 MPa dry nitrogen purge through copper lines while brazing',
  'Operate electric heat high-limit cutout check with supply fans off per AHU sheet',
  'Wear safety goggles, insulated electrical gloves, and steel-toe boots on site',
];

function isSafeManualUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('/public/') || trimmed.startsWith('https://');
}

interface VideoMetadataEditorProps {
  activeVideo: AcademyVideo | null;
  authToken: string | null;
  draftMetadata: VideoTechnicalMetadata;
  onDraftMetadataChange: (next: VideoTechnicalMetadata) => void;
  onVideoMetadataSaved: () => Promise<void> | void;
}

export const VideoMetadataEditor: React.FC<VideoMetadataEditorProps> = ({
  activeVideo,
  authToken,
  draftMetadata,
  onDraftMetadataChange,
  onVideoMetadataSaved,
}) => {
  const [targetScope, setTargetScope] = useState<'clip' | 'draft'>(
    activeVideo ? 'clip' : 'draft'
  );

  // Local state when editing an existing selected AI video
  const [clipSkillLevel, setClipSkillLevel] = useState<string>(
    TECHNICAL_SKILL_LEVELS[1].value
  );
  const [clipTools, setClipTools] = useState<string[]>([]);
  const [clipSafety, setClipSafety] = useState<string[]>([]);
  const [clipManualId, setClipManualId] = useState<string | null>(null);

  const [toolInput, setToolInput] = useState('');
  const [safetyInput, setSafetyInput] = useState('');
  const [savingClip, setSavingClip] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);

  // Manuals and saved presets
  const [manuals, setManuals] = useState<AcademyResource[]>([]);
  const [presets, setPresets] = useState<VideoMetadataPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Load manuals & saved metadata presets
  useEffect(() => {
    fetch('/api/resources')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setManuals(data);
      })
      .catch(() => {});

    fetch('/api/video-metadata-presets')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPresets(data);
      })
      .catch(() => {});
  }, []);

  // Sync activeVideo metadata into local clip state whenever selected video changes
  useEffect(() => {
    if (activeVideo) {
      setClipSkillLevel(
        activeVideo.technicalSkillLevel || TECHNICAL_SKILL_LEVELS[1].value
      );
      setClipTools(
        Array.isArray(activeVideo.requiredTools) ? activeVideo.requiredTools : []
      );
      setClipSafety(
        Array.isArray(activeVideo.safetyPrerequisites)
          ? activeVideo.safetyPrerequisites
          : []
      );
      setClipManualId(activeVideo.referenceManualId || null);
      setTargetScope('clip');
    } else {
      setTargetScope('draft');
    }
    setEditorError(null);
    setEditorNotice(null);
  }, [activeVideo]);

  const effectiveScope: 'clip' | 'draft' = activeVideo ? targetScope : 'draft';

  const currentMeta: VideoTechnicalMetadata =
    effectiveScope === 'clip'
      ? {
          technicalSkillLevel: clipSkillLevel,
          requiredTools: clipTools,
          safetyPrerequisites: clipSafety,
          referenceManualId: clipManualId,
        }
      : draftMetadata;

  const updateCurrentMeta = (patch: Partial<VideoTechnicalMetadata>) => {
    setEditorError(null);
    setEditorNotice(null);
    if (effectiveScope === 'clip') {
      if (patch.technicalSkillLevel !== undefined)
        setClipSkillLevel(patch.technicalSkillLevel);
      if (patch.requiredTools !== undefined) setClipTools(patch.requiredTools);
      if (patch.safetyPrerequisites !== undefined)
        setClipSafety(patch.safetyPrerequisites);
      if (patch.referenceManualId !== undefined)
        setClipManualId(patch.referenceManualId);
    } else {
      onDraftMetadataChange({
        ...draftMetadata,
        ...patch,
      });
    }
  };

  const isClipDirty = useMemo(() => {
    if (!activeVideo || effectiveScope !== 'clip') return false;
    const origSkill =
      activeVideo.technicalSkillLevel || TECHNICAL_SKILL_LEVELS[1].value;
    const origTools = Array.isArray(activeVideo.requiredTools)
      ? activeVideo.requiredTools
      : [];
    const origSafety = Array.isArray(activeVideo.safetyPrerequisites)
      ? activeVideo.safetyPrerequisites
      : [];
    const origManual = activeVideo.referenceManualId || null;
    return (
      clipSkillLevel !== origSkill ||
      clipManualId !== origManual ||
      JSON.stringify(clipTools) !== JSON.stringify(origTools) ||
      JSON.stringify(clipSafety) !== JSON.stringify(origSafety)
    );
  }, [activeVideo, effectiveScope, clipSkillLevel, clipTools, clipSafety, clipManualId]);

  const selectedManual = useMemo(
    () => manuals.find((m) => m.id === currentMeta.referenceManualId) || null,
    [manuals, currentMeta.referenceManualId]
  );

  const handleAddTool = (rawValue?: string) => {
    const val = (rawValue ?? toolInput).trim().slice(0, 120);
    if (!val) return;
    if (currentMeta.requiredTools.length >= 25) {
      setEditorError('Maximum of 25 required tools reached.');
      return;
    }
    const exists = currentMeta.requiredTools.some(
      (t) => t.toLowerCase() === val.toLowerCase()
    );
    if (exists) {
      if (!rawValue) setToolInput('');
      return;
    }
    updateCurrentMeta({
      requiredTools: [...currentMeta.requiredTools, val],
    });
    if (!rawValue) setToolInput('');
  };

  const handleRemoveTool = (index: number) => {
    updateCurrentMeta({
      requiredTools: currentMeta.requiredTools.filter((_, i) => i !== index),
    });
  };

  const handleMoveTool = (index: number, delta: -1 | 1) => {
    const next = [...currentMeta.requiredTools];
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
    updateCurrentMeta({ requiredTools: next });
  };

  const handleAddSafety = (rawValue?: string) => {
    const val = (rawValue ?? safetyInput).trim().slice(0, 160);
    if (!val) return;
    if (currentMeta.safetyPrerequisites.length >= 25) {
      setEditorError('Maximum of 25 safety prerequisites reached.');
      return;
    }
    const exists = currentMeta.safetyPrerequisites.some(
      (s) => s.toLowerCase() === val.toLowerCase()
    );
    if (exists) {
      if (!rawValue) setSafetyInput('');
      return;
    }
    updateCurrentMeta({
      safetyPrerequisites: [...currentMeta.safetyPrerequisites, val],
    });
    if (!rawValue) setSafetyInput('');
  };

  const handleRemoveSafety = (index: number) => {
    updateCurrentMeta({
      safetyPrerequisites: currentMeta.safetyPrerequisites.filter(
        (_, i) => i !== index
      ),
    });
  };

  const handleMoveSafety = (index: number, delta: -1 | 1) => {
    const next = [...currentMeta.safetyPrerequisites];
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
    updateCurrentMeta({ safetyPrerequisites: next });
  };

  const handleApplyPreset = (preset: VideoMetadataPreset) => {
    updateCurrentMeta({
      technicalSkillLevel: preset.technicalSkillLevel,
      requiredTools: [...preset.requiredTools],
      safetyPrerequisites: [...preset.safetyPrerequisites],
      referenceManualId: preset.referenceManualId || null,
    });
    setEditorNotice(
      effectiveScope === 'clip'
        ? `Loaded "${preset.name}" into editor. Click "Save Metadata to Video" to persist.`
        : `Applied "${preset.name}" to your next generated video specification.`
    );
  };

  const handleSaveClipMetadata = async () => {
    if (!activeVideo || !authToken) return;
    setSavingClip(true);
    setEditorError(null);
    setEditorNotice(null);
    try {
      const res = await fetch(`/api/videos/${activeVideo.id}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          technicalSkillLevel: clipSkillLevel,
          requiredTools: clipTools,
          safetyPrerequisites: clipSafety,
          referenceManualId: clipManualId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save video technical metadata.');
      }
      await onVideoMetadataSaved();
      setEditorNotice(
        `Saved technical metadata (${clipTools.length} tools, ${clipSafety.length} safety checks) to "${activeVideo.title}".`
      );
    } catch (err: any) {
      setEditorError(err.message || 'Could not update video metadata.');
    } finally {
      setSavingClip(false);
    }
  };

  const handleSaveAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const trimmedName = presetName.trim();
    if (trimmedName.length < 3) {
      setEditorError('Template name must be at least 3 characters.');
      return;
    }
    setSavingPreset(true);
    setEditorError(null);
    setEditorNotice(null);
    try {
      const res = await fetch('/api/video-metadata-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          technicalSkillLevel: currentMeta.technicalSkillLevel,
          requiredTools: currentMeta.requiredTools,
          safetyPrerequisites: currentMeta.safetyPrerequisites,
          referenceManualId: currentMeta.referenceManualId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.preset) {
        throw new Error(data.error || 'Failed to save metadata template.');
      }
      setPresets((prev) => [data.preset, ...prev]);
      setPresetName('');
      setShowSavePreset(false);
      setEditorNotice(`Saved reusable template "${data.preset.name}".`);
    } catch (err: any) {
      setEditorError(err.message || 'Could not save template.');
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!authToken) return;
    setEditorError(null);
    try {
      const res = await fetch(`/api/video-metadata-presets/${presetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete template.');
      }
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err: any) {
      setEditorError(err.message || 'Could not delete template.');
    }
  };

  const handleResetClip = () => {
    if (!activeVideo) return;
    setClipSkillLevel(
      activeVideo.technicalSkillLevel || TECHNICAL_SKILL_LEVELS[1].value
    );
    setClipTools(
      Array.isArray(activeVideo.requiredTools) ? activeVideo.requiredTools : []
    );
    setClipSafety(
      Array.isArray(activeVideo.safetyPrerequisites)
        ? activeVideo.safetyPrerequisites
        : []
    );
    setClipManualId(activeVideo.referenceManualId || null);
    setEditorError(null);
    setEditorNotice(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      {/* Header & Target Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sky-700 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              Technical Video Metadata Editor
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Define Technical Skill Level, Required Tools List, and Safety
            Prerequisites shown to technicians alongside each training video.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
          {activeVideo && (
            <button
              type="button"
              onClick={() => setTargetScope('clip')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap shrink-0 ${
                effectiveScope === 'clip'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected Clip
            </button>
          )}
          <button
            type="button"
            onClick={() => setTargetScope('draft')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap shrink-0 ${
              effectiveScope === 'draft'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Next Generated Video
          </button>
        </div>
      </div>

      {/* Active Target Summary Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="min-w-0">
          <span className="font-semibold text-slate-900">
            {effectiveScope === 'clip' && activeVideo
              ? `Editing Clip: ${activeVideo.title}`
              : 'Editing Pre-Production Spec (Auto-attached on Generate)'}
          </span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">
            {currentMeta.requiredTools.length} tools ·{' '}
            {currentMeta.safetyPrerequisites.length} safety checks
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowSavePreset((v) => !v)}
          className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {showSavePreset ? 'Close Template Form' : 'Save as Reusable Template'}
        </button>
      </div>

      {/* Inline Save Reusable Template Drawer */}
      {showSavePreset && (
        <form
          onSubmit={handleSaveAsPreset}
          className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            type="text"
            required
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Template name (e.g. VRV IV Master/Slave Commissioning)"
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
          <button
            type="submit"
            disabled={savingPreset}
            className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {savingPreset ? 'Saving...' : 'Save Template'}
          </button>
        </form>
      )}

      {/* Feedback Messages */}
      {editorError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{editorError}</span>
        </div>
      )}
      {editorNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{editorNotice}</span>
        </div>
      )}

      {/* Daikin Commissioning & Saved Templates Strip */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">
            Load Daikin Commissioning Template
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition whitespace-nowrap"
                >
                  {preset.name}
                </button>
                {!preset.builtIn && (
                  <button
                    type="button"
                    title="Delete custom template"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="px-2 py-1.5 text-slate-400 hover:text-red-600 border-l border-slate-200 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Technical Skill Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900">
            1. Technical Skill Level
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            {currentMeta.technicalSkillLevel}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TECHNICAL_SKILL_LEVELS.map((tier) => {
            const active = currentMeta.technicalSkillLevel === tier.value;
            return (
              <button
                key={tier.value}
                type="button"
                onClick={() =>
                  updateCurrentMeta({ technicalSkillLevel: tier.value })
                }
                className={`text-left px-3.5 py-2.5 rounded-lg border transition ${
                  active
                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{tier.shortLabel}</div>
                <div
                  className={`text-[11px] mt-0.5 leading-snug ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {tier.scope}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Required Tools List & 3. Safety Prerequisites (Two-Column Split on Wide Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
        {/* Required Tools List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-sky-700" />
              2. Required Tools List
            </label>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              {currentMeta.requiredTools.length} / 25
            </span>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTool();
                }
              }}
              placeholder="Add tool or instrument..."
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            <button
              type="button"
              onClick={() => handleAddTool()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* Quick-Add Common Tools */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOOLS.filter(
              (qt) =>
                !currentMeta.requiredTools.some(
                  (t) => t.toLowerCase() === qt.toLowerCase()
                )
            )
              .slice(0, 4)
              .map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => handleAddTool(qt)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition"
                >
                  + {qt}
                </button>
              ))}
          </div>

          {currentMeta.requiredTools.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
              No tools listed yet. Add instruments above or load a commissioning
              template.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
              {currentMeta.requiredTools.map((tool, idx) => (
                <li
                  key={`${tool}-${idx}`}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs text-slate-800"
                >
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 mr-2">
                      {idx + 1}.
                    </span>
                    {tool}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveTool(idx, -1)}
                      aria-label="Move tool up"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentMeta.requiredTools.length - 1}
                      onClick={() => handleMoveTool(idx, 1)}
                      aria-label="Move tool down"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTool(idx)}
                      aria-label="Remove tool"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Safety Prerequisites */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              3. Safety Prerequisites
            </label>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              {currentMeta.safetyPrerequisites.length} / 25
            </span>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={safetyInput}
              onChange={(e) => setSafetyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSafety();
                }
              }}
              placeholder="Add LOTO, PPE, or pressure safety requirement..."
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            <button
              type="button"
              onClick={() => handleAddSafety()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* Quick-Add Daikin Field Safety Checks */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SAFETY_CHECKS.filter(
              (qs) =>
                !currentMeta.safetyPrerequisites.some(
                  (s) => s.toLowerCase() === qs.toLowerCase()
                )
            )
              .slice(0, 3)
              .map((qs) => (
                <button
                  key={qs}
                  type="button"
                  onClick={() => handleAddSafety(qs)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition text-left"
                >
                  + {qs.length > 52 ? `${qs.slice(0, 52)}...` : qs}
                </button>
              ))}
          </div>

          {currentMeta.safetyPrerequisites.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
              No safety prerequisites added yet. Specify LOTO, ELCB/RCCB, PPE,
              or pressure precautions.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
              {currentMeta.safetyPrerequisites.map((item, idx) => (
                <li
                  key={`${item}-${idx}`}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs text-slate-800"
                >
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="font-mono tabular-nums text-[11px] text-amber-700 font-semibold mr-2">
                      S{idx + 1}
                    </span>
                    {item}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSafety(idx, -1)}
                      aria-label="Move prerequisite up"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentMeta.safetyPrerequisites.length - 1}
                      onClick={() => handleMoveSafety(idx, 1)}
                      aria-label="Move prerequisite down"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSafety(idx)}
                      aria-label="Remove prerequisite"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Linked Reference Commissioning Sheet / Manual */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-bold text-slate-900 mb-1">
            Reference Daikin Commissioning Report / Installation Manual (Optional)
          </label>
          <select
            value={currentMeta.referenceManualId || ''}
            onChange={(e) =>
              updateCurrentMeta({
                referenceManualId: e.target.value || null,
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
          >
            <option value="">No linked reference PDF</option>
            {manuals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.category})
              </option>
            ))}
          </select>
        </div>

        {selectedManual && isSafeManualUrl(selectedManual.url) && (
          <a
            href={selectedManual.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-sky-700" />
            Open Reference PDF
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {effectiveScope === 'clip' && activeVideo ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingClip || !isClipDirty}
                onClick={handleSaveClipMetadata}
                className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-45 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                {savingClip ? 'Saving...' : 'Save Metadata to Video'}
              </button>
              {isClipDirty && (
                <button
                  type="button"
                  onClick={handleResetClip}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {activeVideo.metadataUpdatedAt
                ? `Last updated by ${activeVideo.metadataUpdatedBy || 'Instructor'}`
                : 'Not yet saved to this clip'}
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-600">
            This technical specification will automatically attach to the next
            AI teaching video you generate in the right-hand Production Deck.
          </div>
        )}
      </div>
    </div>
  );
};
