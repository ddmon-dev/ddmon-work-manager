export function FormRootError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-destructive p-4 bg-destructive-light rounded-md text-center">
      {children}
    </p>
  );
}
