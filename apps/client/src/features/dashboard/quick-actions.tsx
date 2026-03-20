import { Link } from "react-router";
import {
  Briefcase,
  FileSpreadsheet,
  FolderKanban,
  CalendarDays,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  title: string;
  href: string;
  icon: LucideIcon;
}

const actions: QuickAction[] = [
  { title: "클라이언트", href: "/clients", icon: Briefcase },
  { title: "견적서", href: "/estimates", icon: FileSpreadsheet },
  { title: "프로젝트", href: "/projects", icon: FolderKanban },
  { title: "일정", href: "/schedules", icon: CalendarDays },
  { title: "재무", href: "/financial", icon: TrendingUp },
  { title: "관리자", href: "/admins", icon: Users },
];

export function QuickActions() {
  return (
    <div className="border-t border-border px-5 py-4">
      <h3 className="text-xs font-medium text-muted-foreground mb-2.5">
        빠른 접근
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <Link
            key={action.href}
            to={action.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <action.icon className="size-3" />
            {action.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
