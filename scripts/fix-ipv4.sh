#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "修复 IPv4 监听问题..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e

echo "1. 停止服务..."
pm2 stop speed-curcle

echo "2. 修改服务器代码，强制监听 IPv4..."
cd /opt/speed-curcle/server

# 检查并修改 index.ts（如果存在源码）
if [ -f "index.ts" ]; then
    echo "修改源码..."
    sed -i 's/server.listen(PORT/server.listen(PORT, "0.0.0.0"/' index.ts
    npm run build
fi

# 修改编译后的 JS 文件
if [ -f "dist/index.js" ]; then
    echo "修改编译后的文件..."
    sed -i 's/server.listen(PORT/server.listen(PORT, "0.0.0.0"/' dist/index.js
fi

echo "3. 更新启动脚本..."
cd /opt/speed-curcle
cat > start.sh << 'INNER'
#!/bin/bash
cd /opt/speed-curcle/server
export NODE_ENV=production
export PORT=80
export HOST=0.0.0.0
exec node dist/index.js
INNER
chmod +x start.sh

echo "4. 重新启动服务..."
pm2 delete speed-curcle 2>/dev/null || true
pm2 start start.sh --name speed-curcle
pm2 save

echo "5. 等待启动..."
sleep 15

echo "6. 检查端口监听..."
echo "--- ss -tlnp4 ---"
ss -tlnp4
echo ""
echo "--- netstat -tlnp ---"
netstat -tlnp 2>/dev/null || ss -tlnp

echo "7. 本地测试..."
curl -s http://127.0.0.1/health && echo ""
curl -s http://172.24.162.109/health 2>/dev/null && echo " || 内网测试成功" || echo " || 内网测试可能失败（正常）"

echo ""
echo "✅ 修复完成！现在试试从浏览器访问 http://121.43.244.230"
EOF
