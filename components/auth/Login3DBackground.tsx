"use client";

import React, { useEffect, useRef } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  isSpecial: boolean;
  phase: number;
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

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateSize = () => {
      if (!canvas) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx.scale(dpr, dpr);
    };

    updateSize();

    window.addEventListener("resize", updateSize);

    // Generate 3D Neo-Brutalist Student Network Constellation
    const nodes: Node3D[] = [];
    const gridSize = 3;
    const spacing = 95;

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        for (let z = -1; z <= 1; z++) {
          // Jitter positions slightly for organic technical graph feel
          const jitterX = (Math.sin(x * 3 + y * 7) * 20);
          const jitterY = (Math.cos(y * 5 + z * 3) * 20);
          const jitterZ = (Math.sin(z * 4 + x * 2) * 25);

          const posX = x * spacing + jitterX;
          const posY = y * spacing + jitterY;
          const posZ = z * spacing + jitterZ;

          nodes.push({
            x: posX,
            y: posY,
            z: posZ,
            baseX: posX,
            baseY: posY,
            baseZ: posZ,
            isSpecial: (x + y + z) % 5 === 0,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    let angleY = 0.35;
    let angleX = 0.25;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let tick = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = width / 2;
      const centerY = height / 2;
      targetMouseX = ((e.clientX - centerX) / width) * 0.35;
      targetMouseY = ((e.clientY - centerY) / height) * 0.35;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      tick += 0.015;

      if (!prefersReducedMotion) {
        angleY += 0.002;
        angleX += 0.001;

        // Smooth mouse damping
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;
      }

      const effAngleY = angleY + currentMouseX;
      const effAngleX = angleX + currentMouseY;

      const cosY = Math.cos(effAngleY);
      const sinY = Math.sin(effAngleY);
      const cosX = Math.cos(effAngleX);
      const sinX = Math.sin(effAngleX);

      const fov = 500;
      const projectedNodes: Array<{
        px: number;
        py: number;
        scale: number;
        z: number;
        isSpecial: boolean;
      }> = [];

      // 3D Projection Calculation
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Float oscillation
        const floatOffset = Math.sin(tick + node.phase) * 6;
        const curY = node.baseY + floatOffset;

        // Rotate around Y-axis
        const x1 = node.baseX * cosY - node.baseZ * sinY;
        const z1 = node.baseZ * cosY + node.baseX * sinY;

        // Rotate around X-axis
        const y2 = curY * cosX - z1 * sinX;
        const z2 = z1 * cosX + curY * sinX + 420; // Camera distance

        const scale = fov / (fov + z2);
        const px = x1 * scale + width / 2;
        const py = y2 * scale + height / 2;

        projectedNodes.push({
          px,
          py,
          scale,
          z: z2,
          isSpecial: node.isSpecial,
        });
      }

      // Draw 3D Connecting Grid Lines
      const maxDistSq = 9500;

      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const alpha = (1 - distSq / maxDistSq) * 0.18 * Math.min(p1.scale, p2.scale) * 1.5;
            if (p1.isSpecial && p2.isSpecial) {
              ctx.strokeStyle = `rgba(214, 248, 39, ${Math.min(0.6, alpha * 2.5)})`;
              ctx.lineWidth = 1.5;
            } else {
              ctx.strokeStyle = `rgba(13, 13, 13, ${Math.min(0.25, alpha)})`;
              ctx.lineWidth = 1;
            }

            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw 3D Nodes (Points & Special Squad Anchors)
      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        const radius = Math.max(1.5, (p.isSpecial ? 4.5 : 2.5) * p.scale);

        if (p.isSpecial) {
          // Special Caca Lime Squad Node with ink border
          ctx.fillStyle = "#D6F827";
          ctx.strokeStyle = "#0D0D0D";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Standard student network node
          ctx.fillStyle = "rgba(13, 13, 13, 0.4)";
          ctx.beginPath();
          ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Subtle Neo-Brutalist Corner Crosshairs on 3D Bounding Area
      const cornerSize = 5;
      ctx.strokeStyle = "rgba(13, 13, 13, 0.2)";
      ctx.lineWidth = 1;

      for (let i = 0; i < projectedNodes.length; i += 12) {
        const p = projectedNodes[i];
        if (p.scale > 0.8) {
          ctx.beginPath();
          ctx.moveTo(p.px - cornerSize, p.py);
          ctx.lineTo(p.px + cornerSize, p.py);
          ctx.moveTo(p.px, p.py - cornerSize);
          ctx.lineTo(p.px, p.py + cornerSize);
          ctx.stroke();
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
