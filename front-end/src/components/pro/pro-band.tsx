import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

/** Blue title band at the top of workspace pages. */
export function ProBand({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-primary py-7 text-white print:bg-white print:text-black">
      <Container className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {subtitle && <p className="text-lg">{subtitle}</p>}
            <h1 className="text-3xl sm:text-4xl">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
        </div>
        {children}
      </Container>
    </section>
  );
}

/** White button for use on the blue band. */
export const bandButton =
  "inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-base font-semibold text-primary transition-colors hover:bg-secondary";
