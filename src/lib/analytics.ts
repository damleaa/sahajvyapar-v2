export const money=(n:number)=>`₹${Math.round(n||0).toLocaleString('en-IN')}`
export function healthScore(x:{margin:number;overdue:number;revenue:number;slowStock:number;inventory:number}){
 let s=50; s+=Math.min(20,Math.max(-15,(x.margin-20)*.7));
 if(x.revenue>0)s-=Math.min(15,(x.overdue/x.revenue)*20);
 if(x.inventory>0)s-=Math.min(15,(x.slowStock/x.inventory)*15);
 return Math.max(0,Math.min(100,Math.round(s)))
}
export function stockStatus(stock:number,sold60:number){
 const monthly=sold60/2, cover=monthly>0?stock/monthly:stock>0?99:0;
 return {monthly,cover,status: sold60===0&&stock>0?'Dead':cover>6?'Slow Moving':cover<.75?'Low Stock':'Healthy'}
}
