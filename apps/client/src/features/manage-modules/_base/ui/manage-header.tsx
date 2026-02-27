import { useState } from "react";
import { Filter, Plus } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Container } from "@/shared/ui/container";
import { Separator } from "@/shared/ui/separator";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { SearchBar } from "@/shared/ui/data-list";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { CreateButton } from "./create-button";

interface ManageModuleHeaderProps {
  title?: string;
  moduleName: string;
  headerAddons?: React.ReactNode;
  headerSearchBar?: React.ReactNode;
  createButtonLabel?: string;
  hideCreateButton?: boolean;
  hideSearchBar?: boolean;
}

export function ManageModuleHeader({
  title,
  moduleName,
  headerAddons,
  headerSearchBar,
  createButtonLabel,
  hideCreateButton,
  hideSearchBar,
}: ManageModuleHeaderProps) {
  return (
    <header
      className={cn(
        "border-b sticky top-0 z-10 bg-background rounded-t-xl py-1.5 md:py-4"
      )}
    >
      <Container className={cn("grid gap-3 px-1.5 md:px-4")}>
        <div className="flex items-center gap-2">
          <SidebarTrigger />

          <Separator
            orientation="vertical"
            className={cn(
              "data-[orientation=vertical]:h-4 mx-2 hidden md:block"
            )}
          />

          <h1 className="text-xl font-semibold hidden md:block">
            {title ? title : `${moduleName} 관리`}
          </h1>

          <div className="flex items-center gap-2 ml-auto">
            {!hideSearchBar && (
              <FilterDialog
                headerAddons={headerAddons}
                headerSearchBar={headerSearchBar}
              />
            )}
            {!hideSearchBar && !headerAddons && !headerSearchBar && (
              <div className="hidden md:block">
                <SearchBar />
              </div>
            )}
            {!hideCreateButton && (
              <CreateButton>
                <Plus className="size-4" />
                {createButtonLabel ?? `${moduleName} 생성`}
              </CreateButton>
            )}
          </div>
        </div>

        {/* 데스크톱: 필터 및 검색 표시 */}
        {!hideSearchBar && (headerAddons || headerSearchBar) && (
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {headerAddons}
            <div className="ml-auto">{headerSearchBar ?? <SearchBar />}</div>
          </div>
        )}
      </Container>
    </header>
  );
}

function FilterDialog({
  headerAddons,
  headerSearchBar,
}: {
  headerAddons?: React.ReactNode;
  headerSearchBar?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <Filter className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>필터 및 검색</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          {headerAddons}
          {headerSearchBar ?? <SearchBar />}
        </div>
        <Button onClick={() => setOpen(false)} className="w-full mt-4">
          닫기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
