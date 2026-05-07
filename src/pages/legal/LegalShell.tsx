import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalShell({ title, subtitle, lastUpdated, children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="ParkiUpar" className="h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="font-black text-foreground">ParkiUpar</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al inicio</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mb-5">
            <FileText className="h-3.5 w-3.5" />
            Documento legal
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{title}</h1>
          <p className="text-base text-muted-foreground">{subtitle}</p>
          <p className="text-xs text-muted-foreground mt-2">Última actualización: {lastUpdated}</p>
        </div>

        <article className="space-y-8 text-sm md:text-base leading-relaxed text-foreground/90">
          {children}
        </article>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ParkiUpar. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-xs">
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Términos</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacidad</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Inicio</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3 text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
