# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### ComposeToEcs <a name="ComposeToEcs" id="compose2prod.ComposeToEcs"></a>

Deploys container images described by a Docker Compose file as ECS Fargate services.

Each Compose service becomes an independent task definition and Fargate service.

#### Initializers <a name="Initializers" id="compose2prod.ComposeToEcs.Initializer"></a>

```typescript
import { ComposeToEcs } from 'compose2prod'

new ComposeToEcs(scope: Construct, id: string, props: ComposeToEcsProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#compose2prod.ComposeToEcs.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#compose2prod.ComposeToEcs.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#compose2prod.ComposeToEcs.Initializer.parameter.props">props</a></code> | <code><a href="#compose2prod.ComposeToEcsProps">ComposeToEcsProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="compose2prod.ComposeToEcs.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="compose2prod.ComposeToEcs.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="compose2prod.ComposeToEcs.Initializer.parameter.props"></a>

- *Type:* <a href="#compose2prod.ComposeToEcsProps">ComposeToEcsProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#compose2prod.ComposeToEcs.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#compose2prod.ComposeToEcs.with">with</a></code> | Applies one or more mixins to this construct. |

---

##### `toString` <a name="toString" id="compose2prod.ComposeToEcs.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="compose2prod.ComposeToEcs.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="compose2prod.ComposeToEcs.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#compose2prod.ComposeToEcs.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="compose2prod.ComposeToEcs.isConstruct"></a>

```typescript
import { ComposeToEcs } from 'compose2prod'

ComposeToEcs.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="compose2prod.ComposeToEcs.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#compose2prod.ComposeToEcs.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#compose2prod.ComposeToEcs.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | The ECS cluster hosting the deployment. |
| <code><a href="#compose2prod.ComposeToEcs.property.serviceNames">serviceNames</a></code> | <code>string[]</code> | Compose service names in the same order as `services`. |
| <code><a href="#compose2prod.ComposeToEcs.property.services">services</a></code> | <code>aws-cdk-lib.aws_ecs.FargateService[]</code> | Fargate services in the same order as the selected Compose services. |
| <code><a href="#compose2prod.ComposeToEcs.property.taskDefinitions">taskDefinitions</a></code> | <code>aws-cdk-lib.aws_ecs.FargateTaskDefinition[]</code> | Task definitions in the same order as `services`. |
| <code><a href="#compose2prod.ComposeToEcs.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | The VPC hosting the deployment. |
| <code><a href="#compose2prod.ComposeToEcs.property.loadBalancedServiceName">loadBalancedServiceName</a></code> | <code>string</code> | The Compose service attached to the Application Load Balancer. |
| <code><a href="#compose2prod.ComposeToEcs.property.loadBalancer">loadBalancer</a></code> | <code>aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancer</code> | The Application Load Balancer, when a service is publicly exposed. |
| <code><a href="#compose2prod.ComposeToEcs.property.loadBalancerListener">loadBalancerListener</a></code> | <code>aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListener</code> | The HTTP listener, when an Application Load Balancer is created. |
| <code><a href="#compose2prod.ComposeToEcs.property.loadBalancerTargetGroup">loadBalancerTargetGroup</a></code> | <code>aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup</code> | The Fargate target group, when an Application Load Balancer is created. |

---

##### `node`<sup>Required</sup> <a name="node" id="compose2prod.ComposeToEcs.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="compose2prod.ComposeToEcs.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster

The ECS cluster hosting the deployment.

---

##### `serviceNames`<sup>Required</sup> <a name="serviceNames" id="compose2prod.ComposeToEcs.property.serviceNames"></a>

```typescript
public readonly serviceNames: string[];
```

- *Type:* string[]

Compose service names in the same order as `services`.

---

##### `services`<sup>Required</sup> <a name="services" id="compose2prod.ComposeToEcs.property.services"></a>

```typescript
public readonly services: FargateService[];
```

- *Type:* aws-cdk-lib.aws_ecs.FargateService[]

Fargate services in the same order as the selected Compose services.

---

##### `taskDefinitions`<sup>Required</sup> <a name="taskDefinitions" id="compose2prod.ComposeToEcs.property.taskDefinitions"></a>

```typescript
public readonly taskDefinitions: FargateTaskDefinition[];
```

- *Type:* aws-cdk-lib.aws_ecs.FargateTaskDefinition[]

Task definitions in the same order as `services`.

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="compose2prod.ComposeToEcs.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

The VPC hosting the deployment.

---

##### `loadBalancedServiceName`<sup>Optional</sup> <a name="loadBalancedServiceName" id="compose2prod.ComposeToEcs.property.loadBalancedServiceName"></a>

