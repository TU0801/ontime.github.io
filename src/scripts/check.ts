// /check 課題診断ページ用ロジック
// 元: check.html L506-1052 を TS 化

// =====================
// DATA
// =====================

const INDUSTRIES: readonly string[] = [
  '製造業',
  '小売・流通',
  '建設・不動産',
  '医療・介護',
  '飲食・宿泊',
  '士業・コンサル',
  'IT・ソフトウェア',
  '物流・運送',
  '教育・研修',
  '美容・wellness',
  '金融・保険',
  'その他',
];

const DEPARTMENTS: readonly string[] = [
  '経営・代表',
  '営業・販売',
  '経理・財務',
  '人事・総務',
  '製造・現場',
  '物流・在庫',
  'マーケティング',
  'IT・情報システム',
];

const ISSUES: readonly string[] = [
  '手入力・手作業が多い\n（転記、Excel、PDF）',
  '情報が散在している\n（メール・LINE・フォルダ乱立）',
  '顧客への対応が遅い\n（見積・問い合わせ）',
  'スケジュール・シフト管理が大変',
  '請求・支払処理が\n月末に集中する',
  '在庫・発注管理が\n感覚頼り',
  '報告書・書類作成に\n時間がかかる',
  '属人化が進んでいる',
  'データを活かせていない',
  'テレワーク・場所を選ばない\n働き方が難しい',
];

