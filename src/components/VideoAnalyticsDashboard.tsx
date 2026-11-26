import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  BarChart3,
  RefreshCw,
  Search,
  Lock,
  Sparkles,
  Play,
  Video,
  Eye,
  CheckCircle2,
  RotateCcw,
  Film,
  AlertTriangle,
  Clapperboard,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface HeatmapSegment {
  bucketIndex: number;
  startSec: number;
  endSec: number;
  label: string;
  watches: number;
  rewatches: number;
  intensity: number;
}

export interface VideoAnalyticsItem {
  videoId: string;
  title: string;
  category: string;
  level: string;
  aspectRatio: '16:9' | '9:16';
  resolution: string;
  durationSeconds: number;
  turnNumber: number;
  published: boolean;
  streamUrl: string;
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  createdAt: string;
  totalViews: number;
  uniqueViewerCount: number;
  completions: number;
  completionPercentage: number;
  avgMaxPercent: number;
  totalWatchSeconds: number;
  totalRewatches: number;
  peakRewatchSegment: {
    bucketIndex: number;
    label: string;
    rewatches: number;
  } | null;
  heatmap: HeatmapSegment[];
  recentSessions: Array<{
    userId: string;
    userName: string;
    maxPercentReached: number;
    completed: boolean;
    rewatchCount: number;
    lastWatchedAt: string;
  }>;
}

interface VideoAnalyticsResponse {
  summary: {
    totalVideos: number;
    publishedVideos: number;
    totalViews: number;
    avgCompletionRate: number;
    totalRewatches: number;
  };
  videos: VideoAnalyticsItem[];
}

interface VideoAnalyticsDashboardProps {
  currentUser: any;
  authToken: string | null;
  onOpenAuthModal: () => void;
  onOpenVideoStudio: (sourceVideoId?: string) => void;
  onOpenVideoLibrary: () => void;
}

function getHeatmapCellStyle(intensity: number, rewatches: number, watches: number) {
  if (rewatches === 0 && watches === 0) {
    return 'bg-slate-100 text-slate-500 border-slate-200';
  }
  if (rewatches === 0) {
    return 'bg-sky-50 text-sky-900 border-sky-200';
  }
  if (intensity >= 0.75) {
    return 'bg-amber-500 text-slate-950 border-amber-600 font-bold';
  }
  if (intensity >= 0.4) {
    return 'bg-amber-300 text-slate-950 border-amber-400 font-semibold';
  }
  return 'bg-amber-100 text-amber-950 border-amber-200';
}

