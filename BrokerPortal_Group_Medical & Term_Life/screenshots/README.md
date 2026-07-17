# Screenshots — Click-Through Verification

Captured during an end-to-end click-through of the running portal (real
click/keyboard interaction via a headless browser, not just code review) to
confirm the latest features actually render and work as built.

| File | Screen | What it confirms |
|---|---|---|
| `01-dashboard.png` | Dashboard | Default landing page, Sales Executive persona |
| `02-underwriter-dashboard.png` | Dashboard | Role switcher correctly re-renders the Dashboard after switching to Underwriter (confirms the role-refresh bug fix) |
| `03-underwriting-queue.png` | Underwriting Queue | Cross-case worklist for the Underwriter role |
| `04-underwriting-workbench-amber-indicative-quote.png` | Underwriting Workbench | The Indicative Quote card on an Amber/Pending case — confirms the feature works from its corrected location (originally placed on a step-locked screen, relocated here so Amber cases can actually reach it) |
| `05-census-upload-download-button.png` | Employee Census Upload | The new "download uploaded file" button, available to every applicable role |
| `06-census-validation-inline-edit.png` | Census Validation | Inline row-edit button and salary masking, both present |
| `07-ai-copilot-panel.png` | AI Copilot (topbar, any screen) | Panel opens and renders a role-specific briefing |
| `08-pipeline-date-filter.png` | Pipeline | Created-date-range filter control |
| `09-playbook.png` | Playbook | Reference page cleaned of internal "Screen N"/"FRD §X" copy |

All nine were captured against the same file that was published as the
Claude Artifact preview (byte-identical bundle), with zero console/page
errors across the run.
