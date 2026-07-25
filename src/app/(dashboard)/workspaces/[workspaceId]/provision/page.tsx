// src/app/(dashboard)/workspaces/[workspaceId]/provision/page.tsx
import { Suspense } from "react";
import { WizardContainer } from "@/components/compound/ProvisioningWizard/WizardConatiner";
import { ProvisioningWizardSkeleton } from "@/components/skeletons/ProvisioningWizardSkeleton";
interface ProvisionPageProps {
  // Next.js 15+: params is a Promise you await below.
  // On Next.js 14, change this to `{ workspaceId: string }` and drop the `await`.
  params: Promise<{ workspaceId: string }>;
}

export const metadata = {
  title: "Provision a cluster",
};

export default async function ProvisionPage({ params }: ProvisionPageProps) {
  const { workspaceId } = await params;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-8 w-full max-w-2xl">
        <h1 className="text-lg font-semibold text-slate-900">
          Provision a new cluster
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure network, security, and IAM settings for this workspace.
        </p>
      </div>

      {/*
        WizardContainer calls useSearchParams(), which opts this subtree out
        of static rendering. Suspense is what lets the rest of the page (and
        the surrounding dashboard layout/sidebar) render normally while this
        part streams in as dynamic — without it, Next throws a build error.
      */}
      <Suspense fallback={<ProvisioningWizardSkeleton />}>
        <WizardContainer workspaceId={workspaceId} />
      </Suspense>
    </main>
  );
}
