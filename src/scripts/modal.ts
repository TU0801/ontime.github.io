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
