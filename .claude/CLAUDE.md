# compose2prod: agent starting point

This repository is an AWS CDK construct library, published as `compose2prod`.
`ComposeToEcs` translates a supported subset of Docker Compose into ECS Fargate
services. It is not an application server or a full Docker Compose runtime.

## Choose the task

- **Host a local app:** read [host-app/SKILL.md](skills/host-app/SKILL.md).
  In Claude Code, `/host-app` also invokes it. A request such as “I have my app
  locally and want to host it” should start this workflow.
- **Change or debug this library:** read
  [develop-compose2prod/SKILL.md](skills/develop-compose2prod/SKILL.md).
- **Learn the API:** read the repository's `README.md` and `API.md`.
  `examples/hello-world/` contains a working Compose file, synthesis app, and
  deployment/cleanup commands. Resolve these paths from the repository root.

## Essential deployment facts

The default is a two-AZ VPC, no NAT gateways, a cluster, one Fargate service per
selected Compose service, public task IPs, and an internet-facing HTTP ALB when
one service publishes a TCP port. Defaults are 256 CPU units and 512 MiB per
task; one replica unless overridden. ALB, tasks, public IPs, and logs cost money.

Images must exist in a registry. Compose builds, interpolation, `.env` loading,
`env_file`, volumes, secrets/configs, managed databases, Compose service-name
DNS, dependency ordering, HTTPS, and raw TCP load balancing are not provided
by this construct. Some unsupported keys are ignored rather than rejected:
a successful synthesis does not prove Compose runtime equivalence.

Use the installed npm package in someone else's app. Use the repository's
compiled library when developing its examples. Do not copy the hello-world
example's `require('../..')` into a consumer project.

Inspect existing files and AWS identity before selecting a target. Keep changes
scoped to the user's app and requested deployment. Prepare and validate locally
before cloud writes. Explain concrete resources and costs, then proceed within
existing authorization; ask only when a necessary decision or authorization is
missing. A skill invocation alone is not permission to deploy or destroy.
Never print credentials or put application secrets in Compose environment
values or CloudFormation templates. Preserve existing app and infrastructure.

Do not embed a maintainer's account, profile, region, temporary tool path, or
previous stack name into new user projects. Discover those from the current
session. For WSL, verify Node/npm are Linux executables before installing.
