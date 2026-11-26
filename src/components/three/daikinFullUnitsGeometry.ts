import * as THREE from 'three';
import { type BuiltPartAssembly, type ExplodableItem, type SubPartSpec } from './daikinPartsGeometry';

export type DaikinFullUnitId =
  | 'vrv-outdoor'
  | 'modular-ahu'
  | 'fxsq-ducted'
  | 'ewad-chiller';

export interface VrvControlState {
  powerOn: boolean;
  mode: 'cooling' | 'test-run' | 'oil-recovery';
  ambientTempC: number; // 25..52
  pcbMode: 'monitor' | 'setting';
  settingCode: '2-49' | '2-35' | '2-20';
  activeFault: 'none' | 'E3' | 'U4' | 'U3' | 'UF';
  panelCutaway: boolean;
  ds1CoolHeat: boolean;
}

export interface AhuControlState {
  powerOn: boolean;
  ddcVoltage: number; // 0..10V
  damperPercent: number; // 0..100
  heaterInterlockTest: boolean;
  doorCutaway: boolean;
}

export interface FxsqControlState {
  powerOn: boolean;
  setpointC: number; // 16..32
  espPa: 30 | 50 | 80 | 120 | 150;
  suctionMode: 'rear' | 'bottom';
  drainPumpTest: boolean;
  casingCutaway: boolean;
}

export interface ChillerControlState {
  powerOn: boolean;
  chwSetpointC: number; // 5..12
  coolingLoadPercent: number; // 25..100
  circuitA: boolean;
  circuitB: boolean;
  panelCutaway: boolean;
}

export interface FullUnitControlState {
  vrv: VrvControlState;
  ahu: AhuControlState;
  fxsq: FxsqControlState;
  chiller: ChillerControlState;
}

export const DEFAULT_FULL_UNIT_STATE: FullUnitControlState = {
  vrv: {
    powerOn: true,
    mode: 'cooling',
    ambientTempC: 43,
    pcbMode: 'monitor',
    settingCode: '2-49',
    activeFault: 'none',
    panelCutaway: false,
    ds1CoolHeat: false,
  },
  ahu: {
    powerOn: true,
    ddcVoltage: 6.5,
    damperPercent: 80,
    heaterInterlockTest: false,
    doorCutaway: true,
  },
  fxsq: {
    powerOn: true,
    setpointC: 22,
    espPa: 80,
    suctionMode: 'rear',
    drainPumpTest: false,
    casingCutaway: true,
  },
  chiller: {
    powerOn: true,
    chwSetpointC: 7,
    coolingLoadPercent: 75,
    circuitA: true,
    circuitB: true,
    panelCutaway: false,
  },
};

export interface FullUnitCatalogItem {
  id: DaikinFullUnitId;
  name: string;
  shortLabel: string;
  modelCode: string;
  category: string;
  summary: string;
  manualRef: string;
  defaultCameraPos: [number, number, number];
  defaultTarget: [number, number, number];
}

export const DAIKIN_FULL_UNITS_CATALOG: FullUnitCatalogItem[] = [
  {
    id: 'vrv-outdoor',
    name: 'Full VRV IV / VRV X Outdoor Unit',
    shortLabel: 'VRV IV/X ODU',
    modelCode: 'RXYTQ16TYF / RXQ16ARYFK',
    category: 'VRV / VRF Systems',
    summary:
      'High-ambient 52°C DB twin-fan VRV condensing unit with dual inverter scroll compressors, refrigerant-cooled A1P PCB (BS1–BS3 / DS1–DS2), and stop valve bay.',
    manualRef: 'RXYTQ Data Book & DAME VRV-IV Installation Training PPT',
    defaultCameraPos: [4.2, 2.7, 4.9],
    defaultTarget: [0, 1.35, 0],
  },
  {
    id: 'modular-ahu',
    name: 'Full Modular AHU / FAHU + EKEXV & DDC',
    shortLabel: 'Modular AHU/FAHU',
    modelCode: 'DMA-AHU + EKEXV + EKEQFCB',
    category: 'Air Handling Units (AHU)',
    summary:
      'Double-skin thermal-break modular Air Handling Unit with motorized intake damper, bag filters, DX coil, spring-isolated supply blower, siphon trap, and 0–10V EKEQFCB kit.',
    manualRef: 'DMA-IOM-15-01 Modular AHU IOM & VRV+FAHU 0-10V Diagram',
    defaultCameraPos: [4.8, 2.5, 5.2],
    defaultTarget: [0, 1.1, 0],
  },
  {
    id: 'fxsq-ducted',
    name: 'Full FXSQ Concealed Ceiling Ducted Unit',
    shortLabel: 'FXSQ Ducted IDU',
    modelCode: 'FXSQ100A2VEB + BRC1E62',
    category: 'Fan Coil Units (FCU)',
    summary:
      'Slim 245 mm ceiling concealed ducted indoor unit on 4×M10 hanger rods with selectable 30–150 Pa ESP blower, 625 mm high-lift drain pump, and BRC1E62 remote.',
    manualRef: 'FXSQ-A2VEB Installation & Operation Manual EN',
    defaultCameraPos: [4.0, 2.3, 4.4],
    defaultTarget: [0, 1.25, 0],
  },
  {
    id: 'ewad-chiller',
    name: 'Full Air-Cooled Inverter Screw Chiller',
    shortLabel: 'EWAD-TZ Chiller',
    modelCode: 'EWAD240TZSRN (Dual Circuit)',
    category: 'Air-Cooled Chillers',
    summary:
      'Dual-circuit air-cooled screw chiller on 6 seismic spring isolators with V-bank microchannel condensers, 4 axial fans, flooded evaporator barrel, and MicroTech III cabinet.',
    manualRef: 'Daikin TZD Air-Cooled Screw Chiller O&M Manual',
    defaultCameraPos: [5.4, 3.0, 5.6],
    defaultTarget: [0, 1.25, 0],
  },
];

export interface BuiltFullUnitAssembly extends BuiltPartAssembly {
  updateLiveState: (state: FullUnitControlState, dt: number, elapsed: number, isSoftwareGl: boolean) => boolean;
}

export function selectDefaultFullUnitForCourse(
  category?: string,
  moduleTitle?: string
): DaikinFullUnitId {
  const combined = `${category || ''} ${moduleTitle || ''}`.toLowerCase();
  if (combined.includes('chiller') || combined.includes('ewad') || combined.includes('chilled water')) {
    return 'ewad-chiller';
  }
  if (combined.includes('ahu') || combined.includes('fahu') || combined.includes('air handling') || combined.includes('fresh air')) {
    return 'modular-ahu';
  }
  if (combined.includes('fcu') || combined.includes('fan coil') || combined.includes('ducted') || combined.includes('fxsq') || combined.includes('fdmrn') || combined.includes('split')) {
    return 'fxsq-ducted';
  }
  return 'vrv-outdoor';
}

/* ---------- Procedural PBR Textures ---------- */

