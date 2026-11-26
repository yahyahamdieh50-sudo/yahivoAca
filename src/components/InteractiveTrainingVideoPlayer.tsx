import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Languages,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ListVideo,
} from 'lucide-react';
import {
  getInteractiveLesson,
  type InteractiveLessonId,
  type InteractiveVideoChapter,
  type VideoLanguage,
} from '../data/interactiveTrainingVideos';

export interface InteractiveTelemetryPayload {
  eventType: 'view' | 'progress' | 'rewatch' | 'complete';
  bucketIndex?: number;
  maxPercent?: number;
  watchSecondsDelta?: number;
}

interface InteractiveTrainingVideoPlayerProps {
  lessonId: InteractiveLessonId;
  videoId: string;
  compact?: boolean;
  onTelemetry?: (payload: InteractiveTelemetryPayload) => void;
  onVideoEnded?: () => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

interface StageProps {
  sceneKey: string;
  progress: number; // 0..1 within current chapter
  elapsed: number; // continuous seconds for smooth particle loops
  lang: VideoLanguage;
  chapter: InteractiveVideoChapter;
}

const AnimatedLessonStage: React.FC<StageProps> = ({
  sceneKey,
  progress,
  elapsed,
  lang,
}) => {
  const pulse = (elapsed * 0.55) % 1;
  const wavePhase = elapsed * 2.8;

  const renderSchematic = () => {
    switch (sceneKey) {
      /* ---------------- LESSON 1: VRV PIPING & 40-BAR ---------------- */
      case 'vrv-piping-limits': {
        const dotX = 95 + pulse * 410;
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <defs>
              <pattern id="engGrid1" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="640" height="270" fill="url(#engGrid1)" />
            {/* Outdoor Unit */}
            <rect x="34" y="68" width="84" height="132" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="76" cy="108" r="22" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
            <line
              x1={76 - Math.cos(wavePhase * 2) * 16}
              y1={108 - Math.sin(wavePhase * 2) * 16}
              x2={76 + Math.cos(wavePhase * 2) * 16}
              y2={108 + Math.sin(wavePhase * 2) * 16}
              stroke="#38bdf8"
              strokeWidth="3"
            />
            <text x="76" y="186" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">
              VRV IV / X
            </text>

            {/* 200mm Inverted Oil Rise Trap */}
            <path
              d="M 118 148 L 154 148 L 154 102 L 194 102 L 194 148 L 365 148"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="174" y="92" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="IBM Plex Mono">
              200 mm Oil Trap
            </text>

            {/* 500mm Straight Run Bracket */}
            <line x1="220" y1="170" x2="355" y2="170" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="287" y="186" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="IBM Plex Mono">
              ≥ 500 mm Straight Run
            </text>

            {/* Refnet Y-Joint */}
            <path
              d="M 358 148 L 418 148 M 418 148 L 468 106 L 560 106 M 418 148 L 468 190 L 560 190"
              fill="none"
              stroke="#ea580c"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="418" cy="148" r="10" fill="#f97316" stroke="#fde68a" strokeWidth="2" />
            <text x="418" y="218" textAnchor="middle" fill="#fdba74" fontSize="10" fontFamily="IBM Plex Mono">
              REFNET Y-Joint (±30° Horiz)
            </text>

            {/* Indoor Units */}
            <rect x="556" y="84" width="56" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="584" y="108" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="IBM Plex Mono">IDU 1</text>
            <rect x="556" y="168" width="56" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="584" y="192" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="IBM Plex Mono">IDU 2</text>

            {/* Animated Refrigerant Flow Pulse */}
            <circle cx={Math.min(418, dotX)} cy={dotX > 154 && dotX < 194 ? 102 : 148} r="4.5" fill="#38bdf8" />
            {dotX > 418 && (
              <>
                <circle cx={418 + (dotX - 418) * 1.1} cy={Math.max(106, 148 - (dotX - 418) * 0.7)} r="4" fill="#38bdf8" />
                <circle cx={418 + (dotX - 418) * 1.1} cy={Math.min(190, 148 + (dotX - 418) * 0.7)} r="4" fill="#38bdf8" />
              </>
            )}

            {/* Top Dimension Line */}
            <line x1="76" y1="36" x2="584" y2="36" stroke="#94a3b8" strokeWidth="1.2" />
            <text x="330" y="28" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="IBM Plex Mono">
              {lang === 'ar'
                ? 'أقصى طول فعلي 165م · المكافئ 190م · الإجمالي 1000م'
                : 'MAX ACTUAL: 165 m · EQUIVALENT: 190 m · TOTAL: 1000 m'}
            </text>
          </svg>
        );
      }

      case 'vrv-n2-brazing': {
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* N2 Cylinder */}
            <rect x="44" y="88" width="54" height="140" rx="14" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <rect x="59" y="64" width="24" height="24" rx="3" fill="#475569" />
            <circle cx="116" cy="76" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <text x="71" y="160" textAnchor="middle" fill="#ecfdf5" fontSize="13" fontWeight="bold" fontFamily="IBM Plex Mono">
              N₂
            </text>
            <text x="71" y="180" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="IBM Plex Mono">
              0.02 MPa
            </text>

            {/* Hose to Copper Pipe */}
            <path d="M 130 76 Q 165 76 165 135 L 200 135" fill="none" stroke="#38bdf8" strokeWidth="4" />

            {/* Cutaway Copper Pipe */}
            <rect x="200" y="114" width="350" height="44" rx="6" fill="#7c2d12" stroke="#fb923c" strokeWidth="2.5" />
            <rect x="200" y="122" width="350" height="28" fill="#1e293b" />

            {/* Brazing Joint Ring */}
            <rect x="372" y="110" width="26" height="52" rx="3" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />

            {/* Animated Nitrogen Molecules Sweeping Right */}
            {[0, 0.2, 0.4, 0.6, 0.8].map((offset, idx) => {
              const x = 212 + ((pulse + offset) % 1) * 326;
              return (
                <g key={idx} transform={`translate(${x}, ${136 + Math.sin(wavePhase + idx) * 5})`}>
                  <circle r="5" fill="#38bdf8" opacity="0.9" />
                  <text y="3" textAnchor="middle" fill="#082f49" fontSize="6" fontWeight="bold">N2</text>
                </g>
              );
            })}

            {/* Brazing Torch Flame */}
            <g transform="translate(385, 58)">
              <path d="M -28 -26 L -4 14 L 4 10 L -18 -32 Z" fill="#94a3b8" />
              <ellipse
                cx="0"
                cy="32"
                rx={9 + Math.sin(wavePhase * 4) * 1.5}
                ry={20 + Math.cos(wavePhase * 4) * 2}
                fill="#f97316"
                opacity="0.85"
              />
              <ellipse cx="0" cy="28" rx="4.5" ry="11" fill="#38bdf8" />
            </g>

            {/* Open Vent Exit */}
            <path d="M 558 136 L 598 136" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 4" />
            <text x="580" y="118" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="IBM Plex Mono">
              Vent Open
            </text>
            <text x="375" y="200" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="IBM Plex Mono">
              {lang === 'ar'
                ? 'تدفق نيتروجين مستمر 0.02 ميجاباسكال = أنبوب نحاسي نظيف خالٍ من الأكاسيد'
                : 'CONTINUOUS 0.02 MPa N₂ SWEEP = ZERO COPPER OXIDE SCALE'}
            </text>
          </svg>
        );
      }

