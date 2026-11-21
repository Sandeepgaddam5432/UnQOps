# UnQOps analysis

Baseline: commit `b404698a59e7524ef83a4e49d940e5fda13f0877`. This is an inventory and architectural review, not a claim that every integration has been exercised.

## Stack and architecture

Remix 2 / React / TypeScript, Vite, Cloudflare Pages and optional Electron. UnoCSS utilities, SCSS modules and shared global SCSS coexist. Radix, Headless UI, Framer Motion and icon collections are in use. Nanostores and React state coordinate the interface; Remix file routes handle server endpoints. CodeMirror, xterm and WebContainer provide the workbench. `app/lib/modules/llm`, `app/lib/runtime`, `app/lib/stores` and `app/lib/persistence` own provider, streaming/action execution, client state and IndexedDB history. `electron`, `functions`, `public` and `docs` support desktop, deployment, assets and documentation.

## Routes

`/` starts a chat; `/chat/:id` resumes it; `/git` imports a repository. WebContainer connect and preview routes support the embedded runtime. API routes cover chat, models, keys, prompt enhancement, git, deployments, Supabase, MCP, system diagnostics and updates. Route files:

- `app/routes/_index.tsx`
- `app/routes/api.chat.ts`
- `app/routes/api.check-env-key.ts`
- `app/routes/api.enhancer.ts`
- `app/routes/api.export-api-keys.ts`
- `app/routes/api.git-proxy.$.ts`
- `app/routes/api.github-template.ts`
- `app/routes/api.health.ts`
- `app/routes/api.llmcall.ts`
- `app/routes/api.mcp-check.ts`
- `app/routes/api.mcp-update-config.ts`
- `app/routes/api.models.$provider.ts`
- `app/routes/api.models.ts`
- `app/routes/api.netlify-deploy.ts`
- `app/routes/api.supabase.query.ts`
- `app/routes/api.supabase.ts`
- `app/routes/api.supabase.variables.ts`
- `app/routes/api.system.diagnostics.ts`
- `app/routes/api.system.disk-info.ts`
- `app/routes/api.system.git-info.ts`
- `app/routes/api.update.ts`
- `app/routes/api.vercel-deploy.ts`
- `app/routes/chat.$id.tsx`
- `app/routes/git.tsx`
- `app/routes/webcontainer.connect.$id.tsx`
- `app/routes/webcontainer.preview.$id.tsx`

## Components

`app/components/ui` contains reusable primitives; chat, workbench, sidebar, header, deploy, git and settings folders contain feature-specific components. Component prop contracts remain in their source files; the following inventory includes nested modules (including non-visual exports):

