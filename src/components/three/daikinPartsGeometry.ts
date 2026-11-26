import * as THREE from 'three';

export type DaikinPartId =
  | 'refnet-joint'
  | 'ekexv-valve'
  | 'nitrogen-regulator'
  | 'seismic-isolator';

export interface SubPartSpec {
  id: string;
  name: string;
  material: string;
  spec: string;
  installNote: string;
}

export interface PartCatalogItem {
  id: DaikinPartId;
  name: string;
  shortLabel: string;
  modelCode: string;
  category: string;
  summary: string;
  manualRef: string;
  defaultCameraPos: [number, number, number];
  defaultTarget: [number, number, number];
}

export interface ExplodableItem {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export interface BuiltPartAssembly {
  group: THREE.Group;
  explodableItems: ExplodableItem[];
  interactiveMeshes: THREE.Mesh[];
  subParts: SubPartSpec[];
  disposables: Array<{ dispose: () => void }>;
}

export const DAIKIN_PARTS_CATALOG: PartCatalogItem[] = [
  {
    id: 'refnet-joint',
    name: 'VRV Refnet Y-Joint Assembly',
    shortLabel: 'Refnet Joint',
    modelCode: 'KHRP26A72T',
    category: 'VRV / VRF Systems',
    summary:
      'Forged copper refrigerant bifurcation joint with stepped brazing sockets and split-shell closed-cell polyethylene insulation.',
    manualRef: 'RXQ-ARYFK VRV Installation Manual · Section 6.3',
    defaultCameraPos: [4.2, 2.5, 4.6],
    defaultTarget: [0, 0.9, 0],
  },
  {
    id: 'ekexv-valve',
    name: 'EKEXV Electronic Expansion Valve',
    shortLabel: 'Expansion Valve',
    modelCode: 'EKEXV-250 / 480-Step',
    category: 'AHU Expansion Valve Kits',
    summary:
      'Precision 12V DC pulse-driven stepper motor valve regulating superheat across VRV-to-AHU DX coils with internal tapered metering needle.',
    manualRef: 'EKEQMCBAV3 & EKEXV IOM (4PEN383213-1B)',
    defaultCameraPos: [3.6, 2.3, 4.0],
    defaultTarget: [0, 1.35, 0],
  },
  {
    id: 'nitrogen-regulator',
    name: '4.15 MPa Nitrogen Pressure Regulator',
    shortLabel: 'N₂ Regulator',
    modelCode: 'CGA-580 / 6.0 MPa Gauge',
    category: 'Pressure Testing & Commissioning',
    summary:
      'High-pressure dry nitrogen regulator and dual-gauge test assembly engineered for Daikin 3-stage 4.15 MPa (601 psi) holding tests.',
    manualRef: 'Daikin VRV Pressure Test Checklist · 4.15 MPa Protocol',
    defaultCameraPos: [3.9, 2.2, 4.2],
    defaultTarget: [0, 1.25, 0],
  },
  {
    id: 'seismic-isolator',
    name: 'EWAD-TZ Seismic Spring Isolator',
    shortLabel: 'Spring Isolator',
    modelCode: 'TZD-ISO-25MM',
    category: 'Air-Cooled Chillers',
    summary:
      'Restrained steel seismic spring mount with 25 mm static deflection coil, M20 leveling stud, and acoustic elastomer base pad for chiller plinths.',
    manualRef: 'EWAD-TZD Chiller O&M Manual (D-EIMAC01905-23)',
    defaultCameraPos: [3.7, 2.3, 4.1],
    defaultTarget: [0, 1.1, 0],
  },
];

export function selectDefaultPartForCourse(
  category?: string,
  moduleTitle?: string
): DaikinPartId {
  const combined = `${category || ''} ${moduleTitle || ''}`.toLowerCase();
  if (
    combined.includes('nitrogen') ||
    combined.includes('pressure') ||
    combined.includes('vacuum') ||
    combined.includes('charging')
  ) {
    return 'nitrogen-regulator';
  }
  if (
    combined.includes('valve') ||
    combined.includes('eev') ||
    combined.includes('ekexv') ||
    combined.includes('ahu') ||
    combined.includes('fahu') ||
    combined.includes('control') ||
    combined.includes('bms')
  ) {
    return 'ekexv-valve';
  }
  if (
    combined.includes('chiller') ||
    combined.includes('rigging') ||
    combined.includes('vibration') ||
    combined.includes('plinth') ||
    combined.includes('isolator')
  ) {
    return 'seismic-isolator';
  }
  return 'refnet-joint';
}

export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.04,
      size / 2,
      size / 2,
      size * 0.48
    );
    grad.addColorStop(0, 'rgba(8, 15, 28, 0.52)');
    grad.addColorStop(0.55, 'rgba(8, 15, 28, 0.20)');
    grad.addColorStop(1, 'rgba(8, 15, 28, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createProceduralCanvasTexture(
  width: number,
  height: number,
  maxAnisotropy: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

function registerInteractive(
  mesh: THREE.Mesh,
  spec: SubPartSpec,
  interactiveMeshes: THREE.Mesh[],
  castShadow: boolean
) {
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  mesh.layers.enable(1);
  mesh.userData.partSpec = spec;
  interactiveMeshes.push(mesh);
}

function addExplodable(
  parent: THREE.Group,
  object: THREE.Object3D,
  explodeOffset: THREE.Vector3,
  explodableItems: ExplodableItem[]
) {
  parent.add(object);
  explodableItems.push({
    object,
    basePos: object.position.clone(),
    explodeOffset,
  });
}

function createSharedPbrMaterials(
  isSoftwareGl: boolean,
  disposables: Array<{ dispose: () => void }>
) {
  const track = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  return {
    copper: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xc86d44,
        metalness: 0.92,
        roughness: 0.22,
        anisotropy: 0.45,
        clearcoat: 0.15,
      })
    ),
    copperDark: track(
      new THREE.MeshStandardMaterial({
        color: 0x9c4e2e,
        metalness: 0.88,
        roughness: 0.34,
      })
    ),
    brazedSilver: track(
      new THREE.MeshStandardMaterial({
        color: 0xd4c7b4,
        metalness: 0.95,
        roughness: 0.26,
      })
    ),
    brass: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xd2a447,
        metalness: 0.9,
        roughness: 0.24,
        anisotropy: 0.5,
      })
    ),
    steel: track(
      new THREE.MeshStandardMaterial({
        color: 0xc7d0db,
        metalness: 0.92,
        roughness: 0.22,
      })
    ),
    galvanizedSteel: track(
      new THREE.MeshStandardMaterial({
        color: 0x8d9aa8,
        metalness: 0.78,
        roughness: 0.42,
      })
    ),
    matteInsulation: track(
      new THREE.MeshStandardMaterial({
        color: 0x2a313c,
        metalness: 0.04,
        roughness: 0.88,
      })
    ),
    coilPolymer: track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.08,
        roughness: 0.56,
      })
    ),
    daikinBlue: track(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.25,
        roughness: 0.38,
      })
    ),
    safetyYellow: track(
      new THREE.MeshStandardMaterial({
        color: 0xeab308,
        metalness: 0.32,
        roughness: 0.34,
      })
    ),
    neoprene: track(
      new THREE.MeshStandardMaterial({
        color: 0x171b21,
        metalness: 0.02,
        roughness: 0.92,
      })
    ),
    redValve: track(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        metalness: 0.18,
        roughness: 0.44,
      })
    ),
    gaugeGlass: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xe2f3ff,
        metalness: 0.05,
        roughness: 0.06,
        transmission: isSoftwareGl ? 0 : 0.9,
        transparent: true,
        opacity: isSoftwareGl ? 0.3 : 1,
        ior: 1.5,
        thickness: 0.3,
        clearcoat: 1.0,
        depthWrite: false,
      })
    ),
  };
}

