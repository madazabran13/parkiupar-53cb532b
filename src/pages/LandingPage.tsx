import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Car, BarChart3, Clock, Users, Shield, Smartphone, 
  ChevronRight, Check, MapPin, CreditCard, Settings2,
  ArrowRight, Star, Zap, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import heroDashboard from '@/assets/hero-dashboard.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const features = [
  {
    icon: Car,
    title: 'Registro Vehicular',
    description: 'Registra entradas y salidas de vehículos con solo digitar la placa. Rápido, simple y eficiente.',
  },
  {
    icon: CreditCard,
    title: 'Tarifas Flexibles',
    description: 'Configura tarifas por tipo de vehículo, tiempo mínimo y fracciones. Adaptable a tu negocio.',
  },
  {
    icon: BarChart3,
    title: 'Reportes en Tiempo Real',
    description: 'Consulta los ingresos diarios, semanales y mensuales desde cualquier dispositivo.',
  },
  {
    icon: Users,
    title: 'Gestión de Clientes',
    description: 'Lleva el registro de tus clientes frecuentes, sus vehículos y visitas.',
  },
  {
    icon: MapPin,
    title: 'Control de Aforo',
    description: 'Visualiza en tiempo real los espacios disponibles y la ocupación de tu parqueadero.',
  },
  {
    icon: Shield,
    title: 'Seguridad Total',
    description: 'Roles de usuario, auditoría de acciones y control total sobre quién accede al sistema.',
  },
];

const benefits = [
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

const faqs = [
  {
    question: '¿Qué necesito para empezar a usar ParkiUpar?',
    answer: 'Solo necesitas un dispositivo con acceso a internet (computador, tablet o celular) y crear tu cuenta. No requiere instalación.',
  },
  {
    question: '¿Quiénes son los clientes habituales?',
    answer: 'Parqueaderos pequeños, medianos y grandes que buscan digitalizar y optimizar la gestión de su operación diaria.',
  },
  {
    question: '¿Qué tipo de planes ofrece ParkiUpar?',
    answer: 'Ofrecemos planes con suscripción mensual adaptados a la cantidad de espacios y funcionalidades que necesites.',
  },
  {
    question: '¿Es compatible con dispositivos móviles?',
    answer: 'Sí, ParkiUpar es 100% responsive y funciona en cualquier navegador desde celular, tablet o computador.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ParkiUpar" className="h-8 w-8" />
              <span className="text-xl font-bold text-foreground">ParkiUpar</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Características</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cómo Funciona</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonios</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Empieza Gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Software de Gestión para Parqueaderos
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Administra tu{' '}
                <span className="text-primary">Parqueadero</span>{' '}
                de forma inteligente
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Plataforma web para el registro de vehículos, control de tarifas, reportes de ingresos 
                y seguimiento en tiempo real de la operación diaria de tu parqueadero.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" asChild className="text-base px-8 h-12 shadow-lg shadow-primary/25">
                  <Link to="/register">Empieza Gratis <ChevronRight className="ml-1 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8 h-12">
                  <a href="#features">Conocer Más</a>
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  Sin instalación
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  Fácil de usar
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  Soporte 24/7
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex justify-center"
            >
              <img
                src={heroDashboard}
                alt="Dashboard ParkiUpar mostrando gestión de parqueadero"
                className="w-full max-w-lg drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '100+', label: 'Parqueaderos' },
              { value: '50K+', label: 'Vehículos Registrados' },
              { value: '99.9%', label: 'Disponibilidad' },
              { value: '24/7', label: 'Soporte Técnico' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold">
              Un software que se adapta a tu{' '}
              <span className="text-primary">parqueadero</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu parqueadero de manera profesional y eficiente.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUp}>
                <Card className="h-full border-border/50 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works - Roles */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold">
              Gestionar tu parqueadero es{' '}
              <span className="text-primary">muy fácil</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
              Nuestro sistema te permite controlar todo desde dos perfiles
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Card className="h-full border-primary/20 bg-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <Settings2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Administrador</h3>
                      <p className="text-sm text-primary font-medium">Superpoderes para ti</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Card className="h-full border-border/50 bg-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Operador</h3>
                      <p className="text-sm text-muted-foreground font-medium">Superpoderes para tu equipo</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {operatorBenefits.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold">
              Lo que dicen nuestros <span className="text-primary">clientes</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              {
                name: 'Parqueadero Centro',
                text: 'ParkiUpar nos permitió controlar los ingresos diarios de forma transparente. Ya no hay filtraciones de dinero y el reporte es en tiempo real.',
              },
              {
                name: 'Parqueadero La Terminal',
                text: 'Excelente herramienta para organizar y controlar nuestro parqueadero. Su servicio es satisfactorio y siempre atentos a nuestras solicitudes.',
              },
              {
                name: 'Parqueadero Los Ángeles',
                text: 'Facilita el control de entradas y salidas, generando confianza al cobrar el valor real. Herramienta útil y altamente recomendada.',
              },
            ].map((testimonial) => (
              <motion.div key={testimonial.name} variants={fadeUp}>
                <Card className="h-full border-border/50">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      "{testimonial.text}"
                    </p>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-center mb-12">
              Preguntas <span className="text-primary">Frecuentes</span>
            </motion.h2>

            <motion.div variants={stagger} className="space-y-4">
              {faqs.map((faq) => (
                <motion.details
                  key={faq.question}
                  variants={fadeUp}
                  className="group rounded-xl border border-border bg-card overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-medium hover:bg-muted/50 transition-colors list-none">
                    {faq.question}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-5 pb-5 text-sm text-muted-foreground">
                    {faq.answer}
                  </div>
                </motion.details>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="relative rounded-3xl bg-primary p-12 lg:p-16 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
              <div className="relative">
                <Globe className="h-12 w-12 text-primary-foreground/80 mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-4">
                  ¿Listo para digitalizar tu parqueadero?
                </h2>
                <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
                  Únete a los parqueaderos que ya optimizaron su operación con ParkiUpar.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild className="text-base px-8 h-12">
                    <Link to="/register">Crear Cuenta Gratis <ArrowRight className="ml-1 h-5 w-5" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-base px-8 h-12 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ParkiUpar" className="h-7 w-7" />
              <span className="font-bold text-foreground">ParkiUpar</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ParkiUpar. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Características</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ingresar</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
