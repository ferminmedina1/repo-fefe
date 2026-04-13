import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Política de Privacidad</h1>
          <p className="text-muted-foreground mt-2">Última actualización: 26 de febrero de 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Responsable del Tratamiento</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Ventify</strong> es responsable del tratamiento de los datos personales
              recolectados a través de la Plataforma, en cumplimiento de la{" "}
              <strong className="text-foreground">Ley N° 25.326 de Protección de Datos Personales</strong> de la República Argentina
              y sus normas complementarias.
            </p>
            <p className="text-muted-foreground mt-2">
              Contacto: <a href="mailto:soporte@ventify.app" className="text-primary underline underline-offset-4">soporte@ventify.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Datos que Recolectamos</h2>
            <p className="text-muted-foreground mb-2">Al usar Ventify, recolectamos los siguientes datos:</p>

            <p className="font-medium text-foreground mb-1">Datos de cuenta:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-3">
              <li>Nombre completo y dirección de email</li>
              <li>Contraseña (almacenada con hash, nunca en texto plano)</li>
              <li>País de registro</li>
            </ul>

            <p className="font-medium text-foreground mb-1">Datos de la empresa:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-3">
              <li>Razón social, CUIT/RUT u otro identificador fiscal</li>
              <li>Dirección, teléfono, email comercial</li>
              <li>Datos de configuración (moneda, impuestos, etc.)</li>
            </ul>

            <p className="font-medium text-foreground mb-1">Datos operativos (cargados por el usuario):</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-3">
              <li>Clientes, proveedores, productos, ventas, compras</li>
              <li>Documentos fiscales y comerciales</li>
              <li>Movimientos financieros y contables</li>
            </ul>

            <p className="font-medium text-foreground mb-1">Datos de pago:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-3">
              <li>Últimos 4 dígitos y marca de la tarjeta (nunca el número completo)</li>
              <li>Referencias de métodos de pago tokenizados por Stripe o MercadoPago</li>
              <li>País de facturación</li>
            </ul>

            <p className="font-medium text-foreground mb-1">Datos técnicos:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Logs de errores (anonimizados) para mejora del servicio</li>
              <li>Datos de sesión (token de autenticación)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidad del Tratamiento</h2>
            <p className="text-muted-foreground mb-2">Usamos tus datos para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Proveer y mantener el servicio contratado</li>
              <li>Gestionar tu suscripción y procesar pagos</li>
              <li>Enviarte notificaciones relacionadas al servicio (alertas, facturas, reportes)</li>
              <li>Brindar soporte técnico</li>
              <li>Mejorar la Plataforma mediante análisis de errores y uso</li>
              <li>Cumplir obligaciones legales</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              No utilizamos tus datos para publicidad de terceros ni los vendemos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartición con Terceros</h2>
            <p className="text-muted-foreground mb-3">
              Ventify utiliza proveedores de confianza que pueden acceder a datos en calidad de procesadores:
            </p>

            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">Supabase</p>
                <p className="text-muted-foreground text-xs mt-1">Infraestructura de base de datos y autenticación. Datos alojados en servidores en la nube.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">Stripe</p>
                <p className="text-muted-foreground text-xs mt-1">Procesamiento de pagos para usuarios fuera de Argentina. Ventify nunca almacena datos completos de tarjeta.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">MercadoPago</p>
                <p className="text-muted-foreground text-xs mt-1">Procesamiento de pagos para usuarios en Argentina. Opera bajo sus propios términos y privacidad.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">AFIP (Argentina)</p>
                <p className="text-muted-foreground text-xs mt-1">Transmisión de datos fiscales solo cuando el usuario utiliza la integración de facturación electrónica.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">Resend</p>
                <p className="text-muted-foreground text-xs mt-1">Envío de emails transaccionales (bienvenida, alertas, reportes). Solo procesa dirección de email y contenido del mensaje.</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-medium text-foreground">Sentry</p>
                <p className="text-muted-foreground text-xs mt-1">Monitoreo de errores. Los reportes son anonimizados y no contienen datos sensibles del usuario.</p>
              </div>
            </div>

            <p className="text-muted-foreground mt-3">
              No compartimos datos con terceros salvo los listados arriba o por requerimiento legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Almacenamiento y Seguridad</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Los datos se almacenan en servidores seguros gestionados por Supabase</li>
              <li>Las contraseñas se almacenan con hash (nunca en texto plano)</li>
              <li>Los datos de tarjeta nunca se almacenan directamente — solo tokens generados por Stripe o MercadoPago</li>
              <li>Las comunicaciones se cifran mediante TLS/HTTPS</li>
              <li>El acceso a los datos está protegido por políticas de seguridad por fila (RLS)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Retención de Datos</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Los datos de cuenta y empresa se conservan mientras la suscripción esté activa</li>
              <li>Tras la cancelación, los datos se conservan por <strong className="text-foreground">30 días</strong> para permitir la recuperación, luego pueden eliminarse</li>
              <li>Los datos fiscales pueden conservarse por el período que exija la normativa argentina</li>
              <li>Los datos temporales de signup se eliminan automáticamente a las 24 horas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Derechos del Usuario</h2>
            <p className="text-muted-foreground mb-2">
              En virtud de la Ley 25.326, el usuario tiene derecho a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong className="text-foreground">Acceso:</strong> solicitar qué datos personales tenemos sobre usted</li>
              <li><strong className="text-foreground">Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong className="text-foreground">Cancelación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong className="text-foreground">Oposición:</strong> oponerse al tratamiento de sus datos</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Para ejercer estos derechos, contactar a:{" "}
              <a href="mailto:soporte@ventify.app" className="text-primary underline underline-offset-4">soporte@ventify.app</a>.
              Responderemos en un plazo máximo de <strong className="text-foreground">30 días hábiles</strong>.
            </p>
            <p className="text-muted-foreground mt-2">
              La DNPDP (Dirección Nacional de Protección de Datos Personales) tiene la atribución de atender las
              denuncias y reclamos que se interpongan con relación al incumplimiento de la Ley 25.326.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies y Almacenamiento Local</h2>
            <p className="text-muted-foreground mb-2">Ventify utiliza:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong className="text-foreground">localStorage:</strong> para mantener la sesión activa y preferencias de la interfaz</li>
              <li><strong className="text-foreground">Cookies de sesión:</strong> gestionadas por Supabase para autenticación</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              No utilizamos cookies de seguimiento ni publicidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Menores de Edad</h2>
            <p className="text-muted-foreground">
              La Plataforma está destinada exclusivamente a mayores de 18 años que actúen en representación
              de una empresa o negocio. No recolectamos datos de menores de edad de forma consciente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Modificaciones</h2>
            <p className="text-muted-foreground">
              Ventify puede actualizar esta Política de Privacidad. Notificaremos cambios significativos
              por email o mediante aviso en la Plataforma. El uso continuado implica aceptación de la
              política actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contacto</h2>
            <ul className="list-none text-muted-foreground space-y-1 ml-2">
              <li>Email: <a href="mailto:soporte@ventify.app" className="text-primary underline underline-offset-4">soporte@ventify.app</a></li>
              <li>WhatsApp Business</li>
              <li>Horario: Lunes a Viernes de 9 a 18 hs (Argentina)</li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>
            © 2026 Ventify. Todos los derechos reservados.{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Términos y Condiciones
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