function createFinCoilTexture(maxAnisotropy: number, baseHex = '#64748b', lineHex = '#334155'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBrandDecalTexture(
  title: string,
  subtitle: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 26, 86);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.fillText(subtitle, 26, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function registerClickable(
  mesh: THREE.Mesh,
  spec: SubPartSpec,
  interactiveMeshes: THREE.Mesh[],
  subParts: SubPartSpec[]
) {
  mesh.layers.enable(1);
  mesh.userData.partSpec = spec;
  interactiveMeshes.push(mesh);
  if (!subParts.some((s) => s.id === spec.id)) {
    subParts.push(spec);
  }
}

/* ============================================================================
   1. FULL DAIKIN VRV IV / VRV X OUTDOOR UNIT (RXYTQ16TYF / RXQ16ARYFK)
============================================================================ */

function buildVrvOutdoorUnit(maxAnisotropy: number, isSoftwareGl: boolean): BuiltFullUnitAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const subParts: SubPartSpec[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Materials (varied roughness >= 0.25 across adjacent materials)
  const concreteMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 }));
  const chassisMat = track(new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.44, metalness: 0.28 }));
  const darkFrameMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.55 }));
  const compMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.34, metalness: 0.78 }));
  const copperMat = track(new THREE.MeshStandardMaterial({ color: 0xc86d42, roughness: 0.26, metalness: 0.88 }));
  const brassMat = track(new THREE.MeshStandardMaterial({ color: 0xd4a446, roughness: 0.3, metalness: 0.86 }));
  const finTex = track(createFinCoilTexture(maxAnisotropy, '#475569', '#1e293b'));
  const coilMat = track(new THREE.MeshStandardMaterial({ map: finTex, roughness: 0.5, metalness: 0.65 }));
  const fanBladeMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.3 }));
  const airflowMat = track(
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );

  // Concrete Plinth & Anti-Vibration Pads (grounded at y = 0)
  const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(2.35, 0.14, 1.35)), concreteMat);
  plinth.position.set(0, 0.07, 0);
  plinth.receiveShadow = !isSoftwareGl;
  group.add(plinth);

  const basePan = new THREE.Mesh(track(new THREE.BoxGeometry(2.05, 0.12, 1.05)), darkFrameMat);
  basePan.position.set(0, 0.2, 0);
  basePan.castShadow = !isSoftwareGl;
  group.add(basePan);

  // 4-Corner Frame Posts
  const postGeo = track(new THREE.BoxGeometry(0.08, 2.25, 0.08));
  [
    [-0.98, 1.38, 0.48],
    [0.98, 1.38, 0.48],
    [-0.98, 1.38, -0.48],
    [0.98, 1.38, -0.48],
  ].forEach(([x, y, z]) => {
    const p = new THREE.Mesh(postGeo, chassisMat);
    p.position.set(x, y, z);
    group.add(p);
  });

  // 3-Sided Wrap-Around Finned Condenser Coil (Back + Left + Right)
  const coilSpec: SubPartSpec = {
    id: 'vrv-condenser-coil',
    name: '3-Side Anti-Corrosion Condenser Heat Exchanger',
    material: 'Hydrophilic Blue-Fin Aluminum & Rifled Copper',
    spec: 'Rated up to 52°C DB High Ambient · 3-Row Micro-Fins',
    installNote: 'Maintain ≥500 mm service clearance on sides & ≥1500 mm vertical discharge above top fans.',
  };
  const backCoil = new THREE.Mesh(track(new THREE.BoxGeometry(1.88, 2.05, 0.1)), coilMat);
  backCoil.position.set(0, 1.32, -0.44);
  registerClickable(backCoil, coilSpec, interactiveMeshes, subParts);
  group.add(backCoil);

  const leftCoil = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 2.05, 0.86)), coilMat);
  leftCoil.position.set(-0.92, 1.32, 0);
  registerClickable(leftCoil, coilSpec, interactiveMeshes, subParts);
  group.add(leftCoil);

  const rightCoil = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 2.05, 0.86)), coilMat);
  rightCoil.position.set(0.92, 1.32, 0);
  registerClickable(rightCoil, coilSpec, interactiveMeshes, subParts);
  group.add(rightCoil);

  // Internal Dual Inverter Scroll Compressors + Accumulator + Oil Separator
  const compGroup = new THREE.Group();
  const compSpec: SubPartSpec = {
    id: 'vrv-scroll-comp',
    name: 'Dual Inverter Scroll Compressors (M1C / M2C)',
    material: 'Hermetic Welded Steel Shell + Crankcase Oil Heater',
    spec: 'R-410A · 6-Hour Pre-Start Crankcase Heating Mandatory',
    installNote: 'Verify 500V DC Megger ≥ 2 MΩ on disconnected motor leads; never megger inverter PCB.',
  };
  [-0.45, 0.08].forEach((cx) => {
    const body = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.72, 24)), compMat);
    body.position.set(cx, 0.64, -0.05);
    registerClickable(body, compSpec, interactiveMeshes, subParts);
    compGroup.add(body);
    const dome = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), compMat);
    dome.position.set(cx, 1.0, -0.05);
    compGroup.add(dome);
    // Copper discharge loop
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx, 1.2, -0.05),
      new THREE.Vector3(cx, 1.44, -0.18),
      new THREE.Vector3(cx + 0.24, 1.36, -0.26),
    ]);
    const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 14, 0.028, 8, false)), copperMat);
    compGroup.add(tube);
  });

  // Vertical Suction Accumulator
  const accMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.17, 0.82, 20)), darkFrameMat);
  accMesh.position.set(0.56, 0.69, -0.12);
  registerClickable(
    accMesh,
    {
      id: 'vrv-accumulator',
      name: 'Suction Accumulator & Oil Separator Assembly',
      material: 'Pressure Vessel Steel (4.15 MPa Design)',
      spec: 'Automatic 8-Hour Oil Recovery Cycle',
      installNote: 'Prevents liquid flood-back during low-load operation and defrost transitions.',
    },
    interactiveMeshes,
    subParts
  );
  compGroup.add(accMesh);
  group.add(compGroup);
  explodableItems.push({
    object: compGroup,
    basePos: compGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 0.45),
  });

  // Liquid & Gas Brass Service Stop Valves (bottom right front)
  const stopValvesGroup = new THREE.Group();
  const stopSpec: SubPartSpec = {
    id: 'vrv-stop-valves',
    name: 'Liquid & Gas Service Stop Valves + Charge Ports',
    material: 'Forged Brass Body with Flare/Braze Service Access',
    spec: '4.15 MPa N₂ Test · -100.7 kPa (500 Micron) Vacuum Ports',
    installNote: 'Keep stop valves CLOSED during 40-bar test & 2h vacuum; fully open before Test Run (t01–t10).',
  };
  [0.45, 0.68].forEach((vx, idx) => {
    const vBody = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12)), brassMat);
    vBody.position.set(vx, 0.36, 0.34);
    vBody.rotation.x = Math.PI / 2;
    registerClickable(vBody, stopSpec, interactiveMeshes, subParts);
    stopValvesGroup.add(vBody);
    const pipe = new THREE.Mesh(track(new THREE.CylinderGeometry(idx === 0 ? 0.022 : 0.036, idx === 0 ? 0.022 : 0.036, 0.24, 10)), copperMat);
    pipe.position.set(vx, 0.36, 0.46);
    pipe.rotation.x = Math.PI / 2;
    stopValvesGroup.add(pipe);
  });
  group.add(stopValvesGroup);

  // Refrigerant-Cooled A1P Main Control PCB Box with LIVE Dynamic 7-Segment CanvasTexture
  const pcbCanvas = document.createElement('canvas');
  pcbCanvas.width = 512;
  pcbCanvas.height = 320;
  const pcbCtx = pcbCanvas.getContext('2d')!;
  const pcbTex = track(new THREE.CanvasTexture(pcbCanvas));
  pcbTex.colorSpace = THREE.SRGBColorSpace;
  pcbTex.anisotropy = maxAnisotropy;

  const pcbBoxGroup = new THREE.Group();
  const pcbBacking = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 0.62, 0.14)), darkFrameMat);
  pcbBacking.position.set(-0.22, 1.72, 0.24);
  pcbBoxGroup.add(pcbBacking);

  const pcbFaceMat = track(new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.35, metalness: 0.1 }));
  const pcbFace = new THREE.Mesh(track(new THREE.PlaneGeometry(0.86, 0.56)), pcbFaceMat);
  pcbFace.position.set(-0.22, 1.72, 0.315);
  registerClickable(
    pcbFace,
    {
      id: 'vrv-a1p-pcb',
      name: 'Refrigerant-Cooled A1P Control PCB (SEG1–SEG3 / BS1–BS3)',
      material: 'Conformal-Coated PCB on Liquid-Line Cooling Plate',
      spec: 'BS1 Mode · BS2 Set · BS3 Return · DS1/DS2 DIP Switches',
      installNote: 'Hold BS1 5s for Mode 2 settings ([2-49] 90m height). Hold BS2 5s for mandatory Test Run.',
    },
    interactiveMeshes,
    subParts
  );
  pcbBoxGroup.add(pcbFace);
  group.add(pcbBoxGroup);
  explodableItems.push({
    object: pcbBoxGroup,
    basePos: pcbBoxGroup.position.clone(),
    explodeOffset: new THREE.Vector3(-0.35, 0.25, 0.65),
  });

  // Top Shroud Deck + Twin Spinning Top-Discharge Propeller Fans + Airflow Rings
  const topDeck = new THREE.Mesh(track(new THREE.BoxGeometry(2.06, 0.18, 1.06)), chassisMat);
  topDeck.position.set(0, 2.48, 0);
  group.add(topDeck);

  const fanRotors: THREE.Group[] = [];
  const airflowRings: THREE.Mesh[] = [];
  const fanSpec: SubPartSpec = {
    id: 'vrv-top-fans',
    name: 'Twin High-Static DC Inverter Propeller Fans',
    material: 'Glass-Reinforced Polymer Aero-Blades + Steel Grille',
    spec: 'Up to 78 Pa External Static Pressure · Variable RPM',
    installNote: 'Install discharge duct hood if louvers restrict top exhaust above 52°C ambient.',
  };

  [-0.5, 0.5].forEach((fx) => {
    const shroud = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.44, 0.22, 24, 1, true)), darkFrameMat);
    shroud.position.set(fx, 2.62, 0);
    registerClickable(shroud, fanSpec, interactiveMeshes, subParts);
    group.add(shroud);

    const rotor = new THREE.Group();
    rotor.position.set(fx, 2.6, 0);
    const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16)), darkFrameMat);
    rotor.add(hub);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.02, 0.14)), fanBladeMat);
      const angle = (b * Math.PI * 2) / 3;
      blade.position.set(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2);
      blade.rotation.y = -angle;
      blade.rotation.x = 0.32;
      rotor.add(blade);
    }
    group.add(rotor);
    fanRotors.push(rotor);

    // Rising condenser discharge airflow indicator ring
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.32, 0.014, 8, 28)), airflowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(fx, 2.85, 0);
    group.add(ring);
    airflowRings.push(ring);
  });

  // Removable Front Service Panels (Upper + Lower Cutaway Panels)
  const frontPanelGroup = new THREE.Group();
  const brandTex = track(createBrandDecalTexture('DAIKIN', 'VRV IV / VRV X · R-410A', maxAnisotropy));
  const upperPanel = new THREE.Mesh(track(new THREE.BoxGeometry(1.94, 1.08, 0.05)), chassisMat);
  upperPanel.position.set(0, 1.84, 0.51);
  frontPanelGroup.add(upperPanel);

  const badgePlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.95, 0.3)),
    track(new THREE.MeshStandardMaterial({ map: brandTex, roughness: 0.35, metalness: 0.15 }))
  );
  badgePlane.position.set(0, 1.92, 0.538);
  frontPanelGroup.add(badgePlane);

  const lowerPanel = new THREE.Mesh(track(new THREE.BoxGeometry(1.94, 1.02, 0.05)), chassisMat);
  lowerPanel.position.set(0, 0.77, 0.51);
  registerClickable(
    lowerPanel,
    {
      id: 'vrv-front-panel',
      name: 'Removable Front Compressor & PCB Service Panel',
      material: 'Galvanized Powder-Coated Weatherproof Steel',
      spec: 'Toggle Service Cutaway to inspect A1P PCB & Scroll Compressors',
      installNote: 'Keep panel tightly fastened during operation to maintain condenser coil airflow static pressure.',
    },
    interactiveMeshes,
    subParts
  );
  frontPanelGroup.add(lowerPanel);
  group.add(frontPanelGroup);
  explodableItems.push({
    object: frontPanelGroup,
    basePos: frontPanelGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 1.15),
  });

  // Redraw 3D A1P PCB CanvasTexture only when VRV state key changes
  let lastPcbSig = '';
  const redrawPcbTexture = (v: VrvControlState) => {
    const sig = `${v.powerOn}|${v.mode}|${v.pcbMode}|${v.settingCode}|${v.activeFault}|${v.ds1CoolHeat}|${v.ambientTempC}`;
    if (sig === lastPcbSig) return;
    lastPcbSig = sig;

    pcbCtx.fillStyle = '#064e3b';
    pcbCtx.fillRect(0, 0, 512, 320);
    pcbCtx.strokeStyle = '#34d399';
    pcbCtx.lineWidth = 6;
    pcbCtx.strokeRect(8, 8, 496, 304);

    pcbCtx.fillStyle = '#a7f3d0';
    pcbCtx.font = '700 20px "IBM Plex Mono", monospace';
    pcbCtx.fillText('DAIKIN A1P MAIN PCB · SEG1-SEG3', 26, 44);

    // 7-Segment Display Window
    pcbCtx.fillStyle = '#090d16';
    pcbCtx.fillRect(26, 64, 240, 118);
    pcbCtx.strokeStyle = '#475569';
    pcbCtx.lineWidth = 3;
    pcbCtx.strokeRect(26, 64, 240, 118);

    const displayVal = !v.powerOn
      ? 'OFF'
      : v.activeFault !== 'none'
      ? v.activeFault
      : v.pcbMode === 'setting'
      ? v.settingCode
      : v.mode === 'test-run'
      ? 't04'
      : v.mode === 'oil-recovery'
      ? 'OIL'
      : `${v.ambientTempC}C`;

    pcbCtx.fillStyle = !v.powerOn ? '#334155' : v.activeFault !== 'none' ? '#ef4444' : '#f97316';
    pcbCtx.font = '700 76px "IBM Plex Mono", monospace';
    pcbCtx.fillText(displayVal, 52, 148);

    // LEDs H1P-H4P
    const leds = [
      { label: 'H1P MODE', on: v.powerOn && v.pcbMode === 'setting', color: '#fbbf24' },
      { label: 'H2P FAULT', on: v.powerOn && v.activeFault !== 'none', color: '#ef4444' },
      { label: 'H3P TEST', on: v.powerOn && v.mode === 'test-run', color: '#38bdf8' },
      { label: 'DS1 C/H', on: v.ds1CoolHeat, color: '#34d399' },
    ];
    leds.forEach((l, i) => {
      const y = 84 + i * 32;
      pcbCtx.fillStyle = l.on ? l.color : '#1e293b';
      pcbCtx.beginPath();
      pcbCtx.arc(304, y, 10, 0, Math.PI * 2);
      pcbCtx.fill();
      pcbCtx.fillStyle = '#e2e8f0';
      pcbCtx.font = '600 17px "IBM Plex Mono", monospace';
      pcbCtx.fillText(l.label, 324, y + 6);
    });

    // BS1 / BS2 / BS3 Buttons
    ['BS1 MODE', 'BS2 SET', 'BS3 RET'].forEach((b, i) => {
      const x = 26 + i * 158;
      pcbCtx.fillStyle = i === 0 && v.pcbMode === 'setting' ? '#f59e0b' : '#1e293b';
      pcbCtx.fillRect(x, 214, 140, 68);
      pcbCtx.strokeStyle = '#94a3b8';
      pcbCtx.lineWidth = 2;
      pcbCtx.strokeRect(x, 214, 140, 68);
      pcbCtx.fillStyle = i === 0 && v.pcbMode === 'setting' ? '#090d16' : '#f8fafc';
      pcbCtx.font = '700 20px "IBM Plex Mono", monospace';
      pcbCtx.fillText(b, x + 20, 256);
    });

    pcbTex.needsUpdate = true;
  };

  redrawPcbTexture(DEFAULT_FULL_UNIT_STATE.vrv);

  let cutawaySlide = 0;

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts,
    disposables,
    updateLiveState: (fullState, dt, elapsed, isSoft) => {
      const v = fullState.vrv;
      redrawPcbTexture(v);

      // Cutaway panel smoothly slides aside & up
      const targetSlide = v.panelCutaway ? 1 : 0;
      cutawaySlide = isSoft ? targetSlide : THREE.MathUtils.damp(cutawaySlide, targetSlide, 6.5, dt);
      frontPanelGroup.position.x = cutawaySlide * 2.15;
      frontPanelGroup.visible = cutawaySlide < 0.96;

      const fansRunning = v.powerOn && v.activeFault === 'none';
      const speedFactor = 2.6 + ((v.ambientTempC - 25) / 27) * 5.2;

      fanRotors.forEach((r, idx) => {
        if (fansRunning) {
          r.rotation.y += dt * speedFactor * (idx === 0 ? 1 : -1);
        }
      });

      airflowRings.forEach((ring, idx) => {
        ring.visible = fansRunning;
        if (fansRunning) {
          const cycle = (elapsed * 0.9 + idx * 0.45) % 1;
          ring.position.y = 2.75 + cycle * 0.95;
          ring.scale.setScalar(0.85 + cycle * 0.35);
          (ring.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.55;
        }
      });

      return fansRunning || Math.abs(cutawaySlide - targetSlide) > 0.004;
    },
  };
}

