import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Box,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers,
  Grid3x3,
  Info,
  AlertTriangle,
  Power,
  Sliders,
  Eye,
  Cpu,
  Wrench,
} from 'lucide-react';
import {
  DAIKIN_PARTS_CATALOG,
  buildDaikinPartAssembly,
  createRadialContactShadowTexture,
  selectDefaultPartForCourse,
  type BuiltPartAssembly,
  type DaikinPartId,
  type SubPartSpec,
} from './three/daikinPartsGeometry';
import {
  DAIKIN_FULL_UNITS_CATALOG,
  DEFAULT_FULL_UNIT_STATE,
  buildDaikinFullUnitAssembly,
  selectDefaultFullUnitForCourse,
  type BuiltFullUnitAssembly,
  type DaikinFullUnitId,
  type FullUnitControlState,
} from './three/daikinFullUnitsGeometry';

interface DaikinParts3DViewerProps {
  courseCategory?: string;
  moduleTitle?: string;
}

type ViewerMode = 'full-units' | 'precision-parts';
type DockTab = 'controls' | 'inspect';
type CameraPreset = 'iso' | 'front' | 'top' | 'panel';

// Reusable scratch objects outside render loop (Zero GC)
const _tmpVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetControlsLookAt = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const DaikinParts3DViewer: React.FC<DaikinParts3DViewerProps> = ({
  courseCategory,
  moduleTitle,
}) => {
  const recommendedUnitId = useMemo(
    () => selectDefaultFullUnitForCourse(courseCategory, moduleTitle),
    [courseCategory, moduleTitle]
  );
  const recommendedPartId = useMemo(
    () => selectDefaultPartForCourse(courseCategory, moduleTitle),
    [courseCategory, moduleTitle]
  );

  const [viewerMode, setViewerMode] = useState<ViewerMode>('full-units');
  const [selectedUnitId, setSelectedUnitId] = useState<DaikinFullUnitId>(recommendedUnitId);
  const [selectedPartId, setSelectedPartId] = useState<DaikinPartId>(recommendedPartId);
  const [dockTab, setDockTab] = useState<DockTab>('controls');
  const [unitControls, setUnitControls] = useState<FullUnitControlState>(DEFAULT_FULL_UNIT_STATE);

  const [explodePercent, setExplodePercent] = useState<number>(0);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [dockExpanded, setDockExpanded] = useState<boolean>(true);
  const [selectedSubPart, setSelectedSubPart] = useState<SubPartSpec | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  // Sync recommended full unit & part when navigating courses/modules
  useEffect(() => {
    setSelectedUnitId(recommendedUnitId);
    setSelectedPartId(recommendedPartId);
    setExplodePercent(0);
    setSelectedSubPart(null);
  }, [recommendedUnitId, recommendedPartId]);

  const activeCatalogMeta = useMemo(() => {
    if (viewerMode === 'full-units') {
      return (
        DAIKIN_FULL_UNITS_CATALOG.find((u) => u.id === selectedUnitId) ||
        DAIKIN_FULL_UNITS_CATALOG[0]
      );
    }
    return (
      DAIKIN_PARTS_CATALOG.find((p) => p.id === selectedPartId) ||
      DAIKIN_PARTS_CATALOG[0]
    );
  }, [viewerMode, selectedUnitId, selectedPartId]);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const unitControlsRef = useRef<FullUnitControlState>(unitControls);
  unitControlsRef.current = unitControls;

  const sceneBridgeRef = useRef<{
    loadModel: (mode: ViewerMode, id: string) => void;
    setTargetExplode: (val: number) => void;
    setWireframe: (enabled: boolean) => void;
    applyCameraPreset: (preset: CameraPreset) => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const domEl = renderer.domElement;
    domEl.style.display = 'block';
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(domEl);

    // Scene & Horizon-Matched Fog
    const bgColor = 0x0b1424;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.036);

    // Procedural RoomEnvironment for crisp PBR metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.6, 2.7, 5.2);

    // OrbitControls (damping disabled on software WebGL)
    const controls = new OrbitControls(camera, domEl);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.0;
    controls.maxDistance = 15.0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 1.2, 0);

    // 3-Point Studio Lighting Rig (Warm Key + Cool Hemisphere Fill + Rim)
    const hemiLight = new THREE.HemisphereLight(0xbcd8ff, 0x1a2234, 0.98);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.25);
    keyLight.position.set(6.5, 9.0, 6.0);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 26;
      keyLight.shadow.camera.left = -5.5;
      keyLight.shadow.camera.right = 5.5;
      keyLight.shadow.camera.top = 5.5;
      keyLight.shadow.camera.bottom = -5.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-6.0, 4.8, -5.5);
    scene.add(rimLight);

    // Grounded Industrial Studio Bay Plinth & Contact Shadow
    const stageDisposables: Array<{ dispose: () => void }> = [];
    const floorGeo = new THREE.CylinderGeometry(5.6, 5.9, 0.14, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x132036,
      roughness: 0.72,
      metalness: 0.18,
    });
    const floorDisc = new THREE.Mesh(floorGeo, floorMat);
    floorDisc.position.y = -0.07;
    floorDisc.receiveShadow = !isSoftwareGl;
    scene.add(floorDisc);
    stageDisposables.push(floorGeo, floorMat);

    const ringGeo = new THREE.RingGeometry(2.8, 2.86, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.003;
    scene.add(ringMesh);
    stageDisposables.push(ringGeo, ringMat);

    const shadowTex = createRadialContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(5.4, 5.4);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.006;
    scene.add(shadowPlane);
    stageDisposables.push(shadowTex, shadowPlaneGeo, shadowPlaneMat);

    // Closure state
    let currentAssembly: BuiltPartAssembly | BuiltFullUnitAssembly | null = null;
    let activeMode: ViewerMode = 'full-units';
    let activeId: string = recommendedUnitId;
    let currentExplode = 0;
    let targetExplode = 0;
    let wireframeActive = false;
    let cameraAnimating = false;
    let highlightedMesh: THREE.Mesh | null = null;
    let highlightedPrevEmissive = 0x000000;
    let highlightedPrevIntensity = 0;
    let disposed = false;

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Paced on-demand + active-motion renderer with mandatory software WebGL fenceSync
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastFrameTime = performance.now();
    let elapsedTotal = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const now = performance.now();
        const dt = Math.min(0.1, Math.max(0.001, (now - lastFrameTime) / 1000));
        lastFrameTime = now;
        elapsedTotal += dt;

        let needsFollowup = false;

        // Live Full-Unit Physics/Controls Update (Fans, Dampers, Cutaway, Dynamic Display)
        if (currentAssembly && 'updateLiveState' in currentAssembly) {
          const liveAnimating = currentAssembly.updateLiveState(
            unitControlsRef.current,
            dt,
            elapsedTotal,
            isSoftwareGl
          );
          if (liveAnimating) {
            needsFollowup = true;
          }
        }

        // Smooth Exploded View Damping
        if (currentAssembly && Math.abs(currentExplode - targetExplode) > 0.002) {
          currentExplode = isSoftwareGl
            ? targetExplode
            : THREE.MathUtils.damp(currentExplode, targetExplode, 7.5, dt);
          for (let i = 0; i < currentAssembly.explodableItems.length; i++) {
            const item = currentAssembly.explodableItems[i];
            _tmpVec.copy(item.explodeOffset).multiplyScalar(currentExplode);
            item.object.position.copy(item.basePos).add(_tmpVec);
          }
          if (Math.abs(currentExplode - targetExplode) > 0.002) {
            needsFollowup = true;
          }
        }

        // Smooth Camera Preset Transition
        if (cameraAnimating) {
          if (isSoftwareGl) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetControlsLookAt);
            cameraAnimating = false;
          } else {
            const k = 7.0;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, k, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, k, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, k, dt);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetControlsLookAt.x, k, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetControlsLookAt.y, k, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetControlsLookAt.z, k, dt);
            if (
              camera.position.distanceTo(_targetCamPos) < 0.015 &&
              controls.target.distanceTo(_targetControlsLookAt) < 0.015
            ) {
              camera.position.copy(_targetCamPos);
              controls.target.copy(_targetControlsLookAt);
              cameraAnimating = false;
            } else {
              needsFollowup = true;
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (renderDirty || needsFollowup) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    function clearHighlight() {
      if (highlightedMesh) {
        const m = highlightedMesh.material as THREE.MeshStandardMaterial;
        if (m && m.emissive) {
          m.emissive.setHex(highlightedPrevEmissive);
          m.emissiveIntensity = highlightedPrevIntensity;
        }
        highlightedMesh = null;
      }
    }

    function applyWireframeToCurrent(enabled: boolean) {
      wireframeActive = enabled;
      if (!currentAssembly) return;
      currentAssembly.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if ('wireframe' in m) {
              (m as THREE.MeshStandardMaterial).wireframe = enabled;
            }
          });
        }
      });
      requestRender();
    }

    function getActiveCatalogRecord() {
      if (activeMode === 'full-units') {
        return (
          DAIKIN_FULL_UNITS_CATALOG.find((c) => c.id === activeId) ||
          DAIKIN_FULL_UNITS_CATALOG[0]
        );
      }
      return (
        DAIKIN_PARTS_CATALOG.find((c) => c.id === activeId) ||
        DAIKIN_PARTS_CATALOG[0]
      );
    }

    function applyCameraPreset(preset: CameraPreset) {
      const cat = getActiveCatalogRecord();
      _targetControlsLookAt.set(...cat.defaultTarget);
      if (preset === 'iso') {
        _targetCamPos.set(...cat.defaultCameraPos);
      } else if (preset === 'front') {
        _targetCamPos.set(0, cat.defaultTarget[1] + 0.3, 5.6);
      } else if (preset === 'top') {
        _targetCamPos.set(0.01, 6.8, 1.8);
      } else if (preset === 'panel') {
        // Close-up on the unit's live PCB / DDC / BRC / MicroTech control panel
        if (activeMode === 'full-units' && activeId === 'vrv-outdoor') {
          _targetControlsLookAt.set(-0.22, 1.72, 0.3);
          _targetCamPos.set(-0.22, 1.85, 2.3);
        } else if (activeMode === 'full-units' && activeId === 'modular-ahu') {
          _targetControlsLookAt.set(-0.55, 1.3, 0.9);
          _targetCamPos.set(-0.55, 1.45, 2.9);
        } else if (activeMode === 'full-units' && activeId === 'fxsq-ducted') {
          _targetControlsLookAt.set(-1.58, 0.42, 0.6);
          _targetCamPos.set(-1.58, 0.65, 2.25);
        } else if (activeMode === 'full-units' && activeId === 'ewad-chiller') {
          _targetControlsLookAt.set(1.98, 1.54, 0);
          _targetCamPos.set(4.1, 1.7, 0.6);
        } else {
          _targetCamPos.set(...cat.defaultCameraPos);
        }
      }
      cameraAnimating = true;
      requestRender();
    }

    function disposeCurrentAssembly() {
      clearHighlight();
      if (!currentAssembly) return;
      scene.remove(currentAssembly.group);
      currentAssembly.disposables.forEach((d) => d.dispose());
      currentAssembly = null;
    }

    function loadModel(mode: ViewerMode, id: string) {
      disposeCurrentAssembly();
      activeMode = mode;
      activeId = id;
      currentExplode = 0;
      targetExplode = 0;

      const built =
        mode === 'full-units'
          ? buildDaikinFullUnitAssembly(id as DaikinFullUnitId, maxAnisotropy, isSoftwareGl)
          : buildDaikinPartAssembly(id as DaikinPartId, maxAnisotropy, isSoftwareGl);

      currentAssembly = built;
      scene.add(built.group);

      if (wireframeActive) {
        applyWireframeToCurrent(true);
      }

      const cat = getActiveCatalogRecord();
      camera.position.set(...cat.defaultCameraPos);
      controls.target.set(...cat.defaultTarget);
      cameraAnimating = false;
      controls.update();

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
      requestRender();
    }

    controls.addEventListener('start', () => {
      cameraAnimating = false;
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    // Layer-1 Raycasting for Click-to-Inspect
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTs = 0;

    const getCanvasNdc = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTs < 65 || !currentAssembly) return;
      lastHoverTs = now;
      getCanvasNdc(e);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(currentAssembly.interactiveMeshes, false);
      domEl.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6 || !currentAssembly) return;

      getCanvasNdc(e);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(currentAssembly.interactiveMeshes, false);

      clearHighlight();
      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const spec = hitMesh.userData.partSpec as SubPartSpec | undefined;
        if (spec) {
          const mat = hitMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            highlightedMesh = hitMesh;
            highlightedPrevEmissive = mat.emissive.getHex();
            highlightedPrevIntensity = mat.emissiveIntensity ?? 1;
            mat.emissive.setHex(0x0ea5e9);
            mat.emissiveIntensity = 0.45;
          }
          setSelectedSubPart(spec);
          setDockExpanded(true);
          requestRender();
        }
      } else {
        setSelectedSubPart(null);
        requestRender();
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    domEl.addEventListener('webglcontextlost', onContextLost);
    domEl.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 320);
        const h = Math.max(entry.contentRect.height, 320);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    sceneBridgeRef.current = {
      loadModel,
      setTargetExplode: (val: number) => {
        targetExplode = THREE.MathUtils.clamp(val, 0, 1);
        requestRender();
      },
      setWireframe: applyWireframeToCurrent,
      applyCameraPreset,
      requestRender,
    };

    loadModel('full-units', recommendedUnitId);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);
      disposeCurrentAssembly();
      stageDisposables.forEach((d) => d.dispose());
      envRT.dispose();
      controls.dispose();
      renderer.dispose();
      sceneBridgeRef.current = null;
    };
  }, []);

  // Push model selection updates into live scene
  useEffect(() => {
    const id = viewerMode === 'full-units' ? selectedUnitId : selectedPartId;
    sceneBridgeRef.current?.loadModel(viewerMode, id);
  }, [viewerMode, selectedUnitId, selectedPartId]);

  useEffect(() => {
    sceneBridgeRef.current?.setTargetExplode(explodePercent / 100);
  }, [explodePercent]);

  useEffect(() => {
    sceneBridgeRef.current?.setWireframe(wireframeMode);
  }, [wireframeMode]);

  // Wake renderer whenever unit control state updates
  useEffect(() => {
    sceneBridgeRef.current?.requestRender();
  }, [unitControls]);

  const updateVrv = (patch: Partial<FullUnitControlState['vrv']>) =>
    setUnitControls((prev) => ({ ...prev, vrv: { ...prev.vrv, ...patch } }));

  const updateAhu = (patch: Partial<FullUnitControlState['ahu']>) =>
    setUnitControls((prev) => ({ ...prev, ahu: { ...prev.ahu, ...patch } }));

  const updateFxsq = (patch: Partial<FullUnitControlState['fxsq']>) =>
    setUnitControls((prev) => ({ ...prev, fxsq: { ...prev.fxsq, ...patch } }));

  const updateChiller = (patch: Partial<FullUnitControlState['chiller']>) =>
    setUnitControls((prev) => ({ ...prev, chiller: { ...prev.chiller, ...patch } }));

  return (
    <div className="bg-[#0B1424] rounded-2xl overflow-hidden border border-slate-800 relative select-none">
      {/* Full-Bleed WebGL Viewport (taller for comfortable full-unit inspection) */}
      <div className="relative w-full h-[540px] sm:h-[600px]">
        {webglUnavailable ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-300 space-y-3">
            <Box className="w-8 h-8 text-sky-400" />
            <div className="text-base font-bold text-white">3D Equipment Preview Unavailable</div>
            <p className="text-xs text-slate-400 max-w-md">
              WebGL is disabled in this browser context. Review specifications for{' '}
              {activeCatalogMeta.name} ({activeCatalogMeta.modelCode}) in the lesson notes below.
            </p>
          </div>
        ) : (
          <div ref={canvasMountRef} className="w-full h-full" />
        )}

        {contextLost && (
          <div className="absolute inset-0 z-20 bg-[#0B1424]/95 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <div className="text-sm font-bold text-white">3D Graphics Context Paused</div>
            <p className="text-xs text-slate-400">Restoring WebGL rendering pipeline automatically...</p>
          </div>
        )}

        {/* Minimal Top-Left Equipment Spec Header (Solid/RGBA dark surface, zero backdrop-filter over WebGL) */}
        <div className="absolute top-3.5 left-3.5 z-10 pointer-events-auto max-w-[min(440px,calc(100%-2rem))] bg-[#0B1424]/92 border border-slate-700/80 rounded-xl px-3.5 py-2.5">
          <div className="text-[11px] font-mono tabular-nums text-sky-400 font-semibold">
            {viewerMode === 'full-units' ? 'Full Unit 3D Controls' : 'Precision Part Inspector'} ·{' '}
            {activeCatalogMeta.modelCode}
          </div>
          <div className="text-sm font-bold text-white leading-snug mt-0.5">
            {activeCatalogMeta.name}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Drag to orbit · Scroll to zoom · Click any internal assembly to inspect specs
          </div>
        </div>

        {/* Unified Collapsible Bottom Control Dock (Zero Mid-Viewport Occlusion) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[min(95%,920px)] pointer-events-auto">
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setDockExpanded((v) => !v)}
              className="px-3.5 py-1 bg-[#0F1C32] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              {dockExpanded ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                  Hide 3D Controls
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                  Show 3D Equipment Controls
                </>
              )}
            </button>
          </div>

          {dockExpanded && (
            <div className="bg-[#0F1C32]/96 border border-slate-700 rounded-2xl p-3 space-y-2.5 text-slate-100">
              {/* Row 1: Mode Switcher (Full Units vs Precision Parts) + Equipment Selector + Camera Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {/* Full Units vs Precision Parts */}
                  <div className="flex items-center gap-1 p-1 bg-[#08101E] rounded-lg border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setViewerMode('full-units');
                        setDockTab('controls');
                        setSelectedSubPart(null);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                        viewerMode === 'full-units'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3 h-3" />
                      Full Units (4)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewerMode('precision-parts');
                        setDockTab('inspect');
                        setSelectedSubPart(null);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                        viewerMode === 'precision-parts'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      Parts (4)
                    </button>
                  </div>

                  {/* Equipment / Part Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-[#08101E] rounded-lg border border-slate-800 overflow-x-auto max-w-full">
                    {viewerMode === 'full-units'
                      ? DAIKIN_FULL_UNITS_CATALOG.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUnitId(u.id);
                              setExplodePercent(0);
                              setSelectedSubPart(null);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap shrink-0 transition ${
                              selectedUnitId === u.id
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {u.shortLabel}
                          </button>
                        ))
                      : DAIKIN_PARTS_CATALOG.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPartId(p.id);
                              setExplodePercent(0);
                              setSelectedSubPart(null);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap shrink-0 transition ${
                              selectedPartId === p.id
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {p.shortLabel}
                          </button>
                        ))}
                  </div>
                </div>

                {/* Camera Presets & Dock Mode */}
                <div className="flex items-center gap-1 shrink-0">
                  {(['iso', 'front', 'top', ...(viewerMode === 'full-units' ? (['panel'] as CameraPreset[]) : [])] as CameraPreset[]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => sceneBridgeRef.current?.applyCameraPreset(preset)}
                        className="px-2 py-1 bg-[#08101E] hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-md whitespace-nowrap shrink-0"
                      >
                        {preset === 'iso'
                          ? 'Iso'
                          : preset === 'front'
                          ? 'Front'
                          : preset === 'top'
                          ? 'Top'
                          : 'Panel'}
                      </button>
                    )
                  )}
                  {viewerMode === 'full-units' && (
                    <button
                      type="button"
                      onClick={() => setDockTab((t) => (t === 'controls' ? 'inspect' : 'controls'))}
                      className={`px-2.5 py-1 border text-[11px] font-semibold rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                        dockTab === 'inspect'
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-[#08101E] hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {dockTab === 'controls' ? <Layers className="w-3 h-3" /> : <Sliders className="w-3 h-3" />}
                      {dockTab === 'controls' ? 'Explode' : 'Live Controls'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWireframeMode((w) => !w)}
                    title="Toggle Wireframe"
                    className={`p-1.5 border rounded-md shrink-0 transition ${
                      wireframeMode
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-[#08101E] hover:bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExplodePercent(0);
                      setWireframeMode(false);
                      setSelectedSubPart(null);
                      setUnitControls(DEFAULT_FULL_UNIT_STATE);
                      sceneBridgeRef.current?.applyCameraPreset('iso');
                    }}
                    title="Reset Unit & View"
                    className="p-1.5 bg-[#08101E] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-md shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Live Full-Unit Interactive Controls OR Exploded Assembly Slider */}
              {viewerMode === 'full-units' && dockTab === 'controls' ? (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  {/* VRV IV / X OUTDOOR UNIT LIVE CONTROLS */}
                  {selectedUnitId === 'vrv-outdoor' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                      <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateVrv({ powerOn: !unitControls.vrv.powerOn })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                            unitControls.vrv.powerOn
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {unitControls.vrv.powerOn ? 'Power ON' : 'Power OFF'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextCutaway = !unitControls.vrv.panelCutaway;
                            updateVrv({ panelCutaway: nextCutaway });
                            if (nextCutaway) sceneBridgeRef.current?.applyCameraPreset('panel');
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 border transition ${
                            unitControls.vrv.panelCutaway
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {unitControls.vrv.panelCutaway ? 'Close Panel' : 'Open PCB Panel'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateVrv({
                              pcbMode: unitControls.vrv.pcbMode === 'monitor' ? 'setting' : 'monitor',
                              panelCutaway: true,
                            })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.vrv.pcbMode === 'setting'
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#08101E] border-slate-700 text-sky-300'
                          }`}
                        >
                          BS1: {unitControls.vrv.pcbMode === 'setting' ? 'Mode 2' : 'Mode 1'}
                        </button>

                        {unitControls.vrv.pcbMode === 'setting' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const codes: Array<'2-49' | '2-35' | '2-20'> = ['2-49', '2-35', '2-20'];
                              const next = codes[(codes.indexOf(unitControls.vrv.settingCode) + 1) % codes.length];
                              updateVrv({ settingCode: next });
                            }}
                            className="px-2.5 py-1.5 bg-[#08101E] border border-amber-500/60 text-amber-300 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap shrink-0"
                          >
                            BS2 Code: [{unitControls.vrv.settingCode}]
                          </button>
                        ) : (
                          <select
                            aria-label="VRV Operating Mode"
                            value={unitControls.vrv.mode}
                            onChange={(e) =>
                              updateVrv({ mode: e.target.value as FullUnitControlState['vrv']['mode'] })
                            }
                            className="bg-[#08101E] border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg px-2 py-1.5"
                          >
                            <option value="cooling">Mode: Cooling</option>
                            <option value="test-run">Mode: Test Run (t01–t10)</option>
                            <option value="oil-recovery">Mode: 8h Oil Recovery</option>
                          </select>
                        )}

                        <select
                          aria-label="Inject VRV Fault Code"
                          value={unitControls.vrv.activeFault}
                          onChange={(e) => {
                            const val = e.target.value as FullUnitControlState['vrv']['activeFault'];
                            updateVrv({ activeFault: val, panelCutaway: val !== 'none' ? true : unitControls.vrv.panelCutaway });
                          }}
                          className={`border text-[11px] font-mono font-bold rounded-lg px-2 py-1.5 ${
                            unitControls.vrv.activeFault !== 'none'
                              ? 'bg-rose-950 border-rose-500 text-rose-300'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          <option value="none">Fault: None (OK)</option>
                          <option value="E3">Fault E3: High Pressure</option>
                          <option value="U4">Fault U4: F1/F2 Loss</option>
                          <option value="U3">Fault U3: No Test Run</option>
                          <option value="UF">Fault UF: Pipe Mismatch</option>
                        </select>
                      </div>

                      <div className="lg:col-span-5 flex items-center gap-2.5 bg-[#08101E] border border-slate-800 rounded-xl px-3 py-1.5">
                        <span className="text-[11px] text-slate-300 font-semibold whitespace-nowrap shrink-0">
                          Ambient DB
                        </span>
                        <input
                          type="range"
                          min={25}
                          max={52}
                          step={1}
                          value={unitControls.vrv.ambientTempC}
                          onChange={(e) => updateVrv({ ambientTempC: Number(e.target.value) })}
                          className="flex-1 accent-sky-500 cursor-pointer"
                        />
                        <span className="font-mono tabular-nums text-xs font-bold text-sky-400 w-12 text-right shrink-0">
                          {unitControls.vrv.ambientTempC}°C
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MODULAR AHU / FAHU LIVE CONTROLS */}
                  {selectedUnitId === 'modular-ahu' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                      <div className="lg:col-span-5 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateAhu({ powerOn: !unitControls.ahu.powerOn })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                            unitControls.ahu.powerOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {unitControls.ahu.powerOn ? 'Fan ON' : 'Fan OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAhu({ doorCutaway: !unitControls.ahu.doorCutaway })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                            unitControls.ahu.doorCutaway
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {unitControls.ahu.doorCutaway ? 'Doors Open' : 'Doors Closed'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateAhu({ heaterInterlockTest: !unitControls.ahu.heaterInterlockTest })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.ahu.heaterInterlockTest
                              ? 'bg-rose-600 border-rose-500 text-white'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          {unitControls.ahu.heaterInterlockTest ? 'Interlock TRIP' : 'Test Safety Cut'}
                        </button>
                      </div>

                      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-[#08101E] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] text-sky-300 font-mono font-bold whitespace-nowrap shrink-0">
                            0–10V DDC
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={unitControls.ahu.ddcVoltage}
                            onChange={(e) => updateAhu({ ddcVoltage: Number(e.target.value) })}
                            className="flex-1 accent-sky-500 cursor-pointer"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-sky-400 w-10 text-right shrink-0">
                            {unitControls.ahu.ddcVoltage.toFixed(1)}V
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#08101E] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] text-amber-300 font-semibold whitespace-nowrap shrink-0">
                            Damper
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={unitControls.ahu.damperPercent}
                            onChange={(e) => updateAhu({ damperPercent: Number(e.target.value) })}
                            className="flex-1 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-amber-400 w-10 text-right shrink-0">
                            {unitControls.ahu.damperPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FXSQ CONCEALED DUCTED LIVE CONTROLS */}
                  {selectedUnitId === 'fxsq-ducted' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                      <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateFxsq({ powerOn: !unitControls.fxsq.powerOn })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                            unitControls.fxsq.powerOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          BRC {unitControls.fxsq.powerOn ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateFxsq({
                              suctionMode: unitControls.fxsq.suctionMode === 'rear' ? 'bottom' : 'rear',
                            })
                          }
                          className="px-2.5 py-1.5 bg-[#08101E] border border-slate-700 text-sky-300 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0"
                        >
                          Suction: {unitControls.fxsq.suctionMode === 'rear' ? 'Rear' : 'Bottom'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFxsq({ drainPumpTest: !unitControls.fxsq.drainPumpTest })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.fxsq.drainPumpTest
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          {unitControls.fxsq.drainPumpTest ? '625mm Pump LIFTING' : 'Test 625mm Pump'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFxsq({ casingCutaway: !unitControls.fxsq.casingCutaway })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.fxsq.casingCutaway
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          {unitControls.fxsq.casingCutaway ? 'Lid Open' : 'Lid Closed'}
                        </button>
                      </div>

                      <div className="lg:col-span-5 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 bg-[#08101E] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] text-slate-300 whitespace-nowrap shrink-0">BRC</span>
                          <input
                            type="range"
                            min={16}
                            max={32}
                            step={1}
                            value={unitControls.fxsq.setpointC}
                            onChange={(e) => updateFxsq({ setpointC: Number(e.target.value) })}
                            className="flex-1 accent-sky-500 cursor-pointer"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-sky-400 shrink-0">
                            {unitControls.fxsq.setpointC}°C
                          </span>
                        </div>
                        <select
                          aria-label="FXSQ External Static Pressure"
                          value={unitControls.fxsq.espPa}
                          onChange={(e) =>
                            updateFxsq({
                              espPa: Number(e.target.value) as FullUnitControlState['fxsq']['espPa'],
                            })
                          }
                          className="bg-[#08101E] border border-slate-700 text-amber-300 text-[11px] font-mono font-bold rounded-xl px-2 py-1.5"
                        >
                          <option value={30}>ESP: 30 Pa</option>
                          <option value={50}>ESP: 50 Pa</option>
                          <option value={80}>ESP: 80 Pa</option>
                          <option value={120}>ESP: 120 Pa</option>
                          <option value={150}>ESP: 150 Pa</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* EWAD-TZ SCREW CHILLER LIVE CONTROLS */}
                  {selectedUnitId === 'ewad-chiller' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                      <div className="lg:col-span-6 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateChiller({ powerOn: !unitControls.chiller.powerOn })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                            unitControls.chiller.powerOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {unitControls.chiller.powerOn ? 'Run' : 'Standby'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChiller({ circuitA: !unitControls.chiller.circuitA })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.chiller.circuitA
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#08101E] border-slate-700 text-slate-400'
                          }`}
                        >
                          Ckt A: {unitControls.chiller.circuitA ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChiller({ circuitB: !unitControls.chiller.circuitB })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.chiller.circuitB
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#08101E] border-slate-700 text-slate-400'
                          }`}
                        >
                          Ckt B: {unitControls.chiller.circuitB ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChiller({ panelCutaway: !unitControls.chiller.panelCutaway })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                            unitControls.chiller.panelCutaway
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'bg-[#08101E] border-slate-700 text-slate-200'
                          }`}
                        >
                          {unitControls.chiller.panelCutaway ? 'Shroud Open' : 'Open Shroud'}
                        </button>
                      </div>

                      <div className="lg:col-span-6 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 bg-[#08101E] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] text-sky-300 font-mono whitespace-nowrap shrink-0">LWT</span>
                          <input
                            type="range"
                            min={5}
                            max={12}
                            step={0.5}
                            value={unitControls.chiller.chwSetpointC}
                            onChange={(e) => updateChiller({ chwSetpointC: Number(e.target.value) })}
                            className="flex-1 accent-sky-500 cursor-pointer"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-sky-400 shrink-0">
                            {unitControls.chiller.chwSetpointC.toFixed(1)}°C
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#08101E] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] text-amber-300 font-mono whitespace-nowrap shrink-0">Load</span>
                          <input
                            type="range"
                            min={25}
                            max={100}
                            step={5}
                            value={unitControls.chiller.coolingLoadPercent}
                            onChange={(e) => updateChiller({ coolingLoadPercent: Number(e.target.value) })}
                            className="flex-1 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-amber-400 shrink-0">
                            {unitControls.chiller.coolingLoadPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800">
                  <div className="md:col-span-5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Exploded View
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={explodePercent}
                      aria-label="Exploded View Separation Percentage"
                      onChange={(e) => setExplodePercent(Number(e.target.value))}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono tabular-nums text-xs font-bold text-amber-400 w-10 text-right shrink-0">
                      {explodePercent}%
                    </span>
                  </div>
                  <div className="md:col-span-7 text-[11px] text-slate-400 font-mono">
                    Slide to separate major panels & assemblies, or click any component in the 3D bay.
                  </div>
                </div>
              )}

              {/* Row 3: Clicked Sub-Assembly Technical Specification Readout */}
              <div className="text-xs bg-[#08101E] border border-slate-800 rounded-xl px-3 py-2">
                {selectedSubPart ? (
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-sky-400">
                      <span className="font-bold text-white font-sans text-xs">
                        {selectedSubPart.name}
                      </span>
                      <span>·</span>
                      <span>{selectedSubPart.spec}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      {selectedSubPart.installNote}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug">
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{activeCatalogMeta.manualRef}:</strong>{' '}
                      {activeCatalogMeta.summary}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
