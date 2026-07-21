import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      status: 'setup',
      round: 'not_started',
      phase: 'waiting',
    },
  });

  console.log('✅ Quiz created:', quiz.id);

  // Create teams
  const teams = await Promise.all([
    prisma.team.create({ data: { name: 'Team Alpha', quizId: quiz.id, sequence: 0 } }),
    prisma.team.create({ data: { name: 'Team Beta', quizId: quiz.id, sequence: 1 } }),
    prisma.team.create({ data: { name: 'Team Gamma', quizId: quiz.id, sequence: 2 } }),
    prisma.team.create({ data: { name: 'Team Delta', quizId: quiz.id, sequence: 3 } }),
  ]);

  console.log('✅ Teams created:', teams.length);

  // Domain 1: Linux & System Administration
  const linuxDomain = await prisma.domain.create({
    data: {
      name: 'Linux & System Administration',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'What command is used to change file permissions in Linux?',
            answer: 'chmod',
            options: ['chmod', 'chown', 'chgrp', 'chattr'],
          },
          {
            number: 2,
            text: 'Which directory contains system configuration files in Linux?',
            answer: '/etc',
            options: ['/etc', '/var', '/usr', '/opt'],
          },
          {
            number: 3,
            text: 'Which of the following is the default shell in most Linux distributions?',
            answer: 'bash',
            options: ['bash', 'zsh', 'sh', 'fish'],
            optionsDefault: true,
          },
          {
            number: 4,
            text: 'Which command displays running processes in real-time?',
            answer: 'top',
            options: ['top', 'ps', 'htop', 'pstree'],
          },
          {
            number: 5,
            text: 'What is the purpose of the cron daemon?',
            answer: 'Schedule recurring tasks',
            options: ['Schedule recurring tasks', 'Manage system logs', 'Handle network requests', 'Monitor disk usage'],
          },
        ],
      },
    },
  });

  // Domain 2: Cloud & Infrastructure
  const cloudDomain = await prisma.domain.create({
    data: {
      name: 'Cloud & Infrastructure',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'Which of the following AWS services provides object storage?',
            answer: 'S3',
            options: ['S3', 'EBS', 'EFS', 'Glacier'],
            optionsDefault: true,
          },
          {
            number: 2,
            text: 'What does EC2 stand for in AWS?',
            answer: 'Elastic Compute Cloud',
            options: ['Elastic Compute Cloud', 'Elastic Container Cloud', 'Enterprise Compute Cloud', 'Extended Compute Cloud'],
          },
          {
            number: 3,
            text: 'Which service is used for container orchestration in Kubernetes?',
            answer: 'Control Plane',
            options: ['Control Plane', 'Worker Node', 'Kubelet', 'etcd'],
          },
          {
            number: 4,
            text: 'What is the default port for HTTPS?',
            answer: '443',
            options: ['443', '80', '8080', '22'],
          },
          {
            number: 5,
            text: 'Which of the following cloud providers offers Azure DevOps?',
            answer: 'Microsoft',
            options: ['Microsoft', 'Amazon', 'Google', 'IBM'],
            optionsDefault: true,
          },
        ],
      },
    },
  });

  // Domain 3: Security & Compliance
  const securityDomain = await prisma.domain.create({
    data: {
      name: 'Security & Compliance',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'What does SSL stand for?',
            answer: 'Secure Sockets Layer',
            options: ['Secure Sockets Layer', 'System Security Layer', 'Secure System Link', 'Standard Security Layer'],
          },
          {
            number: 2,
            text: 'Which port is commonly used for SSH?',
            answer: '22',
            options: ['22', '23', '21', '25'],
          },
          {
            number: 3,
            text: 'What is the purpose of a firewall?',
            answer: 'Control network traffic',
            options: ['Control network traffic', 'Encrypt data', 'Scan for viruses', 'Backup files'],
          },
          {
            number: 4,
            text: 'Which tool is used for vulnerability scanning?',
            answer: 'Nessus',
            options: ['Nessus', 'Jenkins', 'Docker', 'Ansible'],
          },
          {
            number: 5,
            text: 'What does IAM stand for in cloud security?',
            answer: 'Identity and Access Management',
            options: ['Identity and Access Management', 'Internet Access Manager', 'Internal Authentication Module', 'Integrated Access Method'],
          },
        ],
      },
    },
  });

  // Domain 4: CI/CD & DevOps Tools
  const cicdDomain = await prisma.domain.create({
    data: {
      name: 'CI/CD & DevOps Tools',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'Which tool is primarily used for continuous integration?',
            answer: 'Jenkins',
            options: ['Jenkins', 'Docker', 'Kubernetes', 'Terraform'],
          },
          {
            number: 2,
            text: 'What does Git use to track changes?',
            answer: 'Commits',
            options: ['Commits', 'Branches', 'Tags', 'Merges'],
          },
          {
            number: 3,
            text: 'Which of the following file formats is commonly used for Docker configuration?',
            answer: 'Dockerfile',
            options: ['Dockerfile', 'docker.json', 'docker.xml', 'docker.cfg'],
            optionsDefault: true,
          },
          {
            number: 4,
            text: 'What is the purpose of Terraform?',
            answer: 'Infrastructure as Code',
            options: ['Infrastructure as Code', 'Container orchestration', 'Continuous integration', 'Log management'],
          },
          {
            number: 5,
            text: 'Which command is used to build a Docker image?',
            answer: 'docker build',
            options: ['docker build', 'docker create', 'docker make', 'docker compile'],
          },
        ],
      },
    },
  });

  // Domain 6: AWS DevOps Engineer Professional (DOP-C02)
  const awsDopDomain = await prisma.domain.create({
    data: {
      name: 'AWS DevOps Professional',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'A company uses AWS CodePipeline to deploy their application to Amazon ECS. The pipeline has a CodeBuild project that builds the Docker image and pushes it to Amazon ECR. The company wants to ensure that the pipeline only deploys when the build is successful and all integration tests pass. Which combination of actions will meet these requirements?',
            answer: 'Configure CodeBuild to run integration tests and use the build\'s exit code to determine success. Use CodePipeline\'s manual approval stage before deployment.',
            options: [
              'Configure CodeBuild to run integration tests and use the build\'s exit code to determine success. Use CodePipeline\'s manual approval stage before deployment.',
              'Use AWS CloudWatch Events to trigger the pipeline only on successful builds. Add a Lambda function to validate test results.',
              'Configure CodeBuild to output test results in XML format and use CodePipeline\'s test action to validate. Deploy directly after build without approval.',
              'Use CodeDeploy\'s hooks to run integration tests. Configure CodePipeline to automatically deploy on successful tests.'
            ],
            optionsDefault: true,
          },
          {
            number: 2,
            text: 'A DevOps team is using AWS CloudFormation to manage their infrastructure. They need to deploy a stack with parameters that should not be stored in plain text in the template. How should they handle sensitive parameters?',
            answer: 'Use AWS Systems Manager Parameter Store with the ssm-secure parameter type in CloudFormation.',
            options: [
              'Use AWS Systems Manager Parameter Store with the ssm-secure parameter type in CloudFormation.',
              'Encode the parameters in Base64 and include them in the CloudFormation template.',
              'Pass sensitive parameters as environment variables in the CI/CD pipeline.',
              'Store sensitive values in a separate JSON file and reference it in the template.'
            ],
            optionsDefault: true,
          },
          {
            number: 3,
            text: 'An application runs on Amazon EC2 instances behind an Application Load Balancer. The DevOps team needs to implement automatic scaling based on CPU utilization and also needs to drain connections gracefully when instances are terminated during scale-in events. How should this be configured?',
            answer: 'Configure an Auto Scaling group with a target group and enable connection draining on the ALB.',
            options: [
              'Configure an Auto Scaling group with a target group and enable connection draining on the ALB.',
              'Use EC2 Auto Scaling lifecycle hooks to handle graceful termination.',
              'Configure the ALB to use sticky sessions and set a short expiration period.',
              'Use AWS Lambda to deregister instances before termination.'
            ],
            optionsDefault: true,
          },
          {
            number: 4,
            text: 'A company is implementing a CI/CD pipeline using AWS CodePipeline. They need to ensure that secrets such as API keys and database credentials are not exposed in the pipeline logs or during debugging. What is the best approach?',
            answer: 'Store secrets in AWS Secrets Manager and reference them in the pipeline using the secretsmanager ARN.',
            options: [
              'Store secrets in AWS Secrets Manager and reference them in the pipeline using the secretsmanager ARN.',
              'Use AWS KMS to encrypt secrets and store them in the pipeline configuration.',
              'Use environment variables in the pipeline and enable KMS encryption for logs.',
              'Store secrets in a separate configuration file and exclude it from version control.'
            ],
            optionsDefault: true,
          },
          {
            number: 5,
            text: 'A DevOps engineer needs to set up monitoring for an application running on Amazon ECS. The requirements are to track request latency, error rates, and automatically scale based on these metrics. Which combination of AWS services should be used?',
            answer: 'Use AWS X-Ray for tracing, CloudWatch Container Insights for metrics, and Application Auto Scaling with custom metrics.',
            options: [
              'Use AWS X-Ray for tracing, CloudWatch Container Insights for metrics, and Application Auto Scaling with custom metrics.',
              'Use CloudWatch Logs for all metrics and enable automatic scaling based on log count.',
              'Use Amazon Data Firehose to stream logs to OpenSearch and create dashboards for monitoring.',
              'Use AWS CloudTrail to monitor API calls and trigger scaling based on events.'
            ],
            optionsDefault: true,
          },
          {
            number: 6,
            text: 'A company is migrating their monolithic application to a microservices architecture on AWS. They need to ensure that service-to-service communication is secure and that they can trace requests across services. Which AWS services should be included in the solution?',
            answer: 'Use AWS App Mesh for service mesh capabilities and AWS X-Ray for distributed tracing.',
            options: [
              'Use AWS App Mesh for service mesh capabilities and AWS X-Ray for distributed tracing.',
              'Use API Gateway with IAM authorization and CloudWatch for logging.',
              'Use Amazon VPC peering and enable VPC Flow Logs.',
              'Use AWS Direct Connect and implement mutual TLS between services.'
            ],
            optionsDefault: true,
          },
          {
            number: 7,
            text: 'An organization uses AWS CodeDeploy for their deployment automation. They need to implement a blue-green deployment strategy with the ability to roll back automatically if the new deployment fails health checks. How should this be configured?',
            answer: 'Configure CodeDeploy deployment group with blue-green deployment, enable automatic rollback on failure, and set up ELB health checks.',
            options: [
              'Configure CodeDeploy deployment group with blue-green deployment, enable automatic rollback on failure, and set up ELB health checks.',
              'Use CodeDeploy with in-place updates and configure CloudWatch alarms to trigger rollback.',
              'Use AWS OpsWorks for blue-green deployments with custom recipes.',
              'Deploy to two separate Auto Scaling groups and use Route 53 for traffic switching.'
            ],
            optionsDefault: true,
          },
          {
            number: 8,
            text: 'A DevOps team is using AWS Lambda functions that need to access a database in a private subnet. The team wants to minimize the database\'s exposure to the internet while allowing Lambda functions to connect. What is the best solution?',
            answer: 'Configure Lambda functions in a VPC with the database in a private subnet, and use a NAT gateway for outbound access if needed.',
            options: [
              'Configure Lambda functions in a VPC with the database in a private subnet, and use a NAT gateway for outbound access if needed.',
              'Use Amazon RDS Proxy to manage database connections from Lambda functions.',
              'Place the database in a public subnet and configure security groups to allow only Lambda IP ranges.',
              'Use AWS PrivateLink to expose the database to Lambda functions.'
            ],
            optionsDefault: true,
          },
          {
            number: 9,
            text: 'A company needs to implement a disaster recovery strategy for their critical application. The RPO should be 15 minutes and RTO should be 1 hour. The application uses Amazon Aurora MySQL. Which DR approach should be recommended?',
            answer: 'Set up Aurora MySQL with cross-region read replicas and configure automated failover with a secondary region.',
            options: [
              'Set up Aurora MySQL with cross-region read replicas and configure automated failover with a secondary region.',
              'Take daily backups and store in S3 with cross-region replication.',
              'Use Aurora global database with automatic failover to secondary region.',
              'Implement continuous backup using AWS Backup and restore from the latest recovery point.'
            ],
            optionsDefault: true,
          },
          {
            number: 10,
            text: 'A DevOps team is implementing infrastructure as code using AWS CloudFormation. They need to ensure that stack updates are safe and follow best practices. Which practices should be included in their CI/CD pipeline?',
            answer: 'Use CloudFormation change sets to preview updates, enable termination protection on stacks, and use stack policies.',
            options: [
              'Use CloudFormation change sets to preview updates, enable termination protection on stacks, and use stack policies.',
              'Delete and recreate the stack on each deployment to ensure a clean state.',
              'Manually review all CloudFormation templates before deployment.',
              'Use drift detection to identify changes and manually apply them to the template.'
            ],
            optionsDefault: true,
          },
          {
            number: 11,
            text: 'An application generates sensitive data that must be encrypted both at rest and in transit. The compliance team requires that encryption keys be rotated annually. Which AWS service combination meets these requirements?',
            answer: 'Use AWS KMS with customer-managed keys and enable automatic key rotation.',
            options: [
              'Use AWS KMS with customer-managed keys and enable automatic key rotation.',
              'Use AWS Certificate Manager for SSL/TLS certificates and S3 server-side encryption with AES-256.',
              'Use AWS Secrets Manager with automatic rotation enabled.',
              'Use IAM roles for temporary credentials and encrypt data using application-level encryption.'
            ],
            optionsDefault: true,
          },
          {
            number: 12,
            text: 'A company is implementing a multi-account AWS environment following AWS best practices. They need to establish a hub-and-spoke networking model where all traffic between accounts flows through a central security account. What should be configured?',
            answer: 'Use AWS Transit Gateway with AWS Resource Access Manager to share the transit gateway across accounts.',
            options: [
              'Use AWS Transit Gateway with AWS Resource Access Manager to share the transit gateway across accounts.',
              'Configure VPC peering between all accounts in a mesh topology.',
              'Use AWS PrivateLink to expose services between accounts.',
              'Implement AWS Direct Connect in each account and connect to a central network.'
            ],
            optionsDefault: true,
          },
        ],
      },
    },
  });

  // Domain 5: General Knowledge & IQ
  const gkDomain = await prisma.domain.create({
    data: {
      name: 'General Knowledge & IQ',
      quizId: quiz.id,
      questions: {
        create: [
          {
            number: 1,
            text: 'Who is known as the father of modern computing?',
            answer: 'Alan Turing',
            options: ['Alan Turing', 'Charles Babbage', 'John von Neumann', 'Dennis Ritchie'],
          },
          {
            number: 2,
            text: 'In what year was the first version of Linux released?',
            answer: '1991',
            options: ['1991', '1985', '1995', '2000'],
          },
          {
            number: 3,
            text: 'Which of the following does API stand for?',
            answer: 'Application Programming Interface',
            options: ['Application Programming Interface', 'Advanced Programming Interface', 'Automated Program Integration', 'Application Process Integration'],
            optionsDefault: true,
          },
          {
            number: 4,
            text: 'Which company developed Kubernetes?',
            answer: 'Google',
            options: ['Google', 'Amazon', 'Microsoft', 'Docker'],
          },
          {
            number: 5,
            text: 'What is the binary representation of decimal 8?',
            answer: '1000',
            options: ['1000', '1001', '0100', '1100'],
          },
        ],
      },
    },
  });

  console.log('✅ Domains created: 5');

  // Buzzer Round Questions
  const buzzerQuestions = await Promise.all([
    prisma.buzzerQuestion.create({
      data: {
        number: 1,
        text: 'What does DNS stand for?',
        answer: 'Domain Name System',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 2,
        text: 'Which protocol is used for secure file transfer?',
        answer: 'SFTP',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 3,
        text: 'What is the default port for MySQL?',
        answer: '3306',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 4,
        text: 'Which command is used to display network interfaces in Linux?',
        answer: 'ifconfig',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 5,
        text: 'What does YAML stand for?',
        answer: 'YAML Ain\'t Markup Language',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 6,
        text: 'Which AWS service is used for serverless computing?',
        answer: 'Lambda',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 7,
        text: 'What is the name of Docker\'s container registry?',
        answer: 'Docker Hub',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 8,
        text: 'Which tool is used for configuration management by Red Hat?',
        answer: 'Ansible',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 9,
        text: 'What does VPC stand for in AWS?',
        answer: 'Virtual Private Cloud',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 10,
        text: 'Which command shows disk usage in Linux?',
        answer: 'df',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 11,
        text: 'What is the default branch name in Git?',
        answer: 'main',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 12,
        text: 'Which protocol does Kubernetes use for communication?',
        answer: 'HTTP/HTTPS',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 13,
        text: 'What is the file extension for Terraform configuration files?',
        answer: '.tf',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 14,
        text: 'Which command is used to list all Docker containers?',
        answer: 'docker ps',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 15,
        text: 'What does CI/CD stand for?',
        answer: 'Continuous Integration/Continuous Deployment',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 16,
        text: 'Which cloud provider offers GCP?',
        answer: 'Google',
        options: [],
        quizId: quiz.id,
      },
    }),
    prisma.buzzerQuestion.create({
      data: {
        number: 17,
        text: 'What is the purpose of a load balancer?',
        answer: 'Distribute traffic across servers',
        options: [],
        quizId: quiz.id,
      },
    }),
  ]);

  console.log('✅ Buzzer questions created:', buzzerQuestions.length);

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\n📋 Quiz ID: ${quiz.id}`);
  console.log(`👥 Teams: ${teams.length}`);
  console.log(`📚 Domains: 6`);
  console.log(`❓ Domain Questions: 37 (5 Linux, 5 Cloud, 4 Security, 5 DevOps, 6 GK, 12 AWS DOP)`);
  console.log(`⚡ Buzzer Questions: ${buzzerQuestions.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
