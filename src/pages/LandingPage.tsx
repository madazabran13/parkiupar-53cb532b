import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Car, BarChart3, Users, Shield, MapPin, CreditCard,
  ArrowRight, ArrowUpRight, Check, Menu, X, ChevronDown,
  Sparkles, Crown, Rocket
} from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import heroDashboard from '@/assets/hero-dashboard.png';
import { supabase } from '@/integrations/supabase/client';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  parking: 'Gestión de vehículos',
  capacity: 'Control de aforo',
  reports: 'Reportes',
  audit: 'Auditoría',
  customers: 'Clientes',
  rates: 'Tarifas',
  payments: 'Pagos y facturación',
  my_plan: 'Mi plan',
  theme: 'Color del tema',
  theme_color: 'Personalización del tema',
  map: 'Mapa',
  team: 'Equipo',
  schedules: 'Horarios de operación',
  printing: 'Impresión de recibos',
  monthly_subscriptions: 'Mensualidades',
  reports_download: 'Descarga de reportes PDF',
  settings: 'Configuración',
};

/* ─── Counter ─── */
function useCounter(end: number, duration = 1800, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView]);
  return count;
}

/* ─── Data ─── */
const features = [
  { icon: Car, title: 'Registro vehicular', desc: 'Entradas y salidas con sólo digitar la placa. Sin papeleo, sin demoras.' },
  { icon: CreditCard, title: 'Tarifas flexibles', desc: 'Configura tarifas por tipo de vehículo, fracciones de tiempo y mínimos.' },
  { icon: BarChart3, title: 'Reportes en vivo', desc: 'Ingresos diarios, semanales y mensuales desde cualquier dispositivo.' },
  { icon: Users, title: 'Clientes frecuentes', desc: 'Lleva el registro de clientes recurrentes, sus vehículos y sus visitas.' },
  { icon: MapPin, title: 'Aforo en tiempo real', desc: 'Visualiza espacios disponibles y ocupación al instante en el mapa.' },
  { icon: Shield, title: 'Seguridad y auditoría', desc: 'Roles, permisos y bitácora de eventos. Control granular para tu equipo.' },
];

const adminBenefits = [
  'Reportes de ingresos en tiempo real',
  'Detalle de vehículos en parqueo',
  'Control de monetización por turno',
  'Gestión de clientes y vehículos',
  'Configuración de tarifas por tipo',
  'Roles y permisos para tu equipo',
];

const conductorBenefits = [
  'Disponibilidad de espacios al instante',
  'Reserva un cupo desde tu celular',
  'Mapa interactivo del parqueadero',
  'Notificaciones de tu reserva',
  'Historial completo de visitas',
  'Acceso rápido sin filas',
];

