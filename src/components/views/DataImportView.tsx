import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  Building2,
  Package,
  Warehouse,
  Boxes,
  Truck,
  ShoppingCart,
} from 'lucide-react';
import { api } from '../../api';

interface DataImportViewProps {
  onNavigate: (viewId: string) => void;
}

export const DataImportView: React.FC<DataImportViewProps> = ({ onNavigate }) => {
  const [entityType, setEntityType] = useState<
    'suppliers' | 'products' | 'warehouses' | 'inventory' | 'shipments' | 'orders'
  >('suppliers');

  const [rawText, setRawText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Template Samples
  const TEMPLATES: Record<string, { csv: string; json: any[] }> = {
    suppliers: {
      csv: `name,contactPerson,email,phone,location,reliabilityScore,status
Apex Components Ltd,John Chang,apex@supply.com,+886-2-5555-0101,Taipei Taiwan,92,Active
Nordic Precision AS,Astrid Lind,nordic@parts.no,+47-22-123456,Oslo Norway,88,Active`,
      json: [
        {
          name: 'Apex Components Ltd',
          contactPerson: 'John Chang',
          email: 'apex@supply.com',
          phone: '+886-2-5555-0101',
          location: 'Taipei Taiwan',
          reliabilityScore: 92,
          status: 'Active',
        },
      ],
    },
    products: {
      csv: `name,category,description,unitCost,status
Optical Laser Diode 850nm,Optics & Vision,High power VCSEL diode,42.50,Active
Brushless ESC Controller 60A,Power Electronics,Electronic speed controller,78.00,Active`,
      json: [
        {
          name: 'Optical Laser Diode 850nm',
          category: 'Optics & Vision',
          description: 'High power VCSEL diode',
          unitCost: 42.5,
          status: 'Active',
        },
      ],
    },
    warehouses: {
      csv: `name,location,capacity,manager,status
Dubai JAFZA Hub,Dubai UAE,16000,Rashid Al-Maktoum,Operational
Hamburg Inland Terminal,Hamburg Germany,22000,Hans Gruber,Operational`,
      json: [
        {
          name: 'Dubai JAFZA Hub',
          location: 'Dubai UAE',
          capacity: 16000,
          manager: 'Rashid Al-Maktoum',
          status: 'Operational',
        },
      ],
    },
    inventory: {
      csv: `productName,warehouseName,availableStock,reservedStock,minimumStock
Microcontroller MC-900 Core,Chennai Central Logistics Hub,50,15,40
Lithium Iron Battery Pack 48V,Mumbai Maritime Logistics Park,90,20,30`,
      json: [
        {
          productName: 'Microcontroller MC-900 Core',
          warehouseName: 'Chennai Central Logistics Hub',
          availableStock: 50,
          reservedStock: 15,
          minimumStock: 40,
        },
      ],
    },
    shipments: {
      csv: `supplierName,productName,warehouseName,quantity,carrierName,expectedDeliveryDate,status
Foxconn Microelectronics Ltd,Microcontroller MC-900 Core,Chennai Central Logistics Hub,100,DHL Express Air,2026-11-12,In Transit`,
      json: [
        {
          supplierName: 'Foxconn Microelectronics Ltd',
          productName: 'Microcontroller MC-900 Core',
          warehouseName: 'Chennai Central Logistics Hub',
          quantity: 100,
          carrierName: 'DHL Express Air',
          expectedDeliveryDate: '2026-11-12',
          status: 'In Transit',
        },
      ],
    },
    orders: {
      csv: `customerName,customerContact,productName,warehouseName,requiredQuantity,deliveryDeadline,priority
Bharat Dynamics Ltd,orders@bharatdynamics.in,Microcontroller MC-900 Core,Chennai Central Logistics Hub,25,2026-11-06,Critical`,
      json: [
        {
          customerName: 'Bharat Dynamics Ltd',
          customerContact: 'orders@bharatdynamics.in',
          productName: 'Microcontroller MC-900 Core',
          warehouseName: 'Chennai Central Logistics Hub',
          requiredQuantity: 25,
          deliveryDeadline: '2026-11-06',
          priority: 'Critical',
        },
      ],
    },
  };

  const loadSample = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      setRawText(TEMPLATES[entityType].csv);
      parseCSV(TEMPLATES[entityType].csv);
    } else {
      const formatted = JSON.stringify(TEMPLATES[entityType].json, null, 2);
      setRawText(formatted);
      parseJSON(formatted);
    }
    setImportResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (file.name.endsWith('.json') || content.trim().startsWith('[')) {
        parseJSON(content);
      } else {
        parseCSV(content);
      }
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const parseJSON = (text: string) => {
    setValidationErrors([]);
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setValidationErrors(['JSON root must be an array of records.']);
        setParsedRecords([]);
        return;
      }
      setParsedRecords(parsed);
    } catch (err: any) {
      setValidationErrors([`JSON Syntax Error: ${err.message}`]);
      setParsedRecords([]);
    }
  };

  const parseCSV = (text: string) => {
    setValidationErrors([]);
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setValidationErrors(['CSV must have at least a header row and one data row.']);
      setParsedRecords([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = vals[idx] !== undefined ? vals[idx] : '';
      });
      records.push(obj);
    }

    setParsedRecords(records);
  };

  const handleExecuteImport = async () => {
    if (parsedRecords.length === 0) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await api.bulkImport(entityType, parsedRecords);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <UploadCloud className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Bulk Data Import Engine</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                CSV & JSON Ingestion
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Import suppliers, products, warehouses, inventory, shipments, and customer orders. Full column validation, duplicate detection, and import audit logging.
            </p>
          </div>
        </div>
      </div>

      {/* Target Entity Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { id: 'suppliers', label: 'Suppliers', icon: Building2 },
          { id: 'products', label: 'Products', icon: Package },
          { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
          { id: 'inventory', label: 'Inventory', icon: Boxes },
          { id: 'shipments', label: 'Shipments', icon: Truck },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = entityType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setEntityType(tab.id as any);
                setRawText('');
                setParsedRecords([]);
                setImportResult(null);
                setValidationErrors([]);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload & Template Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm">
              <UploadCloud className="w-4 h-4" />
              <span>Choose CSV or JSON File</span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <span className="text-xs text-slate-500">or load sample template:</span>
            <button
              onClick={() => loadSample('csv')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sample CSV</span>
            </button>
            <button
              onClick={() => loadSample('json')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Sample JSON</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Selected target: <strong className="text-cyan-400 capitalize">{entityType}</strong>
          </div>
        </div>

        {/* Text Area Input */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Raw CSV or JSON Text (You can paste directly here):
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (e.target.value.trim().startsWith('[')) {
                parseJSON(e.target.value);
              } else {
                parseCSV(e.target.value);
              }
              setImportResult(null);
            }}
            placeholder="Paste CSV rows with headers or JSON array..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs space-y-1">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview Table */}
        {parsedRecords.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">
                  Validated Data Preview ({parsedRecords.length} records ready to import)
                </h3>
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isImporting ? 'Ingesting...' : 'Confirm & Commit Import to Database'}</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    {Object.keys(parsedRecords[0] || {}).map((key) => (
                      <th key={key} className="px-3 py-2 font-mono">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 bg-slate-900/60 font-mono text-[11px]">
                  {parsedRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      {Object.values(rec).map((val: any, vIdx) => (
                        <td key={vIdx} className="px-3 py-2 truncate max-w-xs">
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

        {/* Import Results Report */}
        {importResult && (
          <div className="mt-4 p-4 rounded-xl border bg-slate-950 border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Import Execution Report</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Total Processed</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{importResult.total}</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Successfully Saved</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                  {importResult.successCount}
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Duplicates Skipped</span>
                <span className="font-bold text-amber-400 text-sm mt-0.5 block">
                  {importResult.duplicateCount}
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Rejected Records</span>
                <span className="font-bold text-rose-400 text-sm mt-0.5 block">
                  {importResult.rejectedCount}
                </span>
              </div>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-[11px] font-semibold text-rose-400">Rejection Details:</p>
                {importResult.errors.map((e: any, i: number) => (
                  <p key={i} className="text-[11px] text-slate-400 font-mono">
                    Row {e.row}: {e.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
