import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function RevenuePage() {
  return (
    <>
      <AppHeader title="매출 관리" />
      <Container>
        <p className="text-muted-foreground">매출 현황 (구현 예정)</p>
      </Container>
    </>
  );
}
