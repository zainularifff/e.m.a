import api, { unwrapData, type QueryParams } from "./apiClient";
import { getAssetsByRelationID, getDepartments, type AssetItem, type DepartmentNode } from "./commonService";

export { getAssetsByRelationID, getDepartments };
export type { AssetItem, DepartmentNode };

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  totalRecords?: number;
  page?: number;
  limit?: number;
  message?: string;
  error?: string;
};

export type DepartmentWithAssetsResponse = {
  departments: DepartmentNode[];
  assets: AssetItem[];
};

export type OnlinePatchStatusFilter = "all" | "missing" | "installed" | "downloaded" | "failed" | string;
export type OnlinePatchQueryParams = QueryParams & { page?: number; limit?: number; search?: string; q?: string; severity?: string; status?: OnlinePatchStatusFilter };
export type OnlinePatchScopeParams = QueryParams & {
  scope?: "all" | "relation" | "device" | string;
  Object_Rel_Idn?: number;
  Object_Root_Idn?: number;
  objectRelIdn?: number;
  objectRootIdn?: number;
  relationID?: number;
  relationId?: number;
  objectAgent?: string;
  objectDeviceID?: string;
};
export type OnlinePatchSummary = Record<string, any>;
export type OnlinePatchRow = Record<string, any>;
export type OnlinePatchDetail = Record<string, any>;

const cleanParams = <T extends Record<string, any>>(params?: T) => {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
};

const normalizeScopeParams = (params?: OnlinePatchScopeParams) => cleanParams({
  ...(params || {}),
  scope: params?.scope,
  Object_Root_Idn: params?.Object_Root_Idn ?? params?.objectRootIdn,
  Object_Rel_Idn: params?.Object_Rel_Idn ?? params?.objectRelIdn ?? params?.relationID ?? params?.relationId,
});

const normalizeQueryParams = (params?: OnlinePatchQueryParams & OnlinePatchScopeParams) => cleanParams({
  ...(normalizeScopeParams(params) || {}),
  search: params?.search ?? params?.q,
  severity: params?.severity,
  status: params?.status,
  page: params?.page,
  limit: params?.limit,
});

export async function getDepartmentChildren(parentID: number): Promise<DepartmentWithAssetsResponse> {
  const payload = await api.get(`/api/departments/${encodeURIComponent(String(parentID))}`);
  return unwrapData<DepartmentWithAssetsResponse>(payload, { departments: [], assets: [] });
}

export async function getOnlinePatchSummary(params?: OnlinePatchScopeParams) {
  const payload = await api.get("/api/patch/online/summary", { params: normalizeScopeParams(params) });
  return unwrapData<OnlinePatchSummary>(payload, {});
}

export async function getOnlinePatchStatus(params?: OnlinePatchQueryParams & OnlinePatchScopeParams) {
  const payload = await api.get("/api/patch/online/status", { params: normalizeQueryParams(params) });
  return unwrapData(payload, payload) as { rows?: OnlinePatchRow[]; data?: OnlinePatchRow[]; totalRecords?: number; page?: number; limit?: number; totalPages?: number };
}

export async function getOnlinePatchCatalog(params?: OnlinePatchQueryParams) {
  const payload = await api.get("/api/patch/online/catalog", { params: normalizeQueryParams(params) });
  return unwrapData(payload, payload) as { rows?: OnlinePatchRow[]; data?: OnlinePatchRow[]; totalRecords?: number; page?: number; limit?: number; totalPages?: number };
}

export async function getOnlinePatchDetail(updateID: number | string, revisionNumber: number | string) {
  const payload = await api.get(`/api/patch/online/updates/${encodeURIComponent(String(updateID))}/${encodeURIComponent(String(revisionNumber))}`);
  return unwrapData<OnlinePatchDetail>(payload, {});
}

export async function getOnlinePatchFiles(updateID: number | string, revisionNumber: number | string) {
  const payload = await api.get(`/api/patch/online/updates/${encodeURIComponent(String(updateID))}/${encodeURIComponent(String(revisionNumber))}/files`);
  return unwrapData<Record<string, any>[]>(payload, []);
}

export async function prepareOnlinePatchInstall(payload: Record<string, any>) {
  const response = await api.post("/api/patch/online/install", payload);
  return unwrapData(response, response);
}

