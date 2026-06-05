import React, { useState, useEffect } from 'react';
import { CreditCard, Edit, CheckCircle, XCircle, Settings, Shield } from 'lucide-react';
import api from '../services/api';

interface GatewayCredentials {
  [key: string]: string;
}

interface PaymentGateway {
  id?: string;
  provider: string;
  isActive: boolean;
  credentials: GatewayCredentials;
}

const PROVIDERS = [
  {
    id: 'FAWRY',
    name: 'فوري (Fawry)',
    fields: [
      { key: 'merchantCode', label: 'Merchant Code' },
      { key: 'securityKey', label: 'Security Key' }
    ]
  },
  {
    id: 'STRIPE',
    name: 'سترايب (Stripe)',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key' },
      { key: 'secretKey', label: 'Secret Key' }
    ]
  }
];

export const PaymentSettings = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  
  // Form states
  const [isActive, setIsActive] = useState(false);
  const [credentials, setCredentials] = useState<GatewayCredentials>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const res = await api.get('/payments/settings');
      setGateways(res.data);
    } catch (err) {
      console.error('Error fetching payment gateways', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (providerId: string) => {
    const existing = gateways.find(g => g.provider === providerId);
    setEditingProvider(providerId);
    setIsActive(existing?.isActive || false);
    setCredentials(existing?.credentials || {});
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    setSaving(true);
    try {
      await api.post('/payments/settings', {
        provider: editingProvider,
        isActive,
        credentials
      });
      alert('تم حفظ إعدادات وسيلة الدفع بنجاح');
      setEditingProvider(null);
      fetchGateways();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-theme-neonCyan">جاري تحميل إعدادات الدفع...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-white/5 pb-3">
        <CreditCard className="w-6 h-6 text-emerald-400" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">إعدادات وسائل الدفع (Payment Gateways)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROVIDERS.map(provider => {
          const gwData = gateways.find(g => g.provider === provider.id);
          const isEditing = editingProvider === provider.id;

          return (
            <div key={provider.id} className={`glass-panel p-6 rounded-2xl border transition-all ${gwData?.isActive ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-200 dark:border-white/5'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${gwData?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{provider.name}</h4>
                    <div className="flex items-center gap-1 text-xs font-semibold mt-1">
                      {gwData?.isActive ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> مفعل حالياً</span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> غير مفعل</span>
                      )}
                    </div>
                  </div>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => handleEdit(provider.id)}
                    className="p-2 bg-white/5 hover:bg-theme-neonCyan/20 text-slate-600 dark:text-slate-400 hover:text-theme-neonCyan rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="mt-4 space-y-4 pt-4 border-t border-slate-200 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-4">
                    <input 
                      type="checkbox" 
                      id={`active-${provider.id}`}
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-theme-neonCyan focus:ring-theme-neonCyan focus:ring-offset-slate-900"
                    />
                    <label htmlFor={`active-${provider.id}`} className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                      تفعيل وسيلة الدفع هذه للطلاب
                    </label>
                  </div>

                  {provider.fields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">{field.label}</label>
                      <input
                        type="text"
                        value={credentials[field.key] || ''}
                        onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                        placeholder={`أدخل ${field.label}...`}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all text-sm font-mono"
                        required
                      />
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-theme-neonCyan hover:bg-theme-neonCyan/80 text-slate-900 font-bold transition-all disabled:opacity-50"
                    >
                      {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProvider(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white font-semibold transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                  {gwData?.credentials ? (
                    <div className="space-y-2">
                      {provider.fields.map(f => (
                        <div key={f.key} className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{f.label}</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {gwData.credentials[f.key] ? '••••••••••••' + gwData.credentials[f.key].slice(-4) : 'غير متوفر'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">لم يتم إعداد بيانات الربط بعد.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
