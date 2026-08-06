import { createClient } from '@/lib/supabase/server'
import { healthScore, stockStatus } from './analytics'
export async function reportData(tenantId:string){
 const db=await createClient(); const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth(),1).toISOString(); const d60=new Date(Date.now()-60*864e5).toISOString();
 const [sales,items,products,customers,expenses,exhibitions]=await Promise.all([
  db.from('sales').select('id,final_amount,customer_name,created_at,exhibition_id').eq('tenant_id',tenantId).gte('created_at',start),
  db.from('sale_items').select('sale_id,product_id,product_name,quantity,total_price,cost_price,sales!inner(tenant_id,created_at)').eq('sales.tenant_id',tenantId),
  db.from('products').select('id,name,stock_quantity,cost_price,selling_price').eq('tenant_id',tenantId).eq('is_active',true),
  db.from('customers').select('id,name,credit_balance').eq('tenant_id',tenantId),
  db.from('expenses').select('amount,category,expense_date,exhibition_id').eq('tenant_id',tenantId).gte('expense_date',start.slice(0,10)),
  db.from('exhibitions').select('*').eq('tenant_id',tenantId)
 ]);
 const monthSales=sales.data||[], allItems=(items.data||[]) as any[]; const revenue=monthSales.reduce((a:any,s:any)=>a+Number(s.final_amount),0); const saleIds=new Set(monthSales.map((s:any)=>s.id));
 const monthItems=allItems.filter((i:any)=>saleIds.has(i.sale_id)); const cogs=monthItems.reduce((a:any,i:any)=>a+Number(i.cost_price||0)*Number(i.quantity),0); const exp=(expenses.data||[]).reduce((a:any,e:any)=>a+Number(e.amount),0); const profit=revenue-cogs-exp; const margin=revenue?profit/revenue*100:0;
 const overdue=(customers.data||[]).reduce((a:any,c:any)=>a+Number(c.credit_balance||0),0); const sold60:Record<string,number>={}; allItems.filter((i:any)=>new Date(i.sales?.created_at)>=new Date(d60)).forEach((i:any)=>sold60[i.product_id]=(sold60[i.product_id]||0)+Number(i.quantity));
 const stock=(products.data||[]).map((p:any)=>({...p,value:Number(p.stock_quantity)*Number(p.cost_price),...stockStatus(Number(p.stock_quantity),sold60[p.id]||0)})); const inventory=stock.reduce((a:any,p:any)=>a+p.value,0); const slowStock=stock.filter((p:any)=>['Slow Moving','Dead'].includes(p.status)).reduce((a:any,p:any)=>a+p.value,0);
 const productMap:Record<string,any>={}; monthItems.forEach((i:any)=>{const k=i.product_name||'Unknown'; const q=Number(i.quantity),r=Number(i.total_price),c=Number(i.cost_price||0)*q; productMap[k]??={name:k,revenue:0,cogs:0,qty:0}; productMap[k].revenue+=r;productMap[k].cogs+=c;productMap[k].qty+=q}); const productsPerf=Object.values(productMap).map((p:any)=>({...p,profit:p.revenue-p.cogs,margin:p.revenue?(p.revenue-p.cogs)/p.revenue*100:0})).sort((a:any,b:any)=>b.profit-a.profit);
 const exhibitionPerf=(exhibitions.data||[]).map((e:any)=>{const rs=monthSales.filter((s:any)=>s.exhibition_id===e.id); const rev=rs.reduce((a:any,s:any)=>a+Number(s.final_amount),0); const costs=['stall_cost','other_expenses','transport_cost','staff_cost','food_cost','marketing_cost'].reduce((a,k)=>a+Number(e[k]||0),0)+(expenses.data||[]).filter((x:any)=>x.exhibition_id===e.id).reduce((a:any,x:any)=>a+Number(x.amount),0); const pr=rev-costs; return {...e,revenue:rev,costs,profit:pr,roi:costs?pr/costs*100:0}}).sort((a:any,b:any)=>b.roi-a.roi);
 const score=healthScore({margin,overdue,revenue,slowStock,inventory});
 const insights:string[]=[]; if(overdue>0)insights.push(`₹${Math.round(overdue).toLocaleString('en-IN')} customer payments are outstanding.`); if(slowStock>0)insights.push(`₹${Math.round(slowStock).toLocaleString('en-IN')} is blocked in slow/dead stock.`); if(productsPerf[0])insights.push(`${productsPerf[0].name} is your strongest product by profit this month.`); if(exhibitionPerf[0]?.revenue>0)insights.push(`${exhibitionPerf[0].name} has the best exhibition ROI at ${exhibitionPerf[0].roi.toFixed(0)}%.`); if(margin>0)insights.push(`Estimated net margin this month is ${margin.toFixed(1)}%.`);
 return {revenue,cogs,expenses:exp,profit,margin,overdue,inventory,slowStock,score,salesCount:monthSales.length,stock,productsPerf,exhibitionPerf,insights};
}
