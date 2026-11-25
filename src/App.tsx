/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench, ShieldAlert, BookOpen, Award, CheckCircle2, Play, Lock, User,
  DollarSign, Search, Terminal, FileText, Settings, BarChart3, Globe,
  ArrowRight, Check, AlertTriangle, Sparkles, LogOut, ChevronRight, Download,
  Sliders, Cpu, Activity, RefreshCw, X, Menu, Star, CheckSquare, MapPin, Mic, Video, Share2
} from 'lucide-react';
import { signInWithGoogle, logoutUser, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'course-detail' | 'lesson-viewer' | 'ai-assistant' | 'pricing' | 'dashboard' | 'admin' | 'maps-grounding' | 'audio-transcribe' | 'video-gen' | 'manuals-library' | 'video-library'>('home');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [currency, setCurrency] = useState<'USD' | 'AED'>('USD');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Maps Grounding state
  const [mapsQuery, setMapsQuery] = useState('Dubai, UAE');
  const [mapsResult, setMapsResult] = useState('');
  const [mapsLoading, setMapsLoading] = useState(false);

  // Audio Transcription state
  const [transcriptResult, setTranscriptResult] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);

  // Video Generation state
  const [videoPrompt, setVideoPrompt] = useState('Daikin VRV outdoor unit installation and nitrogen pressure test');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [authEmail, setAuthEmail] = useState('student@daikin-hvac-academy.com');
  const [authPassword, setAuthPassword] = useState('password123');
  const [authName, setAuthName] = useState('');
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [shareModalCert, setShareModalCert] = useState<any>(null);
  const [courseReviewsData, setCourseReviewsData] = useState<{ reviews: any[], averageRating: number, totalReviews: number }>({ reviews: [], averageRating: 5.0, totalReviews: 0 });
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Admin Course CRUD state
  const [adminCourseModalOpen, setAdminCourseModalOpen] = useState(false);
  const [adminEditingCourseId, setAdminEditingCourseId] = useState<string | null>(null);
  const [adminCourseForm, setAdminCourseForm] = useState({
    title: '',
    category: 'Air-Cooled Chillers',
    level: 'Advanced',
    tier: 'pro',
    duration: '8 hours',
    lessonsCount: 8,
    price: 25.00,
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
    description: '',
    approvedSource: '',
    trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
    modules: [
      { id: 'm-1', title: '1. Introduction & Overview', duration: '30 mins', type: 'video', preview: true }
    ]
  });

  const openAddCourseModal = () => {
    setAdminEditingCourseId(null);
    setAdminCourseForm({
      title: '',
      category: 'Air-Cooled Chillers',
      level: 'Advanced',
      tier: 'pro',
      duration: '8 hours',
      lessonsCount: 8,
      price: 25.00,
      image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
      description: '',
      approvedSource: 'Daikin Approved Engineering Manual',
      trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
      modules: [
        { id: 'm-1', title: '1. Introduction & Overview', duration: '30 mins', type: 'video', preview: true }
      ]
    });
    setAdminCourseModalOpen(true);
  };

  const openEditCourseModal = (course: any) => {
    setAdminEditingCourseId(course.id);
    setAdminCourseForm({
      title: course.title || '',
      category: course.category || 'Air-Cooled Chillers',
      level: course.level || 'Advanced',
      tier: course.tier || 'pro',
      duration: course.duration || '8 hours',
      lessonsCount: course.lessonsCount || 8,
      price: course.price || 25.00,
      image: course.image || '',
      description: course.description || '',
      approvedSource: course.approvedSource || '',
      trailerUrl: course.trailerUrl || 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
      modules: course.modules ? JSON.parse(JSON.stringify(course.modules)) : []
    });
    setAdminCourseModalOpen(true);
  };

  const handleAdminCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = adminEditingCourseId ? `/api/admin/courses/${adminEditingCourseId}` : '/api/admin/courses';
      const method = adminEditingCourseId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCourseForm)
      });
      const data = await res.json();
      if (data.success) {
        alert(adminEditingCourseId ? 'Course updated successfully!' : 'Course created successfully!');
        setAdminCourseModalOpen(false);
        fetchCourses();
      } else {
        alert(data.error || 'Failed to save course');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course and its training modules?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('Course deleted successfully!');
        fetchCourses();
      } else {
        alert(data.error || 'Failed to delete course');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseReviews(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourseReviews = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setCourseReviewsData({
          reviews: Array.isArray(data?.reviews) ? data.reviews : [],
          averageRating: Number(data?.averageRating) || 5.0,
          totalReviews: Number(data?.totalReviews) || 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_guest',
          userName: currentUser?.name || 'Student Technician',
          rating: newReviewRating,
          comment: newReviewComment
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewReviewComment('');
        setNewReviewRating(5);
        fetchCourseReviews(selectedCourse.id);
        alert('Review submitted successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Translations dictionary
  const t = {
    en: {
      brand: "DAIKIN HVAC INSTALLATION ACADEMY",
      disclaimer: "Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd.",
      home: "Home",
      catalog: "Course Catalog",
      aiAssistant: "AI Assistant",
      pricing: "Pricing & Plans",
      dashboard: "Student Dashboard",
      admin: "Admin Dashboard",
      login: "Sign In",
      logout: "Sign Out",
      register: "Register Free",
      heroTitle: "MASTER DAIKIN HVAC INSTALLATION",
      heroSubtitle: "Learn practical installation techniques through structured, model-aware HVAC training, site readiness, and commissioning standards.",
      watchTrailer: "WATCH FREE TRAILER",
      unlockFull: "UNLOCK FULL ACADEMY",
      categories: "Training Categories",
      featuredCourses: "Featured Equipment Courses",
      freePreview: "FREE PREVIEW",
      proPlan: "PRO PLAN",
      basicPlan: "BASIC PLAN",
      enrolled: "Enrolled",
      startLearning: "Start Learning",
      viewSyllabus: "View Syllabus",
      approvedSource: "Approved Technical Source",
      searchPlaceholder: "Search by model number or equipment...",
      askAiTitle: "AI HVAC Training Assistant",
      askAiDesc: "Grounded strictly in approved Daikin technical manuals with strict safety citations.",
    },
    ar: {
      brand: "أكاديمية داكين لتركيب أنظمة التكييف",
      disclaimer: "منصة تدريب مستقلة في مجال التدفئة والتهوية وتكييف الهواء. ليست مرتبطة أو معتمدة من قبل شركة داكين للصناعات المحدودة.",
      home: "الرئيسية",
      catalog: "كتالوج الدورات",
      aiAssistant: "المساعد الذكي",
      pricing: "الأسعار والخطط",
      dashboard: "لوحة الطالب",
      admin: "لوحة المشرف",
      login: "تسجيل الدخول",
      logout: "تسجيل الخروج",
      register: "تسجيل مجاني",
      heroTitle: "أتقن تركيب أنظمة داكين للتكييف",
      heroSubtitle: "تعلم تقنيات التركيب العملية من خلال تدريب مهني منظم ومعتمد على الطرازات مع معايير الفحص والتشغيل.",
      watchTrailer: "مشاهدة العرض التجريبي",
      unlockFull: "فتح الأكاديمية بالكامل",
      categories: "فئات التدريب",
      featuredCourses: "الدورات المميزة",
      freePreview: "معاينة مجانية",
      proPlan: "الباقة الاحترافية",
      basicPlan: "الباقة الأساسية",
      enrolled: "مسجل",
      startLearning: "ابدأ التعلم",
      viewSyllabus: "عرض المنهج",
      approvedSource: "المصدر الفني المعتمد",
      searchPlaceholder: "ابحث برقم الطراز أو المعدة...",
      askAiTitle: "مساعد التدريب الذكي HVAC",
      askAiDesc: "مستند بدقة على الكتيبات الفنية المعتمدة مع إشعارات السلامة.",
    }
  }[lang];

  // Fetch initial data
  useEffect(() => {
    fetchCourses();
    fetchStudentData('usr_student_1');
    fetchAdminStats();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCourses(data);
        }
      }
    } catch (e) {
      console.error('Error fetching courses:', e);
    }
  };

  const fetchStudentData = async (userId: string) => {
    try {
      const res = await fetch(`/api/student/${userId}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setStudentData({
            user: data.user || null,
            enrollments: Array.isArray(data.enrollments) ? data.enrollments : [],
            certificates: Array.isArray(data.certificates) ? data.certificates : [],
            resources: Array.isArray(data.resources) ? data.resources : []
          });
          if (data.user && !currentUser) {
            setCurrentUser(data.user);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching student data:', e);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setAdminStats(data);
        }
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        fetchStudentData(data.user.id);
        setAuthModal(null);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName || 'New Student', email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        fetchStudentData(data.user.id);
        setAuthModal(null);
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      setAiResponse(data.response);
    } catch (err) {
      console.error(err);
      setAiResponse('Error communicating with AI Assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        const mappedUser = {
          id: user.uid,
          name: user.displayName || 'Firebase User',
          email: user.email || '',
          role: 'student',
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(mappedUser);
        fetchStudentData(user.uid);
        setAuthModal(null);
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      alert('Google Sign-In failed. Please check pop-up settings.');
    }
  };

  const handleMapsSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapsLoading(true);
    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationQuery: mapsQuery })
      });
      const data = await res.json();
      setMapsResult(data.response);
    } catch (e) {
      console.error(e);
      setMapsResult('Error fetching location data from Maps grounding.');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleAudioTranscribe = async () => {
    setTranscribeLoading(true);
    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: null, mimeType: 'audio/webm' })
      });
      const data = await res.json();
      setTranscriptResult(data.transcript);
    } catch (e) {
      console.error(e);
      setTranscriptResult('Error transcribing audio.');
    } finally {
      setTranscribeLoading(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoLoading(true);
    try {
      const res = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: videoPrompt, aspectRatio: videoAspectRatio })
      });
      const data = await res.json();
      setGeneratedVideoUrl(data.videoUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleCheckout = async (tier: string) => {
    if (!currentUser) {
      setAuthModal('login');
      return;
    }
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userId: currentUser.id })
      });
      const data = await res.json();
      if (data.url) {
        // Upgrade mock subscription directly
        await fetch('/api/subscription/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, tier })
        });
        alert(`Successfully subscribed to ${tier.toUpperCase()} Plan! Access granted.`);
        fetchStudentData(currentUser.id);
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openQuiz = async (courseId: string) => {
    try {
      const res = await fetch(`/api/quizzes/${courseId}`);
      const data = await res.json();
      setQuizData(data);
      setQuizAnswers({});
      setQuizResult(null);
      setQuizModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const submitQuiz = async () => {
    if (!quizData || !currentUser) return;
    try {
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, courseId: quizData.courseId, answers: quizAnswers })
      });
      const data = await res.json();
      setQuizResult(data);
      if (data.passed) {
        fetchStudentData(currentUser.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatPrice = (priceUSD: number) => {
    if (currency === 'AED') {
      return `AED ${(priceUSD * 3.67).toFixed(2)}`;
    }
    return `$${priceUSD.toFixed(2)}`;
  };

  return (
    <div className={`min-h-screen bg-[#F0F4F8] text-[#0B192C] font-sans flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      
      {/* Mandatory Disclaimer Banner */}
      <div className="bg-[#0B192C] text-white text-xs py-2 px-4 text-center border-b border-[#1E3E62] flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{t.disclaimer}</span>
      </div>

      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-12 h-12 bg-[#0B192C] rounded-lg flex items-center justify-center text-white shadow-md">
              <Wrench className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#0B192C] tracking-wide">DAIKIN HVAC</h1>
              <p className="text-xs font-semibold text-blue-700 tracking-wider">INSTALLATION ACADEMY</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 font-medium text-xs">
            <button onClick={() => setCurrentView('home')} className={`hover:text-blue-700 transition ${currentView === 'home' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{t.home}</button>
            <button onClick={() => setCurrentView('catalog')} className={`hover:text-blue-700 transition ${currentView === 'catalog' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{t.catalog}</button>
            <button onClick={() => setCurrentView('ai-assistant')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'ai-assistant' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t.aiAssistant}
            </button>
            <button onClick={() => setCurrentView('maps-grounding')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'maps-grounding' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Locator
            </button>
            <button onClick={() => setCurrentView('audio-transcribe')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'audio-transcribe' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <Mic className="w-3.5 h-3.5 text-emerald-600" /> Transcribe
            </button>
            <button onClick={() => setCurrentView('video-gen')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'video-gen' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <Video className="w-3.5 h-3.5 text-amber-500" /> AI Video
            </button>
            <button onClick={() => setCurrentView('manuals-library')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'manuals-library' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <FileText className="w-3.5 h-3.5 text-blue-700" /> Manuals & O&M
            </button>
            <button onClick={() => setCurrentView('video-library')} className={`hover:text-blue-700 transition flex items-center gap-1 ${currentView === 'video-library' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
              <Play className="w-3.5 h-3.5 text-amber-500" /> Training Videos
            </button>
            <button onClick={() => setCurrentView('pricing')} className={`hover:text-blue-700 transition ${currentView === 'pricing' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{t.pricing}</button>
            {currentUser && (
              <button onClick={() => setCurrentView('dashboard')} className={`hover:text-blue-700 transition ${currentView === 'dashboard' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{t.dashboard}</button>
            )}
            {currentUser?.role === 'admin' && (
              <button onClick={() => setCurrentView('admin')} className={`hover:text-blue-700 transition text-red-600 font-bold flex items-center gap-1`}>
                <Settings className="w-3.5 h-3.5" /> {t.admin}
              </button>
            )}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Currency switcher */}
            <button 
              onClick={() => setCurrency(currency === 'USD' ? 'AED' : 'USD')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-gray-700">
              {currency}
            </button>

            {/* Language Switcher */}
            <button 
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-gray-700 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> {lang === 'en' ? 'العربية' : 'English'}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-gray-900">{currentUser.name}</div>
                  <div className="text-[10px] uppercase font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block">
                    {currentUser.subscriptionTier} plan
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 transition rounded-lg hover:bg-gray-100" title={t.logout}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setAuthModal('login')}
                  className="px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 rounded-lg transition">
                  {t.login}
                </button>
                <button 
                  onClick={() => setAuthModal('register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-sm transition">
                  {t.register}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white py-20 px-4">
              <div className="max-w-5xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/30 text-amber-400 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" /> Independent Engineering & Installation Academy
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                  {t.heroTitle}
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
                  {t.heroSubtitle}
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <button 
                    onClick={() => setCurrentView('catalog')}
                    className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-base">
                    <Play className="w-5 h-5 fill-current" /> {t.watchTrailer}
                  </button>
                  <button 
                    onClick={() => setCurrentView('pricing')}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition flex items-center gap-2 text-base backdrop-blur-sm">
                    {t.unlockFull} <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Features Bar */}
            <section className="bg-white border-b border-gray-200 py-8 shadow-xs">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="p-4">
                  <div className="text-3xl font-extrabold text-blue-900">10</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Specialized HVAC Categories</div>
                </div>
                <div className="p-4">
                  <div className="text-3xl font-extrabold text-blue-900">100+</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Approved Manual References</div>
                </div>
                <div className="p-4">
                  <div className="text-3xl font-extrabold text-blue-900">ISO/ASHRAE</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Compliant Commissioning Protocols</div>
                </div>
                <div className="p-4">
                  <div className="text-3xl font-extrabold text-blue-900">UAE & Global</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">High-Ambient Design Standards</div>
                </div>
              </div>
            </section>

            {/* Featured Courses */}
            <section className="max-w-7xl mx-auto px-4 py-16">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{t.featuredCourses}</h2>
                  <p className="text-gray-600 mt-1">Rigorous installation, pre-commissioning, and safety checklists for technicians and engineers.</p>
                </div>
                <button 
                  onClick={() => setCurrentView('catalog')}
                  className="text-blue-700 font-semibold hover:underline flex items-center gap-1">
                  View All Courses <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(courses || []).slice(0, 6).map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition flex flex-col">
                    <div className="relative h-48 bg-gray-900">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover opacity-90" />
                      <div className="absolute top-3 left-3 bg-blue-900/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                        {course.category}
                      </div>
                      <div className="absolute top-3 right-3 bg-amber-500 text-gray-950 font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md">
                        {formatPrice(course.price)}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                          <span>Level: {course.level}</span>
                          <span>•</span>
                          <span>{course.duration}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                      </div>
                      <div>
                        <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded-lg border border-blue-100 font-mono mb-4 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="truncate">{course.approvedSource}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button 
                            onClick={() => { setSelectedCourse(course); setCurrentView('course-detail'); }}
                            className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition text-center shadow-sm">
                            {t.viewSyllabus}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="mb-10">
              <h2 className="text-3xl font-extrabold text-gray-900">Complete HVAC Training Catalog</h2>
              <p className="text-gray-600 mt-1">Explore all 10 specialized equipment courses with verified technical submittals and checklists.</p>
              
              {/* Search & Filter Bar */}
              <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                  {['All', 'Air-Cooled Chillers', 'Water-Cooled Chillers', 'VRV / VRF Systems', 'Air Handling Units (AHU)', 'Fan Coil Units (FCU)', 'HVAC Controls and BMS Interfaces'].map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${selectedCategory === cat ? 'bg-blue-900 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(courses || [])
                .filter(c => selectedCategory === 'All' || c.category === selectedCategory)
                .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition flex flex-col">
                    <div className="relative h-48 bg-gray-900">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover opacity-90" />
                      <div className="absolute top-3 left-3 bg-blue-900/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                        {course.category}
                      </div>
                      <div className="absolute top-3 right-3 bg-amber-500 text-gray-950 font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md">
                        {formatPrice(course.price)}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                          <span>Level: {course.level}</span>
                          <span>•</span>
                          <span>{course.duration}</span>
                          <span>•</span>
                          <span>{course.lessonsCount} lessons</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{course.description}</p>
                      </div>
                      <div>
                        <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded-lg border border-blue-100 font-mono mb-4 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="truncate">{course.approvedSource}</span>
                        </div>
                        <button 
                          onClick={() => { setSelectedCourse(course); setCurrentView('course-detail'); }}
                          className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition text-center shadow-sm">
                          {t.viewSyllabus}
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'course-detail' && selectedCourse && (
          <div className="max-w-6xl mx-auto px-4 py-12">
            <button onClick={() => setCurrentView('catalog')} className="text-sm font-semibold text-blue-800 mb-6 flex items-center gap-1 hover:underline">
              ← Back to Catalog
            </button>

            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200 grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 p-8 lg:p-12 space-y-6">
                <div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-full uppercase">
                    {selectedCourse.category}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mt-3">{selectedCourse.title}</h1>
                  <p className="text-gray-600 mt-3 text-base leading-relaxed">{selectedCourse.description}</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold uppercase text-blue-900 tracking-wider">Approved Technical Reference Source</div>
                    <div className="text-sm font-mono text-blue-800 mt-0.5">{selectedCourse.approvedSource}</div>
                    <div className="text-xs text-gray-600 mt-1">All torque specifications, nitrogen pressure test limits (e.g. 4.15 MPa), and clearances comply strictly with manufacturer engineering manuals.</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Course Curriculum & Modules</h3>
                  <div className="space-y-3">
                    {selectedCourse.modules.map((mod: any, idx: number) => (
                      <div key={mod.id} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900">{mod.title}</div>
                            <div className="text-xs text-gray-500">{mod.duration} • {mod.type}</div>
                          </div>
                        </div>
                        <div>
                          {mod.preview ? (
                            <button 
                              onClick={() => { setActiveModule(mod); setCurrentView('lesson-viewer'); }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs">
                              <Play className="w-3.5 h-3.5 fill-current" /> {t.freePreview}
                            </button>
                          ) : (
                            <button 
                              onClick={() => { setActiveModule(mod); setCurrentView('lesson-viewer'); }}
                              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs">
                              <Lock className="w-3.5 h-3.5" /> Access Lesson
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Star Rating & Student Reviews Section */}
                <div className="border-t border-gray-200 pt-8 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Student Ratings & Reviews</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-4 h-4 ${s <= Math.round(courseReviewsData.averageRating) ? 'fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="font-bold text-gray-900 text-sm">{courseReviewsData.averageRating} out of 5</span>
                        <span className="text-xs text-gray-500">({courseReviewsData.totalReviews} verified reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Review Form */}
                  <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                    <h4 className="font-bold text-sm text-gray-900">Leave Your Course Review</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">Rating:</span>
                      <div className="flex gap-1 cursor-pointer">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            onClick={() => setNewReviewRating(star)}
                            className={`w-5 h-5 ${star <= newReviewRating ? 'text-amber-500 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <textarea 
                        rows={3}
                        required
                        placeholder="Share your feedback on technical accuracy, installation clarity, and practical guidance..."
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-800"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50">
                      Submit Review
                    </button>
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {courseReviewsData.reviews.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No reviews yet. Be the first technician to leave a review!</p>
                    ) : (
                      courseReviewsData.reviews.map((rev: any) => (
                        <div key={rev.id} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-xs text-gray-900">{rev.userName}</div>
                            <div className="flex text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-current' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                          <div className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Pricing & Enrollment */}
              <div className="bg-gray-50 p-8 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="relative h-48 rounded-2xl overflow-hidden mb-6 shadow-md">
                    <img src={selectedCourse.image} alt={selectedCourse.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-3xl font-extrabold text-blue-900 mb-2">
                    {formatPrice(selectedCourse.price)}
                  </div>
                  <div className="text-xs text-gray-600 mb-6">Full lifetime access, downloadable installation checklists, and final certificate.</div>

                  <div className="space-y-3 mb-8 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Level: {selectedCourse.level}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Total Duration: {selectedCourse.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {selectedCourse.lessonsCount} Video & Document Modules
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Academy Completion Certificate
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      if (!currentUser) { setAuthModal('login'); return; }
                      await fetch('/api/enroll', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.id, courseId: selectedCourse.id })
                      });
                      alert('Successfully enrolled in course!');
                      setCurrentView('dashboard');
                    }}
                    className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow-md transition text-center text-sm">
                    Enroll Now / Unlock Course
                  </button>
                  <button 
                    onClick={() => openQuiz(selectedCourse.id)}
                    className="w-full py-3 bg-white hover:bg-gray-100 text-blue-900 border border-blue-900 font-bold rounded-xl transition text-center text-sm">
                    Take Knowledge Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'lesson-viewer' && selectedCourse && (
          <div className="max-w-6xl mx-auto px-4 py-12">
            <button onClick={() => setCurrentView('course-detail')} className="text-sm font-semibold text-blue-800 mb-6 flex items-center gap-1 hover:underline">
              ← Back to Course Syllabus
            </button>

            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200">
              <div className="bg-gray-900 aspect-video relative flex items-center justify-center text-white">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/9Z9N4K8W2oQ?autoplay=1&mute=1&controls=1" 
                  title="Professional HVAC Technical Training Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen>
                </iframe>
              </div>

              <div className="p-8 lg:p-12 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold bg-blue-100 text-blue-900 px-3 py-1 rounded-full uppercase">
                      {selectedCourse.title}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-2">{activeModule?.title || 'Module Training Session'}</h2>
                  </div>
                  <button 
                    onClick={() => openQuiz(selectedCourse.id)}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl shadow-md transition flex items-center gap-2">
                    <Award className="w-5 h-5" /> Take Final Quiz & Get Certificate
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Lesson Notes & Technical Specifications</h3>
                  <p className="text-gray-700 leading-relaxed">
                    This training module covers key installation sequences, foundational clearance requirements, and quality control verification points for Daikin equipment. Always ensure appropriate isolation, LOTO (Lockout/Tagout), and certified rigging supervision before commencing site work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'ai-assistant' && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[700px]">
              <div className="bg-[#0B192C] text-white p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-gray-950">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{t.askAiTitle}</h2>
                  <p className="text-xs text-gray-300">{t.askAiDesc}</p>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl max-w-2xl">
                  <div className="text-xs font-bold text-blue-900 uppercase mb-1">Daikin AI Academy Bot</div>
                  <p className="text-sm text-gray-800">
                    Hello! I am your Daikin HVAC Training Assistant grounded strictly in approved manufacturer manuals. Ask me anything about VRV refrigerant piping, chiller torque limits, nitrogen pressure testing, or AHU installation clearances.
                  </p>
                </div>

                {aiResponse && (
                  <div className="bg-white border border-gray-200 p-6 rounded-2xl max-w-3xl shadow-sm space-y-3">
                    <div className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Grounded Technical Response & Citations
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{aiResponse}</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAiSubmit} className="p-4 bg-white border-t border-gray-200 flex gap-3">
                <input 
                  type="text"
                  placeholder="e.g. What is the required nitrogen pressure test value for Daikin VRV V?"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
                <button 
                  type="submit"
                  disabled={aiLoading}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Ask AI
                </button>
              </form>
            </div>
          </div>
        )}

        {currentView === 'maps-grounding' && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-900 text-amber-400 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Authorized Daikin Site Locator & Maps Grounding</h2>
                  <p className="text-sm text-gray-600">Find certified Daikin distributors, service centers, and engineering support offices worldwide with real-time Google Maps grounding.</p>
                </div>
              </div>

              <form onSubmit={handleMapsSearch} className="flex gap-3">
                <input 
                  type="text" 
                  value={mapsQuery}
                  onChange={(e) => setMapsQuery(e.target.value)}
                  placeholder="Enter city or region (e.g. Dubai, UAE or Cairo, Egypt)"
                  className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
                <button 
                  type="submit"
                  disabled={mapsLoading}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 flex items-center gap-2">
                  {mapsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} Locate
                </button>
              </form>

              {mapsResult && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-blue-900 uppercase">Grounded Location Results & Contacts</div>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{mapsResult}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'audio-transcribe' && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Technician Voice Note & Audio Transcription</h2>
                  <p className="text-sm text-gray-600">Record or upload field site inspection notes; AI accurately transcribes equipment measurements, pressure test values, and torque logs.</p>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl text-center space-y-4">
                <Mic className="w-12 h-12 text-blue-900 mx-auto animate-pulse" />
                <div className="text-sm font-semibold text-gray-800">Ready to transcribe field inspection audio</div>
                <button 
                  onClick={handleAudioTranscribe}
                  disabled={transcribeLoading}
                  className="px-8 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 inline-flex items-center gap-2">
                  {transcribeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} Transcribe Field Audio Note
                </button>
              </div>

              {transcriptResult && (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-emerald-900 uppercase">Verbatim Technical Transcription</div>
                  <div className="text-sm text-gray-800 font-mono bg-white p-4 rounded-xl border border-emerald-100">{transcriptResult}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'video-gen' && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 text-gray-950 rounded-2xl flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">AI Video Generation from Text (Gemini Omni 1.2 Flash)</h2>
                  <p className="text-sm text-gray-600">Generate high-definition 16:9 or 9:16 HVAC installation training clips and animations on demand.</p>
                </div>
              </div>

              <form onSubmit={handleGenerateVideo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Video Training Prompt</label>
                  <textarea 
                    rows={3}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                    placeholder="Describe the HVAC installation procedure to visualize..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Aspect Ratio</label>
                    <select 
                      value={videoAspectRatio}
                      onChange={(e) => setVideoAspectRatio(e.target.value)}
                      className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800">
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                    </select>
                  </div>
                  <div className="pt-5">
                    <button 
                      type="submit"
                      disabled={videoLoading}
                      className="px-8 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 flex items-center gap-2">
                      {videoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} Generate Video
                    </button>
                  </div>
                </div>
              </form>

              {generatedVideoUrl && (
                <div className="space-y-3 pt-4">
                  <div className="text-xs font-bold text-blue-900 uppercase">Generated Training Video Clip</div>
                  <div className={`mx-auto rounded-2xl overflow-hidden shadow-xl bg-black ${videoAspectRatio === '9:16' ? 'max-w-xs aspect-[9/16]' : 'max-w-2xl aspect-video'}`}>
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover"></video>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'manuals-library' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Official Daikin Manuals & O&M Library</h2>
                  <p className="text-sm text-gray-600">Access verified installation manuals, operation & maintenance (O&M) guides, and engineering databooks.</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900">
                {t.disclaimer} All documents are provided for professional educational and engineering training reference.
              </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Daikin FAHU with VRV Outdoor Piping & Wiring Installation Manual', category: 'Fresh Air Handling Units (FAHU)', file: '/public/assets/aistudio/FAHU_VRV_IM_3ca5bfea.pdf', rev: 'IM-FAHU-VRV', size: '8.4 MB' },
                { title: 'Daikin Commissioning & Handing Over Report Template', category: 'Commissioning & Reports', file: '/public/assets/aistudio/DX_Comm_Report_f311a8f4.pdf', rev: 'COMM-REP-2024', size: '2.1 MB' },
                { title: 'Daikin Al Jada Development Project Spare Parts List', category: 'Spare Parts & Logistical Schedule', file: '/public/assets/aistudio/DX_SPARE_PARTS_LIST_1f48cb19.pdf', rev: 'AL-JADA-SPARE-01', size: '4.5 MB' },
                { title: 'Daikin AHU VRV IV Commissioning Checklist', category: 'Air Handling Units (AHU)', file: '/public/assets/aistudio/FAHU_CHECK_LIST_FOR_GECO_NEST._1b46e327.pdf', rev: 'CHK-GECO-01', size: '3.2 MB' },
                { title: 'Daikin Energy Recovery Ventilation (ERV) Units IOM Manual', category: 'Energy Recovery Ventilation', file: 'https://www.daikin.com', rev: 'DMA-IOM-23-02', size: '14.8 MB' },
                { title: 'Daikin FDMRN-A Series Engineering Data Book', category: 'DX and Split AC Systems', file: 'https://www.daikin.com', rev: 'ED5CC3-ME21V1', size: '16.5 MB' },
                { title: 'Daikin FDMRN-A-K Series Operation Manual', category: 'DX and Split AC Systems', file: 'https://www.daikin.com', rev: 'OM-BRC51D', size: '6.2 MB' },
                { title: 'Daikin FTKM-PVM R-32 Wall Mounted Split AC Technical Data', category: 'DX and Split AC Systems', file: '/public/assets/aistudio/FTKM_495ba481.pdf', rev: 'EEDEN15-011', size: '11.1 MB' },
                { title: 'RXQ6-48A(N)RYFK VRV X Series Engineering Data Book', category: 'VRV / VRF Systems', file: 'https://www.daikin.com', rev: 'EDRMT342006 (2020.03)', size: '18.5 MB' },
                { title: 'EKEQMCBAV3 Option Kit & EKEXV Installation & Operation Manual', category: 'AHU Expansion Valve Kits', file: '/public/assets/aistudio/EKEQMCBAV3_EKEXV_4PEN383213-1B_2016-10_Installation_and_operation_manual_English_a1e09978.pdf', rev: '4PEN383213-1B', size: '3.8 MB' },
                { title: 'EWAH/EWAD/EWAS-TZD Air-Cooled Screw Chiller O&M Manual', category: 'Air-Cooled Chillers', file: '/public/assets/aistudio/EWAH-TZ-D.EWAD-TZ-D.EWAS-TZ-D.EWFH-TZ-D.EWFD-TZ-D.EWFS-TZ-D_Installation.Operation.Maintenance_manual_D-EIMAC01905-23_05_English__003__8713ce6b.pdf', rev: 'D-EIMAC01905-23_05EN', size: '28.5 MB' },
                { title: 'FDMRN-AV1K Ceiling Concealed Split AC Technical Manual', category: 'DX and Split AC Systems', file: '/public/assets/aistudio/ED_-_FMDRN_-_AV1K_9b66c6c5.pdf', rev: 'TM-5CC-C-ME-A3', size: '12.4 MB' },
                { title: 'RXQ-ARYFK Service & Installation Manual', category: 'VRV / VRF Systems', file: 'https://www.daikin.com', rev: 'Rev. 2024', size: '14.2 MB' },
                { title: 'FXMQ-MFV1 Engineering Databook', category: 'Fan Coil / Ducted Units', file: '/public/assets/aistudio/FXMQ-MFV1_Databook_78d07a31.pdf', rev: 'Rev. 4.0', size: '8.5 MB' },
                { title: 'EKEQ & EKEXV IOM Installation Manual', category: 'AHU Expansion Valve Kits', file: '/public/assets/aistudio/EKEQ_EKEXV_IOM_4PEN383212-1_Installation_manuals_English__3__4a57adf0.pdf', rev: '4PEN383212-1', size: '11.8 MB' },
                { title: 'Daikin FAHU-01 Villa-04 Control Panel & Thyristor Schematics', category: 'Control Panels & Wiring Diagrams', file: '/public/assets/aistudio/01-FAHU-01_VILLA-04_CONTROL_PANEL__A_D_EC_SUPPLY_FAN__THYRISTOR-6.0KW__20ce941a.pdf', rev: 'SNT/MQ/1189/01/23', size: '1.6 MB' },
                { title: 'Daikin FAHU-P5-01 Control Panel Electrical Drawings', category: 'Control Panels & Wiring Diagrams', file: '/public/assets/aistudio/01-FAHU-P5-01_CONTROL_PANEL_fe73da4c.pdf', rev: 'SNT/MQ/813/01/20', size: '1.5 MB' },
                { title: 'Daikin RYYQ-T7Y1B Outdoor Unit Layout & Installation Guide', category: 'VRV / VRF Systems', file: 'https://www.daikin.com', rev: 'EEDEN15-208', size: '3.1 MB' },
                { title: 'ebm-papst EC Centrifugal Fans RadiPac Technical Catalog', category: 'Ventilation & Fan Engineering', file: 'https://www.ebmpapst.com', rev: '2017-07', size: '43.4 MB' },
                { title: 'Daikin Simple Self-Diagnosis by Malfunction Code Manual (SM-TS2)', category: 'Troubleshooting & Error Codes', file: '/public/assets/aistudio/ERROR_CODE_-_SM-TS2_f92939a2.pdf', rev: 'SM-TS2', size: '0.3 MB' },
                { title: 'Daikin Middle East OYL Condensing Unit with AHU Service Training Course', category: 'Service Training & O&M Manuals', file: 'https://www.daikin.com', rev: 'DAME-OYL-2024', size: '4.2 MB' }
              ].map((doc, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full uppercase">{doc.category}</span>
                    <h4 className="font-bold text-gray-900 text-base mt-3">{doc.title}</h4>
                    <div className="text-xs font-mono text-gray-500 mt-1">{doc.rev} • {doc.size}</div>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={doc.file} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition text-center shadow-xs flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4" /> View / Read PDF
                    </a>
                    <a 
                      href={doc.file} 
                      download
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'video-library' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 text-gray-950 rounded-2xl flex items-center justify-center">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Professional HVAC Training Video Library</h2>
                  <p className="text-sm text-gray-600">High-definition engineering masterclasses, rigging procedures, pressure testing, and brazing protocols.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: 'Chiller Rigging & Anti-Vibration Spring Isolator Placement', duration: '45 mins', level: 'Advanced', videoId: '9Z9N4K8W2oQ', desc: 'Step-by-step masterclass on crane rigging, spreader bar load distribution, and seismic spring isolator leveling for EWAD-TZ chillers.' },
                { title: 'VRV Nitrogen Pressure Testing at 4.15 MPa (601 psi)', duration: '55 mins', level: 'Intermediate', videoId: '8vO7xQ9K2w8', desc: 'Detailed 24-hour hold test procedure, regulator setup, and safety protocols for multi-port refnet piping.' },
                { title: 'Copper Pipe Brazing with Nitrogen Purging & Flow Control', duration: '50 mins', level: 'Beginner', videoId: 'X5k12j9Q8w0', desc: 'Preventing internal copper oxidation and scale formation using regulated dry nitrogen sweep.' },
                { title: 'Chilled Water Pump Alignment & Hydraulic Balancing', duration: '60 mins', level: 'Advanced', videoId: 'rK5W2x8V1j4', desc: 'Laser dial gauge shaft alignment, differential pressure bypass calibration, and balancing valves.' },
                { title: 'Inverter Compressor Diagnostics & PCB Troubleshooting', duration: '50 mins', level: 'Advanced', videoId: 'Z5yR5e8lH3U', desc: 'Diagnosing inverter compressor IPM faults, error codes, and electronic expansion valve (EEV) operation.' }
              ].map((vid, idx) => (
                <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="aspect-video bg-black relative">
                      <iframe 
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${vid.videoId}?controls=1`}
                        title={vid.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen>
                      </iframe>
                    </div>
                    <div className="p-6 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                        <span className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full font-bold">{vid.level}</span>
                        <span>{vid.duration}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base">{vid.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{vid.desc}</p>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <button 
                      onClick={() => alert(`Selected training masterclass: ${vid.title}`)}
                      className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5">
                      <Play className="w-4 h-4 fill-current" /> Play Training Masterclass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900">Simple, Transparent Academy Pricing</h2>
              <p className="text-gray-600 mt-3 text-base">Unlock professional Daikin HVAC installation courses, checklists, and academy certificates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Free Account</div>
                  <div className="text-4xl font-extrabold text-gray-900 mb-4">{formatPrice(0)}</div>
                  <p className="text-sm text-gray-600 mb-6">For engineers & technicians exploring introductory training previews.</p>
                  <ul className="space-y-3 text-sm text-gray-700 mb-8">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Free trailers & course catalog</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> View course descriptions & syllabus</li>
                    <li className="text-gray-400 flex items-center gap-2">✕ No premium videos or downloads</li>
                    <li className="text-gray-400 flex items-center gap-2">✕ No academy certificates</li>
                  </ul>
                </div>
                <button 
                  onClick={() => setAuthModal('register')}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl text-sm transition">
                  Get Started Free
                </button>
              </div>

              {/* Basic Plan */}
              <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-blue-900 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {t.basicPlan}
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Beginner Track</div>
                  <div className="text-4xl font-extrabold text-gray-900 mb-4">{formatPrice(9.99)}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                  <p className="text-sm text-gray-600 mb-6">Essential installation courses for split AC, FCU, and packaged units.</p>
                  <ul className="space-y-3 text-sm text-gray-700 mb-8">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Access to beginner courses</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Step-by-step video lessons</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Basic quizzes & progress tracking</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Standard support</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleCheckout('basic')}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md">
                  Subscribe to Basic ($9.99)
                </button>
              </div>

              {/* Pro Plan */}
              <div className="bg-gradient-to-b from-blue-900 to-[#0B192C] text-white rounded-3xl p-8 shadow-2xl border border-blue-800 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-gray-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {t.proPlan} (Most Popular)
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Full Masterclass</div>
                  <div className="text-4xl font-extrabold text-white mb-4">{formatPrice(25.00)}<span className="text-sm font-normal text-gray-300">/mo</span></div>
                  <p className="text-sm text-gray-300 mb-6">Full access to chillers, VRV, AHU, BMS controls, and commissioning readiness.</p>
                  <ul className="space-y-3 text-sm text-gray-200 mb-8">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Full access to all 10 courses</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Advanced chiller & VRV modules</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Downloadable checklists & templates</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Academy completion certificates</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleCheckout('pro')}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl text-sm transition shadow-lg">
                  Unlock PRO Academy ($25)
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && studentData && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
            <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Welcome back, {studentData.user?.name}</h2>
                <p className="text-gray-600 mt-1">Continue your Daikin HVAC installation training and review your completion certificates.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-2xl text-center">
                  <div className="text-xs text-blue-900 font-bold uppercase">Subscription Tier</div>
                  <div className="text-lg font-extrabold text-blue-950 uppercase mt-0.5">{studentData.user?.subscriptionTier}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl text-center">
                  <div className="text-xs text-emerald-900 font-bold uppercase">Certificates Earned</div>
                  <div className="text-lg font-extrabold text-emerald-950 mt-0.5">{studentData.certificates.length}</div>
                </div>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Enrolled Courses & Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(studentData?.enrollments || []).map((enr: any) => {
                  const course = courses.find(c => c.id === enr.courseId);
                  if (!course) return null;
                  return (
                    <div key={enr.id} className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full">{course.category}</span>
                          <span className="text-xs font-semibold text-gray-500">{enr.progress}% Complete</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h4>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-4">
                          <div className="bg-blue-900 h-full rounded-full" style={{ width: `${enr.progress}%` }}></div>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedCourse(course); setCurrentView('course-detail'); }}
                        className="py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition text-center shadow-xs">
                        Continue Learning
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Certificates & Downloadable Checklists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-500" /> Completion Certificates
                </h3>
                <div className="space-y-4">
                  {(studentData?.certificates || []).map((cert: any) => (
                    <div key={cert.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{cert.courseTitle}</div>
                        <div className="text-xs font-mono text-blue-700 mt-1">Verification ID: {cert.verificationNumber}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{cert.disclaimer}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShareModalCert(cert)}
                          className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button 
                          onClick={() => {
                            const studentName = studentData.user?.name || 'Student Technician';
                            const url = `/api/certificates/${cert.id}/download?studentName=${encodeURIComponent(studentName)}&courseTitle=${encodeURIComponent(cert.courseTitle)}&verificationNumber=${cert.verificationNumber}&date=${encodeURIComponent(cert.date || new Date().toLocaleDateString())}`;
                            window.open(url, '_blank');
                          }}
                          className="p-3 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-blue-900 transition shadow-xs" title="Download PDF">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-700" /> Downloadable Checklists & Guides
                </h3>
                <div className="space-y-4">
                  {(studentData?.resources || []).map((res: any) => (
                    <div key={res.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{res.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{res.category} • {res.size}</div>
                      </div>
                      <button 
                        onClick={() => alert(`Downloading resource: ${res.title}`)}
                        className="p-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl transition shadow-xs" title="Download Resource">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'admin' && currentUser?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
            <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Academy Administrator Control Panel</h2>
                <p className="text-gray-600 mt-1">Manage training courses, technical submittal sources, revenue analytics, and student access.</p>
              </div>
              <div className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold uppercase">
                Admin Mode Active
              </div>
            </div>

            {/* Stats Grid */}
            {adminStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold uppercase">Total Users</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{adminStats.totalUsers}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold uppercase">Active Subscribers</div>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-1">{adminStats.activeSubscribers}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold uppercase">Monthly Revenue</div>
                  <div className="text-3xl font-extrabold text-blue-900 mt-1">${adminStats.monthlyRevenue}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold uppercase">Certificates Issued</div>
                  <div className="text-3xl font-extrabold text-amber-600 mt-1">{adminStats.certificatesIssued}</div>
                </div>
              </div>
            )}

            {/* Course Management Table */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Training Courses Management</h3>
                <button 
                  onClick={openAddCourseModal}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5">
                  + Add New Course
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                      <th className="py-3 px-4">Course Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Approved Technical Source</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 font-semibold text-gray-900">{course.title}</td>
                        <td className="py-4 px-4 text-gray-600">{course.category}</td>
                        <td className="py-4 px-4 text-gray-600">{course.level}</td>
                        <td className="py-4 px-4 font-bold text-blue-900">${course.price}</td>
                        <td className="py-4 px-4 font-mono text-xs text-gray-500">{course.approvedSource}</td>
                        <td className="py-4 px-4 text-right space-x-3">
                          <button onClick={() => openEditCourseModal(course)} className="text-blue-700 hover:underline font-semibold text-xs">Edit</button>
                          <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:underline font-semibold text-xs">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setAuthModal(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
              {authModal === 'login' ? 'Sign In to Academy' : 'Create Free Student Account'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">Access trailers, courses, quizzes, and certificates.</p>

            <form onSubmit={authModal === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authModal === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Tariq Bin Ziyad"
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  required 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md">
                {authModal === 'login' ? 'Sign In' : 'Register Free Account'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-sm border border-gray-300 transition shadow-xs flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google (Firebase)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {quizModalOpen && quizData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setQuizModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{quizData.title}</h3>
            <p className="text-sm text-gray-600 mb-6">Answer correctly to achieve certification (passing grade: 75%).</p>

            {!quizResult ? (
              <div className="space-y-6">
                {quizData.questions.map((q: any, qIdx: number) => (
                  <div key={q.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="font-bold text-gray-900 text-sm mb-3">Q{qIdx + 1}. {q.question}</div>
                    <div className="space-y-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <label key={oIdx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-800 transition">
                          <input 
                            type="radio" 
                            name={q.id} 
                            checked={quizAnswers[q.id] === oIdx}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oIdx })}
                            className="w-4 h-4 text-blue-900"
                          />
                          <span className="text-sm text-gray-800">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={submitQuiz}
                  className="w-full py-4 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md">
                  Submit Assessment Answers
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6 py-8">
                <div className={`inline-flex w-20 h-20 rounded-full items-center justify-center text-white text-3xl font-extrabold ${quizResult.passed ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  {quizResult.score}%
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{quizResult.passed ? 'Congratulations! Assessment Passed' : 'Assessment Failed'}</h4>
                  <p className="text-gray-600 mt-2">{quizResult.passed ? 'You have successfully passed the final knowledge assessment and earned your independent academy certificate.' : 'Please review course modules and try again.'}</p>
                </div>
                {quizResult.certificate && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl font-mono text-xs text-blue-900">
                    Certificate Verification Number: {quizResult.certificate.verificationNumber}
                  </div>
                )}
                <button 
                  onClick={() => setQuizModalOpen(false)}
                  className="px-8 py-3 bg-blue-900 text-white font-bold rounded-xl text-sm shadow-md">
                  Close & Return
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificate Share Modal */}
      {shareModalCert && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative space-y-6">
            <button onClick={() => setShareModalCert(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-gray-950 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Share Professional Certificate</h3>
                <p className="text-xs text-gray-500 font-mono">Verification ID: {shareModalCert.verificationNumber}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Public Verification URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={`${window.location.origin}/verify/${shareModalCert.verificationNumber}`}
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-mono text-gray-700"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/verify/${shareModalCert.verificationNumber}`);
                      alert('Public verification link copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition">
                    Copy Link
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">LinkedIn Post Template</label>
                <div className="relative">
                  <textarea 
                    rows={5}
                    readOnly
                    value={`I am thrilled to announce that I have successfully completed the rigorous professional training and earned my certificate in "${shareModalCert.courseTitle}" from Daikin HVAC Installation Academy! 🔧❄️\n\nVerification ID: ${shareModalCert.verificationNumber}\n\n#HVAC #Daikin #Engineering #Installation #ProfessionalDevelopment`}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 leading-relaxed font-sans"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-gray-500">Pre-formatted with hashtags and verification ID</span>
                  <button 
                    onClick={() => {
                      const text = `I am thrilled to announce that I have successfully completed the rigorous professional training and earned my certificate in "${shareModalCert.courseTitle}" from Daikin HVAC Installation Academy! 🔧❄️\n\nVerification ID: ${shareModalCert.verificationNumber}\n\n#HVAC #Daikin #Engineering #Installation #ProfessionalDevelopment`;
                      navigator.clipboard.writeText(text);
                      alert('LinkedIn post template copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" /> Copy LinkedIn Post
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                {shareModalCert.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Course Modal */}
      {adminCourseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <button onClick={() => setAdminCourseModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-extrabold text-gray-900">
              {adminEditingCourseId ? 'Edit Training Course & Modules' : 'Add New Training Course'}
            </h3>

            <form onSubmit={handleAdminCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Course Title</label>
                <input 
                  type="text" 
                  required
                  value={adminCourseForm.title}
                  onChange={(e) => setAdminCourseForm({ ...adminCourseForm, title: e.target.value })}
                  placeholder="e.g. Daikin VRV Advanced Diagnostics"
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select 
                    value={adminCourseForm.category}
                    onChange={(e) => setAdminCourseForm({ ...adminCourseForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold">
                    <option value="Air-Cooled Chillers">Air-Cooled Chillers</option>
                    <option value="Water-Cooled Chillers">Water-Cooled Chillers</option>
                    <option value="VRV / VRF Systems">VRV / VRF Systems</option>
                    <option value="Air Handling Units (AHU)">Air Handling Units (AHU)</option>
                    <option value="Fan Coil Units (FCU)">Fan Coil Units (FCU)</option>
                    <option value="DX and Split AC Systems">DX and Split AC Systems</option>
                    <option value="HVAC Controls and BMS Interfaces">HVAC Controls and BMS Interfaces</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Level</label>
                  <select 
                    value={adminCourseForm.level}
                    onChange={(e) => setAdminCourseForm({ ...adminCourseForm, level: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price (USD)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={adminCourseForm.price}
                    onChange={(e) => setAdminCourseForm({ ...adminCourseForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Duration</label>
                  <input 
                    type="text" 
                    required
                    value={adminCourseForm.duration}
                    onChange={(e) => setAdminCourseForm({ ...adminCourseForm, duration: e.target.value })}
                    placeholder="e.g. 8 hours"
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Approved Technical Source</label>
                <input 
                  type="text" 
                  required
                  value={adminCourseForm.approvedSource}
                  onChange={(e) => setAdminCourseForm({ ...adminCourseForm, approvedSource: e.target.value })}
                  placeholder="e.g. Daikin VRV Engineering Manual EDUS09-501R"
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Trailer / Preview Video URL</label>
                <input 
                  type="text" 
                  required
                  value={adminCourseForm.trailerUrl}
                  onChange={(e) => setAdminCourseForm({ ...adminCourseForm, trailerUrl: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cover Image URL</label>
                <input 
                  type="text" 
                  required
                  value={adminCourseForm.image}
                  onChange={(e) => setAdminCourseForm({ ...adminCourseForm, image: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Course Description</label>
                <textarea 
                  rows={3}
                  required
                  value={adminCourseForm.description}
                  onChange={(e) => setAdminCourseForm({ ...adminCourseForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              {/* Modules Editor */}
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Training Modules</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const newMod = { id: `m-${Date.now()}`, title: `Module ${adminCourseForm.modules.length + 1}`, duration: '30 mins', type: 'video', preview: false };
                      setAdminCourseForm({ ...adminCourseForm, modules: [...adminCourseForm.modules, newMod] });
                    }}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs rounded-lg">
                    + Add Module
                  </button>
                </div>
                {adminCourseForm.modules.map((mod, idx) => (
                  <div key={mod.id || idx} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <input 
                      type="text"
                      value={mod.title}
                      onChange={(e) => {
                        const mods = [...adminCourseForm.modules];
                        mods[idx].title = e.target.value;
                        setAdminCourseForm({ ...adminCourseForm, modules: mods });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                      placeholder="Module title"
                    />
                    <input 
                      type="text"
                      value={mod.duration}
                      onChange={(e) => {
                        const mods = [...adminCourseForm.modules];
                        mods[idx].duration = e.target.value;
                        setAdminCourseForm({ ...adminCourseForm, modules: mods });
                      }}
                      className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                      placeholder="Duration"
                    />
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                      <input 
                        type="checkbox"
                        checked={mod.preview}
                        onChange={(e) => {
                          const mods = [...adminCourseForm.modules];
                          mods[idx].preview = e.target.checked;
                          setAdminCourseForm({ ...adminCourseForm, modules: mods });
                        }}
                      /> Free Preview
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        const mods = adminCourseForm.modules.filter((_, i) => i !== idx);
                        setAdminCourseForm({ ...adminCourseForm, modules: mods });
                      }}
                      className="text-red-600 font-bold text-xs px-2 py-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAdminCourseModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition">
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-sm transition shadow-md">
                  {adminEditingCourseId ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0B192C] text-white py-12 px-4 mt-20 border-t border-[#1E3E62]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-gray-950">
                <Wrench className="w-5 h-5 font-bold" />
              </div>
              <div className="font-extrabold text-base tracking-wide">DAIKIN HVAC ACADEMY</div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Professional independent training platform dedicated to HVAC installation, inspection, testing, and commissioning readiness.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-amber-400 mb-3">Training Categories</h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>Air-Cooled & Water Chillers</li>
              <li>VRV / VRF Inverter Systems</li>
              <li>Air Handling Units (AHU / FAHU)</li>
              <li>Chilled Water & BMS Controls</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-amber-400 mb-3">Quick Links</h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li><button onClick={() => setCurrentView('catalog')} className="hover:underline">Course Catalog</button></li>
              <li><button onClick={() => setCurrentView('ai-assistant')} className="hover:underline">AI HVAC Assistant</button></li>
              <li><button onClick={() => setCurrentView('pricing')} className="hover:underline">Pricing Plans</button></li>
              <li><button onClick={() => setCurrentView('dashboard')} className="hover:underline">Student Dashboard</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-amber-400 mb-3">Safety & Compliance</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Always follow LOTO protocols, ASHRAE standards, and certified lifting permits. Independent training platform.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
          © 2026 Daikin HVAC Installation Academy. All rights reserved. {t.disclaimer}
        </div>
      </footer>
    </div>
  );
}