// ============================================================================
// 1. DAIKIN VRV REFNET Y-JOINT (KHRP26A72T)
// ============================================================================
function buildRefnetJoint(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltPartAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const mat = createSharedPbrMaterials(isSoftwareGl, disposables);
  const cast = !isSoftwareGl;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const specs: Record<string, SubPartSpec> = {
    body: {
      id: 'refnet-body',
      name: 'Forged Copper Y-Bifurcation Header',
      material: 'Deoxidized Phosphorus Copper (C1220T)',
      spec: 'Max Working Pressure: 4.15 MPa · Horizontal ±15° Plane',
      installNote:
        'Maintain at least 500 mm straight copper run upstream of the Refnet inlet to prevent unequal refrigerant oil splitting.',
    },
    inlet: {
      id: 'refnet-inlet',
      name: 'Stepped Multi-Diameter Inlet Reducer',
      material: 'Annealed Copper Swaged Sleeve',
      spec: 'Cut-to-fit Ø28.6 / Ø22.2 / Ø19.1 mm O.D.',
      installNote:
        'Cut cleanly with a tube cutter (never a hacksaw) and deburr pointing downward before brazing.',
    },
    branchA: {
      id: 'refnet-branch-a',
      name: 'Primary Distribution Outlet Socket',
      material: 'Copper Alloy Socket + BCuP-2 Silver Fillet',
      spec: 'Purge Flow: 0.02 MPa Dry N₂ During Brazing',
      installNote:
        'Sweep continuous dry nitrogen through the header while brazing to eliminate internal black copper-oxide scale.',
    },
    branchB: {
      id: 'refnet-branch-b',
      name: 'Secondary Branch Outlet Socket',
      material: 'Copper Alloy Socket + BCuP-2 Silver Fillet',
      spec: 'Branch Spacing: ≥ 500 mm Before Next Refnet',
      installNote:
        'Install horizontally within ±15° or vertically; never tilt diagonally between horizontal and vertical.',
    },
    vane: {
      id: 'refnet-vane',
      name: 'Internal Bifurcation Flow Divider',
      material: 'Precision-Formed Brass Vane',
      spec: 'Balanced Two-Phase Vapor/Liquid Split',
      installNote:
        'Smoothly divides high-velocity R-410A / R-32 mixture without turbulent pressure drop.',
    },
    insulationTop: {
      id: 'refnet-insul-top',
      name: 'Upper Clamshell Thermal Insulation',
      material: 'Closed-Cell Cross-Linked Polyethylene (PE)',
      spec: '20 mm Wall Thickness · Condensation Barrier',
      installNote:
        'Seal seams completely with Daikin finishing tape after the 24-hour 4.15 MPa nitrogen leak test passes.',
    },
    insulationBottom: {
      id: 'refnet-insul-bot',
      name: 'Lower Clamshell Thermal Insulation',
      material: 'Closed-Cell Cross-Linked Polyethylene (PE)',
      spec: 'Thermal Conductivity ≤ 0.036 W/m·K',
      installNote:
        'Overlap onto adjacent field pipe insulation by at least 20 mm to prevent chilled suction sweating.',
    },
    badge: {
      id: 'refnet-badge',
      name: 'Directional Flow & Level Alignment Plate',
      material: 'Laser-Etched Aluminum Collar',
      spec: 'KHRP26A72T · Install Level ±15°',
      installNote:
        'Verify arrow orientation matches main liquid/gas manifold flow direction.',
    },
  };

  const assemblyY = 0.9;

  // 1. Primary Copper Y-Body Group
  const yBodyGroup = new THREE.Group();
  yBodyGroup.position.set(0, assemblyY, 0);

  const mainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.5, 0, 0),
    new THREE.Vector3(-0.4, 0, 0),
    new THREE.Vector3(0.05, 0, 0),
  ]);
  const upperBranchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0, 0),
    new THREE.Vector3(0.35, 0, -0.35),
    new THREE.Vector3(1.05, 0, -0.58),
    new THREE.Vector3(1.55, 0, -0.58),
  ]);
  const lowerBranchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0, 0),
    new THREE.Vector3(0.35, 0, 0.35),
    new THREE.Vector3(1.05, 0, 0.58),
    new THREE.Vector3(1.55, 0, 0.58),
  ]);

  const mainTube = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(mainCurve, 28, 0.28, 24, false)),
    mat.copper
  );
  const upperTube = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(upperBranchCurve, 32, 0.22, 24, false)),
    mat.copper
  );
  const lowerTube = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(lowerBranchCurve, 32, 0.22, 24, false)),
    mat.copper
  );
  const hubSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.31, 24, 24)),
    mat.copper
  );
  hubSphere.position.set(-0.08, 0, 0);
  hubSphere.scale.set(1.15, 0.94, 1.1);

  [mainTube, upperTube, lowerTube, hubSphere].forEach((m) => {
    registerInteractive(m, specs.body, interactiveMeshes, cast);
    yBodyGroup.add(m);
  });

  // Flow direction plate
  const labelTex = createProceduralCanvasTexture(512, 160, maxAnisotropy, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('KHRP26A72T  ±15°', 30, 68);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('FLOW ━━━▶  4.15 MPa', 30, 122);
  });
  disposables.push(labelTex);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.35,
    metalness: 0.4,
  });
  disposables.push(labelMat);

  const badgeMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.86, 0.04, 0.28)),
    labelMat
  );
  badgeMesh.position.set(-0.82, 0.29, 0);
  registerInteractive(badgeMesh, specs.badge, interactiveMeshes, cast);
  yBodyGroup.add(badgeMesh);

  addExplodable(group, yBodyGroup, new THREE.Vector3(0, 0, 0), explodableItems);

  // 2. Stepped Inlet Reducer (LatheGeometry)
  const lathePoints = [
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.24, 0.0),
    new THREE.Vector2(0.24, 0.38),
    new THREE.Vector2(0.29, 0.44),
    new THREE.Vector2(0.29, 0.85),
    new THREE.Vector2(0.33, 0.90),
    new THREE.Vector2(0.33, 1.25),
    new THREE.Vector2(0.27, 1.25),
    new THREE.Vector2(0.27, 0.88),
    new THREE.Vector2(0.22, 0.44),
    new THREE.Vector2(0.18, 0.38),
  ];
  const inletGroup = new THREE.Group();
  inletGroup.position.set(-2.55, assemblyY, 0);
  const inletMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(lathePoints, 28)),
    mat.copperDark
  );
  inletMesh.rotation.z = -Math.PI / 2;
  registerInteractive(inletMesh, specs.inlet, interactiveMeshes, cast);
  inletGroup.add(inletMesh);

  // Brazed silver ring on inlet
  const inletBraze = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.30, 0.032, 12, 28)),
    mat.brazedSilver
  );
  inletBraze.rotation.y = Math.PI / 2;
  inletBraze.position.set(1.18, 0, 0);
  registerInteractive(inletBraze, specs.inlet, interactiveMeshes, cast);
  inletGroup.add(inletBraze);
  addExplodable(group, inletGroup, new THREE.Vector3(-0.85, 0, 0), explodableItems);

  // 3. Branch A & Branch B Outlet Reducers + Brazed Rings
  const makeOutletSocket = (
    zPos: number,
    spec: SubPartSpec,
    explodeVec: THREE.Vector3
  ) => {
    const sockGroup = new THREE.Group();
    sockGroup.position.set(1.52, assemblyY, zPos);

    const pts = [
      new THREE.Vector2(0.17, 0),
      new THREE.Vector2(0.25, 0),
      new THREE.Vector2(0.25, 0.38),
      new THREE.Vector2(0.21, 0.44),
      new THREE.Vector2(0.21, 0.82),
      new THREE.Vector2(0.16, 0.82),
      new THREE.Vector2(0.16, 0.42),
      new THREE.Vector2(0.17, 0),
    ];
    const socket = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(pts, 26)),
      mat.copperDark
    );
    socket.rotation.z = -Math.PI / 2;
    registerInteractive(socket, spec, interactiveMeshes, cast);
    sockGroup.add(socket);

    const brazeRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.24, 0.028, 12, 28)),
      mat.brazedSilver
    );
    brazeRing.rotation.y = Math.PI / 2;
    brazeRing.position.set(0.03, 0, 0);
    registerInteractive(brazeRing, spec, interactiveMeshes, cast);
    sockGroup.add(brazeRing);

    addExplodable(group, sockGroup, explodeVec, explodableItems);
  };

  makeOutletSocket(-0.58, specs.branchA, new THREE.Vector3(0.85, 0, -0.35));
  makeOutletSocket(0.58, specs.branchB, new THREE.Vector3(0.85, 0, 0.35));

  // 4. Internal Flow Divider Vane (lifts up in exploded view)
  const vaneShape = new THREE.Shape();
  vaneShape.moveTo(-0.35, 0);
  vaneShape.lineTo(0.45, 0.14);
  vaneShape.lineTo(0.45, -0.14);
  vaneShape.closePath();
  const vaneMesh = new THREE.Mesh(
    trackGeo(
      new THREE.ExtrudeGeometry(vaneShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
      })
    ),
    mat.brass
  );
  vaneMesh.rotation.x = Math.PI / 2;
  vaneMesh.position.set(0.05, assemblyY + 0.08, 0);
  registerInteractive(vaneMesh, specs.vane, interactiveMeshes, cast);
  addExplodable(group, vaneMesh, new THREE.Vector3(0, 0.95, 0), explodableItems);

  // 5. Split Clamshell PE Thermal Insulation Shells (Upper & Lower)
  const buildShellHalf = (isTop: boolean, spec: SubPartSpec) => {
    const shellGroup = new THREE.Group();
    shellGroup.position.set(0, assemblyY + (isTop ? 0.02 : -0.02), 0);

    const shape = new THREE.Shape();
    shape.moveTo(-1.35, -0.42);
    shape.lineTo(0.1, -0.45);
    shape.lineTo(1.45, -0.95);
    shape.lineTo(1.6, -0.25);
    shape.lineTo(0.45, 0);
    shape.lineTo(1.6, 0.25);
    shape.lineTo(1.45, 0.95);
    shape.lineTo(0.1, 0.45);
    shape.lineTo(-1.35, 0.42);
    shape.closePath();

    const shellGeo = trackGeo(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.24,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.07,
        bevelSegments: 3,
      })
    );
    const mesh = new THREE.Mesh(shellGeo, mat.matteInsulation);
    mesh.rotation.x = isTop ? -Math.PI / 2 : Math.PI / 2;
    mesh.position.y = isTop ? 0.18 : -0.18;
    registerInteractive(mesh, spec, interactiveMeshes, cast);
    shellGroup.add(mesh);

    // Blue Daikin alignment strap on top shell
    if (isTop) {
      const strap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.05, 0.94)),
        mat.daikinBlue
      );
      strap.position.set(-0.55, 0.49, 0);
      registerInteractive(strap, spec, interactiveMeshes, cast);
      shellGroup.add(strap);
    }

    addExplodable(
      group,
      shellGroup,
      new THREE.Vector3(0, isTop ? 1.35 : -0.78, 0),
      explodableItems
    );
  };

  buildShellHalf(true, specs.insulationTop);
  buildShellHalf(false, specs.insulationBottom);

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts: Object.values(specs),
    disposables,
  };
}

