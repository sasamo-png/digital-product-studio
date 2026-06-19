import {
  LayoutDashboard,
  Search,
  Radar,
  Package,
  BookOpen,
  Megaphone,
  Filter,
  MessagesSquare,
  BarChart3,
  Settings,
  Home,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

// Rutas de la app (ver CLAUDE.md). La landing `/` es la portada pública;
// el resto vive bajo el layout con sidebar.
export const navItems: NavItem[] = [
  {
    title: "Inicio",
    href: "/",
    icon: Home,
    description: "Landing pública",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Centro de control",
  },
  {
    title: "Investigación de mercado",
    href: "/market-research",
    icon: Search,
    description: "Análisis de nichos con IA",
  },
  {
    title: "Radar de Anuncios",
    href: "/radar",
    icon: Radar,
    description: "Espía anuncios activos en la Biblioteca de Meta",
  },
  {
    title: "Constructor de productos",
    href: "/product-builder",
    icon: Package,
    description: "Creación de productos digitales",
  },
  {
    title: "Generador de ebooks",
    href: "/ebook-generator",
    icon: BookOpen,
    description: "Generación de ebooks con IA",
  },
  {
    title: "Estudio de contenido",
    href: "/content-studio",
    icon: Megaphone,
    description: "Contenido multiplataforma (IG, TikTok, X, email)",
  },
  {
    title: "Constructor de embudos",
    href: "/funnel-builder",
    icon: Filter,
    description: "Embudos de venta (landing, emails, upsells)",
  },
  {
    title: "Asistente de ventas",
    href: "/sales-assistant",
    icon: MessagesSquare,
    description: "Scripts de venta y respuestas a objeciones",
  },
  {
    title: "Analítica",
    href: "/analytics",
    icon: BarChart3,
    description: "Métricas de negocio",
  },
  {
    title: "Ajustes",
    href: "/settings",
    icon: Settings,
    description: "Cuenta y preferencias",
  },
];
