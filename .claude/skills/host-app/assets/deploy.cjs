const path = require('node:path');
const { App, BootstraplessSynthesizer, CfnOutput, Stack } = require('aws-cdk-lib');
const { ComposeToEcs } = require('compose2prod');

// Run from the consumer app root. Adapt these options to the app before deploying.
const stackName = process.env.STACK_NAME || 'MyAppHosting';
const composeFile = path.resolve(process.env.COMPOSE_FILE || 'compose.deploy.yml');
const app = new App({ outdir: path.resolve('.compose2prod/cdk.out') });
const stack = new Stack(app, stackName, {
  // No CDK bootstrap is needed for registry images and stacks without file assets.
  synthesizer: new BootstraplessSynthesizer(),
});
const publicService = 'web';
const deployment = new ComposeToEcs(stack, 'Application', {
  composeFilePath: composeFile,
  loadBalancerServiceName: publicService,
  loadBalancerListenerPort: 80,
  loadBalancerHealthCheck: { path: '/' },
  cpu: 256,
  memoryLimitMiB: 512,
});
new CfnOutput(stack, 'Url', {
  value: `http://${deployment.loadBalancer.loadBalancerDnsName}`,
});
new CfnOutput(stack, 'ClusterName', { value: deployment.cluster.clusterName });
new CfnOutput(stack, 'ServiceName', { value: deployment.services[deployment.serviceNames.indexOf(publicService)].serviceName });
const assembly = app.synth();
console.log(assembly.getStackArtifact(stack.artifactId).templateFullPath);
