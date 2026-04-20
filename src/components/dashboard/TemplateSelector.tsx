'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DASHBOARD_TEMPLATES, DashboardTemplate } from '@/lib/dashboard/templates';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { DASHBOARD_DESIGN } from '@/lib/dashboard/design-tokens';

interface TemplateSelectorProps {
  onSelectTemplate: (template: DashboardTemplate) => void;
  onCancel: () => void;
}

export function TemplateSelector({ onSelectTemplate, onCancel }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Todas', emoji: '📊' },
    { id: 'saas', label: 'SaaS', emoji: '🚀' },
    { id: 'ecommerce', label: 'Ecommerce', emoji: '🛍️' },
    { id: 'inventory', label: 'Inventario', emoji: '📦' },
    { id: 'crm', label: 'CRM', emoji: '👥' },
    { id: 'finance', label: 'Finanzas', emoji: '💰' },
  ];

  const filtered = DASHBOARD_TEMPLATES
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        {/* Header */}
        <div className="space-y-6 mb-12">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="group hover:bg-muted/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Volver
          </Button>

          {/* Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className={`${DASHBOARD_DESIGN.typography.heading} text-foreground`}>
                Elige tu punto de partida
              </h1>
            </div>
            <p className={`${DASHBOARD_DESIGN.typography.caption} max-w-2xl`}>
              Selecciona un template y personalizalo según tu negocio. Siempre podés cambiar después.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`
          relative group
          border border-border/50 rounded-lg
          bg-card hover:border-border/80 ${DASHBOARD_DESIGN.transitions.base}
          p-3 flex items-center
        `}>
          <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              flex-1 bg-transparent outline-none
              text-foreground placeholder:text-muted-foreground
              ${DASHBOARD_DESIGN.typography.body}
            `}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="space-y-3">
          <p className={`${DASHBOARD_DESIGN.typography.label}`}>
            Categorías
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium ${DASHBOARD_DESIGN.transitions.base}
                  flex items-center gap-2
                  ${selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'
                    : 'bg-muted text-foreground hover:bg-muted/80 border border-border/50'
                  }
                `}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div>
          <p className={`${DASHBOARD_DESIGN.typography.label} mb-4`}>
            {filtered.length} templates disponibles
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onSelect={() => onSelectTemplate(template)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className={`${DASHBOARD_DESIGN.typography.caption}`}>
                No encontramos templates que coincidan con tu búsqueda.
              </p>
              <Button 
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({ 
  template, 
  onSelect 
}: { 
  template: DashboardTemplate; 
  onSelect: () => void;
}) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const colorMap = DASHBOARD_DESIGN.colors[template.category];

  return (
    <Card 
      className={`
        group overflow-hidden cursor-pointer
        border border-border/50 hover:border-border
        bg-card
        hover:shadow-xl ${DASHBOARD_DESIGN.transitions.base}
        flex flex-col h-full
      `}
      onClick={onSelect}
    >
      {/* Image Container with overlay */}
      <div className={`relative h-48 bg-gradient-to-br ${colorMap.bg} overflow-hidden flex-shrink-0`}>
        <img
          src={template.preview}
          alt={template.name}
          onLoad={() => setImageLoaded(true)}
          className={`
            w-full h-full object-cover
            group-hover:scale-105 ${DASHBOARD_DESIGN.transitions.slow}
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
        
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
        )}

        {/* Hover Overlay */}
        <div className={`
          absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent
          opacity-0 group-hover:opacity-100 ${DASHBOARD_DESIGN.transitions.fast}
          flex items-end p-4
        `}>
          <Button 
            size="sm"
            className="w-full text-xs font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Usar este template
          </Button>
        </div>

        {/* Badge en esquina */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-primary/90 backdrop-blur-sm text-xs">
            {template.widgets.length} widgets
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow space-y-3">
        <div>
          <h3 className={`${DASHBOARD_DESIGN.typography.subheading} text-foreground mb-1`}>
            {template.name}
          </h3>
          <p className={`${DASHBOARD_DESIGN.typography.caption} line-clamp-2`}>
            {template.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 2).map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs font-medium opacity-70 hover:opacity-100"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-3 border-t border-border/30">
          Incluye {template.widgets.length} widgets listos para usar
        </div>
      </div>
    </Card>
  );
}
