import LegalShell, { Section } from './LegalShell';

export default function Privacy() {
  return (
    <LegalShell
      title="Política de Privacidad"
      subtitle="Cómo recolectamos, usamos y protegemos tus datos personales en cumplimiento de la Ley 1581 de 2012 y demás normativa aplicable."
      lastUpdated="7 de mayo de 2026"
    >
      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales es <strong>ParkiUpar</strong>, plataforma de gestión de
          parqueaderos. Para ejercer cualquier derecho relacionado con tus datos puedes escribirnos a{' '}
          <a href="mailto:privacidad@parkiupar.com" className="text-primary hover:underline">privacidad@parkiupar.com</a>.
        </p>
      </Section>

      <Section title="2. Datos que recolectamos">
        <p>Recolectamos únicamente los datos necesarios para prestar el servicio:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Administradores de parqueadero:</strong> nombre, correo electrónico, número de teléfono, nombre comercial, dirección y ciudad del parqueadero, contraseña cifrada.</li>
          <li><strong>Conductores:</strong> número de teléfono, nombre (opcional), placa del vehículo, tipo de vehículo, historial de visitas y reservas.</li>
          <li><strong>Clientes registrados por el parqueadero:</strong> nombre, teléfono, placa(s) y vehículos asociados.</li>
          <li><strong>Datos operativos:</strong> entradas y salidas, horas y montos cobrados, espacios ocupados.</li>
          <li><strong>Datos técnicos:</strong> identificadores de sesión, dirección IP, información del navegador y registros de auditoría.</li>
        </ul>
      </Section>

      <Section title="3. Finalidades del tratamiento">
        <p>Tus datos se usan exclusivamente para:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Crear y autenticar tu cuenta.</li>
          <li>Permitir el registro de entradas, salidas, reservas y pagos del parqueadero.</li>
          <li>Generar reportes operativos y financieros para el parqueadero.</li>
          <li>Enviar notificaciones relacionadas con reservas, llegada al parqueadero y comunicación operativa.</li>
          <li>Cumplir obligaciones contractuales y legales.</li>
          <li>Mejorar la Plataforma y prevenir fraudes o usos indebidos.</li>
        </ul>
      </Section>

      <Section title="4. Base legal y autorización">
        <p>
          El tratamiento se realiza con base en tu autorización previa, expresa e informada al registrarte, así como en
          la ejecución del contrato de prestación de servicios y el cumplimiento de obligaciones legales aplicables.
        </p>
      </Section>

      <Section title="5. Compartición con terceros">
        <p>
          Solo compartimos datos con terceros que actúan como encargados del tratamiento bajo acuerdos de confidencialidad
          equivalentes:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Proveedor de infraestructura (Supabase / AWS):</strong> almacenamiento y procesamiento de la base de datos.</li>
          <li><strong>Pasarelas de pago:</strong> únicamente para procesar la facturación de los planes de los parqueaderos.</li>
          <li><strong>Servicios de mapas (Google Maps):</strong> para mostrar la ubicación de los parqueaderos y rutas.</li>
        </ul>
        <p>
          No vendemos ni alquilamos tus datos personales a terceros con fines publicitarios.
        </p>
      </Section>

      <Section title="6. Transferencia internacional">
        <p>
          Algunos de nuestros proveedores tienen servidores fuera de Colombia (principalmente en Estados Unidos). Al
          aceptar esta política autorizas dicha transferencia, la cual se realiza bajo condiciones contractuales que
          garantizan un nivel adecuado de protección equivalente al exigido por la legislación colombiana.
        </p>
      </Section>

      <Section title="7. Derechos del titular">
        <p>De acuerdo con la Ley 1581 de 2012, como titular tienes derecho a:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Conocer, actualizar y rectificar</strong> tus datos personales.</li>
          <li><strong>Solicitar prueba</strong> de la autorización otorgada.</li>
          <li><strong>Ser informado</strong> sobre el uso que se les ha dado.</li>
          <li><strong>Revocar la autorización</strong> y solicitar la supresión de tus datos cuando no exista deber legal o contractual de conservarlos.</li>
          <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC).</li>
        </ul>
        <p>
          Puedes ejercer estos derechos escribiendo a{' '}
          <a href="mailto:privacidad@parkiupar.com" className="text-primary hover:underline">privacidad@parkiupar.com</a>.
          Atendemos tu solicitud dentro de los plazos legales (15 días hábiles para consultas, 15 días hábiles
          prorrogables para reclamos).
        </p>
      </Section>

      <Section title="8. Retención de datos">
        <p>
          Conservamos los datos durante la vigencia de la cuenta y por el tiempo adicional necesario para cumplir
          obligaciones legales (especialmente fiscales y contables). Pasado ese plazo los datos se eliminan o anonimizan.
        </p>
      </Section>

      <Section title="9. Seguridad de la información">
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado en tránsito (HTTPS/TLS),
          cifrado de contraseñas, control de accesos basado en roles, registros de auditoría y copias de seguridad
          periódicas.
        </p>
        <p>
          Ninguna plataforma es 100% invulnerable; ante un incidente de seguridad notificaremos a los titulares
          afectados y a la SIC en los términos legales aplicables.
        </p>
      </Section>

      <Section title="10. Cookies y tecnologías similares">
        <p>
          Usamos cookies y almacenamiento local únicamente para mantener la sesión iniciada y recordar preferencias
          (como tema de color). No utilizamos cookies de seguimiento publicitario de terceros.
        </p>
      </Section>

      <Section title="11. Cambios a esta política">
        <p>
          Podemos actualizar esta Política de Privacidad para reflejar cambios legales u operativos. La nueva versión se
          publicará en esta misma página con la fecha de actualización. Si los cambios son sustanciales, te avisaremos por
          correo o dentro de la Plataforma.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Para cualquier asunto relacionado con tus datos personales o esta política, escríbenos a{' '}
          <a href="mailto:privacidad@parkiupar.com" className="text-primary hover:underline">privacidad@parkiupar.com</a>.
        </p>
      </Section>
    </LegalShell>
  );
}
