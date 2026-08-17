export const PRO_MONTHLY_PRICE_INR = parseInt(process.env.PRO_MONTHLY_PRICE_INR || "59", 10);
export const ADVANCED_MONTHLY_PRICE_INR = parseInt(process.env.ADVANCED_MONTHLY_PRICE_INR || "99", 10);
export const PREMIUM_MONTHLY_PRICE_INR = parseInt(process.env.PREMIUM_MONTHLY_PRICE_INR || "149", 10);
export const BUSINESS_MONTHLY_PRICE_INR = parseInt(process.env.BUSINESS_MONTHLY_PRICE_INR || "299", 10);

export const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  PRO: PRO_MONTHLY_PRICE_INR,
  ADVANCED: ADVANCED_MONTHLY_PRICE_INR,
  PREMIUM: PREMIUM_MONTHLY_PRICE_INR,
  BUSINESS: BUSINESS_MONTHLY_PRICE_INR,
};

export const FREE_CREDITS_DEFAULT = 3;
export const CURRENCY_DEFAULT = "INR";

export const RAZORPAY_PLAN_IDS: Record<string, string | undefined> = {
  FREE: undefined,
  PRO: process.env.RAZORPAY_PRO_PLAN_ID || "plan_test_pro_59",
  ADVANCED: process.env.RAZORPAY_ADVANCED_PLAN_ID || "plan_test_adv_99",
  PREMIUM: process.env.RAZORPAY_PREMIUM_PLAN_ID || "plan_test_prem_149",
  BUSINESS: process.env.RAZORPAY_BUSINESS_PLAN_ID || "plan_test_biz_299",
};
