import type { Metadata } from "next";

import { LEGAL, legalMailto } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Aviso de privacidad — ${LEGAL.brand}`,
  description:
    "Aviso de privacidad integral de Mishef: qué datos personales tratamos, para qué y cómo ejercer tus derechos ARCO.",
  robots: { index: true, follow: true },
};

const H2 = "mt-10 text-lg font-semibold tracking-tight";
const P = "mt-3 text-sm leading-relaxed text-muted-foreground";
const LI = "mt-2 text-sm leading-relaxed text-muted-foreground";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Documento legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Aviso de privacidad integral
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: {LEGAL.updatedAt}
      </p>

      <h2 className={H2}>1. Identidad y domicilio del responsable</h2>
      <p className={P}>
        {LEGAL.entity}, con Registro Federal de Contribuyentes {LEGAL.rfc} y
        domicilio en {LEGAL.address}, es responsable del tratamiento de los
        datos personales que recaba a través de {LEGAL.website} y de la
        aplicación {LEGAL.brand}. Para cualquier asunto relacionado con este
        aviso puede escribir a{" "}
        <a className="underline underline-offset-4" href={legalMailto("Aviso de privacidad")}>
          {LEGAL.email}
        </a>
        .
      </p>

      <h2 className={H2}>2. Datos personales que tratamos</h2>
      <p className={P}>
        Según el tipo de usuario, podemos tratar las siguientes categorías:
      </p>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>
          <strong>Identificación y contacto:</strong> nombre, correo
          electrónico, teléfono y contraseña (guardada siempre cifrada con
          Argon2, nunca en texto plano).
        </li>
        <li className={LI}>
          <strong>Datos del negocio:</strong> nombre comercial, RFC, régimen
          fiscal, domicilio, sucursales y datos operativos como ventas,
          inventario y personal.
        </li>
        <li className={LI}>
          <strong>Datos de tu personal:</strong> nombre, correo, rol dentro del
          negocio y registros de asistencia cuando el negocio use esa función.
        </li>
        <li className={LI}>
          <strong>Datos de tus clientes finales:</strong> los que el negocio
          capture en el punto de venta (por ejemplo, para facturación o
          fidelización). Sobre estos datos, <em>el negocio es el responsable</em>{" "}
          y {LEGAL.brand} actúa como encargado del tratamiento.
        </li>
        <li className={LI}>
          <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo,
          navegador, registros de acceso y errores, con fines de seguridad y
          diagnóstico.
        </li>
      </ul>
      <p className={P}>
        No recabamos datos personales sensibles. Si en el futuro una función los
        requiriera, se pedirá consentimiento expreso y por escrito.
      </p>

      <h2 className={H2}>3. Finalidades primarias</h2>
      <p className={P}>
        Estos datos son necesarios para la relación contractual y no requieren
        consentimiento adicional:
      </p>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>Crear y administrar tu cuenta y la de tu negocio.</li>
        <li className={LI}>
          Operar el sistema: ventas, cocina, inventario, caja y reportes.
        </li>
        <li className={LI}>
          Autenticarte, incluida la verificación en dos pasos por correo.
        </li>
        <li className={LI}>
          Enviar correos operativos: verificación, recuperación de contraseña,
          códigos de acceso y avisos del servicio.
        </li>
        <li className={LI}>
          Procesar pagos y suscripciones a través de terceros (por ejemplo,
          Mercado Pago).
        </li>
        <li className={LI}>
          Facturar y cumplir obligaciones fiscales cuando corresponda.
        </li>
        <li className={LI}>
          Atender soporte, incidencias y requerimientos de autoridades.
        </li>
      </ul>

      <h2 className={H2}>4. Finalidades secundarias</h2>
      <p className={P}>
        De manera adicional y para mejorar el producto podríamos usar datos
        agregados y anonimizados (nunca identificables) para estadísticas,
        comparativas entre negocios y desarrollo de nuevas funciones. Puedes
        oponerte a este uso escribiendo a {LEGAL.email}; negarte no afecta el
        servicio que recibes.
      </p>

      <h2 className={H2}>5. Transferencias y encargados</h2>
      <p className={P}>
        Para operar el servicio compartimos datos con proveedores que actúan por
        cuenta nuestra y están obligados contractualmente a confidencialidad:
      </p>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>
          <strong>Cloudflare</strong> (alojamiento, CDN, almacenamiento de
          imágenes y protección contra abuso).
        </li>
        <li className={LI}>
          <strong>Resend</strong> (envío de correo transaccional).
        </li>
        <li className={LI}>
          <strong>Mercado Pago</strong> (procesamiento de pagos y
          suscripciones).
        </li>
        <li className={LI}>
          <strong>Proveedor de infraestructura</strong> donde se aloja la base
          de datos.
        </li>
      </ul>
      <p className={P}>
        No vendemos ni transferimos tus datos a terceros para fines distintos a
        los aquí descritos. Cualquier transferencia adicional requerirá tu
        consentimiento, salvo las excepciones previstas por la ley.
      </p>

      <h2 className={H2}>6. Conservación</h2>
      <p className={P}>
        Conservamos los datos mientras exista la cuenta y el tiempo necesario
        para cumplir obligaciones legales, fiscales y de defensa ante
        reclamaciones. Al cerrar la cuenta, los datos operativos se eliminan o
        anonimizan en un plazo máximo de 90 días, salvo aquellos que la ley
        obligue a conservar.
      </p>

      <h2 className={H2}>7. Derechos ARCO y portabilidad</h2>
      <p className={P}>
        Puedes ejercer tus derechos de <strong>Acceso, Rectificación,
        Cancelación y Oposición</strong>, así como solicitar la portabilidad de
        tus datos, escribiendo a{" "}
        <a className="underline underline-offset-4" href={legalMailto("Derechos ARCO")}>
          {LEGAL.email}
        </a>{" "}
        con:
      </p>
      <ul className="mt-3 list-disc pl-5">
        <li className={LI}>Tu nombre completo y un medio para contactarte.</li>
        <li className={LI}>Copia de identificación oficial vigente.</li>
        <li className={LI}>La descripción clara del derecho que deseas ejercer.</li>
      </ul>
      <p className={P}>
        Responderemos en un plazo máximo de 20 días hábiles y, si procede, se
        hará efectivo dentro de los 15 días hábiles siguientes. Si consideras
        que tu solicitud no fue atendida correctamente, puedes acudir al
        Instituto Nacional de Transparencia, Acceso a la Información y
        Protección de Datos Personales (INAI).
      </p>

      <h2 className={H2}>8. Cookies y tecnologías similares</h2>
      <p className={P}>
        Usamos cookies estrictamente necesarias para mantener tu sesión
        (identificadores de acceso) y almacenamiento local del navegador para
        preferencias de tema y funcionamiento del panel. No usamos cookies
        publicitarias ni de seguimiento de terceros.
      </p>

      <h2 className={H2}>9. Seguridad</h2>
      <p className={P}>
        Aplicamos cifrado en tránsito (TLS), contraseñas cifradas con Argon2,
        sesiones con rotación de tokens, verificación en dos pasos por correo y
        control de acceso por roles. Ningún sistema es infalible: si ocurriera
        una vulneración significativa, te notificaremos sin demora.
      </p>

      <h2 className={H2}>10. Menores de edad</h2>
      <p className={P}>
        El servicio está dirigido a personas mayores de 18 años con capacidad
        legal para contratar. No recabamos conscientemente datos de menores.
      </p>

      <h2 className={H2}>11. Cambios a este aviso</h2>
      <p className={P}>
        Podemos actualizar este aviso para reflejar cambios legales u operativos.
        La versión vigente estará siempre publicada en esta página con su fecha
        de actualización. Los cambios sustanciales se comunicarán por correo o
        dentro de la aplicación antes de que entren en vigor.
      </p>

      <h2 className={H2}>12. Consentimiento</h2>
      <p className={P}>
        Al crear una cuenta y utilizar {LEGAL.brand} manifiestas que has leído y
        comprendido este aviso de privacidad y otorgas tu consentimiento para el
        tratamiento de tus datos conforme a las finalidades descritas.
      </p>

      <p className="mt-10 text-xs text-muted-foreground">
        Este documento es una versión de trabajo y debe ser revisada por un
        abogado antes de su publicación definitiva.
      </p>
    </main>
  );
}
