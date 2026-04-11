#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "修复端口问题..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e

echo "1. 停止旧服务..."
pm2 stop speed-curcle 2>/dev/null || true

echo "2. 修改服务直接监听 80 端口..."
cd /opt/speed-curcle
cat > start.sh << 'INNER'
#!/bin/bash
cd /opt/speed-curcle/server
export NODE_ENV=production
export PORT=80
exec node dist/index.js
INNER
chmod +x start.sh

echo "3. 需要用 root 权限监听 80 端口..."
pm2 delete speed-curcle 2>/dev/null || true
pm2 start start.sh --name speed-curcle
pm2 save

echo "4. 等待启动..."
sleep 15

echo "5. 检查状态..."
pm2 status

echo "6. 测试..."
for i in {1..10}; do
    if curl -s http://localhost/health > /dev/null 2>&1; then
        echo ""
        echo "✅ ====================================="
        echo "✅    端口修复成功！"
        echo "✅ 🎮 访问: http://121.43.244.230"
        echo "✅ ====================================="
        exit 0
    fi
    echo "等待... $i/10"
    sleep 5
done

echo ""
echo "日志:"
pm2 logs speed-curcle --lines 30
EOF
