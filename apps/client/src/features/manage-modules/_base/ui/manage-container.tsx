import { Container } from "@/shared/ui/container";
import { ManageSheetProvider } from "./manage-sheet";
import { ManageModuleHeader } from "./manage-header";

interface ManageContainerProps {
  title?: string;
  moduleName: string;
  headerAddons?: React.ReactNode;
  headerSearchBar?: React.ReactNode;
  createButtonLabel?: string;
  hideCreateButton?: boolean;
  hideSearchBar?: boolean;
  children: React.ReactNode;
}

export function ManageContainer({
  title,
  moduleName,
  headerAddons,
  headerSearchBar,
  createButtonLabel,
  hideCreateButton,
  hideSearchBar,
  children,
}: ManageContainerProps) {
  return (
    <ManageSheetProvider>
      <div className="flex flex-col gap-4 flex-1">
        <ManageModuleHeader
          title={title}
          moduleName={moduleName}
          headerAddons={headerAddons}
          headerSearchBar={headerSearchBar}
          createButtonLabel={createButtonLabel}
          hideCreateButton={hideCreateButton}
          hideSearchBar={hideSearchBar}
        />
        <Container className="flex flex-col gap-8 md:gap-4 flex-1 mt-8 md:mt-4">
          <h1 className="text-2xl font-bold block md:hidden text-center">
            {title ? title : `${moduleName} 관리`}
          </h1>
          {children}
        </Container>
      </div>
    </ManageSheetProvider>
  );
}
