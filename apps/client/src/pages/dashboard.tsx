import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function DashboardPage() {
  return (
    <>
      <AppHeader title="대시보드" />
      <Container>
        <p className="text-muted-foreground">대시보드 (구현 예정)</p>
      </Container>
    </>
  );
}
