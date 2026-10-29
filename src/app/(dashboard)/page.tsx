import { Suspense } from "react";
import type { Metadata } from "next";
import { TodayHeadline } from "@/features/analytics/components/today-headline";
import { MonthStrip } from "@/features/analytics/components/month-strip";
import { CriticalStock, RecentSales, SalesTrend, TopProducts } from "@/features/analytics/components/dashboard-sections";

export const metadata: Metadata = { title: "Resumen" };

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-6 md:py-8">
      <Suspense fallback={<Skeleton className="h-36" />}>
        <TodayHeadline />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-28" />}>
        <MonthStrip />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SalesTrend />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <CriticalStock />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <TopProducts />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RecentSales />
        </Suspense>
      </div>
    </div>
  );
}
