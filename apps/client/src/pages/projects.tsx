import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";

export function ProjectsPage() {
  return (
    <>
      <AppHeader title="프로젝트 관리" />
      <Container>
        <p className="text-muted-foreground">프로젝트 목록 (구현 예정)</p>
      </Container>
    </>
  );
}