const INDUSTRY_SCORE: readonly (readonly number[])[] = [
  [3, 2, 1, 2, 2, 3, 3, 3, 2, 1],
  [2, 2, 3, 1, 2, 3, 1, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 3, 2, 1, 2],
  [3, 2, 2, 3, 2, 2, 3, 3, 2, 2],
  [2, 2, 2, 3, 2, 3, 1, 3, 1, 2],
  [3, 2, 3, 1, 3, 1, 3, 2, 2, 2],
  [2, 2, 2, 1, 2, 1, 2, 2, 3, 3],
  [2, 2, 2, 2, 2, 3, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 1, 2, 2, 2, 3],
  [2, 2, 2, 3, 2, 2, 1, 2, 2, 2],
  [2, 2, 3, 1, 3, 1, 3, 2, 3, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

const DEPT_SCORE: readonly (readonly number[])[] = [
  [2, 2, 2, 1, 2, 2, 2, 2, 3, 2],
  [2, 2, 3, 1, 2, 2, 2, 2, 2, 2],
  [3, 2, 1, 1, 3, 1, 3, 2, 2, 1],
  [2, 2, 1, 3, 2, 1, 2, 2, 1, 2],
  [3, 1, 1, 2, 1, 3, 2, 3, 2, 1],
  [2, 2, 2, 1, 2, 3, 2, 2, 2, 1],
  [1, 2, 3, 1, 1, 1, 2, 1, 3, 2],
  [2, 2, 2, 1, 2, 2, 2, 2, 3, 3],
];

type FollowupItem = { q: string; opts: readonly string[] };
const FOLLOWUP: readonly FollowupItem[] = [
  {
    q: '最も時間を奪っている作業はどれですか？',
    opts: [
      'データの転記・コピペ',
      'PDF作成・印刷・スキャン',
      'メールの送受信・管理',
      '承認・回覧フロー',
    ],
  },
  {
    q: '情報が見つからない場面はいつですか？',
    opts: ['顧客対応・商談中', '会議・報告作業時', '担当者引継ぎ時', '定期確認・振り返り時'],
  },
  {
    q: '対応が遅れる主な原因は何ですか？',
    opts: [
      '承認者が捕まらない',
      '情報確認に時間がかかる',
      '担当者でないと分からない',
      'フロー自体が未整備',
    ],
  },
  {
    q: '管理で最も難しいと感じる点は？',
    opts: ['希望・条件の収集が手間', 'バランス調整が複雑', '急な変更への対応', '周知・共有が大変'],
  },
  {
    q: '最も負担が大きい処理はどれですか？',
    opts: ['請求書の作成', '入金確認・消込', '支払い手続き', '経費精算'],
  },
  {
    q: '在庫管理でよく起きる問題は？',
    opts: ['欠品・機会損失', '過剰在庫・廃棄ロス', '発注漏れ', '複数拠点の把握困難'],
  },
  {
    q: '書類作成で時間がかかる理由は？',
    opts: [
      '情報収集・整理が手間',
      'フォーマットへの入力',
      '確認・承認待ち',
      '整合チェック・最終調整',
    ],
  },
  {
    q: '属人化で最も困っていることは？',
    opts: [
      '不在時に業務が止まる',
      '後任への引継ぎが難しい',
      '品質・スピードにばらつき',
      'ノウハウが社内に残らない',
    ],
  },
  {
    q: 'データ活用の最大の障壁は？',
    opts: [
      'データが散在・未整備',
      '分析できる人材がいない',
      '活用方法が分からない',
      'ツールが使いにくい',
    ],
  },
  {
    q: 'テレワーク化の主な障壁は？',
    opts: [
      '紙・印鑑・FAX文化',
      '社内システムへのアクセス',
      'セキュリティへの不安',
      'コミュニケーション方法',
    ],
  },
];

type Solution = { name: string; desc: readonly string[] };
const SOLUTIONS: readonly Solution[] = [
  {
    name: 'Automated Workflow（業務自動化）',
    desc: [
      'ExcelのデータをAPI経由でシステムへ自動転記',
      'PDFをAIが読み取りデータベースへ自動登録',
      '発注メールをトリガーに在庫情報を自動更新',
    ],
  },
  {
    name: 'Cloud Native + AI Optimization',
    desc: [
      'LINE・メール・Slackの問い合わせを1画面に集約',
      'ファイル名・内容からAIが自動タグ付け・分類',
      '「あの件どこだっけ」をキーワード検索で即解決',
    ],
  },
  {
    name: 'Automated Workflow + Real-time Processing',
    desc: [
      '問い合わせ受信→担当者へ通知→テンプレ返信を全自動化',
      '在庫状況をリアルタイム参照して見積を即時発行',
      '承認ルートをシステム管理して上長不在でも稟議が止まらない',
    ],
  },
  {
    name: 'AI Optimization',
    desc: [
      'スタッフの希望をフォームで収集→AIが最適シフトを自動生成',
      '急な欠員時の代替候補を自動提案',
      '繁忙予測データをもとに人員配置を最適化',
    ],
  },
  {
    name: 'Automated Workflow',
    desc: [
      '受注データから請求書PDFを自動生成・送付',
      '入金消込を銀行明細と自動照合',
      '月次支払リストを一括処理ファイルへ自動変換',
    ],
  },
  {
    name: 'Data Analytics + Real-time Processing',
    desc: [
      '在庫残数を全拠点でリアルタイム共有',
      '過去の販売傾向から発注タイミングをAIが提案',
      '欠品・過剰の両方をダッシュボードで可視化',
    ],
  },
  {
    name: 'AI Optimization + Automated Workflow',
    desc: [
      '議事録・報告書をAIが自動ドラフト生成',
      '日報・点検シートの入力をフォームと連携し自動集計',
      '補助金・契約書類に必要な情報をAIが自動充填',
    ],
  },
  {
    name: 'Cloud Native + AI Optimization',
    desc: [
      '業務手順をナレッジベース化しAIがFAQ対応',
      '熟練者の判断ロジックをフロー図として自動可視化',
      'チェックリスト・マニュアルをクラウド管理で常に最新化',
    ],
  },
  {
    name: 'Data Analytics',
    desc: [
      '売上・原価・工数をひとつのダッシュボードで可視化',
      '過去データからキャンセル・クレームのパターンを抽出',
      '現場の作業時間を自動計測して工数分析に活用',
    ],
  },
  {
    name: 'Cloud Native + Security First',
    desc: [
      '紙書類をPDF化＋電子署名に移行してフル在宅を実現',
      'VPN不要のゼロトラスト環境で社外から社内システムへ安全アクセス',
      'クラウドストレージ＋権限管理で情報漏洩リスクを排除',
    ],
  },
];

// =====================
// STATE
// =====================

type State = {
  currentStep: number;
  industry: number | null;
  department: number | null;
  selectedIssues: number[];
  followupAnswers: Record<number, string>;
  currentFollowupIndex: number;
};

const state: State = {
  currentStep: 1,
  industry: null,
  department: null,
  selectedIssues: [],
  followupAnswers: {},
  currentFollowupIndex: 0,
};

// =====================
// HELPERS
// =====================

function getEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: #${id}`);
  return el;
}

function makeCard(label: string, onClick: () => void): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'sel-card';
  card.innerHTML = `<span>${label}</span>`;
  card.addEventListener('click', onClick);
  return card;
}

// =====================
// STEPS
// =====================

function renderIndustries(): void {
  const grid = getEl('industry-grid');
  INDUSTRIES.forEach((name, i) => {
    const card = makeCard(name, () => {
      state.industry = i;
      showStep(2);
    });
    grid.appendChild(card);
  });
}

function renderDepartments(): void {
  const grid = getEl('dept-grid');
  DEPARTMENTS.forEach((name, i) => {
    const card = makeCard(name, () => {
      state.department = i;
      renderIssues();
      showStep(3);
    });
    grid.appendChild(card);
  });
}

