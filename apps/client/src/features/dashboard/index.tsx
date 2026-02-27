import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";
import { HeroSection } from "./hero-section";
import { StatsCards } from "./stats-cards";
import { UpcomingSchedules } from "./upcoming-schedules";
import { RevenueSummary } from "./revenue-summary";
import { QuickActions } from "./quick-actions";

export function DashboardModule() {
  return (
    <>
      <AppHeader />
      <Container className="flex flex-col gap-6 md:gap-8 pb-8 xl:pb-14 md:px-8 lg:px-14 xl:px-20 mt-4 xl:mt-8">
        <HeroSection />
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4 md:gap-6">
          <UpcomingSchedules />
          <div className="rounded-lg border border-border bg-card">
            <RevenueSummary />
            <QuickActions />
          </div>
        </div>
      </Container>
    </>
  );
}
