import { type LucideIcon } from "lucide-react";

export interface MenuData {
  title: string;
  items: MenuItem[];
  requireSuper?: boolean;
}

export interface MenuItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: MenuSubItem[];
  requireSuper?: boolean;
}

export interface MenuSubItem {
  title: string;
  url: string;
}
