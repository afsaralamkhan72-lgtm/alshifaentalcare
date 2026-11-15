"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseDelimited, planImport, type ImportPlan } from "@/lib/medImport";
import { readXlsx } from "@/lib/xlsxLite";

const SAMPLE =
  "Name,Potency,Form,Pack,Dose,Frequency,Duration,Instructions,Price\nArnica Montana,30C,Globules,2 dram,4 goliyan,3 dafa roz,5 din,Khane se pehle,0\nBelladonna,200C,Drops (Dilution),30ml,5 boondein,2 dafa roz,3 din,,0\n";

/** Homeopathic dawaon ki list file se jodna: sirf nayi dawaen judti hain, purani kabhi nahi badalti. */
export default function MedicineImport({
  existing,
}: {
  existing: { name: string; potency: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<string>("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg("");
    setDone("");
    try {
      if (f.size > 5 * 1024 * 1024)
        throw new Error("File bohat bari hai (5 MB se kam rakhein)");
      const lower = f.name.toLowerCase();
      let rows: string[][];
      if (lower.endsWith(".xlsx")) rows = await readXlsx(await f.arrayBuffer());
      else if (
        lower.endsWith(".csv") ||
        lower.endsWith(".txt") ||
        f.type.startsWith("text/")
      )
        rows = parseDelimited(await f.text());
      else
        throw new Error(
          'Sirf Excel (.xlsx) ya CSV/TXT file chunein. Purani .xls ho to Excel mein "Save as .xlsx" karein.',
        );
      setPlan(planImport(rows, existing));
    } catch (err) {
      setPlan(null);
      setMsg(err instanceof Error ? err.message : "File parhi nahi ja saki");
    }
  }

  function fromPaste() {
    setMsg("");
    setDone("");
    setPlan(planImport(parseDelimited(paste), existing));
  }

  async function run() {
    if (!plan || busy || plan.fresh.length === 0) return;
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    let added = 0;
    let skipped = 0;
    const rows = plan.fresh.map((m) => ({
      ...m,
      category: "homeopathic" as const,
      available: false,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from("medicines").insert(chunk);
      if (!error) {
        added += chunk.length;
        continue;
      }
      for (const r of chunk) {
        const one = await supabase.from("medicines").insert(r);
        if (!one.error) added++;
        else if (one.error.code === "23505") skipped++;
        else {
          setBusy(false);
          setMsg(
            "Ruk gaya: " + one.error.message + " (jo ho chuki wo save hain)",
          );
          router.refresh();
          return;
        }
      }
    }
    setBusy(false);
    setDone(
      added +
        " nayi dawaen judi" +
        (skipped ? ", " + skipped + " pehle se thin" : ""),
    );
    setPlan(null);
    setPaste("");
    router.refresh();
  }

  function sample() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }));
    a.download = "homeopathic-dawaen-namuna.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const trigger = (
    <button
      type="button"
      data-testid="med-import-open"
      onClick={() => setOpen(true)}
      className="ml-auto rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
    >
      Import (file se dawaen)
    </button>
  );
  if (!open) return trigger;
  return (
    <>
      {trigger}
      <div
        data-testid="med-import"
        className="order-last min-w-0 basis-full rounded-2xl border-2 border-clinic-teal/25 bg-white p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-clinic-ink">
              Dawaen file se jodein
            </p>
            <p className="text-xs text-clinic-ink/60">
              Excel (.xlsx) ya CSV. Pehli qatar mein Name, Potency, Form, Pack,
              Dose, Frequency, Duration, Instructions, Price likhein (sirf Name
              zaroori hai). Sirf nayi dawaen judti hain, purani nahi badalti.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPlan(null);
              setMsg("");
            }}
            className="text-sm text-clinic-ink/60"
          >
            Band
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            data-testid="med-import-file"
            type="file"
            accept=".xlsx,.csv,.txt,text/csv,text/plain"
            onChange={onFile}
            className="text-sm"
          />
          <button
            type="button"
            onClick={sample}
            className="text-sm font-semibold text-clinic-teal"
          >
            Namuna file download
          </button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-clinic-teal">
            Ya naam yahan paste karein (har dawa nayi line mein)
          </summary>
          <textarea
            data-testid="med-import-paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-lg border border-clinic-teal/20 p-2 text-sm"
            placeholder={"Arnica Montana\nBelladonna\nNux Vomica"}
          />
          <button
            type="button"
            data-testid="med-import-paste-go"
            onClick={fromPaste}
            className="mt-2 rounded-full bg-clinic-teal px-4 py-1.5 text-sm font-semibold text-white"
          >
            Dekhein
          </button>
        </details>
        {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
        {done && (
          <p
            data-testid="med-import-done"
            className="mt-2 text-sm font-semibold text-emerald-700"
          >
            {done}
          </p>
        )}
        {plan && (
          <div className="mt-3" data-testid="med-import-plan">
            <p className="text-sm">
              <b data-testid="med-import-new">{plan.fresh.length}</b> nayi ·{" "}
              <b>{plan.dup.length}</b> pehle se maujood (chhor di jayengi) ·{" "}
              <b>{plan.bad.length}</b> ghalat
            </p>
            {plan.fresh.length > 0 && (
              <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-clinic-teal/10">
                <table className="w-full text-xs">
                  <thead className="bg-clinic-mint text-left text-clinic-ink/60">
                    <tr>
                      <th className="px-2 py-1">Dawa</th>
                      <th className="px-2 py-1">Potency</th>
                      <th className="px-2 py-1">Form / Pack</th>
                      <th className="px-2 py-1">Dose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.fresh.slice(0, 100).map((m, i) => (
                      <tr key={i} className="border-t border-clinic-teal/10">
                        <td className="px-2 py-1">{m.name}</td>
                        <td className="px-2 py-1">{m.potency ?? ""}</td>
                        <td className="px-2 py-1">
                          {[m.dosage_form, m.pack].filter(Boolean).join(" · ")}
                        </td>
                        <td className="px-2 py-1">
                          {[
                            m.default_dose,
                            m.default_frequency,
                            m.default_duration,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {plan.fresh.length > 100 && (
                  <p className="px-2 py-1 text-xs text-clinic-ink/50">
                    ... aur {plan.fresh.length - 100} (sab judengi)
                  </p>
                )}
              </div>
            )}
            {plan.bad.length > 0 && (
              <p className="mt-2 text-xs text-red-600">
                Ghalat qataren:{" "}
                {plan.bad
                  .slice(0, 8)
                  .map((b) => "qatar " + b.row + " (" + b.why + ")")
                  .join(", ")}
              </p>
            )}
            <button
              type="button"
              data-testid="med-import-go"
              disabled={busy || plan.fresh.length === 0}
              onClick={run}
              className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Ho raha hai..." : plan.fresh.length + " dawaen jodein"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