- **@settings/core**: `AvatarDropdown.tsx`, `ControlPanel.tsx`, `constants.ts`, `types.ts`
- **@settings**: `index.ts`
- **@settings/shared/components**: `DraggableTabList.tsx`, `TabTile.tsx`
- **@settings/tabs/connections**: `ConnectionDiagnostics.tsx`, `ConnectionsTab.tsx`, `GithubConnection.tsx`, `NetlifyConnection.tsx`, `VercelConnection.tsx`
- **@settings/tabs/connections/components**: `ConnectionForm.tsx`, `CreateBranchDialog.tsx`, `GitHubAuthDialog.tsx`, `PushToGitHubDialog.tsx`, `RepositoryCard.tsx`, `RepositoryDialogContext.tsx`, `RepositoryList.tsx`, `RepositorySelectionDialog.tsx`, `StatsDialog.tsx`
- **@settings/tabs/connections/types**: `GitHub.ts`
- **@settings/tabs/data**: `DataTab.tsx`, `DataVisualization.tsx`
- **@settings/tabs/event-logs**: `EventLogsTab.tsx`
- **@settings/tabs/features**: `FeaturesTab.tsx`
- **@settings/tabs/mcp**: `McpServerList.tsx`, `McpServerListItem.tsx`, `McpStatusBadge.tsx`, `McpTab.tsx`
- **@settings/tabs/notifications**: `NotificationsTab.tsx`
- **@settings/tabs/profile**: `ProfileTab.tsx`
- **@settings/tabs/providers/cloud**: `CloudProvidersTab.tsx`
- **@settings/tabs/providers/local**: `LocalProvidersTab.tsx`, `OllamaModelInstaller.tsx`
- **@settings/tabs/providers/service-status**: `ServiceStatusTab.tsx`, `base-provider.ts`, `provider-factory.ts`, `types.ts`
- **@settings/tabs/providers/service-status/providers**: `amazon-bedrock.ts`, `anthropic.ts`, `cohere.ts`, `deepseek.ts`, `google.ts`, `groq.ts`, `huggingface.ts`, `hyperbolic.ts`, `mistral.ts`, `openai.ts`, `openrouter.ts`, `perplexity.ts`, `together.ts`, `xai.ts`
- **@settings/tabs/providers/status**: `ServiceStatusTab.tsx`
- **@settings/tabs/settings**: `SettingsTab.tsx`
- **@settings/utils**: `tab-helpers.ts`
- **chat**: `APIKeyManager.tsx`, `Artifact.tsx`, `AssistantMessage.tsx`, `BaseChat.tsx`, `Chat.client.tsx`, `ChatAlert.tsx`, `ChatBox.tsx`, `CodeBlock.tsx`, `DicussMode.tsx`, `ExamplePrompts.tsx`, `FilePreview.tsx`, `GitCloneButton.tsx`, `ImportFolderButton.tsx`, `LLMApiAlert.tsx`, `MCPTools.tsx`, `Markdown.tsx`, `Messages.client.tsx`, `ModelSelector.tsx`, `NetlifyDeploymentLink.client.tsx`, `ProgressCompilation.tsx`, `ScreenshotStateManager.tsx`, `SendButton.client.tsx`, `SpeechRecognition.tsx`, `StarterTemplates.tsx`, `SupabaseAlert.tsx`, `SupabaseConnection.tsx`, `ThoughtBox.tsx`, `ToolInvocations.tsx`, `UserMessage.tsx`, `VercelDeploymentLink.client.tsx`
- **chat/chatExportAndImport**: `ExportChatButton.tsx`, `ImportButtons.tsx`
- **deploy**: `DeployAlert.tsx`, `DeployButton.tsx`, `NetlifyDeploy.client.tsx`, `VercelDeploy.client.tsx`
- **editor/codemirror**: `BinaryContent.tsx`, `CodeMirrorEditor.tsx`, `EnvMasking.ts`, `cm-theme.ts`, `indent.ts`, `languages.ts`
- **git**: `GitUrlImport.client.tsx`
- **header**: `Header.tsx`, `HeaderActionButtons.client.tsx`
- **sidebar**: `HistoryItem.tsx`, `Menu.client.tsx`, `date-binning.ts`
- **ui/BackgroundRays**: `index.tsx`
- **ui**: `Badge.tsx`, `Breadcrumbs.tsx`, `Button.tsx`, `Card.tsx`, `Checkbox.tsx`, `CloseButton.tsx`, `CodeBlock.tsx`, `Collapsible.tsx`, `ColorSchemeDialog.tsx`, `Dialog.tsx`, `Dropdown.tsx`, `EmptyState.tsx`, `FileIcon.tsx`, `FilterChip.tsx`, `GlowingEffect.tsx`, `GradientCard.tsx`, `IconButton.tsx`, `Input.tsx`, `Label.tsx`, `LoadingDots.tsx`, `LoadingOverlay.tsx`, `PanelHeader.tsx`, `PanelHeaderButton.tsx`, `Popover.tsx`, `Progress.tsx`, `RepositoryStats.tsx`, `ScrollArea.tsx`, `SearchInput.tsx`, `SearchResultItem.tsx`, `Separator.tsx`, `SettingsButton.tsx`, `Slider.tsx`, `StatusIndicator.tsx`, `Switch.tsx`, `Tabs.tsx`, `TabsWithSlider.tsx`, `ThemeSwitch.tsx`, `Tooltip.tsx`, `index.ts`, `use-toast.ts`
- **workbench**: `DiffView.tsx`, `EditorPanel.tsx`, `ExpoQrModal.tsx`, `FileBreadcrumb.tsx`, `FileTree.tsx`, `Inspector.tsx`, `InspectorPanel.tsx`, `LockManager.tsx`, `PortDropdown.tsx`, `Preview.tsx`, `ScreenshotSelector.tsx`, `Search.tsx`, `Workbench.client.tsx`
- **workbench/terminal**: `Terminal.tsx`, `TerminalTabs.tsx`, `theme.ts`

## Design and flows

Existing styling combines teal accent / slate utility colors, semantic CSS variables, purple animated rays, Inter via Google Fonts, several radius and shadow conventions, Phosphor/Iconify and other icon sets. Both themes exist via `bolt_theme` and `data-theme`. The user opens a chat or imports a project, configures provider/model and key, sends a prompt, then uses editor, terminal, preview and deployment tools. Sidebar holds history and settings. Loading, errors and empty states exist but are inconsistent across features.

## Risks and preservation

Preserve all endpoint contracts, provider configuration, streaming parser, persistence, WebContainer and deployment behavior. There are hard-coded colors and layout values, mixed component conventions, incomplete keyboard labeling and mobile/test coverage; the large chat component has `@ts-nocheck`. Baseline `pnpm test`: 30 pass, one parser failure; lint: eight formatting errors; typecheck before build: missing `build/server`. The browser and external provider/deployment flows were not available for a full interaction audit. The connect route interpolates a query parameter into JavaScript; this needs separate security review.
