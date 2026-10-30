---
name: develop-compose2prod
description: Develop, test, or troubleshoot the compose2prod construct library itself, including Compose parsing, ECS/CDK synthesis, generated project files, examples, and release workflows. Use for repository contributions rather than hosting a consumer application.
---

# Work on the construct library

## Map the repository

- `src/compose-model.ts`: YAML parsing, normalization, and unsupported-field validation.
- `src/compose-to-ecs.ts`: public construct/props, networking, task/service creation,
  ALB selection, health checks, and Route 53 aliases.
- `src/index.ts`: public exports. Internal parser types are not exported here.
- `test/compose-to-ecs.test.ts`, `test/fixtures/`: CDK assertion tests and Compose inputs.
- `.projenrc.ts`: source for generated project/package/workflow configuration.
- `API.md`: generated API docs; `README.md`: hand-written user guide.
- `examples/hello-world/`: consumer behavior exercised through the local compiled library.

Read implementation and relevant tests before editing. Keep public API changes
JSII-compatible. Separate parser changes from deployment behavior and update
user documentation when the supported subset changes. Never accept and silently
discard a field whose semantics the new feature claims to implement.

## Generated files and checks

Edit `.projenrc.ts` for generated configuration, then run `npx projen`. Direct
edits to generated `package.json`, workflows, tasks, tsconfigs, or `API.md` will
be overwritten. `.claude/` guidance and the README are maintained directly.
Use the project's lockfile and a compatible Node runtime. On WSL, `node`, `npm`,
and `npx` must resolve to Linux executables; Windows npm breaks Linux paths.

```sh
npm ci
npm run build
```

The build regenerates files, compiles with JSII, generates API docs, runs Jest,
autofixes ESLint, and packages JavaScript. Inspect `git diff` afterward because
generation and lint can change tracked files. Use focused Jest checks while
iterating; run the full build when changing implementation. For guidance-only
changes, validate skill frontmatter, links, and any executable examples rather
than claiming the entire application needs new tests.

Add meaningful CDK assertions for a changed resource/behavior and parser tests
for rejected inputs. `npm run compile` is useful before synthesizing the local
hello-world example. Synthesis is not a deployment test. Do not create cloud
resources to test a library change unless the user's task authorizes it.

## Release context

`release.yml` builds on main and publishes with npm Trusted Publishing using
`id-token: write` and `NPM_TRUSTED_PUBLISHER=true`. The npm trust must match the
repository and `release.yml`, and allow direct `npm publish`. Changing source
visibility or npm trust is a separate external action; don't do it as incidental
maintenance. Respect session authorization for any release.

Development `package.json` normally has version `0.0.0`; Projen bumps for release
and resets it afterward. Inspect `dist/version.txt`, `dist/releasetag.txt`, and
the packaged manifest for the actual release version. Never publish the root
placeholder version. Follow remote tags and existing release workflows rather
than inventing tags for unpublished artifacts. Verify registry availability
and the latest dist-tag; npm may process an accepted publish asynchronously.

Construct Hub discovers public npm packages with an accepted license, `.jsii`
metadata, and a CDK keyword such as `awscdk`. Keep these intact. Indexing is
asynchronous; don't claim the listing is live without checking it.
