// src/components/allianceMarket/AllianceMarketDrawer.tsx

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Globe,
  Mail,
  Phone,
  Linkedin,
  UserPlus,
  Trash2,
  ExternalLink,
  TrendingUp,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import type { AllianceMarketProfileDTO } from '@/domain/allianceMarket/dtos/allianceMarket';

interface Props {
  profile: AllianceMarketProfileDTO | null;
  open: boolean;
  onClose: () => void;
  onConnect: (profileId: string) => void;
  onDiscard: (profileId: string) => void;
  isConnecting?: boolean;
}

const BREAKDOWN_LABELS: Record<string, { label: string; icon: typeof TrendingUp }> = {
  clientes_compartidos: { label: 'Clientes compartidos', icon: Users },
  mercado_overlap: { label: 'Superposición de mercado', icon: TrendingUp },
  alineacion_objetivos: { label: 'Alineación de objetivos', icon: Target },
  sinergia_operativa: { label: 'Sinergia operativa', icon: Zap },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  suggested: { label: 'Sugerido', className: 'bg-muted text-muted-foreground' },
  contacted: { label: 'Contactado', className: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  in_negotiation: { label: 'En negociación', className: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  active: { label: 'Alianza activa', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  discarded: { label: 'Descartado', className: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' },
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function AllianceMarketDrawer({
  profile,
  open,
  onClose,
  onConnect,
  onDiscard,
  isConnecting,
}: Props) {
  if (!profile) return null;

  const statusConfig = STATUS_LABELS[profile.status] ?? STATUS_LABELS.suggested;
  const breakdown = profile.compatibility_breakdown ?? {};
  const breakdownEntries = Object.entries(breakdown).filter(([, v]) => typeof v === 'number');

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
        {/* Top header con avatar */}
        <div className="p-6 border-b">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
              {getInitials(profile.business_name)}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight">{profile.business_name}</SheetTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{profile.industry}</span>
                {profile.city && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {profile.city}
                      {profile.province ? `, ${profile.province}` : ''}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {profile.profile_type === 'alliance' ? 'Alianza' : 'Cliente'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onConnect(profile.id)}
              disabled={isConnecting}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Iniciar contacto
            </Button>
            <Button
              variant="outline"
              onClick={() => { onDiscard(profile.id); onClose(); }}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Descartar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Descripción */}
          {profile.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Descripción
              </p>
              <p className="text-sm leading-relaxed text-foreground">{profile.description}</p>
            </div>
          )}

          <Separator />

          {/* Métricas clave */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Métricas de oportunidad
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-semibold text-emerald-600">
                  {profile.compatibility_score}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Compatibilidad IA</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-semibold text-amber-600">
                  ${(profile.estimated_value / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile.currency} estimado</p>
              </div>
            </div>
          </div>

          {/* Tipo de relación */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Tipo de relación propuesta
            </p>
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-sm capitalize">{profile.relation_type.replace(/-/g, ' ')}</p>
            </div>
          </div>

          {/* Breakdown de compatibilidad */}
          {breakdownEntries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Análisis de compatibilidad
              </p>
              <div className="space-y-3">
                {breakdownEntries.map(([key, value]) => {
                  const config = BREAKDOWN_LABELS[key];
                  const Icon = config?.icon ?? TrendingUp;
                  const label = config?.label ?? key.replace(/_/g, ' ');
                  const score = value as number;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                        <span className="text-xs font-medium">{score}%</span>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {profile.synergy_tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Áreas de sinergia
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.synergy_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Contacto */}
          {(profile.contact_name ||
            profile.contact_email ||
            profile.contact_phone ||
            profile.contact_linkedin ||
            profile.website) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Información de contacto
              </p>
              <div className="space-y-2">
                {profile.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{profile.contact_name}</span>
                  </div>
                )}
                {profile.contact_email && (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    {profile.contact_email}
                  </a>
                )}
                {profile.contact_phone && (
                  <a
                    href={`tel:${profile.contact_phone}`}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {profile.contact_phone}
                  </a>
                )}
                {profile.contact_linkedin && (
                  <a
                    href={profile.contact_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                  >
                    <Linkedin className="w-3.5 h-3.5 flex-shrink-0" />
                    LinkedIn
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    {profile.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Fecha */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Sugerido el{' '}
            {new Date(profile.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
