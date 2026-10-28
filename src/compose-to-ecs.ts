import { Duration, Token } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { ComposeService, loadComposeServices } from './compose-model';

/** Properties for a deployment translated from Docker Compose. */
export interface ComposeToEcsProps {
  /** Path to a Docker Compose YAML file, resolved from the synthesis working directory. */
  readonly composeFilePath: string;

  /**
   * An existing ECS cluster to deploy into.
   *
   * @default - a cluster is created in `vpc`, or in a new VPC when `vpc` is not supplied
   */
  readonly cluster?: ecs.ICluster;

  /**
   * An existing VPC in which to create the ECS cluster.
   * Cannot be combined with `cluster`.
   *
   * @default - a two-AZ VPC with public subnets and no NAT gateways
   */
  readonly vpc?: ec2.IVpc;

  /**
   * Compose services to deploy. Their Compose order is preserved.
   *
   * @default - all services
   */
  readonly serviceNames?: string[];

  /** Default Fargate task CPU units for every service. */
  readonly cpu?: number;

  /** Default Fargate task memory in MiB for every service. */
  readonly memoryLimitMiB?: number;

  /** Desired task count when a service does not define `deploy.replicas`. */
  readonly desiredCount?: number;

  /**
   * Whether tasks receive public IP addresses.
   *
   * @default - true for the construct-created VPC, otherwise false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Subnets for each Fargate service.
   *
   * @default - public subnets when assigning public IPs, otherwise private subnets with egress
   */
  readonly vpcSubnets?: ec2.SubnetSelection;

  /**
   * Create an Application Load Balancer for an HTTP service that publishes a TCP port.
   *
   * @default true
   */
  readonly createLoadBalancer?: boolean;

  /**
   * Compose service to attach to the Application Load Balancer.
   * Required when more than one selected service publishes a TCP port.
   *
   * @default - the only selected service that publishes a TCP port
   */
  readonly loadBalancerServiceName?: string;

  /**
   * Published container port to attach to the Application Load Balancer.
   * Required when the selected service publishes more than one TCP port.
   *
   * @default - the selected service's only published TCP container port
   */
  readonly loadBalancerContainerPort?: number;

  /**
   * Port on which the Application Load Balancer accepts HTTP traffic.
   *
   * @default - the Compose published port, or port 80 when Compose does not specify one
   */
  readonly loadBalancerListenerPort?: number;

  /**
   * Whether the Application Load Balancer is internet-facing.
   *
   * @default true
   */
  readonly internetFacingLoadBalancer?: boolean;

  /**
   * Subnets for the Application Load Balancer.
   *
   * @default - public subnets for an internet-facing load balancer, otherwise private subnets with egress
   */
  readonly loadBalancerSubnets?: ec2.SubnetSelection;

  /** Health check settings for the load balancer target group. */
  readonly loadBalancerHealthCheck?: elbv2.HealthCheck;

  /**
   * Fully qualified domain name for a Route 53 alias record targeting the load balancer.
   * Must be supplied together with `hostedZone`.
   *
   * @example app.example.com
   */
  readonly domainName?: string;

  /**
   * Existing Route 53 hosted zone in which to create the domain alias record.
   * Must be supplied together with `domainName`.
   */
  readonly hostedZone?: route53.IHostedZone;
}

/**
 * Deploys container images described by a Docker Compose file as ECS Fargate services.
 *
 * Each Compose service becomes an independent task definition and Fargate service.
 */
export class ComposeToEcs extends Construct {
  /** The VPC hosting the deployment. */
  public readonly vpc: ec2.IVpc;

  /** The ECS cluster hosting the deployment. */
  public readonly cluster: ecs.ICluster;

  /** Fargate services in the same order as the selected Compose services. */
  public readonly services: ecs.FargateService[];

  /** Task definitions in the same order as `services`. */
  public readonly taskDefinitions: ecs.FargateTaskDefinition[];

  /** Compose service names in the same order as `services`. */
  public readonly serviceNames: string[];

  /** The Application Load Balancer, when a service is publicly exposed. */
  public readonly loadBalancer?: elbv2.ApplicationLoadBalancer;

  /** The HTTP listener, when an Application Load Balancer is created. */
  public readonly loadBalancerListener?: elbv2.ApplicationListener;

  /** The Fargate target group, when an Application Load Balancer is created. */
  public readonly loadBalancerTargetGroup?: elbv2.ApplicationTargetGroup;

