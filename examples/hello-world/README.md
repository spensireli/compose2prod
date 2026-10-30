# Hello world on ECS Fargate

This example deploys `compose.yml` through the local compose2prod library:
one Nginx task (0.25 vCPU, 512 MiB), a public Application Load Balancer, and
a two-AZ VPC without NAT gateways. The endpoint serves a custom hello page
on HTTP port 80. AWS charges apply while these resources exist.

From the repository root, using Linux Node.js and configured AWS credentials:

```sh
npm ci
npm run compile
node examples/hello-world/app.js
aws cloudformation deploy --region us-east-1 \
  --stack-name Compose2ProdHelloWorld \
  --template-file examples/hello-world/cdk.out/Compose2ProdHelloWorld.template.json \
  --capabilities CAPABILITY_IAM
aws cloudformation describe-stacks --region us-east-1 \
  --stack-name Compose2ProdHelloWorld --query 'Stacks[0].Outputs'
```

The app uses `BootstraplessSynthesizer`: this example has no local image or
file assets and does not need a CDK bootstrap stack. It pulls Nginx from
Amazon ECR Public. Use `docker compose -f examples/hello-world/compose.yml up`
to run the same service locally if Docker Compose is installed.

## Clean up

```sh
aws cloudformation delete-stack --region us-east-1 --stack-name Compose2ProdHelloWorld
aws cloudformation wait stack-delete-complete --region us-east-1 --stack-name Compose2ProdHelloWorld
```

CDK retains the CloudWatch log group by default. After deleting the stack,
find the group with the `Compose2ProdHelloWorld-` prefix and delete it if
its logs are no longer needed.
