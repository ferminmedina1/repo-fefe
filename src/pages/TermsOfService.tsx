import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold tracking-tight">Términos y Condiciones de Uso</h1>
          <p className="text-muted-foreground mt-2">Última actualización: 26 de febrero de 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground">
              Al acceder, registrarse o utilizar la plataforma <strong className="text-foreground">Ventify</strong> (en adelante, "la Plataforma"),
              el usuario acepta de forma plena y sin reservas los presentes Términos y Condiciones, así como la{" "}
              <Link to="/privacy" className="text-primary underline underline-offset-4">Política de Privacidad</Link>.
            </p>
            <p className="text-muted-foreground mt-2">
              Si el usuario no está de acuerdo, deberá abstenerse de utilizar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
            <p className="text-muted-foreground mb-2">
              Ventify es una plataforma SaaS de gestión empresarial, que incluye —sin limitarse a— funcionalidades de:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Facturación y documentos comerciales</li>
              <li>Gestión de clientes, productos y stock</li>
              <li>Finanzas, reportes y operaciones</li>
              <li>Integraciones con servicios externos</li>
              <li>Automatizaciones y asistentes inteligentes</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              La Plataforma se ofrece bajo modalidad <strong className="text-foreground">suscripción</strong>, con distintos planes,
              módulos y funcionalidades según el plan contratado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Registro y Cuenta de Usuario</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>El usuario declara que la información brindada es <strong className="text-foreground">veraz, actual y completa</strong>.</li>
              <li>Es responsable de mantener la <strong className="text-foreground">confidencialidad de sus credenciales</strong>.</li>
              <li>Toda actividad realizada desde su cuenta se considera realizada por el usuario.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Ventify no se responsabiliza por accesos no autorizados derivados de negligencia del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Permitido</h2>
            <p className="text-muted-foreground mb-2">El usuario se compromete a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Utilizar la Plataforma únicamente con <strong className="text-foreground">fines lícitos</strong>.</li>
              <li>No realizar ingeniería inversa, scraping, explotación abusiva ni uso fraudulento.</li>
              <li>No utilizar la Plataforma para actividades ilegales, evasión fiscal o falsificación de información.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Ventify se reserva el derecho de <strong className="text-foreground">suspender o cancelar cuentas</strong> que violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Responsabilidad sobre la Información</h2>
            <p className="text-muted-foreground mb-2">El usuario es <strong className="text-foreground">único responsable</strong> de:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>La información cargada en la Plataforma</li>
              <li>Los datos fiscales, contables y comerciales generados</li>
              <li>El cumplimiento de sus obligaciones legales y tributarias</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Ventify actúa como <strong className="text-foreground">herramienta tecnológica</strong> y no brinda asesoramiento
              legal, contable ni impositivo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Integraciones con Terceros</h2>
            <p className="text-muted-foreground mb-2">
              La Plataforma puede integrarse con servicios externos (AFIP, Mercado Libre, Tienda Nube, etc.).
              Ventify <strong className="text-foreground">no controla ni es responsable</strong> por:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Cambios en APIs de terceros</li>
              <li>Fallas, interrupciones o errores externos</li>
              <li>Condiciones legales o técnicas de dichos servicios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Planes, Pagos y Suscripciones</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>El acceso a la Plataforma se rige por el <strong className="text-foreground">plan contratado</strong>.</li>
              <li>Los pagos pueden ser <strong className="text-foreground">mensuales o anuales</strong>, según disponibilidad.</li>
              <li>La falta de pago puede derivar en <strong className="text-foreground">suspensión o cancelación</strong> del servicio.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Ventify puede modificar precios, planes o funcionalidades, notificando con antelación razonable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Prueba Gratuita</h2>
            <p className="text-muted-foreground mb-2">En caso de ofrecerse una prueba gratuita:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Puede estar limitada en tiempo o funcionalidades.</li>
              <li>Al finalizar, el usuario deberá contratar un plan para continuar usando la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disponibilidad del Servicio</h2>
            <p className="text-muted-foreground mb-2">
              Ventify busca garantizar alta disponibilidad, pero <strong className="text-foreground">no garantiza funcionamiento ininterrumpido</strong>.
              Pueden existir:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Mantenimientos programados</li>
              <li>Actualizaciones</li>
              <li>Interrupciones por causas técnicas o de fuerza mayor</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Propiedad Intelectual</h2>
            <p className="text-muted-foreground mb-2">Todos los derechos sobre:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Software, marca y diseño</li>
              <li>Contenido y automatizaciones</li>
              <li>Asistentes inteligentes</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              pertenecen a Ventify o a sus licenciantes. El usuario{" "}
              <strong className="text-foreground">no adquiere ningún derecho de propiedad</strong> por el uso de la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground mb-2">
              En la máxima medida permitida por la ley, Ventify <strong className="text-foreground">no será responsable</strong> por:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Pérdidas económicas</li>
              <li>Daños indirectos o lucro cesante</li>
              <li>Errores derivados del uso incorrecto del sistema</li>
              <li>Decisiones comerciales tomadas por el usuario</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Cancelación del Servicio</h2>
            <p className="text-muted-foreground mb-2">
              El usuario puede cancelar su suscripción en cualquier momento.
              Ventify puede cancelar o suspender cuentas ante:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Incumplimiento de los términos</li>
              <li>Uso fraudulento o abusivo</li>
              <li>Requerimientos legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Modificaciones</h2>
            <p className="text-muted-foreground">
              Ventify puede modificar estos Términos y Condiciones en cualquier momento.
              El uso continuado de la Plataforma implica aceptación de las modificaciones.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Legislación Aplicable y Jurisdicción</h2>
            <p className="text-muted-foreground">
              Estos términos se rigen por las <strong className="text-foreground">leyes de la República Argentina</strong>.
              Cualquier controversia será sometida a los <strong className="text-foreground">tribunales ordinarios de la Ciudad Autónoma de Buenos Aires</strong>,
              renunciando a cualquier otro fuero.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contacto</h2>
            <p className="text-muted-foreground mb-2">Para consultas o soporte:</p>
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
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