/* ============================================================================
   2. FULL MODULAR AHU / FAHU + EKEXV + EKEQFCB + DDC
============================================================================ */

function buildModularAhuUnit(maxAnisotropy: number, isSoftwareGl: boolean): BuiltFullUnitAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const subParts: SubPartSpec[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const skidMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.7 }));
  const panelMat = track(new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.45, metalness: 0.25 }));
  const stripeMat = track(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2 }));
  const damperMat = track(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.38, metalness: 0.72 }));
  const coilTex = track(createFinCoilTexture(maxAnisotropy, '#0ea5e9', '#0369a1'));
  const dxCoilMat = track(new THREE.MeshStandardMaterial({ map: coilTex, roughness: 0.4, metalness: 0.6 }));
  const springMat = track(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.32, metalness: 0.55 }));
  const copperMat = track(new THREE.MeshStandardMaterial({ color: 0xc86d42, roughness: 0.28, metalness: 0.88 }));
  const waterMat = track(new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.78 }));
  const heaterMat = track(new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0x000000, roughness: 0.4, metalness: 0.7 }));

  // Base C-Channel Skid Frame grounded at y = 0
  const skid = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 0.16, 1.48)), skidMat);
  skid.position.set(0, 0.08, 0);
  skid.receiveShadow = !isSoftwareGl;
  group.add(skid);

  // Back, Top, Bottom Insulated Thermal-Break Shell (40/60mm)
  const floorPanel = new THREE.Mesh(track(new THREE.BoxGeometry(3.66, 0.07, 1.38)), panelMat);
  floorPanel.position.set(0, 0.2, 0);
  group.add(floorPanel);

  const roofPanel = new THREE.Mesh(track(new THREE.BoxGeometry(3.66, 0.08, 1.4)), panelMat);
  roofPanel.position.set(0, 1.88, 0);
  group.add(roofPanel);

  const roofStripe = new THREE.Mesh(track(new THREE.BoxGeometry(3.68, 0.09, 0.06)), stripeMat);
  roofStripe.position.set(0, 1.88, 0.7);
  group.add(roofStripe);

  const backWall = new THREE.Mesh(track(new THREE.BoxGeometry(3.66, 1.62, 0.07)), panelMat);
  backWall.position.set(0, 1.04, -0.66);
  group.add(backWall);

  // Motorized Multi-Blade Fresh Air Intake Damper (Left Inlet)
  const damperGroup = new THREE.Group();
  const damperFrame = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 1.36, 1.2)), skidMat);
  damperFrame.position.set(-1.82, 1.04, 0);
  damperGroup.add(damperFrame);

  const damperBlades: THREE.Mesh[] = [];
  const damperSpec: SubPartSpec = {
    id: 'ahu-damper',
    name: 'Motorized Fresh Air Intake Damper + End-Switch',
    material: 'Extruded Aluminum Opposed Blades + 24V Actuator',
    spec: 'Interlocked End-Switch Required Prior to Fan & VRV Enable',
    installNote: 'Adjust Intake Damper Angle slider (0–100%) to inspect live blade modulation.',
  };
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.025, 1.12)), damperMat);
    blade.position.set(-1.82, 0.48 + i * 0.22, 0);
    registerClickable(blade, damperSpec, interactiveMeshes, subParts);
    damperGroup.add(blade);
    damperBlades.push(blade);
  }
  group.add(damperGroup);

  // Pre-Filter + V-Bank Bag Filter Section
  const filterGroup = new THREE.Group();
  const filterMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 1.38, 1.16)),
    track(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88, metalness: 0.04 }))
  );
  filterMesh.position.set(-1.28, 1.04, 0);
  registerClickable(
    filterMesh,
    {
      id: 'ahu-filters',
      name: 'G4 Pre-Filter & F7 Bag Filter Bank',
      material: 'Synthetic Pleated Media in Galvanized Holding Frames',
      spec: 'Zero Air Bypass Seal · Differential Pressure Switch Monitored',
      installNote: 'Verify filter clips are locked tight before start-up to prevent coil fouling.',
    },
    interactiveMeshes,
    subParts
  );
  filterGroup.add(filterMesh);
  group.add(filterGroup);

  // DX Cooling Coil + Stainless Sloped Condensate Pan + Transparent Siphon U-Trap
  const coilMesh = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 1.34, 1.16)), dxCoilMat);
  coilMesh.position.set(-0.46, 1.06, 0);
  registerClickable(
    coilMesh,
    {
      id: 'ahu-dx-coil',
      name: 'VRV Direct Expansion (DX) Cooling Coil + R2T/R3T Sensors',
      material: 'Copper Header & Hydrophilic Aluminum Fins',
      spec: 'Driven by EKEXV Kit · 0–10V DC X-Control Capacity Ramp',
      installNote: 'Mount R2T liquid & R3T gas thermistors tightly with thermal paste and aluminum tape.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(coilMesh);

  // Siphon U-Trap protruding front-right of coil pan
  const trapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 0.34, 0.52),
    new THREE.Vector3(-0.46, 0.34, 0.88),
    new THREE.Vector3(-0.46, 0.05, 0.88),
    new THREE.Vector3(-0.18, 0.05, 0.88),
    new THREE.Vector3(-0.18, 0.22, 0.88),
    new THREE.Vector3(0.12, 0.2, 0.88),
  ]);
  const trapMesh = new THREE.Mesh(track(new THREE.TubeGeometry(trapCurve, 24, 0.045, 10, false)), waterMat);
  registerClickable(
    trapMesh,
    {
      id: 'ahu-siphon-trap',
      name: 'Negative-Pressure Condensate Siphon Trap',
      material: 'Clear Inspection PVC U-Trap (Water-Sealed)',
      spec: 'Trap Depth H ≥ Max Fan Static Head (mmWG) + 50 mm',
      installNote: 'Prime siphon trap with clean water before start-up to prevent negative-pressure air draw.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(trapMesh);

  // Electric Heater Bank (Glows amber unless Interlock Test trips it)
  const heaterGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const rod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 1.12, 10)), heaterMat);
    rod.position.set(0.16, 0.56 + i * 0.3, 0);
    rod.rotation.x = Math.PI / 2;
    registerClickable(
      rod,
      {
        id: 'ahu-heater',
        name: 'Electric Reheat Bank & High-Limit Safety Cutout',
        material: 'Finned Stainless Tubular Heating Elements',
        spec: 'Mandatory Airflow DPS Interlock + Manual Reset High-Limit',
        installNote: 'Test high-limit safety cutout with supply fan OFF per AHU Commissioning Sheet.',
      },
      interactiveMeshes,
      subParts
    );
    heaterGroup.add(rod);
  }
  group.add(heaterGroup);

  // Centrifugal Supply Fan Blower on 4 Yellow Spring Vibration Isolators
  const fanAssembly = new THREE.Group();
  const fanDeck = new THREE.Mesh(track(new THREE.BoxGeometry(1.02, 0.08, 1.05)), skidMat);
  fanDeck.position.set(1.06, 0.42, 0);
  fanAssembly.add(fanDeck);

  [
    [0.64, 0.31, -0.4],
    [1.48, 0.31, -0.4],
    [0.64, 0.31, 0.4],
    [1.48, 0.31, 0.4],
  ].forEach(([sx, sy, sz]) => {
    const spr = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12)), springMat);
    spr.position.set(sx, sy, sz);
    fanAssembly.add(spr);
  });

  const blowerWheel = new THREE.Group();
  blowerWheel.position.set(1.06, 1.04, 0);
  const wheelRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.42, 0.045, 10, 24)), stripeMat);
  blowerWheel.add(wheelRing);
  const wheelHub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.12, 0.52, 16)), skidMat);
  wheelHub.rotation.x = Math.PI / 2;
  blowerWheel.add(wheelHub);
  for (let b = 0; b < 8; b++) {
    const vane = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.03, 0.52)), damperMat);
    const a = (b * Math.PI * 2) / 8;
    vane.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0);
    vane.rotation.z = a + 0.45;
    registerClickable(
      vane,
      {
        id: 'ahu-supply-fan',
        name: 'Belt-Driven Centrifugal Supply Fan on Spring Isolators',
        material: 'Galvanized Impeller + Anti-Vibration Spring Mounts',
        spec: 'Unlock Shipping Bolts · Laser Pulley Alignment · Star-Delta / VFD',
        installNote: 'Verify free hand rotation & direction arrow; never run fan with doors open.',
      },
      interactiveMeshes,
      subParts
    );
    blowerWheel.add(vane);
  }
  fanAssembly.add(blowerWheel);
  group.add(fanAssembly);
  explodableItems.push({
    object: fanAssembly,
    basePos: fanAssembly.position.clone(),
    explodeOffset: new THREE.Vector3(0.45, 0.3, 0.55),
  });

  // Side-Mounted EKEXV Valve + EKEQFCB 0-10V DDC Control Box (Live Dynamic CanvasTexture!)
  const ekeqCanvas = document.createElement('canvas');
  ekeqCanvas.width = 512;
  ekeqCanvas.height = 256;
  const ekeqCtx = ekeqCanvas.getContext('2d')!;
  const ekeqTex = track(new THREE.CanvasTexture(ekeqCanvas));
  ekeqTex.colorSpace = THREE.SRGBColorSpace;
  ekeqTex.anisotropy = maxAnisotropy;

  const ctrlBoxGroup = new THREE.Group();
  const ctrlBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.76, 0.52, 0.24)), skidMat);
  ctrlBox.position.set(-0.55, 1.32, 0.86);
  ctrlBoxGroup.add(ctrlBox);

  const ctrlScreen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.68, 0.44)),
    track(new THREE.MeshStandardMaterial({ map: ekeqTex, roughness: 0.3, metalness: 0.1 }))
  );
  ctrlScreen.position.set(-0.55, 1.32, 0.985);
  registerClickable(
    ctrlScreen,
    {
      id: 'ahu-ekeqfcb',
      name: 'EKEQFCBAV3 Control Box + EKEXV Expansion Valve Kit',
      material: 'IP54 Enclosure + 480-Step Electronic Expansion Valve',
      spec: '0–10V DC Linear ΔT Control (5V Hold · 5.5–10V Step Up)',
      installNote: 'Separate 230V AC power from F1/F2 & Y1/Y2 0-10V control cables by ≥50 mm.',
    },
    interactiveMeshes,
    subParts
  );
  ctrlBoxGroup.add(ctrlScreen);

  // EKEXV Valve Pipe Stub next to EKEQFCB
  const ekexvPipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12)), copperMat);
  ekexvPipe.position.set(-1.12, 1.24, 0.82);
  ctrlBoxGroup.add(ekexvPipe);
  const ekexvCoilHead = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.22, 0.18)), stripeMat);
  ekexvCoilHead.position.set(-1.12, 1.5, 0.82);
  ctrlBoxGroup.add(ekexvCoilHead);
  group.add(ctrlBoxGroup);
  explodableItems.push({
    object: ctrlBoxGroup,
    basePos: ctrlBoxGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.3, 0.65),
  });

  // Animated Supply Airflow Chevrons inside AHU
  const airflowDots: THREE.Mesh[] = [];
  const airDotGeo = track(new THREE.ConeGeometry(0.08, 0.22, 10));
  airDotGeo.rotateZ(-Math.PI / 2);
  const airDotMat = track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }));
  for (let i = 0; i < 6; i++) {
    const arrow = new THREE.Mesh(airDotGeo, airDotMat);
    arrow.position.set(-1.6 + i * 0.6, 1.05 + (i % 2 === 0 ? 0.22 : -0.22), 0.12);
    group.add(arrow);
    airflowDots.push(arrow);
  }

  // Front Inspection Doors (Cutaway Panel)
  const frontDoors = new THREE.Group();
  const doorMesh = new THREE.Mesh(track(new THREE.BoxGeometry(3.64, 1.56, 0.06)), panelMat);
  doorMesh.position.set(0, 1.04, 0.68);
  frontDoors.add(doorMesh);
  [-1.05, 0.1, 1.15].forEach((px) => {
    const porthole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20)), skidMat);
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(px, 1.18, 0.68);
    frontDoors.add(porthole);
  });
  group.add(frontDoors);
  explodableItems.push({
    object: frontDoors,
    basePos: frontDoors.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 1.25),
  });

  let lastEkeqSig = '';
  const redrawEkeq = (a: AhuControlState) => {
    const sig = `${a.powerOn}|${a.ddcVoltage.toFixed(1)}|${a.damperPercent}|${a.heaterInterlockTest}`;
    if (sig === lastEkeqSig) return;
    lastEkeqSig = sig;

    const band = !a.powerOn
      ? 'STANDBY'
      : a.heaterInterlockTest
      ? 'INTERLOCK TRIP'
      : a.ddcVoltage < 4.6
      ? 'STEP DOWN'
      : a.ddcVoltage <= 5.4
      ? '5V HOLD'
      : 'STEP UP COOL';
    const supplyTemp = (24 - (a.ddcVoltage / 10) * 10.2).toFixed(1);

    ekeqCtx.fillStyle = '#090d16';
    ekeqCtx.fillRect(0, 0, 512, 256);
    ekeqCtx.strokeStyle = a.heaterInterlockTest ? '#ef4444' : '#38bdf8';
    ekeqCtx.lineWidth = 6;
    ekeqCtx.strokeRect(8, 8, 496, 240);

    ekeqCtx.fillStyle = '#94a3b8';
    ekeqCtx.font = '700 20px "IBM Plex Mono", monospace';
    ekeqCtx.fillText('EKEQFCB · 0-10V X-CONTROL', 24, 46);

    ekeqCtx.fillStyle = a.heaterInterlockTest ? '#ef4444' : '#38bdf8';
    ekeqCtx.font = '700 62px "IBM Plex Mono", monospace';
    ekeqCtx.fillText(`${a.ddcVoltage.toFixed(1)} V`, 24, 128);

    ekeqCtx.fillStyle = '#fbbf24';
    ekeqCtx.font = '700 26px "IBM Plex Mono", monospace';
    ekeqCtx.fillText(band, 250, 118);

    ekeqCtx.fillStyle = '#34d399';
    ekeqCtx.font = '600 22px "IBM Plex Mono", monospace';
    ekeqCtx.fillText(`SUPPLY: ${supplyTemp} °C  ·  DAMPER: ${a.damperPercent}%`, 24, 206);

    ekeqTex.needsUpdate = true;
  };
  redrawEkeq(DEFAULT_FULL_UNIT_STATE.ahu);

  let doorSlide = 1;
  let currentDamperRad = 0;

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts,
    disposables,
    updateLiveState: (fullState, dt, elapsed, isSoft) => {
      const a = fullState.ahu;
      redrawEkeq(a);

      const targetDoor = a.doorCutaway ? 1 : 0;
      doorSlide = isSoft ? targetDoor : THREE.MathUtils.damp(doorSlide, targetDoor, 6.5, dt);
      frontDoors.position.y = doorSlide * 2.15;
      frontDoors.visible = doorSlide < 0.94;

      // Damper blades rotate from 90 deg (closed) to 0 deg (open)
      const targetDamperRad = ((100 - a.damperPercent) / 100) * (Math.PI / 2.2);
      currentDamperRad = isSoft ? targetDamperRad : THREE.MathUtils.damp(currentDamperRad, targetDamperRad, 8, dt);
      damperBlades.forEach((b) => {
        b.rotation.z = currentDamperRad;
      });

      const fanActive = a.powerOn && !a.heaterInterlockTest && a.damperPercent > 5;
      const fanSpeed = 2.0 + (a.ddcVoltage / 10) * 6.5;
      if (fanActive) {
        blowerWheel.rotation.z -= dt * fanSpeed;
      }

      // Heater bank subtle glow when active & not tripped
      if (a.powerOn && !a.heaterInterlockTest && a.ddcVoltage < 4.5) {
        heaterMat.emissive.setHex(0xd97706);
        heaterMat.emissiveIntensity = 0.55;
      } else {
        heaterMat.emissive.setHex(0x000000);
        heaterMat.emissiveIntensity = 0;
      }

      // Animate airflow arrows left -> right
      airflowDots.forEach((arrow, i) => {
        arrow.visible = fanActive;
        if (fanActive) {
          const t = ((elapsed * (0.35 + (a.ddcVoltage / 10) * 0.45) + i / airflowDots.length) % 1);
          arrow.position.x = -1.65 + t * 3.4;
        }
      });

      return (
        fanActive ||
        Math.abs(doorSlide - targetDoor) > 0.004 ||
        Math.abs(currentDamperRad - targetDamperRad) > 0.004
      );
    },
  };
}

