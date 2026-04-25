import { Classification, CATEGORY_META } from "@/lib/eco";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";

interface Props {
  result: Classification;
  imageUrl: string;
  onReset: () => void;
  totalSorted: number;
}

export const ResultCard = ({ result, imageUrl, onReset, totalSorted }: Props) => {
  const meta = CATEGORY_META[result.category];

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <div className="rounded-3xl bg-card shadow-card overflow-hidden border border-border">
        <div className={`relative aspect-[4/3] ${meta.soft}`}>
          <img src={imageUrl} alt={result.item} className="w-full h-full object-cover" />
          <div className={`absolute top-4 left-4 ${meta.bg} ${meta.fg} px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-soft`}>
            <span>{meta.emoji}</span> {meta.label}
          </div>
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {Math.round(result.confidence)}%
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Detected</p>
            <h2 className="font-display text-2xl font-bold text-foreground capitalize">{result.item}</h2>
          </div>

          <div className={`${meta.soft} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Disposal Tip</p>
            <p className="text-sm text-foreground leading-relaxed">{result.tip}</p>
          </div>

          <Button onClick={onReset} size="lg" className="w-full rounded-2xl h-14 text-base font-semibold shadow-soft">
            <RotateCcw className="w-4 h-4 mr-2" />
            Scan Another
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            🌍 You've sorted <span className="font-semibold text-primary">{totalSorted}</span> items correctly
          </p>
        </div>
      </div>
    </div>
  );
};
