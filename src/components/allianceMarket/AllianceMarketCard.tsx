// src/components/allianceMarket/AllianceMarketCard.tsx

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MapPin,
  Globe,
  MoreVertical,
  UserPlus,
  Eye,
  Trash2,
  Flame,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import type { AllianceMarketProfileDTO } from '@/domain/allianceMarket/dtos/allianceMarket';

interface Props {
  profile: AllianceMarketProfileDTO;
  onOpen: (profile: AllianceMarketProfileDTO) => void;
  onConnect: (profileId: string) => void;
  onDiscard: (profileId: string) => void;
  isConnecting?: boolean;
}

const INDUSTRY_COLORS: Record<string, string> = {
  Logística: 'bg-blue-500',
  AgTech: 'bg-emerald-500',
  Agro: 'bg-lime-600',
  Salud: 'bg-violet-500',
  Gastronomía: 'bg-amber-500',
  Finanzas: 'bg-cyan-500',
  Retail: 'bg-pink-500',
  Construcción: 'bg-orange-500',
  Educación: 'bg-indigo-500',
  Turismo: 'bg-teal-500',
  Tecnología: 'bg-sky-500',
};

function getIndustryColor(industry: string): string {
  return INDUSTRY_COLORS[industry] ?? 'bg-slate-500';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function BadgeIcon({ badge }: { badge: AllianceMarketProfileDTO['badge'] }) {
  if (!badge) return null;

  const config = {
    hot: { icon: Flame, label: 'Hot', className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
    new: { icon: Sparkles, label: 'Nuevo', className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
    verified: { icon: BadgeCheck, label: 'Verificado', className: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
  };

  const { icon: Icon, label, className } = config[badge];

  return (
    <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 gap-1 ${className}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </Badge>
  );
}

function CompatibilityBar({ score }: { score: number }) {
  const color =
    score >= 90
      ? 'text-emerald-600'
      : score >= 75
      ? 'text-amber-600'
      : 'text-slate-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Compatibilidad</span>
        <span className={`text-xs font-medium ${color}`}>{score}%</span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  );
}

export const AllianceMarketCard = memo(function AllianceMarketCard({
  profile,
  onOpen,
  onConnect,
  onDiscard,
  isConnecting,
}: Props) {
  const initials = getInitials(profile.business_name);
  const colorClass = getIndustryColor(profile.industry);

  return (
    <div className="relative">
      <style>{`
        @keyframes aiFloat {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-10px) rotateY(1deg); }
        }
        @keyframes aiGlowPulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 
                        0 0 40px rgba(139, 92, 246, 0.3),
                        inset 0 0 20px rgba(59, 130, 246, 0.1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 
                        0 0 60px rgba(139, 92, 246, 0.5),
                        inset 0 0 30px rgba(59, 130, 246, 0.2);
          }
        }
        @keyframes cardHover {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2px); }
        }
        .ai-comment-bubble {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.92) 0%, rgba(139, 92, 246, 0.92) 100%);
          color: white;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 500;
          max-width: 220px;
          z-index: 1000;
          margin-bottom: 12px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          opacity: 0;
          pointer-events: none;
          animation: aiFloat 3s ease-in-out infinite, aiGlowPulse 4s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 
                      0 0 40px rgba(139, 92, 246, 0.3),
                      inset 0 0 20px rgba(59, 130, 246, 0.1);
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: opacity 0.4s ease-out;
        }
        .ai-comment-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid rgba(59, 130, 246, 0.92);
          filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3));
        }
        .alliance-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .alliance-card:hover {
          animation: cardHover 0.3s ease-out forwards;
        }
        .alliance-card:hover .ai-comment-bubble {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      
      <div className="alliance-card bg-card border border-border rounded-xl p-4 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-3">
        {/* AI Comment Bubble */}
        {profile.ai_comment && (
          <div className="ai-comment-bubble">
            💭 {profile.ai_comment}
          </div>
        )}
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.business_name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${colorClass}`}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="text-sm font-medium leading-tight truncate cursor-pointer hover:text-emerald-600 transition-colors"
              onClick={() => onOpen(profile)}
            >
              {profile.business_name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              {profile.city && (
                <>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{profile.city}</span>
                  <span className="mx-0.5">·</span>
                </>
              )}
              {profile.industry}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <BadgeIcon badge={profile.badge} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onOpen(profile)}>
                <Eye className="w-3.5 h-3.5 mr-2" />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onConnect(profile.id)}>
                <UserPlus className="w-3.5 h-3.5 mr-2" />
                Contactar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDiscard(profile.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Descartar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tipo de relación */}
      <div className="bg-muted/50 rounded-lg px-3 py-2">
        <p className="text-xs text-muted-foreground mb-0.5">Tipo de relación</p>
        <p className="text-sm capitalize">{profile.relation_type.replace(/-/g, ' ')}</p>
      </div>

      {/* Compatibilidad */}
      <CompatibilityBar score={profile.compatibility_score} />

      {/* Valor estimado */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Valor estimado</span>
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          ${profile.estimated_value.toLocaleString('es-AR')} {profile.currency}
        </span>
      </div>

      {/* Tags */}
      {profile.synergy_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.synergy_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {profile.synergy_tags.length > 3 && (
            <span className="text-xs text-muted-foreground px-1">
              +{profile.synergy_tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onOpen(profile)}
        >
          <Eye className="w-3 h-3 mr-1.5" />
          Ver perfil
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => onConnect(profile.id)}
          disabled={isConnecting}
        >
          <UserPlus className="w-3 h-3 mr-1.5" />
          Conectar
        </Button>
      </div>
      </div>
    </div>
  );
});
