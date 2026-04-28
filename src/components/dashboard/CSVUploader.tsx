import { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { useCSVUpload } from '@/hooks/dashboard/useCSVUpload';
import { useCompany } from '@/contexts/CompanyContext';
import { validateCSVFile } from '@/lib/dashboard/csvValidator';

export interface CSVUploaderProps {
  onSuccess?: (inserted: number) => void;
  onClose?: () => void;
}

export const CSVUploader = ({ onSuccess, onClose }: CSVUploaderProps) => {
  const { currentCompany } = useCompany();
  const { parseCSV, uploadSalesData } = useCSVUpload();

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      // ✅ SECURITY: Use centralized validation
      const validation = validateCSVFile(droppedFile);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      handleFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    // ✅ SECURITY: Use centralized validation
    const validation = validateCSVFile(selectedFile);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    if (isMountedRef.current) {
      setFile(selectedFile);
      setResult(null);
    }

    const parsed = await parseCSV(selectedFile);
    // Only update state if component is still mounted
    if (isMountedRef.current && parsed) {
      setPreview(parsed.rows.slice(0, 5)); // Show first 5 rows
    }
  };

  const handleUpload = async () => {
    if (!file || !currentCompany) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    const parsed = await parseCSV(file);

    if (!isMountedRef.current) {
      setLoading(false);
      return;
    }

    if (!parsed) {
      setResult({
        success: false,
        inserted: 0,
        errors: ['Failed to parse CSV file'],
        warnings: [],
      });
      setLoading(false);
      return;
    }

    const uploadResult = await uploadSalesData(currentCompany.id, parsed.rows, parsed.headers);
    
    if (!isMountedRef.current) {
      setLoading(false);
      return;
    }

    setResult(uploadResult);

    if (uploadResult.success) {
      onSuccess?.(uploadResult.inserted);
    }

    setLoading(false);
  };

  const downloadTemplate = () => {
    const csv = 'product_name,quantity,unit_price,cost,customer_name,date,category\n' +
                'Laptop Pro,1,1299.99,780,John Doe,2026-04-01,Electronics\n' +
                'Office Chair,2,199.99,100,Jane Smith,2026-04-02,Furniture\n' +
                'Monitor LG,1,299.99,150,John Doe,2026-04-03,Electronics\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-start sm:items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-4 sm:w-5 h-4 sm:h-5 shrink-0" />
              <span className="truncate">Importar CSV</span>
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 hidden sm:block">Carga datos de ventas en lote</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!result ? (
            <>
              {/* Drop Zone */}
              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                    dragActive
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-700 font-medium mb-2">
                    Arrastra tu archivo CSV aquí
                  </p>
                  <p className="text-gray-500 text-sm mb-4">o haz clic para seleccionar</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium mb-3"
                  >
                    Seleccionar archivo
                  </button>

                  <button
                    onClick={downloadTemplate}
                    className="ml-3 flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Descargar plantilla
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-900">
                      ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {preview.length} filas para importar
                    </p>
                  </div>

                  {/* Preview */}
                  {preview.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 font-medium text-sm text-gray-700">
                        Vista previa ({Math.min(preview.length, 5)} líneas)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              {Object.keys(preview[0] || {}).map(key => (
                                <th
                                  key={key}
                                  className="px-4 py-2 text-left font-medium text-gray-700"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((row, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                {Object.values(row).map((val, j) => (
                                  <td
                                    key={j}
                                    className="px-4 py-2 text-gray-700 max-w-xs truncate"
                                  >
                                    {String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Columns Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Columnas requeridas:</span> product_name,
                      quantity, unit_price
                      <br />
                      <span className="font-medium">Columnas opcionales:</span> customer_name,
                      date, cost, category
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Result */}
              <div
                className={`border rounded-lg p-4 flex gap-3 ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.success
                      ? `✓ ${result.inserted} venta(s) importada(s)`
                      : '✗ Error en la importación'}
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {result.errors.map((err: string, i: number) => (
                        <li key={i} className={result.success ? 'text-green-700' : 'text-red-700'}>
                          • {err}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.warnings.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1 text-amber-700">
                      {result.warnings.slice(0, 3).map((warn: string, i: number) => (
                        <li key={i}>
                          ⚠ {warn}
                        </li>
                      ))}
                      {result.warnings.length > 3 && (
                        <li>... y {result.warnings.length - 3} más</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              {result ? 'Cerrar' : 'Cancelar'}
            </button>

            {!result && file && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar
                  </>
                )}
              </button>
            )}

            {result && !result.success && (
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setPreview([]);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