// ============================================================================
// 2. DAIKIN EKEXV ELECTRONIC EXPANSION VALVE
// ============================================================================
function buildEkexvValve(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltPartAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const mat = createSharedPbrMaterials(isSoftwareGl, disposables);
  const cast = !isSoftwareGl;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const specs: Record<string, SubPartSpec> = {
    body: {
      id: 'eev-body',
      name: 'Forged Brass Valve Body & Orifice Chamber',
      material: 'Machined Forged Brass (CW617N)',
      spec: 'Design Pressure: 4.15 MPa · Bi-Flow Compatible',
      installNote:
        'Wrap wet cooling rag around the brass valve body while brazing copper stubs so internal PTFE seats never exceed 120°C.',
    },
    inletPipe: {
      id: 'eev-inlet',
      name: 'Liquid Inlet Copper Stub & Flare Nut',
      material: 'Annealed Copper + Forged Brass Flare Nut',
      spec: 'Torque: 33–42 Nm (3/8" Flare) · Strainer Upstream',
      installNote:
        'Always install a 100-mesh liquid strainer immediately upstream of the EKEXV inlet to protect the metering orifice.',
    },
    outletPipe: {
      id: 'eev-outlet',
      name: 'Metered Outlet Copper Stub Tube',
      material: 'C1220T Copper Tubing',
      spec: 'Vertical Downward Flow to AHU Distributor',
      installNote:
        'Mount the EKEXV within ±15° of vertical upright (coil on top) to guarantee reliable needle seating.',
    },
    needle: {
      id: 'eev-needle',
      name: 'Tapered Metering Needle & Helical Return Spring',
      material: 'Hardened 304 Stainless Steel',
      spec: '480 Discrete Pulse Steps · Precision Superheat Control',
      installNote:
        'Driven linearly by the magnetic rotor lead-screw; debris causes hunting or stuck-open liquid floodback.',
    },
    rotor: {
      id: 'eev-rotor',
      name: 'Hermetic Stainless Rotor Sleeve',
      material: 'Non-Magnetic 316L Stainless Canister',
      spec: 'Zero-Leakage Magnetic Coupling (No Shaft Seal)',
      installNote:
        'Ensure outer stainless dome is clean and dry before snapping the stepper coil firmly onto the indexing boss.',
    },
    coil: {
      id: 'eev-coil',
      name: '12V DC Pulse Stepper Motor Coil',
      material: 'Glass-Filled Nylon Encapsulated Stator',
      spec: '12V DC Unipolar · Coil Resistance ~46 Ω per Phase',
      installNote:
        'Verify coil snap-clip locks flush; loose coils cause step loss and Daikin EEV malfunction codes.',
    },
    harness: {
      id: 'eev-harness',
      name: '5-Pin EKEQ Control Harness & Connector',
      material: 'Shielded Heat-Resistant Leads (Orange/Red/Yellow/Black/Gray)',
      spec: 'Connects to EKEQMCBAV3 PCB Port X21A',
      installNote:
        'Check pin-to-pin resistance with a multimeter during troubleshooting before replacing the valve body.',
    },
  };

  // 1. Forged Brass Valve Body (centered around y = 0.85)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.85, 0);

  const brassCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.72, 24)),
    mat.brass
  );
  registerInteractive(brassCore, specs.body, interactiveMeshes, cast);
  bodyGroup.add(brassCore);

  const hexCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.54, 0.54, 0.24, 6)),
    mat.brass
  );
  hexCollar.position.y = 0.28;
  registerInteractive(hexCollar, specs.body, interactiveMeshes, cast);
  bodyGroup.add(hexCollar);

  const sideBoss = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.56, 20)),
    mat.brass
  );
  sideBoss.rotation.z = Math.PI / 2;
  sideBoss.position.set(-0.42, -0.04, 0);
  registerInteractive(sideBoss, specs.body, interactiveMeshes, cast);
  bodyGroup.add(sideBoss);

  addExplodable(group, bodyGroup, new THREE.Vector3(0, 0, 0), explodableItems);

  // 2. Horizontal Liquid Inlet Stub + Brass Flare Nut
  const inletGroup = new THREE.Group();
  inletGroup.position.set(-0.7, 0.81, 0);
  const inletTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 20)),
    mat.copper
  );
  inletTube.rotation.z = Math.PI / 2;
  inletTube.position.x = -0.52;
  registerInteractive(inletTube, specs.inletPipe, interactiveMeshes, cast);
  inletGroup.add(inletTube);

  const flareNut = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.25, 0.25, 0.28, 6)),
    mat.brass
  );
  flareNut.rotation.z = Math.PI / 2;
  flareNut.position.x = -0.14;
  registerInteractive(flareNut, specs.inletPipe, interactiveMeshes, cast);
  inletGroup.add(flareNut);

  addExplodable(group, inletGroup, new THREE.Vector3(-0.95, 0, 0), explodableItems);

  // 3. Bottom Vertical Outlet Stub Tube (grounds assembly at y = 0.02)
  const outletGroup = new THREE.Group();
  outletGroup.position.set(0, 0.24, 0);
  const outletTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.56, 20)),
    mat.copper
  );
  registerInteractive(outletTube, specs.outletPipe, interactiveMeshes, cast);
  outletGroup.add(outletTube);

  const outletFlange = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 6)),
    mat.brass
  );
  outletFlange.position.y = 0.22;
  registerInteractive(outletFlange, specs.outletPipe, interactiveMeshes, cast);
  outletGroup.add(outletFlange);

  addExplodable(group, outletGroup, new THREE.Vector3(0, -0.55, 0), explodableItems);

  // 4. Internal Tapered Metering Needle + Precision Spring (revealed when exploded)
  const needleGroup = new THREE.Group();
  needleGroup.position.set(0, 1.15, 0);

  const needlePts = [
    new THREE.Vector2(0.01, -0.35),
    new THREE.Vector2(0.08, -0.05),
    new THREE.Vector2(0.11, 0.05),
    new THREE.Vector2(0.11, 0.48),
    new THREE.Vector2(0.16, 0.52),
    new THREE.Vector2(0.16, 0.64),
    new THREE.Vector2(0.0, 0.64),
  ];
  const needleMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(needlePts, 24)),
    mat.steel
  );
  registerInteractive(needleMesh, specs.needle, interactiveMeshes, cast);
  needleGroup.add(needleMesh);

  // Helical return spring around needle stem
  const springPts: THREE.Vector3[] = [];
  const turns = 6;
  for (let i = 0; i <= 72; i++) {
    const t = i / 72;
    const angle = t * Math.PI * 2 * turns;
    springPts.push(
      new THREE.Vector3(Math.cos(angle) * 0.18, 0.02 + t * 0.44, Math.sin(angle) * 0.18)
    );
  }
  const springMesh = new THREE.Mesh(
    trackGeo(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 72, 0.02, 8, false)
    ),
    mat.steel
  );
  registerInteractive(springMesh, specs.needle, interactiveMeshes, cast);
  needleGroup.add(springMesh);

  addExplodable(group, needleGroup, new THREE.Vector3(0, 0.65, 0), explodableItems);

  // 5. Hermetic Stainless Steel Rotor Canister
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, 1.56, 0);
  const rotorPts = [
    new THREE.Vector2(0.32, -0.32),
    new THREE.Vector2(0.32, 0.34),
    new THREE.Vector2(0.28, 0.46),
    new THREE.Vector2(0.12, 0.52),
    new THREE.Vector2(0.0, 0.52),
  ];
  const rotorMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(rotorPts, 28)),
    mat.steel
  );
  registerInteractive(rotorMesh, specs.rotor, interactiveMeshes, cast);
  rotorGroup.add(rotorMesh);

  const sealingRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.33, 0.032, 12, 28)),
    mat.neoprene
  );
  sealingRing.rotation.x = Math.PI / 2;
  sealingRing.position.y = -0.30;
  registerInteractive(sealingRing, specs.rotor, interactiveMeshes, cast);
  rotorGroup.add(sealingRing);

  addExplodable(group, rotorGroup, new THREE.Vector3(0, 1.35, 0), explodableItems);

  // 6. Detachable 12V DC Stepper Stator Coil Housing + Rating Plate
  const coilGroup = new THREE.Group();
  coilGroup.position.set(0, 1.88, 0);

  const coilBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.62, 0.64, 0.92, 32)),
    mat.coilPolymer
  );
  registerInteractive(coilBody, specs.coil, interactiveMeshes, cast);
  coilGroup.add(coilBody);

  // Top Daikin blue cap ring
  const capRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.52, 0.60, 0.14, 32)),
    mat.daikinBlue
  );
  capRing.position.y = 0.51;
  registerInteractive(capRing, specs.coil, interactiveMeshes, cast);
  coilGroup.add(capRing);

  // Technical rating plate on front of coil
  const plateTex = createProceduralCanvasTexture(512, 256, maxAnisotropy, (ctx, w, h) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('EKEXV-250  EXPANSION VALVE', 24, 44);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('COIL: 12V DC  480-STEP', 24, 124);
    ctx.font = '26px monospace';
    ctx.fillText('MAX P: 4.15 MPa  R-410A/R-32', 24, 174);
    ctx.fillStyle = '#475569';
    ctx.fillText('MOUNT VERTICAL ±15°', 24, 224);
  });
  disposables.push(plateTex);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.35,
    metalness: 0.2,
  });
  disposables.push(plateMat);
  const ratingPlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.74, 0.38, 0.05)),
    plateMat
  );
  ratingPlate.position.set(0, 0, 0.63);
  registerInteractive(ratingPlate, specs.coil, interactiveMeshes, cast);
  coilGroup.add(ratingPlate);

  // Wire strain relief & 5-pin harness coming off the coil side
  const boot = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.32, 0.24, 0.28)),
    mat.neoprene
  );
  boot.position.set(0.68, 0.14, 0);
  registerInteractive(boot, specs.harness, interactiveMeshes, cast);
  coilGroup.add(boot);

  const wireCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.82, 0.14, 0),
    new THREE.Vector3(1.22, 0.05, 0.18),
    new THREE.Vector3(1.42, -0.35, 0.26),
    new THREE.Vector3(1.38, -0.78, 0.12),
  ]);
  const harnessCable = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(wireCurve, 28, 0.055, 12, false)),
    mat.neoprene
  );
  registerInteractive(harnessCable, specs.harness, interactiveMeshes, cast);
  coilGroup.add(harnessCable);

  const jstPlug = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.28, 0.14)),
    mat.steel
  );
  jstPlug.position.set(1.38, -0.88, 0.12);
  registerInteractive(jstPlug, specs.harness, interactiveMeshes, cast);
  coilGroup.add(jstPlug);

  addExplodable(group, coilGroup, new THREE.Vector3(0, 2.25, 0), explodableItems);

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts: Object.values(specs),
    disposables,
  };
}