export const VideoAnalyticsDashboard: React.FC<VideoAnalyticsDashboardProps> = ({
  currentUser,
  authToken,
  onOpenAuthModal,
  onOpenVideoStudio,
  onOpenVideoLibrary,
}) => {
  const canView =
    Boolean(authToken) &&
    (currentUser?.role === 'admin' || currentUser?.role === 'instructor');

  const [analytics, setAnalytics] = useState<VideoAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const fetchAnalytics = async () => {
    if (!canView || !authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/instructor/video-analytics', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load video analytics.');
      }
      setAnalytics(data);
      if (data.videos?.length > 0) {
        setSelectedVideoId((prev) =>
          prev && data.videos.some((v: VideoAnalyticsItem) => v.videoId === prev)
            ? prev
            : data.videos[0].videoId
        );
      } else {
        setSelectedVideoId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to fetch video analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [canView, authToken]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    (analytics?.videos || []).forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set);
  }, [analytics]);

  const filteredVideos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (analytics?.videos || []).filter((v) => {
      const matchesCat = categoryFilter === 'All' || v.category === categoryFilter;
      const matchesQuery =
        !q ||
        v.title.toLowerCase().includes(q) ||
        (v.courseTitle || '').toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [analytics, searchTerm, categoryFilter]);

  const selectedVideo = useMemo(
    () =>
      filteredVideos.find((v) => v.videoId === selectedVideoId) ||
      filteredVideos[0] ||
      null,
    [filteredVideos, selectedVideoId]
  );

  const chartData = useMemo(
    () =>
      filteredVideos.slice(0, 8).map((v) => ({
        name: v.title.length > 20 ? v.title.slice(0, 20) + '…' : v.title,
        views: v.totalViews,
        completion: v.completionPercentage,
        rewatches: v.totalRewatches,
      })),
    [filteredVideos]
  );

  const handleJumpToSegment = (seg: HeatmapSegment) => {
    setSelectedSegmentIdx(seg.bucketIndex);
    const el = previewVideoRef.current;
    if (el) {
      el.currentTime = seg.startSec;
      el.play().catch(() => {});
    }
  };

  // Role Gate
  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Instructor Video Analytics Dashboard
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Engagement telemetry, completion rates, and student re-watch
                heatmaps are available to{' '}
                <span className="font-semibold text-slate-900">
                  Academy Instructors and Administrators
                </span>
                . Sign in with an Instructor or Admin account to inspect video
                performance across your courses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Sign In as Instructor or Admin
            </button>
            <button
              type="button"
              onClick={onOpenVideoLibrary}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-sm rounded-lg transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-mono text-sky-700 font-semibold uppercase tracking-wider">
            Instructor Analytics · Video Engagement & Retention
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Teaching Video Analytics
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Track view counts, lesson completion rates, and 10-segment student
            re-watch heatmaps for every generated HVAC teaching video.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
          <button
            type="button"
            onClick={() => onOpenVideoStudio()}
            className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            Open Video Studio
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Column Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Video Views</span>
            <Eye className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-2">
            {analytics?.summary.totalViews ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tracked across all student playbacks
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Avg. Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-2">
            {analytics?.summary.avgCompletionRate ?? 0}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Views reaching 90%+ clip duration
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Student Re-Watch Events</span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-2">
            {analytics?.summary.totalRewatches ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Backward seeks & segment replays
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Generated Teaching Clips</span>
            <Film className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-2">
            {analytics?.summary.publishedVideos ?? 0}
            <span className="text-base font-normal text-slate-400">
              {' '}
              / {analytics?.summary.totalVideos ?? 0}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Published vs. total studio clips
          </div>
        </div>
      </div>

      {/* Empty State when no generated videos exist yet */}
      {!loading && (!analytics || analytics.videos.length === 0) ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              No Teaching Videos Generated Yet
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once you generate AI teaching videos in the Video Studio (or produce
              the 5 core Daikin Masterclasses), student views, completion rates,
              and segment-level re-watch heatmaps will appear here automatically.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenVideoStudio()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate First Teaching Video
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by video title, course, or category..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition border ${
                    categoryFilter === cat
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Views & Completion Chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Views vs. Completion Rate Across Generated Videos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparing total playbacks and percentage of sessions reaching
                    90%+ completion.
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      interval={0}
                      angle={-10}
                      textAnchor="end"
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="views"
                      name="Total Views"
                      fill="#0B192C"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="completion"
                      name="Completion %"
                      fill="#0284C7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-Video Performance Table + Interactive Re-Watch Heatmap Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Table (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Generated Videos Performance ({filteredVideos.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Click any row to inspect its re-watch heatmap
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Teaching Video</th>
                      <th className="py-3 px-3 text-right">Views</th>
                      <th className="py-3 px-3 text-right">Completion</th>
                      <th className="py-3 px-3 text-right">Re-Watches</th>
                      <th className="py-3 px-4 text-right">Hotspot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredVideos.map((vid) => {
                      const isSelected = selectedVideo?.videoId === vid.videoId;
                      return (
                        <tr
                          key={vid.videoId}
                          onClick={() => {
                            setSelectedVideoId(vid.videoId);
                            setSelectedSegmentIdx(null);
                          }}
                          className={`cursor-pointer transition ${
                            isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 line-clamp-1">
                              {vid.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate max-w-[260px]">
                              {vid.courseTitle || vid.category} ·{' '}
                              {vid.durationSeconds}s ·{' '}
                              {vid.published ? 'Published' : 'Draft'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {vid.totalViews}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-emerald-600"
                                  style={{ width: `${vid.completionPercentage}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-900">
                                {vid.completionPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                            {vid.totalRewatches}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {vid.peakRewatchSegment
                              ? vid.peakRewatchSegment.label
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Heatmap & Segment Inspector (5 cols) */}
            {selectedVideo && (
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-sky-700 font-semibold uppercase tracking-wider">
                      Re-Watch Heatmap Inspector
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                      {selectedVideo.title}
                    </h3>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
                      {selectedVideo.totalViews} views ·{' '}
                      {selectedVideo.uniqueViewerCount} unique viewers ·{' '}
                      {selectedVideo.completionPercentage}% completion
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenVideoStudio(selectedVideo.videoId)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Clapperboard className="w-3.5 h-3.5 text-sky-700" />
                    Edit / Extend
                  </button>
                </div>

                {/* Synced Preview Player */}
                <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                  <div className="aspect-video flex items-center justify-center bg-black">
                    <video
                      ref={previewVideoRef}
                      key={selectedVideo.streamUrl}
                      src={selectedVideo.streamUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* 10-Bucket Student Re-Watch Heatmap */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      10-Segment Student Re-Watch Heatmap
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Click any segment to jump
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {selectedVideo.heatmap.map((seg) => {
                      const active = selectedSegmentIdx === seg.bucketIndex;
                      return (
                        <button
                          key={seg.bucketIndex}
                          type="button"
                          onClick={() => handleJumpToSegment(seg)}
                          title={`${seg.label}: ${seg.watches} watches, ${seg.rewatches} re-watches`}
                          className={`p-2 rounded-lg border text-left transition ${getHeatmapCellStyle(
                            seg.intensity,
                            seg.rewatches,
                            seg.watches
                          )} ${active ? 'ring-2 ring-[#0B192C]' : ''}`}
                        >
                          <div className="text-[10px] font-mono tabular-nums truncate">
                            {seg.label}
                          </div>
                          <div className="text-xs font-mono tabular-nums font-bold mt-1">
                            {seg.rewatches} rw
                          </div>
                          <div className="text-[10px] font-mono tabular-nums opacity-75">
                            {seg.watches} plays
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200 inline-block" />
                        No data
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-sky-50 border border-sky-200 inline-block" />
                        Normal play
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 border border-amber-400 inline-block" />
                        Re-watched
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 border border-amber-600 inline-block" />
                        Hotspot
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hotspot Guidance */}
                {selectedVideo.peakRewatchSegment ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
                    <div className="font-bold">
                      Re-Watch Hotspot Detected at{' '}
                      <span className="font-mono">
                        {selectedVideo.peakRewatchSegment.label}
                      </span>
                    </div>
                    <p className="text-amber-900 leading-relaxed">
                      Students sought back to this timestamp{' '}
                      <strong className="font-mono">
                        {selectedVideo.peakRewatchSegment.rewatches}
                      </strong>{' '}
                      time
                      {selectedVideo.peakRewatchSegment.rewatches === 1
                        ? ''
                        : 's'}
                      . Consider extending or annotating this step in Video Studio
                      for clearer instruction.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
                    No re-watch hotspots recorded yet. When students scrub
                    backward or replay sections of this video, re-watch density
                    highlights automatically.
                  </div>
                )}

                {/* Recent Student Watch Sessions */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    Recent Student Watch Sessions
                  </div>
                  {selectedVideo.recentSessions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No watch sessions logged for this clip yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {selectedVideo.recentSessions.map((sess, idx) => (
                        <div
                          key={`${sess.userId}-${idx}`}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {sess.userName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {new Date(sess.lastWatchedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums text-[11px] shrink-0">
                            <div
                              className={
                                sess.completed
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-700 font-semibold'
                              }
                            >
                              {sess.maxPercentReached}%{' '}
                              {sess.completed ? '· Complete' : ''}
                            </div>
                            <div className="text-[10px] text-amber-700">
                              {sess.rewatchCount} re-watches
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
