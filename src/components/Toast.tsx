interface Props {
  message: string;
  tone: 'success' | 'warning' | 'error';
}

/** Result of the latest scan attempt, shown in the strip under the viewfinder. */
export default function Toast({ message, tone }: Props) {
  return <p className={`toast toast-${tone}`}>{message}</p>;
}
