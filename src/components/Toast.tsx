interface Props {
  message: string;
  tone: 'success' | 'warning' | 'error';
}

const COLOR: Record<Props['tone'], string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
};

/** Transient status banner shown above the scanner after each scan attempt. */
export default function Toast({ message, tone }: Props) {
  return (
    <div className="card toast" role="status" aria-live="polite" style={{ borderColor: COLOR[tone] }}>
      <span style={{ color: COLOR[tone] }}>{message}</span>
    </div>
  );
}
