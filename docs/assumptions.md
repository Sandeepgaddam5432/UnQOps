# Assumptions and constraints

- The existing Arena branch is used instead of creating another branch; main remains untouched.
- The current Onlook repository is an Electron studio. Its theme is the reference, not an older web revision.
- Existing data and integration behavior takes precedence over cosmetic refactoring. The design direction is interpreted, not copied.
- This environment cannot download the Electron binary. `ELECTRON_SKIP_BINARY_DOWNLOAD=1` permits web dependency installation only.
- No browser binary was available for screenshots or a full responsive/accessibility audit. HTTP checks are not a replacement for browser verification.
