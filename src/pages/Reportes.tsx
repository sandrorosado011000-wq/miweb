import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Filter, FileSpreadsheet, File as FileIcon } from 'lucide-react';
import { Equipo } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reportes() {
  const { token } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/equipos', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setEquipos(data);
        setLoading(false);
      });
  }, [token]);

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.text('Reporte General de Inventario - COINREFRI', 14, 15);
    doc.autoTable({
      startY: 20,
      head: [['Código', 'Hostname', 'Tipo', 'Marca', 'Sede', 'Estado']],
      body: equipos.map(e => [e.code, e.hostname, e.type, e.brand, e.sede_name, e.status]),
    });
    doc.save('inventario-coinrefri.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(equipos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario-coinrefri.xlsx");
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Generar Reportes</h4>
              <p className="text-sm text-slate-500">Exporta la información del sistema en diferentes formatos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={exportPDF}
              className="flex items-center justify-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group"
            >
              <FileIcon className="text-red-500 group-hover:scale-110 transition-transform" size={24} />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">Exportar PDF</p>
                <p className="text-xs text-slate-500">Documento formal</p>
              </div>
            </button>
            <button 
              onClick={exportExcel}
              className="flex items-center justify-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group"
            >
              <FileSpreadsheet className="text-emerald-500 group-hover:scale-110 transition-transform" size={24} />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">Exportar Excel</p>
                <p className="text-xs text-slate-500">Datos editables</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Filter size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Filtros de Reporte</h4>
              <p className="text-sm text-slate-500">Personaliza la información antes de exportar.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Por Sede</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <option>Todas las sedes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Por Estado</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <option>Todos los estados</option>
                </select>
              </div>
            </div>
            <button className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
