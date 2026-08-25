import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getMyNumbers, setPrimaryNumber, getAvailableNumbers, selfAssignNumber } from '../services/api.js';

export default function NumbersPanel() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const [numbers, setNumbers] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const isZh = lang === 'zh';

  useEffect(() => {
    loadNumbers();
    loadAvailable();
  }, []);

  const loadNumbers = async () => {
    try {
      const { data } = await getMyNumbers();
      const sorted = [...data.numbers].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setNumbers(sorted);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load numbers');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailable = async (c = country) => {
    try {
      const { data } = await getAvailableNumbers(c ? { country: c } : {});
      setAvailable(data.numbers);
    } catch {
      setAvailable([]);
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await setPrimaryNumber(id);
      setToast(isZh ? '已设置为主号' : 'Set as primary');
      loadNumbers();
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  const handleSelfAssign = async (id) => {
    try {
      await selfAssignNumber(id);
      setToast(isZh ? '号码已分配给你' : 'Number assigned to you');
      loadNumbers();
      loadAvailable();
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  const isPrimaryBadge = (num) => (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white"
      style={{ background: num.primary_number ? theme.primary : 'transparent', outline: num.primary_number ? 'none' : '1px solid #94a3b8', color: num.primary_number ? '#fff' : '#94a3b8' }}>
      {num.primary_number ? (isZh ? '主号' : 'Primary') : (isZh ? '副号' : 'Secondary')}
    </span>
  );

  const errEl = error && (
    <div className="text-sm text-red-500 mb-3">{error}</div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {toast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg text-center"
          style={{ background: theme.primary }}>
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isZh ? '我的号码' : 'My Numbers'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isZh ? '管理您拥有的手机号码' : 'Manage the numbers you own'}
            </p>
          </div>
          <div className="flex w-full sm:w-auto rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setTab('mine')}
              className={`flex-1 sm:flex-none min-h-11 flex items-center justify-center px-4 text-sm font-medium transition ${tab === 'mine' ? 'text-white' : 'text-slate-600 bg-white hover:bg-slate-50'}`}
              style={tab === 'mine' ? { background: theme.primary } : {}}
            >
              {isZh ? '我的号码' : 'Mine'}
            </button>
            <button
              onClick={() => setTab('get')}
              className={`flex-1 sm:flex-none min-h-11 flex items-center justify-center px-4 text-sm font-medium transition ${tab === 'get' ? 'text-white' : 'text-slate-600 bg-white hover:bg-slate-50'}`}
              style={tab === 'get' ? { background: theme.primary } : {}}
            >
              {isZh ? '获取号码' : 'Get a number'}
            </button>
          </div>
        </div>

        {errEl}

        {tab === 'mine' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-slate-400 text-sm py-10">{isZh ? '加载中...' : 'Loading...'}</div>
            ) : numbers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <p className="text-slate-500">
                  {isZh ? '您还没有任何号码' : 'You do not own any numbers yet'}
                </p>
                <button
                  onClick={() => setTab('get')}
                  className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: theme.primary }}
                >
                  {isZh ? '获取一个号码' : 'Get a number'}
                </button>
              </div>
            ) : (
              numbers.map((num) => (
                <div key={num.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                      {num.geo_country || 'US'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                        {num.number}
                        {isPrimaryBadge(num)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {num.geo_area_code ? `Area ${num.geo_area_code} · ` : ''}
                        {num.provider_name || (isZh ? '本地' : 'Direct')}
                        {num.compliance_status === 'not_registered' ? ` · ${isZh ? '未注册' : 'Not registered'}` : ''}
                        {num.expires_at ? ` · ${isZh ? '到期 ' : 'Expires '}${new Date(num.expires_at).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!num.primary_number && (
                      <button
                        onClick={() => handleSetPrimary(num.id)}
                        className="text-xs px-3 min-h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                      >
                        {isZh ? '设为主号' : 'Set primary'}
                      </button>
                    )}
                    <button
                      className="text-xs px-3 min-h-9 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition"
                      title={isZh ? '暂停/移除需要联系管理员' : 'Pause/remove requires admin'}
                    >
                      {isZh ? '管理' : 'Manage'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">{isZh ? '国家/地区' : 'Country / Region'}</label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); loadAvailable(e.target.value); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">{isZh ? '全部' : 'All'}</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                </select>
              </div>
              <button
                onClick={() => loadAvailable()}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                {isZh ? '刷新' : 'Refresh'}
              </button>
            </div>

            {available.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                {isZh ? '暂无可用号码，请联系管理员添加' : 'No numbers available. Contact admin to add more.'}
              </p>
            ) : (
              <div className="space-y-2">
                {available.map((num) => (
                  <div key={num.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-100 rounded-lg px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{num.number}</div>
                      <div className="text-xs text-slate-400">{num.geo_area_code ? `Area ${num.geo_area_code}` : num.geo_country}</div>
                    </div>
                    <button
                      className="px-4 min-h-11 rounded-lg text-white text-sm font-medium sm:self-start"
                      style={{ background: theme.primary }}
                      onClick={() => handleSelfAssign(num.id)}
                    >
                      {isZh ? '选择' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
