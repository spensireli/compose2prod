import * as path from 'path';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { ComposeToEcs } from '../src';

const fixture = (name: string): string => path.join(__dirname, 'fixtures', name);

describe('ComposeToEcs', () => {
  test('translates Compose services into Fargate resources', () => {
    const stack = new Stack(new App(), 'TestStack');

    const deployment = new ComposeToEcs(stack, 'Deployment', {
      composeFilePath: fixture('basic.compose.yml'),
    });

    expect(deployment.serviceNames).toEqual(['web', 'worker']);
    expect(deployment.services).toHaveLength(2);
    expect(deployment.taskDefinitions).toHaveLength(2);

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::ECS::TaskDefinition', 2);
    template.resourceCountIs('AWS::ECS::Service', 2);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '256',
      Memory: '512',
      RuntimePlatform: {
        CpuArchitecture: 'ARM64',
        OperatingSystemFamily: 'LINUX',
      },
      ContainerDefinitions: [
        {
          Command: ['nginx', '-g', 'daemon off;'],
          Environment: [
            { Name: 'APP_ENV', Value: 'test' },
            { Name: 'FEATURE_ENABLED', Value: 'true' },
          ],
          HealthCheck: {
            Command: ['CMD-SHELL', 'curl --fail http://localhost || exit 1'],
            Interval: 30,
            Retries: 3,
            StartPeriod: 10,
            Timeout: 5,
          },
          Image: 'nginx:1.27',
          PortMappings: [
            { ContainerPort: 80, Protocol: 'tcp' },
            { ContainerPort: 8125, Protocol: 'udp' },
          ],
        },
      ],
    });
    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 2,
      LaunchType: 'FARGATE',
      LoadBalancers: [
        {
          ContainerPort: 80,
        },
      ],
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          AssignPublicIp: 'ENABLED',
        },
      },
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 8080,
      Protocol: 'HTTP',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      Port: 80,
      Protocol: 'HTTP',
      TargetType: 'ip',
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 80,
      IpProtocol: 'tcp',
      SourceSecurityGroupId: Match.anyValue(),
      ToPort: 80,
    });
    expect(deployment.loadBalancedServiceName).toBe('web');
    expect(deployment.loadBalancer).toBeDefined();
    expect(deployment.loadBalancerListener).toBeDefined();
    expect(deployment.loadBalancerTargetGroup).toBeDefined();
  });

  test('can select services and use an existing VPC', () => {
    const stack = new Stack(new App(), 'TestStack');
    const vpc = new ec2.Vpc(stack, 'Vpc', { natGateways: 1 });

    const deployment = new ComposeToEcs(stack, 'Deployment', {
      composeFilePath: fixture('basic.compose.yml'),
      serviceNames: ['worker'],
      vpc,
    });

    expect(deployment.serviceNames).toEqual(['worker']);
    Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
    Template.fromStack(stack).resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
    Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          AssignPublicIp: 'DISABLED',
        },
      },
    });
  });

  test('rejects an unknown selected service', () => {
    const stack = new Stack(new App(), 'TestStack');

    expect(
      () =>
        new ComposeToEcs(stack, 'Deployment', {
          composeFilePath: fixture('basic.compose.yml'),
          serviceNames: ['api'],
        }),
    ).toThrow('Compose services not found: api. Available services: web, worker');
  });

  test('keeps similar Compose service names distinct', () => {
    const stack = new Stack(new App(), 'TestStack');

    const deployment = new ComposeToEcs(stack, 'Deployment', {
      composeFilePath: fixture('similar-names.compose.yml'),
    });

    expect(deployment.serviceNames).toEqual(['api-v1', 'api_v1']);
    Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 2);
  });

  test('requires a selection when multiple services publish ports', () => {
    const stack = new Stack(new App(), 'TestStack');

    expect(
      () =>
        new ComposeToEcs(stack, 'Deployment', {
          composeFilePath: fixture('multiple-public.compose.yml'),
        }),
    ).toThrow('Multiple Compose services publish TCP ports (web, admin); set loadBalancerServiceName');
  });

  test('can choose the load-balanced service or disable the ALB', () => {
    const ambiguousPortStack = new Stack(new App(), 'AmbiguousPortStack');
    expect(
      () =>
        new ComposeToEcs(ambiguousPortStack, 'Deployment', {
          composeFilePath: fixture('multiple-public.compose.yml'),
          loadBalancerServiceName: 'admin',
        }),
    ).toThrow(
      'Load balancer service "admin" publishes multiple TCP ports (3000, 9229); set loadBalancerContainerPort',
    );

    const selectedStack = new Stack(new App(), 'SelectedStack');
    const selected = new ComposeToEcs(selectedStack, 'Deployment', {
      composeFilePath: fixture('multiple-public.compose.yml'),
      loadBalancerContainerPort: 3000,
      loadBalancerServiceName: 'admin',
    });

    expect(selected.loadBalancedServiceName).toBe('admin');
    Template.fromStack(selectedStack).hasResourceProperties(
      'AWS::ElasticLoadBalancingV2::Listener',
      { Port: 9090 },
    );
    Template.fromStack(selectedStack).hasResourceProperties(
      'AWS::ElasticLoadBalancingV2::TargetGroup',
      { Port: 3000 },
    );

    const disabledStack = new Stack(new App(), 'DisabledStack');
    new ComposeToEcs(disabledStack, 'Deployment', {
      composeFilePath: fixture('multiple-public.compose.yml'),
      createLoadBalancer: false,
    });
    Template.fromStack(disabledStack).resourceCountIs(
      'AWS::ElasticLoadBalancingV2::LoadBalancer',
      0,
    );
  });

  test('creates a Route 53 alias record for the load balancer', () => {
    const stack = new Stack(new App(), 'TestStack');
    const hostedZone = new route53.PublicHostedZone(stack, 'HostedZone', {
      zoneName: 'example.com',
    });

    const deployment = new ComposeToEcs(stack, 'Deployment', {
      composeFilePath: fixture('basic.compose.yml'),
      domainName: 'app.example.com',
      hostedZone,
    });

    expect(deployment.domainName).toBe('app.example.com');
    expect(deployment.dnsRecord).toBeDefined();
    Template.fromStack(stack).hasResourceProperties('AWS::Route53::RecordSet', {
      AliasTarget: {
        DNSName: Match.anyValue(),
        HostedZoneId: Match.anyValue(),
      },
      Name: 'app.example.com.',
      Type: 'A',
    });
  });

  test('validates DNS configuration', () => {
    const missingZoneStack = new Stack(new App(), 'MissingZoneStack');
    expect(
      () =>
        new ComposeToEcs(missingZoneStack, 'Deployment', {
          composeFilePath: fixture('basic.compose.yml'),
          domainName: 'app.example.com',
        }),
    ).toThrow('domainName and hostedZone must be specified together');

    const wrongZoneStack = new Stack(new App(), 'WrongZoneStack');
    const wrongHostedZone = new route53.PublicHostedZone(wrongZoneStack, 'HostedZone', {
      zoneName: 'example.com',
    });
    expect(
      () =>
        new ComposeToEcs(wrongZoneStack, 'Deployment', {
          composeFilePath: fixture('basic.compose.yml'),
          domainName: 'app.other.com',
          hostedZone: wrongHostedZone,
        }),
    ).toThrow('Domain name "app.other.com" does not belong to hosted zone "example.com"');

    const noLoadBalancerStack = new Stack(new App(), 'NoLoadBalancerStack');
    const hostedZone = new route53.PublicHostedZone(noLoadBalancerStack, 'HostedZone', {
      zoneName: 'example.com',
    });
    expect(
      () =>
        new ComposeToEcs(noLoadBalancerStack, 'Deployment', {
          composeFilePath: fixture('basic.compose.yml'),
          domainName: 'worker.example.com',
          hostedZone,
          serviceNames: ['worker'],
        }),
    ).toThrow('Domain configuration requires an Application Load Balancer');
  });

  test('rejects build-only services', () => {
    const stack = new Stack(new App(), 'TestStack');

    expect(
      () =>
        new ComposeToEcs(stack, 'Deployment', {
          composeFilePath: fixture('build-only.compose.yml'),
        }),
    ).toThrow('build-only services are not supported');
  });

  test('does not accept both a cluster and VPC', () => {
    const stack = new Stack(new App(), 'TestStack');
    const vpc = new ec2.Vpc(stack, 'Vpc');
    const otherDeployment = new ComposeToEcs(stack, 'OtherDeployment', {
      composeFilePath: fixture('basic.compose.yml'),
      serviceNames: ['worker'],
      vpc,
    });

    expect(
      () =>
        new ComposeToEcs(stack, 'Deployment', {
          cluster: otherDeployment.cluster,
          composeFilePath: fixture('basic.compose.yml'),
          serviceNames: ['worker'],
          vpc,
        }),
    ).toThrow('Specify either cluster or vpc, not both');
  });
});
