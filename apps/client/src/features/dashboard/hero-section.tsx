import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "오늘도 좋은 아침입니다.";
  if (hour >= 12 && hour < 18) return "오늘 오후도 화이팅입니다.";
  return "오늘도 고생하셨습니다.";
}

export function HeroSection() {
  const { user } = useAuth();
  const userName = user?.name || "관리자";
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getTimeGreeting());
  }, []);

  return (
    <section className="pt-4 px-4 md:px-0 mb-8 md:pt-6 md:mb-0 text-center md:text-left font-secondary">
      <h1 className="text-[28px] md:text-[42px] font-thin tracking-tighter leading-[1.2] text-secondary-foreground/70">
        안녕하세요{" "}
        <span className="bg-linear-to-r from-primary via-primary/60 to-primary bg-clip-text text-transparent font-normal animate-shimmer animation-duration-5000!">
          {userName}
        </span>
        님
      </h1>
      <p className="min-h-[34px] md:min-h-[48px] text-[28px] md:text-[40px] font-thin text-secondary-foreground/70 tracking-tighter leading-[1.2]">
        {greeting}
      </p>
    </section>
  );
}
