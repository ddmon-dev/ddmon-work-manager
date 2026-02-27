import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function ClientsPage() {
  return (
    <>
      <AppHeader title="고객 관리" />
      <Container>
        <p className="text-muted-foreground">고객 목록 (구현 예정)</p>
      </Container>
    </>
  );
}
