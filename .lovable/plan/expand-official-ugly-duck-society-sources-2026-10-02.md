# Expand Official Ugly Duck Society Sources

## What will change
- Add `https://udslabs.tech`, `https://x.com/Web3_Kimberly`, and `https://x.com/uglyduckscrooge` to the strict official-source allowlist.
- Keep each X account isolated so redirects and crawling cannot jump between approved handles.
- Update the AI instructions and disclosure page to recognize all six approved sources.
- Add the three source records to the Ugly Duck Society knowledge domain and run Firecrawl ingestion.
- Add tests for canonical URLs, lookalike rejection, handle isolation, and the expanded allowlist.

## Evidence handling
- Ingest the founder-profile statements Firecrawl verified from the two official X profiles.
- Do not hard-code the three holder-benefit claims into the AI. Firecrawl found no supporting publication on `udslabs.tech` or the other approved sources, so those claims remain unverified until an approved page publishes them.
- Continue requiring canonical citations, publication timestamps when available, retrieval timestamps, and fail-closed behavior.

## Technical details
- Model each approved website and social handle as an independent source identity.
- Tighten same-source and redirect checks from broad family matching to exact approved source matching.
- Preserve the existing `ugly_duck_society` knowledge-domain isolation and source history/versioning.
