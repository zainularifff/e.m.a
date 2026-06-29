import api, { unwrapArray, unwrapData, type ApiRequestConfig, type QueryParams } from "./apiClient";
import { getAssetsByRelationID, getDepartments, type AnyRecord } from "./commonService";

const SOFTWARE_LIST_CACHE_TTL_MS = 180_000;
const SOFTWARE_LOOKUP_CACHE_TTL_MS = 120_000;
const SOFTWARE_STATIC_CACHE_TTL_MS = 300_000;

function getConfig(params?: QueryParams, config: ApiRequestConfig = {}, cacheTtlMs = SOFTWARE_LOOKUP_CACHE_TTL_MS): ApiRequestConfig {
  return {
    cacheTtlMs,
    ...config,
    params,
  };
}

export async function getSoftware(params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get("/api/software", getConfig(params, config, SOFTWARE_LIST_CACHE_TTL_MS));
  return unwrapArray<AnyRecord>(payload);
}

export async function getSoftwareCategories(config: ApiRequestConfig = {}) {
  const payload = await api.get("/api/software/categories", {
    cacheTtlMs: SOFTWARE_STATIC_CACHE_TTL_MS,
    ...config,
  });
  return unwrapArray<string>(payload);
}

export async function getSoftwareByRelation(relationID: number | string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/${relationID}`, getConfig(params, config));
  return unwrapArray<AnyRecord>(payload);
}

export async function getInstalledSoftwareByRelation(relationID: number | string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/relation/${relationID}/installed`, getConfig(params, config));
  return unwrapData(payload, payload);
}

export async function getSoftwarePackagesByRelation(relationID: number | string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/relation/${relationID}/packages`, getConfig(params, config));
  return unwrapData(payload, payload);
}

export async function getSoftwareFilesByRelation(relationID: number | string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/relation/${relationID}/files`, getConfig(params, config));
  return unwrapData(payload, payload);
}

export async function getSoftwareByClient(clientID: number | string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/client/${clientID}`, getConfig(params, config));
  return unwrapData(payload, payload);
}

export async function getSoftwareByMdmDevice(deviceID: string, params?: QueryParams, config: ApiRequestConfig = {}) {
  const payload = await api.get(`/api/software/mdm/${encodeURIComponent(deviceID)}`, getConfig(params, config));
  return unwrapData(payload, payload);
}

export async function createSoftwareInventoryScan(payload: AnyRecord) {
  const response = await api.post("/api/software-inventory/scan", payload);
  return unwrapData(response, response);
}

export async function loadInitialData(config: ApiRequestConfig = {}) {
  const [software, categories] = await Promise.all([
    getSoftware(undefined, config),
    getSoftwareCategories(config),
  ]);
  return { software, categories };
}

export default {
  getSoftware,
  getSoftwareCategories,
  getDepartments,
  getAssetsByRelationID,
  getSoftwareByRelation,
  getInstalledSoftwareByRelation,
  getSoftwarePackagesByRelation,
  getSoftwareFilesByRelation,
  getSoftwareByClient,
  getSoftwareByMdmDevice,
  createSoftwareInventoryScan,
  loadInitialData,
};
