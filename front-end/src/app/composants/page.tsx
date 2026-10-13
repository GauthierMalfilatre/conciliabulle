import { Container } from "@/components/layout";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

export const metadata = { title: "Composants" };

export default function Home() {
  return (
    <Container className="flex flex-col gap-10 py-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Composants</h1>
        <p className="text-muted-foreground">
          Aperçu des composants de base disponibles dans{" "}
          <code className="font-mono">src/components</code>.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button>Primaire</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="secondary">Secondaire</Button>
        <Button variant="outline">Contour</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Supprimer</Button>
        <Button size="sm">Petit</Button>
        <Button size="lg">Grand</Button>
        <Button disabled>Désactivé</Button>
      </section>

      <section className="flex flex-wrap gap-2">
        <Badge>Défaut</Badge>
        <Badge variant="secondary">Secondaire</Badge>
        <Badge variant="outline">Contour</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="violet">Violet</Badge>
        <Badge variant="success">Validé</Badge>
        <Badge variant="warning">En attente</Badge>
        <Badge variant="destructive">Rejeté</Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Alert title="Information">Votre dossier a bien été enregistré.</Alert>
        <Alert variant="destructive" title="Erreur">
          Une pièce justificative est manquante.
        </Alert>
      </section>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Formulaire</CardTitle>
          <CardDescription>Exemple de champs de saisie.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field id="name" label="Nom" hint="Tel qu'il figure sur vos papiers.">
            <Input id="name" placeholder="Jean Dupont" aria-describedby="name-hint" />
          </Field>
          <Field id="email" label="Email" error="Adresse invalide.">
            <Input id="email" type="email" aria-invalid aria-describedby="email-error" />
          </Field>
          <Field id="type" label="Type de demande">
            <Select id="type" defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              <option value="civil">Civil</option>
              <option value="penal">Pénal</option>
            </Select>
          </Field>
          <Field id="message" label="Message">
            <Textarea id="message" placeholder="Décrivez votre situation…" />
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit">Envoyer</Button>
          <Button variant="ghost">Annuler</Button>
        </CardFooter>
      </Card>
    </Container>
  );
}