```typescript
public readonly loadBalancedServiceName: string;
```

- *Type:* string

The Compose service attached to the Application Load Balancer.

---

##### `loadBalancer`<sup>Optional</sup> <a name="loadBalancer" id="compose2prod.ComposeToEcs.property.loadBalancer"></a>

```typescript
public readonly loadBalancer: ApplicationLoadBalancer;
```

- *Type:* aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancer

The Application Load Balancer, when a service is publicly exposed.

---

##### `loadBalancerListener`<sup>Optional</sup> <a name="loadBalancerListener" id="compose2prod.ComposeToEcs.property.loadBalancerListener"></a>

```typescript
public readonly loadBalancerListener: ApplicationListener;
```

- *Type:* aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListener

The HTTP listener, when an Application Load Balancer is created.

---

##### `loadBalancerTargetGroup`<sup>Optional</sup> <a name="loadBalancerTargetGroup" id="compose2prod.ComposeToEcs.property.loadBalancerTargetGroup"></a>

```typescript
public readonly loadBalancerTargetGroup: ApplicationTargetGroup;
```

- *Type:* aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup

The Fargate target group, when an Application Load Balancer is created.

---


## Structs <a name="Structs" id="Structs"></a>

### ComposeToEcsProps <a name="ComposeToEcsProps" id="compose2prod.ComposeToEcsProps"></a>

Properties for a deployment translated from Docker Compose.

#### Initializer <a name="Initializer" id="compose2prod.ComposeToEcsProps.Initializer"></a>

