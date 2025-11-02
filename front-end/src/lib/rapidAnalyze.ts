import rawDataset from '@/data/rapid-analyze.json';

export interface RapidAnalyzeMedicine {
  brandName: string;
  genericName: string;
  aliases?: string[];
  commonStrengths: string[];
  dosageForms: string[];
  company: string;
  use: string;
  whyPrescribed: string;
  patientGuidance: string;
}

export interface RapidAnalyzeCategory {
  id: string;
  name: string;
  description: string;
  medicines: RapidAnalyzeMedicine[];
}

export interface RapidAnalyzeDataset {
  metadata: {
    version: string;
    lastUpdated: string;
  };
  categories: RapidAnalyzeCategory[];
}

export interface RapidAnalyzeGroup {
  key: string;
  genericName: string;
  normalizedGeneric: string;
  category: Pick<RapidAnalyzeCategory, 'id' | 'name' | 'description'>;
  medicines: RapidAnalyzeMedicine[];
}

export type RapidAnalyzeMatchType = 'brand' | 'generic' | 'partial' | 'none';

export interface RapidAnalyzeSearchResult {
  query: string;
  normalizedQuery: string;
  matchType: RapidAnalyzeMatchType;
  matchedBrand?: string;
  matchedGeneric?: string;
  groups: RapidAnalyzeGroup[];
  suggestions: string[];
}

interface BrandLookupEntry {
  brandName: string;
  genericName: string;
  normalizedBrand: string;
  normalizedGeneric: string;
  groupKey: string;
  medicine: RapidAnalyzeMedicine;
}

interface RapidAnalyzeIndices {
  dataset: RapidAnalyzeDataset;
  groupMap: Map<string, RapidAnalyzeGroup>;
  genericToGroupKeys: Map<string, string[]>;
  brandLookup: Map<string, BrandLookupEntry>;
  genericDisplayNames: Map<string, string>;
  brandDisplayNames: Map<string, string>;
}

const dataset: RapidAnalyzeDataset = rawDataset as RapidAnalyzeDataset;

const indices: RapidAnalyzeIndices = buildIndices(dataset);

