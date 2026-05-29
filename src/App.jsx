import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Users, Receipt, ArrowRightLeft, Trash2, Check, X, Plane, Coins, ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { supabase } from './supabase';

const CURRENCY_SYMBOLS = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'Fr', AED: 'د.إ' };
const DEFAULT_RATES = { TRY: 1, EUR: 45.5, USD: 42.0, GBP: 53.0, JPY: 0.27, CHF: 47.5, AED: 11.4 };

const groupCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const LS_KEY = 'seyahatkasa_gruplarim';
const getMyGroups = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
};
const setMyGroups = (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
};

export default function App() {
  const [view, setView] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [myGroups, setMyGroupsState] = useState(getMyGroups());

  const addToMyGroups = (g) => {
    const next = myGroups.find(x => x.id === g.id) ? myGroups : [...myGroups, { id: g.id, ad: g.ad, kod: g.kod }];
    setMyGroupsState(next);
    setMyGroups(next);
  };
  const removeFromMyGroups = (id) => {
    const next = myGroups.filter(g => g.id !== id);
    setMyGroupsState(next);
    setMyGroups(next);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 128px' }}>
        {view === 'home' && (
          <HomeView
            myGroups={myGroups}
            onOpenGroup={(id) => { setActiveGroupId(id); setView('group'); }}
            onNewGroup={() => setView('newGroup')}
            onJoinGroup={() => setView('joinGroup')}
          />
        )}
        {view === 'newGroup' && (
          <NewGroupView
            onCreated={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
            onBack={() => setView('home')}
          />
        )}
        {view === 'joinGroup' && (
          <JoinGroupView
            onJoined={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
            onBack={() => setView('home')}
          />
        )}
        {view === 'group' && (
          <GroupView
            groupId={activeGroupId}
            onBack={() => setView('home')}
            onLeave={() => { removeFromMyGroups(activeGroupId); setView('home'); }}
          />
        )}
      </div>
    </div>
  );
}

function HomeView({ myGroups, onOpenGroup, onNewGroup, onJoinGroup }) {
  return (
    <div className="anim-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48, marginTop: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }}>
          <Plane color="white" size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Seyahat Kasa</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Hesaplaşmadan keyfini çıkar</p>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <p className="display-font" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 30, lineHeight: 1.2 }}>Bir grup aç,</p>
        <p className="display-font" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 30, lineHeight: 1.2 }}>kodu paylaş, harcamaları kaydet.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        <button onClick={onNewGroup} className="pill-btn glow-card" style={{ borderRadius: 16, padding: 20, textAlign: 'left', color: 'white', border: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Plus color="#6ee7b7" size={20} />
          </div>
          <div style={{ fontWeight: 600 }}>Yeni Grup</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Seyahat başlat</div>
        </button>
        <button onClick={onJoinGroup} className="pill-btn glow-card" style={{ borderRadius: 16, padding: 20, textAlign: 'left', color: 'white', border: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Users color="#7dd3fc" size={20} />
          </div>
          <div style={{ fontWeight: 600 }}>Gruba Katıl</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Kodu gir</div>
        </button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gruplarım</h2>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{myGroups.length}</span>
      </div>

      {myGroups.length === 0 ? (
        <div className="glow-card" style={{ borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Henüz bir grup yok.</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Yukarıdan birini oluştur ya da katıl.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myGroups.map((g, i) => (
            <button key={g.id} onClick={() => onOpenGroup(g.id)} className="pill-btn glow-card anim-in"
              style={{ borderRadius: 16, padding: 16, textAlign: 'left', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animationDelay: `${i * 50}ms` }}>
              <div>
                <div style={{ fontWeight: 600 }}>{g.ad}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }}>{g.kod}</div>
              </div>
              <ChevronLeft color="rgba(255,255,255,0.3)" size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewGroupView({ onCreated, onBack }) {
  const [ad, setAd] = useState('');
  const [members, setMembers] = useState(['']);
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateMember = (i, v) => { const n = [...members]; n[i] = v; setMembers(n); };
  const addMember = () => setMembers([...members, '']);
  const removeMember = (i) => setMembers(members.filter((_, idx) => idx !== i));
  const canSave = ad.trim() && members.filter(m => m.trim()).length >= 2;

  const create = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      const kod = groupCode();
      const { data: grup, error: e1 } = await supabase
        .from('gruplar')
        .insert({ kod, ad: ad.trim(), ana_para_birimi: baseCurrency, kurlar: DEFAULT_RATES })
        .select()
        .single();
      if (e1) throw e1;

      const uyeRows = members.filter(m => m.trim()).map(m => ({ grup_id: grup.id, ad: m.trim() }));
      const { error: e2 } = await supabase.from('uyeler').insert(uyeRows);
      if (e2) throw e2;

      onCreated(grup);
    } catch (err) {
      setError('Bir hata oluştu: ' + (err.message || 'bilinmeyen'));
      setSaving(false);
    }
  };

  return (
    <div className="anim-in">
      <BackBtn onBack={onBack} />
      <h1 className="display-font" style={{ fontSize: 30, marginBottom: 4 }}>Yeni grup</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 }}>Seyahatin ismini ver, kimler geldiyse ekle.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Grup Adı">
          <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Roma 2026" style={inputStyle} />
        </Field>

        <Field label="Ana Para Birimi">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <button key={c} onClick={() => setBaseCurrency(c)} className="pill-btn"
                style={{ borderRadius: 12, padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none',
                  ...(baseCurrency === c ? { background: 'white', color: '#0f1620' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }) }}>
                {c}
              </button>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Sonuçlar bu para biriminde gösterilecek.</p>
        </Field>

        <Field label="Kim Geldi?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input value={m} onChange={e => updateMember(i, e.target.value)} placeholder={`Kişi ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                {members.length > 1 && (
                  <button onClick={() => removeMember(i)} className="pill-btn glow-card" style={{ width: 48, borderRadius: 12, border: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addMember} className="pill-btn" style={{ borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)', padding: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'transparent' }}>
              + Kişi ekle
            </button>
          </div>
        </Field>

        {error && <p style={{ color: '#fb7185', fontSize: 14 }}>{error}</p>}

        <button onClick={create} disabled={!canSave || saving} className="pill-btn"
          style={{ borderRadius: 12, padding: 16, fontWeight: 700, color: '#0f1620', border: 'none',
            background: canSave ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : '#666',
            opacity: (!canSave || saving) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving && <Loader2 size={18} className="spinner" />}
          {saving ? 'Oluşturuluyor...' : 'Grubu Oluştur'}
        </button>
      </div>
    </div>
  );
}

function JoinGroupView({ onJoined, onBack }) {
  const [kod, setKod] = useState('');
  const [error, setError] = useState('');
  const [trying, setTrying] = useState(false);

  const tryJoin = async () => {
    if (!kod.trim() || trying) return;
    setTrying(true);
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('gruplar')
        .select('*')
        .eq('kod', kod.trim().toUpperCase())
        .maybeSingle();
      if (e) throw e;
      if (!data) {
        setError('Bu kodla bir grup bulunamadı.');
        setTrying(false);
        return;
      }
      onJoined(data);
    } catch (err) {
      setError('Hata: ' + (err.message || 'bilinmeyen'));
      setTrying(false);
    }
  };

  return (
    <div className="anim-in">
      <BackBtn onBack={onBack} />
      <h1 className="display-font" style={{ fontSize: 30, marginBottom: 4 }}>Gruba katıl</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 }}>Grup yöneticisinin paylaştığı 6 haneli kodu gir.</p>

      <input value={kod} onChange={e => setKod(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}
        style={{ ...inputStyle, textAlign: 'center', fontSize: 30, fontFamily: 'monospace', letterSpacing: '0.4em', padding: '20px 16px' }} />
      {error && <p style={{ color: '#fb7185', fontSize: 14, marginTop: 12 }}>{error}</p>}

      <button onClick={tryJoin} disabled={kod.length < 4 || trying} className="pill-btn"
        style={{ width: '100%', borderRadius: 12, padding: 16, fontWeight: 700, color: '#0f1620', border: 'none', marginTop: 20,
          background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', opacity: (kod.length < 4 || trying) ? 0.4 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {trying && <Loader2 size={18} className="spinner" />}
        {trying ? 'Aranıyor...' : 'Katıl'}
      </button>
    </div>
  );
}

function GroupView({ groupId, onBack, onLeave }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState('expenses');
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: g } = await supabase.from('gruplar').select('*').eq('id', groupId).maybeSingle();
    const { data: u } = await supabase.from('uyeler').select('*').eq('grup_id', groupId).order('olusturma_tarihi');
    const { data: h } = await supabase.from('harcamalar').select('*').eq('grup_id', groupId).order('olusturma_tarihi', { ascending: false });
    setGroup(g);
    setMembers(u || []);
    setExpenses(h || []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const t = setInterval(reload, 6000);
    return () => clearInterval(t);
  }, [reload]);

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard?.writeText(group.kod);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 128 }}><Loader2 className="spinner" /></div>;
  if (!group) return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 128 }}>Grup bulunamadı.</div>;

  return (
    <div className="anim-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <BackBtn onBack={onBack} label="Gruplar" noMargin />
        <button onClick={copyCode} className="pill-btn glow-card" style={{ borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 12, border: 'none' }}>
          {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
          <span style={{ fontFamily: 'monospace' }}>{group.kod}</span>
        </button>
      </div>

      <h1 className="display-font" style={{ fontSize: 36, marginBottom: 4 }}>{group.ad}</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>{members.length} kişi · {expenses.length} harcama</p>

      <div className="glow-card" style={{ display: 'flex', gap: 4, borderRadius: 16, padding: 4, marginBottom: 20 }}>
        {[{ k: 'expenses', l: 'Harcamalar', I: Receipt }, { k: 'balances', l: 'Hesaplaşma', I: ArrowRightLeft }, { k: 'settings', l: 'Ayarlar', I: Coins }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="pill-btn"
            style={{ flex: 1, borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              ...(tab === t.k ? { background: 'white', color: '#0f1620' } : { background: 'transparent', color: 'rgba(255,255,255,0.6)' }) }}>
            <t.I size={14} /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'expenses' && <ExpensesTab group={group} members={members} expenses={expenses} reload={reload} />}
      {tab === 'balances' && <BalancesTab group={group} members={members} expenses={expenses} />}
      {tab === 'settings' && <SettingsTab group={group} members={members} expenses={expenses} reload={reload} onLeave={onLeave} />}

      {showNewExpense && (
        <NewExpenseModal group={group} members={members} onClose={() => setShowNewExpense(false)} onSaved={() => { setShowNewExpense(false); reload(); }} />
      )}

      {tab === 'expenses' && !showNewExpense && (
        <button onClick={() => setShowNewExpense(true)} className="pill-btn"
          style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 999, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }}>
          <Plus color="white" size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function ExpensesTab({ group, members, expenses, reload }) {
  const baseSym = CURRENCY_SYMBOLS[group.ana_para_birimi] || group.ana_para_birimi;

  const deleteExpense = async (id) => {
    if (!confirm('Bu harcamayı silmek istediğinden emin misin?')) return;
    await supabase.from('harcamalar').delete().eq('id', id);
    reload();
  };

  if (expenses.length === 0) {
    return (
      <div className="glow-card" style={{ borderRadius: 16, padding: 40, textAlign: 'center', marginTop: 24 }}>
        <Receipt color="rgba(255,255,255,0.3)" size={32} style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Henüz harcama yok.</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Sağ alttaki + ile ilk harcamayı ekle.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {expenses.map((e, i) => {
        const payer = members.find(m => m.id === e.odeyen_id);
        const baseAmt = convertToBase(e.tutar, e.para_birimi, group.ana_para_birimi, group.kurlar);
        return (
          <div key={e.id} className="glow-card anim-in" style={{ borderRadius: 16, padding: 16, animationDelay: `${i * 30}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.baslik}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>{payer?.ad || '?'}</span> ödedi · {e.bolusenler.length} kişiye bölündü
                </div>
                {e.not_metni && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{e.not_metni}"</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700 }}>{CURRENCY_SYMBOLS[e.para_birimi]}{formatNum(e.tutar)}</div>
                {e.para_birimi !== group.ana_para_birimi && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>≈ {baseSym}{formatNum(baseAmt)}</div>
                )}
                <button onClick={() => deleteExpense(e.id)} className="pill-btn" style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', marginTop: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewExpenseModal({ group, members, onClose, onSaved }) {
  const [baslik, setBaslik] = useState('');
  const [tutar, setTutar] = useState('');
  const [paraBirimi, setParaBirimi] = useState(group.ana_para_birimi);
  const [odeyenId, setOdeyenId] = useState(members[0]?.id || '');
  const [bolusenler, setBolusenler] = useState(members.map(m => m.id));
  const [notMetni, setNotMetni] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setBolusenler(bolusenler.includes(id) ? bolusenler.filter(x => x !== id) : [...bolusenler, id]);
  const canSave = baslik.trim() && parseFloat(tutar) > 0 && odeyenId && bolusenler.length > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await supabase.from('harcamalar').insert({
      grup_id: group.id,
      baslik: baslik.trim(),
      tutar: parseFloat(tutar),
      para_birimi: paraBirimi,
      odeyen_id: odeyenId,
      bolusenler,
      not_metni: notMetni.trim(),
    });
    onSaved();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 512, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(180deg, #1a2332, #0f1620)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ position: 'sticky', top: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, backdropFilter: 'blur(20px)', background: 'rgba(15,22,32,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Yeni Harcama</h3>
          <button onClick={onClose} className="pill-btn" style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}><X size={22} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Ne için?">
            <input value={baslik} onChange={e => setBaslik(e.target.value)} placeholder="Akşam yemeği, taksi, müze..." style={inputStyle} />
          </Field>

          <Field label="Tutar">
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" inputMode="decimal" value={tutar} onChange={e => setTutar(e.target.value)} placeholder="0.00" style={{ ...inputStyle, flex: 1, fontSize: 20, fontWeight: 700 }} />
              <select value={paraBirimi} onChange={e => setParaBirimi(e.target.value)} style={{ ...inputStyle, width: 'auto', background: '#1a2332', fontWeight: 600 }}>
                {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Field>

          <Field label="Kim Ödedi?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {members.map(m => (
                <button key={m.id} onClick={() => setOdeyenId(m.id)} className="pill-btn"
                  style={{ borderRadius: 12, padding: '10px 12px', fontSize: 14, fontWeight: 600, border: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    ...(odeyenId === m.id ? { background: 'white', color: '#0f1620' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }) }}>
                  {m.ad}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Kime Bölünecek?">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, marginTop: -28 }}>
              <button onClick={() => setBolusenler(bolusenler.length === members.length ? [] : members.map(m => m.id))} className="pill-btn" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, background: 'none', border: 'none' }}>
                {bolusenler.length === members.length ? 'Hiçbiri' : 'Hepsi'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(m => {
                const on = bolusenler.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m.id)} className="pill-btn glow-card"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: '12px 16px', border: 'none', color: 'white' }}>
                    <span>{m.ad}</span>
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(on ? { background: '#34d399' } : { border: '1px solid rgba(255,255,255,0.2)' }) }}>
                      {on && <Check size={14} color="white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {bolusenler.length > 0 && tutar && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                Kişi başı: {CURRENCY_SYMBOLS[paraBirimi]}{formatNum(parseFloat(tutar) / bolusenler.length)}
              </p>
            )}
          </Field>

          <Field label="Not (opsiyonel)">
            <input value={notMetni} onChange={e => setNotMetni(e.target.value)} placeholder="Kısa açıklama..." style={inputStyle} />
          </Field>

          <button onClick={save} disabled={!canSave || saving} className="pill-btn"
            style={{ borderRadius: 12, padding: 16, fontWeight: 700, color: '#0f1620', border: 'none',
              background: canSave ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : '#666', opacity: (!canSave || saving) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <Loader2 size={18} className="spinner" />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BalancesTab({ group, members, expenses }) {
  const baseSym = CURRENCY_SYMBOLS[group.ana_para_birimi] || group.ana_para_birimi;

  const { balances, settlements, total } = useMemo(() => {
    const bal = {};
    members.forEach(m => bal[m.id] = 0);
    let tot = 0;
    expenses.forEach(e => {
      const baseAmt = convertToBase(e.tutar, e.para_birimi, group.ana_para_birimi, group.kurlar);
      tot += baseAmt;
      const per = baseAmt / e.bolusenler.length;
      if (bal[e.odeyen_id] !== undefined) bal[e.odeyen_id] += baseAmt;
      e.bolusenler.forEach(id => { if (bal[id] !== undefined) bal[id] -= per; });
    });
    const creditors = [], debtors = [];
    Object.entries(bal).forEach(([id, v]) => {
      if (v > 0.01) creditors.push({ id, amt: v });
      else if (v < -0.01) debtors.push({ id, amt: -v });
    });
    creditors.sort((a, b) => b.amt - a.amt);
    debtors.sort((a, b) => b.amt - a.amt);
    const settle = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      settle.push({ from: debtors[i].id, to: creditors[j].id, amt: pay });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt < 0.01) i++;
      if (creditors[j].amt < 0.01) j++;
    }
    return { balances: bal, settlements: settle, total: tot };
  }, [group, members, expenses]);

  const name = (id) => members.find(m => m.id === id)?.ad || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="glow-card" style={{ borderRadius: 16, padding: 20 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Toplam Harcama</div>
        <div className="display-font" style={{ fontSize: 36 }}>{baseSym}{formatNum(total)}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Kişi başı ortalama: {baseSym}{formatNum(total / (members.length || 1))}</div>
      </div>

      <div>
        <h3 style={sectionLabel}>Bireysel Durum</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => {
            const v = balances[m.id] || 0;
            const pos = v > 0.01, neg = v < -0.01;
            return (
              <div key={m.id} className="glow-card" style={{ borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{m.ad}</span>
                <span style={{ fontWeight: 700, color: pos ? '#6ee7b7' : neg ? '#fda4af' : 'rgba(255,255,255,0.4)' }}>
                  {pos ? '+' : neg ? '−' : ''}{baseSym}{formatNum(Math.abs(v))}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Yeşil: alacağı var · Kırmızı: borcu var</p>
      </div>

      <div>
        <h3 style={sectionLabel}>En Az Transferle Hesaplaşma</h3>
        {settlements.length === 0 ? (
          <div className="glow-card" style={{ borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <Check color="#34d399" size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Herkes ödeşmiş 🎉</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {settlements.map((s, i) => (
              <div key={i} className="glow-card anim-in" style={{ borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${i * 50}ms` }}>
                <span style={{ fontWeight: 600 }}>{name(s.from)}</span>
                <ArrowRightLeft color="rgba(255,255,255,0.4)" size={16} />
                <span style={{ fontWeight: 600 }}>{name(s.to)}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#fbbf24' }}>{baseSym}{formatNum(s.amt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ group, members, expenses, reload, onLeave }) {
  const [rates, setRates] = useState(group.kurlar);
  const [newMember, setNewMember] = useState('');
  const [savingRates, setSavingRates] = useState(false);

  const saveRates = async () => {
    setSavingRates(true);
    await supabase.from('gruplar').update({ kurlar: rates }).eq('id', group.id);
    setSavingRates(false);
    reload();
  };

  const addMember = async () => {
    if (!newMember.trim()) return;
    await supabase.from('uyeler').insert({ grup_id: group.id, ad: newMember.trim() });
    setNewMember('');
    reload();
  };

  const removeMember = async (id) => {
    const used = expenses.some(e => e.odeyen_id === id || e.bolusenler.includes(id));
    if (used) { alert('Bu kişinin harcaması var, önce o harcamaları sil.'); return; }
    if (!confirm('Bu kişiyi gruptan çıkar?')) return;
    await supabase.from('uyeler').delete().eq('id', id);
    reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="glow-card" style={{ borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Grup Kodu</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 }}>Bu kodu arkadaşlarınla paylaş, gruba katılabilsinler.</p>
        <div style={{ fontSize: 30, fontFamily: 'monospace', letterSpacing: '0.3em', color: '#fbbf24', textAlign: 'center', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>{group.kod}</div>
      </div>

      <div className="glow-card" style={{ borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Üyeler</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>{m.ad}</span>
              <button onClick={() => removeMember(m.id)} className="pill-btn" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Yeni üye ismi" style={{ ...inputStyle, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
          <button onClick={addMember} className="pill-btn" style={{ borderRadius: 12, padding: '0 16px', background: 'white', color: '#0f1620', fontWeight: 600, border: 'none' }}>Ekle</button>
        </div>
      </div>

      <div className="glow-card" style={{ borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Döviz Kurları</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 }}>1 birim = kaç {group.ana_para_birimi}? Güncel kurları girip kaydet.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(CURRENCY_SYMBOLS).filter(c => c !== group.ana_para_birimi).map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', width: 48, fontSize: 14, fontFamily: 'monospace' }}>1 {c}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>=</span>
              <input type="number" inputMode="decimal" value={rates[c] || ''} onChange={e => setRates({ ...rates, [c]: parseFloat(e.target.value) || 0 })}
                style={{ ...inputStyle, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'monospace', width: 48 }}>{group.ana_para_birimi}</span>
            </div>
          ))}
        </div>
        <button onClick={saveRates} disabled={savingRates} className="pill-btn"
          style={{ width: '100%', borderRadius: 12, padding: 12, background: 'white', color: '#0f1620', fontWeight: 600, border: 'none', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {savingRates && <Loader2 size={16} className="spinner" />} Kurları Kaydet
        </button>
      </div>

      <button onClick={onLeave} className="pill-btn"
        style={{ width: '100%', borderRadius: 12, padding: 12, color: '#fda4af', border: '1px solid rgba(251,113,133,0.3)', background: 'transparent' }}>
        Bu grubu listemden kaldır
      </button>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', marginTop: -12 }}>
        Grup verisi silinmez, sadece senin listenden çıkar. Kodla tekrar katılabilirsin.
      </p>
    </div>
  );
}

function BackBtn({ onBack, label = 'Geri', noMargin }) {
  return (
    <button onClick={onBack} className="pill-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', marginBottom: noMargin ? 0 : 24 }}>
      <ChevronLeft size={18} /> {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={sectionLabel}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  fontSize: 16,
  outline: 'none',
};

const sectionLabel = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 8,
  display: 'block',
};

function convertToBase(amount, fromCurrency, baseCurrency, rates) {
  if (fromCurrency === baseCurrency) return amount;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[baseCurrency] || 1;
  return (amount * fromRate) / toRate;
}

function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0,00';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
