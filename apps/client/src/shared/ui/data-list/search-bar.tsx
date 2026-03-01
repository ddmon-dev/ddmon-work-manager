import * as React from "react";
import { cn } from "@/shared/utils/classnames";
import { Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/ui/input-group";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDebounce } from "@/shared/hooks/use-debounce";

interface SearchBarProps {
  paramKey?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  paramKey = "search",
  placeholder = "검색어를 입력하세요.",
  className,
  autoFocus = false,
}: SearchBarProps) {
  const isMobile = useIsMobile();
  const { get, set } = useQueryParams();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isUserInput = React.useRef(false);

  const searchValue = get(paramKey) || "";
  const [value, setValue] = React.useState(searchValue);
  const debouncedValue = useDebounce(value);

  // 사용자가 타이핑 중이 아닐 때만 URL → 로컬 동기화 (타이핑 중 덮어쓰기 방지)
  React.useEffect(() => {
    if (isUserInput.current) return;
    setValue(searchValue);
  }, [searchValue]);

  // set은 매 렌더링마다 새로 생성되므로 ref로 최신값 유지
  const commitRef = React.useRef((_: string) => {});
  commitRef.current = (newValue: string) => {
    set({ [paramKey]: newValue.trim(), page: "1" });
  };

  React.useEffect(() => {
    if (!isUserInput.current) return;
    isUserInput.current = false; // 커밋 후 타이핑 상태 해제 → URL 동기화 허용
    commitRef.current(debouncedValue);
  }, [debouncedValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserInput.current = true;
    setValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      isUserInput.current = false;
      commitRef.current(value);
      if (isMobile) inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    isUserInput.current = false;
    setValue("");
    commitRef.current("");
    inputRef.current?.focus();
  };

  return (
    <InputGroup className={cn("w-auto min-w-64 rounded-full", className)}>
      <InputGroupAddon align="inline-start">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={handleClear}
            className="rounded-full"
            aria-label="검색어 지우기"
          >
            <X className="size-3" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
