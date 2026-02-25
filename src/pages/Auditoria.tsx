import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User, Clock, Activity } from 'lucide-react';
import { AuditLog } from '../types';
import { formatDate } from '../lib/utils';

export default function Auditoria() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={20} />
            Registro de Actividad del Sistema
          </h3>
          <p className="text-sm text-slate-500 mt-1">Todas las acciones críticas son registradas para auditoría.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tabla / ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                        {log.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      log.action === 'CREATE' ? "bg-emerald-100 text-emerald-700" :
                      log.action === 'UPDATE' ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono text-slate-500">{log.target_table} #{log.target_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.details}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(log.timestamp).toLocaleString('es-PE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
