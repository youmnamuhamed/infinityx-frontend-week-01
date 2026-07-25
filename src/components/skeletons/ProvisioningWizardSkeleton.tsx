// src/components/compound/ProvisioningWizard/ProvisioningWizardSkeleton.tsx

export function ProvisioningWizardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div role="status" className="sr-only">
        Loading provisioning wizard…
      </div>
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        <div className="mb-8 flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-3 last:flex-none">
              <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200" />
              {i < 3 && <div className="h-px flex-1 bg-slate-100" />}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 h-4 w-32 rounded bg-slate-200" />
          <div className="space-y-6">
            <div className="h-10 rounded-md bg-slate-100" />
            <div className="h-10 rounded-md bg-slate-100" />
            <div className="h-10 rounded-md bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}