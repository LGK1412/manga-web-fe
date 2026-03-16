"use client";

import AdminLayout from "../adminLayout/page";
import PayoutCard from "@/components/admin/payout/payout";
import TaxCard from "@/components/admin/tax/tax";
import WithdrawCard from "@/components/admin/withdraw";

export default function WithdrawManagementPage() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Withdraw Management</h1>
          <p className="text-gray-600">
            Author&apos;s Withdraw & Tax Mangagement
          </p>
        </div>
        <WithdrawCard />
        <PayoutCard />
        <TaxCard />
      </div>
    </AdminLayout>
  );
}
