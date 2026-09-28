(()=>{
'use strict';
if(window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready)return;
const D=window.EFC_DOMAIN_V13,sequence=window.EFC_RECEIPT_SEQUENCES_V10;
if(!D?.studentLifecycleV20||!window.EFC_STUDENT_UI_V13?.ready||!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)throw new Error('Student lifecycle UI v20 loaded before lifecycle/student/registration UI.');

const baseOpenStudent=window.openStudent;
const canEditStudents=()=>window.EFC_AUTH_V13?.canEdit?.('students')??true;
const isMonthly=student=>Boolean(D.isDynamicMonthly?.(student)||student?.snapshot?.billing==='monthly');
const studentById=id=>students.find(item=>String(item?.id||'')===String(id||''));
const fieldByLabel=(root,label)=>[...root.querySelectorAll('.student-profile-field-v3')].find(field=>String(field.querySelector('small')?.textContent||'').trim()===label)||null;

function patchMonthlyEnd(modal,student){
  if(!modal||!isMonthly(student))return;const end=D.monthlyCoverageEnd?.(student)||'';
  const primary=fieldByLabel(modal,'نهاية الدورة');if(primary){const label=primary.querySelector('small'),value=primary.querySelector('b');if(label)label.textContent='نهاية الشهر';if(value)value.textContent=D.showDate(end);}
  const approved=fieldByLabel(modal,'تاريخ النهاية المعتمد');if(approved){const label=approved.querySelector('small'),value=approved.querySelector('b');if(label)label.textContent='نهاية الشهر المعتمد';if(value)value.textContent=D.showDate(end);}
  const kpis=modal.querySelector('.student-kpis');if(kpis){const endCard=[...kpis.children].find(card=>String(card.querySelector('small')?.textContent||'').trim()==='النهاية');if(endCard){const label=endCard.querySelector('small'),value=endCard.querySelector('b');if(label)label.textContent='نهاية الشهر';if(value)value.textContent=D.showDate(end);}}
}
function beginStudentInfoEdit(student,modal){
  if(!student)return;if(!canEditStudents())return alert('الحساب الحالي لا يملك صلاحية تعديل بيانات الطلاب.');
  const api=window.EFC_BEGIN_REGISTRATION_EDIT_V17;if(typeof api!=='function')return alert('تعذر فتح تعديل بيانات الطالب.');
  modal?.remove();api({studentId:String(student.id||''),paymentIndex:null,registrationReceipt:false,statement:false,editableReceipt:true,receipt:''});
}
async function deleteStudent(student,modal){
  if(!student)return;if(!canEditStudents())return alert('الحساب الحالي لا يملك صلاحية حذف الطلاب.');
  const payments=Array.isArray(student.payments)?student.payments:[],total=D.paymentTotal?.(student)||0,reusable=D.registrationNumberWillBeReusable?.(student)===true,reg=String(student.reg??'').padStart(4,'0');
  const numberMessage=reusable?`رقم السجل ${reg} هو آخر رقم في هذا المركز والدورة، لذلك يمكن أن يأخذه التسجيل القادم إذا لم يصدر رقم بعده.`:`رقم السجل ${reg} سيبقى محجوزًا ولن يؤثر الحذف في الأرقام التي صدرت بعده.`;
  const message=`حذف الطالب نهائيًا سيحذف ملفه ودفعاته من البيانات الحالية.\nعدد الدفعات: ${payments.length} · إجمالي المدفوع: ${D.cash(total)}\n${numberMessage}\nالنسخ الاحتياطية القديمة لن تعيد الطالب بعد هذا الحذف.\n\nهل تريد المتابعة؟`;
  if(!window.confirm(message))return;
  try{await D.deleteStudentPermanently(student);modal?.remove();window.renderCurrentV13?.();}
  catch(error){alert(String(error?.message||error));}
}
function addLifecycleActions(modal,student){
  if(!modal||!student||!canEditStudents())return;
  const actions=modal.querySelector('.student-profile-actions-v3,.student-actions-v13');if(!actions||actions.querySelector('.student-edit-info-v20'))return;
  const edit=document.createElement('button');edit.type='button';edit.className='button secondary student-edit-info-v20';edit.textContent='تعديل بيانات الطالب';edit.onclick=()=>beginStudentInfoEdit(student,modal);
  const del=document.createElement('button');del.type='button';del.className='button student-delete-v20';del.textContent='حذف الطالب نهائيًا';del.onclick=()=>deleteStudent(student,modal);
  const close=actions.querySelector('.close');if(close){actions.insertBefore(edit,close);actions.insertBefore(del,close);}else actions.append(edit,del);
}
window.openStudent=function(id,mode='finance'){
  const result=baseOpenStudent(id,mode),student=studentById(id),modal=[...document.querySelectorAll('.modal')].at(-1);if(!student||!modal)return result;
  patchMonthlyEnd(modal,student);addLifecycleActions(modal,student);return result;
};

function installRegistrationNumberPreview(){
  const session=window.EFC_REGISTRATION_EDIT_V17?.current?.();if(!session?.student)return;
  const form=document.getElementById('regFormV13'),fixed=document.querySelector('.registration-reg-fixed-v17');if(!form||!fixed)return;
  let warning=form.querySelector('.registration-scope-warning-v20');if(!warning){warning=document.createElement('div');warning.className='registration-scope-warning-v20';warning.hidden=true;warning.textContent='تغيير المركز أو الدورة هنا يُعامل كتصحيح لنفس ملف الطالب؛ تبقى دفعاته مرتبطة بالملف بعد التصحيح. النقل الحقيقي إلى دورة جديدة يجب تسجيله كعملية مستقلة. ولا يسمح النظام بإعادة تصنيف حركات سنة مالية مقفلة.';form.querySelector('.registration-edit-actions-v17')?.insertAdjacentElement('beforebegin',warning);}
  const sync=()=>{
    const branch=String(form.elements.branch?.value||''),specialty=String(form.elements.specialty?.value||''),same=branch===String(session.student.branch||'')&&specialty===String(session.student.specialty||'');
    const number=same?Number(session.student.reg||0):Number(sequence.previewRegistrationNumber?.(branch,specialty)||0);fixed.textContent=number?String(number).padStart(4,'0'):'—';fixed.classList.toggle('is-auto-target-v20',!same);
    if(warning)warning.hidden=same;
  };
  form.elements.branch?.addEventListener('change',sync);form.elements.specialty?.addEventListener('change',sync);sync();
}
function enhanceRegistrationLifecycleV20(){installRegistrationNumberPreview();}

const style=document.createElement('style');style.textContent=`
.student-profile-actions-v3 .button,.student-actions-v13 .button{border:1.3px solid #17211e!important;box-shadow:0 4px 10px rgba(20,40,34,.06)!important}.student-profile-actions-v3 .close,.student-actions-v13 .close{background:#e7ecea!important;color:#263b35!important}.student-profile-actions-v3 .stop-student-v13,.student-actions-v13 .stop-student-v13{background:#ffe7af!important;color:#704d00!important}.student-profile-actions-v3 .open-finance-v13,.student-actions-v13 .pay-student-v13,.student-actions-v13 .prepay-next-v14{background:#0b705a!important;color:#fff!important}.student-delete-v20{background:#b63b3b!important;color:#fff!important;border-color:#17211e!important}.student-delete-v20:hover{background:#963030!important}.student-edit-info-v20{margin-inline-start:auto;background:#dbeeff!important;color:#174a71!important;border-color:#17211e!important}.registration-reg-fixed-v17.is-auto-target-v20{border-color:#17856b!important;background:#eefaf6!important;color:#075844!important}.registration-scope-warning-v20{margin:10px 0;padding:9px 11px;border:1px solid #e5c97a;border-radius:9px;background:#fff9e9;color:#70551f;font-size:9px;line-height:1.8}.registration-scope-warning-v20[hidden]{display:none!important}
`;document.head.appendChild(style);
window.EFC_STUDENT_LIFECYCLE_UI_V20=Object.freeze({ready:true,enhanceRegistration:enhanceRegistrationLifecycleV20,canonicalRegistrationEnhancer:true,monthlyEndShownInStudentFile:true,monthlyEndTracksLatestPaidCycle:true,studentInfoEditAction:true,studentPermanentDeleteAction:true,registrationNumberPreviewOnScopeChange:true,registrationNumberHintRemoved:true,scopeChangeExplainedAsCorrection:true,studentActionButtonsColored:true,studentActionButtonsDarkBorder:true});
})();