import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";
import { AdminsModule } from "@/features/manage-modules/admins";

export function AdminsPage() {
  return (
    <>
      <AppHeader title="관리자 관리" />
      <Container>
        <AdminsModule />
      </Container>
    </>
  );
}
