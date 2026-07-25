import { z } from "zod";

export const generalInfoSchema = z.object({
  clusterName: z
    .string()
    .min(3, "Cluster name must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed",
    ),
  environment: z.enum(["dev", "staging", "production"]),
  region: z.string().min(1, "Please select a region"),
});

// Zod can generate a TypeScript type FROM the schema, so we never
// have to write the type by hand and risk it drifting out of sync.
export type GeneralInfoData = z.infer<typeof generalInfoSchema>;

const networkTopologyBaseSchema = z.object({
  vpcType: z.enum(["default", "custom"]),
  // subnetCidr is optional at the "shape" level — superRefine will
  // decide when it's ACTUALLY required.
  subnetCidr: z.string().optional(),
  publicGatewayEnabled: z.boolean(),
});

export const networkTopologySchema = networkTopologyBaseSchema.superRefine(
  (data, ctx) => {
    if (data.vpcType === "custom") {
      // No subnet entered at all
      if (!data.subnetCidr || data.subnetCidr.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Subnet CIDR is required for a custom VPC",
          path: ["subnetCidr"], // tells the form WHICH field to show the error under
        });
        return;
      }
      // Basic CIDR shape check, e.g. "10.0.0.0/24"
      const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrPattern.test(data.subnetCidr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Subnet CIDR must look like 10.0.0.0/24",
          path: ["subnetCidr"],
        });
      }
    }
  },
);

export type NetworkTopologyData = z.infer<typeof networkTopologyBaseSchema>;

const securityBaseFields = {
  iamRoleName: z.string().min(3, "IAM role name is required"),
  allowedPorts: z.array(z.number()).min(1, "At least one port must be open"),
};

export function buildSecuritySchema(networkContext: NetworkTopologyData) {
  return z.object({
    ...securityBaseFields,

    publicFirewallRule: networkContext.publicGatewayEnabled
      ? z
          .string()
          .min(
            1,
            "A firewall rule is required when a public gateway is enabled",
          )
      : z.string().optional(),
  });
}

export type SecurityData = z.infer<ReturnType<typeof buildSecuritySchema>>;

async function checkClusterNameAvailable(name: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const takenNames = ["prod-cluster", "main-cluster", "test"];
  return !takenNames.includes(name);
}

export const generalInfoSchemaWithAsyncCheck = generalInfoSchema.extend({
  clusterName: generalInfoSchema.shape.clusterName.refine(
    checkClusterNameAvailable,
    { message: "This cluster name is already taken" },
  ),
});

export function buildMasterSchema(networkContext: NetworkTopologyData) {
  return z.object({
    general: generalInfoSchemaWithAsyncCheck,
    network: networkTopologySchema,
    security: buildSecuritySchema(networkContext),
  });
}
