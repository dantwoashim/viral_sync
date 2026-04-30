import { getFeeModelFinalization, getLocationAnalytics, getLocationCampaignTargeting, getLocationHierarchy, getMultiLocationSimulation, getRegionalManagerRole, getStaffTransferRevocation, getWeeklyMultiLocationReview } from '@/lib/launch/server';

export default async function LocationsPage() {
  const hierarchy = await getLocationHierarchy();
  const targeting = getLocationCampaignTargeting();
  const analytics = await getLocationAnalytics();
  const staff = await getStaffTransferRevocation();
  const manager = getRegionalManagerRole();
  const simulation = await getMultiLocationSimulation();
  const review = await getWeeklyMultiLocationReview();
  const fees = getFeeModelFinalization();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Locations</div>
            <h1 className="surface-title">Org, merchant, locations, staff devices, and scoped campaigns.</h1>
            <p className="surface-subtitle">{hierarchy.org.name}: {simulation.locationsRun} locations. Review: {review.decision}.</p>
          </div>
        </div>
        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Location analytics</div>
            <div className="campaign-sequence">
              {analytics.map((row) => (
                <div className="campaign-sequence-step" key={row.locationId}><span>{row.redemptions}</span><div><strong>{row.label}</strong><p>Receipts {row.receipts}, ROI NPR {row.roiNpr}.</p></div></div>
              ))}
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Controls</div>
            <p className="sheet-copy" style={{ marginTop: 12 }}>Targeting: {targeting.mode}.</p>
            <p className="sheet-copy" style={{ marginTop: 12 }}>Staff transfer: {staff.transfer ? `${staff.transfer.from} to ${staff.transfer.to}` : 'no device'}.</p>
            <p className="sheet-copy" style={{ marginTop: 12 }}>Regional manager can access {manager.canAccess.join(', ')}.</p>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Fee model</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{fees.usageFee}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{fees.takeRate}</p>
        </section>
      </div>
    </div>
  );
}
