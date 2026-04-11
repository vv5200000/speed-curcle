#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "深度网络诊断..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "=== 1. 当前端口监听 ==="
ss -tulnp

echo ""
echo "=== 2. iptables 完整规则 ==="
iptables-save 2>/dev/null || echo "iptables not available"

echo ""
echo "=== 3. 测试从内网访问 ==="
echo "测试 127.0.0.1:80..."
curl -v --connect-timeout 5 http://127.0.0.1/health 2>&1 | head -30

echo ""
echo "测试 172.24.162.109:80..."
curl -v --connect-timeout 5 http://172.24.162.109/health 2>&1 | head -30

echo ""
echo "=== 4. 检查云服务器元数据（确认安全组） ==="
# 尝试获取阿里云实例元数据
curl -s --connect-timeout 2 http://100.100.100.200/latest/meta-data/instance-id 2>/dev/null && echo " - 这是阿里云实例"

echo ""
echo "=== 5. 检查是否有其他进程在使用端口 ==="
lsof -i :80 2>/dev/null || fuser 80/tcp 2>/dev/null || echo "没有其他进程占用"

echo ""
echo "=== 6. 查看 pm2 日志 ==="
pm2 logs speed-curcle --lines 10 --nostream
EOF
