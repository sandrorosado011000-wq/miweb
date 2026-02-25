import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import * as XLSX from 'xlsx';
import { Equipo, Sede, Area } from '../types';

export default function Equipos() {
  const { token, user } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Equipo>>({
    status: 'Activo',
    type: 'PC'
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    const [eRes, sRes, aRes] = await Promise.all([
      fetch('/api/equipos', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/sedes', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/areas', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    setEquipos(await eRes.json());
    setSedes(await sRes.json());
    setAreas(await aRes.json());
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEquipo ? 'PUT' : 'POST';
    const url = editingEquipo ? `/api/equipos/${editingEquipo.id}` : '/api/equipos';

    const res = await fetch(url, {
      method,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowModal(false);
      setEditingEquipo(null);
      setFormData({ status: 'Activo', type: 'PC' });
      fetchData();
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      });

      if (res.ok) {
        alert('Importación exitosa');
        fetchData();
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredEquipos = equipos.filter(e => 
    e.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por código, hostname, serie o nombre..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {user?.role !== 'read' && (
            <>
              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                Importar Excel
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
              </label>
              <button 
                onClick={() => {
                  setEditingEquipo(null);
                  setFormData({ status: 'Activo', type: 'PC' });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm shadow-emerald-200"
              >
                <Plus size={18} />
                Nuevo Equipo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID / Código</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Equipo / Serie</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación / Área</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipos.map((equipo) => (
                <tr key={equipo.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-400 font-mono">#{equipo.id}</div>
                    <div className="font-semibold text-slate-900">{equipo.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{equipo.hostname || 'N/A'}</div>
                    <div className="text-xs text-slate-500 font-mono">{equipo.serial || 'S/N'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{equipo.first_name} {equipo.last_name}</div>
                    <div className="text-xs text-slate-400">{equipo.account_type || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{equipo.location_type}</div>
                    <div className="text-xs text-slate-500">{equipo.area_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      equipo.status === 'Activo' ? "bg-emerald-100 text-emerald-700" :
                      equipo.status === 'Mantenimiento' ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {equipo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye size={16} />
                      </button>
                      {user?.role !== 'read' && (
                        <button 
                          onClick={() => {
                            setEditingEquipo(equipo);
                            setFormData(equipo);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEquipos.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500">
            No se encontraron equipos que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">
                {editingEquipo ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Section 1: Identificación */}
                <div className="md:col-span-4 border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Identificación y Usuario</h4>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Código de Activo *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.code || ''}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de Equipo (Hostname)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-mono text-sm"
                    value={formData.hostname || ''}
                    onChange={e => setFormData({...formData, hostname: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Serie</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.serial || ''}
                    onChange={e => setFormData({...formData, serial: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Ubicación</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.location_type || ''}
                    onChange={e => setFormData({...formData, location_type: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.first_name || ''}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Apellido</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.last_name || ''}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.area_id || ''}
                    onChange={e => setFormData({...formData, area_id: Number(e.target.value)})}
                  >
                    <option value="">Seleccionar Área...</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.sede_name} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Cuenta</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.account_type || ''}
                    onChange={e => setFormData({...formData, account_type: e.target.value})}
                  />
                </div>

                {/* Section 2: Hardware */}
                <div className="md:col-span-4 border-b border-slate-100 pb-2 mt-4">
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Hardware y Software</h4>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.brand || ''}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Modelo</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.model || ''}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Procesador</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.cpu || ''}
                    onChange={e => setFormData({...formData, cpu: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">RAM</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.ram || ''}
                    onChange={e => setFormData({...formData, ram: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Almacenamiento</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.storage || ''}
                    onChange={e => setFormData({...formData, storage: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Almacenamiento</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.storage_type || ''}
                    onChange={e => setFormData({...formData, storage_type: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="SSD">SSD</option>
                    <option value="HDD">HDD</option>
                    <option value="M.2 NVMe">M.2 NVMe</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">SO</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.os || ''}
                    onChange={e => setFormData({...formData, os: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Office</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.office_version || ''}
                    onChange={e => setFormData({...formData, office_version: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">OCS</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.ocs_status || ''}
                    onChange={e => setFormData({...formData, ocs_status: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Instalado">Instalado</option>
                    <option value="No Instalado">No Instalado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Antivirus</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.antivirus || ''}
                    onChange={e => setFormData({...formData, antivirus: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.status || 'Activo'}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                {/* Section 3: Observaciones */}
                <div className="md:col-span-4 border-b border-slate-100 pb-2 mt-4">
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Observaciones</h4>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Observación 1</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none h-24"
                    value={formData.notes_1 || ''}
                    onChange={e => setFormData({...formData, notes_1: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Observación 2</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none h-24"
                    value={formData.notes_2 || ''}
                    onChange={e => setFormData({...formData, notes_2: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-200"
                >
                  {editingEquipo ? 'Actualizar' : 'Guardar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
