import api, { unwrapArray, unwrapData, type ApiRequestConfig, type QueryParams } from "./apiClient";

export type AnyRecord = Record<string, any>;

export type DepartmentNode = AnyRecord & {
  Object_Rel_Idn?: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
};

export type AssetItem = AnyRecord & {
  _Idn?: number;
  id?: number | string;
  Object_Root_Idn?: number;
  MDM_Asset_Idn?: number;
  Object_Agent?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  DeviceName?: string;
  PlatformType?: string;
  ConnectionStatus?: string;
  IP?: string;
  Object_Full_Name?: string;
  Object_Rel_Name?: string;
  Object_Rel_Idn?: number | string;
  Object_PR_Idn?: number | string;
};

export async function getDepartments(config: ApiRequestConfig = {}) {
  const payload = await api.get("/api/departments", { cacheTtlMs: 300_000, ...config });
  return unwrapData<DepartmentNode[]>(payload, []);
}

export async function getDepartmentChildren(parentID: number | string, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/departments/${parentID}`, { cacheTtlMs: 180_000, ...config });
  return unwrapData<{ departments?: DepartmentNode[]; assets?: AssetItem[] }>(payload, { departments: [], assets: [] });
}

export async function getAssetsByRelationID(relationID: number | string, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/assets/${relationID}`, { cacheTtlMs: 180_000, ...config });
  return unwrapArray<AssetItem>(payload);
}

export async function getAssets(params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get("/api/assets", { cacheTtlMs: 120_000, ...config, params });
  return unwrapArray<AssetItem>(payload);
}

export async function getHardwareInventoryAssets(params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get("/api/hardware-inventory/assets", { cacheTtlMs: 180_000, ...config, params });
  return unwrapArray<AssetItem>(payload);
}

export async function getAssetDetail(objectAgent: string, assetId: number | string, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/asset/${encodeURIComponent(objectAgent)}/${encodeURIComponent(String(assetId))}`, { cacheTtlMs: 120_000, ...config });
  return unwrapData<AnyRecord>(payload, {});
}

export async function moveAssetDepartment(objectAgent: string, assetId: number | string, relationID: number | string) {
  const payload = await api.put(`/api/assets/${encodeURIComponent(objectAgent)}/${encodeURIComponent(String(assetId))}/department`, { relationID });
  return unwrapData<AnyRecord>(payload, {});
}

const commonService = {
  getDepartments,
  getDepartmentChildren,
  getAssets,
  getHardwareInventoryAssets,
  getAssetsByRelationID,
  getAssetDetail,
  moveAssetDepartment,
};

export default commonService;
