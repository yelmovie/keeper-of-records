/** JSON 데이터 로더 — 진입 시 lazy load, 중복 로드 캐시 */
import { AssetMap } from '../config/AssetMap';
import type {
  CaseCatalogEntry,
  CaseData,
  HistoricalClaim,
  OrganizationData,
  PersonData,
} from './schemas';

const cache = new Map<string, unknown>();

async function fetchJSON<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`데이터를 불러오지 못했습니다: ${path} (${res.status})`);
  }
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

let claimMap: Map<string, HistoricalClaim> = new Map();

export async function loadClaims(): Promise<Map<string, HistoricalClaim>> {
  if (claimMap.size > 0) return claimMap;
  const list = await fetchJSON<HistoricalClaim[]>(AssetMap.data.claims);
  claimMap = new Map(list.map((c) => [c.id, c]));
  return claimMap;
}

/** 동기 접근 — loadClaims() 이후에만 사용 */
export function getClaims(): Map<string, HistoricalClaim> {
  return claimMap;
}

export function loadCatalog(): Promise<CaseCatalogEntry[]> {
  return fetchJSON<CaseCatalogEntry[]>(AssetMap.data.catalog);
}

export function loadPeople(): Promise<PersonData[]> {
  return fetchJSON<PersonData[]>(AssetMap.data.people);
}

export function loadOrganizations(): Promise<OrganizationData[]> {
  return fetchJSON<OrganizationData[]>(AssetMap.data.organizations);
}

/** track(인물 id)이 있으면 그 인물의 트랙 파일을, 없으면 단일 케이스 파일을 읽는다 */
export function loadCase(id: string, track?: string): Promise<CaseData> {
  return fetchJSON<CaseData>(
    track ? AssetMap.data.caseTrack(id, track) : AssetMap.data.case(id),
  );
}
