#!/bin/bash
set -e

SERVER="root@121.43.244.230"
PASSWORD="0vV3156958@"
export SSHPASS=$PASSWORD

echo "========== 开始部署 speed-curcle =========="
echo ""

# 1. 上传部署脚本
echo "📤 上传部署脚本..."
sshpass -e scp -o StrictHostKeyChecking=no /Users/wanglipeng/speed-curcle/scripts/server-deploy.sh $SERVER:/tmp/deploy.sh

# 2. SSH 连接并执行
echo "🚀 执行部署（需要 10-15 分钟）..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "chmod +x /tmp/deploy.sh && bash /tmp/deploy.sh"
