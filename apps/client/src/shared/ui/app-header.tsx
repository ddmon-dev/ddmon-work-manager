import { cn } from "@/shared/utils/classnames";
import { Container } from "./container";
import { Separator } from "./separator";
import { SidebarTrigger } from "./sidebar";

interface AppHeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function AppHeader({ title, children, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "border-b sticky top-0 z-10 bg-background rounded-t-xl py-1.5 md:py-4 min-h-[69px] flex items-center",
        className
      )}
    >
      <Container className="px-1.5 md:px-4 flex items-center gap-2">
        <SidebarTrigger />
        {title && (
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4 mx-2 hidden md:block"
          />
        )}
        {title && (
          <h1 className="text-xl font-semibold hidden md:block">{title}</h1>
        )}
        {children && <div className="ml-auto">{children}</div>}
      </Container>
    </header>
  );
}
