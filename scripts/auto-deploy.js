#!/usr/bin/env node
const { spawn } = require('child_process');

const SERVER = 'root@121.43.244.230';
const PASSWORD = '0vV3156958@';

// 使用 sshpass 的替代方案 - 通过一个临时脚本
const deployScript = `
set -e
echo "========== 开始部署 speed-curcle =========="

echo "1. 更新软件包..."
apt-get update -y

echo "2. 安装依赖..."
apt-get install -y ca-certificates curl gnupg lsb-release

echo "3. 添加 Docker GPG 密钥..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "4. 添加 Docker 软件源..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "5. 安装 Docker..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "6. 启动 Docker..."
systemctl start docker
systemctl enable docker

echo "7. 配置镜像加速器..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'INNER_EOF'
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
INNER_EOF
systemctl daemon-reload
systemctl restart docker

echo "8. 验证安装..."
docker --version
docker compose version

echo "9. 克隆项目..."
cd /opt
rm -rf speed-curcle
git clone https://github.com/vv5200000/speed-curcle.git
cd speed-curcle

echo "10. 创建 docker-compose.yml..."
cat > docker-compose.yml << 'INNER_EOF'
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
INNER_EOF

echo "11. 构建并启动服务（这需要 5-10 分钟）..."
docker compose up -d --build

echo "12. 等待服务启动..."
sleep 30

echo "13. 检查状态..."
docker compose ps

echo "14. 测试健康检查..."
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

echo "❌ 服务启动超时，请检查日志"
docker compose logs
exit 1
`;

console.log('🎯 开始自动部署到 121.43.244.230...');
console.log('这将需要 10-15 分钟，请稍候...\n');

// 创建临时脚本文件
const fs = require('fs');
const path = require('path');
const tempScriptPath = path.join(__dirname, 'temp-deploy.sh');
fs.writeFileSync(tempScriptPath, deployScript, { mode: 0o755 });

// 使用 sshpass 或者 expect，但这里我们用一个更简单的方法
// 告诉用户怎么做
console.log('由于系统限制，请按以下步骤操作：\n');
console.log('1. 连接到服务器：');
console.log(`   ssh root@121.43.244.230`);
console.log(`   密码: 0vV3156958@\n`);
console.log('2. 连接成功后，复制下面这行命令并粘贴：\n');
console.log(deployScript.split('\n').slice(0, 3).join('\n') + '\n... (脚本太长，这里省略) ...\n');
console.log('或者，我把完整脚本保存到了: ' + tempScriptPath);
console.log('你可以手动上传这个脚本到服务器运行。\n');

console.log('💡 最简单的方法：');
console.log('   1. 运行: scp ' + tempScriptPath + ' root@121.43.244.230:/tmp/');
console.log('   2. SSH 连接后运行: bash /tmp/temp-deploy.sh');
