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

echo "📤 上传到服务器..."
sshpass -e scp -o StrictHostKeyChecking=no /tmp/speed-curcle.tar.gz $SERVER:/tmp/

echo "🚀 在服务器上直接部署（不用 Docker）..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e

echo "1. 安装 Node.js 和 npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "2. 验证 Node.js..."
node --version
npm --version

echo "3. 解压项目..."
cd /opt
rm -rf speed-curcle
mkdir -p speed-curcle
tar -xzf /tmp/speed-curcle.tar.gz -C speed-curcle
cd speed-curcle

echo "4. 配置 npm 使用淘宝镜像..."
npm config set registry https://registry.npmmirror.com

echo "5. 安装依赖..."
echo "   安装服务端依赖..."
cd server
npm install
echo "   编译服务端..."
npm run build

echo "   安装客户端依赖..."
cd ../client
npm install
echo "   编译客户端..."
npm run build

cd ..

echo "6. 安装 pm2 用于进程管理..."
npm install -g pm2

echo "7. 创建启动脚本..."
cat > start.sh << 'INNER'
#!/bin/bash
cd /opt/speed-curcle/server
export NODE_ENV=production
export PORT=3001
exec node dist/index.js
INNER
chmod +x start.sh

echo "8. 用 pm2 启动服务..."
pm2 stop speed-curcle 2>/dev/null || true
pm2 delete speed-curcle 2>/dev/null || true
pm2 start start.sh --name speed-curcle
pm2 save
pm2 startup -u root --hp /root 2>/dev/null || true

echo "9. 配置 iptables 转发 80 端口到 3001..."
apt-get install -y iptables
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3001
iptables-save > /etc/iptables.rules

echo "10. 等待服务启动..."
sleep 10

echo "11. 检查服务状态..."
pm2 status

echo "12. 健康检查..."
for i in {1..20}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo ""
        echo "✅ ====================================="
        echo "✅    部署成功！"
        echo "✅ 🎮 访问游戏: http://121.43.244.230"
        echo "✅ 📋 查看日志: pm2 logs speed-curcle"
        echo "✅ ====================================="
        echo ""
        echo "有用的命令："
        echo "  pm2 logs speed-curcle    # 查看日志"
        echo "  pm2 restart speed-curcle # 重启服务"
        echo "  pm2 stop speed-curcle    # 停止服务"
        exit 0
    fi
    echo "等待服务就绪... ($i/20)"
    sleep 5
done

echo ""
echo "❌ 服务启动超时，查看日志："
pm2 logs speed-curcle --lines 50
exit 1
EOF