export async function createOnlinePatchScanJob(payload: OnlinePatchScopeParams) {
  const response = await api.post("/api/patch/online/scan", normalizeScopeParams(payload));
  return unwrapData(response, response);
}

export const prepareOnlinePatchRescan = createOnlinePatchScanJob;

export async function loadInitialData() {
  const [departments, summary] = await Promise.all([getDepartments(), getOnlinePatchSummary({ scope: "all" })]);
  return { departments, summary };
}

/*
|--------------------------------------------------------------------------
| Software Distribution / Offline Patching APIs
|--------------------------------------------------------------------------
| Target selection intentionally reuses the existing shared inventory APIs:
|   GET /api/departments
|   GET /api/assets/:relationID
|
| There is no /api/software-distribution/targets endpoint. Deployment targets
| are converted on the frontend into the target[] payload accepted by:
|   POST /api/software-distribution/send
|
| Supported backend target type:
|   1 = Object_Full_Name / department
|   2 = Object_DeviceID / device
|   3 = Server_Object_DeviceID
|--------------------------------------------------------------------------
*/

export interface SoftwareDistributionPackage {
  id?: string | number;
  pkg_Idn?: number;
  Pkg_Idn?: number;
  name?: string;
  pkg_Name?: string;
  Pkg_Name?: string;
  version?: string | number;
  pkg_Version?: number;
  Pkg_Version?: number;
  description?: string;
  Pkg_Info?: string;
  registeredDate?: string;
  Pkg_ChangedDate?: string;
  fileCount?: number;
  FileCount?: number;
  sizeBeforeCompression?: string | number;
  SizeBeforeCompression?: string | number;
  sizeAfterCompression?: string | number;
  SizeAfterCompression?: string | number;
  excludeOS?: number;
  Exclude?: number;
  remoteExecuteFile?: number;
  RemoteExecuteFile?: number;
  state?: "New" | "Old" | string;
  versions?: string[];
  AllVersions?: string;
  Pkg_OS?: string;
  Pkg_ListFile?: string;
  Pkg_bDeleted?: number;
  Flag?: number;
  Pkg_Owner?: number;
  files?: SoftwareDistributionFile[];
  raw?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SoftwareDistributionFile {
  Pkg_File_Idn?: number;
  Pkg_Idn?: number;
  Pkg_File_Name?: string;
  Pkg_File_Version?: string;
  Pkg_File_OSize?: number;
  Pkg_File_ZSize?: number;
  Pkg_File_CmdLine?: string;
  Pkg_File_Execute?: number;
  Pkg_File_CTDir?: string;
  [key: string]: unknown;
}

export type SoftwareDistributionPackageFile = SoftwareDistributionFile;
export type SoftwareDistributionPackageDetail = SoftwareDistributionPackage;

export interface SendPackageTarget {
  type: 1 | 2 | 3 | number;
  value: string;
}

export interface SoftwareDistributionSendPayload {
  Pkg_Name?: string;
  pkg_Name?: string;
  pkgName?: string;
  packageName?: string;
  Pkg_Owner?: number;
  pkg_Owner?: number;
  pkgOwner?: number;
  Job_Style?: 0 | 3 | number;
  job_Style?: 0 | 3 | number;
  jobStyle?: 0 | 3 | number;
  distribution_option?: 0 | 1 | number | string;
  Job_StartTime?: string;
  job_StartTime?: string;
  jobStartTime?: string;
  Job_EndTime?: string;
  job_EndTime?: string;
  jobEndTime?: string;
  Job_ScheduleTime?: string;
  job_ScheduleTime?: string;
  jobScheduleTime?: string;
  Job_Priority?: number;
  job_Priority?: number;
  jobPriority?: number;
  Job_Description?: string;
  job_Description?: string;
  jobDescription?: string;
  target?: SendPackageTarget[];
  targets?: SendPackageTarget[];
  [key: string]: unknown;
}

export interface JobStatusPayload {
  objectDeviceID: string;
  jobIdn: number;
  jobStatus: string;
  packageFile?: string;
}

export type SoftwareDistributionJob = {
  Job_Idn?: number;
  Job_Type?: number;
  Job_Command?: number;
  Job_Status?: number;
  Job_Style?: number;
  Pkg_Name?: string;
  Pkg_Version?: number;
  [key: string]: unknown;
};

const isFormData = (value: unknown): value is FormData => typeof FormData !== "undefined" && value instanceof FormData;

const appendFormValue = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendFormValue(formData, key, item));
    return;
  }
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
};

