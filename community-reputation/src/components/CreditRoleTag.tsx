import { CREDIT_LABELS, type CreditRole } from "@/lib/credit";

interface Props {
  role: string;
  title?: boolean;
}

export function CreditRoleTag({ role, title = true }: Props) {
  const label = CREDIT_LABELS[role as CreditRole] ?? role;
  return (
    <span
      className="credit-tag"
      title={title ? label : undefined}
    >
      {label}
    </span>
  );
}
