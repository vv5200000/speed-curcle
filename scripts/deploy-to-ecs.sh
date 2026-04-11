#!/bin/bash
# 快速部署到 ECS 脚本
# 使用方法: ./scripts/deploy-to-ecs.sh root@your-ecs-ip

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [ $# -eq 0 ]; then
    echo "用法: $0 <ecs-server>"
    echo "示例: $0 root@123.45.67.89"
    exit 1
fi

ECS_SERVER=$1
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log_info "项目目录: $PROJECT_DIR"
log_info "目标服务器: $ECS_SERVER"

# 1. 检查本地 Docker
if ! command -v docker &> /dev/null; then
    log_warn "本地未安装 Docker，跳过本地构建测试"
else
    log_info "检查本地 Docker..."
    docker --version
fi

# 2. 打包项目（排除 node_modules 和 .git）
log_info "打包项目..."
cd "$PROJECT_DIR"
tar -czf /tmp/speed-curcle-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=client/node_modules \
    --exclude=server/node_modules \
    --exclude=.DS_Store \
    .

log_info "打包完成: /tmp/speed-curcle-deploy.tar.gz"

# 3. 上传到服务器
log_info "上传到服务器..."
scp /tmp/speed-curcle-deploy.tar.gz "$ECS_SERVER:/tmp/"

# 4. 在服务器上执行部署
log_info "在服务器上执行部署..."
ssh "$ECS_SERVER" << 'EOF'
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装！请先安装 Docker。"
    log_info "运行: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_warn "Docker Compose 未安装，正在安装..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

log_info "Docker 版本: $(docker --version)"
log_info "Docker Compose 版本: $(docker-compose --version)"

# 创建部署目录
DEPLOY_DIR="/opt/speed-curcle"
log_info "部署目录: $DEPLOY_DIR"

sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R $USER:$USER "$DEPLOY_DIR"

# 解压
log_info "解压项目..."
cd "$DEPLOY_DIR"
tar -xzf /tmp/speed-curcle-deploy.tar.gz

# 停止旧容器（如果存在）
if [ -f docker-compose.yml ]; then
    log_info "停止旧容器..."
    docker-compose down || true
fi

# 构建并启动
log_info "构建并启动容器（这可能需要几分钟）..."
docker-compose up -d --build

# 等待启动
log_info "等待服务启动..."
sleep 10

# 检查状态
log_info "检查容器状态..."
docker-compose ps

# 健康检查
log_info "执行健康检查..."
for i in {1..10}; do
    if curl -s http://localhost/health > /dev/null; then
        log_info "✅ 服务启动成功！"
        break
    fi
    log_warn "等待服务就绪... ($i/10)"
    sleep 5
done

# 显示日志
log_info "最近的日志:"
docker-compose logs --tail=50

echo ""
log_info "=================================================="
log_info "🎉 部署完成！"
log_info "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ecs-ip')"
log_info "管理命令:"
log_info "  cd $DEPLOY_DIR"
log_info "  docker-compose logs -f    # 查看日志"
log_info "  docker-compose restart    # 重启服务"
log_info "  docker-compose down       # 停止服务"
log_info "=================================================="
EOF

# 清理本地临时文件
log_info "清理本地临时文件..."
rm -f /tmp/speed-curcle-deploy.tar.gz

log_info "✅ 部署脚本执行完成！"
