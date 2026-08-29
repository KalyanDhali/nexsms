import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getMyNumbers, setPrimaryNumber, getDidStore, rentDidNumber, renewDidNumber, releaseDidNumber, getWallet } from '../services/api.js';

function fmtPrice(n, isZh) {
  if (n == null) return '—';
  const v = Number(n);
  return `${v.toFixed(v % 1 === 0 ? 0 : 2)} USDT`;
}

function fmtExpiry(iso, isZh) {
  if (!iso) return isZh ? '无期限' : 'No expiry';
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return isZh ? `已过期 (${d.toLocaleDateString()})` : `Expired (${d.toLocaleDateString()})`;
  return isZh ? `剩余 ${days} 天 · ${d.toLocaleDateString()}` : `${days}d left · ${d.toLocaleDateString()}`;
}

export default function NumbersPanel() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const [numbers, setNumbers] = useState([]);
  const [store, setStore] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [manageNum, setManageNum] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [copied, setCopied] = useState(false);

  const isZh = lang === 'zh';

  useEffect(() => {
    loadNumbers();
    loadWallet();
    loadStore();
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

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

  const loadWallet = async () => {
    try {
      const { data } = await getWallet();
      setBalance(data.wallet?.balance ?? null);
    } catch {
      setBalance(null);
    }
  };

  const loadStore = async (c = country) => {
    try {
      const { data } = await getDidStore(c ? { country: c } : {});
      setStore(data.numbers);
    } catch (e) {
      setStore([]);
      if (e.response?.status === 403) setError(e.response?.data?.error || '');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await setPrimaryNumber(id);
      notify(isZh ? '已设置为主号' : 'Set as primary');
      loadNumbers();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed');
    }
  };

  const handleRent = async (id) => {
    try {
      const { data } = await rentDidNumber(id);
      notify(isZh ? `号码已租用，花费 ${data.price} USDT` : `Number rented for ${data.price} USDT`);
      if (data.balanceAfter != null) setBalance(data.balanceAfter);
      loadNumbers();
      loadStore();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed';
      notify(isZh && msg === 'Insufficient balance' ? '余额不足，请先充值' : msg);
    }
  };

  const handleRenew = async (id) => {
    try {
      const { data } = await renewDidNumber(id);
      notify(isZh ? `已续租 ${data.leaseDays} 天，花费 ${data.price} USDT` : `Renewed ${data.leaseDays} days for ${data.price} USDT`);
      if (data.balanceAfter != null) setBalance(data.balanceAfter);
      loadNumbers();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed';
      notify(isZh && msg === 'Insufficient balance' ? '余额不足，请先充值' : msg);
    }
  };

  const handleRelease = async (id) => {
    try {
      await releaseDidNumber(id);
      notify(isZh ? '号码已释放回号码池' : 'Number released back to the pool');
      setManageNum(null);
      setConfirmRelease(false);
      loadNumbers();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed');
    }
  };

  const handleCopyNumber = async () => {
    if (!manageNum) return;
    try {
      await navigator.clipboard.writeText(manageNum.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify(isZh ? '复制失败' : 'Copy failed');
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
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      {toast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg text-center"
          style={{ background: theme.primary }}>
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isZh ? '号码管理' : 'Phone Numbers'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isZh ? '管理您的号码并从号码池租用新号码' : 'Manage your numbers and rent new DIDs from the pool'}
            </p>
          </div>
          <div className="flex w-full sm:w-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setTab('mine')}
              className={`flex-1 sm:flex-none min-h-11 flex items-center justify-center px-4 text-sm font-medium transition ${tab === 'mine' ? 'text-white' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              style={tab === 'mine' ? { background: theme.primary } : {}}
            >
              {isZh ? '我的号码' : 'My Numbers'}
            </button>
            <button
              onClick={() => { setTab('store'); loadStore(); }}
              className={`flex-1 sm:flex-none min-h-11 flex items-center justify-center px-4 text-sm font-medium transition ${tab === 'store' ? 'text-white' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              style={tab === 'store' ? { background: theme.primary } : {}}
            >
              {isZh ? '号码商店' : 'DID Store'}
            </button>
          </div>
        </div>

        {errEl}

        {tab === 'mine' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-10">{isZh ? '加载中...' : 'Loading...'}</div>
            ) : numbers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  {isZh ? '您还没有任何号码' : 'You do not own any numbers yet'}
                </p>
                <button
                  onClick={() => setTab('store')}
                  className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: theme.primary }}
                >
                  {isZh ? '去号码商店租用' : 'Rent from the DID store'}
                </button>
              </div>
            ) : (
              numbers.map((num) => (
                <div key={num.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                      {num.geo_country || 'US'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        {num.number}
                        {isPrimaryBadge(num)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {num.geo_area_code ? `Area ${num.geo_area_code} · ` : ''}
                        {num.provider_name || (isZh ? '本地' : 'Direct')}
                        {num.did_price != null || Number(num.monthly_cost) > 0 ? ` · ${fmtPrice(num.did_price != null ? num.did_price : num.monthly_cost, isZh)}/${isZh ? '租期' : 'lease'}` : ''}
                        {num.expires_at ? ` · ${fmtExpiry(num.expires_at, isZh)}` : ''}
                      </div>
                      {num.did_note && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{num.did_note}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!num.primary_number && (
                      <button
                        onClick={() => handleSetPrimary(num.id)}
                        className="text-xs px-3 min-h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        {isZh ? '设为主号' : 'Set primary'}
                      </button>
                    )}
                    <button
                      onClick={() => { setManageNum(num); setCopied(false); setConfirmRelease(false); }}
                      className="text-xs px-3 min-h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                    >
                      {isZh ? '管理' : 'Manage'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">{isZh ? '国家/地区' : 'Country / Region'}</label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); loadStore(e.target.value); }}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">{isZh ? '全部' : 'All'}</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                </select>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500 dark:text-slate-400">{isZh ? '余额' : 'Balance'}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {balance == null ? '—' : `${Number(balance).toFixed(2)} USDT`}
                </div>
              </div>
            </div>

            {store.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
                {isZh ? '暂无可用号码，请联系管理员添加' : 'No numbers available. Contact admin to add more.'}
              </p>
            ) : (
              <div className="space-y-2">
                {store.map((num) => (
                  <div key={num.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-100 dark:border-slate-800 rounded-lg px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white">{num.number}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {num.geo_area_code ? `Area ${num.geo_area_code} · ` : ''}{num.geo_country} · {fmtPrice(num.price, isZh)}/{isZh ? '租期' : 'lease'} · {num.leaseDays} {isZh ? '天' : 'days'}
                      </div>
                      {num.did_note && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{num.did_note}</div>
                      )}
                    </div>
                    <button
                      className="px-4 min-h-11 rounded-lg text-white text-sm font-medium sm:self-start"
                      style={{ background: theme.primary }}
                      onClick={() => handleRent(num.id)}
                    >
                      {isZh ? `租用 ${fmtPrice(num.price, isZh)}` : `Rent ${fmtPrice(num.price, isZh)}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {manageNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setManageNum(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                  {manageNum.geo_country || 'US'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white">{manageNum.number}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {manageNum.provider_name || (isZh ? '本地' : 'Direct')}
                    {manageNum.expires_at ? ` · ${fmtExpiry(manageNum.expires_at, isZh)}` : ''}
                  </div>
                </div>
              </div>
              <button onClick={() => setManageNum(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyNumber}
                className="w-full text-sm px-4 min-h-11 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
              >
                {copied ? (isZh ? '已复制 ✓' : 'Copied ✓') : (isZh ? '复制号码' : 'Copy number')}
              </button>
              {!manageNum.primary_number && (
                <button
                  onClick={() => { handleSetPrimary(manageNum.id); setManageNum(null); }}
                  className="w-full text-sm px-4 min-h-11 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
                >
                  {isZh ? '设为主号' : 'Set as primary'}
                </button>
              )}
              <button
                onClick={() => handleRenew(manageNum.id)}
                className="w-full text-sm px-4 min-h-11 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
              >
                {isZh ? `续租 ${manageNum.did_lease_days || 30} 天` : `Renew ${manageNum.did_lease_days || 30} days`}
              </button>
              {confirmRelease ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRelease(manageNum.id)}
                    className="flex-1 text-sm px-4 min-h-11 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
                  >
                    {isZh ? '确认释放' : 'Confirm release'}
                  </button>
                  <button
                    onClick={() => setConfirmRelease(false)}
                    className="flex-1 text-sm px-4 min-h-11 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition"
                  >
                    {isZh ? '取消' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRelease(true)}
                  className="w-full text-sm px-4 min-h-11 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                >
                  {isZh ? '释放号码' : 'Release number'}
                </button>
              )}
              <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-4 py-3 leading-relaxed">
                {isZh
                  ? `续租按每个租期 ${fmtPrice(manageNum.did_price != null ? manageNum.did_price : manageNum.monthly_cost, isZh)} 从余额扣费。释放后号码将归还号码池。`
                  : `Renewing charges ${fmtPrice(manageNum.did_price != null ? manageNum.did_price : manageNum.monthly_cost, isZh)} per lease from your balance. Released numbers return to the pool.`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
