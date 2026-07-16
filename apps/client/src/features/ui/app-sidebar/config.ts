import { type MenuData } from "./types";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileSpreadsheet,
  FolderKanban,
  GanttChart,
  HardDrive,
  ServerCog,
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
      ],
    },
    {
      title: "영업",
      items: [
        { title: "견적서 관리", url: "/estimates", icon: FileSpreadsheet },
        { title: "클라이언트 관리", url: "/clients", icon: Briefcase },
        { title: "파트너 관리", url: "/partners", icon: Users },
        { title: "고객환경정보관리", url: "/client-environments", icon: ServerCog },
        { title: "재무", url: "/financial", icon: BarChart3 },
      ],
    },
    {
      title: "도구",
      items: [
        { title: "캘린더", url: "/schedules", icon: CalendarDays },
        { title: "드라이브", url: "/drive", icon: HardDrive },
      ],
    },
  ],
};
