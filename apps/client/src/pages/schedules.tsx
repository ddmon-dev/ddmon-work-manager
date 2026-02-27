import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function SchedulesPage() {
  return (
    <>
      <AppHeader title="일정 관리" />
      <Container>
        <p className="text-muted-foreground">일정 목록 (구현 예정)</p>
      </Container>
    </>
  );
}
