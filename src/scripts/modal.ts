type MetricSpec = {
  label: string;
  before: number;
  after: number;
  unit: string;
  lower?: boolean;
};

function formatNumber(v: number): string {
  if (v === 0) return '0';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function renderMetrics(container: HTMLElement): void {
  const raw = container.getAttribute('data-metrics');
  if (!raw) return;
  let metrics: MetricSpec[];
  try {
    metrics = JSON.parse(raw);
  } catch {
    return;
  }
  container.innerHTML = metrics
    .map((m, i) => {
      const delta = m.lower
        ? ((m.before - m.after) / Math.max(m.before, 0.001)) * 100
        : ((m.after - m.before) / Math.max(m.before, 0.001)) * 100;
      const dir = m.lower ? '↓' : '↑';
      return `
        <div class="mm-card" style="--i:${i}">
          <div class="mm-label">${m.label}</div>
          <div class="mm-value-row">
            <span class="mm-value" data-target="${m.after}" data-unit="${m.unit}">0${m.unit}</span>
            <span class="mm-delta">${dir} ${delta.toFixed(0)}%</span>
          </div>
          <div class="mm-bar">
            <span class="mm-bar-before" style="width: 100%"></span>
            <span class="mm-bar-after" data-target-pct="${m.lower ? (m.after / m.before) * 100 : 100}" data-before-pct="${m.lower ? 100 : (m.before / m.after) * 100}"></span>
          </div>
          <div class="mm-legend">
            <span class="mm-legend-before">Before ${formatNumber(m.before)}${m.unit}</span>
            <span class="mm-legend-after">After ${formatNumber(m.after)}${m.unit}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function animateMetrics(container: HTMLElement): void {
  const duration = 1200;
  const start = performance.now();
  const values = container.querySelectorAll<HTMLElement>('.mm-value');
  const bars = container.querySelectorAll<HTMLElement>('.mm-bar-after');
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    values.forEach((v) => {
      const target = Number(v.dataset.target ?? 0);
      const unit = v.dataset.unit ?? '';
      v.textContent = `${formatNumber(target * eased)}${unit}`;
    });
    bars.forEach((b) => {
      const beforePct = Number(b.dataset.beforePct ?? 100);
      const targetPct = Number(b.dataset.targetPct ?? 0);
      const w = beforePct + (targetPct - beforePct) * eased;
      b.style.width = `${w}%`;
    });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function initModal(): void {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalBody = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close');
  if (!modalOverlay || !modalBody || !closeBtn) return;

  function openModal(targetId: string): void {
    const src = document.getElementById(targetId);
    if (!src) return;
    modalBody!.innerHTML = src.innerHTML;
    modalOverlay!.classList.add('active');
    modalOverlay!.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // フォーカスを閉じるボタンへ移し、Esc で閉じる
    closeBtn!.focus();
    // メトリクスがあれば描画 → 次フレームでアニメ開始
    modalBody!.querySelectorAll<HTMLElement>('.modal-metrics').forEach((el) => {
      renderMetrics(el);
      requestAnimationFrame(() => animateMetrics(el));
    });
  }
  function closeModal(): void {
    modalOverlay!.classList.remove('active');
    modalOverlay!.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  // Esc キーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay!.classList.contains('active')) {
      closeModal();
    }
  });

  // Bento cards
  document.querySelectorAll<HTMLElement>('.bento-card[data-target]').forEach((card) => {
    card.addEventListener('click', () => {
      const t = card.dataset.target;
      if (t) openModal(`content-${t}`);
    });
  });
  // Case study previews
  document.querySelectorAll<HTMLElement>('.case-preview[data-target]').forEach((card) => {
    card.addEventListener('click', () => {
      const t = card.dataset.target;
      if (t) openModal(`content-${t}`);
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
