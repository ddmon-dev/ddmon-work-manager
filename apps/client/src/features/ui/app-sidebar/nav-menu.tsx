import { ChevronRight, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/shared/utils/classnames";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/shared/ui/sidebar";
import { type MenuData, type MenuItem as MenuItemType, type MenuSubItem } from "./types";

export function NavMenu({ data }: { data: MenuData[] }) {
  return (
    <nav className={cn("flex flex-col py-4 gap-4")}>
      {data.map((group) => (
        <MenuGroup key={group.title} group={group} />
      ))}
    </nav>
  );
}

function MenuGroup({ group }: { group: MenuData }) {
  const { isSuperAdmin } = useAuth();

  if (group.requireSuper && !isSuperAdmin) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => (
          <MenuItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function MenuItem({ item }: { item: MenuItemType }) {
  const { pathname } = useLocation();
  const { isSuperAdmin } = useAuth();
  const hasSubItems = item.items && item.items.length > 0;

  if (item.requireSuper && !isSuperAdmin) {
    return null;
  }

  const isActiveUrl = (url: string) => pathname.startsWith(url);
  const hasActiveChild = (items?: MenuSubItem[]) =>
    items?.some((subItem) => isActiveUrl(subItem.url)) ?? false;

  if (hasSubItems) {
    return (
      <Collapsible
        asChild
        defaultOpen={hasActiveChild(item.items)}
        className="group/collapsible"
      >
        <SidebarMenuItem className="rounded-md data-[state=closed]:hover:bg-sidebar-accent data-[state=closed]:hover:shadow-sm/5 data-[state=open]:bg-sidebar-accent data-[state=open]:shadow-sm data-[state=open]:pt-1 data-[state=open]:pb-2">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              className="hover:bg-transparent hover:shadow-none"
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild isActive={isActiveUrl(subItem.url)}>
                    <Link to={subItem.url}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActiveUrl(item.url)}>
        <Link to={item.url}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          <ArrowRight className="ml-auto" />
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
