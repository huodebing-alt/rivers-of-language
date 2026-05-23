"use client";
import { FAMILY_META, type FamilyId } from "@/lib/types";

interface Props {
  mode: "language" | "script";
  setMode: (m: "language" | "script") => void;
  showContacts: boolean;
  setShowContacts: (b: boolean) => void;
  enabledFamilies: Set<FamilyId>;
  toggleFamily: (f: FamilyId) => void;
  collapsedCount?: number;
  resetCollapsed?: () => void;
}

export default function Controls({
  mode,
  setMode,
  showContacts,
  setShowContacts,
  enabledFamilies,
  toggleFamily,
  collapsedCount = 0,
  resetCollapsed,
}: Props) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-cream-200 bg-cream-50/80 backdrop-blur-sm">
      <h1 className="font-serif text-xl text-carmine-500 mr-3 whitespace-nowrap">
        语言之河
        <span className="ml-2 text-sm italic text-gilt-500">Rivers of Language</span>
      </h1>

      <div className="flex items-center bg-cream-100 rounded-full p-0.5 border border-cream-200">
        <button
          onClick={() => setMode("language")}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            mode === "language"
              ? "bg-carmine-500 text-cream-50"
              : "text-ink-500 hover:bg-cream-200"
          }`}
        >
          语言演变
          <span className="ml-1 italic opacity-75 hidden md:inline">Languages</span>
        </button>
        <button
          onClick={() => setMode("script")}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            mode === "script"
              ? "bg-carmine-500 text-cream-50"
              : "text-ink-500 hover:bg-cream-200"
          }`}
        >
          文字演变
          <span className="ml-1 italic opacity-75 hidden md:inline">Scripts</span>
        </button>
      </div>

      {mode === "language" && (
        <>
          <div className="flex flex-wrap items-center gap-1 ml-2">
            {Object.entries(FAMILY_META).map(([key, meta]) => {
              const id = key as FamilyId;
              const on = enabledFamilies.has(id);
              return (
                <button
                  key={key}
                  onClick={() => toggleFamily(id)}
                  className="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: meta.color,
                    background: on ? meta.color : "transparent",
                    color: on ? "#FBF8F1" : meta.color,
                    opacity: on ? 1 : 0.4,
                  }}
                  title={meta.en}
                >
                  {meta.zh}
                </button>
              );
            })}
          </div>

          {/* 折叠状态指示 + reset */}
          {collapsedCount > 0 && resetCollapsed && (
            <button
              onClick={resetCollapsed}
              className="text-[10px] px-2 py-0.5 rounded-full border border-carmine-500 text-carmine-500 hover:bg-carmine-500 hover:text-cream-50 transition-colors"
              title="展开所有折叠的分支 / Expand all collapsed branches"
            >
              展开全部 ({collapsedCount})
            </button>
          )}

          <label className="flex items-center gap-1.5 text-xs text-ink-500 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={showContacts}
              onChange={(e) => setShowContacts(e.target.checked)}
              className="accent-carmine-500"
            />
            借用 / Contacts
          </label>
        </>
      )}
    </div>
  );
}
