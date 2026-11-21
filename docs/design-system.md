# Design direction

A restrained, neutral developer workspace inspired by Onlook's close surface levels, hairlines and compact typography, while retaining UnQOps identity and teal semantic accent. The existing `data-theme` and `bolt_theme` persistence remain authoritative.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #f5f5f4 | #151515 |
| Surface | #ffffff | #1e1e1e |
| Raised | #eeeeec | #292929 |
| Foreground | #171717 | #f5f5f5 |
| Secondary | #575757 | #b5b5b5 |
| Border | #d9d9d6 | #414141 |
| Accent / focus | #087d72 | #5dd7c5 |

Inter with system fallback, monospace for code; spacing follows existing Uno scale (4px steps), with 8px controls, 12px containers and understated elevation. Motion is short and disabled for reduced-motion preferences.

| Existing area | Direction |
| --- | --- |
| Header / sidebar | Quiet bordered workspace chrome; preserve history and settings |
| Intro / examples / templates | Compact centered onboarding with clear, actionable prompts |
| Chat composer | Bordered surface, restrained focus, preserve all model and attachment controls |
| Shared button/input/card | Semantic surfaces and visible keyboard focus |
| Workbench, settings and dialogs | Inherit semantic surface tokens; preserve component contracts |
| Git import and saved chat | Share the chat shell; retain route and state behavior |
| WebContainer helper routes | Preserve runtime behavior; not marketing pages |

Implementation order: tokens, shared controls, shell and chat, then audit remaining screens. The current change is a partial redesign: feature-specific panels, exhaustive component variants and interaction verification still require work. No Onlook source or assets are incorporated.