const toFormData = (payload: FormData | Record<string, unknown>): FormData => {
  if (isFormData(payload)) return payload;
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => appendFormValue(formData, key, value));
  return formData;
};

export async function getSoftwareDistributionPackages(params?: { search?: string; q?: string; owner?: number; Pkg_Owner?: number; deleted?: number }) {
  const payload = await api.get("/api/software-distribution/packages", {
    params: cleanParams({
      search: params?.search ?? params?.q,
      owner: params?.owner ?? params?.Pkg_Owner,
      deleted: params?.deleted,
    }),
  });
  return unwrapData(payload, payload) as ApiResponse<SoftwareDistributionPackage[]>;
}

export async function getSoftwareDistributionPackage(pkgName: string, version?: number) {
  const payload = await api.get(`/api/software-distribution/packages/${encodeURIComponent(pkgName)}`, {
    params: cleanParams({ version }),
  });
  return unwrapData(payload, payload) as ApiResponse<SoftwareDistributionPackageDetail>;
}

export const getSoftwareDistributionPackageDetail = getSoftwareDistributionPackage;

export async function getSoftwareDistributionPackageFiles(pkgName: string, version?: number) {
  const detail = await getSoftwareDistributionPackage(pkgName, version);
  const packageData = (detail as any).data || detail;
  const files = packageData.files || [];
  return {
    success: Boolean((detail as any).success ?? true),
    message: (detail as any).message,
    data: files,
    totalRecords: files.length,
  } as ApiResponse<SoftwareDistributionFile[]>;
}

