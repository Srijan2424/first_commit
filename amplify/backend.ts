import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RemovalPolicy } from "aws-cdk-lib";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { clinical } from "./functions/clinical/resource";
const backend = defineBackend({ auth, data, storage, clinical });
for (const [name, table] of Object.entries(backend.data.resources.tables)) {
  table.grantReadWriteData(backend.clinical.resources.lambda);
  backend.clinical.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ["dynamodb:Query"], resources: [`${table.tableArn}/index/*`] }));
  backend.clinical.addEnvironment(`TABLE_${name}`, table.tableName);
}
for (const table of Object.values(
  backend.data.resources.cfnResources.amplifyDynamoDbTables,
)) {
  table.applyRemovalPolicy(RemovalPolicy.RETAIN);
  table.pointInTimeRecoveryEnabled = true;
}
backend.storage.resources.bucket.grantReadWrite(
  backend.clinical.resources.lambda,
);
backend.clinical.addEnvironment(
  "FILES_BUCKET",
  backend.storage.resources.bucket.bucketName,
);

// Public demonstration gateway is created only by an explicit demo deployment.
if (process.env.MEDPAL_DEMO === "true") {
  const { HttpApi, HttpMethod, CorsHttpMethod } =
    await import("aws-cdk-lib/aws-apigatewayv2");
  const { HttpLambdaIntegration } =
    await import("aws-cdk-lib/aws-apigatewayv2-integrations");
  const api = new HttpApi(backend.createStack("DemoGateway"), "DemoApi", {
    corsPreflight: {
      allowOrigins: ["*"],
      allowMethods: [
        CorsHttpMethod.GET,
        CorsHttpMethod.POST,
        CorsHttpMethod.OPTIONS,
      ],
      allowHeaders: ["Content-Type", "Authorization"],
    },
  });
  api.addRoutes({
    path: "/api/demo/{proxy+}",
    methods: [HttpMethod.ANY],
    integration: new HttpLambdaIntegration(
      "DemoIntegration",
      backend.clinical.resources.lambda,
    ),
  });
  backend.clinical.addEnvironment("DEMO_ENABLED", "true");
  backend.addOutput({ custom: { demo_api_url: `${api.url}api/demo` } });
}