function buildIndices(source: RapidAnalyzeDataset): RapidAnalyzeIndices {
  const groupMap = new Map<string, RapidAnalyzeGroup>();
  const genericToGroupKeys = new Map<string, string[]>();
  const brandLookup = new Map<string, BrandLookupEntry>();
  const genericDisplayNames = new Map<string, string>();
  const brandDisplayNames = new Map<string, string>();

  for (const category of source.categories) {
    for (const medicine of category.medicines) {
      const normalizedGeneric = normalizeTerm(medicine.genericName);
      const groupKey = `${normalizedGeneric}::${category.id}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          genericName: medicine.genericName,
          normalizedGeneric,
          category: {
            id: category.id,
            name: category.name,
            description: category.description,
          },
          medicines: [],
        });

        const groupKeys = genericToGroupKeys.get(normalizedGeneric) ?? [];
        groupKeys.push(groupKey);
        genericToGroupKeys.set(normalizedGeneric, groupKeys);

        if (!genericDisplayNames.has(normalizedGeneric)) {
          genericDisplayNames.set(normalizedGeneric, medicine.genericName);
        }
      }

      const group = groupMap.get(groupKey)!;
      group.medicines.push(medicine);

      const normalizedBrand = normalizeTerm(medicine.brandName);
      brandLookup.set(normalizedBrand, {
        brandName: medicine.brandName,
        genericName: medicine.genericName,
        normalizedBrand,
        normalizedGeneric,
        groupKey,
        medicine,
      });

      if (!brandDisplayNames.has(normalizedBrand)) {
        brandDisplayNames.set(normalizedBrand, medicine.brandName);
      }

      if (medicine.aliases) {
        for (const alias of medicine.aliases) {
          const normalizedAlias = normalizeTerm(alias);
          if (!normalizedAlias) continue;

          brandLookup.set(normalizedAlias, {
            brandName: medicine.brandName,
            genericName: medicine.genericName,
            normalizedBrand: normalizedAlias,
            normalizedGeneric,
            groupKey,
            medicine,
          });

          if (!brandDisplayNames.has(normalizedAlias)) {
            brandDisplayNames.set(normalizedAlias, alias);
          }
        }
      }
    }
  }

  // Sort medicines within each group for deterministic display
  for (const group of groupMap.values()) {
    group.medicines.sort((a, b) => a.brandName.localeCompare(b.brandName));
  }

  return {
    dataset: source,
    groupMap,
    genericToGroupKeys,
    brandLookup,
    genericDisplayNames,
    brandDisplayNames,
  };
}

function normalizeTerm(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .join(' ')
    .trim();
}

function uniqueByKey<T>(items: T[], keyGetter: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyGetter(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function collectGroupsFromKeys(groupKeys: string[], groupMap: Map<string, RapidAnalyzeGroup>): RapidAnalyzeGroup[] {
  return uniqueByKey(
    groupKeys
      .map((key) => groupMap.get(key))
      .filter((group): group is RapidAnalyzeGroup => Boolean(group)),
    (group) => group.key,
  );
}

function collectSuggestions(
  matches: Array<{ normalized: string; display: string }>,
  limit: number,
): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const match of matches) {
    if (seen.has(match.display.toLowerCase())) continue;
    seen.add(match.display.toLowerCase());
    suggestions.push(match.display);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

export function searchRapidAnalyze(query: string): RapidAnalyzeSearchResult {
  const normalizedQuery = normalizeTerm(query);

  if (!normalizedQuery) {
    return {
      query,
      normalizedQuery,
      matchType: 'none',
      groups: [],
      suggestions: [],
    };
  }

  const {
    groupMap,
    genericToGroupKeys,
    brandLookup,
    genericDisplayNames,
    brandDisplayNames,
  } = indices;

  // Exact brand match
  const brandMatch = brandLookup.get(normalizedQuery);
  if (brandMatch) {
    const groupKeys = genericToGroupKeys.get(brandMatch.normalizedGeneric) ?? [];
    const groups = collectGroupsFromKeys(groupKeys, groupMap);

    return {
      query,
      normalizedQuery,
      matchType: 'brand',
      matchedBrand: brandMatch.brandName,
      matchedGeneric: brandMatch.genericName,
      groups,
      suggestions: buildSuggestionList(normalizedQuery, groups, brandDisplayNames, genericDisplayNames),
    };
  }

  // Exact generic match
  const genericKeys = genericToGroupKeys.get(normalizedQuery);
  if (genericKeys && genericKeys.length > 0) {
    const groups = collectGroupsFromKeys(genericKeys, groupMap);
    const matchedGeneric = genericDisplayNames.get(normalizedQuery) ?? query;

    return {
      query,
      normalizedQuery,
      matchType: 'generic',
      matchedGeneric,
      groups,
      suggestions: buildSuggestionList(normalizedQuery, groups, brandDisplayNames, genericDisplayNames),
    };
  }

  // Partial generic matches
  const partialGenericKeys = Array.from(genericToGroupKeys.keys()).filter((key) =>
    key.includes(normalizedQuery),
  );

  const partialGenericGroups = partialGenericKeys.flatMap((key) =>
    collectGroupsFromKeys(genericToGroupKeys.get(key) ?? [], groupMap),
  );

  if (partialGenericGroups.length > 0) {
    return {
      query,
      normalizedQuery,
      matchType: 'partial',
      groups: partialGenericGroups,
      suggestions: buildSuggestionList(
        normalizedQuery,
        partialGenericGroups,
        brandDisplayNames,
        genericDisplayNames,
      ),
    };
  }

  // Partial brand matches (fall back)
  const partialBrandMatches = Array.from(brandLookup.values()).filter((entry) =>
    entry.normalizedBrand.includes(normalizedQuery),
  );

  if (partialBrandMatches.length > 0) {
    const groupKeys = partialBrandMatches.map((entry) => entry.groupKey);
    const groups = collectGroupsFromKeys(groupKeys, groupMap);

    return {
      query,
      normalizedQuery,
      matchType: 'partial',
      groups,
      suggestions: buildSuggestionList(normalizedQuery, groups, brandDisplayNames, genericDisplayNames),
    };
  }

  // No matches found
  const fallbackSuggestions = collectSuggestions(
    Array.from(genericDisplayNames.entries()).map(([normalized, display]) => ({
      normalized,
      display,
    })),
    5,
  );

  return {
    query,
    normalizedQuery,
    matchType: 'none',
    groups: [],
    suggestions: fallbackSuggestions,
  };
}

function buildSuggestionList(
  normalizedQuery: string,
  groups: RapidAnalyzeGroup[],
  brandDisplayNames: Map<string, string>,
  genericDisplayNames: Map<string, string>,
): string[] {
  const potentialMatches: Array<{ normalized: string; display: string }> = [];

  for (const group of groups) {
    const normalizedGeneric = group.normalizedGeneric;
    const genericDisplay = genericDisplayNames.get(normalizedGeneric) ?? group.genericName;
    potentialMatches.push({ normalized: normalizedGeneric, display: genericDisplay });

    for (const medicine of group.medicines) {
      const normalizedBrand = normalizeTerm(medicine.brandName);
      const display = brandDisplayNames.get(normalizedBrand) ?? medicine.brandName;
      potentialMatches.push({ normalized: normalizedBrand, display });
    }
  }

  // Add top generic names even if no direct group matched (for partial matches)
  if (potentialMatches.length === 0) {
    for (const [normalized, display] of genericDisplayNames.entries()) {
      if (normalized.includes(normalizedQuery)) {
        potentialMatches.push({ normalized, display });
      }
    }
  }

  potentialMatches.sort((a, b) => a.display.localeCompare(b.display));

  return collectSuggestions(potentialMatches, 7);
}

export function getRapidAnalyzeDataset(): RapidAnalyzeDataset {
  return indices.dataset;
}

export function getAllRapidAnalyzeGenerics(): string[] {
  return Array.from(indices.genericDisplayNames.values()).sort((a, b) => a.localeCompare(b));
}

export function getAllRapidAnalyzeBrands(): string[] {
  return Array.from(indices.brandDisplayNames.values()).sort((a, b) => a.localeCompare(b));
}


