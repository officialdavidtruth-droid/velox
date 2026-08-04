import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Sparkles, Loader2 } from 'lucide-react';

interface BillingManagerProps {
  subscription: any;
  user?: any;
  onRefresh: () => void;
}

const CURRENCY_MAP: Record<string, { code:string; symbol:string; starter:number; pro:number; agency:number; }> = {
  Nigeria:        { code:'NGN', symbol:'₦',    starter:15000,  pro:45000,  agency:155000 },
  Ghana:          { code:'GHS', symbol:'GH₵',  starter:190,    pro:565,    agency:1940 },
  Kenya:          { code:'KES', symbol:'KSh',  starter:1950,   pro:5800,   agency:20000 },
  'South Africa': { code:'ZAR', symbol:'R',    starter:275,    pro:820,    agency:2820 },
  Uganda:         { code:'UGX', symbol:'USh',  starter:56000,  pro:165000, agency:570000 },
  Rwanda:         { code:'RWF', symbol:'FRw',  starter:17500,  pro:52000,  agency:179000 },
  Tanzania:       { code:'TZS', symbol:'TSh',  starter:25000,  pro:75000,  agency:257000 },
  Egypt:          { code:'EGP', symbol:'E£',   starter:450,    pro:1340,   agency:4600 },
  UK:             { code:'GBP', symbol:'£',    starter:9,      pro:28,     agency:96 },
  USA:            { code:'USD', symbol:'$',    starter:9,      pro:27,     agency:93 },
  Canada:         { code:'CAD', symbol:'CA$',  starter:13,     pro:38,     agency:130 },
  Australia:      { code:'AUD', symbol:'AU$',  starter:14,     pro:41,     agency:142 },
  UAE:            { code:'AED', symbol:'AED',  starter:33,     pro:99,     agency:341 },
  Germany:        { code:'EUR', symbol:'€',    starter:9,      pro:25,     agency:87 },
  France:         { code:'EUR', symbol:'€',    starter:9,      pro:25,     agency:87 },
  India:          { code:'INR', symbol:'₹',    starter:750,    pro:2250,   agency:7750 },
  Singapore:      { code:'SGD', symbol:'S$',   starter:12,     pro:36,     agency:125 },
  'Saudi Arabia': { code:'SAR', symbol:'SR',   starter:34,     pro:101,    agency:348 },
};
const DEFAULT_CURRENCY = { code:'USD', symbol:'$', starter:9, pro:27, agency:93 };

function getCurrency(country?: string) {
  if (!country) return DEFAULT_CURRENCY;
  if (CURRENCY_MAP[country]) return CURRENCY_MAP[country];
  const matched = Object.keys(CURRENCY_MAP).find(k => country.includes(k));
  return matched ? CURRENCY_MAP[matched] : DEFAULT_CURRENCY;
}

const PLAN_META = [
  { key:'starter', label:'Starter', color:'var(--muted)', features:['1 Workspace','150 AI credits/mo','2 social platforms','Basic analytics','10 lead searches/mo'] },
  { key:'pro',     label:'Pro',     color:'var(--primary)', badge:'Most Popular', features:['3 Workspaces','500 AI credits/mo','All platforms','Campaign tracker','Website analytics','Lead pipeline','33 lead searches/mo'] },
  { key:'agency',  label:'Agency',  color:'#8b5cf6',        badge:'Best Value',  features:['6 Workspaces','2,000 AI credits/mo','Everything in Pro','White-label portal','Ads API connections','Priority support','133 lead searches/mo'] },
];

declare global { interface Window { PaystackPop: any; FlutterwaveCheckout: any; } }

