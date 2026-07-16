import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

interface GifResult {
  id: string;
  preview: string;
  full: string;
  title: string;
}

export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("giphy-search", { body: { q } });
      if (!error && data?.results) setResults(data.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void search(""); // Hiện GIF thịnh hành ngay khi mở
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(v), 400);
  };

  return (
    <div className="border-t bg-card">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("gif.searchPlaceholder")}
            className="w-full pl-8 pr-3 py-1.5 rounded-full border bg-background text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2 max-h-48 overflow-y-auto">
        {loading ? (
          <p className="col-span-3 text-center text-xs text-muted-foreground py-4">{t("common.loading")}</p>
        ) : results.length === 0 ? (
          <p className="col-span-3 text-center text-xs text-muted-foreground py-4">{t("gif.noResults")}</p>
        ) : (
          results.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelect(g.full)}
              className="rounded-lg overflow-hidden aspect-square bg-muted"
            >
              <img src={g.preview} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))
        )}
      </div>
      {/* Bắt buộc theo điều khoản Giphy — luôn hiện ghi công khi dùng API của họ */}
      <div className="px-2 pb-1.5 text-right">
        <span className="text-[10px] text-muted-foreground">{t("gif.poweredBy")}</span>
      </div>
    </div>
  );
}
