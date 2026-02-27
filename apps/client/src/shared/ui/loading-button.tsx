import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function LoadingButton({
  icon,
  children,
  isLoading,
  variant,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  const child = icon ? (
    <>
      {isLoading ? <Spinner /> : icon}
      {children}
    </>
  ) : isLoading ? (
    <Spinner />
  ) : (
    children
  );

  return (
    <Button
      {...props}
      className={cn(className, isLoading && "opacity-100!")}
      variant={variant}
      disabled={isLoading || disabled}
    >
      {child}
    </Button>
  );
}
