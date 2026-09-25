import React, { useEffect, useRef } from 'react';
import { DriftTrajectoryStep, LagrangianParticle } from '../types/orca.js';

interface LagrangianDriftCanvasProps {
  trajectory: DriftTrajectoryStep[];
  swarm: LagrangianParticle[];
  currentHour: number;
  width?: number;
  height?: number;
}

export const LagrangianDriftCanvas: React.FC<LagrangianDriftCanvasProps> = ({
  trajectory,
  swarm,
  currentHour,
  width = 540,
  height = 320
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trajectory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Coordinate normalization bounds
    const lats = trajectory.map((t) => t.latitude);
    const lons = trajectory.map((t) => t.longitude);
    const minLat = Math.min(...lats) - 0.05;
    const maxLat = Math.max(...lats) + 0.05;
    const minLon = Math.min(...lons) - 0.05;
    const maxLon = Math.max(...lons) + 0.05;

    const latSpan = maxLat - minLat || 0.1;
    const lonSpan = maxLon - minLon || 0.1;

    const toCanvasX = (lon: number) => 40 + ((lon - minLon) / lonSpan) * (width - 80);
    const toCanvasY = (lat: number) => height - (40 + ((lat - minLat) / latSpan) * (height - 80));

    // 1. Draw Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 40; x < width - 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
    }
    for (let y = 20; y < height - 20; y += 40) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
    }

    // 2. Draw Trajectory Path Line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);

    const stepsToDraw = trajectory.filter((t) => t.hour <= currentHour);

    stepsToDraw.forEach((step, idx) => {
      const cx = toCanvasX(step.longitude);
      const cy = toCanvasY(step.latitude);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 3. Draw Dispersion Radius Circles at key waypoints
    stepsToDraw.forEach((step) => {
      const cx = toCanvasX(step.longitude);
      const cy = toCanvasY(step.latitude);
      const radiusPx = Math.max(8, (step.dispersionRadiusMeters / 1000) * 1.8);

      ctx.beginPath();
      ctx.arc(cx, cy, radiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Waypoint dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Hour label
      ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
      ctx.font = '9px monospace';
      ctx.fillText(`${step.hour}h`, cx + 6, cy - 6);
    });

    // 4. Draw Swarm Particles (Filtered by age <= currentHour)
    swarm.forEach((p) => {
      if (p.ageHours <= currentHour) {
        const px = toCanvasX(p.longitude);
        const py = toCanvasY(p.latitude);

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.shadowColor = 'rgba(244, 63, 94, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    });

    // 5. Highlight Origin Point
    const originX = toCanvasX(trajectory[0].longitude);
    const originY = toCanvasY(trajectory[0].latitude);
    ctx.beginPath();
    ctx.arc(originX, originY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('ORIGIN (0h)', originX + 8, originY + 4);

    // 6. Highlight Current Tip
    if (stepsToDraw.length > 0) {
      const tip = stepsToDraw[stepsToDraw.length - 1];
      const tipX = toCanvasX(tip.longitude);
      const tipY = toCanvasY(tip.latitude);

      ctx.beginPath();
      ctx.arc(tipX, tipY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`DATUM (${tip.hour}h)`, tipX + 8, tipY + 4);
    }
  }, [trajectory, swarm, currentHour, width, height]);

  return (
    <div className="lagrangian-canvas-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="lagrangian-canvas-element"
      />
    </div>
  );
};
