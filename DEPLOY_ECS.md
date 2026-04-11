# 阿里云 ECS 快速部署指南

## 前置条件

- 阿里云 ECS 服务器（推荐配置：2核4GB，带宽3Mbps+）
- 已安装 Docker 和 Docker Compose
- 安全组已开放 80 端口（HTTP）

## 一、服务器环境准备

### 1. 连接到你的 ECS 服务器
```bash
ssh root@your-ecs-ip
```

### 2. 安装 Docker（如果未安装）
```bash
# 一键安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
```

### 3. 安装 Docker Compose
```bash
# 下载 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

## 二、部署项目

### 方式 A：从 GitHub 克隆（推荐）

```bash
# 1. 克隆项目
cd /opt
git clone https://github.com/vv5200000/speed-curcle.git
cd speed-curcle

# 2. 构建并启动
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f
```

### 方式 B：上传本地代码

如果你在本地做了修改：

```bash
# 1. 在本地打包项目
cd /Users/wanglipeng/speed-curcle
tar -czf speed-curcle.tar.gz --exclude=node_modules --exclude=.git .

# 2. 上传到服务器
scp speed-curcle.tar.gz root@your-ecs-ip:/opt/

# 3. 在服务器上解压
ssh root@your-ecs-ip
cd /opt
mkdir -p speed-curcle
tar -xzf speed-curcle.tar.gz -C speed-curcle
cd speed-curcle

# 4. 构建并启动
docker-compose up -d --build
```

## 三、验证部署

### 1. 检查容器状态
```bash
docker-compose ps
```

### 2. 查看应用日志
```bash
docker-compose logs -f
```

### 3. 访问游戏
在浏览器中打开：
```
http://your-ecs-ip
```

### 4. 健康检查
```bash
curl http://localhost/health
```

## 四、常用管理命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新代码后重新构建
git pull
docker-compose up -d --build

# 查看资源使用情况
docker stats
```

## 五、安全建议

### 1. 配置防火墙（firewalld/iptables）
```bash
# 只开放必要端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 2. 定期更新系统
```bash
yum update -y
```

### 3. 配置日志轮转
确保 Docker 日志不会占用太多磁盘空间。

## 六、故障排查

### 容器无法启动
```bash
# 查看详细日志
docker-compose logs speed-curcle

# 检查端口是否被占用
netstat -tlnp | grep :80
```

### 无法访问游戏
- 检查 ECS 安全组是否开放 80 端口
- 检查服务器防火墙状态
- 确认容器正常运行：`docker-compose ps`

### 性能问题
- 考虑升级服务器配置
- 查看资源使用：`docker stats`
- 检查游戏日志：`docker-compose logs`

## 七、后续优化（可选）

### 配置域名和 HTTPS
1. 在阿里云 DNS 解析域名到 ECS IP
2. 使用 Let's Encrypt + Nginx 配置 HTTPS

### 配置自动重启
```bash
# docker-compose.yml 中已配置 restart: unless-stopped
# 服务器重启后会自动启动服务
```

### 备份游戏数据（如需要）
当前版本游戏数据在内存中，重启会丢失。如需持久化，可考虑添加 Redis 或数据库。

---

**部署完成后，把你的 ECS IP 分享给朋友，就可以一起玩了！** 🎮
