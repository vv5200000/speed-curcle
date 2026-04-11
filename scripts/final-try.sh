#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

cd /Users/wanglipeng/speed-curcle

echo "📦 打包..."
tar -czf /tmp/speed-curcle.tar.gz \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=client/node_modules \
    --exclude=server/node_modules \
    --exclude=.DS_Store \
    .

echo "📤 上传..."
sshpass -e scp -o StrictHostKeyChecking=no /tmp/speed-curcle.tar.gz $SERVER:/tmp/

echo "🚀 部署..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e
cd /opt/speed-curcle
rm -rf *
tar -xzf /tmp/speed-curcle.tar.gz -C /opt/speed-curcle

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

echo "配置 Docker daemon..."
sudo mkdir -p /etc/docker
sudo cat > /etc/docker/daemon.json << 'JSON'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
JSON
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 10

echo "开始构建..."
docker compose up -d --build

echo "等待 2 分钟..."
sleep 120

echo "检查状态..."
docker compose ps

echo "测试..."
for i in {1..30}; do
    if curl -s http://localhost/health > /dev/null 2>&1; then
        echo ""
        echo "✅ ====================================="
        echo "✅    部署成功！"
        echo "✅ 🎮 访问: http://121.43.244.230"
        echo "✅ ====================================="
        exit 0
    fi
    echo "等待... $i/30"
    sleep 10
done

echo ""
echo "日志:"
docker compose logs --tail=100
EOF
