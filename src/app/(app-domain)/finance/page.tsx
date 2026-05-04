import { redirect } from "next/navigation";

export const metadata = { title: "LME · Finance" };

export default function FinanceIndex() {
  redirect("/finance/cashflow");
}
