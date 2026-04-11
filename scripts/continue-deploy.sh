#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

cd /Users/wanglipeng/speed-curcle

echo "📦 重新打包项目（含新 Dockerfile）..."
tar -czf /tmp/speed-curcle.tar.gz \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=client/node_modules \
    --exclude=server/node_modules \
    --exclude=.DS_Store \
    .

echo "📤 上传到服务器..."
sshpass -e scp -o StrictHostKeyChecking=no /tmp/speed-curcle.tar.gz $SERVER:/tmp/

echo "🚀 继续部署..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e
cd /opt/speed-curcle
rm -rf *
tar -xzf /tmp/speed-curcle.tar.gz -C /opt/speed-curcle

echo "创建 docker-compose.yml..."
cat > docker-compose.yml << 'INNER'
services:
  speed-curcle:
    build: .
    container_name: speed-curcle-game
    restart: unless-stopped
    ports:
      - "80:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
INNER

echo "配置 Docker 镜像源..."
sudo mkdir -p /etc/docker
sudo cat > /etc/docker/daemon.json << 'JSON'
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
JSON
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 5

echo "开始构建（需要 5-10 分钟）..."
docker compose up -d --build

echo "等待服务启动..."
sleep 60

echo "检查容器状态..."
docker compose ps

echo "健康检查..."
for i in {1..20}; do
    if curl -s http://localhost/health > /dev/null; then
        echo ""
        echo "✅ ====================================="
        echo "✅    部署成功！"
        echo "✅ 🎮 访问游戏: http://121.43.244.230"
        echo "✅ 📋 查看日志: cd /opt/speed-curcle && docker compose logs -f"
        echo "✅ ====================================="
        exit 0
    fi
    echo "等待服务就绪... ($i/20)"
    sleep 10
done

echo ""
echo "❌ 服务启动超时，请查看日志："
docker compose logs
exit 1
EOF