      case 'vrv-pressure-test': {
        const pressureMpa =
          progress < 0.25
            ? 0.3 * (progress / 0.25)
            : progress < 0.5
            ? 0.3 + 1.2 * ((progress - 0.25) / 0.25)
            : progress < 0.78
            ? 1.5 + 2.65 * ((progress - 0.5) / 0.28)
            : 4.15;
        const needleDeg = -130 + (pressureMpa / 6.0) * 260;
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Left: Stepwise Chart */}
            <g transform="translate(46, 36)">
              <line x1="0" y1="185" x2="320" y2="185" stroke="#475569" strokeWidth="1.5" />
              <line x1="0" y1="15" x2="0" y2="185" stroke="#475569" strokeWidth="1.5" />
              {/* Step 1/2/3 Path */}
              <path
                d="M 0 185 L 40 168 L 95 168 L 130 120 L 185 120 L 220 34 L 315 34"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
              />
              <line x1="0" y1="34" x2="315" y2="34" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
              <text x="68" y="160" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">0.3 MPa</text>
              <text x="155" y="112" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">1.5 MPa</text>
              <text x="266" y="25" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
                4.15 MPa · 24h HOLD
              </text>
              {/* Moving Dot */}
              <circle
                cx={Math.min(315, progress * 315)}
                cy={185 - (pressureMpa / 4.5) * 164}
                r="6"
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth="2"
              />
              <text x="160" y="208" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">
                3-STAGE NITROGEN PRESSURE PROFILE
              </text>
            </g>

