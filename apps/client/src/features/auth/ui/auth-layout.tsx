import { cn } from "@/shared/utils/classnames";
import { Container } from "@/shared/ui/container";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { ProjectSymbol } from "@/shared/ui/logo";

export function AuthContainer({ children }: { children: React.ReactNode }) {
  return (
    <Container
      className={cn("flex items-center justify-center min-h-dvh py-24")}
    >
      {children}
    </Container>
  );
}

type AuthCardProps = {
  children: React.ReactNode;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export function AuthCard({
  children,
  title,
  description,
  size = "sm",
}: AuthCardProps) {
  const cardSizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <Card
      className={cn(
        "w-full rounded-none border-none shadow-none gap-12 bg-transparent!",
        cardSizes[size]
      )}
    >
      <CardHeader
        className={cn("space-y-1 px-0 sm:px-6 text-center items-center")}
      >
        <div className={cn("flex justify-center mb-2")}>
          <ProjectSymbol linkToHome />
        </div>
        <CardTitle className={cn("text-2xl font-bold")}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("px-0 sm:px-6")}>{children}</CardContent>
    </Card>
  );
}
