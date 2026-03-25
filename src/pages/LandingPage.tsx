import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Car, BarChart3, Clock, Users, Shield, Smartphone,
  ChevronRight, Check, MapPin, CreditCard, Settings2,
  ArrowRight, Star, Zap, Globe, Menu, X, ChevronDown,
  Play, MousePointerClick, Sparkles, Crown, Rocket
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import heroDashboard from '@/assets/hero-dashboard.png';
import { supabase } from '@/integrations/supabase/client';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  parking: 'Gestión de Vehículos',
  capacity: 'Control de Aforo',
  reports: 'Reportes',
  audit: 'Auditoría',
  customers: 'Clientes',
  rates: 'Tarifas',
  payments: 'Pagos y Facturación',
  my_plan: 'Mi Plan',
  theme: 'Color del Tema',
  theme_color: 'Personalización del Tema',
  map: 'Mapa',
  team: 'Equipo',
  schedules: 'Horarios de Operación',
  printing: 'Impresión de Recibos',
  monthly_subscriptions: 'Mensualidades',
  reports_download: 'Descarga de Reportes PDF',
  settings: 'Configuración',
};
/* ─── Counter animation hook ─── */
function useCounter(end: number, duration = 2000, inView: boolean) {
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
  { icon: Car, title: 'Registro Vehicular', desc: 'Entradas y salidas con solo digitar la placa. Rápido y eficiente.', color: 'from-blue-500/20 to-indigo-500/20' },
  { icon: CreditCard, title: 'Tarifas Flexibles', desc: 'Configura tarifas por tipo de vehículo, tiempo mínimo y fracciones.', color: 'from-emerald-500/20 to-teal-500/20' },
  { icon: BarChart3, title: 'Reportes en Tiempo Real', desc: 'Consulta ingresos diarios, semanales y mensuales desde cualquier dispositivo.', color: 'from-amber-500/20 to-orange-500/20' },
  { icon: Users, title: 'Gestión de Clientes', desc: 'Registro de clientes frecuentes, sus vehículos y visitas.', color: 'from-purple-500/20 to-pink-500/20' },
  { icon: MapPin, title: 'Control de Aforo', desc: 'Visualiza espacios disponibles y ocupación en tiempo real.', color: 'from-rose-500/20 to-red-500/20' },
  { icon: Shield, title: 'Seguridad Total', desc: 'Roles de usuario, auditoría y control total de accesos.', color: 'from-cyan-500/20 to-sky-500/20' },
];

const adminBenefits = [
  'Reportes de ingresos en dinero en tiempo real',
  'Detalle de vehículos actualmente en parqueo',
  'Control de vehículos monetizados por turno',
  'Gestión de clientes y vehículos frecuentes',
  'Configuración de tarifas por tipo de vehículo',
  'Roles y permisos para tu equipo de trabajo',
];

const operatorBenefits = [
  'Registrar entradas y salidas rápidamente',
  'Imprimir tickets de parqueo',
  'Consultar tarifas de forma automática',
  'Ver espacios disponibles en tiempo real',
  'Cierre de turno con resumen detallado',
  'Gestión simplificada sin complicaciones',
];

// FAQs and testimonials are now loaded from the database

/* ─── Animated section wrapper ─── */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/* ─── Stat card with counter ─── */
function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useCounter(value, 1800, isInView);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black text-primary tabular-nums">
        {count}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-2 font-medium">{label}</div>
    </div>
  );
}

