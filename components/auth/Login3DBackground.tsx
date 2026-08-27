"use client";

import React, { useEffect, useRef } from "react";

export const Login3DBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // 3D Isometric Nodes & Wireframe Grid
    const nodes: Array<{ x: number; y: number; z: number; ox: number; oy: number; oz: number }> = [];
    const gridSize = 4;
    const spacing = 70;

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        for (let z = -1; z <= 1; z++) {
          nodes.push({
            x: x * spacing,
            y: y * spacing,
            z: z * spacing,
            ox: x * spacing,
            oy: y * spacing,
            oz: z * spacing,
          });
        }
      }
    }

    let angleX = 0.5;
    let angleY = 0.4;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / width - 0.5) * 0.4;
      mouseY = (e.clientY / height - 0.5) * 0.4;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.fillStyle = "#0D0D0D";
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        angleY += 0.003;
        angleX += 0.0015;
      }

      const currentAngleY = angleY + mouseX;
      const currentAngleX = angleX + mouseY;

      const cosY = Math.cos(currentAngleY);
      const sinY = Math.sin(currentAngleY);
      const cosX = Math.cos(currentAngleX);
      const sinX = Math.sin(currentAngleX);

      const fov = 450;
      const projectedNodes: Array<{ px: number; py: number; scale: number; z: number }> = [];

      // Project 3D -> 2D
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Rotate Y
        const x1 = node.ox * cosY - node.oz * sinY;
        const z1 = node.oz * cosY + node.ox * sinY;

        // Rotate X
        const y2 = node.oy * cosX - z1 * sinX;
        const z2 = z1 * cosX + node.oy * sinX + 350; // Camera distance

        const scale = fov / (fov + z2);
        const px = x1 * scale + width / 2;
        const py = y2 * scale + height / 2;

        projectedNodes.push({ px, py, scale, z: z2 });
      }

      // Draw wireframe connecting lines
      ctx.strokeStyle = "rgba(200, 255, 0, 0.08)";
      ctx.lineWidth = 1;

      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          const distSq = (p1.px - p2.px) ** 2 + (p1.py - p2.py) ** 2;

          if (distSq < 3200) {
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw tactile 3D nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        const radius = Math.max(1, 2.5 * p.scale);

        ctx.fillStyle = i % 5 === 0 ? "#C8FF00" : "rgba(255, 255, 255, 0.35)";
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-75"
      aria-hidden="true"
    />
  );
};