            {/* Right: Live 6.0 MPa Gauge */}
            <g transform="translate(495, 130)">
              <circle r="76" fill="#0f172a" stroke="#475569" strokeWidth="5" />
              <circle r="66" fill="none" stroke="#1e293b" strokeWidth="8" />
              <path d="M -52 38 A 65 65 0 1 1 52 38" fill="none" stroke="#38bdf8" strokeWidth="4" />
              <g transform={`rotate(${needleDeg})`}>
                <line x1="0" y1="10" x2="0" y2="-54" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
                <circle r="6" fill="#e2e8f0" />
              </g>
              <text y="38" textAnchor="middle" fill="#38bdf8" fontSize="16" fontWeight="bold" fontFamily="IBM Plex Mono">
                {pressureMpa.toFixed(2)} MPa
              </text>
              <text y="55" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">
                {(pressureMpa * 10).toFixed(1)} BAR
              </text>
            </g>
          </svg>
        );
      }

      case 'vrv-vacuum-dry': {
        const microns = Math.max(360, Math.round(5000 * Math.pow(1 - progress * 0.85, 2.2) + 360));
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Liquid & Gas Stop Valves */}
            <rect x="52" y="66" width="130" height="128" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <text x="117" y="92" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="IBM Plex Mono">
              SERVICE PORTS
            </text>
            <circle cx="92" cy="132" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <text x="92" y="136" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="IBM Plex Mono">LIQ</text>
            <circle cx="144" cy="132" r="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
            <text x="144" y="136" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="IBM Plex Mono">GAS</text>
            <text x="117" y="176" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="IBM Plex Mono">
              Valves CLOSED
            </text>

            {/* Manifold Hoses */}
            <path d="M 106 132 L 260 132 M 158 132 L 260 132" stroke="#38bdf8" strokeWidth="4" />
            <path d="M 330 132 L 455 132" stroke="#10b981" strokeWidth="4" />

            {/* Animated Moisture Extraction Dots */}
            {[0, 0.25, 0.5, 0.75].map((o, i) => (
              <circle key={i} cx={175 + ((pulse + o) % 1) * 270} cy={132} r="4" fill="#7dd3fc" />
            ))}

            {/* Digital Micron Gauge */}
            <rect x="242" y="72" width="128" height="114" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <text x="306" y="98" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="IBM Plex Mono">
              DIGITAL MICRON
            </text>
            <text
              x="306"
              y="134"
              textAnchor="middle"
              fill={microns <= 500 ? '#34d399' : '#fbbf24'}
              fontSize="22"
              fontWeight="bold"
              fontFamily="IBM Plex Mono"
            >
              {microns}
            </text>
            <text x="306" y="156" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">
              MICRONS ({microns <= 500 ? 'PASS' : 'PULLING'})
            </text>
            <text x="306" y="174" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="IBM Plex Mono">
              -100.7 kPa Target
            </text>

            {/* 2-Stage Vacuum Pump */}
            <rect x="455" y="88" width="132" height="90" rx="10" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
            <text x="521" y="128" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
              2-STAGE PUMP
            </text>
            <text x="521" y="148" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="IBM Plex Mono">
              ≥ 2 HR + 1 HR HOLD
            </text>
          </svg>
        );
      }

      case 'vrv-charge-insulation': {
        const addedKg = (progress * 8.4).toFixed(2);
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Separate Insulation Cross-Section */}
            <g transform="translate(150, 125)">
              <circle cx="-46" cy="0" r="36" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="-46" cy="0" r="14" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
              <text x="-46" y="54" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">LIQUID</text>

              <circle cx="48" cy="0" r="44" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="48" cy="0" r="22" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
              <text x="48" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">GAS (120°C)</text>
              <text x="0" y="-66" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="IBM Plex Mono">
                SEPARATE CLOSED-CELL INSULATION
              </text>
            </g>

            {/* R-410A Liquid Cylinder on Scale */}
            <g transform="translate(465, 50)">
              <rect x="-36" y="16" width="72" height="114" rx="12" fill="#be185d" stroke="#f472b6" strokeWidth="2" />
              <text x="0" y="74" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="IBM Plex Mono">
                R-410A
              </text>
              <text x="0" y="96" textAnchor="middle" fill="#fbcfe8" fontSize="10" fontFamily="IBM Plex Mono">
                LIQUID DIP
              </text>
              {/* Digital Scale */}
              <rect x="-58" y="134" width="116" height="44" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <text x="0" y="161" textAnchor="middle" fill="#38bdf8" fontSize="17" fontWeight="bold" fontFamily="IBM Plex Mono">
                +{addedKg} kg
              </text>
              <text x="0" y="196" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">
                LIQUID PIPE WEIGHT FORMULA
              </text>
            </g>
          </svg>
        );
      }

      /* ---------------- LESSON 2: VRV + FAHU 0-10V ---------------- */
      case 'fahu-block-architecture':
      case 'fahu-cable-separation': {
        const isCable = sceneKey === 'fahu-cable-separation';
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {!isCable ? (
              <>
                {[
                  { x: 30, label: 'VRV ODU', sub: 'RXYTQ', color: '#38bdf8' },
                  { x: 185, label: 'EKEXV', sub: 'EEV Kit', color: '#f59e0b' },
                  { x: 340, label: 'EKEQFCB', sub: 'X-Control', color: '#10b981' },
                  { x: 495, label: 'DDC / BMS', sub: '0–10V DC', color: '#a78bfa' },
                ].map((box) => (
                  <g key={box.label} transform={`translate(${box.x}, 86)`}>
                    <rect width="118" height="84" rx="8" fill="#1e293b" stroke={box.color} strokeWidth="2" />
                    <text x="59" y="38" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold" fontFamily="IBM Plex Mono">
                      {box.label}
                    </text>
                    <text x="59" y="58" textAnchor="middle" fill={box.color} fontSize="10" fontFamily="IBM Plex Mono">
                      {box.sub}
                    </text>
                  </g>
                ))}
                <line x1="148" y1="128" x2="185" y2="128" stroke="#f59e0b" strokeWidth="3" />
                <line x1="303" y1="128" x2="340" y2="128" stroke="#38bdf8" strokeWidth="3" />
                <line x1="458" y1="128" x2="495" y2="128" stroke="#a78bfa" strokeWidth="3" />
                <circle cx={148 + pulse * 347} cy={128} r="5" fill="#38bdf8" />
                <text x="320" y="218" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="IBM Plex Mono">
                  F1/F2 TRANSMISSION · R1T/R2T/R3T SENSORS · 0–10V ANALOG STEP
                </text>
              </>
            ) : (
              <>
                {/* High Voltage Tray */}
                <rect x="52" y="52" width="536" height="50" rx="6" fill="#451a03" stroke="#f59e0b" strokeWidth="2" />
                <text x="320" y="82" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="bold" fontFamily="IBM Plex Mono">
                  230V / 400V AC POWER TRAY (L / N / E)
                </text>
                {/* Separation Gap */}
                <line x1="100" y1="132" x2="540" y2="132" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" />
                <text x="320" y="137" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
                  ≥ 50 mm MANDATORY SEPARATION GAP
                </text>
                {/* Low Voltage Tray */}
                <rect x="52" y="160" width="536" height="60" rx="6" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
                <text x="320" y="186" textAnchor="middle" fill="#bae6fd" fontSize="11.5" fontWeight="bold" fontFamily="IBM Plex Mono">
                  SHIELDED LOW-VOLTAGE BUS (0.75–1.25 mm²)
                </text>
                <text x="320" y="206" textAnchor="middle" fill="#38bdf8" fontSize="10.5" fontFamily="IBM Plex Mono">
                  F1/F2 (16V Non-Polar) · P1/P2 (BRC) · T1/T2 (Interlock) · Y1/Y2 (0-10V)
                </text>
                <circle cx={70 + pulse * 500} cy={190} r="4" fill="#38bdf8" />
              </>
            )}
          </svg>
        );
      }

      case 'fahu-0-10v-curve':
      case 'fahu-commissioning-verify': {
        const voltage = Number((1.5 + progress * 8.0).toFixed(1));
        const dotX = 64 + (voltage / 10) * 340;
        const dotY = 198 - (voltage / 10) * 145;
        const bandText =
          voltage < 4.6 ? 'STEP DOWN' : voltage <= 5.4 ? '5V CONSTANT HOLD' : 'STEP UP COOLING';
        const supplyTemp = (24 - (voltage / 10) * 10.2).toFixed(1);
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* 0-10V Linear Curve */}
            <rect x="64" y="52" width="146" height="146" fill="#f59e0b" opacity="0.08" />
            <rect x="210" y="52" width="48" height="146" fill="#10b981" opacity="0.14" />
            <rect x="258" y="52" width="146" height="146" fill="#0284c7" opacity="0.12" />
            <line x1="64" y1="198" x2="404" y2="198" stroke="#64748b" strokeWidth="1.5" />
            <line x1="64" y1="52" x2="64" y2="198" stroke="#64748b" strokeWidth="1.5" />
            <line x1="64" y1="198" x2="404" y2="52" stroke="#38bdf8" strokeWidth="3.5" />
            <circle cx={dotX} cy={dotY} r="7" fill="#f59e0b" stroke="#fff" strokeWidth="2" />

            <text x="135" y="216" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="IBM Plex Mono">0–4.5V DOWN</text>
            <text x="234" y="216" textAnchor="middle" fill="#34d399" fontSize="9.5" fontFamily="IBM Plex Mono">5V HOLD</text>
            <text x="332" y="216" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="IBM Plex Mono">5.5–10V UP</text>

            {/* Right Live Readout Panel */}
            <rect x="436" y="52" width="172" height="164" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <text x="522" y="78" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">DDC ANALOG SIGNAL</text>
            <text x="522" y="114" textAnchor="middle" fill="#38bdf8" fontSize="26" fontWeight="bold" fontFamily="IBM Plex Mono">
              {voltage.toFixed(1)} V
            </text>
            <text x="522" y="138" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="bold" fontFamily="IBM Plex Mono">
              {bandText}
            </text>
            <line x1="456" y1="154" x2="588" y2="154" stroke="#1e293b" strokeWidth="1.5" />
            <text x="522" y="176" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="IBM Plex Mono">SUPPLY AIR TEMP</text>
            <text x="522" y="198" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="bold" fontFamily="IBM Plex Mono">
              {supplyTemp} °C DB
            </text>
          </svg>
        );
      }

      case 'fahu-relay-interlocks': {
        const activeStep = Math.min(3, Math.floor(progress * 4));
        const steps = [
          { n: '01', title: 'Motorized Damper', sub: 'End-Switch Closed' },
          { n: '02', title: 'Supply Fan Run', sub: 'Airflow DPS Proof' },
          { n: '03', title: 'EKEQFCB Enable', sub: 'T1/T2 Dry Contact' },
          { n: '04', title: 'VRV Compressor', sub: 'Modulating 0–10V' },
        ];
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {steps.map((st, idx) => {
              const lit = idx <= activeStep;
              const x = 34 + idx * 148;
              return (
                <g key={st.n} transform={`translate(${x}, 78)`}>
                  <rect
                    width="132"
                    height="96"
                    rx="10"
                    fill={lit ? '#0c4a6e' : '#1e293b'}
                    stroke={lit ? '#38bdf8' : '#334155'}
                    strokeWidth="2"
                  />
                  <text x="66" y="30" textAnchor="middle" fill={lit ? '#38bdf8' : '#64748b'} fontSize="13" fontWeight="bold" fontFamily="IBM Plex Mono">
                    STEP {st.n}
                  </text>
                  <text x="66" y="56" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                    {st.title}
                  </text>
                  <text x="66" y="76" textAnchor="middle" fill={lit ? '#7dd3fc' : '#64748b'} fontSize="9.5" fontFamily="IBM Plex Mono">
                    {st.sub}
                  </text>
                </g>
              );
            })}
            <text x="320" y="218" textAnchor="middle" fill="#f87171" fontSize="11" fontFamily="IBM Plex Mono">
              SAFETY INTERLOCK: NO AIRFLOW PROOF = IMMEDIATE VRV INHIBIT
            </text>
          </svg>
        );
      }

      /* ---------------- LESSON 3: VRV PCB & ERROR CODES ---------------- */
      case 'pcb-preheat-layout':
      case 'pcb-bs-navigation':
      case 'pcb-test-run':
      case 'pcb-error-e3-u4':
      case 'pcb-emergency-backup': {
        const segText =
          sceneKey === 'pcb-preheat-layout'
            ? '6Hr'
            : sceneKey === 'pcb-bs-navigation'
            ? progress < 0.5
              ? '2-49'
              : '2-35'
            : sceneKey === 'pcb-test-run'
            ? `t0${Math.min(9, Math.max(1, Math.ceil(progress * 9)))}`
            : sceneKey === 'pcb-error-e3-u4'
            ? ['E3', 'U4', 'UF', 'L5'][Math.min(3, Math.floor(progress * 4))]
            : 'bUP';
        const isFault = sceneKey === 'pcb-error-e3-u4';
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Daikin A1P Green/Dark PCB Board */}
            <rect x="64" y="34" width="320" height="202" rx="10" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
            <text x="84" y="58" fill="#a7f3d0" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
              DAIKIN A1P MAIN CONTROL PCB
            </text>

            {/* 7-Segment LED Module */}
            <rect x="86" y="76" width="150" height="66" rx="6" fill="#090d16" stroke="#475569" strokeWidth="2" />
            <text
              x="161"
              y="124"
              textAnchor="middle"
              fill={isFault ? '#ef4444' : '#f97316'}
              fontSize="40"
              fontWeight="bold"
              fontFamily="IBM Plex Mono"
            >
              {segText}
            </text>

            {/* H1P-H7P Status LEDs */}
            {['H1P', 'H2P', 'H3P', 'H4P', 'H5P'].map((led, i) => {
              const on = isFault ? i === 1 : i === 0 || (sceneKey === 'pcb-test-run' && i === 2);
              return (
                <g key={led} transform={`translate(${264 + (i % 2) * 52}, ${88 + Math.floor(i / 2) * 28})`}>
                  <circle r="6" fill={on ? (isFault ? '#ef4444' : '#fbbf24') : '#1e293b'} stroke="#94a3b8" strokeWidth="1" />
                  <text x="12" y="4" fill="#d1fae5" fontSize="9.5" fontFamily="IBM Plex Mono">{led}</text>
                </g>
              );
            })}

            {/* BS1 / BS2 / BS3 Pushbuttons */}
            {['BS1 MODE', 'BS2 SET', 'BS3 RETURN'].map((btn, i) => {
              const activeBtn =
                (sceneKey === 'pcb-bs-navigation' && i === Math.floor(progress * 3)) ||
                (sceneKey === 'pcb-test-run' && i === 1);
              return (
                <g key={btn} transform={`translate(${92 + i * 94}, 172)`}>
                  <rect
                    width="78"
                    height="38"
                    rx="6"
                    fill={activeBtn ? '#f59e0b' : '#1e293b'}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  <text
                    x="39"
                    y="23"
                    textAnchor="middle"
                    fill={activeBtn ? '#090d16' : '#f8fafc'}
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="IBM Plex Mono"
                  >
                    {btn}
                  </text>
                </g>
              );
            })}

            {/* Right Diagnostic Readout Box */}
            <rect x="410" y="34" width="194" height="202" rx="10" fill="#0f172a" stroke={isFault ? '#ef4444' : '#38bdf8'} strokeWidth="2" />
            <text x="507" y="64" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono">
              LIVE DIAGNOSTIC STATUS
            </text>
            <text x="507" y="102" textAnchor="middle" fill={isFault ? '#f87171' : '#38bdf8'} fontSize="18" fontWeight="bold" fontFamily="IBM Plex Mono">
              {segText === 'E3'
                ? 'HIGH PRESSURE'
                : segText === 'U4'
                ? 'F1/F2 COMM LOSS'
                : segText === 'UF'
                ? 'PIPE/WIRE ERROR'
                : segText === 'L5'
                ? 'INV OVERCURRENT'
                : sceneKey === 'pcb-test-run'
                ? 'AUTO TEST RUN'
                : sceneKey === 'pcb-emergency-backup'
                ? 'BACKUP ACTIVE'
                : 'MODE 2 SETTING'}
            </text>
            <text x="507" y="142" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="IBM Plex Mono">
              {sceneKey === 'pcb-preheat-layout'
                ? 'Crankcase Oil Heater ON'
                : sceneKey === 'pcb-bs-navigation'
                ? 'Hold BS1 5s → BS2 → BS3'
                : sceneKey === 'pcb-test-run'
                ? 'Verifying Valves & IDUs'
                : sceneKey === 'pcb-error-e3-u4'
                ? 'Check Valves & Bus Shield'
                : 'Healthy Comp #2 Running'}
            </text>
            <rect x="434" y="170" width="146" height="36" rx="6" fill="#1e293b" />
            <text x="507" y="192" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="IBM Plex Mono">
              DS1: OFF · DS2: OFF
            </text>
          </svg>
        );
      }

      /* ---------------- LESSON 4: AHU / FAHU STARTUP ---------------- */
      case 'ahu-siphon-drain': {
        const waterOsc = Math.sin(wavePhase) * 3;
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* AHU Casing Negative Pressure Chamber */}
            <rect x="52" y="38" width="230" height="150" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <text x="167" y="72" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="IBM Plex Mono">
              NEGATIVE PRESSURE CHAMBER
            </text>
            <text x="167" y="94" textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="IBM Plex Mono">
              Draw-Through Coil (-450 Pa)
            </text>
            {/* Sloped Drain Pan */}
            <path d="M 64 166 L 282 178" stroke="#38bdf8" strokeWidth="5" />

            {/* U-Trap Siphon Piping */}
            <path
              d="M 282 178 L 352 178 L 352 238 L 434 238 L 434 198 L 548 198"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="18"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Animated Blue Water Seal Inside Trap */}
            <path
              d={`M 352 ${186 + waterOsc} L 352 238 L 434 238 L 434 ${200 - waterOsc}`}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="12"
              strokeLinejoin="round"
            />
            {/* Dimension Callout H */}
            <line x1="316" y1="178" x2="316" y2="238" stroke="#f59e0b" strokeWidth="2" />
            <text x="304" y="212" textAnchor="end" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
              H ≥ Fan Head + 50mm
            </text>
            <text x="495" y="182" textAnchor="middle" fill="#34d399" fontSize="10.5" fontFamily="IBM Plex Mono">
              CLEAN GRAVITY OUTLET
            </text>
          </svg>
        );
      }

      case 'ahu-rigging-assembly':
      case 'ahu-isolators-belts':
      case 'ahu-star-delta-rotation':
      case 'ahu-commissioning-log': {
        const spinDeg = (elapsed * 220) % 360;
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Modular AHU Frame */}
            <rect x="54" y="46" width="532" height="162" rx="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Section Dividers */}
            <line x1="178" y1="46" x2="178" y2="208" stroke="#475569" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="322" y1="46" x2="322" y2="208" stroke="#475569" strokeWidth="2" strokeDasharray="5 4" />

            {/* Intake Filters */}
            <path d="M 88 66 L 116 96 L 88 126 L 116 156 L 88 186" fill="none" stroke="#38bdf8" strokeWidth="3.5" />
            <text x="114" y="200" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="IBM Plex Mono">BAG FILTERS</text>

            {/* Cooling Coil */}
            <rect x="218" y="66" width="64" height="118" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
            <text x="250" y="130" textAnchor="middle" fill="#bae6fd" fontSize="10.5" fontWeight="bold" fontFamily="IBM Plex Mono">DX COIL</text>

            {/* Spinning Centrifugal Fan Wheel on Spring Isolators */}
            <g transform="translate(456, 122)">
              <circle r="44" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
              <g transform={`rotate(${spinDeg})`}>
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <line
                    key={a}
                    x1="0"
                    y1="0"
                    x2={Math.cos((a * Math.PI) / 180) * 34}
                    y2={Math.sin((a * Math.PI) / 180) * 34}
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                  />
                ))}
              </g>
              <circle r="9" fill="#f59e0b" />
            </g>
            {/* Spring Isolators */}
            <rect x="404" y="178" width="22" height="24" rx="3" fill="#f59e0b" />
            <rect x="488" y="178" width="22" height="24" rx="3" fill="#f59e0b" />

            {/* Animated Airflow Arrows */}
            {[0, 0.33, 0.66].map((o, idx) => (
              <circle key={idx} cx={74 + ((pulse + o) % 1) * 490} cy={126} r="4.5" fill="#38bdf8" opacity="0.85" />
            ))}

            <text x="320" y="236" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="IBM Plex Mono">
              {sceneKey === 'ahu-rigging-assembly'
                ? '40/60mm THERMAL BREAK · SPREADER BAR LIFT · AIRTIGHT GASKETS'
                : sceneKey === 'ahu-isolators-belts'
                ? 'UNLOCK SHIPPING BOLTS · LASER PULLEY ALIGNMENT · SPRING ISOLATORS'
                : sceneKey === 'ahu-star-delta-rotation'
                ? 'STAR-DELTA / VFD START · VERIFY FAN SCROLL ROTATION ARROW'
                : 'LOG L1/L2/L3 AMPS ≤ FLA · TEST HEATER HIGH-LIMIT CUTOUT'}
            </text>
          </svg>
        );
      }

      /* ---------------- LESSON 5: FXSQ CONCEALED DUCTED ---------------- */
      case 'fxsq-suspension':
      case 'fxsq-suction-flare':
      case 'fxsq-drain-pump':
      case 'fxsq-esp-setup':
      case 'fxsq-brc-wiring': {
        const espVal = [30, 50, 80, 120, 150][Math.min(4, Math.floor(progress * 5))];
        const liftY = 178 - progress * 92;
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {/* Ceiling Slab */}
            <rect x="40" y="24" width="560" height="14" fill="#334155" />
            {/* M10 Suspension Rods */}
            <line x1="150" y1="38" x2="150" y2="112" stroke="#cbd5e1" strokeWidth="3.5" />
            <line x1="410" y1="38" x2="410" y2="112" stroke="#cbd5e1" strokeWidth="3.5" />

            {/* Slim 245mm FXSQ Body */}
            <rect x="128" y="102" width="304" height="86" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="280" y="138" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="IBM Plex Mono">
              DAIKIN FXSQ-A2VEB (245 mm)
            </text>
            <text x="280" y="160" textAnchor="middle" fill="#38bdf8" fontSize="10.5" fontFamily="IBM Plex Mono">
              {sceneKey === 'fxsq-esp-setup'
                ? `ACTIVE ESP STEP: ${espVal} Pa · DC FAN`
                : sceneKey === 'fxsq-brc-wiring'
                ? 'F1/F2 BUS · P1/P2 BRC1E62 REMOTE'
                : '4 × M10 RODS · LEVEL ≤ 1 mm/m'}
            </text>

            {/* 625 mm High-Lift Drain Pump & Rising Line */}
            <path d="M 432 164 L 486 164 L 486 72 L 586 84" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinejoin="round" />
            <path d={`M 432 164 L 486 164 L 486 ${Math.max(72, liftY)}`} fill="none" stroke="#0ea5e9" strokeWidth="5" />
            <text x="536" y="64" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="IBM Plex Mono">
              625 mm LIFT
            </text>
            <text x="556" y="106" textAnchor="middle" fill="#34d399" fontSize="9.5" fontFamily="IBM Plex Mono">
              1:100 SLOPE
            </text>

            {/* Airflow Pulses */}
            {[0, 0.35, 0.7].map((o, idx) => (
              <circle key={idx} cx={64 + ((pulse + o) % 1) * 380} cy={145} r="4" fill="#7dd3fc" opacity="0.85" />
            ))}

            {/* Bottom Access Hatch Indicator */}
            <line x1="185" y1="226" x2="375" y2="226" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
            <text x="280" y="246" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontFamily="IBM Plex Mono">
              {sceneKey === 'fxsq-suction-flare'
                ? 'REAR OR BOTTOM SUCTION · FLARE TORQUE 14–61 Nm'
                : 'SERVICE ACCESS HATCH ≥ 450 × 450 mm'}
            </text>
          </svg>
        );
      }

      /* ---------------- LESSON 6: GENERATOR & MEGGER ---------------- */
      case 'gen-voltage-tolerance':
      case 'gen-phase-earthing':
      case 'gen-elcb-protection':
      case 'gen-megger-test':
      case 'gen-daily-log-warranty':
      default: {
        const isMegger = sceneKey === 'gen-megger-test';
        const meggerMohm = Math.round(2 + progress * 198);
        // Sine wave path
        const sinePts = Array.from({ length: 48 }, (_, i) => {
          const x = 44 + i * 7.2;
          const y = 135 - Math.sin((i / 47) * Math.PI * 4 + wavePhase) * 52;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ');
        return (
          <svg viewBox="0 0 640 270" className="w-full h-full">
            <rect width="640" height="270" fill="#0b1424" />
            {!isMegger ? (
              <>
                <rect x="44" y="60" width="345" height="150" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                <line x1="44" y1="83" x2="389" y2="83" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="44" y1="187" x2="389" y2="187" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
                <path d={sinePts} fill="none" stroke="#38bdf8" strokeWidth="3" />
                <text x="216" y="48" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="IBM Plex Mono">
                  PURE SINE WAVE · ±10% VOLTAGE · ≤2% UNBALANCE
                </text>

                <rect x="414" y="60" width="186" height="150" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="507" y="92" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
                  {sceneKey === 'gen-elcb-protection'
                    ? 'INVERTER ELCB'
                    : sceneKey === 'gen-phase-earthing'
                    ? 'EARTH & PHASE'
                    : 'GEN COMPLIANCE'}
                </text>
                <text x="507" y="132" textAnchor="middle" fill="#34d399" fontSize="22" fontWeight="bold" fontFamily="IBM Plex Mono">
                  {sceneKey === 'gen-elcb-protection'
                    ? '200 mA'
                    : sceneKey === 'gen-phase-earthing'
                    ? '0.4 V N-E'
                    : '400V / 50Hz'}
                </text>
                <text x="507" y="164" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="IBM Plex Mono">
                  {sceneKey === 'gen-elcb-protection'
                    ? 'High-Freq Resistant'
                    : sceneKey === 'gen-phase-earthing'
                    ? 'L1-L2-L3 Sequence OK'
                    : 'Daily Log Required'}
                </text>
              </>
            ) : (
              <>
                {/* 500V DC Megger Instrument */}
                <rect x="64" y="44" width="240" height="178" rx="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="184" y="76" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">
                  500V DC MEGGER TESTER
                </text>
                <text x="184" y="136" textAnchor="middle" fill="#34d399" fontSize="34" fontWeight="bold" fontFamily="IBM Plex Mono">
                  {meggerMohm} MΩ
                </text>
                <text x="184" y="168" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="IBM Plex Mono">
                  PASS (MINIMUM ≥ 2.0 MΩ)
                </text>

                {/* Critical PCB Isolation Warning Box */}
                <rect x="336" y="44" width="244" height="178" rx="12" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
                <text x="458" y="84" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="bold" fontFamily="IBM Plex Mono">
                  CRITICAL SAFETY BARRIER
                </text>
                <text x="458" y="122" textAnchor="middle" fill="#ffffff" fontSize="12.5" fontWeight="bold">
                  DISCONNECT INVERTER PCB
                </text>
                <text x="458" y="148" textAnchor="middle" fill="#fecaca" fontSize="10.5" fontFamily="IBM Plex Mono">
                  NEVER APPLY 500V DC TO
                </text>
                <text x="458" y="168" textAnchor="middle" fill="#fecaca" fontSize="10.5" fontFamily="IBM Plex Mono">
                  A1P PCB OR F1/F2 / P1/P2 BUS
                </text>
              </>
            )}
          </svg>
        );
      }
    }
  };

  return <div className="w-full h-full flex items-center justify-center">{renderSchematic()}</div>;
};

