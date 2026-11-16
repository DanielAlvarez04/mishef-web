import type { Metadata } from "next";

import { LEGAL, legalMailto } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Términos y condiciones — ${LEGAL.brand}`,
  description:
    "Términos y condiciones de uso de Mishef: planes, pagos, uso aceptable, disponibilidad y responsabilidad.",
  robots: { index: true, follow: true },
};

const H2 = "mt-10 text-lg font-semibold tracking-tight";
const P = "mt-3 text-sm leading-relaxed text-muted-foreground";
const LI = "mt-2 text-sm leading-relaxed text-muted-foreground";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Documento legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Términos y condiciones
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: {LEGAL.updatedAt}
      </p>

      <h2 className={H2}>1. Partes y aceptación</h2>
      <p className={P}>
        Estos términos regulan el uso de la plataforma {LEGAL.brand}, operada por{" "}
        {LEGAL.entity} (RFC {LEGAL.rfc}, domicilio en {LEGAL.address}). Al crear
        una cuenta, contratar un plan o usar el servicio, aceptas estos términos
        en su totalidad. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2 className={H2}>2. Definiciones</h2>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>
          <strong>Servicio:</strong> el software de punto de venta, cocina,
          inventario, reportes y funciones asociadas que ofrece {LEGAL.brand}.
        </li>
        <li className={LI}>
          <strong>Negocio:</strong> la persona física o moral que contrata el
          servicio para operar uno o más establecimientos.
        </li>
        <li className={LI}>
          <strong>Usuario:</strong> cualquier persona a la que el negocio le
          asigna acceso.
        </li>
        <li className={LI}>
          <strong>Contenido del negocio:</strong> menús, precios, recetas,
          inventario, ventas y datos de sus clientes.
        </li>
      </ul>

      <h2 className={H2}>3. Registro y cuentas</h2>
      <p className={P}>
        La cuenta la crea el negocio y es el administrador quien invita a su
        personal. Eres responsable de la veracidad de los datos, de mantener la
        confidencialidad de las credenciales y de toda actividad realizada desde
        tu cuenta. Notifica de inmediato cualquier acceso no autorizado a{" "}
        <a className="underline underline-offset-4" href={legalMailto("Seguridad de la cuenta")}>
          {LEGAL.email}
        </a>
        .
      </p>
      <p className={P}>
        Debes ser mayor de 18 años y tener capacidad legal para contratar. El
        servicio no está dirigido a menores de edad.
      </p>

      <h2 className={H2}>4. Planes, precios y pagos</h2>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>
          Los planes y precios vigentes se muestran dentro de la aplicación o en{" "}
          {LEGAL.website}. Los precios se expresan en pesos mexicanos y no
          incluyen IVA, salvo que se indique lo contrario.
        </li>
        <li className={LI}>
          El cobro se realiza a través de Mercado Pago. Al contratar autorizas
          el cargo recurrente correspondiente hasta que canceles.
        </li>
        <li className={LI}>
          La suscripción se renueva automáticamente por periodos iguales. Puedes
          cancelar en cualquier momento; el acceso permanece hasta el final del
          periodo ya pagado.
        </li>
        <li className={LI}>
          No se reembolsan periodos consumidos. Si el servicio no estuvo
          disponible por una falla atribuible a {LEGAL.brand} durante más de 72
          horas continuas en un periodo de pago, se abonará el tiempo
          proporcional al siguiente periodo.
        </li>
        <li className={LI}>
          El impago puede suspender el acceso. Antes de suspender se notificará
          por correo y se mantendrán los datos disponibles para exportación
          durante al menos 30 días.
        </li>
      </ul>

      <h2 className={H2}>5. Uso aceptable</h2>
      <p className={P}>No está permitido:</p>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>
          Usar el servicio para actividades ilícitas, incluido el registro de
          ventas falsas o la evasión fiscal.
        </li>
        <li className={LI}>
          Revender, sublicenciar o poner el servicio a disposición de terceros
          sin autorización escrita.
        </li>
        <li className={LI}>
          Intentar acceder a datos de otros negocios, evadir límites de uso o
          interferir con la seguridad y disponibilidad del servicio.
        </li>
        <li className={LI}>
          Realizar ingeniería inversa, copiar o reutilizar el software fuera de
          lo permitido por la ley.
        </li>
      </ul>
      <p className={P}>
        El incumplimiento faculta a {LEGAL.brand} a suspender o cancelar la
        cuenta sin reembolso y, en su caso, a presentar las denuncias
        correspondientes.
      </p>

      <h2 className={H2}>6. Contenido y datos del negocio</h2>
      <p className={P}>
        El contenido del negocio es tuyo. Nos otorgas una licencia limitada para
        almacenarlo, procesarlo y respaldarlo con el único fin de prestar el
        servicio. Sobre los datos de tus clientes finales, el negocio es el{" "}
        <strong>responsable</strong> y {LEGAL.brand} actúa como{" "}
        <strong>encargado</strong>, conforme al aviso de privacidad.
      </p>
      <p className={P}>
        Puedes exportar tu información en cualquier momento desde el panel. Al
        terminar la relación, conservamos los datos el plazo descrito en el
        aviso de privacidad y después los eliminamos o anonimizamos.
      </p>

      <h2 className={H2}>7. Propiedad intelectual</h2>
      <p className={P}>
        El software, la marca, el diseño y la documentación de {LEGAL.brand} son
        propiedad de {LEGAL.entity}. Estos términos no te transfieren ningún
        derecho sobre ellos, solo el de uso conforme a lo contratado.
      </p>

      <h2 className={H2}>8. Disponibilidad y soporte</h2>
      <p className={P}>
        Procuramos una disponibilidad de 99.5 % mensual, medida fuera de
        ventanas de mantenimiento programado. El servicio depende de proveedores
        de infraestructura, red y pagos; no garantizamos una operación
        ininterrumpida ni libre de errores.
      </p>
      <p className={P}>
        Para operar sin internet, el sistema ofrece funciones de contingencia.
        Su alcance se documenta en la aplicación y puede variar por plan.
      </p>
      <p className={P}>
        El soporte se atiende por correo en {LEGAL.email} en horario laboral. Los
        tiempos de respuesta se detallan en el plan contratado.
      </p>

      <h2 className={H2}>9. Limitación de responsabilidad</h2>
      <p className={P}>
        En la máxima medida permitida por la ley, {LEGAL.brand} no responde por
        lucro cesante, pérdida de datos derivada de un uso indebido, ni por
        daños indirectos o consecuenciales. La responsabilidad total acumulada se
        limita al monto pagado por el negocio en los tres meses anteriores al
        evento.
      </p>
      <p className={P}>
        {LEGAL.brand} no sustituye al contador ni al asesor fiscal del negocio.
        Los cálculos de impuestos, propinas y facturación son herramientas; la
        responsabilidad fiscal final es del negocio.
      </p>

      <h2 className={H2}>10. Modificaciones</h2>
      <p className={P}>
        Podemos actualizar estos términos. Los cambios sustanciales se
        notificarán con al menos 15 días de anticipación por correo o dentro de
        la aplicación. Si no estás de acuerdo, puedes cancelar antes de que
        entren en vigor.
      </p>

      <h2 className={H2}>11. Terminación</h2>
      <p className={P}>
        Puedes cancelar la cuenta en cualquier momento desde el panel o
        escribiendo a {LEGAL.email}. Podemos terminar la relación por
        incumplimiento grave, uso fraudulento o requerimiento de autoridad,
        notificando el motivo.
      </p>

      <h2 className={H2}>12. Ley aplicable y jurisdicción</h2>
      <p className={P}>
        Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
        Para cualquier controversia, las partes se someten a los tribunales
        competentes del Estado de México, renunciando a cualquier otro fuero que
        pudiera corresponderles.
      </p>

      <h2 className={H2}>13. Contacto</h2>
      <p className={P}>
        Dudas, quejas o aclaraciones:{" "}
        <a className="underline underline-offset-4" href={legalMailto("Términos y condiciones")}>
          {LEGAL.email}
        </a>
        .
      </p>

      <p className="mt-10 text-xs text-muted-foreground">
        Este documento es una versión de trabajo y debe ser revisada por un
        abogado antes de su publicación definitiva.
      </p>
    </main>
  );
}
