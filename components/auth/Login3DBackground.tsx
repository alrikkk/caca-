"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// 3D Point Interface
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// 3D Object Definition
interface Object3D {
  type: "cube" | "molecule" | "tetrahedron" | "surface" | "graph" | "organic_chem" | "math_graph";
  center: Point3D;
  vertices: Point3D[];
  edges: [number, number][];
  specialEdges?: [number, number][];
  specialVertices?: number[];
  labels?: Array<{ vertexIndex: number; text: string }>;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
}

export const Login3DBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // ----------------------------------------------------
    // 1. UPPER-LEFT: 3D Organic Chemistry Molecule (Fused Aromatic Rings + Branches)
    // ----------------------------------------------------
    const createOrganicChemistryMolecule = (cx: number, cy: number, scale: number): Object3D => {
      const v: Point3D[] = [];
      const e: [number, number][] = [];
      const s = scale * 0.75;

      // Ring 1 (6 carbons of left benzene ring)
      v.push({ x: -s * 1.5, y: 0, z: -4 }); // 0
      v.push({ x: -s * 1.0, y: -s * 0.86, z: 2 }); // 1
      v.push({ x: 0, y: -s * 0.86, z: -2 }); // 2 (shared)
      v.push({ x: s * 0.5, y: 0, z: 4 }); // 3 (shared bridge)
      v.push({ x: 0, y: s * 0.86, z: -2 }); // 4 (shared)
      v.push({ x: -s * 1.0, y: s * 0.86, z: 2 }); // 5

      // Ring 1 edges
      e.push([0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]);

      // Ring 2 (fused right ring sharing vertices 2, 3, 4)
      v.push({ x: s * 1.5, y: -s * 0.86, z: -3 }); // 6
      v.push({ x: s * 2.0, y: 0, z: 3 }); // 7
      v.push({ x: s * 1.5, y: s * 0.86, z: -3 }); // 8

      // Ring 2 edges
      e.push([2, 6], [6, 7], [7, 8], [8, 4]);

      // Functional branch 1: Hydroxyl / Carbonyl group on left ring
      v.push({ x: -s * 2.2, y: -s * 0.6, z: 8 }); // 9 (-OH / =O)
      e.push([0, 9]);

      // Functional branch 2: Methyl branch on right ring
      v.push({ x: s * 2.7, y: s * 0.4, z: -6 }); // 10 (-CH3)
      e.push([7, 10]);

      // Functional branch 3: Nitrogen / Oxygen heteroatom top branch
      v.push({ x: s * 0.75, y: -s * 1.6, z: 6 }); // 11
      e.push([6, 11]);

      // Special aromatic double bond indicators & functional highlights
      const specialEdges: [number, number][] = [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
        [0, 9],
      ];

      const specialVertices = [0, 9, 10, 11]; // Functional highlight atoms

      return {
        type: "organic_chem",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        specialEdges,
        specialVertices,
        rotX: 0.35,
        rotY: 0.5,
        rotZ: 0.15,
        rotSpeedX: 0.0015,
        rotSpeedY: 0.003,
        rotSpeedZ: 0.001,
      };
    };

    // ----------------------------------------------------
    // 2. UPPER-RIGHT: 3D Mathematical Coordinate Graph (XYZ Axes + Surface Mesh)
    // ----------------------------------------------------
    const createMathCoordinateGraph = (cx: number, cy: number, size: number): Object3D => {
      const v: Point3D[] = [];
      const e: [number, number][] = [];
      const s = size * 0.85;

      // 3D Coordinate Axes (X, Y, Z)
      const originIdx = 0;
      v.push({ x: 0, y: 0, z: 0 }); // 0: Origin

      const xTip = 1;
      v.push({ x: s * 1.35, y: 0, z: 0 }); // 1: +X axis
      e.push([0, 1]);

      const yTip = 2;
      v.push({ x: 0, y: -s * 1.35, z: 0 }); // 2: +Y axis (up)
      e.push([0, 2]);

      const zTip = 3;
      v.push({ x: 0, y: 0, z: s * 1.35 }); // 3: +Z axis (outward)
      e.push([0, 3]);

      // Mathematical Hyperbolic Paraboloid Surface: z = (x² - y²) / c
      const steps = 4;
      const stepSize = s / steps;
      const baseSurfaceIdx = v.length;

      for (let i = -steps; i <= steps; i++) {
        for (let j = -steps; j <= steps; j++) {
          const x = i * (stepSize * 0.7);
          const y = j * (stepSize * 0.7);
          // Hyperbolic saddle function
          const z = ((i * i - j * j) / (steps * steps)) * (s * 0.5);
          v.push({ x, y: y * 0.8, z });
        }
      }

      const stride = steps * 2 + 1;
      for (let i = 0; i <= steps * 2; i++) {
        for (let j = 0; j <= steps * 2; j++) {
          const curr = baseSurfaceIdx + i * stride + j;
          if (j < steps * 2) e.push([curr, curr + 1]);
          if (i < steps * 2) e.push([curr, curr + stride]);
        }
      }

      const specialVertices = [xTip, yTip, zTip, originIdx];
      const specialEdges: [number, number][] = [
        [0, 1],
        [0, 2],
        [0, 3],
      ];

      return {
        type: "math_graph",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        specialEdges,
        specialVertices,
        labels: [
          { vertexIndex: 1, text: "X" },
          { vertexIndex: 2, text: "Z" },
          { vertexIndex: 3, text: "Y" },
        ],
        rotX: 0.65,
        rotY: 0.8,
        rotZ: 0.25,
        rotSpeedX: 0.002,
        rotSpeedY: 0.004,
        rotSpeedZ: 0.001,
      };
    };

    // ----------------------------------------------------
    // Other Peripheral Objects (Preserved)
    // ----------------------------------------------------
    const createCube = (cx: number, cy: number, size: number): Object3D => {
      const s = size / 2;
      const v: Point3D[] = [
        { x: -s, y: -s, z: -s },
        { x: s, y: -s, z: -s },
        { x: s, y: s, z: -s },
        { x: -s, y: s, z: -s },
        { x: -s, y: -s, z: s },
        { x: s, y: -s, z: s },
        { x: s, y: s, z: s },
        { x: -s, y: s, z: s },
      ];
      const e: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      return {
        type: "cube",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        specialEdges: [[4, 5], [5, 6], [6, 7], [7, 4]],
        specialVertices: [4, 5, 6, 7],
        rotX: 0.4,
        rotY: 0.6,
        rotZ: 0.2,
        rotSpeedX: 0.003,
        rotSpeedY: 0.005,
        rotSpeedZ: 0.002,
      };
    };

    const createTetrahedron = (cx: number, cy: number, size: number): Object3D => {
      const s = size;
      const v: Point3D[] = [
        { x: 0, y: -s * 0.8, z: 0 },
        { x: -s * 0.7, y: s * 0.5, z: -s * 0.5 },
        { x: s * 0.7, y: s * 0.5, z: -s * 0.5 },
        { x: 0, y: s * 0.5, z: s * 0.7 },
      ];
      const e: [number, number][] = [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [2, 3], [3, 1],
      ];
      return {
        type: "tetrahedron",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        specialVertices: [0],
        rotX: 0.2,
        rotY: 0.3,
        rotZ: 0.1,
        rotSpeedX: 0.004,
        rotSpeedY: 0.003,
        rotSpeedZ: 0.001,
      };
    };

    const createMolecule = (cx: number, cy: number, radius: number): Object3D => {
      const v: Point3D[] = [];
      const e: [number, number][] = [];
      const ringCount = 6;

      for (let i = 0; i < ringCount; i++) {
        const theta = (i * 2 * Math.PI) / ringCount;
        v.push({
          x: Math.cos(theta) * radius,
          y: Math.sin(theta) * radius,
          z: (i % 2 === 0 ? 1 : -1) * 8,
        });
      }
      for (let i = 0; i < ringCount; i++) {
        e.push([i, (i + 1) % ringCount]);
      }

      const branchRadius = radius * 1.55;
      for (let i = 0; i < 3; i++) {
        const idx = i * 2;
        const theta = (idx * 2 * Math.PI) / ringCount;
        v.push({
          x: Math.cos(theta) * branchRadius,
          y: Math.sin(theta) * branchRadius,
          z: (i % 2 === 0 ? 12 : -12),
        });
        e.push([idx, ringCount + i]);
      }

      return {
        type: "molecule",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        specialVertices: [0, 2, 4, ringCount],
        rotX: 0.5,
        rotY: 0.2,
        rotZ: 0.4,
        rotSpeedX: 0.002,
        rotSpeedY: 0.004,
        rotSpeedZ: 0.001,
      };
    };

    const createParametricSurface = (cx: number, cy: number, size: number): Object3D => {
      const v: Point3D[] = [];
      const e: [number, number][] = [];
      const steps = 5;
      const stepSize = size / steps;

      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
          const x = (i - steps / 2) * stepSize;
          const y = (j - steps / 2) * stepSize;
          const z = Math.sin(i * 0.8) * Math.cos(j * 0.8) * 16;
          v.push({ x, y, z });
        }
      }

      const stride = steps + 1;
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
          const curr = i * stride + j;
          if (j < steps) e.push([curr, curr + 1]);
          if (i < steps) e.push([curr, curr + stride]);
        }
      }

      return {
        type: "surface",
        center: { x: cx, y: cy, z: 0 },
        vertices: v,
        edges: e,
        rotX: 1.1,
        rotY: 0.4,
        rotZ: 0.3,
        rotSpeedX: 0.001,
        rotSpeedY: 0.002,
        rotSpeedZ: 0.001,
      };
    };

    // Instantiate surrounding 3D elements
    const getObjects = (w: number, h: number): Object3D[] => {
      const isMobile = w < 768;
      const isTablet = w >= 768 && w < 1024;

      if (isMobile) {
        return [
          createOrganicChemistryMolecule(w * 0.18, h * 0.16, 24),
          createMathCoordinateGraph(w * 0.82, h * 0.18, 26),
        ];
      }

      if (isTablet) {
        return [
          createOrganicChemistryMolecule(w * 0.16, h * 0.18, 32),
          createMathCoordinateGraph(w * 0.84, h * 0.18, 34),
          createTetrahedron(w * 0.14, h * 0.82, 45),
          createParametricSurface(w * 0.84, h * 0.82, 60),
        ];
      }

      // Desktop full composition
      return [
        createOrganicChemistryMolecule(w * 0.15, h * 0.17, 38), // UPPER-LEFT: 3D Organic Chemistry
        createMathCoordinateGraph(w * 0.86, h * 0.17, 40), // UPPER-RIGHT: 3D Mathematical Coordinate Graph
        createTetrahedron(w * 0.12, h * 0.52, 48),
        createParametricSurface(w * 0.88, h * 0.56, 75),
        createMolecule(w * 0.16, h * 0.84, 38),
        createCube(w * 0.84, h * 0.84, 46),
      ];
    };

    let objects = getObjects(width, height);

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = width / 2;
      const centerY = height / 2;
      targetMouseX = ((e.clientX - centerX) / width) * 0.4;
      targetMouseY = ((e.clientY - centerY) / height) * 0.4;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const fov = 450;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;
      }

      // Render each peripheral 3D object
      for (let oIdx = 0; oIdx < objects.length; oIdx++) {
        const obj = objects[oIdx];

        if (!prefersReducedMotion) {
          obj.rotX += obj.rotSpeedX;
          obj.rotY += obj.rotSpeedY;
          obj.rotZ += obj.rotSpeedZ;
        }

        const effRotX = obj.rotX + mouseY * 0.5;
        const effRotY = obj.rotY + mouseX * 0.5;

        const cosX = Math.cos(effRotX);
        const sinX = Math.sin(effRotX);
        const cosY = Math.cos(effRotY);
        const sinY = Math.sin(effRotY);
        const cosZ = Math.cos(obj.rotZ);
        const sinZ = Math.sin(obj.rotZ);

        // Project vertices
        const projected = obj.vertices.map((v) => {
          // Rotate Z
          const x1 = v.x * cosZ - v.y * sinZ;
          const y1 = v.y * cosZ + v.x * sinZ;
          const z1 = v.z;

          // Rotate Y
          const x2 = x1 * cosY - z1 * sinY;
          const z2 = z1 * cosY + x1 * sinY;

          // Rotate X
          const y3 = y1 * cosX - z2 * sinX;
          const z3 = z2 * cosX + y1 * sinX + 280; // Distance

          const scale = fov / (fov + z3);
          const px = x2 * scale + obj.center.x;
          const py = y3 * scale + obj.center.y;

          return { px, py, scale, z: z3 };
        });

        // Draw object edges
        for (let eIdx = 0; eIdx < obj.edges.length; eIdx++) {
          const [i1, i2] = obj.edges[eIdx];
          const p1 = projected[i1];
          const p2 = projected[i2];

          const isSpecialEdge = obj.specialEdges?.some(
            (se) => (se[0] === i1 && se[1] === i2) || (se[0] === i2 && se[1] === i1)
          );

          if (isSpecialEdge) {
            ctx.strokeStyle = "rgba(214, 248, 39, 0.9)";
            ctx.lineWidth = obj.type === "math_graph" ? 2 : 2.2;
          } else {
            ctx.strokeStyle = obj.type === "math_graph" ? "rgba(13, 13, 13, 0.25)" : "rgba(13, 13, 13, 0.35)";
            ctx.lineWidth = obj.type === "math_graph" ? 0.9 : 1.2;
          }

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }

        // Draw object nodes / atoms / axis points
        for (let vIdx = 0; vIdx < projected.length; vIdx++) {
          const p = projected[vIdx];
          const isSpecial = obj.specialVertices?.includes(vIdx);
          const radius = Math.max(1.8, (isSpecial ? 5.2 : (obj.type === "math_graph" ? 2.0 : 3.2)) * p.scale);

          if (isSpecial) {
            // Neon Lime Student Atom/Vertex with hard black border
            ctx.fillStyle = "#D6F827";
            ctx.strokeStyle = "#0D0D0D";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (obj.type !== "math_graph") {
            // Ink Node
            ctx.fillStyle = "#0D0D0D";
            ctx.beginPath();
            ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw coordinate labels if present (X, Y, Z)
        if (obj.labels) {
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = "#0D0D0D";
          for (const label of obj.labels) {
            const p = projected[label.vertexIndex];
            if (p) {
              ctx.fillText(label.text, p.px + 4, p.py - 4);
            }
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none font-mono"
      aria-hidden="true"
    >
      {/* 3D Perspective Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ============================================================ */}
      {/* Surrounding Floating Academic, Math & Student Project Badges */}
      {/* ============================================================ */}

      {/* 1. TOP-LEFT: 3D Organic Chemistry Molecule Tag (Replaces black-circled element) */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-12 space-y-1.5 opacity-90 hidden sm:block animate-float-slow">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-hard shadow-hard-sm text-[11px] font-bold uppercase text-ink">
          <span className="bg-caca-lime text-ink px-1 border-hard-sm text-[9px] font-black">
            CHEM
          </span>
          <span>C₁₀H₈ // FUSED AROMATIC RING</span>
        </div>
        <p className="text-[10px] text-ink-muted uppercase font-bold pl-0.5">
          [SYNTHESIS] → SP² HYBRIDIZATION // π-ORBITALS
        </p>
      </div>

      {/* 2. TOP-RIGHT: 3D Mathematical Coordinate Graph Tag (Replaces red-circled element) */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-12 text-right space-y-1.5 opacity-90 hidden sm:block animate-float-delayed">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-hard shadow-hard-sm text-[11px] font-bold uppercase text-ink">
          <span className="text-caca-blue font-black">f(x,y)</span>
          <span>z = x² - y² // 3D MANIFOLD</span>
        </div>
        <p className="text-[10px] text-ink-muted uppercase font-bold pr-0.5">
          [CALCULUS] → ∇f(x,y) = [2x, -2y]ᵀ // SADDLE POINT
        </p>
      </div>

      {/* LEFT (Beside Login Card): Matrix & Squad Synergy Graph (UNCHANGED) */}
      <div className="absolute left-6 lg:left-14 top-1/2 -translate-y-1/2 space-y-3 hidden lg:block animate-float-slow">
        {/* Linear Algebra Matrix Card */}
        <div className="p-3 bg-white border-hard shadow-hard-sm space-y-1 max-w-[200px]">
          <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted border-b border-ink/10 pb-1">
            <span>TRANSFORM MATRIX</span>
            <span className="text-caca-blue font-black">SO(2)</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-ink py-0.5">
            <div>[ cos θ &nbsp;-sin θ ]</div>
            <div>[ sin θ &nbsp;&nbsp;cos θ ]</div>
          </div>
          <div className="text-[9px] text-ink-muted font-bold pt-0.5 border-t border-ink/10">
            det(A) = 1.0 • λv = Av
          </div>
        </div>

        {/* Synergy Node Pill */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-canvas-subtle border-hard text-[10px] font-bold text-ink">
          <span className="w-2 h-2 rounded-full bg-caca-lime border-hard-sm animate-pulse" />
          <span>SQUAD_SYNERGY: 98.4%</span>
        </div>
      </div>

      {/* RIGHT (Beside Login Card): Terminal / Code Snippet (UNCHANGED) */}
      <div className="absolute right-6 lg:right-14 top-1/2 -translate-y-1/2 space-y-3 hidden lg:block animate-float-delayed">
        {/* Mini Software Snippet */}
        <div className="p-3 bg-white border-hard shadow-hard-sm space-y-1.5 max-w-[220px]">
          <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted border-b border-ink/10 pb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 border-hard-sm rounded-full" />
              <span className="w-2 h-2 bg-yellow-400 border-hard-sm rounded-full" />
              <span className="w-2 h-2 bg-caca-lime border-hard-sm rounded-full" />
            </span>
            <span className="text-ink font-bold">match.ts</span>
          </div>
          <pre className="text-[10px] font-mono font-medium text-ink leading-snug">
            <code>
              <span className="text-caca-blue font-bold">const</span> squad ={" "}
              <span className="text-purple-600 font-bold">await</span>{" "}
              match(&#123;{"\n"}
              &nbsp;&nbsp;stack: [<span className="text-green-600">&quot;AI&quot;</span>,{" "}
              <span className="text-green-600">&quot;Next&quot;</span>],{"\n"}
              &nbsp;&nbsp;status:{" "}
              <span className="bg-caca-lime px-1 border-hard-sm font-bold text-[9px]">
                &quot;READY&quot;
              </span>
              {"\n"}&#125;);
            </code>
          </pre>
        </div>

        {/* AI Activation Formula */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-canvas-subtle border-hard text-[10px] font-bold text-ink">
          <span>σ(z) = 1 / (1 + e⁻ᶻ)</span>
        </div>
      </div>

      {/* BOTTOM-LEFT: Calculus & Autonomous Systems (UNCHANGED) */}
      <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-12 space-y-1.5 opacity-90 hidden sm:block animate-float-delayed">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-hard shadow-hard-sm text-[11px] font-bold uppercase text-ink">
          <span className="text-caca-coral font-black">∇</span>
          <span>∂L/∂W = Xᵀ(ŷ - y)</span>
        </div>
        <p className="text-[10px] text-ink-muted uppercase font-bold pl-0.5">
          [RESEARCH] → AUTONOMOUS_ROVER // SPRINT_04
        </p>
      </div>

      {/* BOTTOM-RIGHT: Verification & Production Ship (UNCHANGED) */}
      <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 text-right space-y-1.5 opacity-90 hidden sm:block animate-float-slow">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-hard shadow-hard-sm text-[11px] font-bold uppercase text-ink">
          <span className="text-caca-green font-black">✓</span>
          <span>PROD_STAGE // ALL TESTS PASS</span>
          <span className="bg-caca-lime px-1 border-hard-sm text-[9px] font-black">
            100%
          </span>
        </div>
        <p className="text-[10px] text-ink-muted uppercase font-bold pr-0.5">
          ∮ E · dA = Q / ε₀
        </p>
      </div>
    </div>
  );
};
