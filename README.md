# Attunements

The official package catalog for Attune. It contains both reusable theme
systems and app-specific attunements, independently of the Attune runtime and
desktop application.

```text
themes/<theme-id>/
attunements/<attunement-id>/
catalog.json
```

`catalog.json` is the distribution boundary. Every entry has a stable ID,
version, and package path. Attune App reads this checkout directly during local
development and bundles a snapshot for packaged releases.

## Attunement format

Every attunement is a self-contained, version-2 package:

```text
attunements/example/
  manifest.json
  preview.png
  apps/
    codex.css
    codex.js
```

```json
{
  "manifestVersion": 2,
  "name": "Example",
  "description": "What the package changes.",
  "preview": "preview.png",
  "targets": {
    "Codex": {
      "styles": ["apps/codex.css"],
      "script": "apps/codex.js",
      "intent": "Why this target exists.",
      "bindings": {
        "main": { "role": "codex.primaryChat", "required": true }
      }
    }
  }
}
```

Scripts are optional, but when present they are separate `.js` files. CSS must
target semantic host roles rather than unstable generated class names.

## Delivery model

During development, Attune App reads a sibling checkout or the path in
`ATTUNE_CATALOG_ROOT`. A packaged app contains a pinned catalog snapshot, then
installs versioned attunement copies into its Application Support directory.
Folders without Attune's management marker are treated as user-owned and are
never overwritten.

Run `npm test` after editing a package. The validator checks catalog IDs,
versions, canonical manifests, semantic bindings, and every referenced
stylesheet or script. Theme authors
can run `npm run build:themes` to generate standalone stylesheets under the
ignored `examples/` directory.

## Asset attribution

Bundled font license files remain beside their assets. Nasalization is by
[Typodermic Fonts](https://typodermicfonts.com/nasalization/); consult its
published terms when redistributing modified catalog packages.
