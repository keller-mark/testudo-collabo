```sh
export REDIS_PASS="my_password"

docker build . -t mkeller7/testudo-collabo
docker-compose -f dev.docker-compose.yml up
```

Resources
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_Configuration.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-cli-tutorial-ec2.html