import LegalShell, { Section } from './LegalShell';

export default function Terms() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      subtitle="Condiciones de uso de la plataforma ParkiUpar para administradores de parqueaderos y conductores."
      lastUpdated="7 de mayo de 2026"
    >
      <Section title="1. Aceptación de los términos">
        <p>
          Al registrarte, ingresar o utilizar la plataforma <strong>ParkiUpar</strong> (en adelante, "la Plataforma"),
          aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, debes abstenerte de usar el servicio.
        </p>
        <p>
          Estos términos aplican tanto a los usuarios administradores de parqueaderos como a los conductores que reservan
          o consultan disponibilidad a través de la Plataforma.
        </p>
      </Section>

      <Section title="2. Descripción del servicio">
        <p>
          ParkiUpar es una solución web tipo SaaS (Software as a Service) que permite a parqueaderos digitalizar el registro
          de entradas y salidas de vehículos, controlar el aforo, gestionar tarifas, generar reportes, recibir reservas y
          ofrecer a los conductores una vista pública del parqueadero.
        </p>
        <p>
          La disponibilidad y las funcionalidades específicas dependen del plan contratado por cada parqueadero. ParkiUpar
          se reserva el derecho a actualizar, mejorar o modificar las funcionalidades sin previo aviso, siempre que no se
          afecte materialmente el servicio contratado.
        </p>
      </Section>

      <Section title="3. Cuenta de usuario">
        <p>
          Para usar la Plataforma debes registrar una cuenta con datos verídicos y mantener la confidencialidad de tu
          contraseña. Eres responsable de toda la actividad que ocurra bajo tu cuenta.
        </p>
        <p>
          Notifícanos de inmediato si sospechas un acceso no autorizado. ParkiUpar no se hace responsable por pérdidas
          derivadas del incumplimiento de esta obligación de seguridad.
        </p>
      </Section>

      <Section title="4. Planes, pagos y facturación">
        <p>
          Los parqueaderos pueden suscribirse a distintos planes con diferentes capacidades de espacios, usuarios y módulos.
          Los precios y características se publican en la Plataforma y pueden actualizarse. Toda actualización aplica al
          siguiente ciclo de facturación.
        </p>
        <p>
          La falta de pago dentro de los plazos establecidos puede resultar en la suspensión temporal del acceso. Los datos
          se conservan durante el periodo de gracia definido por ParkiUpar antes de cualquier eliminación.
        </p>
      </Section>

      <Section title="5. Uso permitido">
        <p>El usuario se compromete a:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Utilizar la Plataforma únicamente para fines legales y dentro de su propósito comercial.</li>
          <li>No intentar acceder a cuentas, datos o sistemas que no le pertenezcan.</li>
          <li>No realizar ingeniería inversa, scraping masivo, ni interferir con la infraestructura.</li>
          <li>No introducir información falsa, ofensiva o que vulnere derechos de terceros.</li>
          <li>Cumplir con la normativa colombiana aplicable a la prestación de servicios de parqueadero.</li>
        </ul>
      </Section>

      <Section title="6. Reservas y operación de parqueaderos">
        <p>
          Las reservas creadas por conductores son una solicitud de cupo sujeta a verificación y aceptación por parte del
          parqueadero correspondiente. El parqueadero conserva la decisión final sobre aceptar, rechazar o cancelar
          cualquier reserva.
        </p>
        <p>
          ParkiUpar actúa como intermediario tecnológico y no es parte del contrato de prestación de servicio de
          parqueo entre el conductor y el parqueadero.
        </p>
      </Section>

      <Section title="7. Propiedad intelectual">
        <p>
          El software, el diseño, los logos, marcas y demás elementos de la Plataforma son propiedad de ParkiUpar o sus
          licenciantes. Se otorga al usuario una licencia no exclusiva, intransferible y revocable para usar la Plataforma
          conforme a estos términos.
        </p>
        <p>
          Los datos cargados por cada parqueadero (clientes, vehículos, sesiones, reportes) son y seguirán siendo del
          parqueadero. ParkiUpar los procesa exclusivamente para prestar el servicio.
        </p>
      </Section>

      <Section title="8. Disponibilidad y limitación de responsabilidad">
        <p>
          ParkiUpar trabaja para mantener la Plataforma disponible 24/7, pero no garantiza una disponibilidad ininterrumpida.
          Pueden ocurrir mantenimientos programados, fallas de terceros (proveedor de hosting, pasarelas de pago) o eventos
          de fuerza mayor que afecten temporalmente el servicio.
        </p>
        <p>
          En la máxima medida permitida por la ley, ParkiUpar no será responsable por daños indirectos, lucro cesante,
          pérdida de datos no atribuibles a su culpa, ni por decisiones operativas tomadas por el parqueadero con base en
          la información de la Plataforma.
        </p>
      </Section>

      <Section title="9. Terminación">
        <p>
          El usuario puede cancelar su cuenta en cualquier momento. ParkiUpar puede suspender o terminar cuentas que
          incumplan estos términos, presenten actividad fraudulenta o representen un riesgo para otros usuarios.
        </p>
      </Section>

      <Section title="10. Modificaciones">
        <p>
          ParkiUpar puede modificar estos términos cuando lo considere necesario. Las modificaciones se publicarán en esta
          misma página con la fecha de actualización. El uso continuado de la Plataforma tras la publicación implica la
          aceptación de los nuevos términos.
        </p>
      </Section>

      <Section title="11. Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces
          competentes de la ciudad de domicilio del titular del servicio, sin perjuicio de las normas imperativas de
          protección al consumidor.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Para preguntas sobre estos términos puedes escribirnos a{' '}
          <a href="mailto:soporte@parkiupar.com" className="text-primary hover:underline">soporte@parkiupar.com</a>.
        </p>
      </Section>
    </LegalShell>
  );
}