function renderIssues(): void {
  const grid = getEl('issue-grid');
  grid.innerHTML = '';

  const scored = ISSUES.map((txt, i) => {
    const iScore = state.industry !== null ? INDUSTRY_SCORE[state.industry]![i]! : 1;
    const dScore = state.department !== null ? DEPT_SCORE[state.department]![i]! : 1;
    return { index: i, text: txt, score: iScore + dScore };
  });
  scored.sort((a, b) => b.score - a.score);

  for (const { index, text } of scored) {
    const card = document.createElement('div');
    card.className = 'sel-card';
    card.dataset.index = String(index);
    card.innerHTML = `<span>${text.replace(/\n/g, '<br>')}</span><span class="check-mark">✓</span>`;
    if (state.selectedIssues.includes(index)) card.classList.add('selected');
    card.addEventListener('click', () => toggleIssue(index, card));
    grid.appendChild(card);
  }
  updateIssueCount();
}

function toggleIssue(index: number, card: HTMLElement): void {
  const pos = state.selectedIssues.indexOf(index);
  if (pos >= 0) {
    state.selectedIssues.splice(pos, 1);
    card.classList.remove('selected');
  } else {
    if (state.selectedIssues.length >= 3) return;
    state.selectedIssues.push(index);
    card.classList.add('selected');
  }
  updateIssueCount();
}

function updateIssueCount(): void {
  getEl('issue-count').textContent = String(state.selectedIssues.length);
  const btn = getEl('btn-issue-next') as HTMLButtonElement;
  btn.disabled = state.selectedIssues.length === 0;
}

function goToStep4(): void {
  if (state.selectedIssues.length === 0) return;
  state.currentFollowupIndex = 0;
  state.followupAnswers = {};
  showStep(4);
  renderFollowup();
}

function renderFollowup(): void {
  const idx = state.currentFollowupIndex;
  const issueIdx = state.selectedIssues[idx]!;
  const total = state.selectedIssues.length;
  const fu = FOLLOWUP[issueIdx]!;
  const issueLabel = ISSUES[issueIdx]!.replace(/\n/g, ' ');

  getEl('followup-progress-text').textContent = `課題 ${idx + 1} / ${total}`;

  const container = getEl('followup-container');
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'followup-card';
  card.innerHTML = `
    <span class="followup-issue-tag">課題 ${idx + 1}</span>
    <div class="followup-question">「${issueLabel}」<br>${fu.q}</div>
    <div class="followup-options" id="followup-opts"></div>
  `;
  container.appendChild(card);

  const optsEl = getEl('followup-opts');
  for (const opt of fu.opts) {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      state.followupAnswers[issueIdx] = opt;
      nextFollowup();
    });
    optsEl.appendChild(btn);
  }
}

function nextFollowup(): void {
  state.currentFollowupIndex++;
  if (state.currentFollowupIndex < state.selectedIssues.length) {
    renderFollowup();
  } else {
    showStep(5);
    renderResults();
  }
}

function renderResults(): void {
  const container = getEl('result-cards');
  container.innerHTML = '';

  state.selectedIssues.forEach((issueIdx, rank) => {
    const sol = SOLUTIONS[issueIdx]!;
    const issueText = ISSUES[issueIdx]!.replace(/\n/g, ' ');
    const answer = state.followupAnswers[issueIdx];

    const card = document.createElement('div');
    card.className = 'result-card';
    card.style.borderLeftColor = rank === 0 ? '#1E3A5F' : rank === 1 ? '#5A7A94' : '#A69F93';
    const descHtml = `<ul>${sol.desc.map((d) => `<li>${d}</li>`).join('')}</ul>`;
    card.innerHTML = `
      <div class="result-issue-label">課題 ${rank + 1}</div>
      <div class="result-issue-title">${issueText}</div>
      ${answer ? `<div class="result-followup-answer">▶ ${answer}</div>` : ''}
      <div class="result-solution-title">推奨ソリューション</div>
      <div class="result-solution-name gradient-text">${sol.name}</div>
      <div class="result-solution-desc">${descHtml}</div>
    `;
    container.appendChild(card);
  });

  // Share URL
  const encoded = btoa(
    JSON.stringify({
      i: state.industry,
      d: state.department,
      q: state.selectedIssues.join(','),
      f: state.followupAnswers,
    }),
  );
  const shareURL = `${location.origin}/check?r=${encoded}`;
  const displayEl = getEl('share-url-display');
  displayEl.textContent = shareURL;
  displayEl.dataset.url = shareURL;
}