export const InteractiveTrainingVideoPlayer: React.FC<InteractiveTrainingVideoPlayerProps> = ({
  lessonId,
  videoId,
  compact = false,
  onTelemetry,
  onVideoEnded,
}) => {
  const lesson = useMemo(() => getInteractiveLesson(lessonId), [lessonId]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [language, setLanguage] = useState<VideoLanguage>('en');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  // Telemetry refs
  const viewLoggedRef = useRef<string | null>(null);
  const completeLoggedRef = useRef<string | null>(null);
  const maxTimeRef = useRef<number>(0);
  const lastBucketRef = useRef<number>(-1);
  const lastPingTsRef = useRef<number>(0);
  const spokenChapterRef = useRef<string | null>(null);

  // Reset when switching lessons
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    maxTimeRef.current = 0;
    lastBucketRef.current = -1;
    spokenChapterRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [lessonId, videoId]);

  const duration = lesson?.durationSeconds || 80;

  const activeChapter = useMemo(() => {
    if (!lesson) return null;
    return (
      lesson.chapters.find((c) => currentTime >= c.startSec && currentTime < c.endSec) ||
      lesson.chapters[lesson.chapters.length - 1]
    );
  }, [lesson, currentTime]);

  const activeChapterIndex = useMemo(() => {
    if (!lesson || !activeChapter) return 0;
    return Math.max(0, lesson.chapters.findIndex((c) => c.id === activeChapter.id));
  }, [lesson, activeChapter]);

  const chapterProgress = useMemo(() => {
    if (!activeChapter) return 0;
    const span = Math.max(1, activeChapter.endSec - activeChapter.startSec);
    return Math.min(1, Math.max(0, (currentTime - activeChapter.startSec) / span));
  }, [activeChapter, currentTime]);

  // SpeechSynthesis bilingual voiceover helper
  const speakChapter = useCallback(
    (chapter: InteractiveVideoChapter, lang: VideoLanguage, rate: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const text = lang === 'ar' ? chapter.captionAr : chapter.captionEn;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
        utter.rate = Math.min(1.5, Math.max(0.75, rate));
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((v) =>
          lang === 'ar' ? v.lang.toLowerCase().startsWith('ar') : v.lang.toLowerCase().startsWith('en')
        );
        if (preferred) utter.voice = preferred;
        window.speechSynthesis.speak(utter);
      } catch {
        // Silent caption fallback if browser restricts SpeechSynthesis
      }
    },
    []
  );

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Trigger voiceover when entering a new chapter while playing & unmuted
  useEffect(() => {
    if (!isPlaying || !voiceEnabled || !activeChapter) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (!isPlaying) spokenChapterRef.current = null;
      return;
    }
    const key = `${activeChapter.id}-${language}-${playbackRate}`;
    if (spokenChapterRef.current !== key) {
      spokenChapterRef.current = key;
      speakChapter(activeChapter, language, playbackRate);
    }
  }, [isPlaying, voiceEnabled, activeChapter, language, playbackRate, speakChapter]);

  // Smooth 60fps timeline playback loop + telemetry emission
  useEffect(() => {
    if (!isPlaying || !lesson) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      setCurrentTime((prev) => {
        const next = prev + dt * playbackRate;
        const bucket = Math.min(9, Math.max(0, Math.floor((next / duration) * 10)));
        const pct = Math.min(100, Math.max(0, Math.round((next / duration) * 100)));

        if (next > maxTimeRef.current) {
          maxTimeRef.current = next;
        }

        const nowMs = Date.now();
        if (onTelemetry && (bucket !== lastBucketRef.current || nowMs - lastPingTsRef.current >= 2500)) {
          const delta = lastPingTsRef.current ? Math.min(5, (nowMs - lastPingTsRef.current) / 1000) : 1;
          lastBucketRef.current = bucket;
          lastPingTsRef.current = nowMs;
          onTelemetry({
            eventType: 'progress',
            bucketIndex: bucket,
            maxPercent: pct,
            watchSecondsDelta: delta,
          });
        }

        if (pct >= 90 && completeLoggedRef.current !== videoId) {
          completeLoggedRef.current = videoId;
          onTelemetry?.({ eventType: 'complete', maxPercent: 100 });
        }

        if (next >= duration) {
          setIsPlaying(false);
          if (completeLoggedRef.current !== videoId) {
            completeLoggedRef.current = videoId;
            onTelemetry?.({ eventType: 'complete', maxPercent: 100 });
          }
          onVideoEnded?.();
          return duration;
        }

        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackRate, duration, lesson, videoId, onTelemetry, onVideoEnded]);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!lesson || !activeChapter) {
    return null;
  }

  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentTime >= duration - 0.5) {
        setCurrentTime(0);
        spokenChapterRef.current = null;
        onTelemetry?.({ eventType: 'rewatch', bucketIndex: 0 });
      } else if (viewLoggedRef.current !== videoId) {
        viewLoggedRef.current = videoId;
        completeLoggedRef.current = null;
        onTelemetry?.({ eventType: 'view' });
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (targetSec: number) => {
    const clamped = Math.min(duration, Math.max(0, targetSec));
    if (clamped < maxTimeRef.current - 1.5) {
      const bucket = Math.min(9, Math.max(0, Math.floor((clamped / duration) * 10)));
      onTelemetry?.({
        eventType: 'rewatch',
        bucketIndex: bucket,
        maxPercent: Math.round((clamped / duration) * 100),
      });
    }
    spokenChapterRef.current = null;
    setCurrentTime(clamped);
  };

  const handleJumpChapter = (delta: number) => {
    const targetIdx = Math.min(lesson.chapters.length - 1, Math.max(0, activeChapterIndex + delta));
    handleSeek(lesson.chapters[targetIdx].startSec);
  };

  const handleToggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const progressPct = Math.min(100, (currentTime / duration) * 100);

  return (
    <div
      ref={containerRef}
      className="bg-[#08101E] text-white flex flex-col select-none relative overflow-hidden"
    >
      {/* 16:9 Animated Engineering Stage */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1 min-h-[420px]' : 'aspect-video'} bg-[#0B1424] overflow-hidden`}>
        {/* Top Stage Header Bar */}
        <div className="absolute top-0 inset-x-0 z-10 px-3.5 py-2 bg-gradient-to-b from-[#08101E]/95 via-[#08101E]/70 to-transparent flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono tabular-nums text-sky-400 font-semibold truncate">
              {language === 'ar'
                ? `الفصل ${activeChapterIndex + 1} من ${lesson.chapters.length} · ${lesson.manualRef}`
                : `Chapter ${activeChapterIndex + 1}/${lesson.chapters.length} · ${lesson.manualRef}`}
            </div>
            <div
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              className={`text-xs sm:text-sm font-bold text-white truncate ${language === 'ar' ? 'text-right' : ''}`}
            >
              {language === 'ar' ? activeChapter.titleAr : activeChapter.titleEn}
            </div>
          </div>

          {/* Instant EN / AR Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-[#0F1C32] border border-slate-700 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition whitespace-nowrap shrink-0 ${
                language === 'en' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition whitespace-nowrap shrink-0 ${
                language === 'ar' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* Center Animated Engineering Visual */}
        <div className="w-full h-full pt-10 pb-20 sm:pb-24 px-2">
          <AnimatedLessonStage
            sceneKey={activeChapter.sceneKey}
            progress={chapterProgress}
            elapsed={currentTime}
            lang={language}
            chapter={activeChapter}
          />
        </div>

        {/* Key Numeric Spec Strip (non-compact or fullscreen) */}
        {(!compact || isFullscreen) && (
          <div className="absolute bottom-[74px] sm:bottom-[82px] inset-x-3 z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 pointer-events-none">
            {activeChapter.specs.map((sp, i) => (
              <div
                key={i}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className="bg-[#0F1C32]/95 border border-slate-700/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2"
              >
                <span className="text-[10px] text-slate-400 truncate">
                  {language === 'ar' ? sp.labelAr : sp.labelEn}
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                    sp.status === 'pass'
                      ? 'text-emerald-400'
                      : sp.status === 'warn'
                      ? 'text-amber-400'
                      : sp.status === 'fault'
                      ? 'text-rose-400'
                      : 'text-sky-300'
                  }`}
                >
                  {sp.status === 'pass' && <CheckCircle2 className="w-3 h-3" />}
                  {sp.status === 'fault' && <AlertTriangle className="w-3 h-3" />}
                  {sp.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Synchronized Bilingual Caption Scrim */}
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="absolute bottom-0 inset-x-0 z-10 px-3.5 py-2.5 bg-gradient-to-t from-black/95 via-black/85 to-transparent"
        >
          <p
            className={`${
              compact && !isFullscreen ? 'text-[11px] line-clamp-2' : 'text-xs sm:text-sm leading-relaxed'
            } text-slate-100 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}
          >
            {language === 'ar' ? activeChapter.captionAr : activeChapter.captionEn}
          </p>
        </div>

        {/* Center Play Overlay When Paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={currentTime >= duration - 0.5 ? 'Replay Training Lesson' : 'Play Training Lesson'}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 hover:bg-black/20 transition cursor-pointer group"
          >
            <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500 group-hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition transform group-hover:scale-105">
              {currentTime >= duration - 0.5 ? (
                <RotateCcw className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-slate-950 ml-0.5" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Interactive Timeline Scrubber + Chapter Markers */}
      <div className="px-3.5 pt-2.5 pb-1 bg-[#0F1C32] border-t border-slate-800">
        <div className="relative h-5 flex items-center">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            aria-label="Lesson Video Timeline"
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 relative z-10"
          />
          {/* Chapter notch ticks */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex">
            {lesson.chapters.map((ch) => (
              <div
                key={ch.id}
                style={{ left: `${(ch.startSec / duration) * 100}%` }}
                className="absolute w-1 h-3 -top-1.5 bg-amber-400/80 rounded-xs"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Transport & Bilingual Controls Bar */}
      <div className="px-3.5 py-2 bg-[#0F1C32] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? (language === 'ar' ? 'إيقاف' : 'Pause') : language === 'ar' ? 'تشغيل' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => handleJumpChapter(-1)}
            title="Previous Chapter"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleJumpChapter(1)}
            title="Next Chapter"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono tabular-nums text-[11px] text-slate-300 px-1.5 whitespace-nowrap shrink-0">
            {formatClock(currentTime)} / {formatClock(duration)} ({Math.round(progressPct)}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? 'Mute Voiceover' : 'Unmute Voiceover'}
            className={`px-2 py-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 transition ${
              voiceEnabled
                ? 'bg-slate-800 text-sky-300 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {!compact && (voiceEnabled ? 'Voice ON' : 'Muted')}
          </button>

          <button
            type="button"
            onClick={() => setLanguage((l) => (l === 'en' ? 'ar' : 'en'))}
            title="Switch Language (English / Arabic)"
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0"
          >
            <Languages className="w-3.5 h-3.5" />
            {language === 'en' ? 'EN' : 'AR'}
          </button>

          {!compact && (
            <select
              aria-label="Playback Speed"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono tabular-nums rounded-lg px-2 py-1.5 cursor-pointer"
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1.0×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowChapters((s) => !s)}
            className={`px-2 py-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 transition ${
              showChapters ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            {!compact && 'Chapters'}
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Theater'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Chapter Selector Drawer */}
      {showChapters && (
        <div className="px-3.5 py-2.5 bg-[#08101E] border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {lesson.chapters.map((ch, idx) => {
            const isCurrent = ch.id === activeChapter.id;
            return (
              <button
                key={ch.id}
                type="button"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                onClick={() => {
                  handleSeek(ch.startSec);
                  if (!isPlaying) {
                    if (viewLoggedRef.current !== videoId) {
                      viewLoggedRef.current = videoId;
                      onTelemetry?.({ eventType: 'view' });
                    }
                    setIsPlaying(true);
                  }
                }}
                className={`text-left p-2 rounded-lg border text-[11px] transition ${
                  isCurrent
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-[#0F1C32] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-mono tabular-nums text-[10px] text-sky-400">
                  {formatClock(ch.startSec)} · Ch {idx + 1}
                </div>
                <div className="font-semibold line-clamp-2 mt-0.5 leading-snug">
                  {language === 'ar' ? ch.titleAr : ch.titleEn}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
