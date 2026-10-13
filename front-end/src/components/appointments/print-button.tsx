"use client";

import { Button, Icon } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="outline" size="lg" onClick={() => window.print()}>
      <Icon name="printer" className="size-5" />
      Imprimer
    </Button>
  );
}
