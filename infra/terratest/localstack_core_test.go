package terratest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
	"github.com/aws/aws-sdk-go-v2/service/ecr"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/gruntwork-io/terratest/modules/terraform"
)

const (
	localstackEndpoint = "http://localhost:4566"
	awsRegion          = "us-east-1"
)

func TestLocalStackCoreSubset(t *testing.T) {
	t.Parallel()

	waitForLocalStack(t, localstackEndpoint, 90*time.Second)

	repoRoot, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}

	terraformDir := filepath.Join(repoRoot, "infra", "terraform-localstack")
	options := &terraform.Options{
		TerraformDir:     terraformDir,
		TerraformBinary:  "tflocal",
		NoColor:          true,
		Upgrade:          true,
		EnvVars:          fakeAWSEnv(),
		Vars:             map[string]interface{}{"localstack_endpoint": localstackEndpoint},
		RetryableTerraformErrors: map[string]string{
			".*connection refused.*": "LocalStack endpoint was not ready",
		},
		MaxRetries:         3,
		TimeBetweenRetries: 5 * time.Second,
	}

	defer terraform.Destroy(t, options)
	terraform.InitAndApply(t, options)

	outputs := terraform.OutputAll(t, options)
	bucketName := outputs["bucket_names"].(map[string]interface{})["runtime"].(string)
	logGroupName := outputs["log_group_name"].(string)
	ssmParameterName := outputs["ssm_parameter_name"].(string)
	ecrRepositoryName := outputs["ecr_repository_name"].(string)

	ctx := context.Background()
	cfg := localstackAWSConfig(ctx, t)

	assertS3Bucket(ctx, t, cfg, bucketName)
	assertSSMParameter(ctx, t, cfg, ssmParameterName)
	assertCloudWatchLogGroup(ctx, t, cfg, logGroupName)
	assertECRRepository(ctx, t, cfg, ecrRepositoryName)
}

func fakeAWSEnv() map[string]string {
	return map[string]string{
		"AWS_ACCESS_KEY_ID":     "test",
		"AWS_SECRET_ACCESS_KEY": "test",
		"AWS_DEFAULT_REGION":    awsRegion,
		"AWS_REGION":            awsRegion,
	}
}

func localstackAWSConfig(ctx context.Context, t *testing.T) aws.Config {
	t.Helper()

	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion(awsRegion),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("test", "test", "")),
		config.WithEndpointResolverWithOptions(
			aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:               localstackEndpoint,
					SigningRegion:     awsRegion,
					HostnameImmutable: true,
				}, nil
			}),
		),
	)
	if err != nil {
		t.Fatal(err)
	}

	return cfg
}

func waitForLocalStack(t *testing.T, endpoint string, timeout time.Duration) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	healthURL := fmt.Sprintf("%s/_localstack/health", endpoint)
	for time.Now().Before(deadline) {
		resp, err := http.Get(healthURL)
		if err == nil && resp.StatusCode == http.StatusOK {
			var payload map[string]interface{}
			if decodeErr := json.NewDecoder(resp.Body).Decode(&payload); decodeErr == nil {
				_ = resp.Body.Close()
				return
			}
			_ = resp.Body.Close()
		}
		time.Sleep(2 * time.Second)
	}

	t.Fatalf("LocalStack did not become ready at %s", healthURL)
}

func assertS3Bucket(ctx context.Context, t *testing.T, cfg aws.Config, bucket string) {
	t.Helper()

	client := s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.UsePathStyle = true
	})
	if _, err := client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)}); err != nil {
		t.Fatalf("expected S3 bucket %q to exist: %v", bucket, err)
	}
}

func assertSSMParameter(ctx context.Context, t *testing.T, cfg aws.Config, name string) {
	t.Helper()

	client := ssm.NewFromConfig(cfg)
	if _, err := client.GetParameter(ctx, &ssm.GetParameterInput{Name: aws.String(name)}); err != nil {
		t.Fatalf("expected SSM parameter %q to exist: %v", name, err)
	}
}

func assertCloudWatchLogGroup(ctx context.Context, t *testing.T, cfg aws.Config, name string) {
	t.Helper()

	client := cloudwatchlogs.NewFromConfig(cfg)
	output, err := client.DescribeLogGroups(ctx, &cloudwatchlogs.DescribeLogGroupsInput{
		LogGroupNamePrefix: aws.String(name),
	})
	if err != nil {
		t.Fatalf("expected CloudWatch log group %q lookup to work: %v", name, err)
	}
	for _, group := range output.LogGroups {
		if aws.ToString(group.LogGroupName) == name {
			return
		}
	}
	t.Fatalf("expected CloudWatch log group %q to exist", name)
}

func assertECRRepository(ctx context.Context, t *testing.T, cfg aws.Config, name string) {
	t.Helper()

	client := ecr.NewFromConfig(cfg)
	if _, err := client.DescribeRepositories(ctx, &ecr.DescribeRepositoriesInput{
		RepositoryNames: []string{name},
	}); err != nil {
		t.Fatalf("expected ECR repository %q to exist: %v", name, err)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