/* ─── Section reveal ─── */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/* ─── Stat ─── */
function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useCounter(value, 1600, isInView);
  return (
    <div ref={ref} className="border-t border-border pt-6">
      <div className="text-5xl md:text-6xl font-display font-light tracking-tight tabular-nums text-foreground">
        {count}<span className="text-primary">{suffix}</span>
      </div>
      <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ─── FAQ ─── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border last:border-b">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-start justify-between w-full py-6 md:py-7 text-left gap-6 group"
      >
        <div className="flex items-start gap-5 flex-1">
          <span className="font-mono text-xs text-muted-foreground tabular-nums pt-1.5 w-8 shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-base md:text-lg font-medium text-foreground group-hover:text-primary transition-colors">
            {q}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 mt-1">
          <span aria-hidden className="block w-5 h-px bg-foreground relative before:absolute before:inset-0 before:rotate-90 before:bg-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pb-6 pl-13 md:pl-[3.25rem] pr-6 text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Eyebrow ─── */
function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="tabular-nums text-foreground">{index}</span>
      <span aria-hidden className="h-px w-8 bg-border" />
      <span>{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#capacidades', label: 'Capacidades' },
    { href: '#planes', label: 'Planes' },
    { href: '#perfiles', label: 'Perfiles' },
    { href: '#testimonios', label: 'Testimonios' },
    { href: '#faq', label: 'FAQ' },
  ];

  const [plans, setPlans] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('plans').select('*').eq('is_active', true).order('price_monthly', { ascending: true })
      .then(({ data }) => { if (data) setPlans(data); });
    supabase.from('testimonials').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setTestimonials(data); });
    supabase.from('faqs').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setFaqs(data); });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled ? 'bg-background/85 backdrop-blur-xl border-b border-border' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="" aria-hidden className="h-8 w-8" width="32" height="32" />
              <span className="text-lg font-display font-bold tracking-tight">ParkiUpar</span>
              <span className="hidden sm:inline-block ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">v2.4</span>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Iniciar sesión
              </Link>
              <Button asChild size="sm" className="rounded-full font-medium h-9 px-5">
                <Link to="/register">
                  Empezar
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <button
              type="button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              className="md:hidden p-2 -mr-2 rounded-md hover:bg-muted/60 transition-colors min-h-11 min-w-11"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-background border-b border-border overflow-hidden"
            >
              <div className="px-5 py-4 space-y-1">
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-3 text-base font-medium rounded-md hover:bg-muted/60 transition-colors min-h-11"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 mt-3 border-t border-border flex flex-col gap-2">
                  <Button variant="outline" asChild className="rounded-full w-full h-11">
                    <Link to="/login">Iniciar sesión</Link>
                  </Button>
                  <Button asChild className="rounded-full w-full h-11">
                    <Link to="/register">Empezar</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO ─── */}
      <header id="inicio" className="relative pt-32 md:pt-40 pb-16 md:pb-20">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[640px] pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '88px 88px',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          }}
        />

        <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10 items-end">
            {/* Left — text */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-7">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Eyebrow index="01" label="Software para parqueaderos · Colombia" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 font-display font-semibold leading-[0.96] tracking-[-0.025em]"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5.75rem)' }}
              >
                Tu parqueadero,
                <br />
                operado con la{' '}
                <span className="font-serif italic font-normal text-primary [font-feature-settings:'ss01']">
                  precisión
                </span>
                <br />
                de un equipo digital.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
              >
                Registra entradas, controla aforo, configura tarifas y observa los ingresos en
                vivo. Sin instalación, sin obras: sólo abres el navegador y operas.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.5 }}
                className="mt-10 flex flex-col sm:flex-row gap-3"
              >
                <Button asChild size="lg" className="rounded-full h-12 px-7 text-base font-medium gap-2">
                  <Link to="/register">
                    Crear cuenta gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-full h-12 px-7 text-base font-medium gap-2 hover:bg-muted/60">
                  <a href="#capacidades">
                    Ver capacidades
                  </a>
                </Button>
              </motion.div>

              <motion.dl
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="mt-14 grid grid-cols-3 gap-x-6 gap-y-4 max-w-md font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                <div>
                  <dd className="text-foreground font-display font-semibold text-2xl tracking-tight normal-case">100%</dd>
                  <dt className="mt-1 text-muted-foreground">Web · sin instalar</dt>
                </div>
                <div>
                  <dd className="text-foreground font-display font-semibold text-2xl tracking-tight normal-case">24/7</dd>
                  <dt className="mt-1 text-muted-foreground">Disponible</dt>
                </div>
                <div>
                  <dd className="text-foreground font-display font-semibold text-2xl tracking-tight normal-case">PWA</dd>
                  <dt className="mt-1 text-muted-foreground">Instalable</dt>
                </div>
              </motion.dl>
            </div>

            {/* Right — mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-12 lg:col-span-5 xl:col-span-5 lg:pl-4"
            >
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-[0_30px_80px_-20px_rgb(0_0_0_/_0.18)]">
                  <div className="h-7 px-3 flex items-center gap-1.5 border-b border-border bg-muted/40">
                    <span className="h-2 w-2 rounded-full bg-foreground/15" />
                    <span className="h-2 w-2 rounded-full bg-foreground/15" />
                    <span className="h-2 w-2 rounded-full bg-foreground/15" />
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">app.parkiupar.com</span>
                  </div>
                  <img
                    src={heroDashboard}
                    alt="Vista del dashboard de ParkiUpar mostrando ingresos, aforo y vehículos activos"
                    className="w-full block"
                    width="900"
                    height="600"
                    loading="eager"
                  />
                </div>

                <div className="absolute -left-3 sm:-left-5 bottom-10 bg-background border border-border rounded-lg p-3 shadow-md flex items-center gap-3 max-w-[180px]">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Hoy</div>
                    <div className="text-sm font-display font-semibold tabular-nums">$1.250.000</div>
                  </div>
                </div>

                <div className="absolute -right-3 sm:-right-4 top-12 bg-background border border-border rounded-lg p-3 shadow-md flex items-center gap-3 max-w-[160px]">
                  <div className="h-9 w-9 rounded-md bg-foreground/5 flex items-center justify-center">
                    <Car className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Activos</div>
                    <div className="text-sm font-display font-semibold tabular-nums">42 vehículos</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ─── STATS ─── */}
      <Section className="py-16 md:py-20">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
            <Stat value={100} suffix="+" label="Parqueaderos activos" />
            <Stat value={50} suffix="K+" label="Vehículos registrados" />
            <Stat value={99} suffix=".9%" label="Disponibilidad" />
            <Stat value={24} suffix="/7" label="Soporte técnico" />
          </div>
        </div>
      </Section>

      {/* ─── FEATURES ─── */}
      <Section id="capacidades" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10 mb-16">
            <div className="col-span-12 md:col-span-5">
              <Eyebrow index="02" label="Capacidades" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.98] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
              >
                Todo lo que tu operación{' '}
                <span className="font-serif italic font-normal">necesita</span>, en un mismo lugar.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 self-end">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Cada módulo está pensado para ahorrar minutos en lo que antes te tomaba horas.
                Si dejas de hacer algo a mano, lo notamos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-border">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}
                className="group relative px-6 md:px-8 py-10 md:py-12 border-b border-border md:[&:nth-child(3n)]:border-r-0 md:border-r border-border last:border-b-0"
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')} / 06
                  </span>
                  <f.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight mb-3">
                  {f.title}
                </h3>
                <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-sm">
                  {f.desc}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      <Section id="planes" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10 mb-14">
            <div className="col-span-12 md:col-span-7">
              <Eyebrow index="03" label="Planes y precios" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.98] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
              >
                Pagas por lo que{' '}
                <span className="font-serif italic font-normal">realmente</span> usas.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-5 self-end">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Sin permanencias. Sin sorpresas. Cambia de plan cuando lo necesites.
              </p>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="grid md:grid-cols-3 gap-px bg-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-background p-8 animate-pulse">
                  <div className="h-4 w-16 bg-muted rounded mb-6" />
                  <div className="h-12 w-32 bg-muted rounded mb-8" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(j => <div key={j} className="h-3 bg-muted rounded w-full" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-px bg-border border border-border ${
              plans.length === 1 ? 'md:grid-cols-1' :
              plans.length === 2 ? 'md:grid-cols-2' :
              'md:grid-cols-3'
            }`}>
              {plans.map((plan, i) => {
                const isPopular = i === 1 && plans.length >= 3;
                const PlanIcon = i === 0 ? Sparkles : i === 1 ? Crown : Rocket;
                const modules = Array.isArray(plan.modules) ? plan.modules as string[] : [];

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className={`relative bg-background p-8 md:p-10 ${isPopular ? 'lg:bg-foreground lg:text-background' : ''}`}
                  >
                    {isPopular && (
                      <span className="absolute top-6 right-6 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 bg-primary text-primary-foreground">
                        Recomendado
                      </span>
                    )}

                    <div className="flex items-center gap-3 mb-10">
                      <PlanIcon className={`h-5 w-5 ${isPopular ? 'lg:text-background' : 'text-primary'}`} />
                      <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${isPopular ? 'lg:text-background/70' : 'text-muted-foreground'}`}>
                        {plan.name}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="font-display font-semibold text-5xl md:text-6xl tracking-tight tabular-nums">
                        ${plan.price_monthly.toLocaleString('es-CO')}
                      </span>
                      <span className={`ml-2 text-sm ${isPopular ? 'lg:text-background/70' : 'text-muted-foreground'}`}>/mes</span>
                    </div>
                    {plan.description && (
                      <p className={`text-sm leading-relaxed mb-8 ${isPopular ? 'lg:text-background/80' : 'text-muted-foreground'}`}>
                        {plan.description}
                      </p>
                    )}

                    <div className={`flex gap-6 mb-10 pb-8 border-b ${isPopular ? 'lg:border-background/20' : 'border-border'}`}>
                      <div>
                        <div className="font-display font-semibold text-2xl tabular-nums">{plan.max_spaces}</div>
                        <div className={`mt-1 font-mono text-[10px] uppercase tracking-[0.16em] ${isPopular ? 'lg:text-background/70' : 'text-muted-foreground'}`}>
                          Espacios
                        </div>
                      </div>
                      <div>
                        <div className="font-display font-semibold text-2xl tabular-nums">{plan.max_users}</div>
                        <div className={`mt-1 font-mono text-[10px] uppercase tracking-[0.16em] ${isPopular ? 'lg:text-background/70' : 'text-muted-foreground'}`}>
                          Usuarios
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-10 min-h-[140px]">
                      {modules.map((mod: string) => (
                        <li key={mod} className="flex items-start gap-2.5 text-[13px]">
                          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${isPopular ? 'lg:text-background' : 'text-primary'}`} strokeWidth={2.5} />
                          <span className={isPopular ? 'lg:text-background/90' : 'text-muted-foreground'}>
                            {MODULE_LABELS[mod] || mod}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant={isPopular ? 'secondary' : 'outline'}
                      className={`w-full rounded-full h-12 font-medium ${isPopular ? '' : 'hover:bg-foreground hover:text-background'}`}
                    >
                      <Link to="/register">
                        Empezar con {plan.name}
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ─── ROLES / PROFILES ─── */}
      <Section id="perfiles" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10 mb-14">
            <div className="col-span-12 md:col-span-6">
              <Eyebrow index="04" label="Cómo funciona" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.98] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
              >
                Dos perfiles,{' '}
                <span className="font-serif italic font-normal">una sola</span> plataforma.
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
            <div className="bg-background p-8 md:p-12">
              <div className="flex items-center justify-between mb-10">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Perfil A
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  Administrador
                </span>
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                Quien gestiona el negocio.
              </h3>
              <p className="text-muted-foreground mb-10 max-w-md">
                Configuras tarifas, supervisas la operación y observas los ingresos en tiempo real.
              </p>
              <ul className="space-y-3">
                {adminBenefits.map(b => (
                  <li key={b} className="flex items-start gap-3 text-sm border-t border-border pt-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background p-8 md:p-12">
              <div className="flex items-center justify-between mb-10">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Perfil B
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  Conductor
                </span>
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                Quien estaciona y reserva.
              </h3>
              <p className="text-muted-foreground mb-10 max-w-md">
                Consulta espacios libres, reserva un cupo y se entera cuando su llegada se confirma.
              </p>
              <ul className="space-y-3">
                {conductorBenefits.map(b => (
                  <li key={b} className="flex items-start gap-3 text-sm border-t border-border pt-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── TESTIMONIALS ─── */}
      <Section id="testimonios" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10 mb-14">
            <div className="col-span-12 md:col-span-7">
              <Eyebrow index="05" label="Testimonios" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.98] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
              >
                Lo que dicen{' '}
                <span className="font-serif italic font-normal">quienes ya operan</span> con
                ParkiUpar.
              </h2>
            </div>
          </div>

          {testimonials.length === 0 ? (
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground py-12">
              · Sin testimonios publicados aún ·
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {testimonials.map((t: any, i: number) => (
                <motion.figure
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}
                  className="bg-background p-8 md:p-10 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex gap-0.5" aria-label={`Calificación ${t.rating} de 5`}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span
                          key={j}
                          aria-hidden
                          className={`h-1 w-3 rounded-full ${j < t.rating ? 'bg-primary' : 'bg-border'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <blockquote className="font-serif text-lg md:text-xl leading-snug text-foreground mb-8 flex-1">
                    "{t.review}"
                  </blockquote>
                  <figcaption className="flex items-center gap-3 pt-6 border-t border-border">
                    <div className="h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center font-display font-semibold text-sm">
                      {t.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.business_name || 'Cliente verificado'}</div>
                    </div>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section id="faq" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-12 gap-6 lg:gap-10">
            <div className="col-span-12 md:col-span-4">
              <Eyebrow index="06" label="Preguntas" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.98] tracking-[-0.02em] mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
              >
                Las dudas{' '}
                <span className="font-serif italic font-normal">más comunes</span>.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Si la tuya no está aquí, escríbenos a{' '}
                <a href="mailto:soporte@parkiupar.com" className="text-foreground underline underline-offset-4 decoration-border hover:decoration-primary transition-colors">
                  soporte@parkiupar.com
                </a>.
              </p>
            </div>
            <div className="col-span-12 md:col-span-8">
              {faqs.length === 0 ? (
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground py-12 border-t border-border">
                  · Cargando preguntas ·
                </p>
              ) : (
                <div>
                  {faqs.map((faq: any, i: number) => (
                    <FaqItem key={faq.id} q={faq.question} a={faq.answer} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── CTA ─── */}
      <Section className="border-t border-border">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 py-24 md:py-32">
          <div className="grid grid-cols-12 gap-6 lg:gap-10">
            <div className="col-span-12 md:col-span-9 lg:col-span-8">
              <Eyebrow index="07" label="Empezar" />
              <h2
                className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.025em]"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}
              >
                Lleva tu parqueadero{' '}
                <span className="font-serif italic font-normal">al siguiente</span> nivel.
              </h2>
              <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
                Crea tu cuenta gratis hoy y empieza a operar en menos de 10 minutos. Sin tarjeta,
                sin obligaciones.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full h-12 px-7 text-base font-medium gap-2">
                  <Link to="/register">
                    Crear cuenta gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7 text-base font-medium">
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 py-16">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-10">
            <div className="col-span-2 md:col-span-5">
              <Link to="/" className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" aria-hidden className="h-8 w-8" width="32" height="32" />
                <span className="font-display font-bold text-lg tracking-tight">ParkiUpar</span>
              </Link>
              <p className="mt-5 text-sm text-muted-foreground max-w-xs leading-relaxed">
                Software web para la gestión integral de parqueaderos en Colombia. Hecho con
                cuidado en Valledupar.
              </p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                v2.4 · Estable
              </p>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Plataforma
              </div>
              <ul className="space-y-2.5 text-sm">
                {navLinks.map(l => (
                  <li key={l.href}>
                    <a href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Legal
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Términos
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacidad
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Contacto
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:soporte@parkiupar.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    soporte@parkiupar.com
                  </a>
                </li>
                <li>
                  <a href="mailto:privacidad@parkiupar.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    privacidad@parkiupar.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              © {new Date().getFullYear()} ParkiUpar · Todos los derechos reservados
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Hecho en Colombia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
