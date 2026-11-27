export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** El icono acompaña al color para que el estado no dependa solo del color. */
const ICONS: Readonly<Record<BadgeTone, string>> = {
  success: '✓',
  warning: '!',
  danger: '✕',
  info: 'i',
  neutral: '•',
};

export interface BadgeDescriptor {
  tone: BadgeTone;
  label: string;
}

interface StatusBadgeProps extends BadgeDescriptor {
  title?: string;
}

export function StatusBadge({ tone, label, title }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      <span className="badge__icon" aria-hidden="true">
        {ICONS[tone]}
      </span>
      {label}
    </span>
  );
}
