---
name: host-app
description: Host a local application on AWS ECS Fargate using compose2prod. Use when someone asks to deploy, host, or put their local app or Docker Compose project online with this library; includes container preparation, deployment, verification, and cleanup.
---

# Host a local app with compose2prod

Turn the user's local application into a verified deployment using the published
`compose2prod` construct. Work in the app repository, preserving its existing
framework and package manager. When invoked from the library repository with
an app path, inspect that app before changing it. If the app cannot be located,
ask for its path while checking available tools and the library example.

## 1. Discover the smallest working deployment

Inspect the app's README, manifests, start scripts, Dockerfile, Compose files,
ignore files, and existing infrastructure. Identify its production command,
listening port/address, health endpoint, image, architecture, and dependencies.
Read environment variable names without exposing `.env` values.

Infer answers from the code; ask only for unresolved choices such as AWS
account/region or an external database. A basic stateless HTTP deployment can
start without a custom domain. Don't silently turn a database-backed app into
a demo that loses its data. Do not replace the user's app with hello-world.

Read [references/deployment.md](references/deployment.md) for the supported
Compose subset, consumer setup, image publishing, synthesis, and AWS commands.
Use [assets/deploy.cjs](assets/deploy.cjs) as an adaptable consumer CDK entrypoint.
It requires the published package, not a checkout of this library.

## 2. Make the app runnable in a container

Use an existing production Dockerfile/image if suitable. Otherwise create the
smallest framework-appropriate Dockerfile and `.dockerignore`, excluding local
secrets and dependencies. The server must bind to `0.0.0.0` on its container
port. Build and smoke-test locally when Docker is available; report when it
isn't. Do not claim a test ran when it didn't.

If the app is only local source, build and push an image to the user's selected
registry before deployment. An `image` field alongside `build` does not cause
this library to build anything. Pin the image to a unique revision tag or digest
and match its platform to the Fargate task. Avoid mutable tags for app releases.

Create a separate `compose.deploy.yml` when local Compose includes bind mounts,
local dependencies, or development settings. Preserve the local file. Explain
what changed and why. Do not drop required storage, secrets, or databases.
Use managed/external dependencies or extend the CDK stack explicitly when
needed; the construct itself does not provision them.

## 3. Prepare a concrete deployment

Check `node`, `npm` (or the existing package manager), `aws`, and Docker when
building an image. Verify `aws sts get-caller-identity` and the selected region
without displaying credentials. Use an existing AWS profile/session or guide
SSO login if needed. Install `compose2prod`, `aws-cdk-lib`, and `constructs` in
the app's infrastructure project, then adapt the entrypoint and synthesize.

Use the minimum task size that fits the actual app. Select the public HTTP
service explicitly when multiple services publish ports. Set the ALB listener
port to 80 when mapping an app port such as `3000:3000`, unless the user wants
a different public port. Configure an actual health endpoint. DNS aliases do
not add TLS: arrange a certificate and HTTPS listener separately if required.

Inspect the synthesized template and create a CloudFormation change set before
execution. Summarize the account, region, stack, resources, endpoint exposure,
and ongoing charges. Continue if deployment is already authorized. Otherwise
ask about this concrete plan, leaving the prepared files available for review.

## 4. Deploy, observe, and hand off

Execute the change set. Monitor CloudFormation and ECS events; diagnose task
exit reasons, image pulls, logs, and target health if it fails. Avoid repeatedly
creating stacks or changing unrelated resources. Stop automatic retries when
the same error repeats without new evidence, or when fixing it would require
broader access or an unapproved architecture change. Report partial resources.

Verify running task count, completed ECS rollout, ALB target health, and the
expected application response from its public URL. CloudFormation success
alone is insufficient. Finish with the URL, account/region, stack name, files
changed, checks performed, limitations, and exact update/cleanup commands.
Leave resources running unless the user asked for a temporary test or cleanup.
Delete retained logs and image repositories only when cleanup authorization
covers them; do not destroy resources shared with other applications.
