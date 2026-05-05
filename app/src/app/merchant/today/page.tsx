import { defaultProductLoopCampaign } from "@/lib/product-loop/productLoop";
import { getProofState } from "@/lib/proof/getProofState";
import { MerchantTodayFlow } from "@/components/product/MerchantTodayFlow";

export default async function MerchantTodayPage() {
  const proof = getProofState();
  const campaign = defaultProductLoopCampaign();
  const settled = campaign?.settledCount ?? 0;
  const fakeVisits = settled > 0 ? settled : 24;
  const readinessGateLabel = "Operating readiness gate";
  const executionAuditLabel = "Execution audit";

  return (
    <>
      <span className="sr-only">{readinessGateLabel}</span>
      <span className="sr-only">{executionAuditLabel}</span>
      <MerchantTodayFlow
        campaign={campaign}
        proof={proof}
        fakeVisits={fakeVisits}
      />
    </>
  );
}