/* ============================================================================
   3. FULL FXSQ CONCEALED CEILING DUCTED INDOOR UNIT (FXSQ100A2VEB + BRC1E62)
============================================================================ */

function buildFxsqDuctedUnit(maxAnisotropy: number, isSoftwareGl: boolean): BuiltFullUnitAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const subParts: SubPartSpec[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const galvMat = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.42, metalness: 0.72 }));
  const darkMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 }));
  const rodMat = track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.9 }));
  const coilTex = track(createFinCoilTexture(maxAnisotropy, '#38bdf8', '#0284c7'));
  const vCoilMat = track(new THREE.MeshStandardMaterial({ map: coilTex, roughness: 0.42, metalness: 0.6 }));
  const brassMat = track(new THREE.MeshStandardMaterial({ color: 0xd4a446, roughness: 0.28, metalness: 0.88 }));
  const pvcMat = track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.08, transparent: true, opacity: 0.62 }));
  const waterMat = track(new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.1 }));

  // Overhead Reference Ceiling Frame (so suspended unit reads clearly grounded in space)
  const ceilingBarMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75, metalness: 0.3 }));
  const ceilingSlab = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.08, 2.0)), ceilingBarMat);
  ceilingSlab.position.set(0, 2.42, 0);
  group.add(ceilingSlab);

  // 4 × M10 Threaded Suspension Hanger Rods
  const rodSpec: SubPartSpec = {
    id: 'fxsq-m10-rods',
    name: '4 × M10 Suspension Hanger Rods + Double Lock Nuts',
    material: 'Zinc-Plated Threaded Steel Rod (M10)',
    spec: 'Level Tolerance ≤ 1 mm/m · Double Nut & Washer Lockup',
    installNote: 'Level unit strictly with spirit level so condensate drains toward the built-in pump.',
  };
  [
    [-1.18, 1.82, -0.58],
    [1.18, 1.82, -0.58],
    [-1.18, 1.82, 0.58],
    [1.18, 1.82, 0.58],
  ].forEach(([rx, ry, rz]) => {
    const rod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.024, 0.024, 1.15, 10)), rodMat);
    rod.position.set(rx, ry, rz);
    registerClickable(rod, rodSpec, interactiveMeshes, subParts);
    group.add(rod);
  });

  // Main Slim 245mm Galvanized Casing Base & Sides
  const bodyBase = new THREE.Mesh(track(new THREE.BoxGeometry(2.45, 0.07, 1.28)), galvMat);
  bodyBase.position.set(0, 1.02, 0);
  bodyBase.castShadow = !isSoftwareGl;
  group.add(bodyBase);

  const leftSide = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.52, 1.28)), galvMat);
  leftSide.position.set(-1.2, 1.28, 0);
  group.add(leftSide);

  const rightSide = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.52, 1.28)), galvMat);
  rightSide.position.set(1.2, 1.28, 0);
  group.add(rightSide);

  // Front Supply Air Duct Flange Collar
  const supplyFlange = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.42, 0.16)), darkMat);
  supplyFlange.position.set(0, 1.28, 0.7);
  group.add(supplyFlange);

  // Convertible Rear / Bottom Return Suction Plenum Baffle
  const suctionPlate = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.4, 0.05)), darkMat);
  suctionPlate.position.set(0, 1.28, -0.66);
  registerClickable(
    suctionPlate,
    {
      id: 'fxsq-suction-plenum',
      name: 'Convertible Rear / Bottom Return Air Suction Plenum',
      material: 'Galvanized Steel Chamber Plate + Washable Filter Rail',
      spec: 'Field-Switchable Rear vs. Bottom Return Air Intake',
      installNote: 'Relocate bottom cover plate & filter slide rail when converting to bottom return.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(suctionPlate);

  // Internal V-Shaped DX Evaporator Coil
  const evapCoil = new THREE.Mesh(track(new THREE.BoxGeometry(2.02, 0.36, 0.42)), vCoilMat);
  evapCoil.position.set(0, 1.28, 0.28);
  evapCoil.rotation.x = 0.42;
  registerClickable(
    evapCoil,
    {
      id: 'fxsq-evap-coil',
      name: 'Slanted Multi-Row DX Evaporator Coil & Drain Pan',
      material: 'Hydrophilic Finned Aluminum + Insulated Molded Pan',
      spec: 'R-410A Flare Connections · Torque 14–61 Nm Dual-Wrench',
      installNote: 'Leave ≥450×450 mm bottom access hatch for coil & drain pan cleaning.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(evapCoil);

  // Dual DC Centrifugal Sirocco Blowers
  const siroccoDrums: THREE.Group[] = [];
  const fanSpec: SubPartSpec = {
    id: 'fxsq-dc-blower',
    name: 'DC Inverter Sirocco Blower Assembly (30–150 Pa ESP)',
    material: 'Forward-Curved Centrifugal Drums + Brushless DC Motor',
    spec: 'Selectable ESP: 30 / 50 / 80 / 120 / 150 Pa via BRC1E62',
    installNote: 'Use Auto Airflow Adjustment (Mode 13-06) to match site duct resistance within ±10%.',
  };
  [-0.58, 0.58].forEach((bx) => {
    const drum = new THREE.Group();
    drum.position.set(bx, 1.28, -0.22);
    const cyl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.18, 0.46, 18)), darkMat);
    cyl.rotation.z = Math.PI / 2;
    registerClickable(cyl, fanSpec, interactiveMeshes, subParts);
    drum.add(cyl);
    for (let k = 0; k < 6; k++) {
      const fin = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.025, 0.04)), rodMat);
      const a = (k * Math.PI * 2) / 6;
      fin.position.set(0, Math.cos(a) * 0.18, Math.sin(a) * 0.18);
      drum.add(fin);
    }
    group.add(drum);
    siroccoDrums.push(drum);
  });

  // Built-In 625 mm High-Lift Drain Pump & Rising PVC Line (Right Side)
  const drainPumpGroup = new THREE.Group();
  const pumpBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.24, 0.28)), darkMat);
  pumpBox.position.set(1.36, 1.15, 0.26);
  registerClickable(
    pumpBox,
    {
      id: 'fxsq-drain-pump',
      name: 'Built-In 625 mm High-Lift Condensate Drain Pump & Float',
      material: 'Submersible Centrifugal Pump + Float Level Switch',
      spec: 'Max Vertical Lift 625 mm (≤300 mm Horizontal Offset) · 1:100 Slope',
      installNote: 'Pour 1 L test water into pan and trigger Drain Pump Test to confirm lift & shutoff.',
    },
    interactiveMeshes,
    subParts
  );
  drainPumpGroup.add(pumpBox);

  const risePipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.045, 0.92, 12)), pvcMat);
  risePipe.position.set(1.58, 1.56, 0.26);
  drainPumpGroup.add(risePipe);

  const waterColumn = new THREE.Mesh(track(new THREE.CylinderGeometry(0.028, 0.028, 0.88, 10)), waterMat);
  waterColumn.position.set(1.58, 1.16, 0.26);
  drainPumpGroup.add(waterColumn);

  // Brass Flare Liquid & Gas Connections
  [0.08, -0.14].forEach((fz) => {
    const nut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6)), brassMat);
    nut.rotation.z = Math.PI / 2;
    nut.position.set(1.32, 1.24, fz);
    drainPumpGroup.add(nut);
  });
  group.add(drainPumpGroup);

  // Interactive 3D BRC1E62 Navigation Wired Remote Controller (Front-Left Stand)
  const brcCanvas = document.createElement('canvas');
  brcCanvas.width = 384;
  brcCanvas.height = 384;
  const brcCtx = brcCanvas.getContext('2d')!;
  const brcTex = track(new THREE.CanvasTexture(brcCanvas));
  brcTex.colorSpace = THREE.SRGBColorSpace;
  brcTex.anisotropy = maxAnisotropy;

  const brcGroup = new THREE.Group();
  const brcHousing = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.68, 0.68, 0.1)),
    track(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.1 }))
  );
  brcHousing.position.set(-1.58, 0.42, 0.56);
  brcGroup.add(brcHousing);

  const brcScreen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.58, 0.58)),
    track(new THREE.MeshStandardMaterial({ map: brcTex, roughness: 0.28, metalness: 0.05 }))
  );
  brcScreen.position.set(-1.58, 0.42, 0.615);
  registerClickable(
    brcScreen,
    {
      id: 'fxsq-brc1e62',
      name: 'BRC1E62 Navigation Wired Remote Controller (P1 / P2)',
      material: 'Backlit Dot-Matrix LCD Wall Controller',
      spec: '2-Core Non-Polar P1/P2 · Main/Sub Dual-Remote Capable',
      installNote: 'Adjust Setpoint °C and ESP (30–150 Pa) in the dock to inspect live remote & blower response.',
    },
    interactiveMeshes,
    subParts
  );
  brcGroup.add(brcScreen);
  group.add(brcGroup);

  // Removable Top Inspection Casing Lid (Cutaway)
  const topLid = new THREE.Mesh(track(new THREE.BoxGeometry(2.46, 0.06, 1.28)), galvMat);
  topLid.position.set(0, 1.56, 0);
  group.add(topLid);
  explodableItems.push({
    object: topLid,
    basePos: topLid.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.72, 0),
  });

  // Animated Supply Airflow Indicators out Front Collar
  const airCones: THREE.Mesh[] = [];
  const coneGeo = track(new THREE.ConeGeometry(0.065, 0.2, 10));
  coneGeo.rotateX(Math.PI / 2);
  const coneMat = track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }));
  [-0.65, 0, 0.65].forEach((ax) => {
    const c = new THREE.Mesh(coneGeo, coneMat);
    c.position.set(ax, 1.28, 0.95);
    group.add(c);
    airCones.push(c);
  });

  let lastBrcSig = '';
  const redrawBrc = (f: FxsqControlState) => {
    const sig = `${f.powerOn}|${f.setpointC}|${f.espPa}|${f.suctionMode}|${f.drainPumpTest}`;
    if (sig === lastBrcSig) return;
    lastBrcSig = sig;

    brcCtx.fillStyle = '#e2e8f0';
    brcCtx.fillRect(0, 0, 384, 384);
    brcCtx.fillStyle = f.powerOn ? '#0c4a6e' : '#1e293b';
    brcCtx.fillRect(24, 24, 336, 224);

    brcCtx.fillStyle = '#38bdf8';
    brcCtx.font = '700 22px "IBM Plex Mono", monospace';
    brcCtx.fillText(f.powerOn ? 'COOL · AUTO' : 'UNIT OFF', 44, 66);

    brcCtx.fillStyle = '#ffffff';
    brcCtx.font = '700 84px "IBM Plex Mono", monospace';
    brcCtx.fillText(`${f.setpointC}°C`, 44, 158);

    brcCtx.fillStyle = '#bae6fd';
    brcCtx.font = '600 22px "IBM Plex Mono", monospace';
    brcCtx.fillText(`ESP: ${f.espPa} Pa · ${f.suctionMode.toUpperCase()}`, 44, 212);

    // Power LED & Buttons
    brcCtx.fillStyle = f.powerOn ? '#10b981' : '#64748b';
    brcCtx.beginPath();
    brcCtx.arc(312, 314, 22, 0, Math.PI * 2);
    brcCtx.fill();

    brcCtx.fillStyle = '#334155';
    brcCtx.font = '700 20px "IBM Plex Mono", monospace';
    brcCtx.fillText(f.drainPumpTest ? 'PUMP TEST ON' : 'BRC1E62 P1/P2', 30, 322);

    brcTex.needsUpdate = true;
  };
  redrawBrc(DEFAULT_FULL_UNIT_STATE.fxsq);

  let lidLift = 1;

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts,
    disposables,
    updateLiveState: (fullState, dt, elapsed, isSoft) => {
      const f = fullState.fxsq;
      redrawBrc(f);

      const targetLid = f.casingCutaway ? 1 : 0;
      lidLift = isSoft ? targetLid : THREE.MathUtils.damp(lidLift, targetLid, 6.5, dt);
      topLid.position.y = 1.56 + lidLift * 0.65;
      topLid.visible = lidLift < 0.94;

      // Physically relocate suction baffle between Rear and Bottom
      if (f.suctionMode === 'rear') {
        suctionPlate.position.set(0, 1.0, -0.2);
        suctionPlate.rotation.x = Math.PI / 2;
      } else {
        suctionPlate.position.set(0, 1.28, -0.66);
        suctionPlate.rotation.x = 0;
      }

      // Spin DC sirocco drums proportional to ESP Pa (30..150 Pa)
      const espSpeed = 2.8 + ((f.espPa - 30) / 120) * 6.5;
      if (f.powerOn) {
        siroccoDrums.forEach((d) => {
          d.rotation.x += dt * espSpeed;
        });
      }

      // Animate 625 mm rising condensate water column during Pump Test
      const pumpProgress = f.drainPumpTest ? (elapsed * 0.65) % 1 : 0.15;
      waterColumn.scale.y = Math.max(0.12, pumpProgress);
      waterColumn.position.y = 1.12 + pumpProgress * 0.44;

      // Supply airflow cones
      airCones.forEach((c, i) => {
        c.visible = f.powerOn;
        if (f.powerOn) {
          const cyc = (elapsed * (0.55 + (f.espPa / 150) * 0.6) + i * 0.28) % 1;
          c.position.z = 0.84 + cyc * 0.85;
        }
      });

      return f.powerOn || f.drainPumpTest || Math.abs(lidLift - targetLid) > 0.004;
    },
  };
}

