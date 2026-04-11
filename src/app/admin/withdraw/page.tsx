"use client";

import AdminLayout from "../adminLayout/page";
import PayoutCard from "@/components/admin/payout/payout";
import TaxCard from "@/components/admin/tax/tax";
import WithdrawCard from "@/components/admin/withdraw";
import { useState } from "react";

export default function WithdrawManagementPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshWithdraw = () => {
    setRefreshKey((prev) => prev + 1);
  };
  return (
    <AdminLayout>
      <div className="space-y-6">
        <WithdrawCard refreshKey={refreshKey} />
        <PayoutCard onWithdrawUpdated={refreshWithdraw} />
        <TaxCard />
      </div>
    </AdminLayout>
  );
}
