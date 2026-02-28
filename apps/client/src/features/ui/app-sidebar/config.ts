import { type MenuData } from "./types";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileSpreadsheet,
  FolderKanban,
  Users,
} from "lucide-react";
import { APP_CONFIG } from "@/app.config";

interface MenuConfig {
  navMain: MenuData[];
}

export const navigationConfig: MenuConfig = {
  navMain: [
    {
      title: APP_CONFIG.META.TITLE,
      items: [
        { title: "클라이언트 관리", url: "/clients", icon: Briefcase },
        { title: "견적서 관리", url: "/estimates", icon: FileSpreadsheet },
        { title: "프로젝트 관리", url: "/projects", icon: FolderKanban },
        { title: "일정 관리", url: "/schedules", icon: CalendarDays },
        { title: "매출/수금 통계", url: "/revenue", icon: BarChart3 },
      ],
    },
    {
      title: "관리자",
      requireSuper: true,
      items: [
        { title: "관리자 계정 관리", url: "/admins", icon: Users },
      ],
    },
  ],
};
