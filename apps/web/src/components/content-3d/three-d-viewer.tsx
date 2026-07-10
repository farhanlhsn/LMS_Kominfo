"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useProgress } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { Box3, Vector3 } from "three";
import { Download, RotateCw, ZoomIn } from "lucide-react";
import type { ThreeDAssetRecord } from "../../lib/lms-types";
import { LoadingState } from "../ui/states";
import { ErrorBoundary } from "../ui/error-boundary";

function ProgressLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-white/70">{Math.round(progress)}% loading</span>
      </div>
    </Html>
  );
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const ref = useRef<any>(null);
  if (ref.current && gltf.scene) {
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim;
      ref.current.scale.setScalar(scale);
      const center = box.getCenter(new Vector3());
      ref.current.position.copy(center.multiplyScalar(-scale));
    }
  }
  return <primitive ref={ref} object={gltf.scene} />;
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const ref = useRef<any>(null);
  if (ref.current && obj) {
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim;
      ref.current.scale.setScalar(scale);
      const center = box.getCenter(new Vector3());
      ref.current.position.copy(center.multiplyScalar(-scale));
    }
  }
  return <primitive ref={ref} object={obj} />;
}

function ObjWithMtlModel({ url, mtlUrl }: { url: string; mtlUrl: string }) {
  const mtl = useLoader(MTLLoader, mtlUrl);
  const obj = useLoader(OBJLoader, url, (loader) => {
    mtl.preload();
    loader.setMaterials(mtl);
  });
  const ref = useRef<any>(null);
  if (ref.current && obj) {
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim;
      ref.current.scale.setScalar(scale);
      const center = box.getCenter(new Vector3());
      ref.current.position.copy(center.multiplyScalar(-scale));
    }
  }
  return <primitive ref={ref} object={obj} />;
}

function WireframeBox() {
  const ref = useRef<any>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.4; });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshStandardMaterial color="#0f766e" wireframe />
    </mesh>
  );
}

export interface ThreeDViewerProps {
  asset: ThreeDAssetRecord | null;
  loading?: boolean;
  error?: unknown;
  height?: number;
  showInfo?: boolean;
  autoRotate?: boolean;
  mtlUrl?: string | null;
}

export function ThreeDViewer({ asset, loading, error, height = 420, showInfo = true, autoRotate = true, mtlUrl }: ThreeDViewerProps) {
  const [spinning, setSpinning] = useState(autoRotate);
  const isGltf = asset?.format === "GLB" || asset?.format === "GLTF";
  const isObj = asset?.format === "OBJ";
  const isRenderable = isGltf || isObj;

  if (loading) return <LoadingState title="Loading 3D asset" />;

  if (!asset) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground">
        <div className="rounded-full bg-muted p-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        </div>
        <p className="text-sm">No 3D asset selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorBoundary fallbackTitle="Could not load 3D model">
      <div style={{ height }} className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-3, -3, -3]} intensity={0.3} />
          <Suspense fallback={<ProgressLoader />}>
            {isGltf ? <GltfModel url={asset.url} /> :
             isObj && mtlUrl ? <ObjWithMtlModel url={asset.url} mtlUrl={mtlUrl} /> :
             isObj ? <ObjModel url={asset.url} /> :
             <WireframeBox />}
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls autoRotate={spinning} autoRotateSpeed={1.5} enablePan enableZoom enableRotate minDistance={1} maxDistance={10} />
        </Canvas>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={() => setSpinning((v) => !v)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm transition-colors ${spinning ? "bg-primary text-primary-foreground" : "bg-black/40 text-white hover:bg-black/60"}`}
            title="Toggle auto-rotate">
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <a href={asset.url} download className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm hover:bg-black/60" title="Download">
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-mono text-white backdrop-blur-sm">{asset.format}</div>

        {!isRenderable && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-2 text-center text-xs text-white/80 backdrop-blur-sm">
            {asset.format} — browser preview not supported. Download to view.
          </div>
        )}
      </div>
      </ErrorBoundary>

      {showInfo && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-sm font-medium">{asset.name}</span>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ZoomIn className="h-3 w-3" />{asset.format}</span>
            {asset.sizeBytes ? <span>{(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB</span> : null}
            {asset._count?.scenes ? <span>{asset._count.scenes} scene{asset._count.scenes !== 1 ? "s" : ""}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
