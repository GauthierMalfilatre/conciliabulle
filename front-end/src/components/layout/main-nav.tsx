import { getCurrentUser } from "@/lib/auth/session";
import { NavLink } from "./nav-link";

const CLIENT_LINKS = [
  { href: "/conciliateurs", label: "Trouver un conciliateur", icon: "search" },
  { href: "/mes-rendez-vous", label: "Mes rendez-vous", icon: "calendar" },
  { href: "/mon-dossier", label: "Mon dossier", icon: "file" },
] as const;

const PRO_LINKS = [
  { href: "/pro", label: "Accueil", icon: "home", exact: true },
  { href: "/pro/agenda", label: "Agenda", icon: "calendar" },
  { href: "/pro/demandes", label: "Demandes", icon: "message" },
  { href: "/pro/dossiers", label: "Dossiers", icon: "file" },
  { href: "/pro/parametres", label: "Paramètres", icon: "sliders" },
] as const;

/** Clients and visitors see booking links; conciliateurs their workspace. */
export async function MainNav() {
  const user = await getCurrentUser();
  const links = user?.status === "conciliateur" ? PRO_LINKS : CLIENT_LINKS;
  return links.map((link) => <NavLink key={link.href} {...link} />);
}