// ============================================================================
// 3. HIGH-PRESSURE NITROGEN REGULATOR & 4.15 MPa TEST MANIFOLD
// ============================================================================
function buildNitrogenRegulator(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltPartAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const mat = createSharedPbrMaterials(isSoftwareGl, disposables);
  const cast = !isSoftwareGl;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const specs: Record<string, SubPartSpec> = {
    body: {
      id: 'n2-body',
      name: 'Forged Brass Regulator Bonnet & Diaphragm Housing',
      material: 'Machined Forged Brass (C37700)',
      spec: 'Inlet Max: 25 MPa · Outlet Range: 0–5.0 MPa',
      installNote:
        'Always back out the T-handle completely (counter-clockwise) before cracking open the high-pressure nitrogen cylinder valve.',
    },
    tHandle: {
      id: 'n2-thandle',
      name: 'Delivery Pressure T-Handle Adjustment Screw',
      material: 'Hardened Brass Stem + Knurled Grip',
      spec: '3-Stage Ramp: 0.3 → 1.5 → 4.15 MPa',
      installNote:
        'Pressurize VRV piping in three staged holds (0.3 MPa, 1.5 MPa, then 4.15 MPa for 24 hrs) to safely spot major leaks early.',
    },
    deliveryGauge: {
      id: 'n2-delivery-gauge',
      name: 'Delivery Test Gauge (0–6.0 MPa · 4.15 MPa Zone)',
      material: 'Stainless Bezel + Polycarbonate Sight Lens',
      spec: 'Target Hold: 4.15 MPa (601 psi) · ±0.01 MPa/°C Temp Comp',
      installNote:
        'Record ambient temperature at start and end of the 24-hour test; pressure shifts ~0.01 MPa per 1°C ambient change.',
    },
    tankGauge: {
      id: 'n2-tank-gauge',
      name: 'High-Side Cylinder Contents Gauge (0–25 MPa)',
      material: 'Bourdon Tube Brass Mechanism + Steel Case',
      spec: 'Dry Oxygen-Free Nitrogen (OFN) Only',
      installNote:
        'Never use oxygen or compressed air for HVAC pressure testing—risk of violent oil combustion.',
    },
    cgaInlet: {
      id: 'n2-cga',
      name: 'CGA-580 Cylinder Union Nut & Stem',
      material: 'Heavy Hex Machined Brass',
      spec: 'Right-Hand Thread · PTFE Seat Washer',
      installNote:
        'Tighten firmly with an open-end wrench; never apply oil or grease to high-pressure gas fittings.',
    },
    ballValve: {
      id: 'n2-ball-valve',
      name: '1/4" SAE Flare Isolation Ball Valve & Test Hose',
      material: 'Brass Flare Tee + Red Quarter-Turn Handle',
      spec: 'Rated 5.5 MPa Working / 27 MPa Burst',
      installNote:
        'Close isolation valve once 4.15 MPa is stabilized to isolate cylinder supply during the 24-hour hold.',
    },
  };

  const centerY = 1.15;

  // 1. Central Regulator Body
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, centerY, 0);

  const mainDrum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.62, 0.62, 0.54, 32)),
    mat.brass
  );
  mainDrum.rotation.x = Math.PI / 2;
  registerInteractive(mainDrum, specs.body, interactiveMeshes, cast);
  bodyGroup.add(mainDrum);

  const bonnetCone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.56, 0.36, 28)),
    mat.daikinBlue
  );
  bonnetCone.rotation.x = Math.PI / 2;
  bonnetCone.position.z = 0.44;
  registerInteractive(bonnetCone, specs.body, interactiveMeshes, cast);
  bodyGroup.add(bonnetCone);

  addExplodable(group, bodyGroup, new THREE.Vector3(0, 0, 0), explodableItems);

  // 2. Front T-Handle Pressure Screw
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0, centerY, 0.72);
  const screwShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.52, 18)),
    mat.steel
  );
  screwShaft.rotation.x = Math.PI / 2;
  registerInteractive(screwShaft, specs.tHandle, interactiveMeshes, cast);
  handleGroup.add(screwShaft);

  const tBar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 1.05, 16)),
    mat.neoprene
  );
  tBar.rotation.z = Math.PI / 2;
  tBar.position.z = 0.24;
  registerInteractive(tBar, specs.tHandle, interactiveMeshes, cast);
  handleGroup.add(tBar);

  addExplodable(group, handleGroup, new THREE.Vector3(0, 0, 0.95), explodableItems);

  // Helper to build detailed dial gauges with CanvasTexture faces
  const createGauge = (
    titleText: string,
    maxScale: string,
    highlightArc: boolean,
    needleAngle: number,
    spec: SubPartSpec,
    pos: THREE.Vector3,
    explodeVec: THREE.Vector3
  ) => {
    const gGroup = new THREE.Group();
    gGroup.position.copy(pos);

    const stem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 16)),
      mat.brass
    );
    stem.position.y = -0.58;
    registerInteractive(stem, spec, interactiveMeshes, cast);
    gGroup.add(stem);

    const caseMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.56, 0.56, 0.26, 32)),
      mat.steel
    );
    caseMesh.rotation.x = Math.PI / 2;
    registerInteractive(caseMesh, spec, interactiveMeshes, cast);
    gGroup.add(caseMesh);

    const dialTex = createProceduralCanvasTexture(512, 512, maxAnisotropy, (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx, cy, 240, 0, Math.PI * 2);
      ctx.fill();

      // Tick marks
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * 0.75 + (i / 24) * Math.PI * 1.5;
        const r1 = i % 4 === 0 ? 175 : 196;
        const r2 = 220;
        ctx.strokeStyle = i >= 18 && highlightArc ? '#dc2626' : '#0f172a';
        ctx.lineWidth = i % 4 === 0 ? 7 : 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      if (highlightArc) {
        // 4.15 MPa test threshold arc
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, 162, Math.PI * 1.65, Math.PI * 1.98);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px monospace';
      ctx.fillText(titleText, cx, cy - 55);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(maxScale, cx, cy + 120);

      // Needle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(needleAngle);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-10, 26);
      ctx.lineTo(10, 26);
      ctx.lineTo(3, -182);
      ctx.lineTo(-3, -182);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    disposables.push(dialTex);

    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      roughness: 0.4,
      metalness: 0.05,
    });
    disposables.push(dialMat);

    const dialFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.51, 32)),
      dialMat
    );
    dialFace.position.z = 0.135;
    registerInteractive(dialFace, spec, interactiveMeshes, false);
    gGroup.add(dialFace);

    const lens = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.52, 32)),
      mat.gaugeGlass
    );
    lens.position.z = 0.16;
    lens.renderOrder = 2;
    gGroup.add(lens);

    addExplodable(group, gGroup, explodeVec, explodableItems);
  };

  // 3. Left Delivery Gauge (4.15 MPa) & Right Cylinder Gauge (25 MPa)
  createGauge(
    '4.15 MPa',
    'DELIVERY 0-6 MPa',
    true,
    0.72,
    specs.deliveryGauge,
    new THREE.Vector3(-0.68, centerY + 0.92, -0.05),
    new THREE.Vector3(-0.65, 0.85, 0)
  );
  createGauge(
    'OFN N₂',
    'TANK 0-25 MPa',
    false,
    -0.45,
    specs.tankGauge,
    new THREE.Vector3(0.68, centerY + 0.92, -0.05),
    new THREE.Vector3(0.65, 0.85, 0)
  );

  // 4. Right Side CGA-580 Cylinder Union Inlet
  const cgaGroup = new THREE.Group();
  cgaGroup.position.set(1.05, centerY, -0.08);
  const cgaStem = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.88, 18)),
    mat.brass
  );
  cgaStem.rotation.z = Math.PI / 2;
  registerInteractive(cgaStem, specs.cgaInlet, interactiveMeshes, cast);
  cgaGroup.add(cgaStem);

  const cgaNut = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.34, 6)),
    mat.brass
  );
  cgaNut.rotation.z = Math.PI / 2;
  cgaNut.position.x = 0.32;
  registerInteractive(cgaNut, specs.cgaInlet, interactiveMeshes, cast);
  cgaGroup.add(cgaNut);

  addExplodable(group, cgaGroup, new THREE.Vector3(0.95, 0, 0), explodableItems);

  // 5. Bottom Isolation Ball Valve & Charging Port (grounded near y = 0.04)
  const valveGroup = new THREE.Group();
  valveGroup.position.set(0, 0.42, -0.06);

  const valveBlock = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.62, 18)),
    mat.brass
  );
  registerInteractive(valveBlock, specs.ballValve, interactiveMeshes, cast);
  valveGroup.add(valveBlock);

  const flarePort = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 6)),
    mat.brass
  );
  flarePort.position.y = -0.30;
  registerInteractive(flarePort, specs.ballValve, interactiveMeshes, cast);
  valveGroup.add(flarePort);

  const redLever = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.54, 0.12, 0.08)),
    mat.redValve
  );
  redLever.position.set(-0.28, 0.04, 0.12);
  registerInteractive(redLever, specs.ballValve, interactiveMeshes, cast);
  valveGroup.add(redLever);

  addExplodable(group, valveGroup, new THREE.Vector3(0, -0.65, 0), explodableItems);

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts: Object.values(specs),
    disposables,
  };
}

