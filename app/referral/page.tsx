import { redirect } from "next/navigation";

/**
 * The welcome email links to /referral (singular). The invite UI lives at
 * /referrals, so this keeps the emailed link working without duplicating it.
 */
export default function ReferralRedirectPage() {
  redirect("/referrals");
}
