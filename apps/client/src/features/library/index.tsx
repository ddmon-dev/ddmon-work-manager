import { useState } from "react";
import { useSearchParams } from "react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { BoardList } from "./board-list";
import { DocumentList } from "./document-list";
import { DocumentPanel } from "./document-panel";
import { Drive } from "./drive";

export function LibraryModule() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") ?? "documents";
  const boardId = searchParams.get("board");

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      prev.set("tab", value);
      return prev;
    });
  };

  const handleSelectBoard = (id: string) => {
    setSearchParams((prev) => {
      prev.set("board", id);
      return prev;
    });
  };

  return (
    <div className="flex h-svh flex-col">
      <Tabs value={tab} onValueChange={handleTabChange} className="flex h-full flex-col gap-0">
        <div className="border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="documents">문서</TabsTrigger>
            <TabsTrigger value="drive">드라이브</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* 좌측: 게시판 목록 */}
            <div className="w-52 shrink-0 border-r">
              <BoardList
                selectedBoardId={boardId}
                onSelectBoard={handleSelectBoard}
              />
            </div>

            {/* 우측: 문서 목록 */}
            <div className="flex-1">
              <DocumentList
                boardId={boardId}
                selectedDocId={selectedDocId}
                onSelectDoc={setSelectedDocId}
              />
            </div>
          </div>

          {/* 문서 편집 패널 */}
          <DocumentPanel
            docId={selectedDocId}
            onClose={() => setSelectedDocId(null)}
          />
        </TabsContent>

        <TabsContent value="drive" className="mt-0 flex-1 overflow-hidden">
          <Drive />
        </TabsContent>
      </Tabs>
    </div>
  );
}
