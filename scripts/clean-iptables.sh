#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "清理旧的 iptables 规则..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "删除旧的端口转发规则..."
iptables -t nat -D PREROUTING -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 3001 2>/dev/null || true
iptables-save 2>/dev/null | grep -v "dport 80" | iptables-restore 2>/dev/null || true

echo "当前 iptables 规则（nat 表）："
iptables -t nat -L -n -v

echo ""
echo "✅ 清理完成"
echo ""
echo "=========================================="
echo "请仔细检查阿里云安全组配置："
echo ""
echo "1. 登录 https://ecs.console.aliyun.com/"
echo "2. 找到实例 i-bp1d1dwhm031d65czas0"
echo "3. 点击左侧 \"安全组\""
echo "4. 点击配置规则"
echo "5. 添加入方向规则："
echo "   - 端口范围：80/80"
echo "   - 授权对象：0.0.0.0/0"
echo "   - 协议类型：TCP"
echo "6. 保存后等 2 分钟再试"
echo "=========================================="
EOF
