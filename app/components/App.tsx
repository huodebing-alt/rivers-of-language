"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import RiverChart from "./RiverChart";
import ScriptTree from "./ScriptTree";
import DetailPanel from "./DetailPanel";
import Controls from "./Controls";
import { FAMILY_META, type FamilyId } from "@/lib/types";

const TOOLBAR_H = 60;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, containerHeight: 700 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"language" | "script">("language");
  const [showContacts, setShowContacts] = useState(true);
  const [enabledFamilies, setEnabledFamilies] = useState<Set<FamilyId>>(
    new Set(Object.keys(FAMILY_META) as FamilyId[])
  );
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768);
      const detailW = w >= 1024 ? 340 : 0;
      setSize({
        width: Math.max(720, w - detailW - 2),
        containerHeight: Math.max(420, h - TOOLBAR_H - 2),
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

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const resetCollapsed = useCallback(() => setCollapsedIds(new Set()), []);

  const focusId = hoveredId ?? selectedId;

  // Mobile: chart 更宽（横向滚动），桌面用 viewport 宽
  const chartWidth = isMobile ? 1700 : size.width;
  const chartContainerHeight = size.containerHeight;

  return (
    <div ref={containerRef} className="h-screen w-screen overflow-hidden flex flex-col bg-cream-50">
      <Controls
        mode={mode}
        setMode={setMode}
        showContacts={showContacts}
        setShowContacts={setShowContacts}
        enabledFamilies={enabledFamilies}
        toggleFamily={toggleFamily}
        collapsedCount={collapsedIds.size}
        resetCollapsed={resetCollapsed}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 主图区 — 横向滚动外层（mobile 用），垂直滚动在 RiverChart 内部 */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0">
          {mode === "language" ? (
            <RiverChart
              width={chartWidth}
              containerHeight={chartContainerHeight}
              isMobile={isMobile}
              hoveredId={hoveredId}
              selectedId={selectedId}
              setHoveredId={setHoveredId}
              setSelectedId={setSelectedId}
              showContacts={showContacts}
              enabledFamilies={enabledFamilies}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
            />
          ) : (
            <div className="overflow-auto" style={{ maxHeight: chartContainerHeight }}>
              <ScriptTree
                width={chartWidth}
                height={isMobile ? 1400 : chartContainerHeight}
              />
            </div>
          )}
        </div>

        {!isMobile && (
          <aside className="hidden lg:block w-[340px] border-l border-cream-200 bg-cream-50 overflow-hidden shrink-0">
            <DetailPanel id={focusId} />
          </aside>
        )}
      </div>

      {isMobile && <MobileSheet focusId={focusId} />}
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
