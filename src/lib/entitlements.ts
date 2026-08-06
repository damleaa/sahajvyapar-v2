import type { PlanType } from '@/types'
export type Feature = 'basic_reports'|'customer_reports'|'profit_reports'|'exhibition_pnl'|'exhibition_comparison'|'stock_health'|'business_health'|'sahaj_insights'|'monthly_pdf'|'whatsapp_report'
const LEVEL: Record<PlanType,number>={starter:1,growth:2,pro:3}
const NEED: Record<Feature,number>={basic_reports:1,customer_reports:2,profit_reports:2,exhibition_pnl:2,exhibition_comparison:3,stock_health:3,business_health:3,sahaj_insights:3,monthly_pdf:3,whatsapp_report:3}
export function hasFeature(plan:PlanType, feature:Feature){return LEVEL[plan]>=NEED[feature]}
export const PLAN_PROMISE={starter:'Record my business',growth:'Understand my business',pro:'Improve my business'} as const