export async function createSoftwareDistributionPackage(payload: FormData | Record<string, unknown>) {
  const response = await api.post("/api/software-distribution/packages", toFormData(payload));
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function createSoftwareDistributionWebloader(payload: FormData | Record<string, unknown>) {
  const response = await api.post("/api/software-distribution/webloader", toFormData(payload));
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function deleteSoftwareDistributionPackage(pkgNameOrPayload: string | { Pkg_Name?: string; pkgName?: string; packageName?: string; [key: string]: unknown }) {
  const pkgName = typeof pkgNameOrPayload === "string"
    ? pkgNameOrPayload
    : String(pkgNameOrPayload.Pkg_Name || pkgNameOrPayload.pkgName || pkgNameOrPayload.packageName || "");

  if (pkgName) {
    const response = await api.delete(`/api/software-distribution/packages/${encodeURIComponent(pkgName)}`);
    return unwrapData(response, response) as ApiResponse<unknown>;
  }

  const response = await api.delete("/api/software-distribution/packages", { data: pkgNameOrPayload });
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function sendSoftwareDistributionPackage(payload: SoftwareDistributionSendPayload) {
  const targets = (payload.target || payload.targets || [])
    .filter((target) => String(target.value || "").trim() !== "")
    .map((target) => ({
      type: target.type,
      value: String(target.value).trim(),
    }));

  const apiPayload = {
    ...payload,
    Pkg_Name: payload.Pkg_Name || payload.pkg_Name || payload.pkgName || payload.packageName || "",
    Pkg_Owner: payload.Pkg_Owner ?? payload.pkg_Owner ?? payload.pkgOwner ?? 1,
    Job_Style: payload.Job_Style ?? payload.job_Style ?? payload.jobStyle ?? 0,
    distribution_option: payload.distribution_option ?? 0,
    Job_StartTime: payload.Job_StartTime || payload.job_StartTime || payload.jobStartTime || "",
    Job_EndTime: payload.Job_EndTime || payload.job_EndTime || payload.jobEndTime || "",
    Job_ScheduleTime: payload.Job_ScheduleTime || payload.job_ScheduleTime || payload.jobScheduleTime || "",
    Job_Priority: payload.Job_Priority ?? payload.job_Priority ?? payload.jobPriority ?? 0,
    Job_Description: payload.Job_Description || payload.job_Description || payload.jobDescription || "",
    target: targets,
  };

  const response = await api.post("/api/software-distribution/send", apiPayload);
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function pullSoftwareDistributionPackage(objectDeviceID: string) {
  const response = await api.get(`/api/software-distribution/pull/${encodeURIComponent(objectDeviceID)}`);
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function getSoftwareDistributionPendingPackages(objectDeviceID: string) {
  const response = await api.get(`/api/software-distribution/client/${encodeURIComponent(objectDeviceID)}/pending`);
  return unwrapData(response, response) as ApiResponse<unknown[]>;
}

export async function updateSoftwareDistributionJobStatus(payload: Record<string, unknown>) {
  const response = await api.post("/api/software-distribution/job-status", payload);
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export async function getSoftwareDistributionJobStatus(params?: { jobIdn?: number; objectDeviceID?: string }) {
  const response = await api.get("/api/software-distribution/job-status", {
    params: cleanParams({ jobIdn: params?.jobIdn, objectDeviceID: params?.objectDeviceID }),
  });
  return unwrapData(response, response) as ApiResponse<unknown>;
}

export const getPendingSoftwareDistributionPackage = getSoftwareDistributionPendingPackages;

export async function downloadSoftwareDistributionFile(params: { pkgid: number; listfilename: string }) {
  const response = await api.get("/api/software-distribution/download", { params, responseType: "blob" });
  return (response as any).data ?? response;
}

export async function getSoftwareDistributionJobs(params?: { page?: number; limit?: number; status?: string | number; search?: string; q?: string }) {
  const response = await api.get("/api/software-distribution/jobs", {
    params: cleanParams({
      page: params?.page,
      limit: params?.limit,
      status: params?.status,
      search: params?.search ?? params?.q,
    }),
  });
  return unwrapData(response, response) as ApiResponse<SoftwareDistributionJob[]>;
}

// Common legacy aliases used by older PatchManagement/PatchDistribution screens.
export const getPackages = getSoftwareDistributionPackages;
export const getPackageDetail = getSoftwareDistributionPackage;
export const createPackage = createSoftwareDistributionPackage;
export const createWebloader = createSoftwareDistributionWebloader;
export const deletePackage = deleteSoftwareDistributionPackage;
export const sendPackage = sendSoftwareDistributionPackage;
export const pullPackage = pullSoftwareDistributionPackage;
export const getPendingPackages = getSoftwareDistributionPendingPackages;
export const updateJobStatus = updateSoftwareDistributionJobStatus;
export const getDistributionJobs = getSoftwareDistributionJobs;
export const getJobStatus = getSoftwareDistributionJobStatus;
export const getPendingPackage = getPendingSoftwareDistributionPackage;
export const downloadDistributionFile = downloadSoftwareDistributionFile;

export default {
  getDepartments,
  getDepartmentChildren,
  getAssetsByRelationID,
  getOnlinePatchSummary,
  getOnlinePatchStatus,
  getOnlinePatchCatalog,
  getOnlinePatchDetail,
  getOnlinePatchFiles,
  prepareOnlinePatchInstall,
  createOnlinePatchScanJob,
  prepareOnlinePatchRescan,
  loadInitialData,
  getSoftwareDistributionPackages,
  getSoftwareDistributionPackage,
  getSoftwareDistributionPackageDetail,
  getSoftwareDistributionPackageFiles,
  createSoftwareDistributionPackage,
  createSoftwareDistributionWebloader,
  deleteSoftwareDistributionPackage,
  sendSoftwareDistributionPackage,
  pullSoftwareDistributionPackage,
  getSoftwareDistributionPendingPackages,
  updateSoftwareDistributionJobStatus,
  getSoftwareDistributionJobStatus,
  getPendingSoftwareDistributionPackage,
  downloadSoftwareDistributionFile,
  getSoftwareDistributionJobs,
  getPackages,
  getPackageDetail,
  createPackage,
  createWebloader,
  deletePackage,
  sendPackage,
  pullPackage,
  getPendingPackages,
  updateJobStatus,
  getDistributionJobs,
  getJobStatus,
  getPendingPackage,
  downloadDistributionFile,
};
