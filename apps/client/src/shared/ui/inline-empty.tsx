interface InlineEmptyProps {
  message: string;
}

export function InlineEmpty({ message }: InlineEmptyProps) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg">
      {message}
    </div>
  );
}