/* ─── FAQ Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-5 md:p-6 text-left font-medium text-sm md:text-base hover:bg-muted/40 transition-colors"
      >
        {q}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-muted-foreground leading-relaxed">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#features', label: 'Características' },
    { href: '#pricing', label: 'Planes' },
    { href: '#roles', label: 'Cómo Funciona' },
    { href: '#testimonials', label: 'Testimonios' },
    { href: '#faq', label: 'FAQ' },
  ];

  // Fetch plans from Supabase
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img  src="/logo.png" alt="ParkiUpar" className="h-9 w-9 transition-transform group-hover:scale-110" />
              <span className="text-xl font-black tracking-tight text-foreground">ParkiUpar</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-all"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild className="rounded-full font-medium">
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild className="rounded-full font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                <Link to="/register">Empieza Gratis</Link>
              </Button>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-muted/60 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium rounded-xl hover:bg-muted/60 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 flex flex-col gap-2">
                  <Button variant="outline" asChild className="rounded-xl w-full">
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button asChild className="rounded-xl w-full">
                    <Link to="/register">Empieza Gratis</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO ═══ */}
      <div id="inicio" ref={heroRef} className="relative min-h-[100svh] flex items-center overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[160px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left */}
              <div className="text-center lg:text-left space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                    <Zap className="h-3.5 w-3.5" />
                    Software de Gestión #1 en Colombia
                  para Parqueaderos
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-black tracking-tight leading-[1.1]"
                >
                  Administra tu{' '}
                  <span className="relative">
                    <span className="text-primary">Parqueadero</span>
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M1 5.5C47 2 153 2 199 5.5" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                    </svg>
                  </span>
                  <br />de forma inteligente
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
                >
                  Plataforma web para el registro de vehículos, control de tarifas, reportes
                  de ingresos y seguimiento en tiempo real.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
                >
                    <Button size="lg" asChild className="text-lg px-10 h-12  rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                    <Link to="/register">
                      Empieza Gratis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="text-lg px-10 h-12 rounded-full hover:scale-[1.02] transition-all">
                    <a href="#features">
                      <Play className="mr-2 h-4 w-4" />
                      Conocer Más
                    </a>
                    </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground"
                >
                  {['Sin instalación', 'Fácil de usar', 'Soporte 24/7'].map(t => (
                    <div key={t} className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {t}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right — Dashboard mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotateY: -8 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center lg:justify-end perspective-1000"
              >
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-8 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 rounded-3xl blur-3xl" />
                  {/* Image container */}
                  <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 bg-card">
                    <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border/50">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                      <div className="ml-4 h-4 w-48 rounded-full bg-muted-foreground/10" />
                    </div>
                    <img
                      src={heroDashboard}
                      alt="Dashboard ParkiUpar - Gestión de parqueadero"
                      className="w-full max-w-lg"
                      loading="eager"
                    />
                  </div>
                  {/* Floating badge */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="absolute -left-6 bottom-12 bg-card border border-border rounded-2xl p-3 shadow-lg flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Ingresos hoy</div>
                      <div className="text-sm font-bold">$1.250.000</div>
                    </div>
                  </motion.div>
                  {/* Floating badge 2 */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="absolute -right-4 top-20 bg-card border border-border rounded-2xl p-3 shadow-lg flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Vehículos</div>
                      <div className="text-sm font-bold">42 activos</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground font-medium">Descubre más</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </div>

      {/* ═══ STATS ═══ */}
      <Section className="py-16 md:py-20 border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatCard value={100} suffix="+" label="Parqueaderos activos" />
            <StatCard value={50} suffix="K+" label="Vehículos registrados" />
            <StatCard value={99} suffix=".9%" label="Tiempo activo" />
            <StatCard value={24} suffix="/7" label="Soporte técnico" />
          </div>
        </div>
      </Section>

      {/* ═══ FEATURES ═══ */}
      <Section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Características</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Todo lo que tu parqueadero necesita
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas diseñadas para optimizar cada aspecto de tu operación diaria.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="h-7 w-7 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Planes y Precios</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Elige el plan ideal para tu{' '}
              <span className="text-primary">parqueadero</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Planes flexibles que se adaptan al tamaño de tu operación. Sin contratos a largo plazo.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-border bg-card p-8 animate-pulse">
                  <div className="h-6 w-24 bg-muted rounded mb-4" />
                  <div className="h-10 w-32 bg-muted rounded mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-4 bg-muted rounded w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-6 max-w-5xl mx-auto ${
              plans.length === 1 ? 'md:grid-cols-1 max-w-md' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
              'md:grid-cols-3'
            }`}>
              {plans.map((plan, i) => {
                const isPopular = i === 1 && plans.length >= 3;
                const planIcon = i === 0 ? Sparkles : i === 1 ? Crown : Rocket;
                const PlanIcon = planIcon;
                const modules = Array.isArray(plan.modules) ? plan.modules as string[] : [];

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className={`relative rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-xl ${
                      isPopular
                        ? 'border-2 border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]'
                        : 'border border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                          Más Popular
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isPopular ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                      }`}>
                        <PlanIcon className={`h-6 w-6 ${isPopular ? '' : 'text-primary'}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">
                          ${plan.price_monthly.toLocaleString('es-CO')}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">/mes</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hasta <span className="font-semibold text-foreground">{plan.max_spaces}</span> espacios
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {modules.map((mod: string) => (
                        <li key={mod} className="flex items-center gap-2.5 text-sm">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                            isPopular ? 'bg-primary/15' : 'bg-primary/10'
                          }`}>
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-muted-foreground">{MODULE_LABELS[mod] || mod}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={`w-full rounded-xl h-12 font-semibold transition-all ${
                        isPopular
                          ? 'shadow-lg shadow-primary/20 hover:shadow-primary/30'
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      <Link to="/register">
                        Empezar Ahora
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ═══ ROLES ═══ */}
      <Section id="roles" className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Cómo Funciona</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Gestionar tu parqueadero es{' '}
              <span className="text-primary">muy fácil</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Nuestro sistema se adapta a dos perfiles principales
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Admin card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border-2 border-primary/20 bg-card p-8 md:p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Settings2 className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Administrador</h3>
                    <p className="text-sm text-primary font-semibold">Superpoderes para ti</p>
                  </div>
                </div>
                <ul className="space-y-3.5">
                  {adminBenefits.map(b => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Operator card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-border bg-card p-8 md:p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <Smartphone className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Operador</h3>
                    <p className="text-sm text-muted-foreground font-semibold">Superpoderes para tu equipo</p>
                  </div>
                </div>
                <ul className="space-y-3.5">
                  {operatorBenefits.map(b => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══ TESTIMONIALS ═══ */}
      <Section id="testimonials" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Testimonios</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-6 md:p-8 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.business}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">FAQ</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ CTA ═══ */}
      <Section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '40px 40px, 60px 60px'
              }}
            />
            
            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-foreground/10 mb-8">
                  <Globe className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary-foreground mb-5">
                  ¿Listo para digitalizar tu parqueadero?
                </h2>
                <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-10">
                  Únete a los parqueaderos que ya optimizaron su operación con ParkiUpar.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary"  asChild className="text-lg px-10 h-12  rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                    <Link to="/register">Crear Cuenta Gratis <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                      <Button size="lg" variant="secondary" asChild className="text-lg px-10 h-12 rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                    <Link to="/login">Iniciar Sesión</Link>
                    </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border py-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="ParkiUpar" className="h-8 w-8" />
              <span className="font-black text-foreground">ParkiUpar</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ParkiUpar. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
