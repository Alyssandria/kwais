import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-ink font-extrabold hover:bg-[#fca85a] shadow-card',
  primary: 'bg-primary text-white font-semibold hover:bg-primary-dark',
  secondary: 'bg-surface text-ink font-semibold border border-line hover:bg-canvas',
  ghost: 'bg-transparent text-primary-dark font-semibold hover:bg-primary-soft',
  danger: 'bg-bad text-white font-semibold hover:bg-[#991b1b]',
  onDark: 'bg-transparent text-white font-semibold border border-[#5fafb6] hover:bg-white/10',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-field gap-1.5',
  md: 'h-11 px-4 text-sm rounded-card gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-card gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon: ReactNode;
  variant?: 'secondary' | 'ghost' | 'onDark';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-field transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'md' ? 'size-11' : 'size-9',
        variant === 'secondary' && 'border border-line bg-surface text-[#334155] hover:bg-canvas',
        variant === 'ghost' && 'bg-transparent text-muted hover:bg-primary-soft hover:text-primary-dark',
        variant === 'onDark' && 'border border-[#2a8c96] bg-[#0a6b76] text-white hover:bg-[#0c7a86]',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});
