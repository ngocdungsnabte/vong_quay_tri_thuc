
import React, { useEffect, useRef } from 'react';
import { Student } from '../types';

interface WheelProps {
  students: Student[];
  onSpinEnd: (student: Student) => void;
  spinning: boolean;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

const Wheel: React.FC<WheelProps> = ({ students, onSpinEnd, spinning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0); 
  const isAnimatingRef = useRef(false);
  const requestRef = useRef<number | null>(null);
  
  const tickSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3')); 
  const spinSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2143/2143-preview.mp3')); 
  const winSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); 

  useEffect(() => {
    tickSound.current.load();
    spinSound.current.load();
    winSound.current.load();
    spinSound.current.loop = true;
  }, []);

  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 25;
    
    if (students.length === 0) return;
    const sliceAngle = (2 * Math.PI) / students.length;

    let fontSize = 18;
    if (students.length > 50) fontSize = 10;
    else if (students.length > 40) fontSize = 11;
    else if (students.length > 30) fontSize = 12;
    else if (students.length > 20) fontSize = 14;
    else if (students.length > 10) fontSize = 16;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.stroke();

    students.forEach((student, i) => {
      const startAngle = i * sliceAngle + currentRotation;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px "Times New Roman", serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      
      const displayName = student.name.length > 18 ? student.name.substring(0, 16) + '..' : student.name;
      ctx.fillText(displayName, radius - 15, fontSize / 3);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [students]);

  useEffect(() => {
    if (spinning && !isAnimatingRef.current) {
      startSpin();
    }
  }, [spinning]);

  const startSpin = () => {
    if (students.length === 0) return;
    isAnimatingRef.current = true;
    spinSound.current.currentTime = 0;
    spinSound.current.volume = 0.4;
    spinSound.current.play().catch(() => {});

    const spinDuration = 5000;
    const startRot = rotationRef.current;
    const extraRotations = 7 + Math.random() * 5;
    const targetRot = startRot + extraRotations * 2 * Math.PI;
    const sliceAngle = (2 * Math.PI) / students.length;
    let lastTickIndex = -1;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); 
      const currentRot = startRot + (targetRot - startRot) * easedProgress;
      
      rotationRef.current = currentRot;
      drawWheel(currentRot);
      spinSound.current.volume = Math.max(0, 0.4 * (1 - progress));

      const pointerAngle = (1.5 * Math.PI - currentRot) % (2 * Math.PI);
      const normalizedAngle = pointerAngle < 0 ? pointerAngle + 2 * Math.PI : pointerAngle;
      const currentSliceIndex = Math.floor(normalizedAngle / sliceAngle);

      if (currentSliceIndex !== lastTickIndex) {
        tickSound.current.currentTime = 0;
        tickSound.current.volume = Math.max(0.1, 0.4 * (1 - progress));
        tickSound.current.play().catch(() => {});
        lastTickIndex = currentSliceIndex;
      }

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        spinSound.current.pause();
        winSound.current.play().catch(() => {});
        const finalAngle = (1.5 * Math.PI - (currentRot % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
        const winningIndex = Math.floor(finalAngle / sliceAngle);
        onSpinEnd(students[winningIndex % students.length]);
      }
    };
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="relative flex justify-center items-center select-none scale-100">
      <div className={`absolute top-[-8px] left-1/2 transform -translate-x-1/2 z-30 drop-shadow-lg ${spinning ? 'animate-bounce' : ''}`}>
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[35px] border-t-red-600"></div>
      </div>
      <div className="rounded-full p-2 bg-white/10 backdrop-blur-sm border-2 border-white/20 shadow-2xl">
        <canvas ref={canvasRef} width={500} height={500} className="max-w-full h-auto rounded-full" />
      </div>
    </div>
  );
};

export default Wheel;
