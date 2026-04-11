#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

cd /Users/wanglipeng/speed-curcle

echo "📦 打包项目..."
tar -czf /tmp/speed-curcle.tar.gz \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=client/node_modules \
    --exclude=server/node_modules \
    --exclude=.DS_Store \
    .

echo "📤 上传项目..."
sshpass -e scp -o StrictHostKeyChecking=no /tmp/speed-curcle.tar.gz $SERVER:/tmp/

echo "🚀 在服务器上解压并部署..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e
cd /opt
rm -rf speed-curcle
mkdir -p speed-curcle
tar -xzf /tmp/speed-curcle.tar.gz -C speed-curcle
cd speed-curcle

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

echo "开始构建 Docker 镜像（需要 5-10 分钟）..."
docker compose up -d --build

echo "等待服务启动..."
sleep 40

echo "检查状态..."
docker compose ps

echo "健康检查..."
for i in {1..15}; do
    if curl -s http://localhost/health > /dev/null; then
        echo "✅ 服务启动成功！"
        echo ""
        echo "========== 部署完成 =========="
        echo "🎮 访问游戏: http://121.43.244.230"
        echo "📋 查看日志: cd /opt/speed-curcle && docker compose logs -f"
        echo "================================"
        exit 0
    fi
    echo "等待服务就绪... ($i/15)"
    sleep 10
done

echo "❌ 服务启动超时，查看日志："
docker compose logs
exit 1
EOF
