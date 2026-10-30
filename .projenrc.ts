import { awscdk, javascript } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'spensireli',
  authorAddress: '5614310+spensireli@users.noreply.github.com',
  cdkVersion: '2.189.1',
  bundledDeps: ['yaml@^2.8.1'],
  description: 'Deploy Docker Compose applications to Amazon ECS on AWS Fargate',
  jsiiVersion: '~6.0.0',
  keywords: ['awscdk', 'aws-cdk', 'docker-compose', 'ecs', 'fargate'],
  name: 'compose2prod',
  packageManager: javascript.NodePackageManager.NPM,
  packageName: 'compose2prod',
  npmTrustedPublishing: true,
  npmProvenance: false,
  projenrcTs: true,
  repositoryUrl: 'https://github.com/spensireli/compose2prod.git',
  sampleCode: false,
});
project.addPackageIgnore('/.context/');
project.addPackageIgnore('/examples/**/cdk.out/');
project.synth();
