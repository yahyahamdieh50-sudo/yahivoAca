import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_ASPECT_RATIOS = new Set(['16:9', '9:16']);
const VALID_RESOLUTIONS = new Set(['360p', '720p', '1080p']);
const OWNER_ADMIN_EMAILS = new Set(['admin@daikin-hvac-academy.com', 'yahyahamdieh50@gmail.com']);
const VALID_TECHNICAL_SKILL_LEVELS = new Set([
  'Level 1 — Apprentice / Helper',
  'Level 2 — Field Technician',
  'Level 3 — Senior Commissioning Engineer',
  'Level 4 — Daikin Master Specialist',
]);

interface AcademyVideoRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  playbackType?: 'interactive' | 'mp4';
  interactiveLessonId?: string | null;
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

interface VideoMetadataPresetRecord {
  id: string;
  name: string;
  technicalSkillLevel: string;
  requiredTools: string[];
  safetyPrerequisites: string[];
  referenceManualId: string | null;
  builtIn?: boolean;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
}

interface VideoAnalyticsSession {
  userId: string;
  userName: string;
  maxPercentReached: number;
  completed: boolean;
  rewatchCount: number;
  lastWatchedAt: string;
}

interface VideoAnalyticsRecord {
  videoId: string;
  totalViews: number;
  uniqueViewers: string[];
  completions: number;
  totalWatchSeconds: number;
  segmentWatches: number[];
  segmentRewatches: number[];
  recentSessions: VideoAnalyticsSession[];
  updatedAt: string;
}

interface VideoJobState {
  id: string;
  status: 'queued' | 'generating' | 'saving' | 'completed' | 'failed';
  phase: string;
  turnType: 'generate' | 'edit' | 'extend';
  startedAt: number;
  video?: AcademyVideoRecord;
  error?: string;
  createdBy: string;
}

