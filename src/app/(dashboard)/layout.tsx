import { BottomNav, TopBar } from "@/components/app-nav";
import { getStoreSettings } from "@/features/settings/queries";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { name } = await getStoreSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar storeName={name} />
      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
