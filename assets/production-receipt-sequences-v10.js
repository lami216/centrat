(()=>{
  const FLAG='__EFC_RECEIPT_SEQUENCES_V10__';
  if(window[FLAG])return;

  const GENERAL_MARKER='efc-general-receipt-sequence-v10';
  const CERT_MARKER='efc-certificate-receipt-sequence-v10';
  const IDENTITY_KEY='efc-identity-sequences-v11';
  const invoke=window.__TAURI__?.core?.invoke;
  let starting=false;
  let identityState={version:11,generalReceiptNext:1,registrationLastByScope:{},updatedAt:0};

  const int=value=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:null;};
  const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const scopeKey=(branch,specialty)=>`${encodeURIComponent(String(branch||''))}|${encodeURIComponent(String(specialty||''))}`;
  function normalizeIdentity(raw){
    const source=raw&&typeof raw==='object'?raw:{},scopes={};
    if(source.registrationLastByScope&&typeof source.registrationLastByScope==='object'){
      Object.entries(source.registrationLastByScope).forEach(([key,value])=>{const number=int(value);if(number)scopes[String(key)]=number;});
    }
    return{version:11,generalReceiptNext:int(source.generalReceiptNext)||1,registrationLastByScope:scopes,updatedAt:Math.max(0,Number(source.updatedAt||0))};
  }
  function mergeIdentity(aRaw,bRaw){
    const a=normalizeIdentity(aRaw),b=normalizeIdentity(bRaw),scopes={...a.registrationLastByScope};
    Object.entries(b.registrationLastByScope).forEach(([key,value])=>{scopes[key]=Math.max(Number(scopes[key]||0),Number(value||0));});
    return{version:11,generalReceiptNext:Math.max(a.generalReceiptNext,b.generalReceiptNext),registrationLastByScope:scopes,updatedAt:Math.max(a.updatedAt,b.updatedAt)};
  }
  function readIdentityLocal(){try{return normalizeIdentity(JSON.parse(localStorage.getItem(IDENTITY_KEY)||'{}'));}catch{return normalizeIdentity({});}}
  function writeIdentityLocal(touch=true){if(touch)identityState.updatedAt=Date.now();localStorage.setItem(IDENTITY_KEY,JSON.stringify(identityState));}
  function markIdentityChanged(){writeIdentityLocal(true);try{window.EFC_CORE_CHANGED?.();}catch{}}

  function paymentReceiptNumbersFromStudents(items){
    const numbers=[];
    (Array.isArray(items)?items:[]).forEach(student=>{
      const registration=int(student?.registrationReceiptNo);if(registration)numbers.push(registration);
      (Array.isArray(student?.payments)?student.payments:[]).forEach(payment=>{const value=int(payment?.[8]);if(value)numbers.push(value);});
    });
    return numbers;
  }
  function absorbStudentRecords(items){
    const list=Array.isArray(items)?items:[];
    const numbers=paymentReceiptNumbersFromStudents(list),receiptMax=numbers.length?Math.max(...numbers):0;
    identityState.generalReceiptNext=Math.max(identityState.generalReceiptNext,receiptMax+1,1);
    list.forEach(student=>{
      const reg=int(student?.reg);if(!reg)return;
      const key=scopeKey(student?.branch,student?.specialty);
      identityState.registrationLastByScope[key]=Math.max(Number(identityState.registrationLastByScope[key]||0),reg);
    });
  }
  function seedIdentityFromCurrent(){absorbStudentRecords(typeof students!=='undefined'?students:[]);}
  async function hydrateIdentity(){
    identityState=readIdentityLocal();
    if(invoke){
      try{
        const raw=await invoke('load_app_state'),state=raw?JSON.parse(raw):null;
        if(state&&typeof state==='object'){
          identityState=mergeIdentity(identityState,state.identitySequencesV11);
          absorbStudentRecords(state.students);
        }
      }catch(error){console.warn('EFC identity sequence hydration kept local state.',error);}
    }
    seedIdentityFromCurrent();writeIdentityLocal(false);
  }

  function generalEvents(){
    const events=[];
    students.forEach((student,studentIndex)=>{
      const payments=Array.isArray(student.payments)?student.payments:[];
      if(!payments.length){events.push({kind:'registration',student,index:null,date:String(student.start||''),time:'00:00',stamp:Number(student.createdAt||0),tie:`${String(student.reg||0).padStart(8,'0')}:${studentIndex}:${student.id||''}`});return;}
      payments.forEach((payment,index)=>events.push({kind:'payment',student,payment,index,date:String(payment?.[0]||student.start||''),time:String(payment?.[3]||'00:00'),stamp:Number(payment?.[4]||0),tie:`${String(student.reg||0).padStart(8,'0')}:${studentIndex}:${String(index).padStart(6,'0')}:${student.id||''}`}));
    });
    return events.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.stamp-b.stamp||a.tie.localeCompare(b.tie));
  }
  function eventNumber(event){return event.kind==='payment'?int(event.payment?.[8]):int(event.student?.registrationReceiptNo);}
  function setEventNumber(event,number){if(event.kind==='payment')event.payment[8]=number;else event.student.registrationReceiptNo=number;}
  function maxGeneralNumber(){let max=0;generalEvents().forEach(event=>{max=Math.max(max,eventNumber(event)||0);});return max;}
  function reserveGeneralNumber(){
    seedIdentityFromCurrent();
    const number=Math.max(1,Number(identityState.generalReceiptNext||1),maxGeneralNumber()+1);
    identityState.generalReceiptNext=number+1;markIdentityChanged();return number;
  }
  function repairGeneralSequence(){
    const events=generalEvents(),seen=new Set(),needs=[];let max=0,changed=false,duplicates=0;
    events.forEach(event=>{
      const number=eventNumber(event);
      if(number){max=Math.max(max,number);if(seen.has(number))duplicates+=1;else seen.add(number);return;}
      needs.push(event);
    });
    if(duplicates)console.warn(`EFC found ${duplicates} legacy duplicate receipt number(s); historical numbers were preserved and only future numbers are protected.`);
    let next=Math.max(max+1,Number(identityState.generalReceiptNext||1));
    needs.forEach(event=>{while(seen.has(next))next+=1;setEventNumber(event,next);seen.add(next);max=next;next+=1;changed=true;});
    identityState.generalReceiptNext=Math.max(Number(identityState.generalReceiptNext||1),max+1,next);
    return changed;
  }

  function currentScopeMax(branch,specialty){
    let max=0;
    students.forEach(student=>{if(String(student?.branch||'')!==String(branch||'')||String(student?.specialty||'')!==String(specialty||''))return;max=Math.max(max,int(student?.reg)||0);});
    return max;
  }
  function allocateRegistrationNumber(branch,specialty){
    const key=scopeKey(branch,specialty),last=Math.max(Number(identityState.registrationLastByScope[key]||0),currentScopeMax(branch,specialty));
    const number=last+1;identityState.registrationLastByScope[key]=number;markIdentityChanged();return number;
  }
  function noteRegistrationNumber(branch,specialty,number){
    const value=int(number);if(!value)return;
    const key=scopeKey(branch,specialty),before=Number(identityState.registrationLastByScope[key]||0);
    if(value>before){identityState.registrationLastByScope[key]=value;markIdentityChanged();}
  }

  function persistStudents(){
    try{saveStudents();}catch(error){console.error('EFC receipt sequence student save failed.',error);}
    try{Promise.resolve(window.EFC_FORCE_PERSIST?.()).catch(error=>console.error('EFC receipt sequence native save failed.',error));}catch{}
  }
  function migrateGeneralSequence(){
    const changed=repairGeneralSequence();
    localStorage.setItem(GENERAL_MARKER,'1');
    if(changed)persistStudents();else writeIdentityLocal(false);
  }
  function ensurePaymentNumber(student,index){
    const payment=student?.payments?.[index];if(!payment)return ensureRegistrationNumber(student);
    let number=int(payment[8]);if(number){identityState.generalReceiptNext=Math.max(identityState.generalReceiptNext,number+1);return number;}
    number=reserveGeneralNumber();payment[8]=number;persistStudents();return number;
  }
  function ensureRegistrationNumber(student){
    if(student?.payments?.length)return ensurePaymentNumber(student,0);
    let number=int(student?.registrationReceiptNo);if(number){identityState.generalReceiptNext=Math.max(identityState.generalReceiptNext,number+1);return number;}
    number=reserveGeneralNumber();student.registrationReceiptNo=number;persistStudents();return number;
  }
  function modelReceiptNumber(student,paymentIndex,statement){
    const payments=student?.payments||[];
    if(statement){if(payments.length)return ensurePaymentNumber(student,payments.length-1);return ensureRegistrationNumber(student);}
    if(paymentIndex===null||paymentIndex===undefined)return payments.length?ensurePaymentNumber(student,0):ensureRegistrationNumber(student);
    return ensurePaymentNumber(student,Number(paymentIndex));
  }

  async function initialize(){
    await hydrateIdentity();
    migrateGeneralSequence();
    localStorage.setItem(CERT_MARKER,'1');

    const baseReceiptModel=receiptModelV4;
    const baseAllPayments=allPayments;
    receiptModelV4=function(student,paymentIndex=null,statement=false){const model=baseReceiptModel(student,paymentIndex,statement);if(model)model.receipt=String(modelReceiptNumber(student,paymentIndex,statement));return model;};
    allPayments=function(){const rows=baseAllPayments();rows.forEach(row=>{if(row?.sourceType==='certificate')return;const index=Number(row?.paymentIndex);if(row?.student&&Number.isInteger(index)&&index>=0)row.receipt=String(ensurePaymentNumber(row.student,index));});return rows;};

    window.EFC_REGISTER_STATE_CONTRIBUTOR?.('identity-sequences-v11',snapshot=>{
      seedIdentityFromCurrent();writeIdentityLocal(false);
      return Object.assign(snapshot,{identitySequencesV11:clone(identityState)});
    });
    const baseApply=window.EFC_APPLY_RESTORED_STATE;
    if(typeof baseApply==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{
      const incomingIdentity=normalizeIdentity(incoming?.identitySequencesV11);
      absorbStudentRecords(incoming?.students);
      identityState=mergeIdentity(identityState,incomingIdentity);
      const result=await baseApply(incoming);
      seedIdentityFromCurrent();writeIdentityLocal(true);await window.EFC_FORCE_PERSIST?.();return result;
    };

    window.EFC_RECEIPT_SEQUENCES_V10=Object.freeze({
      generalReceiptsNumericOnly:true,
      generalReceiptsStartAtOne:true,
      certificateReceiptsStartAtOne:true,
      externalCertificateRegistrationNative:true,
      legacyReceiptPrefixesRemoved:true,
      noCertificateDomObserver:true,
      noCertificateReloadPatch:true,
      identitySequenceVersion:11,
      receiptNumbersNeverReused:true,
      registrationNumbersNeverReused:true,
      persistedHighWaterMarks:true,
      historicalReceiptNumbersPreserved:true,
      scopeMutationsCapturedOnPersist:true,
      allocateRegistrationNumber,
      noteRegistrationNumber,
      identitySnapshot:()=>clone(identityState)
    });
    window[FLAG]=true;
  }

  function boot(){
    if(window[FLAG]||starting)return;
    const ready=window.EFC_CERTIFICATES_V13?.ready&&typeof students!=='undefined'&&typeof saveStudents==='function'&&typeof receiptModelV4==='function'&&typeof allPayments==='function';
    if(!ready){setTimeout(boot,25);return;}
    starting=true;initialize().catch(error=>{starting=false;console.error('EFC receipt/identity sequence initialization failed.',error);setTimeout(boot,250);});
  }

  boot();
})();