// ============================================================================
// 4. EWAD-TZ SEISMIC SPRING ANTI-VIBRATION ISOLATOR
// ============================================================================
function buildSeismicIsolator(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltPartAssembly {
  const group = new THREE.Group();
  const explodableItems: ExplodableItem[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const mat = createSharedPbrMaterials(isSoftwareGl, disposables);
  const cast = !isSoftwareGl;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const specs: Record<string, SubPartSpec> = {
    basePad: {
      id: 'iso-pad',
      name: 'Ribbed Neoprene Acoustic Base Pad',
      material: '60-Durometer Oil-Resistant Neoprene Elastomer',
      spec: 'High-Frequency Structure-Borne Noise Attenuation',
      installNote:
        'Ensure rooftop concrete plinth surface is level within ±3 mm before anchoring the isolator baseplate.',
    },
    housing: {
      id: 'iso-housing',
      name: 'Hot-Dip Galvanized Seismic Restraint Frame',
      material: 'ASTM A36 Structural Steel (Galvanized)',
      spec: 'All-Directional Wind & Seismic Restraint Stops',
      installNote:
        'Anchor through all four base slots using M16 wedge bolts before hoisting the EWAD-TZ chiller onto the mounts.',
    },
    spring: {
      id: 'iso-spring',
      name: 'Heavy-Load Helical Coil Spring (25 mm Deflection)',
      material: 'Powder-Coated High-Tensile Spring Steel',
      spec: 'Static Deflection: 25 mm · 50% Overload Travel Reserve',
      installNote:
        'Verify color-coded spring rating matches the specific chiller corner weight chart in the submittal drawing.',
    },
    topPlate: {
      id: 'iso-top-plate',
      name: 'Chiller Load Transfer Plate & Limit Stops',
      material: 'Welded Galvanized Steel Load Cap',
      spec: 'Minimum 6 mm Operating Clearance Around Restraint Bolts',
      installNote:
        'Remove temporary shipping limit blocks only after the chiller is fully piped and filled with chilled water.',
    },
    levelingBolt: {
      id: 'iso-bolt',
      name: 'M20 Threaded Leveling Stud & Hex Locknut',
      material: 'Grade 8.8 Zinc-Plated Steel',
      spec: 'Torque Base Locknut: 145 Nm After Leveling',
      installNote:
        'Adjust leveling bolts in half-turn increments across all mounts until the chiller base frame is dead level.',
    },
  };

  // 1. Neoprene Acoustic Pad (flush on y = 0)
  const padMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.35, 0.14, 1.55)),
    mat.neoprene
  );
  padMesh.position.set(0, 0.07, 0);
  registerInteractive(padMesh, specs.basePad, interactiveMeshes, cast);
  addExplodable(group, padMesh, new THREE.Vector3(0, -0.55, 0), explodableItems);

  // 2. Galvanized Baseplate + Side Seismic Walls + Anchor Bolts
  const housingGroup = new THREE.Group();
  housingGroup.position.set(0, 0.22, 0);

  const basePlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.25, 0.16, 1.45)),
    mat.galvanizedSteel
  );
  registerInteractive(basePlate, specs.housing, interactiveMeshes, cast);
  housingGroup.add(basePlate);

  // Side restraint posts
  [-0.86, 0.86].forEach((xPos) => {
    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.18, 1.28, 1.25)),
      mat.galvanizedSteel
    );
    wall.position.set(xPos, 0.72, 0);
    registerInteractive(wall, specs.housing, interactiveMeshes, cast);
    housingGroup.add(wall);
  });

  // 4 Corner Anchor Hex Bolts
  const anchorOffsets = [
    [-0.95, -0.55],
    [-0.95, 0.55],
    [0.95, -0.55],
    [0.95, 0.55],
  ];
  anchorOffsets.forEach(([ax, az]) => {
    const bolt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 6)),
      mat.steel
    );
    bolt.position.set(ax, 0.14, az);
    registerInteractive(bolt, specs.housing, interactiveMeshes, cast);
    housingGroup.add(bolt);
  });

  // Load Deflection Plate on front of base
  const scaleTex = createProceduralCanvasTexture(512, 140, maxAnisotropy, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 18, h);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('TZD-ISO-25MM  SEISMIC', 36, 58);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('DEFLECTION: 25 mm  M20', 36, 110);
  });
  disposables.push(scaleTex);
  const scaleMat = new THREE.MeshStandardMaterial({
    map: scaleTex,
    roughness: 0.4,
    metalness: 0.3,
  });
  disposables.push(scaleMat);
  const scalePlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.15, 0.28, 0.04)),
    scaleMat
  );
  scalePlate.position.set(0, 0.12, 0.74);
  registerInteractive(scalePlate, specs.housing, interactiveMeshes, cast);
  housingGroup.add(scalePlate);

  addExplodable(group, housingGroup, new THREE.Vector3(0, 0, 0), explodableItems);

  // 3. Heavy-Load Safety-Yellow Helical Coil Spring
  const springGroup = new THREE.Group();
  springGroup.position.set(0, 0.34, 0);

  const coilPts: THREE.Vector3[] = [];
  const coilTurns = 5.5;
  const segments = 120;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * coilTurns;
    coilPts.push(
      new THREE.Vector3(
        Math.cos(angle) * 0.52,
        t * 1.24,
        Math.sin(angle) * 0.52
      )
    );
  }
  const coilMesh = new THREE.Mesh(
    trackGeo(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 140, 0.095, 16, false)
    ),
    mat.safetyYellow
  );
  registerInteractive(coilMesh, specs.spring, interactiveMeshes, cast);
  springGroup.add(coilMesh);

  // Lower spring cup seat
  const springCup = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.60, 0.62, 0.10, 28)),
    mat.neoprene
  );
  springCup.position.y = 0.02;
  registerInteractive(springCup, specs.spring, interactiveMeshes, cast);
  springGroup.add(springCup);

  addExplodable(group, springGroup, new THREE.Vector3(0, 0.65, 0), explodableItems);

  // 4. Top Load Plate + Restraint Snubber Collars
  const topGroup = new THREE.Group();
  topGroup.position.set(0, 1.66, 0);

  const topPlateMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.62, 0.18, 1.32)),
    mat.galvanizedSteel
  );
  registerInteractive(topPlateMesh, specs.topPlate, interactiveMeshes, cast);
  topGroup.add(topPlateMesh);

  const upperCup = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 28)),
    mat.neoprene
  );
  upperCup.position.y = -0.14;
  registerInteractive(upperCup, specs.topPlate, interactiveMeshes, cast);
  topGroup.add(upperCup);

  addExplodable(group, topGroup, new THREE.Vector3(0, 1.45, 0), explodableItems);

  // 5. M20 Central Leveling Stud & Heavy Hex Locknut
  const boltGroup = new THREE.Group();
  boltGroup.position.set(0, 1.98, 0);

  const stud = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.72, 20)),
    mat.steel
  );
  registerInteractive(stud, specs.levelingBolt, interactiveMeshes, cast);
  boltGroup.add(stud);

  const hexNut = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 6)),
    mat.brass
  );
  hexNut.position.y = -0.12;
  registerInteractive(hexNut, specs.levelingBolt, interactiveMeshes, cast);
  boltGroup.add(hexNut);

  const topHexHead = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 6)),
    mat.steel
  );
  topHexHead.position.y = 0.34;
  registerInteractive(topHexHead, specs.levelingBolt, interactiveMeshes, cast);
  boltGroup.add(topHexHead);

  addExplodable(group, boltGroup, new THREE.Vector3(0, 2.2, 0), explodableItems);

  return {
    group,
    explodableItems,
    interactiveMeshes,
    subParts: Object.values(specs),
    disposables,
  };
}

export function buildDaikinPartAssembly(
  partId: DaikinPartId,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltPartAssembly {
  switch (partId) {
    case 'ekexv-valve':
      return buildEkexvValve(maxAnisotropy, isSoftwareGl);
    case 'nitrogen-regulator':
      return buildNitrogenRegulator(maxAnisotropy, isSoftwareGl);
    case 'seismic-isolator':
      return buildSeismicIsolator(maxAnisotropy, isSoftwareGl);
    case 'refnet-joint':
    default:
      return buildRefnetJoint(maxAnisotropy, isSoftwareGl);
  }
}
