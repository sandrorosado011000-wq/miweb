import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, MapPin, Building2, User, Phone } from 'lucide-react';
import { Sede, Area } from '../types';

export default function Sedes() {
  const { token, user } = useAuth();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [showSedeModal, setShowSedeModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    const [sRes, aRes] = await Promise.all([
      fetch('/api/sedes', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/areas', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    setSedes(await sRes.json());
    setAreas(await aRes.json());
  };

  return (
    <div className="space-y-8">
      {/* Sedes Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-emerald-600" size={24} />
            Sedes Corporativas
          </h3>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowSedeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Plus size={18} />
              Nueva Sede
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sedes.map(sede => (
            <div key={sede.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="text-lg font-bold text-slate-900 mb-4">{sede.name}</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <span>{sede.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span>{sede.manager}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{sede.contact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Areas Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-blue-600" size={24} />
            Áreas y Departamentos
          </h3>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowAreaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus size={18} />
              Nueva Área
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Área</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sede</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas.map(area => (
                <tr key={area.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{area.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{area.sede_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{area.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
