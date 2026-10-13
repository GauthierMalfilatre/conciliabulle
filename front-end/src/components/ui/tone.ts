// Per-item colours, used sparingly to tell icons and statuses apart. Flat shades,
// picked for WCAG contrast: `text` ≥ 4.5:1 on white; `solid` keeps white icons and
// large text ≥ 3:1; `strong` keeps small white text ≥ 4.5:1.
export const tones = {
  indigo: {
    text: "text-[#0b5aa3]",
    soft: "bg-[#e7f1fb] text-[#0b5aa3]",
    solid: "bg-primary text-white",
    strong: "bg-[#0b5aa3] text-white",
  },
  sky: {
    text: "text-sky-700",
    soft: "bg-sky-100 text-sky-800",
    solid: "bg-sky-600 text-white",
    strong: "bg-sky-700 text-white",
  },
  emerald: {
    text: "text-emerald-700",
    soft: "bg-emerald-100 text-emerald-800",
    solid: "bg-emerald-600 text-white",
    strong: "bg-emerald-700 text-white",
  },
  amber: {
    text: "text-amber-700",
    soft: "bg-amber-100 text-amber-800",
    solid: "bg-amber-600 text-white",
    strong: "bg-amber-700 text-white",
  },
  rose: {
    text: "text-rose-600",
    soft: "bg-rose-100 text-rose-700",
    solid: "bg-rose-600 text-white",
    strong: "bg-rose-700 text-white",
  },
  violet: {
    text: "text-violet-600",
    soft: "bg-violet-100 text-violet-700",
    solid: "bg-violet-600 text-white",
    strong: "bg-violet-700 text-white",
  },
};

export type Tone = keyof typeof tones;
