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
    document.body.style.overflow = 'hidden';
  }
  function closeModal(): void {
    modalOverlay!.classList.remove('active');
    document.body.style.overflow = '';
  }

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
