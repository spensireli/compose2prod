# Deployment reference

## Supported Compose subset

| Input | Behavior |
| --- | --- |
| `image` | Required registry image; no automatic build or push |
| `command`, `entrypoint` | Arrays work directly; a string becomes `/bin/sh -c` |
| `environment` | Literal mapping or `KEY=VALUE` list; no host lookup |
| `ports` | Container mapping; published TCP ports select the HTTP ALB candidate |
| `expose` | Container mapping only, not a public ALB candidate |
| `platform` | `linux/amd64` or `linux/arm64` |
| `healthcheck` | Command and supported durations/retry count; tools must exist in the image |
| `deploy.replicas` | Task count; task CPU/memory are CDK construct options |

Compose interpolation, `env_file`, networks, `depends_on`, and build steps are
not implemented. The parser reads YAML directly and does not run Docker Compose.
Do not pass `${VARIABLE}` placeholders expecting interpolation. Environment
values become visible task-definition/template data; inject sensitive values
through additional CDK/ECS secret configuration instead. Containers in separate
services do not automatically resolve each other's Compose names. Volumes,
Compose secrets/configs, and build-only services are rejected. A database image
being accepted does not provide durable storage or managed database integration.

If several services publish TCP ports, set `loadBalancerServiceName`; if the
selected service publishes several TCP ports, set `loadBalancerContainerPort`.
Only one selected HTTP service is attached to the ALB. A worker-only deployment
can set `createLoadBalancer: false` and omit the URL output. With an existing
VPC, set `assignPublicIp` and subnet choices deliberately; private tasks need
working egress for image pulls. `cluster` and `vpc` cannot both be supplied.

## Consumer project

Use the app's package manager. For an npm project without CDK dependencies:

```sh
npm install compose2prod aws-cdk-lib constructs
```

Copy `../assets/deploy.cjs` from this reference's skill folder into the app as
`infra/deploy.cjs`. Adapt `web`, health path, CPU/memory, and other options.
This CommonJS file also works when the app uses `"type": "module"`.
If the app is not a Node project, put a dedicated `package.json` and dependencies
in its infrastructure directory. Put `deploy.cjs` beside that `package.json`,
run `node deploy.cjs` from that directory, and set `COMPOSE_FILE` to the app's
deployment Compose file (for example, `../compose.deploy.yml`).
Add `.compose2prod/` to that project's `.gitignore` and `.dockerignore`.

Minimal deployment Compose shape (replace the image and port with the app's):

```yaml
services:
  web:
    image: YOUR_REGISTRY/YOUR_APP:REVISION
    platform: linux/amd64
    ports:
      - "3000:3000"
    deploy:
      replicas: 1
```

The entrypoint explicitly exposes HTTP port 80 at the ALB, forwarding to port
3000 in this example. Only add a container healthcheck after confirming the
image contains the command it uses. For a smoke-test example that needs no
custom image, use the library repository's `examples/hello-world/compose.yml`.

## Publish a local image to private ECR

Skip this when the correct image already exists. Set the AWS profile, region,
repository, and unique tag for this user; never reuse a previous session's
account. The following uses shell variables chosen for the current deployment:

```sh
export AWS_REGION=YOUR_REGION
# If needed: export AWS_PROFILE=YOUR_PROFILE
aws sts get-caller-identity
app_account=$(aws sts get-caller-identity --query Account --output text)
app_repository=YOUR_APP_REPOSITORY
app_revision=YOUR_UNIQUE_REVISION
app_registry="$app_account.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Check `aws ecr describe-repositories --repository-names "$app_repository"`.
Only create it if it does not exist and image publishing is authorized:

```sh
aws ecr create-repository --repository-name "$app_repository" --image-tag-mutability IMMUTABLE
aws ecr get-login-password | docker login --username AWS --password-stdin "$app_registry"
docker buildx build --platform linux/amd64 \
  --tag "$app_registry/$app_repository:$app_revision" --push .
```

For a nonstandard AWS partition, resolve the registry endpoint accordingly.
Use the image URI in Compose with `platform: linux/amd64`, or build arm64 and
use `linux/arm64` consistently. Respect existing repository policies and build
contexts. Exclude secrets from build context and image layers. Same-account
private ECR pulls use the Fargate execution role's ECR permissions; other
private registries/cross-account images may need additional authorization.

## Synthesize and review

Set the user's region/profile and a unique stack name; verify the target before
cloud writes. From the app root (or infrastructure project as described above):

```sh
export STACK_NAME=MyAppHosting
export COMPOSE_FILE=compose.deploy.yml
node infra/deploy.cjs
aws cloudformation validate-template \
  --template-body "file://.compose2prod/cdk.out/$STACK_NAME.template.json"
aws cloudformation deploy --stack-name "$STACK_NAME" \
  --template-file ".compose2prod/cdk.out/$STACK_NAME.template.json" \
  --capabilities CAPABILITY_IAM --no-execute-changeset
```

Inspect the change set returned by the command with
`aws cloudformation describe-change-set --change-set-name CHANGE_SET_ARN`.
Default resources include a VPC, two public subnets, internet gateway, ECS
cluster/service/task definition, task IAM roles, log group, HTTP ALB, listener,
and target group. There is no NAT gateway. CloudFormation deploy requires
appropriate deployment/IAM permissions; don't widen access automatically.

This entrypoint uses `BootstraplessSynthesizer`, which fits prebuilt registry
images without CDK assets. If adding file/image assets or context lookups,
choose an appropriate synthesizer/bootstrap and resolve those prerequisites;
don't assume the bootstrap-free path covers them.

## Execute and verify

Within the user's deployment authorization:

```sh
aws cloudformation execute-change-set --change-set-name CHANGE_SET_ARN
aws cloudformation describe-stack-events --stack-name "$STACK_NAME"
aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query 'Stacks[0].{Status:StackStatus,Outputs:Outputs}'
```

Poll until complete, with bounded waits that allow progress updates. On failure,
inspect stack events, `aws ecs describe-services`, `describe-tasks` stopped
reasons, CloudWatch logs, and `aws elbv2 describe-target-health`. Look for a
wrong bind address/port, missing environment, incompatible image architecture,
image-pull permissions/egress, healthcheck failures, or unmet dependencies.

Use the stack's outputs to resolve its exact cluster/service, then confirm
running count equals desired count and rollout is complete. Resolve the stack's
target group and check target health. Request the URL and the app's actual
health endpoint with `curl --fail --max-time 20`; verify expected content, not
merely any HTTP 200. Never report success from synthesis alone.

## Update and cleanup

For updates, build/push a new immutable image revision, update Compose, synthesize,
review a new change set, and execute it. Reusing a mutable tag may not trigger
new tasks. Save the exact account/region, stack name, image URI, outputs, and
cleanup steps in the app's deployment documentation without credentials.

When teardown is authorized:

```sh
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation describe-stack-events --stack-name "$STACK_NAME"
```

Verify final `DELETE_COMPLETE` status. CDK retains log groups by default; record
the exact log group from stack resources before deletion and remove it only if
in scope. ECR repositories created outside the stack remain and store billable
images; remove only dedicated demo repositories when authorized. Do not delete
an existing VPC, external database, or shared registry as incidental cleanup.
