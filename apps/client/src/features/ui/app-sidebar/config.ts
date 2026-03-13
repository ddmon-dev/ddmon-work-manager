import { type MenuData } from "./types";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileSpreadsheet,
  FolderKanban,
  GanttChart,
  Users,
} from "lucide-react";

interface MenuConfig {
  navMain: MenuData[];
}

export const navigationConfig: MenuConfig = {
  navMain: [
    {
      title: "프로젝트",
      items: [
        { title: "프로젝트 관리", url: "/projects", icon: FolderKanban },
        {
          title: "프로젝트 일정",
          url: "/project-schedules",
          icon: GanttChart,
        },
        { title: "캘린더", url: "/schedules", icon: CalendarDays },
      ],
    },
    {
      title: "영업",
      items: [
        { title: "클라이언트 관리", url: "/clients", icon: Briefcase },
        { title: "파트너 관리", url: "/partners", icon: Users },
        { title: "견적서 관리", url: "/estimates", icon: FileSpreadsheet },
        { title: "매출/수금 통계", url: "/revenue", icon: BarChart3 },
      ],
    },
    {
      title: "도구",
      items: [
        { title: "라이브러리", url: "/library", icon: BookOpen },
      ],
    },
  ],
};
