// src/components/compound/dashboard/BillingMeter.tsx
import { getBillingMeter } from "@/core/utils/metrics";

interface BillingMeterProps {
  workspaceId: string;
}

export async function BillingMeter({ workspaceId }: BillingMeterProps) {
  const data = await getBillingMeter(workspaceId);
  const percentUsed = Math.round(
    (data.currentSpendUsd / data.projectedSpendUsd) * 100,
  );

  return (
    <div className="metric-card" aria-labelledby="billing-meter-title">
      <h2 id="billing-meter-title">Billing</h2>
      <p>
        ${data.currentSpendUsd.toFixed(2)} of $
        {data.projectedSpendUsd.toFixed(2)} projected
      </p>
      <div
        role="progressbar"
        aria-valuenow={percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Billing cycle spend"
        className="metric-card__track"
      >
        <div
          className="metric-card__bar"
          style={{ width: `${percentUsed}%` }}
        />
      </div>
    </div>
  );
}
