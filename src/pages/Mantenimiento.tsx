import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Wrench, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { Mantenimiento, Equipo } from '../types';

export default function MantenimientoPage() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<Mantenimiento[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Mantenimiento>>({
    type: 'Preventivo',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    const [lRes, eRes] = await Promise.all([
      fetch('/api/mantenimientos', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/equipos', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    setLogs(await lRes.json());
    setEquipos(await eRes.json());
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/mantenimientos', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowModal(false);
      setFormData({ type: 'Preventivo', date: new Date().toISOString().split('T')[0] });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Historial de Mantenimientos</h3>
        {user?.role !== 'read' && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Registrar Mantenimiento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Registros</p>
            <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Preventivos</p>
            <p className="text-2xl font-bold text-slate-900">{logs.filter(l => l.type === 'Preventivo').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Correctivos</p>
            <p className="text-2xl font-bold text-slate-900">{logs.filter(l => l.type === 'Correctivo').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Técnico</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Costo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Próximo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{log.equipo_code}</div>
                    <div className="text-xs text-slate-500">{log.hostname}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      log.type === 'Preventivo' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(log.date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.technician}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatCurrency(log.cost)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(log.next_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Registrar Mantenimiento</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Equipo *</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.equipo_id || ''}
                    onChange={e => setFormData({...formData, equipo_id: Number(e.target.value)})}
                  >
                    <option value="">Seleccionar Equipo...</option>
                    {equipos.map(e => (
                      <option key={e.id} value={e.id}>{e.code} - {e.hostname} ({e.user_assigned})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.type || 'Preventivo'}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="Preventivo">Preventivo</option>
                    <option value="Correctivo">Correctivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.date || ''}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Técnico Responsable</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.technician || ''}
                    onChange={e => setFormData({...formData, technician: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Costo (S/.)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.cost || ''}
                    onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Diagnóstico</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none h-20"
                    value={formData.diagnosis || ''}
                    onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Solución Aplicada</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none h-20"
                    value={formData.solution || ''}
                    onChange={e => setFormData({...formData, solution: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Próximo Mantenimiento</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    value={formData.next_date || ''}
                    onChange={e => setFormData({...formData, next_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