export default function BillingManager({ subscription, user, onRefresh }: BillingManagerProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly'|'annual'>('monthly');
  const [processing, setProcessing] = useState<string|null>(null);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('velox_token') || '';
  const currency = getCurrency(user?.country);

  useEffect(() => { fetch('/api/billing/config').then(r=>r.json()).then(setConfig).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  const getPrice = (planKey: string) => {
    const adminNGN: Record<string,number> = { starter: Number(config.starter_price)||15000, pro: Number(config.pro_price)||45000, agency: Number(config.agency_price)||155000 };
    const ratio = (currency[planKey as keyof typeof currency] as number) / (CURRENCY_MAP.Nigeria[planKey as keyof typeof CURRENCY_MAP.Nigeria] as number);
    const base = Math.round(adminNGN[planKey] * (ratio || 1));
    return billingCycle === 'annual' ? Math.round(base * 0.9) : base;
  };

  const fmtPrice = (planKey: string) => {
    const p = getPrice(planKey);
    return `${currency.symbol}${p.toLocaleString()}`;
  };

  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script'); s.src=src; s.onload=()=>resolve(); s.onerror=reject; document.body.appendChild(s);
  });

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'starter') return;
    const price = getPrice(planKey);
    setProcessing(planKey); setMsg(null);
    const hasPaystack = !!config.paystack_public_key;
    const hasFlutterwave = !!config.flutterwave_public_key;
    if (!hasPaystack && !hasFlutterwave) { setMsg({text:'Payment gateway not configured. Contact administrator.',ok:false}); setProcessing(null); return; }
    const ref = `velox_${Date.now()}_${planKey}`;
    const email = user?.email||''; const name = user?.name||'';

    const onSuccess = async (reference: string) => {
      try {
        const r = await fetch('/api/billing/verify',{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token},body:JSON.stringify({reference,planKey,billingCycle})});
        const d = await r.json();
        if (d.success) { setMsg({text:`Upgraded to ${PLAN_META.find(p=>p.key===planKey)?.label}! Credits updated.`,ok:true}); onRefresh(); }
        else setMsg({text:d.error||'Payment verified but could not update plan. Contact support: '+reference,ok:false});
      } catch { setMsg({text:'Verification error. Contact support with ref: '+reference,ok:false}); }
      setProcessing(null);
    };

    try {
      if (hasPaystack) {
        await loadScript('https://js.paystack.co/v1/inline.js');
        window.PaystackPop.setup({ key:config.paystack_public_key, email, amount:price*100, currency:currency.code, ref, metadata:{plan:planKey,cycle:billingCycle,userId:user?.id},
          callback:(r:any)=>onSuccess(r.reference), onClose:()=>setProcessing(null) }).openIframe();
      } else {
        await loadScript('https://checkout.flutterwave.com/v3.js');
        window.FlutterwaveCheckout({ public_key:config.flutterwave_public_key, tx_ref:ref, amount:price, currency:currency.code,
          customer:{email,name}, customizations:{title:'Velox Space Subscription',description:`${planKey} Plan`,logo:window.location.origin+'/logo.png'},
          callback:(d:any)=>{ if(d.status==='completed'||d.status==='successful') onSuccess(d.transaction_id); else setProcessing(null); },
          onclose:()=>setProcessing(null) });
      }
    } catch { setMsg({text:'Could not load payment gateway. Please try again.',ok:false}); setProcessing(null); }
  };

  const currentPlan = subscription?.plan_type||'starter';
  const currentIdx  = PLAN_META.findIndex(p=>p.key===currentPlan);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>Billing & Subscription</h1>
        <p className="text-xs mt-0.5" style={{color:'var(--muted)'}}>Prices in <strong>{currency.code}</strong>{user?.country?` (${user.country})`:''} · Upgrade anytime</p>
      </div>
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{background:'var(--primary-soft)',border:'1px solid var(--primary-l)'}}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><CreditCard size={18} className="text-white"/></div>
          <div><p className="text-xs font-semibold" style={{color:'var(--muted)'}}>Current Plan</p><p className="font-black text-base capitalize" style={{color:'var(--text)'}}>{currentPlan} Plan</p></div>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{background:'var(--success-bg)',color:'var(--success)'}}>{subscription?.status||'Active'}</span>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold" style={{color:'var(--text)'}}>Billing cycle:</p>
        <div className="flex gap-1 p-1 rounded-xl" style={{background:'var(--surface)'}}>
          {(['monthly','annual'] as const).map(c=>(
            <button key={c} onClick={()=>setBillingCycle(c)} className="text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all"
              style={billingCycle===c?{background:'var(--card)',color:'var(--text)'}:{color:'var(--muted)'}}>
              {c}{c==='annual'&&<span className="text-[9px] ml-1 font-black" style={{color:'var(--success)'}}>-10%</span>}
            </button>
          ))}
        </div>
      </div>
      {msg && <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{background:msg.ok?'var(--success-bg)':'var(--danger-bg)',color:msg.ok?'var(--success)':'var(--danger)'}}>{msg.ok?'✓':'✕'} {msg.text}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLAN_META.map((plan,idx)=>{
          const isCurrent=plan.key===currentPlan; const isDown=idx<currentIdx;
          const annualSave=plan.key!=='starter'?Math.round(getPrice(plan.key)*0.1*12):0;
          return (
            <div key={plan.key} className="rounded-2xl p-5 flex flex-col relative" style={{background:'var(--card)',border:`${isCurrent?2:1}px solid ${isCurrent?plan.color:'var(--border)'}`}}>
              {(plan.badge||isCurrent)&&<div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white" style={{background:plan.color}}>{isCurrent?'Current Plan':plan.badge}</span></div>}
              <div className="mb-3">
                <h3 className="font-black text-base" style={{color:'var(--text)'}}>{plan.label}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black" style={{color:plan.color}}>{fmtPrice(plan.key)}</span>
                  {plan.key!=='starter'&&<span className="text-xs" style={{color:'var(--muted)'}}>/mo</span>}
                </div>
                {billingCycle==='annual'&&annualSave>0&&<p className="text-[10px] mt-0.5" style={{color:'var(--success)'}}>Save {currency.symbol}{annualSave.toLocaleString()}/year</p>}
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map(f=><li key={f} className="flex items-start gap-1.5 text-[10px]" style={{color:'var(--text-soft)'}}><Check size={10} className="mt-0.5 shrink-0" style={{color:plan.color}}/>{f}</li>)}
              </ul>
              {isCurrent?<div className="w-full py-2.5 rounded-xl text-xs font-bold text-center" style={{background:plan.color+'15',color:plan.color}}>✓ Active Plan</div>:
               isDown?<div className="w-full py-2.5 rounded-xl text-xs font-bold text-center" style={{background:'var(--surface)',color:'var(--muted)'}}>Contact support to downgrade</div>:
               <button onClick={()=>handleUpgrade(plan.key)} disabled={!!processing||loading} className="w-full py-2.5 rounded-xl text-xs font-bold text-white gradient-primary disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
                 {processing===plan.key?<Loader2 size={12} className="animate-spin"/>:<Sparkles size={12}/>}
                 {processing===plan.key?'Processing…':`Upgrade to ${plan.label}`}
               </button>}
            </div>
          );
        })}
      </div>
      {!loading&&!config.paystack_public_key&&!config.flutterwave_public_key&&<p className="text-[10px] rounded-xl p-3" style={{background:'var(--warning-bg)',color:'var(--warning)'}}>⚠️ Payment gateway not configured. Administrator must add Paystack or Flutterwave keys in the Admin panel.</p>}
      {!loading&&(config.paystack_public_key||config.flutterwave_public_key)&&<p className="text-[10px] text-center" style={{color:'var(--muted)'}}>Secure payments by {config.paystack_public_key?'Paystack':''}{config.paystack_public_key&&config.flutterwave_public_key?' & ':''}{config.flutterwave_public_key?'Flutterwave':''}</p>}
    </div>
  );
}
