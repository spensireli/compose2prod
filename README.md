# compose2prod

`compose2prod` is an AWS CDK construct that translates services in a Docker
Compose file into Amazon ECS services running on AWS Fargate.

```ts
import { App, CfnOutput, Stack } from 'aws-cdk-lib';
import { ComposeToEcs } from 'compose2prod';

const app = new App();
const stack = new Stack(app, 'MyStack');

new ComposeToEcs(stack, 'Application', {
  composeFilePath: './compose.yml',
});
```

By default, the construct creates a two-AZ VPC without NAT gateways, an ECS
cluster, one task definition per Compose service, and one Fargate service per
task definition. When exactly one service publishes a TCP port, the construct
also creates an internet-facing Application Load Balancer and forwards its
published port to the service's container port. Tasks receive public IP
addresses so they can pull public container images without a NAT gateway. For
production networks, pass an existing `vpc` or `cluster` and choose subnets
with `vpcSubnets`.

## Supported Compose fields

- `services.*.image` (required)
- `command` and `entrypoint`
- `environment` mapping or `KEY=VALUE` list
- `ports` and `expose` (container ports; published host ports are not needed by Fargate)
- `platform` for `linux/amd64` and `linux/arm64`
- `healthcheck`
- `deploy.replicas`

Use `serviceNames` to deploy only part of a Compose application:

```ts
new ComposeToEcs(stack, 'Application', {
  composeFilePath: './compose.yml',
  serviceNames: ['web', 'worker'],
});
```

When multiple services publish ports, explicitly select the HTTP service that
should receive ALB traffic. If that service publishes multiple TCP ports, also
set `loadBalancerContainerPort`:

```ts
const deployment = new ComposeToEcs(stack, 'Application', {
  composeFilePath: './compose.yml',
  loadBalancerServiceName: 'web',
  loadBalancerHealthCheck: { path: '/health' },
});

new CfnOutput(stack, 'Url', {
  value: `http://${deployment.loadBalancer!.loadBalancerDnsName}:${deployment.loadBalancerListener!.port}`,
});
```

Set `createLoadBalancer: false` for internal or worker-only deployments.
`expose` creates an ECS container port mapping but does not make a service an
ALB candidate; only Compose `ports` publishes an application entry point. The
selected container port is assumed to speak HTTP. Raw TCP services need a
Network Load Balancer, which is not implemented yet.

## Current scope

Images must already exist in a registry. Compose `build`, volumes, secrets,
configs, databases, HTTPS listeners, path-based routing, and service discovery
are not translated yet. Unsupported storage and secret fields fail during CDK
synthesis instead of being silently ignored.

Database integration is intentionally outside the initial release. The parser
and deployment layers are separate so a later release can classify stateful
services and replace them with managed AWS database resources without changing
how applications instantiate the construct.

## Development

This project is managed by [Projen](https://projen.io/). Edit `.projenrc.ts`
for project configuration, then regenerate and run all checks with:

```console
npx projen
npx projen build
```
