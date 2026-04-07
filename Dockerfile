# 第一阶段：构建前端 (Client Builder)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 第二阶段：构建后端 (Server Builder)
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# 第三阶段：运行环境 (Runner)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 复制后端编译产物及依赖
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package*.json ./server/
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# 复制前端编译产物
COPY --from=client-builder /app/client/dist ./client/dist

# 暴露端口（云平台通常使用 PORT 环境变量）
EXPOSE 3001
ENV PORT=3001

# 启动服务器
WORKDIR /app/server
CMD ["node", "dist/index.js"]
