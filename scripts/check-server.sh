#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "检查服务器状态..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "=== 1. 检查 pm2 状态 ==="
pm2 status

echo ""
echo "=== 2. 检查端口监听 ==="
netstat -tlnp 2>/dev/null || ss -tlnp

echo ""
echo "=== 3. 检查防火墙状态 ==="
ufw status 2>/dev/null || echo "ufw not installed"

echo ""
echo "=== 4. 本地测试服务 ==="
curl -v http://localhost/health 2>&1 || echo "Local test failed"

echo ""
echo "=== 5. 查看 pm2 日志（最后20行） ==="
pm2 logs speed-curcle --lines 20 --nostream
EOF