```typescript
import { ComposeToEcsProps } from 'compose2prod'

const composeToEcsProps: ComposeToEcsProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#compose2prod.ComposeToEcsProps.property.composeFilePath">composeFilePath</a></code> | <code>string</code> | Path to a Docker Compose YAML file, resolved from the synthesis working directory. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.assignPublicIp">assignPublicIp</a></code> | <code>boolean</code> | Whether tasks receive public IP addresses. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | An existing ECS cluster to deploy into. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.cpu">cpu</a></code> | <code>number</code> | Default Fargate task CPU units for every service. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.createLoadBalancer">createLoadBalancer</a></code> | <code>boolean</code> | Create an Application Load Balancer for an HTTP service that publishes a TCP port. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.desiredCount">desiredCount</a></code> | <code>number</code> | Desired task count when a service does not define `deploy.replicas`. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.internetFacingLoadBalancer">internetFacingLoadBalancer</a></code> | <code>boolean</code> | Whether the Application Load Balancer is internet-facing. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.loadBalancerContainerPort">loadBalancerContainerPort</a></code> | <code>number</code> | Published container port to attach to the Application Load Balancer. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.loadBalancerHealthCheck">loadBalancerHealthCheck</a></code> | <code>aws-cdk-lib.aws_elasticloadbalancingv2.HealthCheck</code> | Health check settings for the load balancer target group. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.loadBalancerListenerPort">loadBalancerListenerPort</a></code> | <code>number</code> | Port on which the Application Load Balancer accepts HTTP traffic. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.loadBalancerServiceName">loadBalancerServiceName</a></code> | <code>string</code> | Compose service to attach to the Application Load Balancer. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.loadBalancerSubnets">loadBalancerSubnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | Subnets for the Application Load Balancer. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.memoryLimitMiB">memoryLimitMiB</a></code> | <code>number</code> | Default Fargate task memory in MiB for every service. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.serviceNames">serviceNames</a></code> | <code>string[]</code> | Compose services to deploy. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | An existing VPC in which to create the ECS cluster. |
| <code><a href="#compose2prod.ComposeToEcsProps.property.vpcSubnets">vpcSubnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | Subnets for each Fargate service. |

---

##### `composeFilePath`<sup>Required</sup> <a name="composeFilePath" id="compose2prod.ComposeToEcsProps.property.composeFilePath"></a>

```typescript
public readonly composeFilePath: string;
```

- *Type:* string

Path to a Docker Compose YAML file, resolved from the synthesis working directory.

---

##### `assignPublicIp`<sup>Optional</sup> <a name="assignPublicIp" id="compose2prod.ComposeToEcsProps.property.assignPublicIp"></a>

```typescript
public readonly assignPublicIp: boolean;
```

- *Type:* boolean
- *Default:* true for the construct-created VPC, otherwise false

Whether tasks receive public IP addresses.

---

##### `cluster`<sup>Optional</sup> <a name="cluster" id="compose2prod.ComposeToEcsProps.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster
- *Default:* a cluster is created in `vpc`, or in a new VPC when `vpc` is not supplied

An existing ECS cluster to deploy into.

---

##### `cpu`<sup>Optional</sup> <a name="cpu" id="compose2prod.ComposeToEcsProps.property.cpu"></a>

```typescript
public readonly cpu: number;
```

- *Type:* number

Default Fargate task CPU units for every service.

---

##### `createLoadBalancer`<sup>Optional</sup> <a name="createLoadBalancer" id="compose2prod.ComposeToEcsProps.property.createLoadBalancer"></a>

```typescript
public readonly createLoadBalancer: boolean;
```

- *Type:* boolean
- *Default:* true

Create an Application Load Balancer for an HTTP service that publishes a TCP port.

---

##### `desiredCount`<sup>Optional</sup> <a name="desiredCount" id="compose2prod.ComposeToEcsProps.property.desiredCount"></a>

```typescript
public readonly desiredCount: number;
```

- *Type:* number

Desired task count when a service does not define `deploy.replicas`.

---

##### `internetFacingLoadBalancer`<sup>Optional</sup> <a name="internetFacingLoadBalancer" id="compose2prod.ComposeToEcsProps.property.internetFacingLoadBalancer"></a>

```typescript
public readonly internetFacingLoadBalancer: boolean;
```

- *Type:* boolean
- *Default:* true

Whether the Application Load Balancer is internet-facing.

---

##### `loadBalancerContainerPort`<sup>Optional</sup> <a name="loadBalancerContainerPort" id="compose2prod.ComposeToEcsProps.property.loadBalancerContainerPort"></a>

```typescript
public readonly loadBalancerContainerPort: number;
```

- *Type:* number
- *Default:* the selected service's only published TCP container port

Published container port to attach to the Application Load Balancer.

Required when the selected service publishes more than one TCP port.

---

##### `loadBalancerHealthCheck`<sup>Optional</sup> <a name="loadBalancerHealthCheck" id="compose2prod.ComposeToEcsProps.property.loadBalancerHealthCheck"></a>

```typescript
public readonly loadBalancerHealthCheck: HealthCheck;
```

- *Type:* aws-cdk-lib.aws_elasticloadbalancingv2.HealthCheck

Health check settings for the load balancer target group.

---

##### `loadBalancerListenerPort`<sup>Optional</sup> <a name="loadBalancerListenerPort" id="compose2prod.ComposeToEcsProps.property.loadBalancerListenerPort"></a>

```typescript
public readonly loadBalancerListenerPort: number;
```

- *Type:* number
- *Default:* the Compose published port, or port 80 when Compose does not specify one

Port on which the Application Load Balancer accepts HTTP traffic.

---

##### `loadBalancerServiceName`<sup>Optional</sup> <a name="loadBalancerServiceName" id="compose2prod.ComposeToEcsProps.property.loadBalancerServiceName"></a>

```typescript
public readonly loadBalancerServiceName: string;
```

- *Type:* string
- *Default:* the only selected service that publishes a TCP port

Compose service to attach to the Application Load Balancer.

Required when more than one selected service publishes a TCP port.

---

##### `loadBalancerSubnets`<sup>Optional</sup> <a name="loadBalancerSubnets" id="compose2prod.ComposeToEcsProps.property.loadBalancerSubnets"></a>

```typescript
public readonly loadBalancerSubnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection
- *Default:* public subnets for an internet-facing load balancer, otherwise private subnets with egress

Subnets for the Application Load Balancer.

---

##### `memoryLimitMiB`<sup>Optional</sup> <a name="memoryLimitMiB" id="compose2prod.ComposeToEcsProps.property.memoryLimitMiB"></a>

```typescript
public readonly memoryLimitMiB: number;
```

- *Type:* number

Default Fargate task memory in MiB for every service.

---

##### `serviceNames`<sup>Optional</sup> <a name="serviceNames" id="compose2prod.ComposeToEcsProps.property.serviceNames"></a>

```typescript
public readonly serviceNames: string[];
```

- *Type:* string[]
- *Default:* all services

Compose services to deploy.

Their Compose order is preserved.

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="compose2prod.ComposeToEcsProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc
- *Default:* a two-AZ VPC with public subnets and no NAT gateways

An existing VPC in which to create the ECS cluster.

Cannot be combined with `cluster`.

---

##### `vpcSubnets`<sup>Optional</sup> <a name="vpcSubnets" id="compose2prod.ComposeToEcsProps.property.vpcSubnets"></a>

```typescript
public readonly vpcSubnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection
- *Default:* public subnets when assigning public IPs, otherwise private subnets with egress

Subnets for each Fargate service.

---