  /** The Compose service attached to the Application Load Balancer. */
  public readonly loadBalancedServiceName?: string;

  /** The configured fully qualified domain name. */
  public readonly domainName?: string;

  /** The Route 53 alias A record targeting the Application Load Balancer. */
  public readonly dnsRecord?: route53.ARecord;

  public constructor(scope: Construct, id: string, props: ComposeToEcsProps) {
    super(scope, id);

    if (props.cluster !== undefined && props.vpc !== undefined) {
      throw new Error('Specify either cluster or vpc, not both');
    }
    if ((props.domainName === undefined) !== (props.hostedZone === undefined)) {
      throw new Error('domainName and hostedZone must be specified together');
    }
    if (props.domainName !== undefined && props.domainName.trim() === '') {
      throw new Error('domainName must be a non-empty fully qualified domain name');
    }
    validateDomainBelongsToHostedZone(props.domainName, props.hostedZone);

    const createsVpc = props.cluster === undefined && props.vpc === undefined;
    this.vpc =
      props.cluster?.vpc ??
      props.vpc ??
      new ec2.Vpc(this, 'Vpc', {
        maxAzs: 2,
        natGateways: 0,
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'Public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
        ],
      });
    this.cluster = props.cluster ?? new ecs.Cluster(this, 'Cluster', { vpc: this.vpc });

    const composeServices = loadComposeServices(props.composeFilePath, props.serviceNames);
    const assignPublicIp = props.assignPublicIp ?? createsVpc;
    const vpcSubnets =
      props.vpcSubnets ??
      ({
        subnetType: assignPublicIp ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS,
      } satisfies ec2.SubnetSelection);

    this.serviceNames = composeServices.map((service) => service.name);
    this.taskDefinitions = [];
    this.services = [];

    for (const composeService of composeServices) {
      const taskDefinition = this.createTaskDefinition(composeService, props);
      const service = new ecs.FargateService(this, `Service-${composeService.name}`, {
        assignPublicIp,
        cluster: this.cluster,
        desiredCount: composeService.replicas ?? props.desiredCount ?? 1,
        taskDefinition,
        vpcSubnets,
      });

      this.taskDefinitions.push(taskDefinition);
      this.services.push(service);
    }

    const loadBalancedService = selectLoadBalancedService(composeServices, props);
    if (props.domainName !== undefined && loadBalancedService === undefined) {
      throw new Error('Domain configuration requires an Application Load Balancer');
    }
    if (loadBalancedService !== undefined) {
      const serviceIndex = composeServices.indexOf(loadBalancedService);
      const publishedPort = selectLoadBalancedPort(loadBalancedService, props);
      const internetFacing = props.internetFacingLoadBalancer ?? true;
      const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
        internetFacing,
        vpc: this.vpc,
        vpcSubnets:
          props.loadBalancerSubnets ??
          ({
            subnetType: internetFacing || createsVpc
              ? ec2.SubnetType.PUBLIC
              : ec2.SubnetType.PRIVATE_WITH_EGRESS,
          } satisfies ec2.SubnetSelection),
      });
      const listener = loadBalancer.addListener('HttpListener', {
        port: props.loadBalancerListenerPort ?? publishedPort.publishedPort ?? 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
      });
      const container = this.taskDefinitions[serviceIndex].defaultContainer!;
      const targetGroup = listener.addTargets('FargateTarget', {
        healthCheck: props.loadBalancerHealthCheck,
        port: publishedPort.containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [
          this.services[serviceIndex].loadBalancerTarget({
            containerName: container.containerName,
            containerPort: publishedPort.containerPort,
          }),
        ],
      });

      this.loadBalancer = loadBalancer;
      this.loadBalancerListener = listener;
      this.loadBalancerTargetGroup = targetGroup;
      this.loadBalancedServiceName = loadBalancedService.name;

      if (props.domainName !== undefined && props.hostedZone !== undefined) {
        this.domainName = props.domainName;
        this.dnsRecord = new route53.ARecord(this, 'AliasRecord', {
          recordName: props.domainName,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.LoadBalancerTarget(loadBalancer),
          ),
          zone: props.hostedZone,
        });
      }
    }
  }

  private createTaskDefinition(
    service: ComposeService,
    props: ComposeToEcsProps,
  ): ecs.FargateTaskDefinition {
    const taskDefinition = new ecs.FargateTaskDefinition(this, `Task-${service.name}`, {
      cpu: props.cpu ?? 256,
      memoryLimitMiB: props.memoryLimitMiB ?? 512,
      runtimePlatform: service.cpuArchitecture
        ? {
          cpuArchitecture:
              service.cpuArchitecture === 'ARM64'
                ? ecs.CpuArchitecture.ARM64
                : ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        }
        : undefined,
    });

    const container = taskDefinition.addContainer(`Container-${service.name}`, {
      command: service.command,
      entryPoint: service.entryPoint,
      environment: service.environment,
      healthCheck: service.healthCheck
        ? {
          command: service.healthCheck.command,
          interval: optionalDuration(service.healthCheck.intervalSeconds),
          retries: service.healthCheck.retries,
          startPeriod: optionalDuration(service.healthCheck.startPeriodSeconds),
          timeout: optionalDuration(service.healthCheck.timeoutSeconds),
        }
        : undefined,
      image: ecs.ContainerImage.fromRegistry(service.image),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: service.name }),
    });

    for (const port of service.ports) {
      container.addPortMappings({
        containerPort: port.containerPort,
        protocol: port.protocol === 'udp' ? ecs.Protocol.UDP : ecs.Protocol.TCP,
      });
    }

    return taskDefinition;
  }
}