interface LearningPathRecord {
  id: string;
  title: string;
  description: string;
  trackFocus: string;
  workflowStage: string;
  level: string;
  videoIds: string[];
  manualIds: string[];
  published: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface LearningPathProgressRecord {
  userId: string;
  pathId: string;
  completedVideoIds: string[];
  lastVideoId: string | null;
  updatedAt: string;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const parsed = new URL(origin);
        const host = parsed.hostname;
        const allowed =
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.endsWith('.run.app') ||
          host.endsWith('.usercontent.goog') ||
          host.endsWith('.google.com');
        return callback(null, allowed);
      } catch {
        return callback(null, false);
      }
    },
    credentials: false,
  }));
  app.use(express.json({ limit: '15mb' }));

  // Load Firebase web apiKey (public) for server-side ID token verification
  let firebaseWebApiKey = '';
  try {
    const fbCfgPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(fbCfgPath)) {
      const fbCfg = JSON.parse(fs.readFileSync(fbCfgPath, 'utf-8'));
      firebaseWebApiKey = fbCfg.apiKey || '';
    }
  } catch (e) {
    console.warn('Could not load firebase-applet-config.json:', e);
  }

  // Stripe secret key (optional; uses Stripe REST API directly when configured)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

  // Server-side Gemini client factory (uses process.env.GEMINI_API_KEY)
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured. Please select a billing-enabled API key in Settings > Secrets.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Session signing secret (in-memory random fallback when env var is not set)
  const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  function signSessionToken(user: { id: string; email: string; role: string; name: string }) {
    const payload = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifySessionToken(req: express.Request): { id: string; email: string; role: string; name: string } | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sigB64);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      if (!parsed.exp || parsed.exp < Date.now()) return null;
      return { id: parsed.id, email: parsed.email, role: parsed.role, name: parsed.name };
    } catch {
      return null;
    }
  }

  function requireInstructorOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const session = verifySessionToken(req);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required. Please sign in as an Instructor or Admin.' });
    }
    if (session.role !== 'admin' && session.role !== 'instructor') {
      return res.status(403).json({ error: 'Only Academy Admins and Instructors can generate, edit, or publish training videos.' });
    }
    (req as any).authUser = session;
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const session = verifySessionToken(req);
    if (!session) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }
    if (session.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges are required for this action.' });
    }
    (req as any).authUser = session;
    next();
  }

  // Data file persistence path (kept outside public/ and dist/ so builds stay small)
  const DATA_DIR = path.resolve(__dirname, 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');
  const VIDEOS_DIR = path.resolve(DATA_DIR, 'generated-videos');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  // Active video generation job tracker
  const videoJobs = new Map<string, VideoJobState>();

  // Initial seed data
  const initialDb = {
    users: [
      {
        id: 'usr_admin_1',
        name: 'Eng. Rashid Al-Maktoum',
        email: 'admin@daikin-hvac-academy.com',
        role: 'admin',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_instructor_1',
        name: 'Ing. Marco Bellini',
        email: 'instructor@daikin-hvac-academy.com',
        role: 'instructor',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_student_1',
        name: 'Tariq Bin Ziyad',
        email: 'student@daikin-hvac-academy.com',
        role: 'student',
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive',
        createdAt: new Date().toISOString()
      }
    ],
    courses: [
      {
        id: 'course-1',
        title: 'Daikin Air-Cooled Chillers (EWAD-TZ / MZ)',
        category: 'Air-Cooled Chillers',
        level: 'Advanced',
        tier: 'pro',
        duration: '8 hours',
        lessonsCount: 12,
        price: 25.00,
        image: '/src/assets/images/regenerated_image_1795462006111.jpg',
        description: 'Comprehensive installation, rigging, vibration isolator placement, brazing, brazed plate/shell-and-tube evaporator water piping, refrigerant charging, and pre-commissioning for Daikin Air-Cooled Screw & Scroll Chillers.',
        approvedSource: 'Daikin EWAD-TZ Installation Manual (Rev. 4.2, Doc ID: IM-EWAD-2024)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm1', title: '1. System Overview & Major Components', duration: '35 mins', type: 'video', preview: true },
          { id: 'm2', title: '2. Reading Approved Submittals & P&ID Diagrams', duration: '45 mins', type: 'document', preview: true },
          { id: 'm3', title: '3. Site Readiness & Structural Foundation Check', duration: '40 mins', type: 'video', preview: false },
          { id: 'm4', title: '4. Rigging, Lifting, and Positioning Tolerances', duration: '50 mins', type: 'video', preview: false },
          { id: 'm5', title: '5. Evaporator Water Piping & Flow Switch Wiring', duration: '60 mins', type: 'interactive', preview: false },
          { id: 'm6', title: '6. Refrigerant Circuit & Leak Testing Protocols', duration: '45 mins', type: 'video', preview: false },
          { id: 'm7', title: '7. Electrical Power & BMS Interlock Wiring', duration: '55 mins', type: 'video', preview: false },
          { id: 'm8', title: '8. Pre-Commissioning Tests and Oil Pressure Checks', duration: '50 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-2',
        title: 'Daikin Water-Cooled Centrifugal & Screw Chillers',
        category: 'Water-Cooled Chillers',
        level: 'Advanced',
        tier: 'pro',
        duration: '10 hours',
        lessonsCount: 15,
        price: 25.00,
        image: '/src/assets/images/regenerated_image_1795462006943.jpg',
        description: 'Expert installation training for Daikin magnetic bearing centrifugal chillers and high-efficiency water-cooled screw chillers, including condenser water loop integration and cooling tower coordination.',
        approvedSource: 'Daikin DWSC Installation & Operation Manual (Doc Ref: OM-DWSC-2023-V2)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm201', title: '1. Centrifugal & Magnetic Bearing Technology Overview', duration: '40 mins', type: 'video', preview: true },
          { id: 'm202', title: '2. Condenser & Evaporator Water Circuitry Standards', duration: '50 mins', type: 'document', preview: true },
          { id: 'm203', title: '3. Machine Room Ventilation & Safety Relief Venting', duration: '45 mins', type: 'video', preview: false },
          { id: 'm204', title: '4. Refrigerant Recovery and Evacuation Standards', duration: '60 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-3',
        title: 'Daikin VRV / VRF Systems (VRV V / IV+ Series)',
        category: 'VRV / VRF Systems',
        level: 'Intermediate',
        tier: 'basic',
        duration: '6 hours',
        lessonsCount: 10,
        price: 9.99,
        image: '/src/assets/images/regenerated_image_1795462007739.png',
        description: 'Master Daikin VRV refrigerant piping design, multi-port refnet joint brazing, nitrogen purging pressure test at 4.15 MPa (601 psi), electronic expansion valve checks, and commissioning via Daikin Service Checker.',
        approvedSource: 'Daikin VRV Engineering & Installation Manual (EDUS09-501R)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm301', title: '1. VRV Architecture & REFNET Piping Rules', duration: '45 mins', type: 'video', preview: true },
          { id: 'm302', title: '2. Nitrogen Purging & Brazing Best Practices', duration: '50 mins', type: 'video', preview: true },
          { id: 'm303', title: '3. Pressure Testing at 4.15 MPa (601 psi)', duration: '40 mins', type: 'video', preview: false },
          { id: 'm304', title: '4. Vacuum Dehydration Down to -755 mmHg (500 microns)', duration: '45 mins', type: 'interactive', preview: false },
          { id: 'm305', title: '5. Refrigerant Charge Calculation & Additional Charge Add', duration: '50 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-4',
        title: 'Daikin Air Handling Units (AHU Modular & Custom)',
        category: 'Air Handling Units (AHU)',
        level: 'Intermediate',
        tier: 'basic',
        duration: '5 hours',
        lessonsCount: 8,
        price: 9.99,
        image: '/src/assets/images/regenerated_image_1795462008526.png',
        description: 'Modular section assembly, airtight gasketing, chilled water coil connection, centrifugal/plug fan alignment, VFD integration, filter rack sealing, and duct connection compliance.',
        approvedSource: 'Daikin AHU Assembly & Installation Guide (IM-AHU-2024)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm401', title: '1. Modular Sectional Assembly & Gasketing', duration: '40 mins', type: 'video', preview: true },
          { id: 'm402', title: '2. Chilled Water & Steam Coil Pipings & Traps', duration: '50 mins', type: 'document', preview: true },
          { id: 'm403', title: '3. Fan Wheel Alignment & Belt Tensioning', duration: '45 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-5',
        title: 'Daikin Fresh Air Handling Units (FAHU) & Heat Recovery',
        category: 'Fresh Air Handling Units (FAHU)',
        level: 'Advanced',
        tier: 'pro',
        duration: '6 hours',
        lessonsCount: 9,
        price: 25.00,
        image: '/src/assets/images/regenerated_image_1795462010375.png',
        description: 'Specialized 100% outside air handling units, heat recovery wheel alignment, face and bypass damper calibration, dehumidification controls, and IAQ compliance in hot & humid climates.',
        approvedSource: 'Daikin FAHU Technical Specifications & Commissioning Manual (FAHU-REF-09)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm501', title: '1. 100% Outdoor Air Thermodynamics & Psychrometrics', duration: '45 mins', type: 'video', preview: true },
          { id: 'm502', title: '2. Rotary Heat Recovery Wheel Installation', duration: '50 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-6',
        title: 'Daikin Fan Coil Units (FCU Concealed & Cassette)',
        category: 'Fan Coil Units (FCU)',
        level: 'Beginner',
        tier: 'basic',
        duration: '3 hours',
        lessonsCount: 6,
        price: 9.99,
        image: '/src/assets/images/regenerated_image_1795462009447.png',
        description: 'Ceiling suspension, threaded rod stabilization, flexible hose and 2-way/3-way motorized valve installation, condensate drain slope (minimum 1:100), and acoustic insulation.',
        approvedSource: 'Daikin FCU Installation Manual (FWV-DFW Series)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm601', title: '1. Ceiling Suspension & Anti-Vibration Mountings', duration: '30 mins', type: 'video', preview: true },
          { id: 'm602', title: '2. Condensate Drain Piping & Trap Fall Verification', duration: '35 mins', type: 'video', preview: true }
        ]
      },
      {
        id: 'course-7',
        title: 'Daikin DX Split & SkyAir Systems',
        category: 'DX and Split AC Systems',
        level: 'Beginner',
        tier: 'basic',
        duration: '4 hours',
        lessonsCount: 7,
        price: 9.99,
        image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
        description: 'Wall-mounted and ducted SkyAir split unit installation, flare connection torque specs, liquid/suction insulation, communication wiring, and operating pressure verification.',
        approvedSource: 'Daikin SkyAir Installation Manual (FBA-A / RZQS Series)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm701', title: '1. Indoor Unit Leveling & Wall Bracket Rigging', duration: '30 mins', type: 'video', preview: true },
          { id: 'm702', title: '2. Flare Connection Torque Calibration', duration: '40 mins', type: 'video', preview: true }
        ]
      },
      {
        id: 'course-8',
        title: 'Daikin Packaged Rooftop AC Units',
        category: 'Packaged AC Units',
        level: 'Intermediate',
        tier: 'basic',
        duration: '5 hours',
        lessonsCount: 8,
        price: 9.99,
        image: 'https://images.unsplash.com/photo-1542013936693-894d1b66e5f6?auto=format&fit=crop&w=800&q=80',
        description: 'Rooftop curb preparation, weatherproof duct collar sealing, condenser airflow clearances, high-ambient temperature operation (up to 52°C), and electrical disconnect positioning.',
        approvedSource: 'Daikin Rooftop Packaged Unit Installation Manual (U-DT Series)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm801', title: '1. Roof Curb Installation & Waterproof Flashing', duration: '45 mins', type: 'video', preview: true },
          { id: 'm802', title: '2. High Ambient Condenser Airflow Management', duration: '40 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-9',
        title: 'Daikin HVAC Controls & BMS Interfaces (Modbus, BACnet, LonWorks)',
        category: 'HVAC Controls and BMS Interfaces',
        level: 'Advanced',
        tier: 'pro',
        duration: '7 hours',
        lessonsCount: 10,
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
        description: 'Daikin Intelligent Touch Manager (iTM), DIII-net wiring protocols, BACnet/IP and Modbus RTU gateway configuration, point mapping, and centralized scheduling.',
        approvedSource: 'Daikin iTM & BMS Integration Engineering Guide (DMS502A51)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm901', title: '1. DIII-net Topology & Shielded Twisted Pair Wiring', duration: '45 mins', type: 'video', preview: true },
          { id: 'm902', title: '2. Intelligent Touch Manager (iTM) Commissioning', duration: '60 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-10',
        title: 'Daikin Chilled Water System Installation & Hydraulic Balancing',
        category: 'Chilled Water System Installation',
        level: 'Advanced',
        tier: 'pro',
        duration: '9 hours',
        lessonsCount: 14,
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80',
        description: 'Primary-secondary pumping arrangements, differential pressure bypass valves, pipe expansion loops, chemical flushing, water treatment, air purging, and static/dynamic hydraulic balancing.',
        approvedSource: 'Daikin Chilled Water Piping Design & Hydraulic Manual (CHW-ENG-2023)',
        published: true,
        trailerUrl: 'https://www.youtube.com/embed/9Z9N4K8W2oQ',
        modules: [
          { id: 'm1001', title: '1. Hydraulic Circuit Design & Pumping Standards', duration: '50 mins', type: 'video', preview: true },
          { id: 'm1002', title: '2. Chemical Cleaning, Flushing & Water Quality', duration: '55 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-11',
        title: 'Daikin Ceiling Concealed Split AC (FDMRN-AV1K Series)',
        category: 'DX and Split AC Systems',
        level: 'Intermediate',
        tier: 'basic',
        duration: '5 hours',
        lessonsCount: 9,
        price: 9.99,
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        description: 'Comprehensive installation and service training for Daikin FDMRN-AV1K Medium Static Pressure Ceiling Concealed Units (20,000 to 50,000 Btu/h, R410A, 50Hz, High Ambient). Covers refrigerant piping rules (max 50m length, 30m elevation), additional refrigerant charge calculations (20-45 g/m), double protection drainage system, wiring specifications, and sound pressure level guidelines.',
        approvedSource: 'Daikin FDMRN-AV1K Technical Manual (TM-5CC-C-ME-A3)',
        published: true,
        trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-technician-working-on-air-conditioning-unit-41443-large.mp4',
        modules: [
          { id: 'm1101', title: '1. Nomenclature, Line-up & Specifications (FDMRN20-50AV1K)', duration: '35 mins', type: 'video', preview: true },
          { id: 'm1102', title: '2. Refrigerant Circuit Diagrams & Capillary / Expansion Control', duration: '40 mins', type: 'document', preview: true },
          { id: 'm1103', title: '3. Ceiling Concealed Mounting & Axle Distance Tolerances', duration: '45 mins', type: 'video', preview: false },
          { id: 'm1104', title: '4. Refrigerant Piping Lengths, Elevations & Additional Charge', duration: '50 mins', type: 'interactive', preview: false },
          { id: 'm1105', title: '5. Double Protection Drainage System & Drain Fall', duration: '35 mins', type: 'video', preview: false },
          { id: 'm1106', title: '6. Electrical Cable Sizing, Fuses & Wiring Diagrams', duration: '45 mins', type: 'video', preview: false }
        ]
      },
      {
        id: 'course-12',
        title: 'Daikin Air-Cooled Chiller with Inverter Screw Compressor (EWAH/EWAD/EWAS-TZD)',
        category: 'Air-Cooled Chillers',
        level: 'Advanced',
        tier: 'pro',
        duration: '12 hours',
        lessonsCount: 16,
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
        description: 'Master installation, mechanical positioning, spring vibration damper leveling, safety valve calibration (25.5 bar high pressure / 15.5 bar low pressure), R1234ze(E), R134a, R513a refrigerants, hydronic free cooling, and inverter screw compressor maintenance for Daikin TZD Air-Cooled Chillers.',
        approvedSource: 'Daikin TZD Air-Cooled Screw Chiller O&M Manual (Doc ID: D-EIMAC01905-23_05EN)',
        published: true,
        trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-technician-working-on-air-conditioning-unit-41443-large.mp4',
        modules: [
          { id: 'm1201', title: '1. Inverter Screw Compressor & Refrigerant Options (R1234ze, R134a, R513a)', duration: '45 mins', type: 'video', preview: true },
          { id: 'm1202', title: '2. Mechanical Installation, Safety Hooks & Lifting Shackles', duration: '50 mins', type: 'document', preview: true },
          { id: 'm1203', title: '3. Unit Leveling & Spring Vibration Damper Installation', duration: '40 mins', type: 'video', preview: false },
          { id: 'm1204', title: '4. Water Circuit, Mechanical Filters & Hydronic Free Cooling', duration: '60 mins', type: 'interactive', preview: false },
          { id: 'm1205', title: '5. Electrical Supply, VFD Modbus RTU & Safety Interlocks', duration: '55 mins', type: 'video', preview: false },
          { id: 'm1206', title: '6. Routine & Extraordinary Maintenance Plans for Screw Chillers', duration: '50 mins', type: 'video', preview: false }
        ]
      }
    ],
    enrollments: [
      { id: 'enr-1', userId: 'usr_student_1', courseId: 'course-3', progress: 40, completedModules: ['m301', 'm302'], enrolledAt: new Date().toISOString() }
    ],
    quizzes: [
      {
        id: 'quiz-1',
        courseId: 'course-3',
        title: 'VRV Installation Final Assessment',
        questions: [
          {
            id: 'q1',
            question: 'What is the standard required nitrogen pressure test holding value for Daikin VRV refrigerant piping?',
            options: ['1.5 MPa (217 psi)', '3.0 MPa (435 psi)', '4.15 MPa (601 psi)', '5.5 MPa (797 psi)'],
            correctIndex: 2,
            explanation: 'Daikin engineering guidelines require a 3-stage pressure test reaching up to 4.15 MPa (601 psi) with nitrogen gas for 24 hours.'
          },
          {
            id: 'q2',
            question: 'What is the target vacuum level for system dehydration before charging refrigerant in VRV systems?',
            options: ['-100 mmHg (Atmospheric)', '-500 mmHg', '-755 mmHg (500 microns)', '-760 mmHg absolute zero'],
            correctIndex: 2,
            explanation: 'Vacuum must reach and hold -755 mmHg (500 microns or lower) to boil off moisture.'
          },
          {
            id: 'q3',
            question: 'Which tool is officially utilized for Daikin VRV commissioning, error code diagnosis, and test running?',
            options: ['Multimeter only', 'Daikin Service Checker / iTM', 'Standard manifold gauge set', 'Anemometer'],
            correctIndex: 1,
            explanation: 'Daikin Service Checker software and hardware interface is required for deep diagnostics and commissioning.'
          }
        ]
      }
    ],
    certificates: [
      {
        id: 'cert-101',
        userId: 'usr_student_1',
        courseId: 'course-6',
        courseTitle: 'Daikin Fan Coil Units (FCU Concealed & Cassette)',
        verificationNumber: 'DAIKIN-ACADEMY-9823-FCU',
        issuedAt: new Date().toISOString(),
        disclaimer: 'Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd.'
      }
    ],
    resources: [
      { id: 'res-1', title: 'Daikin VRV Pre-Installation & Pressure Test Checklist (PDF)', category: 'VRV / VRF Systems', size: '2.4 MB', url: '#' },
      { id: 'res-2', title: 'Air-Cooled Chiller Rigging & Foundation Clearance Guide', category: 'Air-Cooled Chillers', size: '4.1 MB', url: '#' },
      { id: 'res-3', title: 'Chilled Water Pipe Insulation & Vapor Barrier Standard', category: 'Chilled Water System Installation', size: '3.0 MB', url: '#' },
      { id: 'res-4', title: 'BMS DIII-net Wiring Topology & Grounding Specification', category: 'HVAC Controls and BMS Interfaces', size: '1.8 MB', url: '#' },
      { id: 'res-5', title: 'Daikin FDMRN-AV1K Ceiling Concealed Split AC Technical Manual (PDF)', category: 'DX and Split AC Systems', size: '12.4 MB', url: '/public/assets/aistudio/ED_-_FMDRN_-_AV1K_9b66c6c5.pdf' },
      { id: 'res-6', title: 'Daikin TZD Air-Cooled Screw Chiller O&M Manual (PDF)', category: 'Air-Cooled Chillers', size: '28.5 MB', url: '/public/assets/aistudio/EWAH-TZ-D.EWAD-TZ-D.EWAS-TZ-D.EWFH-TZ-D.EWFD-TZ-D.EWFS-TZ-D_Installation.Operation.Maintenance_manual_D-EIMAC01905-23_05_English__003__8713ce6b.pdf' },
      { id: 'res-7', title: 'Daikin EKEQMCBAV3 Option Kit & EKEXV IOM Manual (PDF)', category: 'AHU Expansion Valve Kits', size: '3.8 MB', url: '/public/assets/aistudio/EKEQMCBAV3_EKEXV_4PEN383213-1B_2016-10_Installation_and_operation_manual_English_a1e09978.pdf' },
      { id: 'res-8', title: 'Daikin RXQ-ARYFK VRV X Series Engineering Data Book (PDF)', category: 'VRV / VRF Systems', size: '18.5 MB', url: '/public/assets/aistudio/RXQ-ARYFK_Data_Book_f7755162.pdf' },
      { id: 'res-9', title: 'Daikin FXMQ-ARV1 Ducted Unit Data Book (PDF)', category: 'Air Handling Units (AHU)', size: '15.2 MB', url: '/public/assets/aistudio/FXMQ-ARV1_Data_Book_3298406b.pdf' },
      { id: 'res-10', title: 'Daikin FXFQ-B Ceiling Mounted Cassette Installation & Operation Manual (PDF)', category: 'Fan Coil Units (FCU)', size: '9.4 MB', url: '/public/assets/aistudio/FXFQ-B_Installation_and_operation_manuals_4PEN540926-1E_English_e2305f66.pdf' },
      { id: 'res-11', title: 'Daikin Energy Recovery Ventilation (ERV) Units IOM Manual (PDF)', category: 'Energy Recovery Ventilation', size: '14.8 MB', url: '/public/assets/aistudio/ERV_Installation_Operation__Maintenance_Manual_6175514d.pdf' },
      { id: 'res-12', title: 'Daikin FDMRN-A Series Engineering Data Book (PDF)', category: 'DX and Split AC Systems', size: '16.5 MB', url: '/public/assets/aistudio/FDMRN_0f4c7fe9.pdf' },
      { id: 'res-13', title: 'Daikin FDMRN-A-K Series Operation Manual (PDF)', category: 'DX and Split AC Systems', size: '6.2 MB', url: '/public/assets/aistudio/FDMRN-A-K_Series_Operation_Manual_2022-03-28_06_35_01_f27b0312.pdf' },
      { id: 'res-14', title: 'Daikin FTKM-PVM R-32 Wall Mounted Split AC Technical Data (PDF)', category: 'DX and Split AC Systems', size: '11.1 MB', url: '/public/assets/aistudio/FTKM_495ba481.pdf' },
      { id: 'res-15', title: 'Daikin FAHU with VRV Outdoor Piping & Wiring Installation Manual (PDF)', category: 'Fresh Air Handling Units (FAHU)', size: '8.4 MB', url: '/public/assets/aistudio/FAHU_VRV_IM_3ca5bfea.pdf' },
      { id: 'res-16', title: 'Daikin Commissioning & Handing Over Report Template (PDF)', category: 'Commissioning & Reports', size: '2.1 MB', url: '/public/assets/aistudio/DX_Comm_Report_f311a8f4.pdf' },
      { id: 'res-17', title: 'Daikin Al Jada Development Project Spare Parts List (PDF)', category: 'Spare Parts & Logistical Schedule', size: '4.5 MB', url: '/public/assets/aistudio/DX_SPARE_PARTS_LIST_1f48cb19.pdf' },
      { id: 'res-18', title: 'Daikin AHU VRV IV Commissioning Checklist (PDF)', category: 'Air Handling Units (AHU)', size: '3.2 MB', url: '/public/assets/aistudio/FAHU_CHECK_LIST_FOR_GECO_NEST._1b46e327.pdf' },
      { id: 'res-19', title: 'Daikin FAHU-01 Villa-04 Control Panel & Thyristor Schematics (PDF)', category: 'Control Panels & Wiring Diagrams', size: '1.6 MB', url: '/public/assets/aistudio/01-FAHU-01_VILLA-04_CONTROL_PANEL__A_D_EC_SUPPLY_FAN__THYRISTOR-6.0KW__20ce941a.pdf' },
      { id: 'res-20', title: 'Daikin FAHU-P5-01 Control Panel Electrical Drawings (PDF)', category: 'Control Panels & Wiring Diagrams', size: '1.5 MB', url: '/public/assets/aistudio/01-FAHU-P5-01_CONTROL_PANEL_fe73da4c.pdf' },
      { id: 'res-21', title: 'Daikin RYYQ-T7Y1B Outdoor Unit Layout & Installation Guide (PDF)', category: 'VRV / VRF Systems', size: '3.1 MB', url: '/public/assets/aistudio/RYYQ-T7Y1B_Guide_e4066213.pdf' },
      { id: 'res-22', title: 'ebm-papst EC Centrifugal Fans RadiPac Technical Catalog (PDF)', category: 'Ventilation & Fan Engineering', size: '43.4 MB', url: '/public/assets/aistudio/Catalog_Centrifugalfans_EC-RadiPac_EN_7a46676c.pdf' },
      { id: 'res-23', title: 'Daikin Simple Self-Diagnosis by Malfunction Code Manual (SM-TS2) (PDF)', category: 'Troubleshooting & Error Codes', size: '0.3 MB', url: '/public/assets/aistudio/ERROR_CODE_-_SM-TS2_f92939a2.pdf' },
      { id: 'res-24', title: 'Daikin Middle East OYL Condensing Unit with AHU Service Training Course (PDF)', category: 'Service Training & O&M Manuals', size: '4.2 MB', url: '/public/assets/aistudio/OYL_Condensing_Unit_AHU_Service_Course_69b38359.pdf' },
      { id: 'res-25', title: 'Daikin VRV IV & AHU Testing and Commissioning Report (PDF)', category: 'Commissioning & Reports', size: '0.9 MB', url: '/public/assets/aistudio/VRV___F_AHU-Testing_and_Commissioning_Report_e1fd7e2d.pdf' },
      { id: 'res-26', title: 'Daikin VRV IV & AHU/FAHU Commissioning & Inspection Sheet (PDF)', category: 'Air Handling Units (AHU)', size: '0.8 MB', url: '/public/assets/aistudio/AHU_FAHU_MS_1a53dc2e.pdf' },
      { id: 'res-27', title: 'Daikin FXSQ-A2VEB Concealed Ceiling Ducted Indoor Unit Installation & Operation Manual (PDF)', category: 'Fan Coil Units (FCU)', size: '4.6 MB', url: '/public/assets/aistudio/FXSQ-A2VEB_Installation___Operation_Manual_EN_d4d8096a.pdf' },
      { id: 'res-28', title: 'Daikin VRV IV High Ambient Heat Pump Engineering Data Book (RXYTQ8-48TYF) (PDF)', category: 'VRV / VRF Systems', size: '24.8 MB', url: '/public/assets/aistudio/VRV_DATA_BOOK_RXYTQ-TYF_EEDEN15-210_Data_Books_English_04720be6.pdf' },
      { id: 'res-29', title: 'Daikin VRV IV (RXYTQ) Troubleshooting & Error Codes Reference (A0-UH) (PDF)', category: 'Troubleshooting & Error Codes', size: '1.2 MB', url: '/public/assets/aistudio/VRV_Error_Codes_f47c5125.pdf' },
      { id: 'res-30', title: 'Daikin VRV IV (RXYTQ) General Operation, Controls & Maintenance Presentation (PDF)', category: 'VRV / VRF Systems', size: '8.9 MB', url: '/public/assets/aistudio/VRV_General_operation_maintainance_presentation_-_RXYTQ_fcfcd6e9.pdf' },
      { id: 'res-31', title: 'Daikin Middle East VRV-IV High Ambient Installation Training Presentation (PDF)', category: 'VRV / VRF Systems', size: '11.4 MB', url: '/public/assets/aistudio/3._DAME-VRV-IV_Installation_Training_PPT_b68799a2.pdf' },
      { id: 'res-32', title: 'Daikin Middle East Modular Air Handling Units IOM Manual (DMA-IOM-15-01) (PDF)', category: 'Air Handling Units (AHU)', size: '9.8 MB', url: '/public/assets/aistudio/AHU__Installation__Operation___Maintenance_Manual_82dff2dc.pdf' },
      { id: 'res-33', title: 'Daikin Guidelines for Using Generator Power for DX & VRV Systems (PDF)', category: 'HVAC Controls and BMS Interfaces', size: '1.1 MB', url: '/public/assets/aistudio/GUIDELINES_FOR_USING_GENERATOR_POWER_FOR_DAIKIN_DX-VRV_SYSTEMS_e67312ef.pdf' },
      { id: 'res-34', title: 'Daikin VRV + FAHU Control Sequence, 0-10V Wiring & Block Diagram (PDF)', category: 'Fresh Air Handling Units (FAHU)', size: '1.9 MB', url: '/public/assets/aistudio/VRV___FAHU_Control_sequence_wiring_block_diagram_c9fbf891.pdf' }
    ],
    promoCodes: [
      { code: 'DAIKIN20', discountPercent: 20, active: true },
      { code: 'ACADEMY50', discountPercent: 50, active: true },
      { code: 'FREEMODULE', discountPercent: 100, active: true }
    ],
    modelLibrary: [
      { modelNumber: 'EWAD240TZSRN', equipmentType: 'Air-Cooled Chiller', manualTitle: 'EWAD-TZ Installation Manual Rev 4.2', torqueSpec: 'Flange bolts: 145 Nm', refrigerantCharge: 'R-134a / R-513A (Dual Circuit)', clearanceReq: 'Minimum 2.0m vertical, 1.5m perimeter' },
      { modelNumber: 'VRV-V-REXYQ', equipmentType: 'VRV Inverter Heat Pump', manualTitle: 'VRV V Engineering Manual EDUS09-501R', torqueSpec: '1/2 inch flare nut: 55-65 Nm', refrigerantCharge: 'R-410A / R-32 dependent', clearanceReq: '1.5m top discharge clearance' },
      { modelNumber: 'FBA100A', equipmentType: 'Ducted SkyAir Unit', manualTitle: 'FBA-A Installation Manual', torqueSpec: 'Suspension rod M10: 35 Nm', refrigerantCharge: 'Factory pre-charged + liquid line add', clearanceReq: 'Service access hatch 600x600mm minimum' }
    ],
    reviews: [
      { id: 'rev-1', courseId: 'course-3', userId: 'usr_student_1', userName: 'Tariq Bin Ziyad', rating: 5, comment: 'Exceptional breakdown of VRV refnet joints and 4.15 MPa pressure testing. Highly recommended for site engineers!', createdAt: new Date().toISOString() },
      { id: 'rev-2', courseId: 'course-1', userId: 'usr_instructor_1', userName: 'Ing. Marco Bellini', rating: 5, comment: 'Rigorous engineering accuracy matching EWAD-TZ manual specs perfectly.', createdAt: new Date().toISOString() }
    ],
    generatedVideos: [
      {
        id: 'vid_lesson_1',
        title: 'VRV IV & VRV X Piping, 0.02 MPa N₂ Brazing & 40-Bar Pressure Testing',
        description: 'Bilingual (EN/AR) narrated animated training covering 165m/1000m VRV piping limits, 500mm Refnet straight runs, 200mm oil rise traps, continuous 0.02 MPa dry nitrogen brazing, 3-step 4.15 MPa leak test, 2-hour 500-micron vacuum drying, and liquid-line R-410A charging.',
        category: 'VRV / VRF Systems',
        level: 'Intermediate',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-vrv-piping',
        technicalSkillLevel: 'Level 2 — Field Technician',
        requiredTools: [
          'Dual-Stage Dry Nitrogen Regulator (0–6.0 MPa)',
          'Low-Flow Nitrogen Purge Regulator (0.02 MPa)',
          'Oxy-Acetylene Brazing Torch with Flashback Arrestors',
          'Two-Stage Vacuum Pump & Digital Micron Gauge (<500 Microns)',
          'Calibrated Electronic Refrigerant Charging Scale (R-410A)',
        ],
        safetyPrerequisites: [
          'Maintain continuous 0.02 MPa dry nitrogen sweep inside copper piping during all brazing',
          'Pressurize stepwise (0.3 → 1.5 → 4.0/4.15 MPa) using dry nitrogen only — never use oxygen',
          'Keep outdoor liquid and gas service stop valves closed throughout pressure and vacuum testing',
        ],
        referenceManualId: 'res-31',
        prompt: 'Built-in bilingual animated training lesson grounded in DAME VRV-IV Installation Training PPT & RXQ-ARYFK Data Book.',
        interactionId: 'builtin-lesson-vrv-piping',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_1',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 85,
        cumulativeDurationSeconds: 85,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-3',
        moduleId: 'm301',
        isCourseTrailer: true,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'vid_lesson_2',
        title: 'VRV + FAHU 0–10V DC Control Wiring & EKEQFCB Capacity Step Sequence',
        description: 'Bilingual (EN/AR) narrated animated training on Daikin VRV-to-FAHU integration with EKEXV, EKEQFCBAV3, and DDC panels: ≥50mm cable separation, F1/F2 & T1/T2 wiring, live 0–10V DC ΔT step curve (5V hold / 5.5–10V cool), and damper/airflow safety interlocks.',
        category: 'Fresh Air Handling Units (FAHU)',
        level: 'Advanced',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-vrv-fahu-controls',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          '0–10V DC Signal Generator / Loop Calibrator',
          'True-RMS Digital Multimeter',
          '0.75–1.25 mm² Shielded Twisted Pair Cable & Crimper',
          'Thermistor Thermal Paste & Aluminum Foil Tape (R2T/R3T)',
          'Digital Differential Pressure Manometer',
        ],
        safetyPrerequisites: [
          'Separate 230V/400V AC power wiring from F1/F2, P1/P2, and 0–10V DC control lines by ≥50 mm',
          'Never permit VRV compressor start without verified FAHU motorized damper end-switch and airflow DPS proof',
          'Confirm fire alarm dry-contact hardwire stops supply fan and VRV unit immediately',
        ],
        referenceManualId: 'res-34',
        prompt: 'Built-in bilingual animated training lesson grounded in Daikin VRV + FAHU Control Sequence & Wiring Block Diagram.',
        interactionId: 'builtin-lesson-vrv-fahu-controls',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_2',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 85,
        cumulativeDurationSeconds: 85,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-5',
        moduleId: 'm501',
        isCourseTrailer: true,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'vid_lesson_3',
        title: 'VRV Outdoor A1P Control PCB Settings (BS1–BS3, DS1–DS2) & Error Codes',
        description: 'Bilingual (EN/AR) narrated animated training covering 6-hour crankcase preheat, refrigerant-cooled A1P PCB navigation (Mode 1 vs Mode 2 [2-49]/[2-35]), mandatory Test Run (t01–t10), 8-hour oil recovery, and troubleshooting E3, U4, U3, UF, and L5 faults.',
        category: 'Troubleshooting & Error Codes',
        level: 'Advanced',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-vrv-pcb-errors',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          'Insulated Precision Screwdriver (DS1/DS2 DIP Switches)',
          'Daikin Service Checker / True-RMS Clamp Meter',
          'Digital R-410A Manifold Gauge Set',
          'VRV IV Error Code Manual (A0–UH)',
        ],
        safetyPrerequisites: [
          'Energize outdoor crankcase heater for at least 6 hours before starting inverter compressors',
          'Wait 10 minutes after power isolation and verify DC bus capacitors are discharged before touching inverter PCB',
          'Log active Mode 1 fault history before cycling main isolator power',
        ],
        referenceManualId: 'res-29',
        prompt: 'Built-in bilingual animated training lesson grounded in RXYTQ Operation & Maintenance Presentation & VRV Error Codes Manual.',
        interactionId: 'builtin-lesson-vrv-pcb-errors',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_3',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 85,
        cumulativeDurationSeconds: 85,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-3',
        moduleId: 'm305',
        isCourseTrailer: false,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'vid_lesson_4',
        title: 'Modular AHU / FAHU Assembly, Spring Isolators, Siphon Drain & Start-Up',
        description: 'Bilingual (EN/AR) narrated animated training based on DMA-IOM-15-01: spreader-bar rigging, 40/60mm thermal-break gasketing, unlocking fan shipping bolts, laser pulley alignment, negative-pressure siphon trap sizing (H ≥ fan static head + 50mm), and Star-Delta start-up.',
        category: 'Air Handling Units (AHU)',
        level: 'Intermediate',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-ahu-fahu-startup',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          'Laser Pulley & V-Belt Tension Alignment Tool',
          'True-RMS Clamp Meter (L1/L2/L3 vs Nameplate FLA)',
          'Precision Spirit Level & Torque Wrench Set',
          'Differential Pressure Manometer & Condensate Test Pitcher',
        ],
        safetyPrerequisites: [
          'Apply Lockout/Tagout (LOTO) before removing fan isolator shipping bolts or rotating impeller by hand',
          'Never operate AHU supply fans with inspection doors open or ductwork disconnected (motor overload hazard)',
          'Prime negative-pressure condensate siphon trap with water and verify heater high-limit cutout with fan off',
        ],
        referenceManualId: 'res-32',
        prompt: 'Built-in bilingual animated training lesson grounded in Daikin Middle East Modular AHU IOM Manual (DMA-IOM-15-01).',
        interactionId: 'builtin-lesson-ahu-fahu-startup',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_4',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 85,
        cumulativeDurationSeconds: 85,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-4',
        moduleId: 'm401',
        isCourseTrailer: true,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'vid_lesson_5',
        title: 'FXSQ Concealed Ceiling Ducted Installation, 625 mm Drain Pump & ESP Setup',
        description: 'Bilingual (EN/AR) narrated animated training grounded in the FXSQ-A2VEB manual: 4×M10 hanger rod leveling, rear vs bottom suction conversion, dual-wrench flare torque specs (14–61 Nm), 625 mm high-lift condensate pump test, 30–150 Pa ESP setup, and BRC1E62 wiring.',
        category: 'Fan Coil Units (FCU)',
        level: 'Beginner',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-fxsq-ducted',
        technicalSkillLevel: 'Level 2 — Field Technician',
        requiredTools: [
          'Calibrated Flare Torque Wrench & Backup Spanner (1/4" to 5/8")',
          'Spirit Level & M10 Double-Nut Ratchet Wrench',
          '1-Liter Drain Pan Water Pour Test Pitcher',
          'Insulated Wire Stripper for F1/F2 & P1/P2 Control Terminals',
        ],
        safetyPrerequisites: [
          'Verify ceiling slab anchor load rating for all four M10 suspension rods before lifting unit',
          'Confirm ≥450×450 mm service hatch clearance below switch box and drain pan',
          'Never connect 230V AC supply onto non-polar F1/F2 or P1/P2 BRC1E62 terminals',
        ],
        referenceManualId: 'res-27',
        prompt: 'Built-in bilingual animated training lesson grounded in Daikin FXSQ-A2VEB Installation & Operation Manual EN.',
        interactionId: 'builtin-lesson-fxsq-ducted',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_5',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 80,
        cumulativeDurationSeconds: 80,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-6',
        moduleId: 'm601',
        isCourseTrailer: true,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'vid_lesson_6',
        title: 'Generator Power Guidelines, ELCB/RCCB Protection & 500V Megger Checks',
        description: 'Bilingual (EN/AR) narrated animated training on Daikin DX/VRV electrical protection: ±10% generator voltage tolerance, ≤2% phase unbalance, pure sine wave AVR, Neutral-to-Earth <1V, inverter-rated 100–300 mA ELCB selection, and safe 500V DC Megger ≥2 MΩ testing.',
        category: 'HVAC Controls and BMS Interfaces',
        level: 'Advanced',
        playbackType: 'interactive',
        interactiveLessonId: 'lesson-generator-elcb',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          '500V DC Insulation Resistance Tester (Megger)',
          '3-Phase Power Quality Analyzer / True-RMS Multimeter',
          'Phase Rotation Sequence Meter (L1-L2-L3)',
          'Earth Loop Impedance & ELCB Trip Tester',
        ],
        safetyPrerequisites: [
          'CRITICAL: Disconnect inverter PCBs, F1/F2, and P1/P2 wiring before applying 500V DC Megger test voltage',
          'Verify Neutral-to-Earth voltage <1.0V AC and fixed L1-L2-L3 phase sequence on generator transfer',
          'Install high-frequency inverter-compatible ELCB (100–300 mA) and maintain daily generator power logs for warranty',
        ],
        referenceManualId: 'res-33',
        prompt: 'Built-in bilingual animated training lesson grounded in Daikin Guidelines for Using Generator Power & VRV-IV Training PPT.',
        interactionId: 'builtin-lesson-generator-elcb',
        parentVideoId: null,
        rootVideoId: 'vid_lesson_6',
        turnType: 'generate',
        turnNumber: 1,
        durationSeconds: 80,
        cumulativeDurationSeconds: 80,
        aspectRatio: '16:9',
        resolution: '1080p',
        streamUrl: '',
        courseId: 'course-9',
        moduleId: 'm901',
        isCourseTrailer: true,
        showInLibrary: true,
        published: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Curriculum',
        createdAt: new Date().toISOString(),
      },
    ] as AcademyVideoRecord[],
    videoMetadataPresets: [
      {
        id: 'preset-vrv-commissioning',
        name: 'VRV IV Testing & Commissioning (Master/Slave)',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          'True-RMS Clamp Meter (L1/L2/L3 Voltage & Amps)',
          'Digital Refrigerant Manifold Gauge Set (R-410A)',
          'Calibrated Electronic Refrigerant Charging Scale',
          'Digital Vacuum Micron Gauge (< 500 Microns)',
          '500V DC Insulation Resistance Tester (Megger)',
          'Calibrated Flare Torque Wrench (1/4" to 7/8")',
        ],
        safetyPrerequisites: [
          'Verify ELCB/RCCB breaker rating and trip sensitivity on Main, Master, and Slave outdoor units',
          'Lockout/Tagout (LOTO) main isolator before tightening power terminals or setting PCB dip switches',
          'Confirm L1/L2/L3 supply phase balance and voltage match unit nameplate before energization',
          'Wear safety goggles and refrigerant-rated insulated gloves during discharge/suction pressure logging',
        ],
        referenceManualId: 'res-25',
        builtIn: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Standards',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'preset-ahu-fahu-commissioning',
        name: 'AHU / FAHU Mechanical & Fan Isolator Start-Up',
        technicalSkillLevel: 'Level 3 — Senior Commissioning Engineer',
        requiredTools: [
          'Laser Belt & Pulley Alignment Tool',
          'Digital Clamp Meter (Supply & Return Fan Amps)',
          'Hex Key & Torque Wrench Set (Pulley Setscrews)',
          'Precision Spirit Level (Base & Drain Slope)',
          'Digital Differential Pressure Manometer',
          'Condensate Drain Pan Test Pitcher',
        ],
        safetyPrerequisites: [
          'Confirm power is isolated and LOTO applied before rotating supply/return fans freely by hand',
          'Verify hold-down shipping bolts are backed off on all spring-mounted fan vibration isolators',
          'Test electric heater high-limit safety cutout with supply fans off per AHU commissioning sheet',
          'Verify field-installed ELCB/RCCB protection and condensate trap water seal before full-load run',
        ],
        referenceManualId: 'res-26',
        builtIn: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Standards',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'preset-vrv-brazing-n2',
        name: 'VRV Refnet Brazing & 4.15 MPa Nitrogen Test',
        technicalSkillLevel: 'Level 2 — Field Technician',
        requiredTools: [
          'Oxy-Acetylene Brazing Torch with Flashback Arrestors',
          'Dual-Stage Dry Nitrogen Regulator (0–6.0 MPa)',
          'Low-Flow Nitrogen Purge Regulator (0.02 MPa)',
          'Calibrated 6.0 MPa Test Manifold & Hoses',
          'Non-Corrosive Leak Detection Bubble Solution',
          'Copper Tube Cutter, Reamer & Pipe Bender',
        ],
        safetyPrerequisites: [
          'Maintain continuous 0.02 MPa dry nitrogen sweep through copper lines during all brazing work',
          'Secure high-pressure nitrogen cylinder upright with safety chain; never substitute oxygen',
          'Pressurize stepwise to 4.15 MPa max with area cleared of unauthorized personnel',
          'Wear brazing shade-5 goggles, heat-resistant leather gloves, and keep ABC fire extinguisher on site',
        ],
        referenceManualId: 'res-1',
        builtIn: true,
        createdBy: 'usr_instructor_1',
        createdByName: 'Daikin Academy Standards',
        updatedAt: new Date().toISOString(),
      },
    ] as VideoMetadataPresetRecord[],
    videoAnalytics: {} as Record<string, VideoAnalyticsRecord>,
    learningPaths: [] as LearningPathRecord[],
    learningPathProgress: [] as LearningPathProgressRecord[],
  };

  function isLegacyBrokenVideoUrl(url?: string | null) {
    if (!url) return false;
    return (
      url.includes('youtube.com/embed/') ||
      url.includes('youtu.be/') ||
      url.includes('assets.mixkit.co')
    );
  }

  function sanitizeCourses(coursesList: any[]) {
    return (coursesList || []).map((course: any) => ({
      ...course,
      trailerUrl: isLegacyBrokenVideoUrl(course.trailerUrl) ? '' : (course.trailerUrl || ''),
      trailerVideoId: course.trailerVideoId || null,
      modules: Array.isArray(course.modules)
        ? course.modules.map((m: any) => ({
            ...m,
            videoId: m.videoId || null,
            videoUrl: isLegacyBrokenVideoUrl(m.videoUrl) ? '' : (m.videoUrl || ''),
          }))
        : [],
    }));
  }

  // Load or initialize DB
  function getDb() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        const existingResources = Array.isArray(parsed.resources) ? parsed.resources : [];
        const existingResourceIds = new Set(existingResources.map((r: any) => r.id));
        const mergedResources = [
          ...existingResources,
          ...initialDb.resources.filter((r) => !existingResourceIds.has(r.id)),
        ];
        const existingPresets = Array.isArray(parsed.videoMetadataPresets) ? parsed.videoMetadataPresets : [];
        const existingPresetIds = new Set(existingPresets.map((p: any) => p.id));
        const mergedPresets = [
          ...existingPresets,
          ...initialDb.videoMetadataPresets.filter((p) => !existingPresetIds.has(p.id)),
        ];
        const existingVideos = (Array.isArray(parsed.generatedVideos) ? parsed.generatedVideos : []).filter(
          (v: any) => typeof v?.id === 'string' && !v.id.startsWith('vid-lesson-')
        );
        const existingVideoIds = new Set(existingVideos.map((v: any) => v.id));
        const mergedVideos = [
          ...existingVideos,
          ...initialDb.generatedVideos.filter((v) => !existingVideoIds.has(v.id)),
        ];
        return {
          users: parsed.users || initialDb.users,
          courses: sanitizeCourses(parsed.courses || initialDb.courses),
          enrollments: parsed.enrollments || initialDb.enrollments,
          quizzes: parsed.quizzes || initialDb.quizzes,
          certificates: parsed.certificates || initialDb.certificates,
          resources: mergedResources,
          promoCodes: parsed.promoCodes || initialDb.promoCodes,
          modelLibrary: parsed.modelLibrary || initialDb.modelLibrary,
          reviews: parsed.reviews || initialDb.reviews,
          generatedVideos: mergedVideos,
          videoMetadataPresets: mergedPresets,
          videoAnalytics: parsed.videoAnalytics && typeof parsed.videoAnalytics === 'object' ? parsed.videoAnalytics : {},
          learningPaths: Array.isArray(parsed.learningPaths) ? parsed.learningPaths : [],
          learningPathProgress: Array.isArray(parsed.learningPathProgress) ? parsed.learningPathProgress : [],
        };
      }
    } catch (e) {
      console.error('Error reading db.json:', e);
    }
    const cleanInit = { ...initialDb, courses: sanitizeCourses(initialDb.courses) };
    saveDb(cleanInit);
    return cleanInit;
  }

  function saveDb(data: any) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing db.json:', e);
    }
  }

  getDb();

  // --- API Endpoints ---

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const db = getDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Try admin@daikin-hvac-academy.com, instructor@daikin-hvac-academy.com, or student@daikin-hvac-academy.com' });
    }

    res.json({
      success: true,
      user,
      token: signSessionToken(user)
    });
  });

  app.post('/api/auth/firebase-sync', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Firebase ID token is required.' });
    }
    if (!firebaseWebApiKey) {
      return res.status(500).json({ error: 'Firebase authentication is not configured on the server.' });
    }

    try {
      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      if (!lookupRes.ok) {
        return res.status(401).json({ error: 'Could not verify Google Sign-In token.' });
      }
      const lookupData: any = await lookupRes.json();
      const fbUser = lookupData?.users?.[0];
      if (!fbUser || !fbUser.email) {
        return res.status(401).json({ error: 'Invalid Firebase user session.' });
      }

      const db = getDb();
      const normalizedEmail = String(fbUser.email).toLowerCase();
      let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      const isOwnerAdmin = OWNER_ADMIN_EMAILS.has(normalizedEmail);

      if (!user) {
        user = {
          id: fbUser.localId || `usr_${Date.now()}`,
          name: fbUser.displayName || normalizedEmail.split('@')[0],
          email: fbUser.email,
          role: isOwnerAdmin ? 'admin' : 'student',
          subscriptionTier: isOwnerAdmin ? 'pro' : 'free',
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
        saveDb(db);
      } else if (isOwnerAdmin && user.role !== 'admin') {
        user.role = 'admin';
        user.subscriptionTier = 'pro';
        user.subscriptionStatus = 'active';
        saveDb(db);
      }

      res.json({
        success: true,
        user,
        token: signSessionToken(user),
      });
    } catch (err: any) {
      console.error('Firebase auth sync error:', err);
      res.status(500).json({ error: 'Failed to verify Firebase authentication.' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email } = req.body;
    if (!email || typeof email !== 'string' || !name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    const db = getDb();
    
    if (db.users.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'student',
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    res.json({
      success: true,
      user: newUser,
      token: signSessionToken(newUser)
    });
  });

  app.get('/api/courses', (req, res) => {
    const db = getDb();
    res.json(db.courses);
  });

  app.get('/api/courses/:id', (req, res) => {
    const db = getDb();
    const course = db.courses.find((c: any) => c.id === req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  });

  app.get('/api/courses/:id/reviews', (req, res) => {
    const db = getDb();
    const courseReviews = (db.reviews || []).filter((r: any) => r.courseId === req.params.id);
    const avgRating = courseReviews.length > 0 
      ? (courseReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / courseReviews.length).toFixed(1)
      : '5.0';
    res.json({ reviews: courseReviews, averageRating: Number(avgRating), totalReviews: courseReviews.length });
  });

  app.post('/api/courses/:id/reviews', (req, res) => {
    const { userId, userName, rating, comment } = req.body;
    const db = getDb();
    const newReview = {
      id: `rev-${Date.now()}`,
      courseId: req.params.id,
      userId: userId || 'usr_guest',
      userName: userName || 'Student Technician',
      rating: Number(rating) || 5,
      comment: comment || '',
      createdAt: new Date().toISOString()
    };
    db.reviews.push(newReview);
    saveDb(db);
    res.json({ success: true, review: newReview });
  });

  app.post('/api/admin/courses', requireAdmin, (req, res) => {
    const db = getDb();
    const newCourse = {
      id: `course-${Date.now()}`,
      ...req.body,
      published: true
    };
    db.courses.push(newCourse);
    saveDb(db);
    res.json({ success: true, course: newCourse });
  });

  app.put('/api/admin/courses/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.courses.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Course not found' });
    
    db.courses[idx] = { ...db.courses[idx], ...req.body };
    saveDb(db);
    res.json({ success: true, course: db.courses[idx] });
  });

  app.delete('/api/admin/courses/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.courses.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Course not found' });
    
    db.courses.splice(idx, 1);
    saveDb(db);
    res.json({ success: true, message: 'Course deleted successfully' });
  });

  app.get('/api/quizzes/:courseId', (req, res) => {
    const db = getDb();
    const quiz = db.quizzes.find((q: any) => q.courseId === req.params.courseId);
    if (!quiz) {
      return res.json({
        id: `quiz-default-${req.params.courseId}`,
        courseId: req.params.courseId,
        title: 'Final Knowledge Assessment',
        questions: [
          {
            id: 'dq1',
            question: 'What is the primary prerequisite before performing mechanical lifting or rigging of heavy HVAC equipment?',
            options: ['Starting the equipment immediately', 'Approved lifting plan, crane capacity check, and valid rigging permits', 'Only checking electrical voltage', 'Painting the unit exterior'],
            correctIndex: 1,
            explanation: 'Rigging requires approved lifting plans, crane load charts, qualified riggers, and safety permits.'
          },
          {
            id: 'dq2',
            question: 'Why is nitrogen purging mandatory during copper pipe brazing in HVAC systems?',
            options: ['To cool down the copper instantly', 'To prevent internal copper oxidation and scale formation', 'To increase refrigerant pressure', 'To test electrical continuity'],
            correctIndex: 1,
            explanation: 'Flowing dry nitrogen through pipes during brazing prevents copper oxide scale which can clog expansion valves.'
          }
        ]
      });
    }
    res.json(quiz);
  });

  app.post('/api/quizzes/submit', (req, res) => {
    const { userId, courseId, answers } = req.body;
    const db = getDb();
    
    const score = Math.floor(Math.random() * 20) + 80;
    const passed = score >= 75;

    let certificate = null;
    if (passed) {
      const course = db.courses.find((c: any) => c.id === courseId);
      certificate = {
        id: `cert-${Date.now()}`,
        userId,
        courseId,
        courseTitle: course ? course.title : 'HVAC Installation Masterclass',
        verificationNumber: `DAIKIN-CERT-${Math.floor(1000 + Math.random() * 9000)}`,
        issuedAt: new Date().toISOString(),
        disclaimer: 'Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd.'
      };
      db.certificates.push(certificate);
      saveDb(db);
    }

    res.json({
      success: true,
      score,
      passed,
      certificate
    });
  });

  app.get('/api/student/:userId', (req, res) => {
    const db = getDb();
    const userId = req.params.userId;
    const user = (db.users || []).find((u: any) => u.id === userId);
    const enrollments = (db.enrollments || []).filter((e: any) => e.userId === userId);
    const certificates = (db.certificates || []).filter((c: any) => c.userId === userId);
    const resources = db.resources || [];

    res.json({
      user,
      enrollments,
      certificates,
      resources
    });
  });

  app.post('/api/enroll', (req, res) => {
    const { userId, courseId } = req.body;
    const db = getDb();
    
    if (db.enrollments.some((e: any) => e.userId === userId && e.courseId === courseId)) {
      return res.json({ success: true, message: 'Already enrolled' });
    }

    const newEnrollment = {
      id: `enr-${Date.now()}`,
      userId,
      courseId,
      progress: 10,
      completedModules: [],
      enrolledAt: new Date().toISOString()
    };

    db.enrollments.push(newEnrollment);
    saveDb(db);
    res.json({ success: true, enrollment: newEnrollment });
  });

  app.get('/api/resources', (req, res) => {
    const db = getDb();
    res.json(db.resources);
  });

  app.get('/api/models', (req, res) => {
    const db = getDb();
    res.json(db.modelLibrary);
  });

  app.post('/api/admin/models', (req, res) => {
    const db = getDb();
    db.modelLibrary.push(req.body);
    saveDb(db);
    res.json({ success: true, modelLibrary: db.modelLibrary });
  });

  app.get('/api/admin/stats', (req, res) => {
    const db = getDb();
    res.json({
      totalUsers: db.users.length,
      activeSubscribers: db.users.filter((u: any) => u.subscriptionStatus === 'active').length,
      totalCourses: db.courses.length,
      certificatesIssued: db.certificates.length,
      monthlyRevenue: 14250.00,
      conversionRate: '14.8%',
      recentEnrollments: db.enrollments.length
    });
  });

  app.post('/api/create-checkout-session', async (req, res) => {
    const { tier, userId, successUrl, cancelUrl } = req.body;
    const amount = tier === 'pro' ? 2500 : 999;
    const tierName = tier === 'pro' ? 'Daikin Academy PRO Plan' : 'Daikin Academy Basic Plan';

    try {
      if (stripeSecretKey && !stripeSecretKey.includes('mock')) {
        const params = new URLSearchParams({
          'payment_method_types[0]': 'card',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': tierName,
          'line_items[0][price_data][unit_amount]': String(amount),
          'line_items[0][price_data][recurring][interval]': 'month',
          'line_items[0][quantity]': '1',
          mode: 'subscription',
          success_url: successUrl || 'http://localhost:3000/dashboard?payment=success',
          cancel_url: cancelUrl || 'http://localhost:3000/pricing?payment=cancelled',
        });
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const session: any = await stripeRes.json();
        if (!stripeRes.ok) {
          throw new Error(session?.error?.message || 'Stripe checkout session creation failed');
        }
        return res.json({ url: session.url });
      }

      res.json({
        url: `${req.headers.origin || 'http://localhost:3000'}/dashboard?payment=success&tier=${tier}`
      });
    } catch (err: any) {
      console.error('Stripe error:', err);
      res.status(500).json({ error: err.message || 'Payment initiation failed' });
    }
  });

  app.post('/api/subscription/upgrade', (req, res) => {
    const { userId, tier } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (user) {
      user.subscriptionTier = tier || 'pro';
      user.subscriptionStatus = 'active';
      saveDb(db);
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: 'User not found' });
  });

  app.post('/api/ai/maps-grounding', async (req, res) => {
    const { locationQuery } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        response: "Offline mode: Daikin authorized distributor and HVAC spare parts offices in Dubai/Middle East include Daikin Middle East & Africa FZE, Jebel Ali Free Zone, and authorized dealers across UAE."
      });
    }

    try {
      const gemini = getGeminiClient();
      const response = await gemini.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Find authorized Daikin HVAC distributors, installation service centers, or engineering offices near ${locationQuery || 'Dubai, UAE'}. Provide names, addresses, and installation support details.`,
        config: {
          tools: [{ googleMaps: {} }]
        }
      });
      res.json({ response: response.text || 'No location results found.' });
    } catch (err: any) {
      console.error('Maps grounding error:', err);
      res.status(500).json({ error: err.message || 'Maps grounding failed' });
    }
  });

  app.post('/api/ai/transcribe', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !audioBase64) {
      return res.json({
        transcript: "Sample transcribed audio: 'Verify nitrogen pressure test at 4.15 MPa for Daikin VRV outdoor units before charging refrigerant.'"
      });
    }

    try {
      const gemini = getGeminiClient();
      const response = await gemini.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64
            }
          },
          { text: 'Accurately transcribe this HVAC installation and technical voice note.' }
        ]
      });
      res.json({ transcript: response.text || 'Transcription complete.' });
    } catch (err: any) {
      console.error('Audio transcription error:', err);
      res.status(500).json({ error: err.message || 'Transcription failed' });
    }
  });

  // --- AI Teaching Video Studio (Gemini Omni 1.2 Flash via Interactions API) ---

  function validateReferenceImage(refImg: any): { mimeType: string; data: string } | null {
    if (!refImg) return null;
    if (typeof refImg !== 'object' || typeof refImg.data !== 'string' || typeof refImg.mimeType !== 'string') {
      throw new Error('Invalid reference image format.');
    }
    if (!ALLOWED_IMAGE_MIMES.has(refImg.mimeType)) {
      throw new Error('Unsupported reference image type. Please upload PNG, JPEG, or WebP.');
    }
    const cleanBase64 = refImg.data.replace(/^data:[^;]+;base64,/, '').trim();
    const byteLen = Buffer.byteLength(cleanBase64, 'base64');
    if (byteLen === 0 || byteLen > 8 * 1024 * 1024) {
      throw new Error('Reference image must be between 1 byte and 8 MB.');
    }
    return { mimeType: refImg.mimeType, data: cleanBase64 };
  }

  function safeVideoFilePath(videoId: string): string {
    if (!/^vid_[a-zA-Z0-9_-]+$/.test(videoId)) {
      throw new Error('Invalid video identifier.');
    }
    const resolved = path.resolve(VIDEOS_DIR, `${videoId}.mp4`);
    if (!resolved.startsWith(VIDEOS_DIR + path.sep)) {
      throw new Error('Invalid video file path.');
    }
    return resolved;
  }

  async function extractVideoBufferFromInteraction(interaction: any): Promise<Buffer> {
    let videoPart = interaction?.output_video || null;

    if (!videoPart && Array.isArray(interaction?.steps)) {
      for (let i = interaction.steps.length - 1; i >= 0; i--) {
        const step = interaction.steps[i];
        if (step?.type === 'model_output' && Array.isArray(step.content)) {
          const found = step.content.find((c: any) => c?.type === 'video' && (c.data || c.uri));
          if (found) {
            videoPart = found;
            break;
          }
        }
      }
    }

    if (!videoPart) {
      throw new Error('No video output was returned by gemini-omni-1.2-flash.');
    }

    if (videoPart.data) {
      return Buffer.from(videoPart.data, 'base64');
    }

    if (videoPart.uri && typeof videoPart.uri === 'string') {
      const parsedUrl = new URL(videoPart.uri);
      if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.googleapis.com')) {
        throw new Error('Refused to fetch video from unexpected host.');
      }
      const dlRes = await fetch(videoPart.uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
      });
      if (!dlRes.ok) {
        throw new Error(`Failed to download generated video (${dlRes.status}).`);
      }
      const arrBuf = await dlRes.arrayBuffer();
      return Buffer.from(arrBuf);
    }

    throw new Error('Generated video payload was empty.');
  }

  function formatGeminiVideoError(err: any): string {
    const raw = err?.message || String(err || 'Video generation failed.');
    if (raw.includes('402')) {
      return 'Billing / payment required (402). Gemini Omni video generation requires an API key linked to an active paid billing account in Settings > Secrets > GEMINI_API_KEY.';
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
      return 'Quota exceeded (429). Video generation with gemini-omni-1.2-flash requires a billing-enabled API key in Settings > Secrets.';
    }
    if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
      return 'API key unauthorized or invalid. Please check your billing-enabled GEMINI_API_KEY in Settings > Secrets.';
    }
    return raw;
  }

  function applyCourseVideoBinding(
    db: any,
    video: AcademyVideoRecord,
    courseId: string | null,
    moduleId: string | null,
    isCourseTrailer: boolean
  ) {
    if (!courseId) return;
    const course = db.courses.find((c: any) => c.id === courseId);
    if (!course) return;

    if (isCourseTrailer) {
      course.trailerVideoId = video.id;
      course.trailerUrl = video.streamUrl;
    }
    if (moduleId && Array.isArray(course.modules)) {
      const mod = course.modules.find((m: any) => m.id === moduleId);
      if (mod) {
        mod.videoId = video.id;
        mod.videoUrl = video.streamUrl;
      }
    }
  }

  function buildHvacVideoPrompt(rawPrompt: string, turnType: 'generate' | 'edit' | 'extend') {
    const cleaned = rawPrompt.trim();
    if (turnType === 'generate') {
      return `Professional industrial HVAC technical training demonstration video for engineering students. Realistic commercial mechanical workshop / plant room lighting, sharp focus on HVAC equipment, tools, gauges, and safe technician procedures. No watermarks or distorted text. Scene: ${cleaned}`;
    }
    return cleaned;
  }

  // List academy videos (published for students; all including drafts for Admins/Instructors)
  app.get('/api/videos', (req, res) => {
    const db = getDb();
    const session = verifySessionToken(req);
    const isStaff = session && (session.role === 'admin' || session.role === 'instructor');
    const allVideos: AcademyVideoRecord[] = db.generatedVideos || [];
    const filtered = isStaff ? allVideos : allVideos.filter((v) => v.published);
    res.json(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  // Stream generated MP4 with HTTP Range support and strict path confinement
  app.get('/api/videos/stream/:videoId', (req, res) => {
    try {
      const filePath = safeVideoFilePath(req.params.videoId);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Video file not found.' });
      }
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=3600',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid video stream request.' });
    }
  });

  // Generate new teaching video (Turn 1, store: true for multi-turn edit/extend)
  app.post('/api/ai/videos/generate', requireInstructorOrAdmin, async (req, res) => {
    try {
      const authUser = (req as any).authUser;
      const {
        prompt,
        title,
        description,
        category,
        level,
        technicalSkillLevel,
        requiredTools,
        safetyPrerequisites,
        referenceManualId = null,
        aspectRatio = '16:9',
        durationSeconds = 10,
        resolution = '720p',
        referenceImage,
        courseId = null,
        moduleId = null,
        isCourseTrailer = false,
        showInLibrary = true,
        published = true,
      } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.trim().length > 2000) {
        return res.status(400).json({ error: 'Please provide a descriptive HVAC procedure prompt (8–2000 characters).' });
      }
      if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
        return res.status(400).json({ error: 'Aspect ratio must be 16:9 or 9:16.' });
      }
      const durNum = Math.min(15, Math.max(3, Math.round(Number(durationSeconds) || 10)));
      const safeResolution = VALID_RESOLUTIONS.has(resolution) ? resolution : '720p';
      const validRefImg = validateReferenceImage(referenceImage);
      const safeSkillLevel =
        typeof technicalSkillLevel === 'string' && VALID_TECHNICAL_SKILL_LEVELS.has(technicalSkillLevel.trim())
          ? technicalSkillLevel.trim()
          : 'Level 2 — Field Technician';
      const safeTools = sanitizeStringList(requiredTools, 25, 120);
      const safeSafety = sanitizeStringList(safetyPrerequisites, 25, 160);
      const previewDb = getDb();
      const validManualIds = new Set((previewDb.resources || []).map((r: any) => r.id));
      const safeManualId =
        typeof referenceManualId === 'string' && validManualIds.has(referenceManualId.trim())
          ? referenceManualId.trim()
          : null;

      const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const job: VideoJobState = {
        id: jobId,
        status: 'queued',
        phase: 'Initializing Gemini Omni 1.2 Flash job...',
        turnType: 'generate',
        startedAt: Date.now(),
        createdBy: authUser.id,
      };
      videoJobs.set(jobId, job);

      // Run async generation worker so the HTTP request never hits proxy timeouts
      (async () => {
        try {
          job.status = 'generating';
          job.phase = validRefImg
            ? 'Animating reference photo/diagram with Gemini Omni 1.2 Flash...'
            : 'Rendering HVAC training video with Gemini Omni 1.2 Flash...';

          const gemini = getGeminiClient();
          const finalPrompt = buildHvacVideoPrompt(prompt, 'generate');
          const inputPayload: any = validRefImg
            ? [
                { type: 'image', mime_type: validRefImg.mimeType, data: validRefImg.data },
                { type: 'text', text: finalPrompt },
              ]
            : finalPrompt;

          const interaction: any = await (gemini.interactions as any).create(
            {
              model: 'gemini-omni-1.2-flash',
              input: inputPayload,
              background: false,
              store: true,
              stream: false,
              response_format: {
                type: 'video',
                aspect_ratio: aspectRatio,
                duration: `${durNum}s`,
                resolution: safeResolution,
              },
            },
            { timeout: 300000 }
          );

          job.status = 'saving';
          job.phase = 'Saving rendered MP4 & attaching to academy curriculum...';

          const videoBuffer = await extractVideoBufferFromInteraction(interaction);
          const videoId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const filePath = safeVideoFilePath(videoId);
          fs.writeFileSync(filePath, videoBuffer);

          const record: AcademyVideoRecord = {
            id: videoId,
            title: (typeof title === 'string' && title.trim()) ? title.trim().slice(0, 140) : prompt.trim().slice(0, 80),
            description: (typeof description === 'string' && description.trim()) ? description.trim().slice(0, 500) : prompt.trim(),
            category: (typeof category === 'string' && category.trim()) ? category.trim() : 'VRV / VRF Systems',
            level: (typeof level === 'string' && level.trim()) ? level.trim() : 'Intermediate',
            technicalSkillLevel: safeSkillLevel,
            requiredTools: safeTools,
            safetyPrerequisites: safeSafety,
            referenceManualId: safeManualId,
            metadataUpdatedAt: new Date().toISOString(),
            metadataUpdatedBy: authUser.name,
            prompt: prompt.trim(),
            interactionId: interaction.id,
            parentVideoId: null,
            rootVideoId: videoId,
            turnType: 'generate',
            turnNumber: 1,
            durationSeconds: durNum,
            cumulativeDurationSeconds: durNum,
            aspectRatio: aspectRatio as '16:9' | '9:16',
            resolution: safeResolution,
            streamUrl: `/api/videos/stream/${videoId}`,
            courseId: courseId || null,
            moduleId: moduleId || null,
            isCourseTrailer: Boolean(isCourseTrailer),
            showInLibrary: Boolean(showInLibrary),
            published: Boolean(published),
            createdBy: authUser.id,
            createdByName: authUser.name,
            createdAt: new Date().toISOString(),
          };

          const db = getDb();
          db.generatedVideos.push(record);
          if (record.published) {
            applyCourseVideoBinding(db, record, record.courseId, record.moduleId, record.isCourseTrailer);
          }
          saveDb(db);

          job.status = 'completed';
          job.phase = 'Video ready for playback';
          job.video = record;
        } catch (err: any) {
          console.error('Video generation job error:', err);
          job.status = 'failed';
          job.error = formatGeminiVideoError(err);
          job.phase = 'Generation failed';
        }
      })();

      res.json({ success: true, jobId });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid video generation request.' });
    }
  });

  // Extend an existing generated clip (Multi-turn via previous_interaction_id, up to 30s total)
  app.post('/api/ai/videos/extend', requireInstructorOrAdmin, async (req, res) => {
    try {
      const authUser = (req as any).authUser;
      const {
        sourceVideoId,
        prompt,
        durationSeconds = 8,
        referenceImage,
        title,
        description,
      } = req.body;

      if (!sourceVideoId || typeof sourceVideoId !== 'string') {
        return res.status(400).json({ error: 'Source video ID is required to extend a clip.' });
      }
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 2000) {
        return res.status(400).json({ error: 'Please describe how the lesson scene should continue (5–2000 characters).' });
      }

      const db = getDb();
      const sourceVideo: AcademyVideoRecord | undefined = db.generatedVideos.find((v: AcademyVideoRecord) => v.id === sourceVideoId);
      if (!sourceVideo) {
        return res.status(404).json({ error: 'Source video not found.' });
      }
      if (!sourceVideo.interactionId) {
        return res.status(400).json({ error: 'This video does not have a stored interaction history for extension.' });
      }
      const remainingBudget = Math.max(0, 30 - (sourceVideo.cumulativeDurationSeconds || sourceVideo.durationSeconds));
      if (remainingBudget < 3) {
        return res.status(400).json({ error: 'This clip has already reached the 30-second maximum continuous extension length.' });
      }

      const durNum = Math.min(10, Math.min(remainingBudget, Math.max(3, Math.round(Number(durationSeconds) || 8))));
      const validRefImg = validateReferenceImage(referenceImage);

      const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const job: VideoJobState = {
        id: jobId,
        status: 'queued',
        phase: 'Preparing clip extension with Gemini Omni 1.2 Flash...',
        turnType: 'extend',
        startedAt: Date.now(),
        createdBy: authUser.id,
      };
      videoJobs.set(jobId, job);

      (async () => {
        try {
          job.status = 'generating';
          job.phase = `Extending training clip (+${durNum}s continuation)...`;

          const gemini = getGeminiClient();
          const extendPrompt = `Continue the scene seamlessly for the next HVAC training step: ${prompt.trim()}`;
          const inputPayload: any = validRefImg
            ? [
                { type: 'image', mime_type: validRefImg.mimeType, data: validRefImg.data },
                { type: 'text', text: extendPrompt },
              ]
            : extendPrompt;

          const interaction: any = await (gemini.interactions as any).create(
            {
              model: 'gemini-omni-1.2-flash',
              previous_interaction_id: sourceVideo.interactionId,
              input: inputPayload,
              background: false,
              store: true,
              stream: false,
              response_format: {
                type: 'video',
                duration: `${durNum}s`,
              },
            },
            { timeout: 300000 }
          );

          job.status = 'saving';
          job.phase = 'Saving extended training clip...';

          const videoBuffer = await extractVideoBufferFromInteraction(interaction);
          const videoId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const filePath = safeVideoFilePath(videoId);
          fs.writeFileSync(filePath, videoBuffer);

          const newCumulative = Math.min(30, (sourceVideo.cumulativeDurationSeconds || sourceVideo.durationSeconds) + durNum);
          const record: AcademyVideoRecord = {
            id: videoId,
            title: (typeof title === 'string' && title.trim()) ? title.trim().slice(0, 140) : sourceVideo.title,
            description: (typeof description === 'string' && description.trim()) ? description.trim().slice(0, 500) : sourceVideo.description,
            category: sourceVideo.category,
            level: sourceVideo.level,
            technicalSkillLevel: sourceVideo.technicalSkillLevel || 'Level 2 — Field Technician',
            requiredTools: Array.isArray(sourceVideo.requiredTools) ? [...sourceVideo.requiredTools] : [],
            safetyPrerequisites: Array.isArray(sourceVideo.safetyPrerequisites) ? [...sourceVideo.safetyPrerequisites] : [],
            referenceManualId: sourceVideo.referenceManualId || null,
            prompt: prompt.trim(),
            interactionId: interaction.id,
            parentVideoId: sourceVideo.id,
            rootVideoId: sourceVideo.rootVideoId || sourceVideo.id,
            turnType: 'extend',
            turnNumber: (sourceVideo.turnNumber || 1) + 1,
            durationSeconds: durNum,
            cumulativeDurationSeconds: newCumulative,
            aspectRatio: sourceVideo.aspectRatio,
            resolution: sourceVideo.resolution,
            streamUrl: `/api/videos/stream/${videoId}`,
            courseId: sourceVideo.courseId,
            moduleId: sourceVideo.moduleId,
            isCourseTrailer: sourceVideo.isCourseTrailer,
            showInLibrary: sourceVideo.showInLibrary,
            published: sourceVideo.published,
            createdBy: authUser.id,
            createdByName: authUser.name,
            createdAt: new Date().toISOString(),
          };

          const latestDb = getDb();
          latestDb.generatedVideos.push(record);
          if (record.published && record.courseId) {
            applyCourseVideoBinding(latestDb, record, record.courseId, record.moduleId, record.isCourseTrailer);
          }
          saveDb(latestDb);

          job.status = 'completed';
          job.phase = 'Extended video ready';
          job.video = record;
        } catch (err: any) {
          console.error('Video extend job error:', err);
          job.status = 'failed';
          job.error = formatGeminiVideoError(err);
          job.phase = 'Extension failed';
        }
      })();

      res.json({ success: true, jobId });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid video extension request.' });
    }
  });

  // Edit an existing generated clip (Multi-turn via previous_interaction_id)
  app.post('/api/ai/videos/edit', requireInstructorOrAdmin, async (req, res) => {
    try {
      const authUser = (req as any).authUser;
      const {
        sourceVideoId,
        prompt,
        referenceImage,
        title,
        description,
      } = req.body;

      if (!sourceVideoId || typeof sourceVideoId !== 'string') {
        return res.status(400).json({ error: 'Source video ID is required to edit a clip.' });
      }
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 2000) {
        return res.status(400).json({ error: 'Please provide an editing instruction (5–2000 characters).' });
      }

      const db = getDb();
      const sourceVideo: AcademyVideoRecord | undefined = db.generatedVideos.find((v: AcademyVideoRecord) => v.id === sourceVideoId);
      if (!sourceVideo) {
        return res.status(404).json({ error: 'Source video not found.' });
      }
      if (!sourceVideo.interactionId) {
        return res.status(400).json({ error: 'This video does not have a stored interaction history for editing.' });
      }

      const validRefImg = validateReferenceImage(referenceImage);
      const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const job: VideoJobState = {
        id: jobId,
        status: 'queued',
        phase: 'Preparing clip edit with Gemini Omni 1.2 Flash...',
        turnType: 'edit',
        startedAt: Date.now(),
        createdBy: authUser.id,
      };
      videoJobs.set(jobId, job);

      (async () => {
        try {
          job.status = 'generating';
          job.phase = 'Applying multi-turn edit with Gemini Omni 1.2 Flash...';

          const gemini = getGeminiClient();
          const inputPayload: any = validRefImg
            ? [
                { type: 'image', mime_type: validRefImg.mimeType, data: validRefImg.data },
                { type: 'text', text: prompt.trim() },
              ]
            : prompt.trim();

          const interaction: any = await (gemini.interactions as any).create(
            {
              model: 'gemini-omni-1.2-flash',
              previous_interaction_id: sourceVideo.interactionId,
              input: inputPayload,
              background: false,
              store: true,
              stream: false,
              response_format: {
                type: 'video',
              },
            },
            { timeout: 300000 }
          );

          job.status = 'saving';
          job.phase = 'Saving edited clip revision...';

          const videoBuffer = await extractVideoBufferFromInteraction(interaction);
          const videoId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const filePath = safeVideoFilePath(videoId);
          fs.writeFileSync(filePath, videoBuffer);

          const record: AcademyVideoRecord = {
            id: videoId,
            title: (typeof title === 'string' && title.trim()) ? title.trim().slice(0, 140) : sourceVideo.title,
            description: (typeof description === 'string' && description.trim()) ? description.trim().slice(0, 500) : sourceVideo.description,
            category: sourceVideo.category,
            level: sourceVideo.level,
            technicalSkillLevel: sourceVideo.technicalSkillLevel || 'Level 2 — Field Technician',
            requiredTools: Array.isArray(sourceVideo.requiredTools) ? [...sourceVideo.requiredTools] : [],
            safetyPrerequisites: Array.isArray(sourceVideo.safetyPrerequisites) ? [...sourceVideo.safetyPrerequisites] : [],
            referenceManualId: sourceVideo.referenceManualId || null,
            prompt: prompt.trim(),
            interactionId: interaction.id,
            parentVideoId: sourceVideo.id,
            rootVideoId: sourceVideo.rootVideoId || sourceVideo.id,
            turnType: 'edit',
            turnNumber: (sourceVideo.turnNumber || 1) + 1,
            durationSeconds: sourceVideo.durationSeconds,
            cumulativeDurationSeconds: sourceVideo.cumulativeDurationSeconds || sourceVideo.durationSeconds,
            aspectRatio: sourceVideo.aspectRatio,
            resolution: sourceVideo.resolution,
            streamUrl: `/api/videos/stream/${videoId}`,
            courseId: sourceVideo.courseId,
            moduleId: sourceVideo.moduleId,
            isCourseTrailer: sourceVideo.isCourseTrailer,
            showInLibrary: sourceVideo.showInLibrary,
            published: sourceVideo.published,
            createdBy: authUser.id,
            createdByName: authUser.name,
            createdAt: new Date().toISOString(),
          };

          const latestDb = getDb();
          latestDb.generatedVideos.push(record);
          if (record.published && record.courseId) {
            applyCourseVideoBinding(latestDb, record, record.courseId, record.moduleId, record.isCourseTrailer);
          }
          saveDb(latestDb);

          job.status = 'completed';
          job.phase = 'Edited video ready';
          job.video = record;
        } catch (err: any) {
          console.error('Video edit job error:', err);
          job.status = 'failed';
          job.error = formatGeminiVideoError(err);
          job.phase = 'Edit failed';
        }
      })();

      res.json({ success: true, jobId });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid video edit request.' });
    }
  });

  // Poll video job status
  app.get('/api/ai/videos/jobs/:jobId', requireInstructorOrAdmin, (req, res) => {
    const job = videoJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Video generation job not found or expired.' });
    }
    res.json({
      id: job.id,
      status: job.status,
      phase: job.phase,
      turnType: job.turnType,
      elapsedSeconds: Math.floor((Date.now() - job.startedAt) / 1000),
      video: job.video || null,
      error: job.error || null,
    });
  });

  // Publish / Attach a generated video to a Course, Module, and/or Video Library
  app.post('/api/videos/:videoId/attach', requireInstructorOrAdmin, (req, res) => {
    const { videoId } = req.params;
    const {
      title,
      description,
      category,
      level,
      courseId = null,
      moduleId = null,
      isCourseTrailer = false,
      showInLibrary = true,
      published = true,
    } = req.body;

    const db = getDb();
    const video: AcademyVideoRecord | undefined = db.generatedVideos.find((v: AcademyVideoRecord) => v.id === videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (typeof title === 'string' && title.trim()) video.title = title.trim().slice(0, 140);
    if (typeof description === 'string' && description.trim()) video.description = description.trim().slice(0, 500);
    if (typeof category === 'string' && category.trim()) video.category = category.trim();
    if (typeof level === 'string' && level.trim()) video.level = level.trim();
    video.courseId = courseId || null;
    video.moduleId = moduleId || null;
    video.isCourseTrailer = Boolean(isCourseTrailer);
    video.showInLibrary = Boolean(showInLibrary);
    video.published = Boolean(published);

    // Clear any prior course/module references to this video before re-binding
    for (const c of db.courses) {
      if (c.trailerVideoId === videoId) {
        c.trailerVideoId = null;
        c.trailerUrl = '';
      }
      if (Array.isArray(c.modules)) {
        for (const m of c.modules) {
          if (m.videoId === videoId) {
            m.videoId = null;
            m.videoUrl = '';
          }
        }
      }
    }

    if (video.published && video.courseId) {
      applyCourseVideoBinding(db, video, video.courseId, video.moduleId, video.isCourseTrailer);
    }

    saveDb(db);
    res.json({ success: true, video, courses: db.courses });
  });

  function sanitizeStringList(input: unknown, maxItems: number, maxLen: number): string[] {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of input) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim().slice(0, maxLen);
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= maxItems) break;
    }
    return out;
  }

  // Update technical metadata (Technical Skill Level, Required Tools List, Safety Prerequisites) on an AI-generated video
  const handleUpdateVideoMetadata = (req: express.Request, res: express.Response) => {
    const authUser = (req as any).authUser;
    const { videoId } = req.params;
    const {
      technicalSkillLevel,
      requiredTools,
      safetyPrerequisites,
      referenceManualId,
      title,
      description,
      category,
      level,
    } = req.body || {};

    const db = getDb();
    const video: AcademyVideoRecord | undefined = (db.generatedVideos || []).find(
      (v: AcademyVideoRecord) => v.id === videoId
    );
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (technicalSkillLevel !== undefined) {
      if (typeof technicalSkillLevel !== 'string' || !VALID_TECHNICAL_SKILL_LEVELS.has(technicalSkillLevel.trim())) {
        return res.status(400).json({ error: 'Invalid Technical Skill Level selected.' });
      }
      video.technicalSkillLevel = technicalSkillLevel.trim();
    }

    if (requiredTools !== undefined) {
      if (!Array.isArray(requiredTools)) {
        return res.status(400).json({ error: 'Required Tools List must be a list of tool entries.' });
      }
      video.requiredTools = sanitizeStringList(requiredTools, 25, 120);
    }

    if (safetyPrerequisites !== undefined) {
      if (!Array.isArray(safetyPrerequisites)) {
        return res.status(400).json({ error: 'Safety Prerequisites must be a list of safety items.' });
      }
      video.safetyPrerequisites = sanitizeStringList(safetyPrerequisites, 25, 160);
    }

    if (referenceManualId !== undefined) {
      if (referenceManualId === null || referenceManualId === '') {
        video.referenceManualId = null;
      } else if (typeof referenceManualId === 'string') {
        const validManual = (db.resources || []).some((r: any) => r.id === referenceManualId.trim());
        if (!validManual) {
          return res.status(400).json({ error: 'Selected reference commissioning manual was not found.' });
        }
        video.referenceManualId = referenceManualId.trim();
      } else {
        return res.status(400).json({ error: 'Invalid reference manual ID.' });
      }
    }

    if (typeof title === 'string' && title.trim()) video.title = title.trim().slice(0, 140);
    if (typeof description === 'string' && description.trim()) video.description = description.trim().slice(0, 500);
    if (typeof category === 'string' && category.trim()) video.category = category.trim().slice(0, 100);
    if (typeof level === 'string' && level.trim()) video.level = level.trim().slice(0, 60);

    video.metadataUpdatedAt = new Date().toISOString();
    video.metadataUpdatedBy = authUser?.name || 'Instructor';

    saveDb(db);
    res.json({ success: true, video });
  };

  app.patch('/api/videos/:videoId/metadata', requireInstructorOrAdmin, handleUpdateVideoMetadata);
  app.put('/api/videos/:videoId/metadata', requireInstructorOrAdmin, handleUpdateVideoMetadata);

  // Reusable Video Technical Metadata Presets (so instructors can author & save templates in Video Studio)
  app.get('/api/video-metadata-presets', (_req, res) => {
    const db = getDb();
    res.json(db.videoMetadataPresets || []);
  });

  app.post('/api/video-metadata-presets', requireInstructorOrAdmin, (req, res) => {
    const authUser = (req as any).authUser;
    const {
      name,
      technicalSkillLevel,
      requiredTools = [],
      safetyPrerequisites = [],
      referenceManualId = null,
    } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Preset name must be 3–100 characters.' });
    }
    if (typeof technicalSkillLevel !== 'string' || !VALID_TECHNICAL_SKILL_LEVELS.has(technicalSkillLevel.trim())) {
      return res.status(400).json({ error: 'Please select a valid Technical Skill Level.' });
    }
    const safeTools = sanitizeStringList(requiredTools, 25, 120);
    const safeSafety = sanitizeStringList(safetyPrerequisites, 25, 160);
    if (safeTools.length === 0 && safeSafety.length === 0) {
      return res.status(400).json({ error: 'Add at least one required tool or safety prerequisite.' });
    }

    const db = getDb();
    let safeManualId: string | null = null;
    if (typeof referenceManualId === 'string' && referenceManualId.trim()) {
      const exists = (db.resources || []).some((r: any) => r.id === referenceManualId.trim());
      if (!exists) {
        return res.status(400).json({ error: 'Referenced manual ID does not exist.' });
      }
      safeManualId = referenceManualId.trim();
    }

    const preset: VideoMetadataPresetRecord = {
      id: `vmp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      technicalSkillLevel: technicalSkillLevel.trim(),
      requiredTools: safeTools,
      safetyPrerequisites: safeSafety,
      referenceManualId: safeManualId,
      builtIn: false,
      createdBy: authUser.id,
      createdByName: authUser.name,
      updatedAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.videoMetadataPresets)) db.videoMetadataPresets = [];
    db.videoMetadataPresets.unshift(preset);
    saveDb(db);
    res.json({ success: true, preset });
  });

  app.delete('/api/video-metadata-presets/:presetId', requireInstructorOrAdmin, (req, res) => {
    const { presetId } = req.params;
    const db = getDb();
    const presets: VideoMetadataPresetRecord[] = db.videoMetadataPresets || [];
    const idx = presets.findIndex((p) => p.id === presetId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Metadata preset not found.' });
    }
    if (presets[idx].builtIn) {
      return res.status(400).json({ error: 'Built-in Daikin standard templates cannot be deleted.' });
    }
    presets.splice(idx, 1);
    db.videoMetadataPresets = presets;
    saveDb(db);
    res.json({ success: true });
  });

  // Delete a generated video and detach any course/module references
  app.delete('/api/videos/:videoId', requireInstructorOrAdmin, (req, res) => {
    try {
      const { videoId } = req.params;
      const db = getDb();
      const idx = db.generatedVideos.findIndex((v: AcademyVideoRecord) => v.id === videoId);
      if (idx === -1) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      db.generatedVideos.splice(idx, 1);
      if (db.videoAnalytics && db.videoAnalytics[videoId]) {
        delete db.videoAnalytics[videoId];
      }

      // Clear any course/module references pointing to this video
      for (const course of db.courses) {
        if (course.trailerVideoId === videoId) {
          course.trailerVideoId = null;
          course.trailerUrl = '';
        }
        if (Array.isArray(course.modules)) {
          for (const mod of course.modules) {
            if (mod.videoId === videoId) {
              mod.videoId = null;
              mod.videoUrl = '';
            }
          }
        }
      }

      // Prune deleted video from all Learning Paths and progress records
      if (Array.isArray(db.learningPaths)) {
        for (const lp of db.learningPaths) {
          if (Array.isArray(lp.videoIds)) {
            lp.videoIds = lp.videoIds.filter((id: string) => id !== videoId);
          }
        }
      }
      if (Array.isArray(db.learningPathProgress)) {
        for (const prog of db.learningPathProgress) {
          if (Array.isArray(prog.completedVideoIds)) {
            prog.completedVideoIds = prog.completedVideoIds.filter((id: string) => id !== videoId);
          }
          if (prog.lastVideoId === videoId) {
            prog.lastVideoId = null;
          }
        }
      }

      saveDb(db);

      const filePath = safeVideoFilePath(videoId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'Video removed from academy.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete video.' });
    }
  });

  // Check Gemini Video configuration status
  app.get('/api/ai/videos/status', (_req, res) => {
    res.json({
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
      model: 'gemini-omni-1.2-flash',
    });
  });

  // Batch-generate the 5 core Daikin HVAC Masterclass teaching videos via Gemini Omni 1.2 Flash
  app.post('/api/ai/videos/generate-starter-pack', requireInstructorOrAdmin, async (req, res) => {
    try {
      const authUser = (req as any).authUser;
      const gemini = getGeminiClient(); // Validates GEMINI_API_KEY upfront
      const db = getDb();

      const starterSpecs = [
        {
          slotId: 'mc-chiller-rigging',
          title: 'Chiller Rigging & Anti-Vibration Spring Isolator Placement',
          description: 'Step-by-step masterclass on crane rigging, spreader bar load distribution, and seismic spring isolator leveling for EWAD-TZ chillers.',
          category: 'Air-Cooled Chillers',
          level: 'Advanced',
          courseId: 'course-1',
          moduleId: 'm4',
          isCourseTrailer: true,
          prompt: 'Industrial crane slowly lowering a commercial air-cooled screw chiller onto heavy-duty seismic spring vibration isolators on a rooftop concrete plinth, HVAC rigging engineers using spreader bars and checking base frame level with a precision spirit level.',
        },
        {
          slotId: 'mc-vrv-nitrogen',
          title: 'VRV Nitrogen Pressure Testing at 4.15 MPa (601 psi)',
          description: 'Detailed 24-hour hold test procedure, regulator setup, and safety protocols for multi-port refnet piping.',
          category: 'VRV / VRF Systems',
          level: 'Intermediate',
          courseId: 'course-3',
          moduleId: 'm303',
          isCourseTrailer: true,
          prompt: 'Close-up of a commercial HVAC technician connecting a high-pressure nitrogen cylinder regulator and digital manifold gauge to copper VRV outdoor unit service ports, slowly pressurizing the refrigerant piping circuit to 4.15 MPa and inspecting brazed refnet joints with leak detection solution.',
        },
        {
          slotId: 'mc-copper-brazing',
          title: 'Copper Pipe Brazing with Nitrogen Purging & Flow Control',
          description: 'Preventing internal copper oxidation and scale formation using regulated dry nitrogen sweep during refnet joint brazing.',
          category: 'VRV / VRF Systems',
          level: 'Beginner',
          courseId: 'course-3',
          moduleId: 'm302',
          isCourseTrailer: false,
          prompt: 'HVAC technician in safety goggles and heat-resistant gloves brazing a copper refnet Y-branch joint using an oxy-acetylene torch while low-pressure dry nitrogen purges continuously through the pipe to prevent internal copper oxide scaling.',
        },
        {
          slotId: 'mc-pump-alignment',
          title: 'Chilled Water Pump Alignment & Hydraulic Balancing',
          description: 'Laser dial gauge shaft alignment, differential pressure bypass calibration, and motorized balancing valve verification.',
          category: 'Chilled Water System Installation',
          level: 'Advanced',
          courseId: 'course-10',
          moduleId: 'm1001',
          isCourseTrailer: true,
          prompt: 'Mechanical commissioning engineer inside a commercial chilled water plant room performing laser shaft alignment on a base-mounted end-suction centrifugal pump and inspecting differential pressure gauges across a balancing valve.',
        },
        {
          slotId: 'mc-inverter-diag',
          title: 'Inverter Compressor Diagnostics & PCB Troubleshooting',
          description: 'Diagnosing inverter compressor IPM faults, error codes, and electronic expansion valve (EEV) coil operation.',
          category: 'HVAC Controls and BMS Interfaces',
          level: 'Advanced',
          courseId: 'course-9',
          moduleId: 'm902',
          isCourseTrailer: true,
          prompt: 'HVAC service engineer inside a commercial outdoor VRV electrical compartment measuring DC bus voltage on an inverter PCB with a calibrated digital multimeter and inspecting the electronic expansion valve coil seating.',
        },
      ];

      const existingTitles = new Set(
        (db.generatedVideos || []).map((v: AcademyVideoRecord) => v.title.toLowerCase())
      );
      const pendingSpecs = starterSpecs.filter((s) => !existingTitles.has(s.title.toLowerCase()));

      if (pendingSpecs.length === 0) {
        return res.json({
          success: true,
          alreadyComplete: true,
          jobs: [],
          message: 'All 5 core Daikin HVAC masterclasses are already produced.',
        });
      }

      const queuedJobs: Array<{ jobId: string; slotId: string; title: string }> = [];

      for (const spec of pendingSpecs) {
        const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const job: VideoJobState = {
          id: jobId,
          status: 'queued',
          phase: `Queued: ${spec.title}`,
          turnType: 'generate',
          startedAt: Date.now(),
          createdBy: authUser.id,
        };
        videoJobs.set(jobId, job);
        queuedJobs.push({ jobId, slotId: spec.slotId, title: spec.title });
      }

      // Process sequentially in the background to avoid API burst limits
      (async () => {
        for (let i = 0; i < pendingSpecs.length; i++) {
          const spec = pendingSpecs[i];
          const jobRef = queuedJobs[i];
          const job = videoJobs.get(jobRef.jobId);
          if (!job) continue;

          try {
            job.status = 'generating';
            job.phase = `Rendering (${i + 1}/${pendingSpecs.length}): ${spec.title}`;

            const finalPrompt = buildHvacVideoPrompt(spec.prompt, 'generate');
            const interaction: any = await (gemini.interactions as any).create(
              {
                model: 'gemini-omni-1.2-flash',
                input: finalPrompt,
                background: false,
                store: true,
                stream: false,
                response_format: {
                  type: 'video',
                  aspect_ratio: '16:9',
                  duration: '10s',
                  resolution: '720p',
                },
              },
              { timeout: 300000 }
            );

            job.status = 'saving';
            job.phase = `Saving MP4 & attaching to ${spec.category}...`;

            const videoBuffer = await extractVideoBufferFromInteraction(interaction);
            const videoId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            const filePath = safeVideoFilePath(videoId);
            fs.writeFileSync(filePath, videoBuffer);

            const record: AcademyVideoRecord = {
              id: videoId,
              title: spec.title,
              description: spec.description,
              category: spec.category,
              level: spec.level,
              prompt: spec.prompt,
              interactionId: interaction.id,
              parentVideoId: null,
              rootVideoId: videoId,
              turnType: 'generate',
              turnNumber: 1,
              durationSeconds: 10,
              cumulativeDurationSeconds: 10,
              aspectRatio: '16:9',
              resolution: '720p',
              streamUrl: `/api/videos/stream/${videoId}`,
              courseId: spec.courseId,
              moduleId: spec.moduleId,
              isCourseTrailer: spec.isCourseTrailer,
              showInLibrary: true,
              published: true,
              createdBy: authUser.id,
              createdByName: authUser.name,
              createdAt: new Date().toISOString(),
            };

            const latestDb = getDb();
            latestDb.generatedVideos.push(record);
            applyCourseVideoBinding(latestDb, record, record.courseId, record.moduleId, record.isCourseTrailer);
            saveDb(latestDb);

            job.status = 'completed';
            job.phase = 'Video ready & published';
            job.video = record;
          } catch (err: any) {
            console.error(`Starter pack video error (${spec.title}):`, err);
            job.status = 'failed';
            job.error = formatGeminiVideoError(err);
            job.phase = 'Generation failed';
          }
        }
      })();

      res.json({ success: true, jobs: queuedJobs });
    } catch (err: any) {
      res.status(400).json({ error: formatGeminiVideoError(err) });
    }
  });

  // Record real playback telemetry (views, timeline segment watches, re-watch seeks, completions)
  app.post('/api/videos/:videoId/telemetry', (req, res) => {
    const { videoId } = req.params;
    const {
      eventType,
      bucketIndex,
      maxPercent,
      watchSecondsDelta,
      userId,
      userName,
    } = req.body || {};

    if (!/^vid_[a-zA-Z0-9_-]+$/.test(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID.' });
    }
    if (!['view', 'progress', 'rewatch', 'complete'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid telemetry event type.' });
    }

    const db = getDb();
    const videoExists = (db.generatedVideos || []).some((v: AcademyVideoRecord) => v.id === videoId);
    if (!videoExists) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (!db.videoAnalytics || typeof db.videoAnalytics !== 'object') {
      db.videoAnalytics = {};
    }

    const existing: VideoAnalyticsRecord = db.videoAnalytics[videoId] || {
      videoId,
      totalViews: 0,
      uniqueViewers: [],
      completions: 0,
      totalWatchSeconds: 0,
      segmentWatches: Array(10).fill(0),
      segmentRewatches: Array(10).fill(0),
      recentSessions: [],
      updatedAt: new Date().toISOString(),
    };

    if (!Array.isArray(existing.segmentWatches) || existing.segmentWatches.length !== 10) {
      existing.segmentWatches = Array(10).fill(0);
    }
    if (!Array.isArray(existing.segmentRewatches) || existing.segmentRewatches.length !== 10) {
      existing.segmentRewatches = Array(10).fill(0);
    }
    if (!Array.isArray(existing.uniqueViewers)) {
      existing.uniqueViewers = [];
    }
    if (!Array.isArray(existing.recentSessions)) {
      existing.recentSessions = [];
    }

    const viewerId = typeof userId === 'string' && userId.trim() ? userId.trim().slice(0, 80) : 'usr_guest';
    const viewerName = typeof userName === 'string' && userName.trim() ? userName.trim().slice(0, 100) : 'Academy Student';

    if (!existing.uniqueViewers.includes(viewerId)) {
      existing.uniqueViewers.push(viewerId);
    }

    let session = existing.recentSessions.find((s) => s.userId === viewerId);
    if (!session) {
      session = {
        userId: viewerId,
        userName: viewerName,
        maxPercentReached: 0,
        completed: false,
        rewatchCount: 0,
        lastWatchedAt: new Date().toISOString(),
      };
      existing.recentSessions.unshift(session);
    } else {
      session.userName = viewerName;
      session.lastWatchedAt = new Date().toISOString();
    }

    const safeBucket =
      typeof bucketIndex === 'number' && Number.isFinite(bucketIndex)
        ? Math.min(9, Math.max(0, Math.floor(bucketIndex)))
        : null;

    const safeMaxPct =
      typeof maxPercent === 'number' && Number.isFinite(maxPercent)
        ? Math.min(100, Math.max(0, Math.round(maxPercent)))
        : null;

    const safeDelta =
      typeof watchSecondsDelta === 'number' && Number.isFinite(watchSecondsDelta)
        ? Math.min(30, Math.max(0, watchSecondsDelta))
        : 0;

    if (eventType === 'view') {
      existing.totalViews += 1;
    } else if (eventType === 'progress') {
      if (safeBucket !== null) {
        existing.segmentWatches[safeBucket] += 1;
      }
      existing.totalWatchSeconds = Math.round((existing.totalWatchSeconds + safeDelta) * 10) / 10;
    } else if (eventType === 'rewatch') {
      if (safeBucket !== null) {
        existing.segmentRewatches[safeBucket] += 1;
        existing.segmentWatches[safeBucket] += 1;
      }
      session.rewatchCount += 1;
    } else if (eventType === 'complete') {
      existing.completions += 1;
      session.completed = true;
      session.maxPercentReached = 100;
    }

    if (safeMaxPct !== null && safeMaxPct > session.maxPercentReached) {
      session.maxPercentReached = safeMaxPct;
    }

    existing.recentSessions = existing.recentSessions
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
      .slice(0, 15);
    existing.updatedAt = new Date().toISOString();

    db.videoAnalytics[videoId] = existing;
    saveDb(db);

    res.json({ success: true });
  });

  // Instructor & Admin Video Analytics Dashboard aggregation
  app.get('/api/instructor/video-analytics', requireInstructorOrAdmin, (_req, res) => {
    const db = getDb();
    const videos: AcademyVideoRecord[] = db.generatedVideos || [];
    const analyticsMap: Record<string, VideoAnalyticsRecord> = db.videoAnalytics || {};

    const perVideo = videos.map((video) => {
      const record = analyticsMap[video.id];
      const totalViews = record?.totalViews || 0;
      const completions = record?.completions || 0;
      const totalDuration = video.cumulativeDurationSeconds || video.durationSeconds || 10;
      const segWatches = Array.isArray(record?.segmentWatches) && record.segmentWatches.length === 10
        ? record.segmentWatches
        : Array(10).fill(0);
      const segRewatches = Array.isArray(record?.segmentRewatches) && record.segmentRewatches.length === 10
        ? record.segmentRewatches
        : Array(10).fill(0);

      const totalRewatches = segRewatches.reduce((acc, n) => acc + n, 0);
      const maxHeatmapVal = Math.max(1, ...segRewatches.map((r, i) => r * 2 + (segWatches[i] > 0 ? 1 : 0)));

      let peakRewatchBucket = -1;
      let peakRewatchCount = 0;
      segRewatches.forEach((count, idx) => {
        if (count > peakRewatchCount) {
          peakRewatchCount = count;
          peakRewatchBucket = idx;
        }
      });

      const heatmap = Array.from({ length: 10 }, (_, idx) => {
        const startSec = Number(((idx / 10) * totalDuration).toFixed(1));
        const endSec = Number((((idx + 1) / 10) * totalDuration).toFixed(1));
        const watches = segWatches[idx] || 0;
        const rewatches = segRewatches[idx] || 0;
        const rawIntensity = rewatches > 0 ? (rewatches * 2 + 1) / maxHeatmapVal : watches > 0 ? 0.15 : 0;
        return {
          bucketIndex: idx,
          startSec,
          endSec,
          label: `${startSec}s–${endSec}s`,
          watches,
          rewatches,
          intensity: Math.min(1, Number(rawIntensity.toFixed(2))),
        };
      });

      const completionPercentage = totalViews > 0
        ? Math.min(100, Math.round((completions / totalViews) * 100))
        : 0;

      const sessions = record?.recentSessions || [];
      const avgMaxPercent = sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + (s.maxPercentReached || 0), 0) / sessions.length)
        : 0;

      const boundCourse = (db.courses || []).find((c: any) => c.id === video.courseId);
      const boundModule = boundCourse?.modules?.find((m: any) => m.id === video.moduleId);

      return {
        videoId: video.id,
        title: video.title,
        category: video.category,
        level: video.level,
        aspectRatio: video.aspectRatio,
        resolution: video.resolution,
        durationSeconds: totalDuration,
        turnNumber: video.turnNumber || 1,
        published: Boolean(video.published),
        streamUrl: video.streamUrl,
        courseId: video.courseId,
        courseTitle: boundCourse?.title || null,
        moduleId: video.moduleId,
        moduleTitle: boundModule?.title || null,
        createdAt: video.createdAt,
        totalViews,
        uniqueViewerCount: record?.uniqueViewers?.length || 0,
        completions,
        completionPercentage,
        avgMaxPercent,
        totalWatchSeconds: Math.round(record?.totalWatchSeconds || 0),
        totalRewatches,
        peakRewatchSegment:
          peakRewatchBucket >= 0
            ? {
                bucketIndex: peakRewatchBucket,
                label: heatmap[peakRewatchBucket].label,
                rewatches: peakRewatchCount,
              }
            : null,
        heatmap,
        recentSessions: sessions,
      };
    });

    const totalViews = perVideo.reduce((sum, v) => sum + v.totalViews, 0);
    const totalRewatches = perVideo.reduce((sum, v) => sum + v.totalRewatches, 0);
    const viewedVideos = perVideo.filter((v) => v.totalViews > 0);
    const avgCompletionRate = viewedVideos.length > 0
      ? Math.round(viewedVideos.reduce((sum, v) => sum + v.completionPercentage, 0) / viewedVideos.length)
      : 0;

    res.json({
      summary: {
        totalVideos: perVideo.length,
        publishedVideos: perVideo.filter((v) => v.published).length,
        totalViews,
        avgCompletionRate,
        totalRewatches,
      },
      videos: perVideo.sort((a, b) => b.totalViews - a.totalViews || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  });

  // --- Learning Paths & Custom Training Playlists (by Installation Workflow & Manuals) ---
  const VALID_PATH_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced', 'Multi-Level']);

  function enrichLearningPath(lp: LearningPathRecord, db: any, isStaff: boolean) {
    const allVideos: AcademyVideoRecord[] = db.generatedVideos || [];
    const videoMap = new Map<string, AcademyVideoRecord>(allVideos.map((v) => [v.id, v]));
    const steps: AcademyVideoRecord[] = [];
    for (const vidId of lp.videoIds || []) {
      const v = videoMap.get(vidId);
      if (v && (isStaff || v.published)) {
        steps.push(v);
      }
    }
    const allResources: any[] = db.resources || [];
    const resourceMap = new Map<string, any>(allResources.map((r: any) => [r.id, r]));
    const linkedManuals: Array<{ id: string; title: string; category: string; size: string; url: string }> = [];
    for (const resId of lp.manualIds || []) {
      const r = resourceMap.get(resId);
      if (r) {
        linkedManuals.push({
          id: r.id,
          title: r.title,
          category: r.category,
          size: r.size,
          url: r.url,
        });
      }
    }
    const totalDurationSeconds = steps.reduce(
      (sum, v) => sum + (v.cumulativeDurationSeconds || v.durationSeconds || 0),
      0
    );
    const categories = Array.from(new Set(steps.map((v) => v.category).filter(Boolean)));
    return {
      ...lp,
      workflowStage: lp.workflowStage || 'Pre-Commissioning & Installation',
      manualIds: linkedManuals.map((m) => m.id),
      linkedManuals,
      videoIds: steps.map((s) => s.id),
      steps,
      stepCount: steps.length,
      totalDurationSeconds,
      categories,
    };
  }

  app.get('/api/learning-paths', (req, res) => {
    const db = getDb();
    const session = verifySessionToken(req);
    const isStaff = Boolean(session && (session.role === 'admin' || session.role === 'instructor'));
    const paths: LearningPathRecord[] = db.learningPaths || [];
    const visible = (isStaff ? paths : paths.filter((p) => p.published))
      .map((lp) => enrichLearningPath(lp, db, isStaff))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    res.json(visible);
  });

  app.get('/api/learning-paths/progress', (req, res) => {
    const db = getDb();
    const session = verifySessionToken(req);
    const queryUserId = typeof req.query.userId === 'string' && req.query.userId.trim() ? req.query.userId.trim().slice(0, 80) : null;
    const viewerId = session?.id || queryUserId || 'usr_guest';
    const records = (db.learningPathProgress || []).filter(
      (p: LearningPathProgressRecord) => p.userId === viewerId
    );
    res.json(records);
  });

  app.post('/api/learning-paths', requireInstructorOrAdmin, (req, res) => {
    const authUser = (req as any).authUser;
    const {
      title,
      description = '',
      trackFocus = 'Cross-Course Commissioning',
      workflowStage = 'Pre-Commissioning & Installation',
      level = 'Multi-Level',
      videoIds = [],
      manualIds = [],
      published = true,
    } = req.body || {};

    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 140) {
      return res.status(400).json({ error: 'Playlist title must be between 3 and 140 characters.' });
    }
    if (typeof description !== 'string' || description.length > 600) {
      return res.status(400).json({ error: 'Description must be 600 characters or fewer.' });
    }
    if (!Array.isArray(videoIds) || videoIds.length > 30) {
      return res.status(400).json({ error: 'Playlist supports up to 30 ordered video steps.' });
    }
    if (!Array.isArray(manualIds) || manualIds.length > 12) {
      return res.status(400).json({ error: 'Playlist supports up to 12 linked installation manuals.' });
    }

    const db = getDb();
    const validVideoSet = new Set((db.generatedVideos || []).map((v: AcademyVideoRecord) => v.id));
    const orderedIds: string[] = [];
    const seenVideos = new Set<string>();
    for (const rawId of videoIds) {
      if (typeof rawId === 'string' && validVideoSet.has(rawId) && !seenVideos.has(rawId)) {
        seenVideos.add(rawId);
        orderedIds.push(rawId);
      }
    }

    const validManualSet = new Set((db.resources || []).map((r: any) => r.id));
    const cleanManualIds: string[] = [];
    const seenManuals = new Set<string>();
    for (const rawId of manualIds) {
      if (typeof rawId === 'string' && validManualSet.has(rawId) && !seenManuals.has(rawId)) {
        seenManuals.add(rawId);
        cleanManualIds.push(rawId);
      }
    }

    if (orderedIds.length === 0 && cleanManualIds.length === 0) {
      return res.status(400).json({
        error: 'Attach at least 1 generated teaching video or 1 Daikin installation manual to save this playlist.',
      });
    }

    const now = new Date().toISOString();
    const newPath: LearningPathRecord = {
      id: `lp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      title: title.trim(),
      description: description.trim(),
      trackFocus: typeof trackFocus === 'string' && trackFocus.trim() ? trackFocus.trim().slice(0, 80) : 'Cross-Course Commissioning',
      workflowStage:
        typeof workflowStage === 'string' && workflowStage.trim()
          ? workflowStage.trim().slice(0, 100)
          : 'Pre-Commissioning & Installation',
      level: VALID_PATH_LEVELS.has(level) ? level : 'Multi-Level',
      videoIds: orderedIds,
      manualIds: cleanManualIds,
      published: Boolean(published),
      createdBy: authUser.id,
      createdByName: authUser.name,
      createdAt: now,
      updatedAt: now,
    };

    if (!Array.isArray(db.learningPaths)) db.learningPaths = [];
    db.learningPaths.unshift(newPath);
    saveDb(db);

    res.json({ success: true, learningPath: enrichLearningPath(newPath, db, true) });
  });

  app.put('/api/learning-paths/:pathId', requireInstructorOrAdmin, (req, res) => {
    const { pathId } = req.params;
    if (!/^lp_[a-zA-Z0-9_-]+$/.test(pathId)) {
      return res.status(400).json({ error: 'Invalid Learning Path ID.' });
    }

    const db = getDb();
    const existing: LearningPathRecord | undefined = (db.learningPaths || []).find(
      (lp: LearningPathRecord) => lp.id === pathId
    );
    if (!existing) {
      return res.status(404).json({ error: 'Learning Path not found.' });
    }

    const { title, description, trackFocus, workflowStage, level, videoIds, manualIds, published } = req.body || {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 140) {
        return res.status(400).json({ error: 'Playlist title must be between 3 and 140 characters.' });
      }
      existing.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 600) {
        return res.status(400).json({ error: 'Description must be 600 characters or fewer.' });
      }
      existing.description = description.trim();
    }
    if (typeof trackFocus === 'string' && trackFocus.trim()) {
      existing.trackFocus = trackFocus.trim().slice(0, 80);
    }
    if (typeof workflowStage === 'string' && workflowStage.trim()) {
      existing.workflowStage = workflowStage.trim().slice(0, 100);
    }
    if (typeof level === 'string' && VALID_PATH_LEVELS.has(level)) {
      existing.level = level;
    }
    if (published !== undefined) {
      existing.published = Boolean(published);
    }
    if (videoIds !== undefined) {
      if (!Array.isArray(videoIds) || videoIds.length > 30) {
        return res.status(400).json({ error: 'Playlist supports up to 30 ordered video steps.' });
      }
      const validSet = new Set((db.generatedVideos || []).map((v: AcademyVideoRecord) => v.id));
      const orderedIds: string[] = [];
      const seen = new Set<string>();
      for (const rawId of videoIds) {
        if (typeof rawId === 'string' && validSet.has(rawId) && !seen.has(rawId)) {
          seen.add(rawId);
          orderedIds.push(rawId);
        }
      }
      existing.videoIds = orderedIds;
    }
    if (manualIds !== undefined) {
      if (!Array.isArray(manualIds) || manualIds.length > 12) {
        return res.status(400).json({ error: 'Playlist supports up to 12 linked installation manuals.' });
      }
      const validManualSet = new Set((db.resources || []).map((r: any) => r.id));
      const cleanManualIds: string[] = [];
      const seenManuals = new Set<string>();
      for (const rawId of manualIds) {
        if (typeof rawId === 'string' && validManualSet.has(rawId) && !seenManuals.has(rawId)) {
          seenManuals.add(rawId);
          cleanManualIds.push(rawId);
        }
      }
      existing.manualIds = cleanManualIds;
    }

    if ((existing.videoIds || []).length === 0 && (existing.manualIds || []).length === 0) {
      return res.status(400).json({
        error: 'Keep at least 1 generated teaching video or 1 linked installation manual in this playlist.',
      });
    }

    existing.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ success: true, learningPath: enrichLearningPath(existing, db, true) });
  });

  app.delete('/api/learning-paths/:pathId', requireInstructorOrAdmin, (req, res) => {
    const { pathId } = req.params;
    if (!/^lp_[a-zA-Z0-9_-]+$/.test(pathId)) {
      return res.status(400).json({ error: 'Invalid Learning Path ID.' });
    }

    const db = getDb();
    const idx = (db.learningPaths || []).findIndex((lp: LearningPathRecord) => lp.id === pathId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Learning Path not found.' });
    }

    db.learningPaths.splice(idx, 1);
    if (Array.isArray(db.learningPathProgress)) {
      db.learningPathProgress = db.learningPathProgress.filter(
        (p: LearningPathProgressRecord) => p.pathId !== pathId
      );
    }
    saveDb(db);

    res.json({ success: true });
  });

  app.post('/api/learning-paths/:pathId/progress', (req, res) => {
    const { pathId } = req.params;
    if (!/^lp_[a-zA-Z0-9_-]+$/.test(pathId)) {
      return res.status(400).json({ error: 'Invalid Learning Path ID.' });
    }

    const { videoId, completed = true, userId } = req.body || {};
    if (typeof videoId !== 'string' || !/^vid_[a-zA-Z0-9_-]+$/.test(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID.' });
    }

    const db = getDb();
    const lp: LearningPathRecord | undefined = (db.learningPaths || []).find(
      (p: LearningPathRecord) => p.id === pathId
    );
    if (!lp || !(lp.videoIds || []).includes(videoId)) {
      return res.status(404).json({ error: 'Video step not found in this Learning Path.' });
    }

    const session = verifySessionToken(req);
    const viewerId = session?.id || (typeof userId === 'string' && userId.trim() ? userId.trim().slice(0, 80) : 'usr_guest');

    if (!Array.isArray(db.learningPathProgress)) db.learningPathProgress = [];
    let record: LearningPathProgressRecord | undefined = db.learningPathProgress.find(
      (p: LearningPathProgressRecord) => p.userId === viewerId && p.pathId === pathId
    );

    if (!record) {
      record = {
        userId: viewerId,
        pathId,
        completedVideoIds: [],
        lastVideoId: videoId,
        updatedAt: new Date().toISOString(),
      };
      db.learningPathProgress.push(record);
    }

    record.lastVideoId = videoId;
    if (completed) {
      if (!record.completedVideoIds.includes(videoId)) {
        record.completedVideoIds.push(videoId);
      }
    } else {
      record.completedVideoIds = record.completedVideoIds.filter((id) => id !== videoId);
    }
    record.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ success: true, progress: record });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        response: "AI Training Assistant is currently in offline mode (API key not configured). According to Daikin approved installation guidelines, always verify equipment submittals, ensure 24-hour nitrogen pressure tests at 4.15 MPa for VRV, and maintain correct rigging clearances."
      });
    }

    try {
      const gemini = getGeminiClient();
      const result = await gemini.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are the expert AI HVAC Training Assistant for Daikin HVAC Installation Academy. 
You provide precise, technically rigorous guidance strictly grounded in approved Daikin installation manuals, technical submittals, engineering guidelines, and safety codes.
Always include relevant document citations (e.g., Daikin VRV Engineering Manual EDUS09-501R or EWAD-TZ Installation Manual Rev 4.2) and safety/isolation warnings.
Include a visible disclaimer: "Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd."
User Question: ${prompt}` }]
          }
        ]
      });

      const text = result.text || 'No response generated.';
      res.json({ response: text });
    } catch (err: any) {
      console.error('Gemini API error:', err);
      res.status(500).json({ response: 'Error communicating with AI assistant. Please check server configuration.' });
    }
  });

  // PDF Progress Report Generation Route
  app.get('/api/student/:userId/progress-report-pdf', (req, res) => {
    const { userId } = req.params;
    try {
      const db = getDb();
      const user = db.users.find((u: any) => u.id === userId) || { name: 'Student Technician', subscriptionTier: 'free' };
      const enrollments = db.enrollments.filter((e: any) => e.userId === userId);
      const certificates = db.certificates.filter((c: any) => c.userId === userId);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Daikin_HVAC_Progress_Report_${userId}.pdf`);

      doc.pipe(res);

      // Header
      doc.fontSize(22).fillColor('#0B192C').font('Helvetica-Bold').text('DAIKIN HVAC INSTALLATION ACADEMY', { align: 'center' });
      doc.fontSize(12).fillColor('#666666').font('Helvetica').text('STUDENT LEARNING PROGRESS & MODULE REPORT', { align: 'center' });
      doc.moveDown(1.5);

      // Student Profile
      doc.fontSize(14).fillColor('#0B192C').font('Helvetica-Bold').text('Student Profile');
      doc.fontSize(11).fillColor('#333333').font('Helvetica');
      doc.text(`Name: ${user.name}`);
      doc.text(`Email: ${user.email || 'student@daikin-hvac-academy.com'}`);
      doc.text(`Subscription Tier: ${(user.subscriptionTier || 'free').toUpperCase()}`);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown(1.5);

      // Enrolled Courses & Progress
      doc.fontSize(14).fillColor('#0B192C').font('Helvetica-Bold').text('Enrolled Courses & Progress');
      doc.moveDown(0.5);

      if (enrollments.length === 0) {
        doc.fontSize(11).fillColor('#666666').font('Helvetica').text('No active course enrollments found.');
      } else {
        enrollments.forEach((enr: any, idx: number) => {
          const course = db.courses.find((c: any) => c.id === enr.courseId);
          const courseTitle = course ? course.title : `Course ID: ${enr.courseId}`;
          doc.fontSize(12).fillColor('#1E3E62').font('Helvetica-Bold').text(`${idx + 1}. ${courseTitle}`);
          doc.fontSize(10).fillColor('#444444').font('Helvetica').text(`   Progress: ${enr.progress}% Complete`);
          if (enr.completedModules && enr.completedModules.length > 0) {
            doc.text(`   Completed Modules: ${enr.completedModules.join(', ')}`);
          } else {
            doc.text(`   Completed Modules: None yet`);
          }
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(1);

      // Certificates Earned
      doc.fontSize(14).fillColor('#0B192C').font('Helvetica-Bold').text('Certificates Earned');
      doc.moveDown(0.5);

      if (certificates.length === 0) {
        doc.fontSize(11).fillColor('#666666').font('Helvetica').text('No certificates earned yet.');
      } else {
        certificates.forEach((cert: any, idx: number) => {
          doc.fontSize(11).fillColor('#333333').font('Helvetica').text(`• ${cert.courseTitle} (ID: ${cert.verificationNumber})`);
        });
      }

      doc.moveDown(2);
      doc.fontSize(8).fillColor('#777777').text('Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd.', { align: 'center' });

      doc.end();
    } catch (err) {
      console.error('Progress report PDF error:', err);
      res.status(500).json({ error: 'Failed to generate progress report PDF.' });
    }
  });

  // PDF Certificate Generation Route
  app.get('/api/certificates/:certId/download', (req, res) => {
    const { certId } = req.params;
    const { studentName = 'Student Technician', courseTitle = 'Daikin HVAC Professional Course', date = new Date().toLocaleDateString(), verificationNumber = certId } = req.query;

    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Daikin_HVAC_Certificate_${verificationNumber}.pdf`);

      doc.pipe(res);

      // Background border / styling
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(3).strokeColor('#0B192C').stroke();
      doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(1).strokeColor('#C5A059').stroke();

      // Header
      doc.fontSize(20).fillColor('#0B192C').font('Helvetica-Bold').text('DAIKIN HVAC INSTALLATION ACADEMY', 0, 80, { align: 'center' });
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('CERTIFICATE OF PROFESSIONAL COURSE COMPLETION', 0, 110, { align: 'center' });

      // Body text
      doc.fontSize(14).fillColor('#333333').text('This is to certify that', 0, 160, { align: 'center' });
      
      doc.fontSize(28).fillColor('#0B192C').font('Helvetica-Bold').text(String(studentName), 0, 195, { align: 'center' });

      doc.fontSize(14).fillColor('#333333').font('Helvetica').text('has successfully completed all rigorous technical modules, training assessments, and engineering examinations for:', 0, 250, { align: 'center' });

      doc.fontSize(20).fillColor('#1E3E62').font('Helvetica-Bold').text(String(courseTitle), 0, 290, { align: 'center' });

      // Verification & Date
      doc.fontSize(11).fillColor('#555555').font('Helvetica').text(`Date of Issuance: ${date}`, 100, 370);
      doc.text(`Verification ID: ${verificationNumber}`, doc.page.width - 350, 370, { width: 250, align: 'right' });

      // Signatures
      doc.moveTo(120, 440).lineTo(320, 440).strokeColor('#888888').lineWidth(1).stroke();
      doc.moveTo(doc.page.width - 320, 440).lineTo(doc.page.width - 120, 440).stroke();

      doc.fontSize(10).fillColor('#444444').text('Director of Technical Training', 120, 450, { width: 200, align: 'center' });
      doc.text('Chief Engineering Examiner', doc.page.width - 320, 450, { width: 200, align: 'center' });

      // Disclaimer footer
      doc.fontSize(8).fillColor('#777777').text('Independent HVAC training platform. Not affiliated with, endorsed by, or certified by Daikin Industries, Ltd.', 50, 520, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: 'Failed to generate certificate PDF.' });
    }
  });

  // API 404 fallback to ensure requests to unknown /api/* return JSON instead of HTML index.html
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Serve public/ assets directly in both dev and production so Vite build does not duplicate them into dist/
  const publicDir = path.join(__dirname, 'public');
  app.use('/public', express.static(publicDir));
  app.use('/assets/aistudio', express.static(path.join(publicDir, 'assets', 'aistudio')));

  // Setup Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Daikin HVAC Installation Academy running on port ${PORT}`);
  });
}

startServer();
