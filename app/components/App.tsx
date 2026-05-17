"use client";
import { useEffect, useRef, useState } from "react";
import RiverChart from "./RiverChart";
import ScriptTree from "./ScriptTree";
import DetailPanel from "./DetailPanel";
import Controls from "./Controls";
import { FAMILY_META, type FamilyId } from "@/lib/types";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, minHeight: 700 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"language" | "script">("language");
  const [showContacts, setShowContacts] = useState(true);
  const [enabledFamilies, setEnabledFamilies] = useState<Set<FamilyId>>(
    new Set(Object.keys(FAMILY_META) as FamilyId[])
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768);
      const detailW = w >= 1024 ? 340 : 0;
      setSize({
        width: Math.max(720, w - detailW - 2),
        minHeight: Math.max(500, h - 60 - 2),
      });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggleFamily(f: FamilyId) {
    setEnabledFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }

  const focusId = hoveredId ?? selectedId;

  // Mobile: 总宽度更宽（横向滚动），最小高度由 layout 算法决定
  const chartWidth = isMobile ? 1700 : size.width;
  const chartMinHeight = isMobile ? 1200 : size.minHeight;

  return (
    <div ref={containerRef} className="h-screen w-screen overflow-hidden flex flex-col bg-cream-50">
      <Controls
        mode={mode}
        setMode={setMode}
        showContacts={showContacts}
        setShowContacts={setShowContacts}
        enabledFamilies={enabledFamilies}
        toggleFamily={toggleFamily}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 主图区：双向滚动（X 时间 + Y 语系堆叠） — overflow-auto 关键 */}
        <div
          className="flex-1 overflow-auto min-h-0"
          style={{ maxHeight: "calc(100vh - 60px)" }}
        >
          {mode === "language" ? (
            <RiverChart
              width={chartWidth}
              minHeight={chartMinHeight}
              isMobile={isMobile}
              hoveredId={hoveredId}
              selectedId={selectedId}
              setHoveredId={setHoveredId}
              setSelectedId={setSelectedId}
              showContacts={showContacts}
              enabledFamilies={enabledFamilies}
            />
          ) : (
            <ScriptTree
              width={chartWidth}
              height={isMobile ? 1400 : size.minHeight}
            />
          )}
        </div>

        {/* Desktop 右侧详情 */}
        {!isMobile && (
          <aside className="hidden lg:block w-[340px] border-l border-cream-200 bg-cream-50 overflow-hidden shrink-0">
            <DetailPanel id={focusId} />
          </aside>
        )}
      </div>

      {/* Mobile 底部 sheet */}
      {isMobile && (
        <MobileSheet focusId={focusId} />
      )}
    </div>
  );
}

function MobileSheet({ focusId }: { focusId: string | null }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (focusId) setOpen(true);
  }, [focusId]);
  return (
    <div
      className={`fixed left-0 right-0 bg-cream-50 border-t border-cream-200 shadow-2xl transition-all duration-300 z-50 ${
        open ? "bottom-0 h-[60vh]" : "bottom-0 h-12"
      }`}
    >
      <button
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close detail" : "Open detail"}
      >
        <div className="sheet-handle" />
        <p className="text-[10px] uppercase tracking-wider2 text-gilt-500 pb-1">
          {focusId ? "详情 ▼" : "选择语言后弹出详情"}
        </p>
      </button>
      {open && (
        <div className="h-[calc(60vh-44px)] overflow-y-auto">
          <DetailPanel id={focusId} />
        </div>
      )}
    </div>
  );
}