/* ============================================================================
   4. FULL DAIKIN AIR-COOLED INVERTER SCREW CHILLER (EWAD240TZSRN)
============================================================================ */

function buildEwadScrewChiller(maxAnisotropy: number, isSoftwareGl: boolean): BuiltFullUnitAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const subParts: SubPartSpec[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const frameMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.65 }));
  const chassisMat = track(new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.44, metalness: 0.28 }));
  const screwBlueMat = track(new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.32, metalness: 0.68 }));
  const springMat = track(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.34, metalness: 0.55 }));
  const evapMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.2 }));
  const chwBlueMat = track(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.75 }));
  const vCoilTex = track(createFinCoilTexture(maxAnisotropy, '#94a3b8', '#475569'));
  const vCoilMat = track(new THREE.MeshStandardMaterial({ map: vCoilTex, roughness: 0.42, metalness: 0.7 }));
  const fanMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.34, metalness: 0.35 }));
  const airRingMat = track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, side: THREE.DoubleSide }));

  // 6 Restrained Seismic Spring Isolators (TZD-ISO-25MM) grounded at y = 0
  const isoSpec: SubPartSpec = {
    id: 'chiller-isolators',
    name: '6 × Restrained Seismic Spring Isolators (TZD-ISO-25MM)',
    material: 'Powder-Coated Steel Housing + 25 mm Deflection Spring',
    spec: 'Leveling Tolerance ±2 mm · Back Off Transit Stops After Rigging',
    installNote: 'Mount symmetrically under main steel base beams before connecting grooved CHW headers.',
  };
  [-1.7, 0, 1.7].forEach((ix) => {
    [-0.78, 0.78].forEach((iz) => {
      const iso = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 0.24, 14)), springMat);
      iso.position.set(ix, 0.12, iz);
      registerClickable(iso, isoSpec, interactiveMeshes, subParts);
      group.add(iso);
    });
  });

  // Heavy Structural Steel Base Rail Frame
  const baseFrame = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 0.16, 1.76)), frameMat);
  baseFrame.position.set(0, 0.32, 0);
  baseFrame.receiveShadow = !isSoftwareGl;
  group.add(baseFrame);

  // Shell-and-Tube Flooded Evaporator Barrel + Chilled Water Flanged Headers
  const evapBarrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.32, 2.35, 24)), evapMat);
  evapBarrel.rotation.z = Math.PI / 2;
  evapBarrel.position.set(-0.22, 0.76, -0.34);
  registerClickable(
    evapBarrel,
    {
      id: 'chiller-evaporator',
      name: 'Flooded Shell-and-Tube Evaporator Barrel + CHW Flow Switch',
      material: 'Closed-Cell Insulated Pressure Vessel + Victaulic Flanges',
      spec: '15.5 bar LP Relief · Design Leaving Chilled Water 5–12°C',
      installNote: 'Install mechanical Y-strainer upstream and verify flow switch interlock before start.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(evapBarrel);

  // Chilled Water Supply/Return Blue Flanged Stubs
  [-0.58, 0.18].forEach((px) => {
    const stub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 16)), chwBlueMat);
    stub.rotation.x = Math.PI / 2;
    stub.position.set(px, 0.76, -0.78);
    group.add(stub);
  });

  // Twin Semi-Hermetic Inverter Screw Compressors (Circuit A & Circuit B)
  const compMeshes: THREE.Mesh[] = [];
  const screwSpec: SubPartSpec = {
    id: 'chiller-screw-comp',
    name: 'Dual Semi-Hermetic Inverter Screw Compressors (Circuit A / B)',
    material: 'Cast-Iron Compressor Body + Integrated VFD Drive',
    spec: 'R-134a / R-513A / R-1234ze · 25.5 bar HP Safety Relief',
    installNote: 'Toggle Circuit A/B and Cooling Load % to inspect independent dual-circuit staging.',
  };
  [-0.86, 0.46].forEach((cx) => {
    const comp = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.26, 1.02, 20)), screwBlueMat);
    comp.rotation.z = Math.PI / 2;
    comp.position.set(cx, 0.76, 0.34);
    registerClickable(comp, screwSpec, interactiveMeshes, subParts);
    group.add(comp);
    compMeshes.push(comp);
  });

  // Dual V-Bank Microchannel Aluminum Condenser Coils (Upper Deck)
  const vCoilGroup = new THREE.Group();
  const condSpec: SubPartSpec = {
    id: 'chiller-v-coils',
    name: 'V-Bank Microchannel Condenser Heat Exchangers',
    material: 'Brazed All-Aluminum Microchannel Fin Coils',
    spec: 'Requires ≥1.5 m Perimeter & ≥2.0 m Vertical Airflow Clearance',
    installNote: 'Flush coils gently with low-pressure water only; never bend microchannel fins.',
  };
  [-0.56, 0.56].forEach((vz) => {
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(2.96, 1.05, 0.1)), vCoilMat);
    slab.position.set(-0.32, 1.72, vz);
    slab.rotation.x = vz < 0 ? -0.34 : 0.34;
    registerClickable(slab, condSpec, interactiveMeshes, subParts);
    vCoilGroup.add(slab);
  });
  group.add(vCoilGroup);

  // Top Fan Deck + 4 Axial Condenser Fans
  const topDeck = new THREE.Mesh(track(new THREE.BoxGeometry(3.06, 0.14, 1.66)), frameMat);
  topDeck.position.set(-0.32, 2.28, 0);
  group.add(topDeck);

  const fanRotors: THREE.Group[] = [];
  const fanRings: THREE.Mesh[] = [];
  [-1.32, -0.66, 0.0, 0.66].forEach((fx) => {
    const shroud = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.34, 0.2, 20, 1, true)), frameMat);
    shroud.position.set(fx, 2.4, 0);
    group.add(shroud);

    const rotor = new THREE.Group();
    rotor.position.set(fx, 2.38, 0);
    const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12)), chassisMat);
    rotor.add(hub);
    for (let b = 0; b < 4; b++) {
      const bl = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, 0.018, 0.09)), fanMat);
      const a = (b * Math.PI) / 2;
      bl.position.set(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15);
      bl.rotation.y = -a;
      bl.rotation.x = 0.28;
      rotor.add(bl);
    }
    group.add(rotor);
    fanRotors.push(rotor);

    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.25, 0.012, 8, 22)), airRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(fx, 2.58, 0);
    group.add(ring);
    fanRings.push(ring);
  });

  // IP54 MicroTech III Electrical & Control Cabinet (Right End) with Live Dynamic CanvasTexture
  const mtCanvas = document.createElement('canvas');
  mtCanvas.width = 512;
  mtCanvas.height = 384;
  const mtCtx = mtCanvas.getContext('2d')!;
  const mtTex = track(new THREE.CanvasTexture(mtCanvas));
  mtTex.colorSpace = THREE.SRGBColorSpace;
  mtTex.anisotropy = maxAnisotropy;

  const cabinet = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 1.98, 1.56)), chassisMat);
  cabinet.position.set(1.56, 1.38, 0);
  group.add(cabinet);

  const mtPanel = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.92, 0.68)),
    track(new THREE.MeshStandardMaterial({ map: mtTex, roughness: 0.3, metalness: 0.1 }))
  );
  mtPanel.position.set(1.985, 1.54, 0);
  mtPanel.rotation.y = Math.PI / 2;
  registerClickable(
    mtPanel,
    {
      id: 'chiller-microtech',
      name: 'IP54 Electrical Panel & MicroTech III Chiller Controller',
      material: 'Weatherproof Steel Cabinet + Modbus RTU / BACnet Interface',
      spec: '400V 3-Ph · VFD Inverter Control · Dual-Circuit Load Staging',
      installNote: 'Adjust Leaving Water Setpoint (5–12°C) and Cooling Load % to inspect compressor & fan staging.',
    },
    interactiveMeshes,
    subParts
  );
  group.add(mtPanel);

  // Removable Lower Acoustic Louver Shroud (Cutaway)
  const lowerShroud = new THREE.Mesh(track(new THREE.BoxGeometry(3.04, 0.86, 0.06)), chassisMat);
  lowerShroud.position.set(-0.34, 0.84, 0.86);
  group.add(lowerShroud);
  explodableItems.push({
    object: lowerShroud,
    basePos: lowerShroud.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 1.15),
  });

  let lastMtSig = '';
  const redrawMicroTech = (c: ChillerControlState) => {
    const sig = `${c.powerOn}|${c.chwSetpointC}|${c.coolingLoadPercent}|${c.circuitA}|${c.circuitB}`;
    if (sig === lastMtSig) return;
    lastMtSig = sig;

    mtCtx.fillStyle = '#0f172a';
    mtCtx.fillRect(0, 0, 512, 384);
    mtCtx.strokeStyle = '#0284c7';
    mtCtx.lineWidth = 8;
    mtCtx.strokeRect(8, 8, 496, 368);

    mtCtx.fillStyle = '#38bdf8';
    mtCtx.font = '700 24px "IBM Plex Mono", monospace';
    mtCtx.fillText('DAIKIN MICROTECH III', 28, 52);

    mtCtx.fillStyle = '#ffffff';
    mtCtx.font = '700 66px "IBM Plex Mono", monospace';
    mtCtx.fillText(`LWT ${c.chwSetpointC.toFixed(1)}°C`, 28, 148);

    mtCtx.fillStyle = '#fbbf24';
    mtCtx.font = '700 34px "IBM Plex Mono", monospace';
    mtCtx.fillText(c.powerOn ? `LOAD: ${c.coolingLoadPercent}%` : 'CHILLER STANDBY', 28, 214);

    mtCtx.fillStyle = c.circuitA && c.powerOn ? '#34d399' : '#64748b';
    mtCtx.font = '700 24px "IBM Plex Mono", monospace';
    mtCtx.fillText(`CIRCUIT A: ${c.circuitA && c.powerOn ? 'RUNNING' : 'ISOLATED'}`, 28, 286);

    mtCtx.fillStyle = c.circuitB && c.powerOn ? '#34d399' : '#64748b';
    mtCtx.fillText(`CIRCUIT B: ${c.circuitB && c.powerOn ? 'RUNNING' : 'ISOLATED'}`, 28, 330);

    mtTex.needsUpdate = true;
  };
  redrawMicroTech(DEFAULT_FULL_UNIT_STATE.chiller);

  let shroudSlide = 0;

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts,
    disposables,
    updateLiveState: (fullState, dt, elapsed, isSoft) => {
      const c = fullState.chiller;
      redrawMicroTech(c);

      const targetSlide = c.panelCutaway ? 1 : 0;
      shroudSlide = isSoft ? targetSlide : THREE.MathUtils.damp(shroudSlide, targetSlide, 6.5, dt);
      lowerShroud.position.z = 0.86 + shroudSlide * 1.3;
      lowerShroud.visible = shroudSlide < 0.94;

      const activeA = c.powerOn && c.circuitA;
      const activeB = c.powerOn && c.circuitB;
      const loadFactor = 2.0 + (c.coolingLoadPercent / 100) * 6.0;

      // Circuit A drives fans 0 & 1; Circuit B drives fans 2 & 3
      fanRotors.forEach((r, idx) => {
        const running = idx < 2 ? activeA : activeB;
        if (running) {
          r.rotation.y += dt * loadFactor * (idx % 2 === 0 ? 1 : -1);
        }
        const ring = fanRings[idx];
        ring.visible = running;
        if (running) {
          const cyc = (elapsed * 0.85 + idx * 0.25) % 1;
          ring.position.y = 2.52 + cyc * 0.72;
          ring.scale.setScalar(0.85 + cyc * 0.3);
        }
      });

      // Subtle compressor active highlight
      compMeshes[0].scale.setScalar(activeA ? 1 + Math.sin(elapsed * 22) * 0.004 : 1);
      compMeshes[1].scale.setScalar(activeB ? 1 + Math.sin(elapsed * 22 + 1) * 0.004 : 1);

      return activeA || activeB || Math.abs(shroudSlide - targetSlide) > 0.004;
    },
  };
}

export function buildDaikinFullUnitAssembly(
  unitId: DaikinFullUnitId,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltFullUnitAssembly {
  switch (unitId) {
    case 'modular-ahu':
      return buildModularAhuUnit(maxAnisotropy, isSoftwareGl);
    case 'fxsq-ducted':
      return buildFxsqDuctedUnit(maxAnisotropy, isSoftwareGl);
    case 'ewad-chiller':
      return buildEwadScrewChiller(maxAnisotropy, isSoftwareGl);
    case 'vrv-outdoor':
    default:
      return buildVrvOutdoorUnit(maxAnisotropy, isSoftwareGl);
  }
}