function selectLoadBalancedService(
  services: ComposeService[],
  props: ComposeToEcsProps,
): ComposeService | undefined {
  if (props.createLoadBalancer === false) {
    if (
      props.loadBalancerServiceName !== undefined ||
      props.loadBalancerContainerPort !== undefined
    ) {
      throw new Error(
        'loadBalancerServiceName and loadBalancerContainerPort cannot be used when createLoadBalancer is false',
      );
    }
    return undefined;
  }

  const candidates = services.filter((service) =>
    service.ports.some((port) => port.published && port.protocol === 'tcp'),
  );
  if (props.loadBalancerServiceName !== undefined) {
    const selected = services.find((service) => service.name === props.loadBalancerServiceName);
    if (selected === undefined) {
      throw new Error(
        `Load balancer service "${props.loadBalancerServiceName}" is not one of the selected Compose services`,
      );
    }
    if (!candidates.includes(selected)) {
      throw new Error(
        `Load balancer service "${props.loadBalancerServiceName}" must publish at least one TCP port`,
      );
    }
    return selected;
  }

  if (candidates.length > 1) {
    throw new Error(
      `Multiple Compose services publish TCP ports (${candidates
        .map((service) => service.name)
        .join(', ')}); set loadBalancerServiceName`,
    );
  }
  if (candidates.length === 0 && props.loadBalancerContainerPort !== undefined) {
    throw new Error('loadBalancerContainerPort requires a selected service that publishes a TCP port');
  }
  return candidates[0];
}

function selectLoadBalancedPort(service: ComposeService, props: ComposeToEcsProps): ComposeService['ports'][number] {
  const ports = service.ports.filter((port) => port.published && port.protocol === 'tcp');
  if (props.loadBalancerContainerPort !== undefined) {
    const selected = ports.find((port) => port.containerPort === props.loadBalancerContainerPort);
    if (selected === undefined) {
      throw new Error(
        `Load balancer service "${service.name}" does not publish TCP container port ${props.loadBalancerContainerPort}`,
      );
    }
    return selected;
  }
  if (ports.length > 1) {
    throw new Error(
      `Load balancer service "${service.name}" publishes multiple TCP ports (${ports
        .map((port) => port.containerPort)
        .join(', ')}); set loadBalancerContainerPort`,
    );
  }
  return ports[0];
}

function optionalDuration(seconds: number | undefined): Duration | undefined {
  return seconds === undefined ? undefined : Duration.seconds(seconds);
}

function validateDomainBelongsToHostedZone(
  domainName: string | undefined,
  hostedZone: route53.IHostedZone | undefined,
): void {
  if (
    domainName === undefined ||
    hostedZone === undefined ||
    Token.isUnresolved(domainName) ||
    Token.isUnresolved(hostedZone.zoneName)
  ) {
    return;
  }

  const domain = domainName.replace(/\.$/, '').toLowerCase();
  const zone = hostedZone.zoneName.replace(/\.$/, '').toLowerCase();
  if (domain !== zone && !domain.endsWith(`.${zone}`)) {
    throw new Error(`Domain name "${domainName}" does not belong to hosted zone "${hostedZone.zoneName}"`);
  }
}
