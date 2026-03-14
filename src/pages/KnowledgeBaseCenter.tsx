// ============================================================
// Knowledge Base Page
// ============================================================

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, ThumbsUp, Eye, Clock, ChevronRight } from 'lucide-react';
import { KB_ARTICLES } from '@/lib/kb/data';
import { KB_CATEGORIES, KBCategory } from '@/lib/kb/types';

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KBCategory | 'all'>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  // Filtrar artículos
  const filteredArticles = useMemo(() => {
    let filtered = KB_ARTICLES;

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const selectedArticleData = selectedArticle
    ? KB_ARTICLES.find(a => a.id === selectedArticle)
    : null;

  // Contar artículos por categoría
  const categoryArticleCounts = Object.entries(KB_CATEGORIES).reduce(
    (acc, [key]) => ({
      ...acc,
      [key]: KB_ARTICLES.filter(a => a.category === key).length,
    }),
    {} as Record<KBCategory, number>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Centro de Ayuda</h1>
            <p className="text-muted-foreground">Documentación y preguntas frecuentes</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedArticleData ? (
              <>
                {/* Search Bar */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Busca un artículo, pregunta o tema..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Articles List */}
                <div className="space-y-3">
                  {filteredArticles.length === 0 ? (
                    <Card className="shadow-soft">
                      <CardContent className="pt-12 pb-12 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                          No se encontraron artículos. Intenta con otra búsqueda.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredArticles.map(article => (
                      <Card
                        key={article.id}
                        className="shadow-soft cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                        onClick={() => setSelectedArticle(article.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary">
                                {article.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                {article.description}
                              </p>
                              <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  {article.views} visualizaciones
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ThumbsUp className="h-3 w-3" />
                                  {article.helpful} útiles
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {article.readTime} min
                                </div>
                                {article.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              // Article View
              <div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedArticle(null)}
                  className="mb-6"
                >
                  ← Volver
                </Button>
                <Card className="shadow-soft">
                  <CardHeader>
                    <div className="space-y-3">
                      <h1 className="text-3xl font-bold text-foreground">
                        {selectedArticleData.title}
                      </h1>
                      <div className="flex flex-wrap gap-2">
                        {selectedArticleData.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedArticleData.readTime} min de lectura
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {selectedArticleData.views} visualizaciones
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {selectedArticleData.helpful} personas lo encontraron útil
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose prose-invert max-w-none">
                      {selectedArticleData.content.split('\n\n').map((paragraph, idx) => (
                        <div key={idx} className="space-y-2">
                          {paragraph.split('\n').map((line, lineIdx) => {
                            if (line.startsWith('**') && line.endsWith(':**')) {
                              return (
                                <h3 key={lineIdx} className="font-semibold text-foreground mt-4 mb-2">
                                  {line.replace(/\*\*/g, '')}
                                </h3>
                              );
                            }
                            if (line.startsWith('- ')) {
                              return (
                                <div key={lineIdx} className="flex gap-3 text-muted-foreground">
                                  <span className="text-primary">•</span>
                                  <span>{line.substring(2)}</span>
                                </div>
                              );
                            }
                            if (line.startsWith('1. ') || line.match(/^\d+\./)) {
                              return (
                                <div key={lineIdx} className="flex gap-3 text-muted-foreground">
                                  <span className="font-semibold text-primary">
                                    {line.match(/^\d+/)?.[0]}
                                  </span>
                                  <span>{line.replace(/^\d+\.\s/, '')}</span>
                                </div>
                              );
                            }
                            if (line.trim()) {
                              return (
                                <p key={lineIdx} className="text-muted-foreground leading-relaxed">
                                  {line}
                                </p>
                              );
                            }
                            return null;
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Helpful Section */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">¿Te fue útil este artículo?</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <ThumbsUp className="h-4 w-4" />
                          Sí
                        </Button>
                        <Button variant="outline" size="sm">
                          No
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar - Categories */}
          {!selectedArticleData && (
            <div className="lg:col-span-1">
              <Card className="shadow-soft sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base">Categorías</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                  >
                    Todos ({KB_ARTICLES.length})
                  </Button>
                  {Object.entries(KB_CATEGORIES).map(([key, category]) => (
                    <Button
                      key={key}
                      variant={selectedCategory === key ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedCategory(key as KBCategory);
                        setSearchQuery('');
                      }}
                    >
                      <span className="truncate">
                        {category.label} ({categoryArticleCounts[key as KBCategory]})
                      </span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Popular Articles */}
              <Card className="shadow-soft mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Populares</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {KB_ARTICLES.sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map(article => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article.id)}
                        className="w-full text-left text-sm hover:text-primary transition-colors group"
                      >
                        <p className="font-medium group-hover:underline line-clamp-2">
                          {article.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {article.views} vistas
                        </p>
                      </button>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
