const path = require('path');
const { App, BootstraplessSynthesizer, CfnOutput, Stack, Tags } = require('aws-cdk-lib');
const { ComposeToEcs } = require('../..');

const app = new App({ outdir: path.join(__dirname, 'cdk.out') });
const stack = new Stack(app, 'Compose2ProdHelloWorld', {
  synthesizer: new BootstraplessSynthesizer(),
  description: 'Simple compose2prod Nginx demonstration',
});
Tags.of(stack).add('Project', 'compose2prod-hello-world');
const deployment = new ComposeToEcs(stack, 'Application', {
  composeFilePath: path.join(__dirname, 'compose.yml'),
  cpu: 256,
  memoryLimitMiB: 512,
  loadBalancerHealthCheck: { path: '/' },
});
new CfnOutput(stack, 'Url', {
  value: `http://${deployment.loadBalancer.loadBalancerDnsName}`,
});
new CfnOutput(stack, 'ClusterName', { value: deployment.cluster.clusterName });
new CfnOutput(stack, 'ServiceName', { value: deployment.services[0].serviceName });
app.synth();
