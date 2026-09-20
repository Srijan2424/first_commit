export type MedicineSuggestion = { id: string; name: string };
export async function searchMedicines(
  term: string,
  signal: AbortSignal,
): Promise<MedicineSuggestion[]> {
  // Only the medicine search term is sent. Never send patient or consultation data.
  const response = await fetch(
    `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(term)}`,
    { signal },
  );
  if (!response.ok)
    throw new Error(
      "Medicine search is unavailable. You can enter the medicine manually.",
    );
  const data = (await response.json()) as {
    drugGroup?: {
      conceptGroup?: {
        conceptProperties?: { rxcui: string; name: string }[];
      }[];
    };
  };
  return (data.drugGroup?.conceptGroup ?? [])
    .flatMap((g) => g.conceptProperties ?? [])
    .slice(0, 20)
    .map((m) => ({ id: m.rxcui, name: m.name }));
}
