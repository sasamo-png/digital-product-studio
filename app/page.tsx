import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navItems } from "@/lib/navigation";

const features = navItems.filter(
  (item) => item.href !== "/" && item.href !== "/settings"
);

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">
            Digital Product Studio
          </span>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            Entrar al panel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Crea y vende productos digitales con IA
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Investigación de mercado, generación de ebooks, contenido para
            redes, embudos de venta, asistente comercial y analítica. Todo en una
            plataforma propia.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Empezar ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/market-research">Investigar un nicho</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:border-primary">
                    <CardHeader>
                      <Icon className="h-8 w-8 text-primary" />
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        Digital Product Studio — v0.1.0 (FASE 1: andamiaje y modelo de datos)
      </footer>
    </div>
  );
}
