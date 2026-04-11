#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "简单修复..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
set -e

echo "1. 修改编译后的 JS 文件..."
cd /opt/speed-curcle/server/dist

# 找到 server.listen 那一行并修改
# 原来是: server.listen(PORT, () => {
# 改成:  server.listen(PORT, '0.0.0.0', () => {
sed -i "s/server.listen(PORT/server.listen(PORT, '0.0.0.0'/" index.js

echo "2. 重启服务..."
pm2 restart speed-curcle

echo "3. 等待启动..."
sleep 10

echo "4. 检查端口..."
ss -tlnp4

echo ""
echo "5. 测试..."
curl -s http://127.0.0.1/health && echo " ✅ 本地测试成功"

echo ""
echo "现在试试浏览器访问: http://121.43.244.230"
EOF
