"use client";

import { useId, useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Wand2 } from "lucide-react";
import { estimatePassword } from "@/lib/tools/password";
import { Meter } from "@/components/ui/Meter";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { inputCls } from "./fields";

/* Substantive românești fără diacritice: ușor de tastat pe orice tastatură. */
const words = [
  "lanterna", "tractor", "ghiveci", "munte", "fereastra", "cafea", "pisica", "castel", "brad", "chitara",
  "vapor", "pahar", "oglinda", "furnica", "balena", "tren", "cheie", "lampa", "morcov", "umbrela",
  "castan", "piatra", "fluture", "scaun", "cetate", "harta", "ceas", "nor", "vulcan", "izvor",
  "rachita", "cerneala", "bufnita", "tobogan", "clopot", "busola", "sirena", "cizma", "sticla", "pod",
  "felinar", "cartof", "corabie", "vioara", "cascada", "ciocan", "capra", "zmeu", "cufar", "tunel",
  "lebada", "stejar", "fusta", "cocos", "ancora", "banca", "veverita", "girafa", "creion", "cortina",
];
const dictionary = [...new Set(words)];

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function generatePassphrase(): string {
  const picked: string[] = [];
  while (picked.length < 5) {
    const w = dictionary[randomInt(dictionary.length)];
    if (!picked.includes(w)) picked.push(w[0].toUpperCase() + w.slice(1));
  }
  const num = String(10 + randomInt(90));
  return `${picked.join("-")}-${num}`;
}

const scoreTone: Record<0 | 1 | 2 | 3 | 4, "bad" | "warn" | "good"> = { 0: "bad", 1: "bad", 2: "warn", 3: "good", 4: "good" };
const badgeTone: Record<"bad" | "warn" | "good", Tone> = { bad: "bad", warn: "warn", good: "good" };

export function PasswordChecker() {
  const id = useId();
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const est = useMemo(() => estimatePassword(value), [value]);
  const tone = scoreTone[est.score];
  const hasValue = value.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-good/40 bg-good-soft px-4 py-3 text-sm text-ink">
        <Lock className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
        <div>
          <span className="font-medium">Nimic nu părăsește browserul: verificarea rulează local.</span> Poți deconecta internetul și funcționează. Nu trimitem, nu salvăm și nu vedem ce tastezi.
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          Parola de verificat
        </label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative flex-1">
            <input
              id={id}
              type={visible ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="tastează sau lipește o parolă"
              className={cn(inputCls, "pr-11")}
              aria-describedby={`${id}-hint`}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-3 hover:text-ink"
              aria-label={visible ? "Ascunde parola" : "Arată parola"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setValue(generatePassphrase());
              setVisible(true);
            }}
            className="shrink-0"
          >
            <Wand2 className="size-4" aria-hidden /> <span className="hidden sm:inline">Generează o frază</span><span className="sm:hidden">Frază</span>
          </Button>
        </div>
        <p id={`${id}-hint`} className="mt-2 text-xs text-ink-3">
          Nu folosi aici o parolă reală pe un calculator străin. Generatorul alege 5 cuvinte din 60 și un număr, cu generatorul criptografic al browserului.
        </p>

        <div className="mt-6">
          <Meter value={hasValue ? (est.score + 1) * 20 : 0} tone={hasValue ? tone : "accent"} label={hasValue ? `Rezistență: ${est.label}` : "Rezistență"} showValue={false} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-ink-3">Verdict</div>
            <div className="mt-1">
              <Badge tone={hasValue ? badgeTone[tone] : "neutral"}>{hasValue ? est.label : "—"}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-3">Entropie</div>
            <div className="num mt-0.5 text-lg font-semibold text-ink">
              {est.entropyBits} <span className="text-xs font-normal text-ink-3">biți</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-3">Lungime · clase</div>
            <div className="num mt-0.5 text-lg font-semibold text-ink">
              {est.length} <span className="text-xs font-normal text-ink-3">car.</span> · {est.classes}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-3">Timp de spargere</div>
            <div className="mt-0.5 text-lg font-semibold leading-tight text-ink">{hasValue ? est.crackLabel : "—"}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Timpul presupune un atac offline la {formatNumber(1e10)} încercări pe secundă (un rig obișnuit cu plăci video), în medie la jumătatea spațiului de căutare.
        </p>

        {hasValue && (est.warnings.length > 0 || est.suggestions.length > 0) && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Avertismente</div>
              {est.warnings.length === 0 ? (
                <p className="mt-2 text-sm text-good">Niciun tipar comun detectat.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {est.warnings.map((w) => (
                    <li key={w} className="flex gap-2 text-sm text-ink-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-bad" aria-hidden />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Sugestii</div>
              <ul className="mt-2 space-y-1.5">
                {est.suggestions.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-ink-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
