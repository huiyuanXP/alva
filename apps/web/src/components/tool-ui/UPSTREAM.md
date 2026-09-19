# Official assistant-ui Tool UI components

Source: https://www.tool-ui.com/r/option-list.json, retrieved 2026-09-16.
Repository: https://github.com/assistant-ui/tool-ui (MIT, see LICENSE.md).
OptionList, schema, selection and shared action behavior are the upstream component, not a reimplementation. Only adapter import paths were changed to local paths. Utility/theme integration lives in ../../tool-ui.css.

The Button and Separator adapters use the official shadcn new-york registry components, retrieved from https://ui.shadcn.com/r/styles/new-york/button.json and https://ui.shadcn.com/r/styles/new-york/separator.json. Their selection behavior is not application code. Roomnote's existing IntakeCard keeps validation, version checks and persisted confirmation, using OptionList for chat choices.
