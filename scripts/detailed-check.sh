#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "详细检查服务器..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "=== 1. 服务状态 ==="
pm2 status

echo ""
echo "=== 2. 完整的端口监听（包括 IPv4）==="
ss -tlnp4

echo ""
echo "=== 3. 检查云服务器的网络接口 ==="
ip addr show

echo ""
echo "=== 4. 从公网 IP 测试本地服务 ==="
echo "测试 http://$(curl -s ifconfig.me 2>/dev/null || echo '127.0.0.1')/health"
curl -v http://127.0.0.1/health 2>&1

echo ""
echo "=== 5. 检查 iptables 规则 ==="
iptables -L -n -v 2>/dev/null || echo "iptables not configured"

echo ""
echo "=== 6. 尝试从另一个端口测试 ==="
echo "检查服务是否可以接受外部连接..."
EOF
