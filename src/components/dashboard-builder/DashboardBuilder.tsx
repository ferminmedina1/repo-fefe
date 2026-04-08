// DashboardBuilder - Main editor component for dashboard customization

import React, { useState, useCallback, useEffect } from 'react';
import { DashboardConfig, DashboardWidget, DashboardFormula } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardCanvas from './DashboardCanvas';
import PropertyPanel from './PropertyPanel';
import FormulaEditor from './FormulaEditor';
import WidgetLibrary from './WidgetLibrary';

import { Plus, Save, Undo2, Redo2, Grid3x3, Settings, Layers } from 'lucide-react';

export interface DashboardBuilderProps {
  dashboardId: string;
  initialConfig?: DashboardConfig;
  onSave?: (config: DashboardConfig) => Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
}

interface EditorState {
  config: DashboardConfig;
  selectedWidgetId: string | null;
  selectedFormulas: Map<string, DashboardFormula>;
  history: DashboardConfig[];
  historyIndex: number;
  isSaving: boolean;
  error: string | null;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  initialConfig,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const defaultConfig: DashboardConfig = {
    id: dashboardId,
    name: 'New Dashboard',
    description: '',
    company_id: '',
    widgets: [],
    layout: {
      columns: 12,
      gap: 4,
      padding: 4
    },
    theme: {
      primary: '#3b82f6',
      accent: '#10b981',
      background: '#f9fafb',
      border: '#e5e7eb'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  };

  const [state, setState] = useState<EditorState>({
    config: initialConfig || defaultConfig,
    selectedWidgetId: null,
    selectedFormulas: new Map(),
    history: [initialConfig || defaultConfig],
    historyIndex: 0,
    isSaving: false,
    error: null
  });

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  // Add widget
  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
    setState(prev => {
      const newWidget: DashboardWidget = {
        ...widget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const newConfig = {
        ...prev.config,
        widgets: [...prev.config.widgets, newWidget],
        updated_at: new Date().toISOString()
      };

      return {
        ...prev,
        config: newConfig,
        history: [...prev.history.slice(0, prev.historyIndex + 1), newConfig],
        historyIndex: prev.historyIndex + 1
      };
    });
  }, []);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setState(prev => {
      const newConfig = {
        ...prev.config,
        widgets: prev.config.widgets.filter(w => w.id !== widgetId),
        updated_at: new Date().toISOString()
      };

      return {
        ...prev,
        config: newConfig,
        selectedWidgetId: prev.selectedWidgetId === widgetId ? null : prev.selectedWidgetId,
        history: [...prev.history.slice(0, prev.historyIndex + 1), newConfig],
        historyIndex: prev.historyIndex + 1
      };
    });
  }, []);

  // Update widget
  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setState(prev => {
      const newConfig = {
        ...prev.config,
        widgets: prev.config.widgets.map(w =>
          w.id === widgetId ? { ...w, ...updates } : w
        ),
        updated_at: new Date().toISOString()
      };

      return {
        ...prev,
        config: newConfig,
        history: [...prev.history.slice(0, prev.historyIndex + 1), newConfig],
        historyIndex: prev.historyIndex + 1
      };
    });
  }, []);

  // Select widget
  const selectWidget = useCallback((widgetId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedWidgetId: widgetId
    }));
  }, []);

  // Add formula
  const addFormula = useCallback((formula: DashboardFormula) => {
    setState(prev => {
      const newFormulas = new Map(prev.selectedFormulas);
      newFormulas.set(formula.id, formula);

      return {
        ...prev,
        selectedFormulas: newFormulas
      };
    });
  }, []);

  // Remove formula
  const removeFormula = useCallback((formulaId: string) => {
    setState(prev => {
      const newFormulas = new Map(prev.selectedFormulas);
      newFormulas.delete(formulaId);

      return {
        ...prev,
        selectedFormulas: newFormulas
      };
    });
  }, []);

  // Update dashboard config
  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setState(prev => {
      const newConfig = {
        ...prev.config,
        ...updates,
        updated_at: new Date().toISOString()
      };

      return {
        ...prev,
        config: newConfig,
        history: [...prev.history.slice(0, prev.historyIndex + 1), newConfig],
        historyIndex: prev.historyIndex + 1
      };
    });
  }, []);

  // Undo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;

      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        config: prev.history[newIndex],
        historyIndex: newIndex
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;

      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        config: prev.history[newIndex],
        historyIndex: newIndex
      };
    });
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(state.config);
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save dashboard'
      }));
    }
  }, [state.config, onSave]);

  const selectedWidget = state.config.widgets.find(w => w.id === state.selectedWidgetId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-gray-200/50 p-4 flex items-center justify-between backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <div className="animate-in fade-in duration-500">
              <h2 className="text-lg font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {state.config.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{state.config.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg border border-gray-200/50 transition-all duration-300 hover:shadow-md hover:border-gray-300/70">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={state.historyIndex <= 0 || readOnly}
                className="h-7 w-7 px-0 transition-all duration-200 hover:bg-white/80 hover:scale-110 active:scale-95 disabled:opacity-40"
              >
                <Undo2 className="w-4 h-4" />
              </Button>

              <div className="w-px h-4 bg-gradient-to-b from-gray-300 to-gray-200" />

              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={state.historyIndex >= state.history.length - 1 || readOnly}
                className="h-7 w-7 px-0 transition-all duration-200 hover:bg-white/80 hover:scale-110 active:scale-95 disabled:opacity-40"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
              disabled={readOnly}
              className="transition-all duration-300 hover:shadow-lg hover:shadow-blue-400/20 hover:border-blue-300 hover:scale-105 active:scale-95 group font-medium"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Add Widget
            </Button>

            {state.error && (
              <div className="text-red-600 text-sm animate-in fade-in duration-300 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200/70 shadow-sm">{state.error}</div>
            )}

            {onSave && (
              <Button
                onClick={handleSave}
                disabled={state.isSaving || readOnly}
                className="transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 text-white font-medium"
              >
                <Save className={`w-4 h-4 mr-2 ${state.isSaving ? 'animate-spin' : ''}`} />
                {state.isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}

            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="transition-all duration-300 hover:bg-gray-100 hover:border-gray-400 hover:scale-105 active:scale-95 font-medium"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Canvas */}
          <div className="flex-1 overflow-auto">
            <DashboardCanvas
              config={state.config}
              selectedWidgetId={state.selectedWidgetId}
              onSelectWidget={selectWidget}
              onUpdateWidget={updateWidget}
              onRemoveWidget={removeWidget}
              readOnly={readOnly}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-96 bg-white border-l border-gray-200 overflow-auto flex flex-col">
            {showWidgetLibrary ? (
              <WidgetLibrary
                onSelectWidget={(widget) => {
                  addWidget(widget);
                  setShowWidgetLibrary(false);
                }}
              />
            ) : selectedWidget ? (
              <PropertyPanel
                widget={selectedWidget}
                allWidgets={state.config.widgets}
                onUpdate={(updates) => updateWidget(selectedWidget.id, updates)}
                onRemove={() => removeWidget(selectedWidget.id)}
                readOnly={readOnly}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                <Grid3x3 className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-center text-sm">
                  Select a widget to edit its properties
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formula Library (Expandable) */}
      <div className="hidden lg:flex lg:w-80 bg-white border-l border-gray-200 flex-col">
        <div className="border-b border-gray-200 p-4 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <h3 className="font-semibold text-gray-900">Formulas</h3>
        </div>

        <div className="flex-1 overflow-auto">
          <FormulaEditor
            formulas={Array.from(state.selectedFormulas.values())}
            onAddFormula={addFormula}
            onRemoveFormula={removeFormula}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardBuilder;
