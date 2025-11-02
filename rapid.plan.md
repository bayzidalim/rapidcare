<!-- aa1ee907-18b3-4124-b2ea-2dcfd9ade486 5b75250c-f349-4346-af6d-a0460751e0aa -->
# Rapid Analyze Feature

1. Dataset Setup

- Add `front-end/src/data/rapid-analyze.json` seeded with the provided medicine categories, brand names, generics, descriptions, and usage notes.
- Create a lightweight helper in `front-end/src/lib/rapidAnalyze.ts` to normalize names, index by brand and generic, and return grouped matches.

2. Patient-Facing UI

- Build `front-end/src/app/rapid-analyze/page.tsx` with auth checks to restrict hospital authorities/admins (redirect or message), an input form, and result cards showing matching medicines, generic info, doctor rationale, and usage guidance.
- Reuse existing UI primitives (`Card`, `Input`, `Badge`, `Tabs` if needed) for consistent styling and responsive layout.

3. Navigation Integration

- Update `front-end/src/lib/navigationConfig.ts` (and dependent components if needed) to expose the Rapid Analyze route only to authenticated `user` roles, and surface a quick link for patients (e.g. dashboard quick actions if appropriate).

### To-dos

- [x] Seed rapid-analyze medicine dataset JSON with categories, brand/generic mappings, and descriptions.
- [x] Implement patient-only Rapid Analyze page using helper to show search results and guidance.
- [x] Expose Rapid Analyze route in navigation and optional quick-link surfaces for regular users.

