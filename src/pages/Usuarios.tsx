import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, User, Shield, CheckCircle, XCircle, Plus } from 'lucide-react';
import { User as UserType } from '../types';

export default function Usuarios() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'read' });

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = () => {
    fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(setUsers);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowModal(false);
      setFormData({ username: '', password: '', role: 'read' });
      fetchUsers();
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <UserPlus size={18} />
          Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                u.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {u.status}
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900">{u.username}</h4>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 capitalize">
              <Shield size={14} />
              {u.role}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Último acceso: {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Nunca'}
              </div>
              <button 
                onClick={() => toggleStatus(u.id, u.status)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  u.status === 'active' ? "text-red-500 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"
                )}
              >
                {u.status === 'active' ? <XCircle size={20} /> : <CheckCircle size={20} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Nuevo Usuario</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de Usuario</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña</label>
                <input 
                  required
                  type="password" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rol</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="admin">Administrador</option>
                  <option value="tech">Soporte Técnico</option>
                  <option value="read">Consulta (Solo Lectura)</option>
                </select>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
