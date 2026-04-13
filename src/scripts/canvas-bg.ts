// Hero 背景 6層 Canvas アニメーション
// 元: index.html L1147-1587

import { Simplex2D } from './simplex';

type RGB = { r: number; g: number; b: number };
type Shape = 'circle' | 'triangle' | 'hexagon' | 'diamond' | 'ring' | 'cross';
type Ripple = { x: number; y: number; radius: number; alpha: number; speed: number };
type CircuitNode = { x: number; y: number; vx: number; vy: number; branches: number };

export function initCanvasBackground(): void {
  const canvasEl = document.getElementById('tech-canvas');
  if (!canvasEl) return;
  const canvas = canvasEl as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // トレイル用オフスクリーンCanvas
  const trailCanvas = document.createElement('canvas');
  const tCtx = trailCanvas.getContext('2d');
  if (!tCtx) return;

  let width = 0,
    height = 0,
    time = 0;
  const isMobile = window.innerWidth <= 768;
  let mouseX = -9999,
    mouseY = -9999,
    mouseActive = false;
  let isDarkMode = false;

  const darkObs = new MutationObserver(() => {
    isDarkMode = document.body.classList.contains('theme-dark');
  });
  darkObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  canvas.style.pointerEvents = 'none';
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
  });
  window.addEventListener('mouseleave', () => {
    mouseActive = false;
  });
  if (!isMobile) {
    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        const t = e.touches[0];
        if (t) {
          mouseX = t.clientX;
          mouseY = t.clientY;
          mouseActive = true;
        }
      },
      { passive: true },
    );
    window.addEventListener('touchend', () => {
      mouseActive = false;
    });
  }

  const simplex = new Simplex2D();
  const noise = (x: number, y: number): number => simplex.noise(x, y);

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    trailCanvas.width = width;
    trailCanvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  // ===== カラーパレット =====
  const palette: readonly RGB[] = [
    { r: 0, g: 198, b: 255 },
    { r: 157, g: 80, b: 187 },
    { r: 255, g: 75, b: 31 },
    { r: 50, g: 50, b: 50 },
  ];
  function lerpColor(a: RGB, b: RGB, t: number): RGB {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    };
  }
  function getFlowColor(x: number, y: number, t: number): RGB {
    const n = (noise(x * 0.001 + t * 0.0002, y * 0.001) + 1) * 0.5;
    const idx = n * (palette.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    return lerpColor(
      palette[Math.min(i, palette.length - 1)]!,
      palette[Math.min(i + 1, palette.length - 1)]!,
      f,
    );
  }

  const shapes: readonly Shape[] = ['circle', 'triangle', 'hexagon', 'diamond', 'ring', 'cross'];
  function drawShape(x: number, y: number, size: number, shape: Shape, rotation: number): void {
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.rotate(rotation);
    ctx!.beginPath();
    switch (shape) {
      case 'circle':
        ctx!.arc(0, 0, size, 0, Math.PI * 2);
        break;
      case 'triangle':
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) ctx!.moveTo(Math.cos(a) * size, Math.sin(a) * size);
          else ctx!.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        }
        ctx!.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          if (i === 0) ctx!.moveTo(Math.cos(a) * size, Math.sin(a) * size);
          else ctx!.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        }
        ctx!.closePath();
        break;
      case 'diamond':
        ctx!.moveTo(0, -size);
        ctx!.lineTo(size * 0.6, 0);
        ctx!.lineTo(0, size);
        ctx!.lineTo(-size * 0.6, 0);
        ctx!.closePath();
        break;
      case 'ring':
        ctx!.arc(0, 0, size, 0, Math.PI * 2);
        ctx!.moveTo(size * 0.5, 0);
        ctx!.arc(0, 0, size * 0.5, 0, Math.PI * 2, true);
        break;
      case 'cross': {
        const w = size * 0.25;
        ctx!.moveTo(-w, -size);
        ctx!.lineTo(w, -size);
        ctx!.lineTo(w, -w);
        ctx!.lineTo(size, -w);
        ctx!.lineTo(size, w);
        ctx!.lineTo(w, w);
        ctx!.lineTo(w, size);
        ctx!.lineTo(-w, size);
        ctx!.lineTo(-w, w);
        ctx!.lineTo(-size, w);
        ctx!.lineTo(-size, -w);
        ctx!.lineTo(-w, -w);
        ctx!.closePath();
        break;
      }
    }
    ctx!.restore();
  }

  // ===== LAYER 0: ノイズ歪みグリッド =====
  function drawGrid(t: number): void {
    const step = isMobile ? 60 : 40;
    const noiseScale = 0.003;
    const distort = 15;
    const darkMul = isDarkMode ? 2.5 : 1;
    ctx!.lineWidth = 0.5;
    // 横線
    for (let y = 0; y < height + step; y += step) {
      ctx!.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const n = noise(x * noiseScale + t * 0.0003, y * noiseScale + t * 0.0002);
        const dy = n * distort;
        const dx = noise(x * noiseScale + 100, y * noiseScale + t * 0.0003) * distort * 0.5;
        let alpha = 0.07 * darkMul;
        if (mouseActive) {
          const mdx = x - mouseX,
            mdy = y + dy - mouseY;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < 250) alpha += (1 - md / 250) * 0.15;
        }
        ctx!.strokeStyle = `rgba(157,80,187,${alpha})`;
        if (x === 0) ctx!.moveTo(x + dx, y + dy);
        else ctx!.lineTo(x + dx, y + dy);
      }
      ctx!.stroke();
    }
    // 縦線
    for (let x = 0; x < width + step; x += step) {
      ctx!.beginPath();
      for (let y = 0; y <= height; y += 8) {
        const n = noise(x * noiseScale + t * 0.0002, y * noiseScale + t * 0.0003 + 50);
        const dx = n * distort;
        const dy = noise(x * noiseScale + t * 0.0003 + 50, y * noiseScale + 100) * distort * 0.5;
        let alpha = 0.07 * darkMul;
        if (mouseActive) {
          const mdx = x + dx - mouseX,
            mdy = y - mouseY;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < 250) alpha += (1 - md / 250) * 0.15;
        }
        ctx!.strokeStyle = `rgba(0,198,255,${alpha})`;
        if (y === 0) ctx!.moveTo(x + dx, y + dy);
        else ctx!.lineTo(x + dx, y + dy);
      }
      ctx!.stroke();
    }
  }

  // ===== LAYER 1: オーロラリボン =====
  const ribbonCount = isMobile ? 3 : 5;
  function drawAurora(t: number): void {
    for (let r = 0; r < ribbonCount; r++) {
      const baseY = height * (0.2 + r * 0.15);
      const ribbonWidth = 60 + r * 20;
      ctx!.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const n1 = noise(x * 0.002 + t * 0.0004 + r * 10, r * 5 + t * 0.0001);
        const n2 = noise(x * 0.005 + t * 0.0006, r * 8 + 50);
        const y = baseY + n1 * 80 + n2 * 25;
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      for (let x = width; x >= 0; x -= 3) {
        const n1 = noise(x * 0.002 + t * 0.0004 + r * 10, r * 5 + t * 0.0001 + 0.5);
        const n2 = noise(x * 0.005 + t * 0.0006, r * 8 + 50 + 0.5);
        const y = baseY + n1 * 80 + n2 * 25 + ribbonWidth;
        ctx!.lineTo(x, y);
      }
      ctx!.closePath();
      const c = getFlowColor(r * 200, baseY, t);
      const grad = ctx!.createLinearGradient(0, baseY - 80, 0, baseY + ribbonWidth + 80);
      grad.addColorStop(0, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0)`);
      grad.addColorStop(0.3, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0.045)`);
      grad.addColorStop(0.5, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0.07)`);
      grad.addColorStop(0.7, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0.045)`);
      grad.addColorStop(1, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0)`);
      ctx!.fillStyle = grad;
      ctx!.fill();
    }
  }

  // ===== LAYER 2: フローフィールドパーティクル（トレイル付き） =====
  const flowParticleCount = isMobile ? 150 : 400;

  class FlowParticle {
    x = 0;
    y = 0;
    prevX = 0;
    prevY = 0;
    speed = 0;
    life = 0;
    maxLife = 0;
    decay = 0;
    size = 0;
    depth = 0;

    constructor() {
      this.reset(true);
    }

    reset(initial: boolean): void {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.prevX = this.x;
      this.prevY = this.y;
      this.speed = 0.8 + Math.random() * 1.5;
      this.life = initial ? Math.random() : 0;
      this.maxLife = 0.6 + Math.random() * 0.4;
      this.decay = 0.001 + Math.random() * 0.002;
      this.size = 0.5 + Math.random() * 1.5;
      this.depth = Math.random(); // 0=far, 1=near
    }

    update(t: number): void {
      this.prevX = this.x;
      this.prevY = this.y;
      const angle = noise(this.x * 0.003, this.y * 0.003 + t * 0.0003) * Math.PI * 2;
      const depthSpeed = (0.3 + this.depth * 0.7) * this.speed;
      this.x += Math.cos(angle) * depthSpeed;
      this.y += Math.sin(angle) * depthSpeed;
      // マウス引力
      if (mouseActive) {
        const dx = mouseX - this.x,
          dy = mouseY - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 250 && d > 1) {
          const force = (1 - d / 250) * 2;
          this.x += (dx / d) * force;
          this.y += (dy / d) * force;
        }
      }
      this.life += this.decay;
      if (
        this.x < -10 ||
        this.x > width + 10 ||
        this.y < -10 ||
        this.y > height + 10 ||
        this.life > this.maxLife
      )
        this.reset(false);
    }
  }

  const flowParticles: FlowParticle[] = [];
  for (let i = 0; i < flowParticleCount; i++) flowParticles.push(new FlowParticle());

  function drawFlowTrails(t: number): void {
    // トレイルCanvasをフェード
    tCtx!.fillStyle = isDarkMode ? 'rgba(10,10,10,0.03)' : 'rgba(255,255,255,0.03)';
    tCtx!.fillRect(0, 0, width, height);
    for (const p of flowParticles) {
      p.update(t);
      const lifeRatio = 1 - p.life / p.maxLife;
      const alpha = lifeRatio * (0.25 + p.depth * 0.5);
      const c = getFlowColor(p.x, p.y, t);
      tCtx!.strokeStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${alpha})`;
      tCtx!.lineWidth = p.size * (0.3 + p.depth * 0.7);
      tCtx!.beginPath();
      tCtx!.moveTo(p.prevX, p.prevY);
      tCtx!.lineTo(p.x, p.y);
      tCtx!.stroke();
    }
    ctx!.drawImage(trailCanvas, 0, 0);
  }

  // ===== LAYER 3: 浮遊する回路パターン =====
  const circuitCount = isMobile ? 8 : 18;
  const circuitNodes: CircuitNode[] = [];
  for (let i = 0; i < circuitCount; i++) {
    circuitNodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      branches: 2 + Math.floor(Math.random() * 3),
    });
  }
  function drawCircuits(t: number): void {
    ctx!.lineWidth = 0.4;
    for (const node of circuitNodes) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -100) node.x = width + 100;
      if (node.x > width + 100) node.x = -100;
      if (node.y < -100) node.y = height + 100;
      if (node.y > height + 100) node.y = -100;
      for (let b = 0; b < node.branches; b++) {
        let cx = node.x,
          cy = node.y;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        const segments = 3 + Math.floor(Math.random() * 2);
        for (let s = 0; s < segments; s++) {
          const dir = Math.round(noise(cx * 0.01 + t * 0.0002 + b * 5, cy * 0.01) * 2);
          const len = 20 + noise(cx * 0.01 + s, cy * 0.01 + b) * 15;
          if (dir <= 0) cx += len;
          else cy += dir === 1 ? len : -len;
          ctx!.lineTo(cx, cy);
        }
        const alpha = 0.1 + noise(node.x * 0.005 + t * 0.0005, node.y * 0.005) * 0.06;
        ctx!.strokeStyle = `rgba(0,198,255,${Math.max(0, alpha)})`;
        ctx!.stroke();
        // 端点に小さな丸
        ctx!.fillStyle = `rgba(0,198,255,${Math.max(0, alpha * 2.5)})`;
        ctx!.beginPath();
        ctx!.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }
      // 中心ノード
      ctx!.fillStyle = 'rgba(157,80,187,0.1)';
      ctx!.beginPath();
      ctx!.arc(node.x, node.y, 2, 0, Math.PI * 2);
      ctx!.fill();
    }
  }

  // ===== LAYER 4: ジオメトリックノード =====
  const nodeCount = isMobile ? 15 : 35;

  class GeoNode {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    size = 0;
    shape: Shape = 'circle';
    color: RGB = { r: 0, g: 0, b: 0 };
    rotation = 0;
    rotSpeed = 0;
    pulsePhase = 0;
    life = 0;
    fading = false;
    age = 0;
    lifespan = 0;
    depth = 0;

    constructor() {
      this.reset(true);
    }

    reset(initial: boolean): void {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.size = 3 + Math.random() * 5;
      this.shape = shapes[Math.floor(Math.random() * shapes.length)]!;
      this.color = palette[Math.floor(Math.random() * palette.length)]!;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.life = initial ? 0.5 + Math.random() * 0.5 : 0;
      this.fading = false;
      this.age = initial ? Math.random() * 800 : 0;
      this.lifespan = 500 + Math.random() * 1000;
      this.depth = 0.3 + Math.random() * 0.7;
    }

    update(t: number): void {
      const angle = noise(this.x * 0.001 + t * 0.0001, this.y * 0.001) * Math.PI;
      this.x += this.vx + Math.cos(angle) * 0.3;
      this.y += this.vy + Math.sin(angle) * 0.3;
      this.rotation += this.rotSpeed;
      // マウス反発
      if (mouseActive) {
        const dx = this.x - mouseX,
          dy = this.y - mouseY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180 && d > 1) {
          const force = (1 - d / 180) * 3;
          this.x += (dx / d) * force;
          this.y += (dy / d) * force;
        }
      }
      if (this.x < -80) this.x = width + 80;
      if (this.x > width + 80) this.x = -80;
      if (this.y < -80) this.y = height + 80;
      if (this.y > height + 80) this.y = -80;
      this.age++;
      if (!this.fading && this.life < 1) this.life = Math.min(1, this.life + 0.005);
      if (this.age > this.lifespan && !this.fading) this.fading = true;
      if (this.fading) {
        this.life -= 0.005;
        if (this.life <= 0) this.reset(false);
      }
    }

    draw(t: number): void {
      if (this.life <= 0) return;
      const pulse = 1 + Math.sin(t * 0.03 + this.pulsePhase) * 0.15;
      const sz = this.size * pulse;
      const alpha = this.life * 0.7;
      const { r, g, b } = this.color;
      // グロー
      const glowR = sz * 3;
      const grad = ctx!.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.2})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.05})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx!.fill();
      // 本体
      ctx!.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      drawShape(this.x, this.y, sz, this.shape, this.rotation);
      ctx!.fill();
      // ストローク
      ctx!.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
      ctx!.lineWidth = 0.5;
      drawShape(this.x, this.y, sz * 1.5, this.shape, -this.rotation * 0.5);
      ctx!.stroke();
    }
  }

  const nodes: GeoNode[] = [];
  for (let i = 0; i < nodeCount; i++) nodes.push(new GeoNode());

  function drawNodeConnections(t: number): void {
    for (let i = 0; i < nodes.length; i++) {
      const ni = nodes[i]!;
      if (ni.life <= 0) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const nj = nodes[j]!;
        if (nj.life <= 0) continue;
        const dx = ni.x - nj.x,
          dy = ni.y - nj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const alpha = (1 - dist / 200) * 0.2 * Math.min(ni.life, nj.life);
          const ci = ni.color,
            cj = nj.color;
          const grad = ctx!.createLinearGradient(ni.x, ni.y, nj.x, nj.y);
          grad.addColorStop(0, `rgba(${ci.r},${ci.g},${ci.b},${alpha})`);
          grad.addColorStop(1, `rgba(${cj.r},${cj.g},${cj.b},${alpha})`);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 0.6;
          ctx!.beginPath();
          // ベジェカーブの接続線
          const mx = (ni.x + nj.x) / 2;
          const my = (ni.y + nj.y) / 2;
          const offset = noise(mx * 0.005 + t * 0.0003, my * 0.005) * 30;
          ctx!.moveTo(ni.x, ni.y);
          ctx!.quadraticCurveTo(mx + offset, my + offset, nj.x, nj.y);
          ctx!.stroke();
        }
      }
      // マウスへの接続線
      if (mouseActive) {
        const dx = ni.x - mouseX,
          dy = ni.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          const alpha = (1 - dist / 250) * 0.3 * ni.life;
          const c = ni.color;
          ctx!.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
          ctx!.lineWidth = 1;
          ctx!.setLineDash([4, 4]);
          ctx!.beginPath();
          ctx!.moveTo(ni.x, ni.y);
          ctx!.lineTo(mouseX, mouseY);
          ctx!.stroke();
          ctx!.setLineDash([]);
        }
      }
    }
  }

  // ===== LAYER 5: マウスリップル =====
  const ripples: Ripple[] = [];
  let rippleTimer = 0;
  function updateRipples(t: number): void {
    if (mouseActive && t - rippleTimer > 8) {
      ripples.push({ x: mouseX, y: mouseY, radius: 0, alpha: 0.3, speed: 1.5 + Math.random() });
      rippleTimer = t;
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i]!;
      rp.radius += rp.speed;
      rp.alpha -= 0.003;
      if (rp.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      const c = getFlowColor(rp.x, rp.y, t);
      ctx!.strokeStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${rp.alpha})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx!.stroke();
    }
  }

  // ===== メインループ =====
  function animate(): void {
    time++;
    ctx!.clearRect(0, 0, width, height);

    drawGrid(time); // Layer 0: ノイズ歪みグリッド (最奥)
    drawAurora(time); // Layer 1: オーロラリボン
    drawFlowTrails(time); // Layer 2: フローフィールドトレイル
    drawCircuits(time); // Layer 3: 回路パターン
    // Layer 4: ジオメトリックノード＋接続
    for (const n of nodes) n.update(time);
    drawNodeConnections(time);
    for (const n of nodes) n.draw(time);
    updateRipples(time); // Layer 5: マウスリップル (最前面)

    requestAnimationFrame(animate);
  }

  canvas.classList.add('visible');
  animate();
}
