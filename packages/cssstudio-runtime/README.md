# @onlook/cssstudio-runtime

Local vendored CSS Studio runtime used by Onlook.

The published `cssstudio` package does not ship the original component source tree.
To make the code searchable and editable inside this repo, this package keeps:

- `vendor/`: the active vendored bundle used by the app
- `source/segments/`: the same bundle split into ordered editable segments
- `source/manifest.json`: rebuild order for those segments

Useful commands:

- `bun run sync:upstream`: copy the upstream package bundle into `vendor/` and refresh extracted segments
- `bun run rebuild:bundle`: rebuild `vendor/cssstudio.mjs` from edited segments
