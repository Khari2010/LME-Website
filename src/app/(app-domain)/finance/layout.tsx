import { ReactNode } from "react";
import { FinanceTabNav } from "./FinanceTabNav";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Finance</h1>
        <p className="text-sm text-text-muted mt-1">
          Money in, money out, paperwork.
        </p>
      </div>
      <FinanceTabNav />
      {children}
    </div>
  );
}