function copyShareUrl(): void {
  const url = getEl('share-url-display').dataset.url ?? '';
  navigator.clipboard.writeText(url).then(() => {
    const fb = getEl('copy-feedback');
    fb.textContent = 'コピーしました！';
    setTimeout(() => {
      fb.textContent = '';
    }, 2500);
  });
}

function restart(): void {
  state.currentStep = 1;
  state.industry = null;
  state.department = null;
  state.selectedIssues = [];
  state.followupAnswers = {};
  state.currentFollowupIndex = 0;
  history.replaceState(null, '', location.pathname);
  showStep(1);
}

// =====================
// NAVIGATION
// =====================

function showStep(n: number): void {
  document.querySelectorAll('.step-panel').forEach((p) => {
    p.classList.remove('active');
  });
  getEl(`step-${n}`).classList.add('active');
  state.currentStep = n;
  updateProgress(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack(): void {
  if (state.currentStep === 3) {
    showStep(2);
    return;
  }
  if (state.currentStep === 4) {
    showStep(3);
    return;
  }
  if (state.currentStep === 2) {
    showStep(1);
    return;
  }
}

function updateProgress(step: number): void {
  const dots = document.querySelectorAll<HTMLElement>('.step-dot');
  dots.forEach((d) => {
    const s = Number.parseInt(d.dataset.step ?? '0', 10);
    d.classList.remove('active', 'done');
    if (s === step) d.classList.add('active');
    else if (s < step) d.classList.add('done');
  });
  const pct = ((step - 1) / 4) * 100;
  (getEl('progress-fill') as HTMLElement).style.width = `${pct}%`;
}

// =====================
// CANVAS (check ページ専用のシンプル Particle 描画)
// =====================

function initCanvas(): void {
  const canvasEl = document.getElementById('tech-canvas');
  if (!canvasEl) return;
  const canvas = canvasEl as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const colors = ['#1E3A5F', '#5A7A94', '#A69F93', '#2A2A2A'] as const;
  let width = 0,
    height = 0;

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    x = Math.random() * width;
    y = Math.random() * height;
    vx = (Math.random() - 0.5) * 0.8;
    vy = (Math.random() - 0.5) * 0.8;
    size = Math.random() * 2.5 + 1;
    color = colors[Math.floor(Math.random() * colors.length)]!;

    update(): void {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }
    draw(): void {
      ctx!.beginPath();
      ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx!.fillStyle = this.color;
      ctx!.globalAlpha = 0.5;
      ctx!.fill();
      ctx!.globalAlpha = 1;
    }
  }

  const count = width > 768 ? 60 : 30;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) particles.push(new Particle());

  function drawLines(): void {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pi = particles[i]!;
        const pj = particles[j]!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx!.beginPath();
          ctx!.strokeStyle = `rgba(120,120,120,${(1 - d / 120) * 0.3})`;
          ctx!.lineWidth = 0.5;
          ctx!.moveTo(pi.x, pi.y);
          ctx!.lineTo(pj.x, pj.y);
          ctx!.stroke();
        }
      }
    }
  }

  function animate(): void {
    ctx!.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.update();
      p.draw();
    }
    drawLines();
    requestAnimationFrame(animate);
  }
  animate();
}

// =====================
// INIT
// =====================

function init(): void {
  renderIndustries();
  renderDepartments();
  initCanvas();

  const params = new URLSearchParams(location.search);
  const r = params.get('r');
  if (r) {
    try {
      const data = JSON.parse(atob(r)) as {
        i?: number | null;
        d?: number | null;
        q?: string;
        f?: Record<number, string>;
      };
      state.industry = data.i ?? null;
      state.department = data.d ?? null;
      state.selectedIssues = (data.q ?? '')
        .split(',')
        .map(Number)
        .filter((n: number) => !Number.isNaN(n));
      state.followupAnswers = data.f ?? {};
      showStep(5);
      renderResults();
      return;
    } catch (e) {
      console.warn('URL復元失敗:', e);
    }
  }
  showStep(1);
}

// inline onclick ハンドラを window に expose
interface CheckWindow extends Window {
  goBack: typeof goBack;
  goToStep4: typeof goToStep4;
  restart: typeof restart;
  copyShareUrl: typeof copyShareUrl;
}
const w = window as unknown as CheckWindow;
w.goBack = goBack;
w.goToStep4 = goToStep4;
w.restart = restart;
w.copyShareUrl = copyShareUrl;

// ClientRouter 対応: astro:page-load でも再初期化（グリッドが未描画のときのみ）
function initOnce(): void {
  const grid = document.getElementById('industry-grid');
  if (grid && !grid.hasChildNodes()) init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnce);
} else {
  initOnce();
}
document.addEventListener('astro:page-load', initOnce);
