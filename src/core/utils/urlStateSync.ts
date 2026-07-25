export interface FieldUrlConfig {
  urlKey: string;
  sensitive: boolean;
}

export const URL_SYNCABLE_FIELDS: Record<string, FieldUrlConfig> = {
  currentStepId: { urlKey: "step", sensitive: false },
  vpcType: { urlKey: "vpc", sensitive: false },
  subnetCidr: { urlKey: "subnet", sensitive: false },
  environment: { urlKey: "env", sensitive: false },
  region: { urlKey: "region", sensitive: false },
};

export function serializeStateToParams(
  currentStepId: string,
  fieldValues: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();

  params.set("step", currentStepId);

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const config = URL_SYNCABLE_FIELDS[fieldName];

    if (!config || config.sensitive) continue;
    if (value === undefined || value === null || value === "") continue;

    const stringValue = String(value).replace(/\//g, "_");
    params.set(config.urlKey, stringValue);
  }

  return params;
}

export interface ParsedUrlState {
  stepId: string | null;
  fieldValues: Record<string, string>;
}

export function parseParamsToState(params: URLSearchParams): ParsedUrlState {
  const stepId = params.get("step");
  const fieldValues: Record<string, string> = {};

  const reverseMap = new Map<string, string>();
  for (const [fieldName, config] of Object.entries(URL_SYNCABLE_FIELDS)) {
    if (!config.sensitive) {
      reverseMap.set(config.urlKey, fieldName);
    }
  }

  for (const [urlKey, rawValue] of params.entries()) {
    const fieldName = reverseMap.get(urlKey);
    if (!fieldName) continue;
    fieldValues[fieldName] = rawValue.replace(/_/g, "/");
  }

  return { stepId, fieldValues };
}
