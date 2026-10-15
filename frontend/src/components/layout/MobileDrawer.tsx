import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SideNav } from './SideNav';
import type { NavItem } from './nav';

/**
 * Slide-in navigation for screens narrower than 1024 px.
 * Native <dialog>: focus is trapped while open, Esc closes it, focus returns to the menu button.
 */
export function MobileDrawer({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-[280px] max-w-[85vw] bg-transparent p-0 backdrop:bg-[#0b3b40]/50"
    >
      {open && (
        <div className="relative h-full">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-5 right-3 z-10 flex size-10 cursor-pointer items-center justify-center rounded-field text-[#cfe7e4] hover:bg-white/10"
          >
            <X className="size-5" aria-hidden />
          </button>
          <SideNav items={items} onNavigate={onClose} />
        </div>
      )}
    </dialog>
  );
}
