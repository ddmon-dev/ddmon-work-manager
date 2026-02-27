import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function AdminsPage() {
  return (
    <>
      <AppHeader title="관리자 관리" />
      <Container>
        <p className="text-muted-foreground">관리자 목록 (구현 예정)</p>
      </Container>
    </>
  );
}
