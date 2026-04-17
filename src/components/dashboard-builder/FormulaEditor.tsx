// FormulaEditor - Manage and create formulas for dashboard

import React, { useState } from 'react';
import { DashboardFormula, FormulaType } from '@/types/dashboard';
import { FUNCTION_LIBRARY } from '@/lib/formulaEngine/FunctionLibrary';
import { validateFormulaSyntax } from '@/lib/formulaEngine/FormulaParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';

export interface FormulaEditorProps {
  formulas: DashboardFormula[];
  onAddFormula: (formula: DashboardFormula) => void;
  onRemoveFormula: (formulaId: string) => void;
  readOnly?: boolean;
}

interface EditingFormula {
  id: string;
  name: string;
  description: string;
  type: FormulaType;
  expression: string;
  isNew?: boolean;
}

const FormulaEditor: React.FC<FormulaEditorProps> = ({
  formulas,
  onAddFormula,
  onRemoveFormula,
  readOnly = false
}) => {
  const [editingFormula, setEditingFormula] = useState<EditingFormula | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreateFormula = () => {
    setEditingFormula({
      id: `formula_${Date.now()}`,
      name: '',
      description: '',
      type: 'calculation',
      expression: '',
      isNew: true
    });
    setShowNewForm(true);
    setValidationError(null);
  };

  const handleEditFormula = (formula: DashboardFormula) => {
    setEditingFormula({
      id: formula.id,
      name: formula.name,
      description: formula.description,
      type: formula.type,
      expression: formula.expression,
      isNew: false
    });
    setValidationError(null);
  };

  const handleSaveFormula = () => {
    if (!editingFormula) return;

    // Validate
    if (!editingFormula.name.trim()) {
      setValidationError('Formula name is required');
      return;
    }

    if (!editingFormula.expression.trim()) {
      setValidationError('Formula expression is required');
      return;
    }

    // Validate formula syntax
    const syntaxValidation = validateFormulaSyntax(editingFormula.expression);
    if (!syntaxValidation.valid) {
      setValidationError(syntaxValidation.message);
      return;
    }

    const newFormula: DashboardFormula = {
      id: editingFormula.id,
      name: editingFormula.name,
      description: editingFormula.description,
      type: editingFormula.type,
      expression: editingFormula.expression,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onAddFormula(newFormula);
    setEditingFormula(null);
    setShowNewForm(false);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditingFormula(null);
    setShowNewForm(false);
    setValidationError(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Formulas</h3>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateFormula}
            disabled={showNewForm}
            className="h-7 px-2 transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:scale-110 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Formula List */}
      <div className="flex-1 overflow-auto space-y-2">
        {formulas.length === 0 && !showNewForm ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No formulas yet</p>
            <p className="text-xs mt-1">Click + to create your first formula</p>
          </div>
        ) : (
          formulas.map(formula => (
            <div
              key={formula.id}
              className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200/50 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{formula.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{formula.description}</p>
                  <code className="text-xs bg-white p-1.5 rounded mt-2 block font-mono text-gray-600 border border-gray-100 group-hover:border-blue-200 transition-colors">
                    {formula.expression}
                  </code>
                </div>

                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 h-7 w-7 px-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-100/50"
                    onClick={() => onRemoveFormula(formula.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New/Edit Formula Form */}
      {showNewForm && editingFormula && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {editingFormula.isNew ? 'New Formula' : 'Edit Formula'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-900">Name</label>
              <Input
                value={editingFormula.name}
                onChange={(e) => setEditingFormula({
                  ...editingFormula,
                  name: e.target.value
                })}
                placeholder="e.g., Revenue Growth"
                className="text-xs h-8"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-900">Description</label>
              <Input
                value={editingFormula.description}
                onChange={(e) => setEditingFormula({
                  ...editingFormula,
                  description: e.target.value
                })}
                placeholder="What does this formula calculate?"
                className="text-xs h-8"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-900">Type</label>
              <Select
                value={editingFormula.type}
                onValueChange={(type: FormulaType) => setEditingFormula({
                  ...editingFormula,
                  type
                })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calculation">Calculation</SelectItem>
                  <SelectItem value="aggregation">Aggregation</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expression */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-900">Expression</label>
              <Textarea
                value={editingFormula.expression}
                onChange={(e) => {
                  setEditingFormula({
                    ...editingFormula,
                    expression: e.target.value
                  });
                  setValidationError(null);
                }}
                placeholder="e.g., [revenue] - [costs]"
                className="text-xs font-mono h-20 bg-white"
              />

              {/* Function Help */}
              <div className="text-xs text-gray-600 mt-2">
                <p className="font-medium mb-1">Available functions:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(FUNCTION_LIBRARY).slice(0, 8).map(func => (
                    <Badge key={func} variant="secondary" className="text-xs">
                      {func}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-xs">
                    +{Object.keys(FUNCTION_LIBRARY).length - 8}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-600">{validationError}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleSaveFormula}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormulaEditor;
